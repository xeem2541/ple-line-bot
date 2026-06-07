const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');

// Get all customers with search
router.get('/', authenticateToken, async (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM customers ORDER BY created_at DESC';
  let params = [];
  
  if (search) {
    query = `SELECT * FROM customers WHERE 
      first_name LIKE ? OR 
      last_name LIKE ? OR 
      phone LIKE ? OR 
      id_card_no LIKE ? OR 
      customer_code LIKE ?
      ORDER BY created_at DESC`;
    const searchParam = `%${search}%`;
    params = [searchParam, searchParam, searchParam, searchParam, searchParam];
  }

  try {
    const [customers] = await req.db.query(query, params);
    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get customer by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [customers] = await req.db.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (customers.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(customers[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create customer
router.post('/', authenticateToken, async (req, res) => {
  const { 
    customer_code, prefix, first_name, last_name, phone, email, line_id, facebook, 
    dob, age, id_card_no, address, province, zipcode, occupation, secondary_contact, 
    customer_status, lead_status, source, note 
  } = req.body;
  
  try {
    const [result] = await req.db.query(
      `INSERT INTO customers (
        customer_code, prefix, first_name, last_name, phone, email, line_id, facebook, 
        dob, age, id_card_no, address, province, zipcode, occupation, secondary_contact, 
        customer_status, lead_status, source, note, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_code, prefix, first_name, last_name, phone, email, line_id, facebook, 
        dob || null, age || null, id_card_no, address, province, zipcode, occupation, secondary_contact, 
        customer_status || 'ลูกค้าใหม่', lead_status || 'สนใจ', source, note, req.user.id
      ]
    );
    
    await req.db.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE', 'customers', result.insertId, `Created customer ${customer_code}`]);

    res.status(201).json({ id: result.insertId, message: 'Customer created successfully' });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Customer code or ID card already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update customer
router.put('/:id', authenticateToken, async (req, res) => {
  const { 
    prefix, first_name, last_name, phone, email, line_id, facebook, 
    dob, age, id_card_no, address, province, zipcode, occupation, secondary_contact, 
    customer_status, lead_status, source, note 
  } = req.body;
  
  try {
    await req.db.query(
      `UPDATE customers SET 
        prefix=?, first_name=?, last_name=?, phone=?, email=?, line_id=?, facebook=?, 
        dob=?, age=?, id_card_no=?, address=?, province=?, zipcode=?, occupation=?, secondary_contact=?, 
        customer_status=?, lead_status=?, source=?, note=? 
       WHERE id=?`,
      [
        prefix, first_name, last_name, phone, email, line_id, facebook, 
        dob || null, age || null, id_card_no, address, province, zipcode, occupation, secondary_contact, 
        customer_status || 'ลูกค้าใหม่', lead_status || 'สนใจ', source, note, req.params.id
      ]
    );

    await req.db.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE', 'customers', req.params.id, `Updated customer ID ${req.params.id}`]);

    res.json({ message: 'Customer updated successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'ID card already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
