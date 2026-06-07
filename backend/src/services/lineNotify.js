const axios = require('axios');

const sendLineNotify = async (message, db) => {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.log('LINE Channel Access Token is not configured. Skipping notification.');
    return;
  }

  try {
    // Try to get group ID from DB
    let to = null;
    if (db) {
      const [rows] = await db.query("SELECT value FROM master_data WHERE category = 'LINE_GROUP' LIMIT 1");
      if (rows.length > 0) to = rows[0].value;
    }

    if (!to) {
      console.log('No LINE Group ID found. Bot needs to be invited to a group first.');
      return;
    }

    await axios.post(
      'https://api.line.me/v2/bot/message/push',
      {
        to: to,
        messages: [
          { type: 'text', text: message }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    console.log('LINE Notification sent successfully to group.');
  } catch (error) {
    console.error('Error sending LINE Notification:', error.response?.data || error.message);
  }
};

module.exports = {
  sendLineNotify
};
