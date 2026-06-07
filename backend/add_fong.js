const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createFong() {
    const connection = await mysql.createConnection({
        uri: 'mysql://BsRyTEVHX6fudsU.root:MqZz2WMqULDfGPqu@gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com:4000/insurance_db?ssl={"rejectUnauthorized":true}'
    });

    try {
        const hash = await bcrypt.hash('123456', 10);
        await connection.query('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', ['fong', hash, 'Khun Fong', 'Admin']);
        console.log("User fong created successfully!");
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            console.log("User fong already exists, updating password...");
            const hash = await bcrypt.hash('123456', 10);
            await connection.query('UPDATE users SET password = ? WHERE username = ?', [hash, 'fong']);
            console.log("Password updated for fong!");
        } else {
            console.error("Error:", err);
        }
    } finally {
        await connection.end();
    }
}

createFong();
