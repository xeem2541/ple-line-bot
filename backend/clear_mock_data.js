const mysql = require('mysql2/promise');

async function clearData() {
    const connection = await mysql.createConnection({
        uri: 'mysql://BsRyTEVHX6fudsU.root:MqZz2WMqULDfGPqu@gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com:4000/insurance_db?ssl={"rejectUnauthorized":true}'
    });

    try {
        console.log("Connected! Clearing mock data...");
        // Delete policies first due to foreign keys
        await connection.query('DELETE FROM policies');
        console.log("Policies cleared.");
        
        // Delete vehicles next
        await connection.query('DELETE FROM vehicles');
        console.log("Vehicles cleared.");
        
        // Delete customers
        await connection.query('DELETE FROM customers');
        console.log("Customers cleared.");

        // Reset auto-increment counters if needed
        await connection.query('ALTER TABLE policies AUTO_INCREMENT = 1');
        await connection.query('ALTER TABLE vehicles AUTO_INCREMENT = 1');
        await connection.query('ALTER TABLE customers AUTO_INCREMENT = 1');
        
        console.log("All mock data cleared successfully! System is now empty and ready for real data.");
    } catch (err) {
        console.error("Error clearing data:", err);
    } finally {
        await connection.end();
    }
}

clearData();
