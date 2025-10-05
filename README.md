# Attendance Automation System

An automated system that tracks student attendance from MITS IMS and sends daily notifications via WhatsApp and Email.

## Features

- 🔐 Secure student credential storage with encryption
- 🤖 Automated attendance checking from MITS IMS
- 🔍 **6-Pattern Extraction System** (Browser Extension Compatible)
  - Pattern 1: Traditional HTML Table extraction
  - Pattern 2: MITSIMS ExtJS semesterActivity fieldset
  - Pattern 3: Colored span detection (🟢🔵🟠🔴)
  - Pattern 4: Attendance-specific element search
  - Pattern 5: Enhanced table pattern with keyword matching
  - Pattern 6: Fallback percentage extraction
- 📧 Email notifications with attendance reports
- 📱 **Telegram Bot with Instant Commands**
  - **Self-Registration**: `/reg` - Register directly via Telegram
  - **Multiple Accounts**: One Telegram can manage multiple students
  - `/check` - Check attendance anytime, instantly
  - `/myaccounts` - View all your registered accounts
  - `/checkid` - Check specific student (for multi-account users)
  - `/start` - Get your Chat ID and setup instructions
  - `/help` - Get help and command information
  - Daily scheduled attendance reports
  - Real-time notifications
- 📱 WhatsApp notifications for daily attendance
- ⏰ Scheduled daily checks every morning
- 🌐 Web interface for student registration
- 📊 Attendance history tracking
- 🎯 **Dual Mean Attendance Calculation**
  - Simple average of subject percentages (primary - extension compatible)
  - Weighted average by total classes (alternative - detailed insight)
  - Automatic calculation after login to `studentIndex.html`
- 😊 Emoji status indicators (🤩 ✅ ⚠️ 😰 😭)
- 📸 Screenshot capture for debugging
- 🔍 Pattern tracking (know which extraction method worked)

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Gmail account (for email notifications)
- Twilio account (for WhatsApp notifications)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd attendance-automation-system
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

4. Start MongoDB (if using local installation):
```bash
mongod
```

5. Run the application:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## MITS IMS Configuration

The system is configured for **MITS IMS (GEMS Portal)**: http://mitsims.in

To customize the scraper for your specific login:
1. See `MITS_SETUP.md` for detailed instructions
2. Run `node test-scraper.js` to test and debug
3. Check `screenshots/` folder for visual debugging

## Configuration

### Telegram Bot Setup (RECOMMENDED - 100% FREE & SAFE!)

#### Quick Setup (3 Methods):

**Method 1: Self-Registration (NEW! 🎉)**
1. Open Telegram and search for your bot
2. Send `/register` to see instructions
3. Send `/reg STUDENTID PASSWORD NAME`
   - Example: `/reg 23691A3305 mypassword John Doe`
4. Start using: `/check` to view attendance!

**Method 2: Manual Registration with Chat ID**
1. Open Telegram and search for `@BotFather`
2. Send `/newbot` and follow the instructions
3. Copy your bot token
4. Add to `.env`:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ```
5. **Get Your Chat ID:**
   - Search for your bot in Telegram (username you created)
   - Send `/start` command
   - Copy the Chat ID shown in the response
6. **Register in System:**
   - Open web interface (http://localhost:3000)
   - Add/edit your student profile
   - Paste your Chat ID in "Telegram Chat ID" field
   - Enable "Telegram Notifications"
   - Save profile

**Method 3: API Registration**
```bash
curl -X POST http://localhost:3000/api/students/register \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "23691A3305",
    "password": "yourpassword",
    "name": "Your Name"
  }'
```

#### Telegram Bot Commands:

**Registration & Management:**
- `/start` - Get your Chat ID and welcome message
- `/register` - Start registration process
- `/reg STUDENTID PASSWORD NAME` - Register a student account
- `/myaccounts` - View all your registered student accounts

**Checking Attendance:**
- `/check` - Check attendance (auto-selects if single account)
- `/checkid STUDENTID` - Check specific student (for multiple accounts)
- `/help` - Get help and instructions

#### Multi-Account Support (NEW! 👥)

You can now register **multiple student accounts** to one Telegram:

```
/reg 23691A3301 password1 Student One
/reg 23691A3302 password2 Student Two
/reg 23691A3303 password3 Student Three
```

Perfect for:
- Parents monitoring multiple children
- Students with multiple accounts
- Class representatives tracking groups
- Multiple devices per user

For detailed documentation, see:
- `TELEGRAM_REGISTRATION.md` - Complete registration guide
- `QUICK_REFERENCE.md` - Quick command reference
- `TELEGRAM_COMMANDS.md` - Command documentation

### Email Setup (Gmail)

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Add to `.env`:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
   ```

### WhatsApp Setup (Twilio)

1. Sign up for Twilio: https://www.twilio.com/try-twilio
2. Get your Account SID and Auth Token from the console
3. Enable WhatsApp Sandbox: https://www.twilio.com/console/sms/whatsapp/sandbox
4. Add to `.env`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```

### MongoDB Setup

**Option 1: Local MongoDB**
```
MONGODB_URI=mongodb://localhost:27017/attendance_system
```

**Option 2: MongoDB Atlas (Cloud)**
1. Create free cluster at https://www.mongodb.com/cloud/atlas
2. Get connection string and add to `.env`

## Usage

1. Open browser and navigate to: `http://localhost:3000`
2. Register with student credentials (ID, password, email, mobile)
3. The system will automatically check attendance every morning
4. Receive notifications via WhatsApp and Email

### Mean Attendance Calculation & Extraction

The system uses a **6-pattern extraction system** (same as browser extensions) to reliably extract attendance data from any MITS page structure.

#### Extraction Patterns (in order of priority):

1. **Pattern 1: HTML Table** - Searches for standard attendance tables
2. **Pattern 2: ExtJS Fieldset** - Handles MITSIMS ExtJS components
3. **Pattern 3: Colored Spans** - Detects colored attendance indicators (🟢🔵🟠🔴)
4. **Pattern 4: Attendance Elements** - Finds elements with "attendance" in class/id
5. **Pattern 5: Enhanced Table** - Keyword-based table reconstruction
6. **Pattern 6: Fallback** - Extracts any valid percentage values

The system tries each pattern in sequence until data is successfully extracted, making it **highly robust against MITS page structure changes**.

#### Mean Calculation (Browser Extension Compatible):

- **Simple Average (Primary)**: Sum of all subject percentages ÷ Number of subjects
- **Weighted Average (Alternative)**: Total attended ÷ Total conducted × 100

**Example:**
```
Subjects: 90%, 95%, 80%, 74.55%, 88.89%
Simple Average: (90 + 95 + 80 + 74.55 + 88.89) ÷ 5 = 85.69%
Weighted Average: (212 ÷ 250) × 100 = 84.80%

Console Output:
🎯 PRIMARY MEAN (Simple Average - Extension Compatible): 85.69%
📊 ALTERNATIVE MEAN (Weighted Average): 84.80%
   Difference: 0.89%
```

#### Emoji Status Indicators:
- 🤩 **EXCELLENT** - ≥90% attendance
- ✅ **SAFE** - ≥75% attendance
- ⚠️ **WARNING** - 70-75% attendance
- 😰 **CRITICAL** - 60-70% attendance
- 😭 **DANGER** - <60% attendance

For detailed documentation, see:
- `EXTRACTION_UPGRADE.md` - Complete 6-pattern system guide
- `BROWSER_EXTENSION_COMPARISON.md` - Feature comparison with browser extensions
- `TESTING_GUIDE.md` - Testing instructions
- `INTEGRATION_SUMMARY.md` - Quick reference

**Test the extraction system:**
```bash
npm start
# Check console for pattern detection logs
```

## API Endpoints

- `POST /api/students/register` - Register new student
- `GET /api/students/:id` - Get student details
- `PUT /api/students/:id` - Update student details
- `DELETE /api/students/:id` - Delete student
- `POST /api/attendance/check/:studentId` - Manual attendance check
- `GET /api/attendance/history/:studentId` - Get attendance history

## Security

- Student passwords are encrypted using AES-256
- JWT authentication for API access
- Environment variables for sensitive data
- HTTPS recommended for production

## Scheduling

The system checks attendance daily at the time specified in `ATTENDANCE_CHECK_TIME` (default: 08:00 AM).

To change the schedule, update the `.env` file:
```
ATTENDANCE_CHECK_TIME=09:30
```

## Troubleshooting

**Issue**: Puppeteer fails to launch browser
- Solution: Install Chromium dependencies or use `puppeteer-core` with local Chrome

**Issue**: WhatsApp messages not sending
- Solution: Verify phone number is whitelisted in Twilio sandbox

**Issue**: Email not sending
- Solution: Check App Password and allow less secure apps if needed

## License

MIT

## 🚀 Cloud Deployment (24/7 Access)

Want to run this system 24/7 in the cloud? We've got you covered!

### Quick Deploy (FREE - 20 minutes)

Deploy to **Render** for 100% FREE 24/7 access:

1. **Read**: [`QUICK_DEPLOY.md`](./QUICK_DEPLOY.md) - Fast deployment guide
2. **Setup**: MongoDB Atlas (FREE) + Render (FREE)
3. **Deploy**: Push to GitHub, connect to Render
4. **Done**: Your app runs 24/7!

### Comprehensive Guides

📚 **Available Documentation:**

- **[DEPLOYMENT_README.md](./DEPLOYMENT_README.md)** - Start here! Overview and quick links
- **[QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** - 20-minute deployment (Render - FREE)
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Complete guide (all platforms)
- **[PLATFORM_COMPARISON.md](./PLATFORM_COMPARISON.md)** - Choose your platform
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Verification checklist

### Platform Options

| Platform | Cost | Setup Time | Best For |
|----------|------|------------|----------|
| **Render** | FREE | 20 min | Students, personal projects |
| **Railway** | $5/mo | 20 min | Active development |
| **Heroku** | $7/mo | 30 min | Production apps |
| **DigitalOcean** | $6/mo | 45 min | Full control |
| **AWS EC2** | FREE* | 60 min | Learning cloud |

*12 months free tier

### Quick Start

```powershell
# 1. Prepare for deployment
.\deploy-prep.bat

# 2. Push to GitHub
git remote add origin https://github.com/yourusername/attendance-automation.git
git push -u origin main

# 3. Follow QUICK_DEPLOY.md for platform setup
```

### What You'll Get

✅ 24/7 cloud availability  
✅ Professional HTTPS URL  
✅ Automatic daily attendance checks  
✅ Telegram bot accessible anywhere  
✅ Scalable for entire class/college  

**Ready to deploy?** → Read [`DEPLOYMENT_README.md`](./DEPLOYMENT_README.md)

---

## Support

For issues and questions, please open an issue on GitHub.
