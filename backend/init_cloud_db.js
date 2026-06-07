const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDB() {
    console.log("Connecting to TiDB Serverless...");
    const uri = 'mysql://BsRyTEVHX6fudsU.root:MqZz2WMqULDfGPqu@gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com:4000/sys?ssl={"rejectUnauthorized":true}';
    
    const connection = await mysql.createConnection({
        uri: uri,
        multipleStatements: true
    });

    try {
        console.log("Connected successfully!");
        const sqlPath = path.join(__dirname, '../database/init.sql');
        const sqlScript = fs.readFileSync(sqlPath, 'utf8');
        
        console.log("Running init.sql...");
        await connection.query(sqlScript);
        console.log("init.sql executed successfully!");
        
    } catch (err) {
        console.error("Error executing SQL:", err);
    } finally {
        await connection.end();
    }
}

initDB();
