const mysql = require('mysql2/promise');

const firstNames = ['สมชาย', 'สมหญิง', 'มานะ', 'มานี', 'ปิติ', 'ชูใจ', 'วีระ', 'เพ็ญศรี', 'ประยุทธ์', 'ธนาธร', 'พิธา', 'แพทองธาร', 'เศรษฐา', 'สุดารัตน์', 'ชัชชาติ', 'ศิริกัญญา', 'วิโรจน์', 'รังสิมันต์'];
const lastNames = ['ใจดี', 'รักไทย', 'มุ่งมั่น', 'ตั้งใจ', 'อดทน', 'เข้มแข็ง', 'มั่นคง', 'เจริญรัตน์', 'พัฒนา', 'ก้าวหน้า', 'รุ่งเรือง', 'ทรัพย์ทวี', 'มีสุข', 'ยิ่งเจริญ', 'พิทักษ์', 'บุญชู'];
const titles = ['นาย', 'นาง', 'นางสาว'];

// Function to generate random date within a specific month and year
function getRandomDate(year, month) {
  const date = new Date(year, month, Math.floor(Math.random() * 28) + 1);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// Function to generate random phone number
function getRandomPhone() {
  return '08' + Math.floor(10000000 + Math.random() * 90000000);
}

// Function to generate random ID card
function getRandomIdCard() {
  let id = '1';
  for (let i = 0; i < 12; i++) {
    id += Math.floor(Math.random() * 10).toString();
  }
  return id;
}

async function seedData() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'db',
      user: process.env.DB_USER || 'app_user',
      password: process.env.DB_PASSWORD || 'app_password',
      database: process.env.DB_NAME || 'insurance_db',
    });

    console.log('Connected to database. Starting to seed 12 months of customer data...');

    const currentDate = new Date();
    let customerCount = 0;
    let policyCount = 0;

    // Generate for the last 12 months
    for (let i = 11; i >= 0; i--) {
      const targetMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const year = targetMonth.getFullYear();
      const month = targetMonth.getMonth();
      
      // Randomly generate 5 to 15 customers per month
      const numCustomers = Math.floor(Math.random() * 11) + 5;
      
      for (let j = 0; j < numCustomers; j++) {
        const title = titles[Math.floor(Math.random() * titles.length)];
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const customerCode = `CUS-${year}${String(month + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
        const phone = getRandomPhone();
        const idCard = getRandomIdCard();
        const createdAt = getRandomDate(year, month);

        const [custResult] = await pool.query(
          'INSERT INTO customers (customer_code, prefix, first_name, last_name, id_card_no, phone, address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [customerCode, title, firstName, lastName, idCard, phone, 'ที่อยู่จำลอง กรุงเทพมหานคร 10110', createdAt]
        );
        customerCount++;

        // 70% chance to have a policy
        if (Math.random() > 0.3) {
          const policyNo = `POL-${year}${String(month + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
          const types = ['ประกันชีวิต', 'ประกันสุขภาพ', 'ประกันอุบัติเหตุ', 'ประกันรถยนต์'];
          const type = types[Math.floor(Math.random() * types.length)];
          const premium = Math.floor(Math.random() * 20000) + 5000;
          
          // Policy start date is the same as customer created date
          const startDate = new Date(createdAt);
          // Policy end date is 1 year from start date
          const endDate = new Date(startDate);
          endDate.setFullYear(endDate.getFullYear() + 1);

          await pool.query(
            'INSERT INTO policies (customer_id, policy_no, company, type, start_date, expiry_date, premium, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [custResult.insertId, policyNo, 'บริษัท เมืองไทยประกันชีวิต จำกัด (มหาชน)', type, startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10), premium, 'Active', createdAt]
          );
          policyCount++;
        }
      }
      console.log(`Generated data for ${year}-${String(month + 1).padStart(2, '0')}: ${numCustomers} customers`);
    }

    console.log(`\nSeed Complete! 🎉`);
    console.log(`Total New Customers: ${customerCount}`);
    console.log(`Total New Policies: ${policyCount}`);
    pool.end();
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

seedData();
