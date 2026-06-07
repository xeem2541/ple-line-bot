const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middlewares/auth');

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, JPG, and PNG files are allowed!'));
  }
});

// Get document types
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const [types] = await req.db.query('SELECT * FROM document_types');
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get documents (by customer or policy)
router.get('/', authenticateToken, async (req, res) => {
  const { customer_id, policy_id, search } = req.query;
  let query = `
    SELECT d.*, dt.name as document_type_name, u.name as uploader_name 
    FROM documents d
    JOIN document_types dt ON d.document_type_id = dt.id
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.deleted_at IS NULL
  `;
  let params = [];
  
  if (customer_id) {
    query += ' AND d.customer_id = ? ';
    params.push(customer_id);
  }
  if (policy_id) {
    query += ' AND d.policy_id = ? ';
    params.push(policy_id);
  }
  if (search) {
    query += ' AND (d.name LIKE ? OR dt.name LIKE ?) ';
    const s = `%${search}%`;
    params.push(s, s);
  }
  
  query += ' ORDER BY d.created_at DESC';

  try {
    const [documents] = await req.db.query(query, params);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload document
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { customer_id, policy_id, document_type_id, name, note } = req.body;
  
  try {
    const [result] = await req.db.query(
      `INSERT INTO documents (customer_id, policy_id, document_type_id, name, file_path, file_type, file_size, version, note, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        customer_id, 
        policy_id || null, 
        document_type_id, 
        name, 
        `/uploads/${req.file.filename}`, 
        req.file.mimetype, 
        req.file.size, 
        note, 
        req.user.id
      ]
    );

    await req.db.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPLOAD', 'documents', result.insertId, `Uploaded document ${name}`]);

    res.status(201).json({ id: result.insertId, message: 'Document uploaded successfully', file_path: `/uploads/${req.file.filename}` });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Soft Delete document
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await req.db.query('UPDATE documents SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    await req.db.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE', 'documents', req.params.id, `Deleted document ID ${req.params.id}`]);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Save Cloudinary URL
router.post('/save-url', authenticateToken, async (req, res) => {
  const { customer_id, policy_id, document_type_id, name, file_path, file_type, file_size, note } = req.body;
  
  if (!file_path) return res.status(400).json({ error: 'No file_path provided' });

  try {
    const [result] = await req.db.query(
      `INSERT INTO documents (customer_id, policy_id, document_type_id, name, file_path, file_type, file_size, version, note, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        customer_id, 
        policy_id || null, 
        document_type_id, 
        name, 
        file_path, 
        file_type || 'image/jpeg', 
        file_size || 0, 
        note, 
        req.user.id
      ]
    );

    await req.db.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPLOAD', 'documents', result.insertId, `Uploaded Cloudinary document ${name}`]);

    res.status(201).json({ id: result.insertId, message: 'Document saved successfully', file_path });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
