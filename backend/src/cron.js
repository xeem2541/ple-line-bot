const cron = require('node-cron');
const { sendLineNotify } = require('./services/lineNotify');

const startCronJobs = (db) => {
  // Run every day at 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('Running daily cron job for expiring policies...');
    try {
      const [policies] = await db.query(`
        SELECT p.policy_no, c.first_name, c.last_name, v.plate_no, p.expiry_date,
               DATEDIFF(p.expiry_date, CURDATE()) as days_left
        FROM policies p
        JOIN customers c ON p.customer_id = c.id
        LEFT JOIN vehicles v ON p.vehicle_id = v.id
        WHERE p.status NOT IN ('สำเร็จ', 'ชำระครบแล้ว', 'ยกเลิก')
          AND DATEDIFF(p.expiry_date, CURDATE()) IN (30, 15, 7, 3, 1, 0)
      `);

      if (policies.length > 0) {
        let msg = `⏰ แจ้งเตือนประกันใกล้หมดอายุ!\nวันนี้มีลูกค้าต้องติดตาม ${policies.length} ราย:\n\n`;
        policies.forEach(p => {
          msg += `- ${p.first_name} ${p.last_name} (${p.plate_no || 'ไม่ระบุทะเบียน'})\n  หมดอายุในอีก ${p.days_left} วัน\n`;
        });
        
        await sendLineNotify(msg);
      }
    } catch (error) {
      console.error('Cron job error:', error);
    }
  });
  console.log('Cron jobs scheduled.');
};

module.exports = { startCronJobs };
