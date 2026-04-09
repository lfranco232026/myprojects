const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/schema');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/channels
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const channels = db.prepare(`
    SELECT c.*, u.name as created_by_name,
      (SELECT COUNT(*) FROM messages m WHERE m.channel_id = c.id) as message_count
    FROM channels c
    JOIN users u ON c.created_by = u.id
    WHERE c.archived = 0
    ORDER BY c.name ASC
  `).all();

  res.json({ channels });
});

// POST /api/channels
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Channel name is required' });
  }

  const cleanName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  const db = getDb();

  const existing = db.prepare('SELECT id FROM channels WHERE name = ?').get(cleanName);
  if (existing) {
    return res.status(409).json({ error: 'Channel name already exists' });
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO channels (id, name, description, created_by) VALUES (?, ?, ?, ?)'
  ).run(id, cleanName, description || '', req.user.id);

  const channel = db.prepare(`
    SELECT c.*, u.name as created_by_name
    FROM channels c JOIN users u ON c.created_by = u.id
    WHERE c.id = ?
  `).get(id);

  res.status(201).json({ channel });
});

// PUT /api/channels/:id/archive
router.put('/:id/archive', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const result = db.prepare('UPDATE channels SET archived = 1 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Channel not found' });
  }
  res.json({ message: 'Channel archived' });
});

module.exports = router;
