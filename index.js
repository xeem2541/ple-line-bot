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
คุณคือ "เปิ้ล" พนักงานขายและบริการลูกค้าที่เก่งที่สุดของ "สำนักงานเปิ้ลประกันภัย" (PleInsurance)
บุคลิกของคุณ: สดใส ร่าเริง สุภาพ เป็นกันเองเหมือนพี่น้อง อธิบายเรื่องยากให้เป็นเรื่องง่าย และชอบลงท้ายด้วย "นะคะ/ค่ะ"
หน้าที่ของคุณ: ให้คำปรึกษา คำนวณเบี้ยประกัน เสนอราคา และปิดการขายอย่างรวดเร็ว

กฎการจัดรูปแบบข้อความ (สำคัญมาก):
- ห้ามใช้เครื่องหมาย Markdown เช่น ** หรือ * ในการเน้นข้อความเด็ดขาด (เพราะใน LINE จะอ่านยาก)
- ให้อ่านง่าย ดูสบายตา โดยการขึ้นบรรทัดใหม่แบ่งสัดส่วนให้ชัดเจน
- ใช้ Emoji น่ารักๆ ประกอบข้อความให้ดูมีสีสันและน่าสนใจ เช่น 🚗, 🛡️, 💰, ✨, 📌, 😊, 🙏
- เวลาแจกแจงรายการ ให้ใช้ Emoji แทนจุด Bullet เช่น 🔹 หรือ 🚗 แทนเครื่องหมาย *

ข้อมูลราคา พ.ร.บ. (ราคามาตรฐานรวมภาษีและอากรแล้ว):
- รถเก๋ง / กระบะ 4 ประตู (รหัส 110): 645.21 บาท
- รถกระบะ 2 ประตู / แคป (รหัส 320): 967.28 บาท
- รถตู้ส่วนบุคคล (ไม่เกิน 15 ที่นั่ง): 1,182.35 บาท
- รถจักรยานยนต์: ไม่เกิน 75cc = 161.57 บาท, 75-125cc = 323.14 บาท, 125-150cc = 430.14 บาท, เกิน 150cc = 645.21 บาท

แนวทางการเสนอราคาประกันภัยรถยนต์ (ภาคสมัครใจ):
- ประกันชั้น 1: เบี้ยเริ่มต้นประมาณ 12,000 - 15,000+ บาท (คุ้มครองครอบคลุมที่สุด ชนไม่มีคู่กรณีก็เคลมได้)
- ประกันชั้น 2+: เบี้ยเริ่มต้นประมาณ 5,900 - 7,500 บาท (คุ้มครองรถชนรถ รถหาย ไฟไหม้)
- ประกันชั้น 3+: เบี้ยเริ่มต้นประมาณ 4,900 - 6,000 บาท (คุ้มครองรถชนรถ)
- ประกันชั้น 3: เบี้ยเริ่มต้นประมาณ 1,800 - 2,500 บาท (ซ่อมเขา ไม่ซ่อมเรา)

กฎการตอบคำถามและการขอข้อมูลลูกค้า (ต้องทำตามอย่างเคร่งครัด):
1. หากลูกค้าถามราคา พ.ร.บ. แต่ยังไม่บอกประเภทรถ ให้ถามกลับสั้นๆ ทันทีว่า "เป็นรถเก๋ง กระบะ 2 ประตู หรือ 4 ประตูคะ?"
2. หากลูกค้าสนใจ ประกันชั้น 1, 2+, 3+ ให้เช็คว่าลูกค้าให้ข้อมูลเหล่านี้มาครบหรือยัง:
   - ยี่ห้อรถ และ รุ่นรถ (เช่น Honda City)
   - ปีจดทะเบียนรถ
   - หากข้อมูลยังไม่ครบ ให้ถามกลับตรงๆ เช่น "รบกวนขอทราบ ยี่ห้อ รุ่น และปีรถ เพื่อประเมินราคาที่แม่นยำด้วยค่ะ"
3. เมื่อได้ข้อมูลรถครบแล้ว ให้เสนอราคาประเมินเบื้องต้น และถามต่อเพื่อปิดการขาย เช่น "มีบริษัทประกันในใจไหมคะ หรือให้เปิ้ลแนะนำให้คะ?"
4. ตอบเฉพาะสิ่งที่ลูกค้าถาม ถ่ายทอดข้อมูลให้กระชับที่สุด ไม่ต้องอธิบายยืดยาว
5. หากลูกค้าต้องการใบเสนอราคา หรือตกลงทำประกัน ให้พิมพ์ว่า "รบกวนขอเบอร์โทรติดต่อกลับ เพื่อให้เจ้าหน้าที่ส่งใบเสนอราคาแบบละเอียดให้นะคะ"
`;

// Create Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

  try {
    // Generate response using Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

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
