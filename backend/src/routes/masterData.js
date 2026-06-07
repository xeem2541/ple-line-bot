const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middlewares/auth');

// Get all master data (optionally filtered by category)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const category = req.query.category;
    let query = 'SELECT * FROM master_data';
    let params = [];
    
    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY id ASC';
    
    const [rows] = await req.db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new master data entry (Admin, Manager)
router.post('/', [authenticateToken, authorizeRole(['Admin', 'Manager'])], async (req, res) => {
  try {
    const { category, value } = req.body;
    if (!category || !value) {
      return res.status(400).json({ error: 'category and value are required' });
    }
    
    const [result] = await req.db.query(
      'INSERT INTO master_data (category, value) VALUES (?, ?)',
      [category, value]
    );
    res.status(201).json({ id: result.insertId, category, value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update master data entry
router.put('/:id', [authenticateToken, authorizeRole(['Admin', 'Manager'])], async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body;
    if (!value) {
      return res.status(400).json({ error: 'value is required' });
    }
    
    await req.db.query(
      'UPDATE master_data SET value = ? WHERE id = ?',
      [value, id]
    );
    res.json({ message: 'Updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete master data entry
router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    await req.db.query('DELETE FROM master_data WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/clear-mock', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    // Disable foreign key checks temporarily to allow truncating
    await req.db.query('SET FOREIGN_KEY_CHECKS = 0');
    
    await req.db.query('TRUNCATE TABLE documents');
    await req.db.query('TRUNCATE TABLE policies');
    await req.db.query('TRUNCATE TABLE vehicles');
    await req.db.query('TRUNCATE TABLE customers');
    
    // Re-enable foreign key checks
    await req.db.query('SET FOREIGN_KEY_CHECKS = 1');
    
    res.json({ message: 'ล้างข้อมูลลูกค้าทั้งหมดเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Clear mock data error:', error);
    await req.db.query('SET FOREIGN_KEY_CHECKS = 1'); // Ensure it gets re-enabled on error
    res.status(500).json({ error: 'Server error during clear data' });
  }
});

module.exports = router;
