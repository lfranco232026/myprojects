const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/schema');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/:channelId
router.get('/:channelId', authenticate, (req, res) => {
  const db = getDb();
  const { after } = req.query;

  let query = `
    SELECT m.*, u.name as author_name, u.role as author_role
    FROM messages m
    JOIN users u ON m.author_id = u.id
    WHERE m.channel_id = ? AND m.parent_id IS NULL
  `;
  const params = [req.params.channelId];

  if (after) {
    query += ' AND m.created_at > ?';
    params.push(after);
  }

  query += ' ORDER BY m.created_at ASC';

  const messages = db.prepare(query).all(...params);

  // Get replies for each message
  const messagesWithReplies = messages.map(msg => {
    const replies = db.prepare(`
      SELECT m.*, u.name as author_name, u.role as author_role
      FROM messages m
      JOIN users u ON m.author_id = u.id
      WHERE m.parent_id = ?
      ORDER BY m.created_at ASC
    `).all(msg.id);

    const reactions = db.prepare(`
      SELECT emoji, COUNT(*) as count,
        GROUP_CONCAT(u.name) as users,
        GROUP_CONCAT(mr.user_id) as user_ids
      FROM message_reactions mr
      JOIN users u ON mr.user_id = u.id
      WHERE mr.message_id = ?
      GROUP BY emoji
    `).all(msg.id);

    return { ...msg, replies, reactions };
  });

  res.json({ messages: messagesWithReplies });
});

// POST /api/messages/:channelId
router.post('/:channelId', authenticate, (req, res) => {
  const { content, parent_id } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const db = getDb();

  const channel = db.prepare('SELECT id FROM channels WHERE id = ? AND archived = 0').get(req.params.channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found or archived' });
  }

  if (parent_id) {
    const parent = db.prepare('SELECT id FROM messages WHERE id = ? AND channel_id = ?').get(parent_id, req.params.channelId);
    if (!parent) {
      return res.status(404).json({ error: 'Parent message not found' });
    }
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO messages (id, channel_id, author_id, content, parent_id) VALUES (?, ?, ?, ?, ?)'
  ).run(id, req.params.channelId, req.user.id, content.trim(), parent_id || null);

  const message = db.prepare(`
    SELECT m.*, u.name as author_name, u.role as author_role
    FROM messages m JOIN users u ON m.author_id = u.id
    WHERE m.id = ?
  `).get(id);

  res.status(201).json({ message: { ...message, replies: [], reactions: [] } });
});

// POST /api/messages/:messageId/react
router.post('/:messageId/react', authenticate, (req, res) => {
  const { emoji } = req.body;
  if (!emoji) {
    return res.status(400).json({ error: 'Emoji is required' });
  }

  const db = getDb();
  const existing = db.prepare(
    'SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?'
  ).get(req.params.messageId, req.user.id, emoji);

  if (existing) {
    db.prepare('DELETE FROM message_reactions WHERE id = ?').run(existing.id);
    return res.json({ action: 'removed' });
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO message_reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)'
  ).run(id, req.params.messageId, req.user.id, emoji);

  res.json({ action: 'added' });
});

module.exports = router;
