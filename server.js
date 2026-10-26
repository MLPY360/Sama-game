const http = require('http');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;
const TARGET_EMAIL = 'mohameedhasan81@gmail.com';
const SUBMISSIONS_FILE = path.join(__dirname, 'score_submissions.json');

// Helper to save submissions locally
function saveSubmission(data) {
  try {
    let list = [];
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      const content = fs.readFileSync(SUBMISSIONS_FILE, 'utf8');
      list = JSON.parse(content || '[]');
    }
    list.unshift({ ...data, receivedAt: new Date().toISOString() });
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving submission:', err.message);
  }
}

// Nodemailer transport setup
let transporter = null;
async function initTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Generate test Ethereal transporter for local testing
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('Ethereal test mailer initialized:', testAccount.user);
    } catch (e) {
      console.log('Running without external SMTP; emails will be logged and stored locally.');
    }
  }
}
initTransporter();

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoint: Send Quiz Score Email
  if (req.method === 'POST' && req.url === '/api/send-score') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const recipient = data.email || TARGET_EMAIL;
        const score = data.score || 0;
        const percentage = data.percentage || 0;
        const total = data.totalPoints || 600;
        const rank = data.rank || 'أميرة قلبي 💖';
        const answers = data.answers || [];

        console.log(`\n========================================`);
        console.log(`[EMAIL SEND REQUEST] Received Quiz Score for: ${recipient}`);
        console.log(`Score: ${score}/${total} (${percentage}%) - Rank: ${rank}`);
        console.log(`========================================\n`);

        saveSubmission({ recipient, score, total, percentage, rank, answers });

        const emailText = `
💌 تقرير كويز الحب والذكريات لسما قلبي 💘

النتيجة الإجمالية: ${score} من ${total} نقطة (${percentage}%)
اللقب المستحق: ${rank}
المرسل إليه: ${recipient}
تاريخ الإجراء: ${new Date().toLocaleString('ar-EG')}

--------------------------------------------------
📅 التواريخ والمعالم المسجلة في الاختبار:
- تاريخ اللقاء الأول: 01/03/2024 (1 مارس 2024)
- تاريخ اللقاء الثاني: 11/09/2026 (11 سبتمبر 2026)
- تاريخ أول "بحبك": 17/10/2023 (17 أكتوبر 2023)
- المسافة الحقيقية: صفر كم بين القلوب

--------------------------------------------------
📝 تفاصيل الإجابات:
${answers.map((a, i) => `${i + 1}. ${a.questionTitle}\n   إجابتك: ${a.chosenText} ${a.isCorrect ? '✅ (صحيحة)' : '❌ (خطأ - الصحيح: ' + a.correctText + ')'}`).join('\n\n')}

--------------------------------------------------
🌸 رسالة من حمودي:
"3 سنين ومن يوم 17/10/2023 ومن أول لقاء في 01/03/2024 وكل ثانية بحبك أكتر يا سمسومتي.. بحبك للأبد!"
        `.trim();

        if (transporter) {
          try {
            const info = await transporter.sendMail({
              from: '"كويز الحب حمودي لسما 💘" <no-reply@samgame.love>',
              to: recipient,
              subject: `💘 نتيجة كويز الحب لسما قلبي: ${percentage}% (${score} نقطة)`,
              text: emailText,
              html: `
                <div dir="rtl" style="font-family: Arial, sans-serif; background-color: #fff0f5; padding: 25px; border-radius: 16px;">
                  <h2 style="color: #d61f52; text-align: center;">💘 نتيجة كويز الحب لسما قلبي! 👑</h2>
                  <div style="background: #ffffff; padding: 20px; border-radius: 14px; border: 2px solid #ffd2e2; margin-bottom: 16px;">
                    <p style="font-size: 18px; margin: 6px 0;"><strong>النتيجة النهائية:</strong> <span style="color: #d61f52; font-size: 24px; font-weight: bold;">${percentage}%</span> (${score}/${total} نقطة)</p>
                    <p style="font-size: 16px; margin: 6px 0;"><strong>اللقب:</strong> ${rank}</p>
                    <p style="font-size: 14px; color: #666;"><strong>تاريخ الاختبار:</strong> ${new Date().toLocaleString('ar-EG')}</p>
                  </div>
                  <h3 style="color: #8b5cf6;">📅 محطات وذكريات خالدة:</h3>
                  <ul>
                    <li><strong>تاريخ اللقاء الأول:</strong> 1 مارس 2024 (01/03/2024) 🌸</li>
                    <li><strong>تاريخ اللقاء الثاني:</strong> 11 سبتمبر 2026 (11/09/2026) ✈️</li>
                    <li><strong>أول "بحبك":</strong> 17 أكتوبر 2023 (17/10/2023) 💍</li>
                  </ul>
                  <div style="background: #fff8fa; border: 1.5px dashed #ff4d80; padding: 14px; border-radius: 12px; margin-top: 18px; text-align: center;">
                    <em>"3 سنين ومن يوم 17/10/2023 وكل ثانية بحبك أكتر يا سمسومتي.. بحبك للأبد، حبيبك حمودي 💍❤️"</em>
                  </div>
                </div>
              `
            });
            console.log('Email dispatched successfully, messageId:', info.messageId);
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) console.log('Preview URL:', previewUrl);
          } catch (mailErr) {
            console.log('SMTP send error (logged locally):', mailErr.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          message: `تم إرسال النتيجة بنجاح إلى الإيميل: ${recipient}`,
          recipient: recipient,
          timestamp: new Date().toISOString()
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API Endpoint: View saved score submissions
  if (req.method === 'GET' && req.url === '/api/latest-scores') {
    let list = [];
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      list = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf8') || '[]');
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ submissions: list }));
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback to index.html for SPA
        fs.readFile(path.join(__dirname, 'index.html'), (e, html) => {
          if (e) {
            res.writeHead(404);
            res.end('Not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server error: ' + err.code);
      }
    } else {
      let contentType = 'text/html; charset=utf-8';
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.css') contentType = 'text/css';
      if (ext === '.js') contentType = 'application/javascript';
      if (ext === '.json') contentType = 'application/json';
      if (ext === '.png') contentType = 'image/png';
      if (ext === '.jpg') contentType = 'image/jpeg';
      if (ext === '.mp3') contentType = 'audio/mpeg';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`SAMGame Server running at http://localhost:${PORT}`);
  console.log(`Automatic score emails configured for: ${TARGET_EMAIL}`);
});
