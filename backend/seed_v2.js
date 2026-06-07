const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = mysql.createPool({
  uri: process.env.DB_URI ? process.env.DB_URI : undefined,
  host: process.env.DB_URI ? undefined : (process.env.DB_HOST || 'db'),
  user: process.env.DB_URI ? undefined : (process.env.DB_USER || 'app_user'),
  password: process.env.DB_URI ? undefined : (process.env.DB_PASSWORD || 'app_password'),
  database: process.env.DB_URI ? undefined : (process.env.DB_NAME || 'insurance_db'),
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined
});

async function seedData() {
  try {
    console.log('Connected to database. Starting to seed CRM v2.0 data...');

    // 1. Seed Users (Roles)
    const users = [
      { username: 'admin', role: 'Admin', name: 'System Admin' },
      { username: 'manager', role: 'Manager', name: 'Sale Manager' },
      { username: 'staff', role: 'Staff', name: 'Operation Staff' },
      { username: 'sales1', role: 'Sales', name: 'Sales Person 1' },
      { username: 'viewer', role: 'Viewer', name: 'Guest Viewer' }
    ];
    
    for (const u of users) {
      const hash = await bcrypt.hash('123456', 10);
      try {
        await pool.query('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', [u.username, hash, u.name, u.role]);
      } catch (e) {
        if (e.code !== 'ER_DUP_ENTRY') throw e;
      }
    }
    console.log('Users seeded.');

    // Wait for a bit for auto-increment to settle if needed, not really.
    
    // Generate some fake data
    const firstNames = ['สมชาย', 'สมหญิง', 'มานะ', 'มานี', 'ปิติ', 'ชูใจ', 'วีระ', 'สมศักดิ์', 'พรทิพย์', 'ณรงค์'];
    const lastNames = ['ใจดี', 'รักไทย', 'มีทรัพย์', 'พาณิชย์', 'รุ่งเรือง', 'สุขใจ', 'มั่งคั่ง', 'มั่นคง', 'ร่ำรวย', 'ยอดเยี่ยม'];
    const provinces = ['กรุงเทพมหานคร', 'นนทบุรี', 'เชียงใหม่', 'ชลบุรี', 'ภูเก็ต'];
    
    const [adminRow] = await pool.query('SELECT id FROM users WHERE username="admin"');
    const adminId = adminRow[0].id;
    const [salesRow] = await pool.query('SELECT id FROM users WHERE username="sales1"');
    const salesId = salesRow[0].id;

    for (let i = 1; i <= 10; i++) {
      // 2. Seed Customers
      const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
      const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
      const prov = provinces[Math.floor(Math.random() * provinces.length)];
      const statuses = ['ลูกค้าใหม่', 'ลูกค้าปัจจุบัน', 'ลูกค้าต่ออายุ', 'ลูกค้าหาย', 'ลูกค้า VIP'];
      const leadStatuses = ['สนใจ', 'ส่งราคาแล้ว', 'รอตัดสินใจ', 'ติดตามครั้งที่ 1', 'ติดตามครั้งที่ 2', 'ปิดการขาย', 'ไม่สนใจ'];
      const sources = ['Facebook', 'TikTok', 'Website', 'LINE', 'ลูกค้าเก่าแนะนำ', 'Walk-in'];

      const custResult = await pool.query(`
        INSERT INTO customers (
          customer_code, prefix, first_name, last_name, phone, email, line_id, 
          age, id_card_no, address, province, zipcode, customer_status, lead_status, source, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `CUS-2026-${String(i).padStart(4, '0')}`,
        'คุณ', fn, ln,
        `08${Math.floor(Math.random() * 90000000 + 10000000)}`,
        `customer${i}@example.com`,
        `line_id_${i}`,
        Math.floor(Math.random() * 40 + 20),
        `1${Math.floor(Math.random() * 900000000000 + 100000000000)}`,
        `123/45 ถนนทดสอบ`, prov, '10000',
        statuses[Math.floor(Math.random() * statuses.length)],
        leadStatuses[Math.floor(Math.random() * leadStatuses.length)],
        sources[Math.floor(Math.random() * sources.length)],
        salesId
      ]);
      const customerId = custResult[0].insertId;

      // 3. Seed Vehicles
      const brands = ['Toyota', 'Honda', 'Isuzu', 'Nissan', 'Ford', 'Mazda'];
      const brand = brands[Math.floor(Math.random() * brands.length)];
      
      const vehResult = await pool.query(`
        INSERT INTO vehicles (
          customer_id, vehicle_type, brand, model, year, color, plate_no, plate_province, sum_insured
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customerId,
        'รถเก๋ง', brand, 'Sedan', '202' + Math.floor(Math.random() * 5),
        'ขาว', `${Math.floor(Math.random() * 9) + 1}กข ${Math.floor(Math.random() * 9000 + 1000)}`, prov,
        Math.floor(Math.random() * 500000 + 300000)
      ]);
      const vehicleId = vehResult[0].insertId;

      // 4. Seed Policies
      // Let's create some active and some expired
      const isActive = Math.random() > 0.3;
      const startDate = new Date();
      if (!isActive) {
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 6));
      } else {
        startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 6));
      }
      const expiryDate = new Date(startDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      const netPremium = Math.floor(Math.random() * 15000 + 5000);
      const stampDuty = netPremium * 0.004;
      const vat = (netPremium + stampDuty) * 0.07;
      const totalPremium = netPremium + stampDuty + vat;
      const commPercent = 18;
      const commBaht = netPremium * (commPercent / 100);

      await pool.query(`
        INSERT INTO policies (
          customer_id, vehicle_id, policy_no, company, type, sum_insured,
          net_premium, stamp_duty, vat, total_premium, commission_percent, commission_baht,
          payment_method, start_date, expiry_date, status, sales_person_id, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customerId, vehicleId,
        `POL-2026-${String(i).padStart(4, '0')}`,
        'วิริยะประกันภัย', 'ประกันภัยชั้น 1',
        Math.floor(Math.random() * 500000 + 300000),
        netPremium, stampDuty, vat, totalPremium, commPercent, commBaht,
        'เงินสด',
        startDate.toISOString().split('T')[0],
        expiryDate.toISOString().split('T')[0],
        isActive ? 'สำเร็จ' : 'รอต่ออายุ',
        salesId, adminId,
        startDate.toISOString().split('T')[0] + ' 10:00:00' // Backdate created_at for dashboard charts
      ]);
    }

    console.log('Successfully seeded 10 customers, vehicles, and policies!');
    pool.end();
  } catch (err) {
    console.error('Seeding failed:', err);
    pool.end();
  }
}

seedData();
