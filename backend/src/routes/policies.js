const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { sendLineNotify } = require('../services/lineNotify');

// Get all policies (with search and filter)
router.get('/', authenticateToken, async (req, res) => {
  const { search, customer_id, vehicle_id } = req.query;
  let query = `
    SELECT p.*, c.first_name, c.last_name, c.customer_code, v.plate_no, v.brand, v.model, u.name as sales_person_name
    FROM policies p 
    JOIN customers c ON p.customer_id = c.id
    LEFT JOIN vehicles v ON p.vehicle_id = v.id
    LEFT JOIN users u ON p.sales_person_id = u.id
  `;
  let params = [];
  let conditions = [];
  
  if (customer_id) {
    conditions.push('p.customer_id = ?');
    params.push(customer_id);
  }
  
  if (vehicle_id) {
    conditions.push('p.vehicle_id = ?');
    params.push(vehicle_id);
  }
  
  if (search) {
    conditions.push(`(p.policy_no LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR v.plate_no LIKE ?)`);
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY p.created_at DESC';

  try {
    const [policies] = await req.db.query(query, params);
    res.json(policies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get policy by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [policies] = await req.db.query(`
      SELECT p.*, c.first_name, c.last_name, c.customer_code, v.plate_no, v.brand, v.model
      FROM policies p 
      JOIN customers c ON p.customer_id = c.id
      LEFT JOIN vehicles v ON p.vehicle_id = v.id
      WHERE p.id = ?
    `, [req.params.id]);
    if (policies.length === 0) return res.status(404).json({ error: 'Policy not found' });
    res.json(policies[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create policy
router.post('/', authenticateToken, async (req, res) => {
  const { 
    customer_id, vehicle_id, policy_no, company, type, sum_insured, 
    net_premium, stamp_duty, vat, total_premium, commission_percent, commission_baht, 
    payment_method, start_date, expiry_date, status, sales_person_id 
  } = req.body;

  try {
    const [result] = await req.db.query(
      `INSERT INTO policies (
        customer_id, vehicle_id, policy_no, company, type, sum_insured, 
        net_premium, stamp_duty, vat, total_premium, commission_percent, commission_baht, 
        payment_method, start_date, expiry_date, status, sales_person_id, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_id, vehicle_id || null, policy_no, company, type, sum_insured || null,
        net_premium || 0, stamp_duty || 0, vat || 0, total_premium || 0, commission_percent || 0, commission_baht || 0,
        payment_method || 'เงินสด', start_date, expiry_date, status || 'รอดำเนินการ', sales_person_id || null, req.user.id
      ]
    );
    
    await req.db.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE', 'policies', result.insertId, `Created policy ${policy_no}`]);

    // Send LINE Notify if status is success or closed
    if (status === 'สำเร็จ' || status === 'ชำระครบแล้ว') {
      const msg = `🎉 ปิดการขายใหม่!\nกรมธรรม์: ${policy_no}\nบริษัท: ${company} (${type})\nเบี้ยรวม: ${total_premium} บาท\nสถานะ: ${status}`;
      sendLineNotify(msg);
    }

    res.status(201).json({ id: result.insertId, message: 'Policy created successfully' });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Policy number already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update policy
router.put('/:id', authenticateToken, async (req, res) => {
  const { 
    vehicle_id, company, type, sum_insured, 
    net_premium, stamp_duty, vat, total_premium, commission_percent, commission_baht, 
    payment_method, start_date, expiry_date, status, sales_person_id 
  } = req.body;

  try {
    await req.db.query(
      `UPDATE policies SET 
        vehicle_id=?, company=?, type=?, sum_insured=?, 
        net_premium=?, stamp_duty=?, vat=?, total_premium=?, commission_percent=?, commission_baht=?, 
        payment_method=?, start_date=?, expiry_date=?, status=?, sales_person_id=?
       WHERE id=?`,
      [
        vehicle_id || null, company, type, sum_insured || null,
        net_premium || 0, stamp_duty || 0, vat || 0, total_premium || 0, commission_percent || 0, commission_baht || 0,
        payment_method || 'เงินสด', start_date, expiry_date, status || 'รอดำเนินการ', sales_person_id || null, req.params.id
      ]
    );
    
    await req.db.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE', 'policies', req.params.id, `Updated policy ID ${req.params.id}`]);

    res.json({ message: 'Policy updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
