const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/schema');
const { generateToken, authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !user.active) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user);
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const user = db.prepare(
    'SELECT id, email, name, role, title, institution_type, linkedin_url, bio FROM users WHERE id = ?'
  ).get(req.user.id);
  res.json({ user });
});

// POST /api/auth/invite - Admin creates invite link
router.post('/invite', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const id = uuidv4();
  const code = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    'INSERT INTO invite_links (id, code, created_by, expires_at) VALUES (?, ?, ?, ?)'
  ).run(id, code, req.user.id, expiresAt);

  res.json({ code, expires_at: expiresAt });
});

// GET /api/auth/invite/:code - Validate invite code
router.get('/invite/:code', (req, res) => {
  const db = getDb();
  const invite = db.prepare(
    'SELECT * FROM invite_links WHERE code = ? AND used_by IS NULL'
  ).get(req.params.code);

  if (!invite) {
    return res.status(404).json({ error: 'Invalid invite link' });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Invite link has expired' });
  }

  res.json({ valid: true });
});

// POST /api/auth/register - Register with invite code
router.post('/register', (req, res) => {
  const { email, password, name, invite_code } = req.body;

  if (!email || !password || !name || !invite_code) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const db = getDb();

  const invite = db.prepare(
    'SELECT * FROM invite_links WHERE code = ? AND used_by IS NULL'
  ).get(invite_code);

  if (!invite) {
    return res.status(400).json({ error: 'Invalid invite code' });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Invite code has expired' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);

  const insertUser = db.prepare(
    'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)'
  );
  const markInvite = db.prepare(
    'UPDATE invite_links SET used_by = ?, used_at = datetime(\'now\') WHERE id = ?'
  );

  const transaction = db.transaction(() => {
    insertUser.run(id, email, passwordHash, name, 'member');
    markInvite.run(id, invite.id);
  });
  transaction();

  const token = generateToken({ id, email, role: 'member' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    user: { id, email, name, role: 'member' },
  });
});

module.exports = router;
