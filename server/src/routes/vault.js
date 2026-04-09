const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/schema');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// File storage abstraction — swap to S3 by replacing this layer
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-excel',
];

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Allowed: PDF, DOCX, XLSX'));
    }
  },
});

// GET /api/vault
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { category, search } = req.query;

  let query = `
    SELECT v.*, u.name as uploader_name
    FROM vault_documents v
    JOIN users u ON v.uploaded_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (category) {
    query += ' AND v.category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (v.title LIKE ? OR v.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY v.created_at DESC';

  const documents = db.prepare(query).all(...params);
  const categories = db.prepare('SELECT DISTINCT category FROM vault_documents ORDER BY category').all().map(r => r.category);

  res.json({ documents, categories });
});

// POST /api/vault/upload
router.post('/upload', authenticate, requireAdmin, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const { title, description, category } = req.body;
    if (!title || !category) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Title and category are required' });
    }

    const db = getDb();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO vault_documents (id, title, description, category, filename, original_name, file_size, mime_type, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description || '', category, req.file.filename, req.file.originalname, req.file.size, req.file.mimetype, req.user.id);

    const document = db.prepare(`
      SELECT v.*, u.name as uploader_name
      FROM vault_documents v JOIN users u ON v.uploaded_by = u.id
      WHERE v.id = ?
    `).get(id);

    res.status(201).json({ document });
  });
});

// GET /api/vault/:id/download
router.get('/:id/download', authenticate, (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM vault_documents WHERE id = ?').get(req.params.id);

  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const filePath = path.join(UPLOAD_DIR, doc.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  res.download(filePath, doc.original_name);
});

// DELETE /api/vault/:id
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM vault_documents WHERE id = ?').get(req.params.id);

  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const filePath = path.join(UPLOAD_DIR, doc.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM vault_documents WHERE id = ?').run(req.params.id);
  res.json({ message: 'Document deleted' });
});

module.exports = router;
