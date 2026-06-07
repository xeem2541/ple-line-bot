require('dotenv').config();
const mysql = require('mysql2/promise');

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

async function fixDB() {
  try {
    console.log('Connecting to database...');
    
    // Create document_types table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_types (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('document_types table checked/created.');

    // Seed document_types
    await pool.query(`
      INSERT IGNORE INTO document_types (id, name, description) VALUES 
      (1, 'ตารางกรมธรรม์', 'หน้าตารางกรมธรรม์ประกันภัย'),
      (2, 'ใบเสร็จรับเงิน', 'หลักฐานการชำระเงิน'),
      (3, 'สำเนาบัตรประชาชน', 'เอกสารยืนยันตัวตนลูกค้า'),
      (4, 'สำเนาทะเบียนรถ', 'เอกสารแสดงความเป็นเจ้าของรถ'),
      (5, 'รูปถ่ายรถยนต์', 'รูปถ่ายสภาพรถยนต์ก่อนทำประกัน'),
      (6, 'อื่นๆ', 'เอกสารอื่นๆ')
    `);
    console.log('document_types seeded.');

    // Create documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        policy_id INT,
        document_type_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(100),
        file_size INT,
        version INT DEFAULT 1,
        note TEXT,
        uploaded_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE SET NULL,
        FOREIGN KEY (document_type_id) REFERENCES document_types(id)
      )
    `);
    console.log('documents table checked/created.');

    console.log('Database fixed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error fixing database:', err);
    process.exit(1);
  }
}

fixDB();
