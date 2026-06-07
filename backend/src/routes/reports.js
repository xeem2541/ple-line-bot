const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middlewares/auth');

// Get generic report data (Sales, Commission, etc.)
router.get('/', [authenticateToken, authorizeRole(['Admin', 'Manager', 'Sales'])], async (req, res) => {
  const { type, start_date, end_date } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  try {
    let query = '';
    let params = [start_date, end_date];

    switch(type) {
      case 'sales_daily':
        query = `
          SELECT DATE(start_date) as date, SUM(total_premium) as total_sales, COUNT(id) as policy_count, SUM(commission_baht) as total_commission
          FROM policies 
          WHERE status = 'สำเร็จ' AND start_date BETWEEN ? AND ?
          GROUP BY DATE(start_date)
          ORDER BY date ASC
        `;
        break;
      case 'sales_monthly':
        query = `
          SELECT DATE_FORMAT(start_date, '%Y-%m') as month, SUM(total_premium) as total_sales, COUNT(id) as policy_count, SUM(commission_baht) as total_commission
          FROM policies 
          WHERE status = 'สำเร็จ' AND start_date BETWEEN ? AND ?
          GROUP BY DATE_FORMAT(start_date, '%Y-%m')
          ORDER BY month ASC
        `;
        break;
      case 'renewal':
        query = `
          SELECT p.*, c.first_name, c.last_name, c.phone, v.plate_no, DATEDIFF(p.expiry_date, CURRENT_DATE()) as days_left
          FROM policies p
          JOIN customers c ON p.customer_id = c.id
          LEFT JOIN vehicles v ON p.vehicle_id = v.id
          WHERE p.status = 'สำเร็จ' AND p.expiry_date BETWEEN ? AND ?
          ORDER BY p.expiry_date ASC
        `;
        break;
      case 'arrears':
        query = `
          SELECT p.*, c.first_name, c.last_name, c.phone, v.plate_no
          FROM policies p
          JOIN customers c ON p.customer_id = c.id
          LEFT JOIN vehicles v ON p.vehicle_id = v.id
          WHERE p.status = 'รอผ่อนชำระ' AND p.start_date BETWEEN ? AND ?
          ORDER BY p.start_date DESC
        `;
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    const [rows] = await req.db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
