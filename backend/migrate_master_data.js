const mysql = require('mysql2/promise');

const masterData = [
  // Policy Types
  { category: 'PolicyType', value: 'พ.ร.บ.' },
  { category: 'PolicyType', value: 'ประกันภัยชั้น 1' },
  { category: 'PolicyType', value: 'ประกันภัยชั้น 2+' },
  { category: 'PolicyType', value: 'ประกันภัยชั้น 3+' },
  { category: 'PolicyType', value: 'ประกันภัยชั้น 3' },
  { category: 'PolicyType', value: 'ประกันภัยอุบัติเหตุ PA' },
  { category: 'PolicyType', value: 'ประกันภัยขนส่งสินค้า' },
  { category: 'PolicyType', value: 'ประกันภัยอัคคีภัย/ไฟไหม้' },
  { category: 'PolicyType', value: 'ประกันภัยรับผิดบุคคลภายนอก' },
  { category: 'PolicyType', value: 'ประกันภัยรับเหมา' },
  { category: 'PolicyType', value: 'ประกันภัยวิชาชีพ' },
  { category: 'PolicyType', value: 'ประกันภัยสุขภาพ' },
  { category: 'PolicyType', value: 'ประกันภัยเงินออม' },
  { category: 'PolicyType', value: 'ประกันภัย T Life' },

  // Insurance Companies
  { category: 'InsuranceCompany', value: 'วิริยะประกันภัย' },
  { category: 'InsuranceCompany', value: 'กรุงเทพประกันภัย' },
  { category: 'InsuranceCompany', value: 'ธนชาตประกันภัย' },
  { category: 'InsuranceCompany', value: 'ทิพยประกันภัย' },
  { category: 'InsuranceCompany', value: 'คุ้มภัยโตเกียวมารีน' },
  { category: 'InsuranceCompany', value: 'ไทยวิวัฒน์ประกันภัย' },
  { category: 'InsuranceCompany', value: 'เมืองไทยประกันภัย' },
  { category: 'InsuranceCompany', value: 'แอกซ่าประกันภัย' },
  { category: 'InsuranceCompany', value: 'MSIG ประกันภัย' },
  { category: 'InsuranceCompany', value: 'แอลเอ็มจีประกันภัย' },
  { category: 'InsuranceCompany', value: 'ซับบ์สามัคคีประกันภัย' },
  { category: 'InsuranceCompany', value: 'นวกิจประกันภัย' },
  { category: 'InsuranceCompany', value: 'เออร์โก้ประกันภัย' },
  { category: 'InsuranceCompany', value: 'ไอโออิกรุงเทพประกันภัย' },
  { category: 'InsuranceCompany', value: 'อลิอันซ์ประกันภัย' },
  { category: 'InsuranceCompany', value: 'เทเวศประกันภัย' },

  // Vehicle Types
  { category: 'VehicleType', value: 'รถมอเตอร์ไซค์' },
  { category: 'VehicleType', value: 'รถกระบะ' },
  { category: 'VehicleType', value: 'รถเก๋ง' },
  { category: 'VehicleType', value: 'รถกระบะ 4 ประตู' },
  { category: 'VehicleType', value: 'รถโดยสาร' },
  { category: 'VehicleType', value: 'รถ 6 ล้อ' },
  { category: 'VehicleType', value: 'รถ 10 ล้อ' },
  { category: 'VehicleType', value: 'รถพ่วง' },
  { category: 'VehicleType', value: 'รถเพื่อการเกษตร' },

  // Job Statuses
  { category: 'JobStatus', value: 'สำเร็จ' },
  { category: 'JobStatus', value: 'รอดำเนินการ' },
  { category: 'JobStatus', value: 'รอถ่ายรูปรถ' },
  { category: 'JobStatus', value: 'รอผ่อนชำระ' },
  { category: 'JobStatus', value: 'ชำระครบแล้ว' },

  // Payment Methods
  { category: 'PaymentMethod', value: 'เงินสด' },
  { category: 'PaymentMethod', value: 'เงินผ่อน (ตัวแทน)' },
  { category: 'PaymentMethod', value: 'เงินผ่อน (เงินติดล้อ)' },
  { category: 'PaymentMethod', value: 'เงินผ่อน (ทีโบรคเกอร์)' },
  { category: 'PaymentMethod', value: 'เงินผ่อน (ฟิน)' },
  { category: 'PaymentMethod', value: 'บัตรเครดิต' }
];

async function migrate() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'db',
      user: process.env.DB_USER || 'app_user',
      password: process.env.DB_PASSWORD || 'app_password',
      database: process.env.DB_NAME || 'insurance_db',
    });

    console.log('Connected to database. Running migrations...');

    // 1. Create master_data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        value VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Created master_data table.');

    // 2. Clear existing master_data to prevent duplicates on rerun
    await pool.query('TRUNCATE TABLE master_data;');

    // 3. Insert Master Data
    for (const item of masterData) {
      await pool.query('INSERT INTO master_data (category, value) VALUES (?, ?)', [item.category, item.value]);
    }
    console.log('Seeded Master Data.');

    // 4. Alter policies table
    // Change status from ENUM to VARCHAR
    try {
      await pool.query("ALTER TABLE policies MODIFY COLUMN status VARCHAR(100) DEFAULT 'รอดำเนินการ';");
      console.log('Modified policies.status column.');
    } catch (e) {
      console.log('Error modifying status column:', e.message);
    }

    // Add vehicle_type column if not exists
    try {
      await pool.query("ALTER TABLE policies ADD COLUMN vehicle_type VARCHAR(100) AFTER type;");
      console.log('Added policies.vehicle_type column.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('policies.vehicle_type already exists.');
      else console.log('Error adding vehicle_type:', e.message);
    }

    // Add payment_method column if not exists
    try {
      await pool.query("ALTER TABLE policies ADD COLUMN payment_method VARCHAR(100) AFTER premium;");
      console.log('Added policies.payment_method column.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('policies.payment_method already exists.');
      else console.log('Error adding payment_method:', e.message);
    }

    // Also update database/init.sql for future docker builds
    const fs = require('fs');
    const initSqlPath = '/app/../database/init.sql'; // Actually /app is C:\Users\FONG\Documents\dc\backend
    
    console.log('Migration completed successfully!');
    pool.end();
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate();
