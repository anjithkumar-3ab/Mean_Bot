# 🚀 Cloud Deployment Guide - Attendance Automation System

This guide will help you deploy your attendance automation system to the cloud for 24/7 access.

## 📋 Table of Contents
1. [Deployment Options](#deployment-options)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Option 1: Render (FREE - RECOMMENDED)](#option-1-render-free---recommended)
4. [Option 2: Railway (FREE)](#option-2-railway-free)
5. [Option 3: Heroku (PAID)](#option-3-heroku-paid)
6. [Option 4: DigitalOcean (PAID)](#option-4-digitalocean-paid)
7. [Option 5: AWS EC2 (FREE TIER)](#option-5-aws-ec2-free-tier)
8. [MongoDB Atlas Setup](#mongodb-atlas-setup)
9. [Post-Deployment Setup](#post-deployment-setup)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Deployment Options

| Platform | Cost | Pros | Cons | Best For |
|----------|------|------|------|----------|
| **Render** | FREE | Easy setup, auto-deploy from Git, includes SSL | Spins down after inactivity | Small projects, testing |
| **Railway** | FREE* | Easy, generous free tier, persistent | May require credit card | Active development |
| **Heroku** | $7/mo | Mature platform, add-ons | No free tier anymore | Production apps |
| **DigitalOcean** | $6/mo | Full control, scalable | Requires server management | Advanced users |
| **AWS EC2** | FREE** | Enterprise-grade, scalable | Complex setup | Learning AWS |

*Railway free tier includes $5 monthly credit  
**AWS Free Tier: 12 months free (750 hours/month)

---

## ✅ Pre-Deployment Checklist

### 1. Create Required Accounts

- [ ] **MongoDB Atlas** (FREE) - https://www.mongodb.com/cloud/atlas
- [ ] **Telegram Bot** (FREE) - via @BotFather
- [ ] **Gmail App Password** (FREE) - for email notifications
- [ ] **Git Repository** (GitHub/GitLab) - FREE
- [ ] **Cloud Platform Account** (Choose one from above)

### 2. Prepare Your Code

```bash
# Initialize git repository if not already done
git init
git add .
git commit -m "Initial commit for deployment"

# Push to GitHub/GitLab
git remote add origin https://github.com/yourusername/attendance-automation.git
git push -u origin main
```

### 3. Environment Variables Needed

```env
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_random_secret_key
ENCRYPTION_KEY=your_32_character_key
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
TELEGRAM_BOT_TOKEN=your_bot_token
ATTENDANCE_CHECK_TIME=08:00
```

---

## 🎨 Option 1: Render (FREE - RECOMMENDED)

### Why Render?
- ✅ 100% FREE tier
- ✅ Automatic HTTPS/SSL
- ✅ Auto-deploy from Git
- ✅ Easy environment variables
- ⚠️ Spins down after 15 min inactivity (wakes up automatically)

### Step-by-Step Setup

#### 1. Sign Up for Render
1. Go to https://render.com
2. Sign up with GitHub/GitLab
3. Authorize Render to access your repositories

#### 2. Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your Git repository
3. Configure:
   - **Name**: `attendance-automation`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

#### 3. Add Environment Variables
Click **"Environment"** and add all variables:

```
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/attendance
JWT_SECRET=generate_random_32_char_string
ENCRYPTION_KEY=generate_random_32_char_string
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
ATTENDANCE_CHECK_TIME=08:00
```

#### 4. Deploy
1. Click **"Create Web Service"**
2. Wait 3-5 minutes for deployment
3. Your app will be live at: `https://attendance-automation.onrender.com`

#### 5. Keep Service Awake (Optional)
Since free tier spins down, use a free service to ping it:

**Option A: UptimeRobot (FREE)**
1. Sign up at https://uptimerobot.com
2. Add New Monitor:
   - Type: HTTP(s)
   - URL: `https://your-app.onrender.com/api/health`
   - Interval: 5 minutes
3. This keeps your app awake during active hours

**Option B: Cron-job.org (FREE)**
1. Sign up at https://cron-job.org
2. Create new cron job:
   - URL: `https://your-app.onrender.com/api/health`
   - Schedule: Every 10 minutes

---

## 🚂 Option 2: Railway (FREE)

### Why Railway?
- ✅ $5 monthly credit (FREE tier)
- ✅ No sleep/spin-down
- ✅ Easy deployment
- ✅ Great for active projects

### Step-by-Step Setup

#### 1. Sign Up
1. Go to https://railway.app
2. Sign up with GitHub
3. No credit card required for free tier

#### 2. Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository
4. Railway auto-detects Node.js

#### 3. Add Environment Variables
1. Click on your service
2. Go to **"Variables"** tab
3. Add all environment variables (same as Render)

#### 4. Deploy
1. Railway auto-deploys
2. Click **"Settings"** → **"Generate Domain"**
3. Your app will be at: `https://your-app.up.railway.app`

#### 5. Configure Port (if needed)
Railway automatically uses `PORT` from env variables. Make sure your `server.js` uses:
```javascript
const PORT = process.env.PORT || 3000;
```

---

## 🎈 Option 3: Heroku (PAID - $7/month)

### Setup Steps

#### 1. Install Heroku CLI
```powershell
# Install Heroku CLI for Windows
winget install Heroku.HerokuCLI
```

#### 2. Login and Create App
```powershell
heroku login
heroku create attendance-automation-app
```

#### 3. Add Buildpacks for Puppeteer
```powershell
heroku buildpacks:add jontewks/puppeteer
heroku buildpacks:add heroku/nodejs
```

#### 4. Set Environment Variables
```powershell
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI="your_mongodb_uri"
heroku config:set JWT_SECRET="your_secret"
heroku config:set ENCRYPTION_KEY="your_key"
heroku config:set EMAIL_USER="your-email@gmail.com"
heroku config:set EMAIL_PASSWORD="your_app_password"
heroku config:set TELEGRAM_BOT_TOKEN="your_bot_token"
heroku config:set ATTENDANCE_CHECK_TIME="08:00"
```

#### 5. Create Procfile
```powershell
echo "web: node server.js" > Procfile
```

#### 6. Deploy
```powershell
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

#### 7. Scale Up
```powershell
heroku ps:scale web=1
```

Your app: `https://attendance-automation-app.herokuapp.com`

---

## 🌊 Option 4: DigitalOcean Droplet (PAID - $6/month)

### Setup Steps

#### 1. Create Droplet
1. Sign up at https://www.digitalocean.com
2. Create new Droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic $6/month
   - **Datacenter**: Closest region
   - Add SSH key

#### 2. SSH into Droplet
```powershell
ssh root@your_droplet_ip
```

#### 3. Install Dependencies
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Git
apt install -y git

# Install PM2 (Process Manager)
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install Puppeteer dependencies
apt install -y chromium-browser
apt install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 libasound2
```

#### 4. Clone Your Repository
```bash
cd /var/www
git clone https://github.com/yourusername/attendance-automation.git
cd attendance-automation
npm install --production
```

#### 5. Create .env File
```bash
nano .env
```

Paste your environment variables, save (Ctrl+X, Y, Enter)

#### 6. Configure Puppeteer for Server
Update `services/scraper.js` to use system Chromium:
```javascript
const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: '/usr/bin/chromium-browser',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

#### 7. Start with PM2
```bash
pm2 start server.js --name attendance-app
pm2 save
pm2 startup
```

#### 8. Configure Nginx
```bash
nano /etc/nginx/sites-available/attendance
```

Add:
```nginx
server {
    listen 80;
    server_name your_droplet_ip;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/attendance /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

Your app: `http://your_droplet_ip`

#### 9. Setup SSL (Optional but Recommended)
```bash
apt install -y certbot python3-certbot-nginx

# If you have a domain name
certbot --nginx -d yourdomain.com
```

---

## ☁️ Option 5: AWS EC2 (FREE TIER)

### Setup Steps

#### 1. Launch EC2 Instance
1. Sign up at https://aws.amazon.com
2. Go to EC2 Dashboard
3. Click **"Launch Instance"**
4. Configure:
   - **AMI**: Ubuntu Server 22.04 LTS
   - **Instance Type**: t2.micro (free tier)
   - **Key Pair**: Create new or use existing
   - **Security Group**: Allow SSH (22), HTTP (80), HTTPS (443), Custom (3000)

#### 2. Connect to Instance
```powershell
ssh -i "your-key.pem" ubuntu@your_instance_ip
```

#### 3. Follow Same Steps as DigitalOcean
(Steps 3-9 from DigitalOcean section)

---

## 🗄️ MongoDB Atlas Setup (REQUIRED FOR ALL OPTIONS)

### Step-by-Step

#### 1. Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for FREE
3. Create organization and project

#### 2. Create Cluster
1. Click **"Build a Database"**
2. Choose **"Shared"** (FREE)
3. Select **"AWS"** or **"GCP"**
4. Choose region closest to your app
5. Cluster Name: `AttendanceCluster`
6. Click **"Create"**

#### 3. Create Database User
1. Go to **"Database Access"**
2. Click **"Add New Database User"**
3. Create username and password (save these!)
4. Set privileges: **"Read and write to any database"**

#### 4. Whitelist IP Addresses
1. Go to **"Network Access"**
2. Click **"Add IP Address"**
3. Choose **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Or add specific IPs for better security

#### 5. Get Connection String
1. Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Copy connection string:
   ```
   mongodb+srv://username:<password>@cluster.mongodb.net/attendance?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password
5. Replace `attendance` with your database name

#### 6. Add to Environment Variables
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/attendance?retryWrites=true&w=majority
```

---

## 📝 Post-Deployment Setup

### 1. Test Your Deployment

```bash
# Test health endpoint
curl https://your-app-url.com/api/health

# Should return:
{
  "success": true,
  "message": "Attendance Automation System is running",
  "timestamp": "2025-10-05T...",
  "database": {
    "status": "connected",
    "readyState": 1
  }
}
```

### 2. Register First Student

Via Telegram:
```
/reg STUDENTID PASSWORD NAME
```

Or via API:
```bash
curl -X POST https://your-app-url.com/api/students/register \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "23691A3305",
    "password": "yourpassword",
    "name": "Your Name"
  }'
```

### 3. Test Attendance Check

Via Telegram:
```
/check
```

Or via API:
```bash
curl -X POST https://your-app-url.com/api/attendance/check/23691A3305
```

### 4. Verify Scheduler

Check scheduler status:
```bash
curl https://your-app-url.com/api/scheduler/status
```

### 5. Monitor Logs

**Render/Railway**: Check dashboard logs  
**Heroku**: `heroku logs --tail`  
**DigitalOcean/AWS**: `pm2 logs attendance-app`

---

## 🔧 Additional Configuration Files

### Create `.gitignore`
```gitignore
node_modules/
.env
screenshots/
*.log
npm-debug.log*
.DS_Store
```

### Create `ecosystem.config.js` (for PM2 on VPS)
```javascript
module.exports = {
  apps: [{
    name: 'attendance-automation',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### Update `package.json` engines (recommended)
```json
{
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  }
}
```

---

## 🐛 Troubleshooting

### Issue: Puppeteer fails on cloud platform

**Solution**: Add Puppeteer args in `services/scraper.js`:
```javascript
const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ]
});
```

### Issue: Port already in use

**Solution**: Ensure server uses `process.env.PORT`:
```javascript
const PORT = process.env.PORT || 3000;
```

### Issue: MongoDB connection fails

**Solution**:
1. Check MongoDB Atlas IP whitelist (allow 0.0.0.0/0)
2. Verify connection string format
3. Ensure database user has correct permissions

### Issue: Scheduler not running

**Solution**:
1. Check timezone settings
2. Verify `ATTENDANCE_CHECK_TIME` format (HH:MM)
3. Test manual check: `POST /api/scheduler/test`

### Issue: Telegram bot not responding

**Solution**:
1. Verify bot token is correct
2. Check bot is not already running elsewhere
3. Test with `/start` command
4. Check logs for errors

### Issue: App sleeps on Render free tier

**Solution**: Use UptimeRobot or Cron-job.org to ping every 5-10 minutes

---

## 🎯 Recommended Setup for Students (FREE)

### Best Combination:
1. **Platform**: Render (FREE)
2. **Database**: MongoDB Atlas (FREE)
3. **Notifications**: Telegram Bot (FREE)
4. **Monitoring**: UptimeRobot (FREE)
5. **Email**: Gmail App Password (FREE)

### Total Cost: $0/month

### Deployment Time: ~20 minutes

---

## 📊 Cost Comparison (Monthly)

| Setup | Platform | Database | Total |
|-------|----------|----------|-------|
| **Free** | Render | MongoDB Atlas Free | $0 |
| **Hobby** | Railway | MongoDB Atlas Free | $0-5 |
| **Starter** | Heroku | MongoDB Atlas Free | $7 |
| **Pro** | DigitalOcean | MongoDB Atlas Shared | $6-9 |
| **Enterprise** | AWS EC2 | MongoDB Atlas Dedicated | $15+ |

---

## 🚀 Quick Start (Render + MongoDB Atlas)

```bash
# 1. Create MongoDB Atlas cluster (5 min)
# 2. Create Render account and connect GitHub (2 min)
# 3. Deploy from GitHub (3 min)
# 4. Add environment variables (5 min)
# 5. Setup UptimeRobot (3 min)
# 6. Register via Telegram bot (1 min)
# Total: ~20 minutes
```

---

## 📞 Support

If you encounter issues:
1. Check logs first
2. Verify all environment variables
3. Test endpoints with curl
4. Check MongoDB Atlas network access
5. Review this troubleshooting section

---

## ✅ Success Checklist

- [ ] MongoDB Atlas cluster created and connected
- [ ] App deployed and accessible via HTTPS
- [ ] Environment variables configured
- [ ] Health endpoint returns success
- [ ] Student registration working
- [ ] Telegram bot responding
- [ ] Manual attendance check working
- [ ] Scheduler status shows active
- [ ] Daily notifications tested
- [ ] Monitoring/ping setup (for free tiers)

---

**Happy Deploying! 🎉**

Your attendance automation system will now run 24/7 in the cloud!
