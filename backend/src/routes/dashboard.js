const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [customers] = await req.db.query('SELECT COUNT(*) as count FROM customers');
    const [policies] = await req.db.query('SELECT COUNT(*) as count FROM policies');
    const [documents] = await req.db.query('SELECT COUNT(*) as count FROM documents WHERE deleted_at IS NULL');
    
    // New customers this month
    const [newCustomers] = await req.db.query(`
      SELECT COUNT(*) as count FROM customers 
      WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
    `);

    // Sales this month
    const [salesThisMonth] = await req.db.query(`
      SELECT SUM(total_premium) as total FROM policies 
      WHERE status = 'สำเร็จ' 
      AND MONTH(start_date) = MONTH(CURRENT_DATE()) 
      AND YEAR(start_date) = YEAR(CURRENT_DATE())
    `);

    // Sales this year
    const [salesThisYear] = await req.db.query(`
      SELECT SUM(total_premium) as total FROM policies 
      WHERE status = 'สำเร็จ' 
      AND YEAR(start_date) = YEAR(CURRENT_DATE())
    `);

    // Commission total this month
    const [commThisMonth] = await req.db.query(`
      SELECT SUM(commission_baht) as total FROM policies 
      WHERE status = 'สำเร็จ' 
      AND MONTH(start_date) = MONTH(CURRENT_DATE()) 
      AND YEAR(start_date) = YEAR(CURRENT_DATE())
    `);

    // Policies expiring in 90 days (for notifications)
    const [expiringPolicies] = await req.db.query(`
      SELECT p.*, c.first_name, c.last_name, v.plate_no, DATEDIFF(p.expiry_date, CURRENT_DATE()) as days_left
      FROM policies p 
      JOIN customers c ON p.customer_id = c.id 
      LEFT JOIN vehicles v ON p.vehicle_id = v.id
      WHERE p.status = 'สำเร็จ' 
      AND p.expiry_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 90 DAY)
      ORDER BY p.expiry_date ASC
    `);

    // Top 10 Companies by Sales
    const [topCompanies] = await req.db.query(`
      SELECT company, SUM(total_premium) as total_sales, COUNT(*) as policy_count 
      FROM policies 
      WHERE status = 'สำเร็จ'
      GROUP BY company 
      ORDER BY total_sales DESC 
      LIMIT 10
    `);

    // Top 10 Sales Persons
    const [topSales] = await req.db.query(`
      SELECT u.name, SUM(p.total_premium) as total_sales, COUNT(p.id) as policy_count 
      FROM policies p
      JOIN users u ON p.sales_person_id = u.id
      WHERE p.status = 'สำเร็จ'
      GROUP BY u.id, u.name 
      ORDER BY total_sales DESC 
      LIMIT 10
    `);

    // Monthly Sales for Chart
    const [monthlySales] = await req.db.query(`
      SELECT MONTH(start_date) as month, SUM(total_premium) as total_sales 
      FROM policies 
      WHERE status = 'สำเร็จ' AND YEAR(start_date) = YEAR(CURRENT_DATE())
      GROUP BY MONTH(start_date)
      ORDER BY month ASC
    `);

    res.json({
      totalCustomers: customers[0].count,
      totalPolicies: policies[0].count,
      totalDocuments: documents[0].count,
      newCustomersThisMonth: newCustomers[0].count,
      salesThisMonth: salesThisMonth[0].total || 0,
      salesThisYear: salesThisYear[0].total || 0,
      commThisMonth: commThisMonth[0].total || 0,
      expiringPolicies: expiringPolicies,
      topCompanies: topCompanies,
      topSales: topSales,
      monthlySales: monthlySales
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
