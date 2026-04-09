const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/schema');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/announcements
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const announcements = db.prepare(`
    SELECT a.*, u.name as author_name,
      CASE WHEN ar.user_id IS NOT NULL THEN 1 ELSE 0 END as is_read
    FROM announcements a
    JOIN users u ON a.author_id = u.id
    LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = ?
    ORDER BY a.pinned DESC, a.created_at DESC
  `).all(req.user.id);

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM announcements a
    WHERE NOT EXISTS (
      SELECT 1 FROM announcement_reads ar
      WHERE ar.announcement_id = a.id AND ar.user_id = ?
    )
  `).get(req.user.id).count;

  res.json({ announcements, unread_count: unreadCount });
});

// POST /api/announcements
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { title, body, pinned } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  const db = getDb();
  const id = uuidv4();
  db.prepare(
    'INSERT INTO announcements (id, title, body, pinned, author_id) VALUES (?, ?, ?, ?, ?)'
  ).run(id, title, body, pinned ? 1 : 0, req.user.id);

  const announcement = db.prepare(`
    SELECT a.*, u.name as author_name
    FROM announcements a JOIN users u ON a.author_id = u.id
    WHERE a.id = ?
  `).get(id);

  res.status(201).json({ announcement });
});

// PUT /api/announcements/:id
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { title, body, pinned } = req.body;
  const db = getDb();

  const existing = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Announcement not found' });
  }

  db.prepare(
    'UPDATE announcements SET title = ?, body = ?, pinned = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(
    title ?? existing.title,
    body ?? existing.body,
    pinned !== undefined ? (pinned ? 1 : 0) : existing.pinned,
    req.params.id
  );

  const announcement = db.prepare(`
    SELECT a.*, u.name as author_name
    FROM announcements a JOIN users u ON a.author_id = u.id
    WHERE a.id = ?
  `).get(req.params.id);

  res.json({ announcement });
});

// DELETE /api/announcements/:id
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Announcement not found' });
  }
  res.json({ message: 'Announcement deleted' });
});

// POST /api/announcements/:id/read
router.post('/:id/read', authenticate, (req, res) => {
  const db = getDb();
  db.prepare(
    'INSERT OR IGNORE INTO announcement_reads (user_id, announcement_id) VALUES (?, ?)'
  ).run(req.user.id, req.params.id);
  res.json({ message: 'Marked as read' });
});

module.exports = router;
