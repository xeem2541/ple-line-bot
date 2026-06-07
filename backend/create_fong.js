const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'insurance_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function createUser() {
  try {
    const hashedPassword = await bcrypt.hash('0616059976', 10);
    
    // Check if user exists
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', ['fong']);
    
    if (existing.length > 0) {
      // Update
      await pool.query('UPDATE users SET password = ?, role = "Admin", name = "Fong (Admin)" WHERE username = ?', [hashedPassword, 'fong']);
      console.log('Updated existing user: fong');
    } else {
      // Insert
      await pool.query('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)', ['fong', hashedPassword, 'Admin', 'Fong (Admin)']);
      console.log('Created new user: fong');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

createUser();
