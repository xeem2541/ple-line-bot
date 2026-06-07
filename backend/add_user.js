const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function addUser() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'db',
      user: process.env.DB_USER || 'app_user',
      password: process.env.DB_PASSWORD || 'app_password',
      database: process.env.DB_NAME || 'insurance_db',
    });
    
    const hashedPassword = await bcrypt.hash('0616059976', 10);
    
    // Check if user already exists
    const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', ['fong']);
    if (rows.length > 0) {
      await pool.query('UPDATE users SET password = ?, role = "Admin" WHERE username = ?', [hashedPassword, 'fong']);
      console.log('User fong updated successfully!');
    } else {
      await pool.query(
        'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
        ['fong', hashedPassword, 'คุณฟอง (Admin)', 'Admin']
      );
      console.log('User fong created successfully!');
    }
    
    pool.end();
  } catch (err) {
    console.error(err);
  }
}

addUser();
