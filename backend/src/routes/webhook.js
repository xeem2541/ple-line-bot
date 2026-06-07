const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// Store group ID to send notifications to
const GROUP_ID_FILE = path.join(__dirname, '../../line_group_id.txt');

router.post('/', async (req, res) => {
  res.status(200).send('OK'); // Always return 200 OK immediately for LINE webhooks

  const events = req.body.events;
  if (!events || events.length === 0) return;

  for (const event of events) {
    // If the bot is invited to a group, or someone types in a group, save the Group ID!
    if (event.source.type === 'group' || event.source.type === 'room') {
      const groupId = event.source.groupId || event.source.roomId;
      // Save it locally (in production, we'd save to DB, but a file is fine for this demo/small scale if persistent)
      // Since Render free wipes files, we should probably save it to the DB.
      // Let's save it to DB using req.db
      try {
        await req.db.query(
          "INSERT INTO master_data (category, value, label) VALUES ('LINE_GROUP', ?, 'Office Group') ON DUPLICATE KEY UPDATE value = ?",
          [groupId, groupId]
        );
        console.log("Saved LINE Group ID:", groupId);
      } catch (err) {
        console.error("Error saving group ID:", err);
      }
    }

    if (event.type === 'message' && event.message.type === 'text') {
      const text = event.message.text.trim();
      
      // Feature 4: Customer types their ID card or Plate No to check policy
      if (text.length >= 6) { 
        try {
          const [policies] = await req.db.query(`
            SELECT p.policy_no, p.company, p.type, p.expiry_date, v.plate_no, c.first_name
            FROM policies p
            JOIN customers c ON p.customer_id = c.id
            LEFT JOIN vehicles v ON p.vehicle_id = v.id
            WHERE c.id_card_no = ? OR v.plate_no LIKE ? OR p.policy_no = ?
            ORDER BY p.expiry_date DESC LIMIT 1
          `, [text, `%${text}%`, text]);

          let replyText = '';
          if (policies.length > 0) {
            const p = policies[0];
            const expDate = new Date(p.expiry_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
            replyText = `สวัสดีคุณ ${p.first_name} 👋\n\nกรมธรรม์รถทะเบียน ${p.plate_no || '-'}\nบริษัท: ${p.company} (ชั้น ${p.type})\nเลขกรมธรรม์: ${p.policy_no}\n\n⏳ จะหมดอายุวันที่:\n${expDate}`;
          } else {
            // Only reply if they ask specifically or if it matches exactly, otherwise in a group it might spam.
            // If it's a direct message (user), we can reply "Not found". 
            // In a group, we shouldn't reply to random texts.
            if (event.source.type === 'user') {
              replyText = 'ขออภัยค่ะ ไม่พบข้อมูลกรมธรรม์จากรหัสที่คุณพิมพ์มาค่ะ 🥺 โปรดลองพิมพ์เลขทะเบียนรถ, เลขกรมธรรม์ หรือเลขบัตรประชาชนใหม่อีกครั้งนะคะ';
            }
          }

          if (replyText) {
            await axios.post('https://api.line.me/v2/bot/message/reply', {
              replyToken: event.replyToken,
              messages: [{ type: 'text', text: replyText }]
            }, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
              }
            });
          }
        } catch (error) {
          console.error('Error in webhook db/reply:', error);
        }
      }
    }
  }
});

module.exports = router;
