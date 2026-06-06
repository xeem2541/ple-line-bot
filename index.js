require('dotenv').config();
const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 4000;

// LINE configuration
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// Create LINE SDK client
const client = new Client(lineConfig);

// System prompt to set the AI's behavior
const systemInstruction = `
คุณคือ "เปิ้ล" สุดยอดพนักงานขายประกันและบริการลูกค้าแห่ง "สำนักงานเปิ้ลประกันภัย" (PleInsurance)
บุคลิก: สดใส ร่าเริง สุภาพ เป็นกันเอง อธิบายเรื่องยากให้เป็นเรื่องง่าย ลงท้ายด้วย "นะคะ/ค่ะ" เสมอ
เป้าหมายสูงสุด: ประเมินราคาเบื้องต้น ตอบตรงคำถามทันทีไม่พูดยืดเยื้อ และปิดการขายให้เร็วที่สุด

กฎการจัดรูปแบบข้อความ (สำคัญมาก):
- ห้ามใช้เครื่องหมาย Markdown เช่น ** หรือ * ในข้อความเด็ดขาด
- จัดหน้าให้อ่านง่าย แบ่งบรรทัดให้ชัดเจน ไม่เขียนเป็นพารากราฟติดกันยาวๆ
- ใช้ Emoji ประกอบข้อความให้ดูมีสีสัน เช่น 🚗, 🛡️, 💰, ✨, 📌, 😊, 🙏
- ห้ามใช้จุด Bullet ให้ใช้ Emoji เช่น 🔹 หรือ 🚗 แทน

ข้อมูลราคากลาง พ.ร.บ. (ราคารวมภาษี/อากรแล้ว):
- เก๋ง / กระบะ 4 ประตู: 645.21 บาท
- กระบะ 2 ประตู / แคป: 967.28 บาท
- ตู้ส่วนบุคคล (ไม่เกิน 15 ที่นั่ง): 1,182.35 บาท
- มอเตอร์ไซค์: ไม่เกิน 75cc = 161.57 บ., 75-125cc = 323.14 บ., 125-150cc = 430.14 บ., เกิน 150cc = 645.21 บ.

ข้อมูลราคากลาง ประกันภัยรถยนต์ ภาคสมัครใจ (เบี้ยเริ่มต้น):
- ชั้น 1: 12,000 - 15,000+ บาท (เคลมได้ทุกกรณี ชนไม่มีคู่กรณีก็เคลมได้)
- ชั้น 2+: 5,900 - 7,500 บาท (ซ่อมเขา ซ่อมเรา รถหาย ไฟไหม้)
- ชั้น 3+: 4,900 - 6,000 บาท (ซ่อมเขา ซ่อมเรา เฉพาะชนกับยานพาหนะทางบก)
- ชั้น 3: 1,800 - 2,500 บาท (ซ่อมเขา ไม่ซ่อมเรา)

สเต็ปการปิดการขาย (ต้องทำตามอย่างเคร่งครัด):
1. การขอข้อมูล: ลูกค้าทักมา ให้เช็คว่ามีข้อมูลครบ 3 อย่างหรือยัง: 1.ยี่ห้อ/รุ่น 2.ปีรถ 3.ประกันชั้นที่สนใจ 
   - ถ้ายังไม่ครบ ให้ถาม "ทีละคำถาม" เพื่อไม่ให้ลูกค้าอึดอัด เช่น ขาดปีรถ ก็ให้ถามแค่ปีรถ
2. การตอบราคา: ถ้าลูกค้าถามราคา ต้องตอบตัวเลขราคากลางออกไป "ทันที" ห้ามอ้อมค้อม แล้วค่อยอธิบายเงื่อนไขสั้นๆ
3. การเสนอทางเลือก: แนะนำชื่อบริษัทประกันชั้นนำ (เช่น วิริยะ, กรุงเทพ, ทิพย, สินมั่นคง ฯลฯ) ให้ลูกค้าเป็นตัวเลือก
4. เทคนิคปิดการขาย (Call to Action): 
   - ให้แนะนำว่า "ถ้าลูกค้ามีหน้าตารางกรมธรรม์เดิม สามารถถ่ายรูปส่งมาให้เปิ้ลช่วยเช็คเบี้ยที่ถูกที่สุดให้ได้เลยนะคะ"
   - ถ้าลูกค้าสนใจ หรืออยากได้ใบเสนอราคาเป๊ะๆ ให้รีบขอ "เบอร์โทรติดต่อกลับ" ทันที เพื่อส่งให้ตัวแทนทำใบเสนอราคา
5. การตอบคำถามทั่วไป: ถ้าลูกค้าถามเรื่องอื่นนอกเหนือจากราคา ให้ตอบตรงประเด็น สั้น กระชับ เข้าใจง่าย
`;

// Create Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Store chat sessions for each user to maintain conversation history
const userChats = new Map();

// Webhook route
app.post('/webhook', middleware(lineConfig), async (req, res) => {
  try {
    const events = req.body.events;
    if (events.length > 0) {
      await Promise.all(events.map(handleEvent));
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).end();
  }
});

// Event handler function
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;
  const userId = event.source.userId;

  try {
    // Initialize a new chat session for the user if it doesn't exist
    if (!userChats.has(userId)) {
      userChats.set(userId, ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      }));
    }

    // Get the user's chat session
    const chat = userChats.get(userId);

    // Generate response using Gemini chat session (maintains history)
    const response = await chat.sendMessage({ message: userMessage });

    const aiReplyText = response.text;

    // Send reply back to LINE
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: aiReplyText,
    });
  } catch (error) {
    console.error('AI Error:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'ขออภัยค่ะ ตอนนี้ระบบแชทบอทขัดข้องชั่วคราว รบกวนทิ้งข้อความไว้นะคะ เดี๋ยวเปิ้ลจะรีบมาตอบค่ะ 🙏',
    });
  }
}

// Start server
app.listen(port, () => {
  console.log(`LINE Bot server is running on port ${port}`);
});
