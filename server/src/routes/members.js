const express = require('express');
const { getDb } = require('../db/schema');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/members
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { search } = req.query;

  let query = `
    SELECT id, name, email, role, title, institution_type, linkedin_url, bio, active, created_at
    FROM users WHERE active = 1
  `;
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR title LIKE ? OR institution_type LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY name ASC';
  const members = db.prepare(query).all(...params);
  res.json({ members });
});

// PUT /api/members/profile
router.put('/profile', authenticate, (req, res) => {
  const { name, title, institution_type, linkedin_url, bio } = req.body;
  const db = getDb();

  db.prepare(`
    UPDATE users SET name = ?, title = ?, institution_type = ?, linkedin_url = ?, bio = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name || req.user.name,
    title || '',
    institution_type || '',
    linkedin_url || '',
    bio || '',
    req.user.id
  );

  const user = db.prepare(
    'SELECT id, name, email, role, title, institution_type, linkedin_url, bio FROM users WHERE id = ?'
  ).get(req.user.id);

  res.json({ user });
});

// PUT /api/members/:id/deactivate
router.put('/:id/deactivate', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot deactivate yourself' });
  }

  db.prepare('UPDATE users SET active = 0, updated_at = datetime(\'now\') WHERE id = ?').run(req.params.id);
  res.json({ message: 'Member deactivated' });
});

// PUT /api/members/:id/activate
router.put('/:id/activate', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE users SET active = 1, updated_at = datetime(\'now\') WHERE id = ?').run(req.params.id);
  res.json({ message: 'Member activated' });
});

module.exports = router;
