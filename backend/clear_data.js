const mysql = require('mysql2/promise');

async function clearData() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'db',
      user: process.env.DB_USER || 'app_user',
      password: process.env.DB_PASSWORD || 'app_password',
      database: process.env.DB_NAME || 'insurance_db',
    });

    console.log('Connected to database. Starting to delete data...');

    // Disable foreign key checks to truncate tables
    await pool.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    await pool.query('TRUNCATE TABLE activity_logs;');
    console.log('activity_logs truncated');
    
    await pool.query('TRUNCATE TABLE documents;');
    console.log('documents truncated');
    
    await pool.query('TRUNCATE TABLE policies;');
    console.log('policies truncated');
    
    await pool.query('TRUNCATE TABLE customers;');
    console.log('customers truncated');
    
    await pool.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('All mock data cleared successfully! Users and document types were preserved.');
    pool.end();
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

clearData();
