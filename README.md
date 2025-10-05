# Attendance Automation System (Telegram Bot Only)

An automated system that tracks student attendance from MITS IMS and sends daily notifications via Telegram.

## Features

- 🔐 Secure student credential storage with encryption
- 🤖 Automated attendance checking from MITS IMS
- 🔍 **6-Pattern Extraction System**
  - Pattern 1: Traditional HTML Table extraction
  - Pattern 2: MITSIMS ExtJS semesterActivity fieldset
  - Pattern 3: Colored span detection (🟢🔵🟠🔴)
  - Pattern 4: Attendance-specific element search
  - Pattern 5: Enhanced table pattern with keyword matching
  - Pattern 6: Fallback percentage extraction
- 📱 **Admin Telegram Bot for System Management**
  - System monitoring and statistics
  - Student and attendance management
  - Secure admin-only access
  - Automated system notifications
- 📱 **User Telegram Bot with Instant Commands**
  - **Self-Registration**: `/reg` - Register directly via Telegram
  - **Multiple Accounts**: One Telegram can manage multiple students
  - `/check` - Check attendance anytime, instantly
  - `/myaccounts` - View all your registered accounts
  - `/checkid` - Check specific student (for multi-account users)
  - `/start` - Get your Chat ID and setup instructions
  - `/help` - Get help and command information
  - Daily scheduled attendance reports
  - Real-time notifications
- ⏰ Scheduled daily checks every morning
- 📊 Attendance history tracking
- 🎯 **Dual Mean Attendance Calculation**
  - Simple average of subject percentages (primary)
  - Weighted average by total classes (alternative)
- 😊 Emoji status indicators (🤩 ✅ ⚠️ 😰 😭)
- 📸 Screenshot capture for debugging
- 🔍 Pattern tracking (know which extraction method worked)

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Telegram Bot API Token (get from BotFather)
- Chrome/Chromium (automatically installed with Puppeteer)

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

### Telegram Bot Setup

#### User Bot Setup:

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` and follow the instructions
3. Copy your bot token
4. Add to `.env`:
   ```
   TELEGRAM_BOT_TOKEN=your_user_bot_token_here
   ```

#### Admin Bot Setup:

1. Create another bot with BotFather or use the same bot
2. Copy the bot token
3. Add to `.env`:
   ```
   ADMIN_TELEGRAM_BOT_TOKEN=your_admin_bot_token_here
   ADMIN_TELEGRAM_CHAT_IDS=your_chat_id,another_admin_chat_id
   ```

#### Usage Instructions:

**Self-Registration (Users):**
1. Open Telegram and search for your bot
2. Send `/register` to follow the step-by-step registration
3. Or send `/reg STUDENTID PASSWORD NAME` for quick registration
   - Example: `/reg 23691A3305 mypassword John Doe`
4. Start using: `/check` to view attendance!

**User Bot Commands:**
- `/start` - Get your Chat ID and welcome message
- `/register` - Start registration process
- `/reg STUDENTID PASSWORD NAME` - Register a student account
- `/myaccounts` - View all your registered student accounts
- `/check` - Check attendance (auto-selects if single account)
- `/checkid STUDENTID` - Check specific student (for multiple accounts)
- `/help` - Get help and instructions

**Admin Bot Commands:**
- `/start` - Get admin menu
- `/stats` - Get system statistics
- `/students` - List all students
- `/findstudent <query>` - Search for students
- `/check <studentId>` - Check student attendance
- `/manualcheck` - Run manual attendance check
- `/schedulerstatus` - Check scheduler status
- `/help` - Get admin help

#### Multi-Account Support

You can register **multiple student accounts** to one Telegram:

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

### MongoDB Setup

**Option 1: Local MongoDB**
```
MONGODB_URI=mongodb://localhost:27017/attendance_system
```

**Option 2: MongoDB Atlas (Cloud)**
1. Create free cluster at https://www.mongodb.com/cloud/atlas
2. Get connection string and add to `.env`

## Usage

1. Start the bot with `npm start`
2. Interact with the bot via Telegram
3. The system will automatically check attendance every morning
4. Receive notifications via Telegram

### Mean Attendance Calculation & Extraction

The system uses a **6-pattern extraction system** to reliably extract attendance data from any MITS page structure.

#### Extraction Patterns (in order of priority):

1. **Pattern 1: HTML Table** - Searches for standard attendance tables
2. **Pattern 2: ExtJS Fieldset** - Handles MITSIMS ExtJS components
3. **Pattern 3: Colored Spans** - Detects colored attendance indicators (🟢🔵🟠🔴)
4. **Pattern 4: Attendance Elements** - Finds elements with "attendance" in class/id
5. **Pattern 5: Enhanced Table** - Keyword-based table reconstruction
6. **Pattern 6: Fallback** - Extracts any valid percentage values

The system tries each pattern in sequence until data is successfully extracted, making it **highly robust against MITS page structure changes**.

#### Mean Calculation:

- **Simple Average (Primary)**: Sum of all subject percentages ÷ Number of subjects
- **Weighted Average (Alternative)**: Total attended ÷ Total conducted × 100

#### Emoji Status Indicators:
- 🤩 **EXCELLENT** - ≥90% attendance
- ✅ **SAFE** - ≥75% attendance
- ⚠️ **WARNING** - 70-75% attendance
- 😰 **CRITICAL** - 60-70% attendance
- 😭 **DANGER** - <60% attendance

## Security

- Student passwords are encrypted using AES-256
- Environment variables for sensitive data
- Authentication via Telegram Chat ID

## Scheduling

The system checks attendance daily at the time specified in `ATTENDANCE_CHECK_TIME` (default: 08:00 AM).

To change the schedule, update the `.env` file:
```
ATTENDANCE_CHECK_TIME=09:30
```

## Troubleshooting

**Issue**: Puppeteer fails to launch browser
- Solution: Install Chromium dependencies or use `puppeteer-core` with local Chrome

**Issue**: Telegram bot not responding
- Solution: Verify bot token is correct and bot is not blocked by user

**Issue**: MongoDB connection issues
- Solution: Check MongoDB is running and connection string is correct

## License

MIT

## 🚀 Cloud Deployment (24/7 Access)

Want to run this system 24/7 in the cloud? We provide comprehensive deployment guides for multiple platforms!

### 📚 Deployment Guides

- **🔷 [Azure Deployment Guide](AZURE_DEPLOYMENT_GUIDE.md)** - Complete Microsoft Azure App Service deployment with automated CI/CD ⭐ **RECOMMENDED**
- **☁️ [Cloud Deployment Guide](CLOUD_DEPLOYMENT_GUIDE.md)** - Multi-platform deployment instructions (Railway, Render, Heroku, GCP, AWS)
- **📄 [GitHub Pages Setup](GITHUB_PAGES_SETUP.md)** - Deploy frontend to GitHub Pages
- **🌐 [Browser Configuration](BROWSER_CONFIGURATION.md)** - Understand headless vs headed browser modes

### ⭐ Why Azure?

**Microsoft Azure App Service** is our recommended platform for production deployment:

✅ **Free $200 credit** for new users  
✅ **GitHub Actions integration** - Auto-deploy on every push  
✅ **Always On** feature - No sleeping apps  
✅ **Excellent Node.js support** with built-in Chromium  
✅ **Azure Status Dashboard** - 99.95% SLA  
✅ **Application Insights** - Advanced monitoring & analytics  
✅ **Cost-effective** - Basic tier starts at ~$13/month  

### Quick Deploy to Azure

1. **Prerequisites**: Azure account, MongoDB Atlas, Telegram bots
2. **One-Click Setup**: Follow our [Azure Deployment Guide](AZURE_DEPLOYMENT_GUIDE.md)
3. **Auto-Deploy**: Push to GitHub → Automatically deploys to Azure
4. **24/7 Operation**: Your bot runs continuously in the cloud

```bash
# After initial setup, deployment is just:
git add .
git commit -m "Update bot"
git push origin main
# ✨ Automatically deploys to Azure via GitHub Actions!
```

### Other Supported Platforms

- **Railway**: Simple deployment with MongoDB ✨ Easy to use
- **Render**: Free tier available with MongoDB Atlas
- **Heroku**: Easy deployment with buildpacks
- **Google Cloud Platform**: App Engine or Cloud Run
- **AWS**: Elastic Beanstalk or EC2

### Cloud Environment Requirements

**IMPORTANT**: When deploying to any cloud platform:

```env
HEADLESS_MODE=true   # MUST be true for cloud deployment
```

**Why?** Cloud servers don't have displays, so browser must run in "headless" (invisible) mode.

**Learn More:** See [BROWSER_CONFIGURATION.md](BROWSER_CONFIGURATION.md) for detailed setup.

## 🌐 Browser Integration

This project uses **Puppeteer** - a headless Chrome browser that works seamlessly in both local and cloud environments.

### Local Development (See the Browser)
```env
HEADLESS_MODE=false  # Chrome window opens - great for debugging!
```

### Cloud/Production (Invisible Browser)
```env
HEADLESS_MODE=true   # Runs in background - perfect for servers
```

**Learn More:** See [BROWSER_CONFIGURATION.md](BROWSER_CONFIGURATION.md) for detailed setup.

## Support

For issues and questions, please open an issue on GitHub.