const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');

// Get all vehicles (with search and customer filter)
router.get('/', authenticateToken, async (req, res) => {
  const { search, customer_id } = req.query;
  let query = `
    SELECT v.*, c.first_name, c.last_name, c.customer_code 
    FROM vehicles v 
    JOIN customers c ON v.customer_id = c.id
  `;
  let params = [];
  let conditions = [];
  
  if (customer_id) {
    conditions.push('v.customer_id = ?');
    params.push(customer_id);
  }
  
  if (search) {
    conditions.push(`(v.plate_no LIKE ? OR v.vin LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ?)`);
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY v.created_at DESC';

  try {
    const [vehicles] = await req.db.query(query, params);
    res.json(vehicles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get vehicle by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [vehicles] = await req.db.query(`
      SELECT v.*, c.first_name, c.last_name, c.customer_code 
      FROM vehicles v 
      JOIN customers c ON v.customer_id = c.id
      WHERE v.id = ?
    `, [req.params.id]);
    if (vehicles.length === 0) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicles[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create vehicle
router.post('/', authenticateToken, async (req, res) => {
  const { 
    customer_id, vehicle_type, brand, model, year, color, 
    plate_no, plate_province, vin, engine_no, sum_insured, tax_expiry, act_expiry 
  } = req.body;

  try {
    const [result] = await req.db.query(
      `INSERT INTO vehicles (
        customer_id, vehicle_type, brand, model, year, color, 
        plate_no, plate_province, vin, engine_no, sum_insured, tax_expiry, act_expiry
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_id, vehicle_type, brand, model, year, color, 
        plate_no, plate_province, vin, engine_no, sum_insured || null, tax_expiry || null, act_expiry || null
      ]
    );
    
    await req.db.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE', 'vehicles', result.insertId, `Created vehicle ${plate_no}`]);

    res.status(201).json({ id: result.insertId, message: 'Vehicle created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update vehicle
router.put('/:id', authenticateToken, async (req, res) => {
  const { 
    vehicle_type, brand, model, year, color, 
    plate_no, plate_province, vin, engine_no, sum_insured, tax_expiry, act_expiry 
  } = req.body;

  try {
    await req.db.query(
      `UPDATE vehicles SET 
        vehicle_type=?, brand=?, model=?, year=?, color=?, 
        plate_no=?, plate_province=?, vin=?, engine_no=?, sum_insured=?, tax_expiry=?, act_expiry=?
       WHERE id=?`,
      [
        vehicle_type, brand, model, year, color, 
        plate_no, plate_province, vin, engine_no, sum_insured || null, tax_expiry || null, act_expiry || null, req.params.id
      ]
    );
    
    await req.db.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE', 'vehicles', req.params.id, `Updated vehicle ID ${req.params.id}`]);

    res.json({ message: 'Vehicle updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete vehicle
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await req.db.query('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
    
    await req.db.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE', 'vehicles', req.params.id, `Deleted vehicle ID ${req.params.id}`]);

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
