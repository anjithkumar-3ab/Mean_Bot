# 🔷 Complete Azure Deployment Guide

Deploy your **Attendance Automation System** to **Microsoft Azure App Service** for 24/7 cloud operation with automatic CI/CD deployment.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Azure Setup](#azure-setup)
3. [MongoDB Atlas Setup](#mongodb-atlas-setup)
4. [Azure App Service Configuration](#azure-app-service-configuration)
5. [GitHub Actions CI/CD Setup](#github-actions-cicd-setup)
6. [Environment Variables Configuration](#environment-variables-configuration)
7. [Deployment Methods](#deployment-methods)
8. [Post-Deployment Steps](#post-deployment-steps)
9. [Troubleshooting](#troubleshooting)
10. [Monitoring & Logs](#monitoring--logs)

---

## Prerequisites

Before you begin, ensure you have:

- ✅ **Azure Account** - [Sign up for free](https://azure.microsoft.com/free/) (includes $200 credit)
- ✅ **GitHub Account** - For CI/CD deployment
- ✅ **MongoDB Atlas Account** - [Free tier available](https://www.mongodb.com/cloud/atlas/register)
- ✅ **Telegram Bot Token** - From [@BotFather](https://t.me/BotFather)
- ✅ **Git** installed locally
- ✅ **Node.js** installed (v16 or higher)

---

## Azure Setup

### Step 1: Create Azure App Service

1. **Go to Azure Portal**
   - Visit: [https://portal.azure.com](https://portal.azure.com)
   - Sign in with your account

2. **Create a new App Service**
   ```
   Click "+ Create a resource"
   → Search for "Web App"
   → Click "Create"
   ```

3. **Configure Basic Settings**
   - **Subscription**: Select your subscription
   - **Resource Group**: Create new (e.g., `attendance-system-rg`)
   - **Name**: Choose unique name (e.g., `attendance-bot-yourname`)
     - This becomes: `attendance-bot-yourname.azurewebsites.net`
   - **Publish**: `Code`
   - **Runtime Stack**: `Node 18 LTS` or `Node 20 LTS`
   - **Operating System**: `Linux` (recommended) or `Windows`
   - **Region**: Choose closest to you (e.g., `Central India`)

4. **Choose Pricing Plan**
   - **Free (F1)**: Good for testing (limitations: 60 min/day compute, 1GB storage)
   - **Basic (B1)**: Recommended for production (~$13/month, always on)
   - **Standard (S1)**: For high traffic (~$70/month, auto-scaling)

5. **Click "Review + Create"** then **"Create"**

6. **Wait for Deployment** (takes ~2 minutes)

### Step 2: Configure App Service Settings

1. **Go to your App Service**
   - Navigate to your resource group
   - Click on your App Service name

2. **Enable Always On** (Important for 24/7 operation)
   ```
   Settings → Configuration → General settings
   → "Always On": ON
   → Click "Save"
   ```

3. **Configure Platform Settings**
   ```
   Settings → Configuration → General settings
   → "Platform": 64 Bit
   → "HTTP Version": 2.0
   → "Web sockets": On (recommended)
   → Click "Save"
   ```

---

## MongoDB Atlas Setup

Since Azure App Service doesn't include a database, we'll use MongoDB Atlas (free cloud MongoDB).

### Step 1: Create MongoDB Atlas Cluster

1. **Sign up/Login**
   - Visit: [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)

2. **Create a Free Cluster**
   - Choose **M0 (Free tier)**
   - Provider: `Azure` (for better integration)
   - Region: Same as your Azure App Service
   - Cluster Name: `attendance-cluster`

3. **Configure Database Access**
   ```
   Security → Database Access
   → "Add New Database User"
   → Username: attendance_user
   → Password: Generate secure password (save this!)
   → User Privileges: "Read and write to any database"
   → Click "Add User"
   ```

4. **Configure Network Access**
   ```
   Security → Network Access
   → "Add IP Address"
   → Click "Allow Access from Anywhere" (0.0.0.0/0)
   → Click "Confirm"
   ```
   > ⚠️ For production, restrict to Azure IPs only

5. **Get Connection String**
   ```
   Deployment → Database → Connect
   → "Connect your application"
   → Driver: Node.js
   → Version: 4.1 or later
   → Copy the connection string
   ```
   
   Example:
   ```
   mongodb+srv://attendance_user:<password>@attendance-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   
   Replace `<password>` with your actual password!

---

## Azure App Service Configuration

### Configure Environment Variables in Azure

1. **Go to App Service Configuration**
   ```
   Your App Service → Settings → Configuration
   → "Application settings" tab
   ```

2. **Add Each Environment Variable**
   
   Click **"+ New application setting"** for each:

   | Name | Value | Description |
   |------|-------|-------------|
   | `NODE_ENV` | `production` | Production environment |
   | `PORT` | `8080` | Azure default port |
   | `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection string |
   | `TELEGRAM_BOT_TOKEN` | `123456:ABC-DEF...` | Your user bot token from BotFather |
   | `ADMIN_TELEGRAM_BOT_TOKEN` | `789012:XYZ-ABC...` | Your admin bot token |
   | `ADMIN_TELEGRAM_CHAT_IDS` | `123456789,987654321` | Comma-separated admin chat IDs |
   | `HEADLESS_MODE` | `true` | **MUST be true for cloud** |
   | `PORTAL_URL` | `http://mitsims.in` | Your institution portal |
   | `ATTENDANCE_CHECK_TIME` | `08:00` | Daily check time (24-hour format) |
   | `TZ` | `Asia/Kolkata` | Your timezone |
   | `ENCRYPTION_KEY` | `64-char-hex` | Generate with method below |

3. **Generate Encryption Key** (Run locally):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Click "Save"** at the top
   - Azure will restart your app automatically

---

## GitHub Actions CI/CD Setup

Automate deployment with GitHub Actions - every push to `main` triggers automatic deployment!

### Step 1: Get Azure Publish Profile

1. **Download Publish Profile**
   ```
   Your App Service → Overview
   → Click "Get publish profile" (top menu)
   → Save the .publishsettings file
   ```

2. **Copy File Contents**
   - Open the downloaded file in a text editor
   - Copy ALL the XML content

### Step 2: Add GitHub Secret

1. **Go to your GitHub repository**
   ```
   Settings → Secrets and variables → Actions
   → Click "New repository secret"
   ```

2. **Create Secret**
   - **Name**: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - **Value**: Paste the entire publish profile XML
   - Click **"Add secret"**

### Step 3: Update Workflow File

1. **Edit**: `.github/workflows/azure-deploy.yml`

2. **Change Line 10**:
   ```yaml
   AZURE_WEBAPP_NAME: your-app-name    # Change to YOUR Azure app name
   ```
   
   Example:
   ```yaml
   AZURE_WEBAPP_NAME: attendance-bot-yourname
   ```

3. **Commit and Push**:
   ```bash
   git add .
   git commit -m "Configure Azure deployment"
   git push origin main
   ```

4. **Watch Deployment**
   - Go to GitHub → Actions tab
   - See the deployment progress in real-time!

---

## Deployment Methods

### Method 1: Automatic Deployment (Recommended)

**Via GitHub Actions** (configured above):

```bash
# Any push to main branch triggers automatic deployment
git add .
git commit -m "Your changes"
git push origin main
```

Watch deployment at: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`

### Method 2: Manual Deployment via GitHub Actions

1. **Go to GitHub repository**
   ```
   Actions → Manual Deploy to Azure
   → Click "Run workflow"
   → Choose options
   → Click "Run workflow"
   ```

### Method 3: Azure CLI Deployment

Install Azure CLI: [https://docs.microsoft.com/cli/azure/install-azure-cli](https://docs.microsoft.com/cli/azure/install-azure-cli)

```bash
# Login to Azure
az login

# Deploy from local directory
az webapp up --name attendance-bot-yourname --resource-group attendance-system-rg

# Or deploy a ZIP file
az webapp deployment source config-zip \
  --resource-group attendance-system-rg \
  --name attendance-bot-yourname \
  --src deploy.zip
```

### Method 4: VS Code Azure Extension

1. **Install Extension**: Azure App Service extension
2. **Sign in to Azure** in VS Code
3. **Right-click** your project folder
4. **Select** "Deploy to Web App"
5. **Choose** your App Service

---

## Post-Deployment Steps

### 1. Verify Deployment

1. **Check App Service Status**
   ```
   Azure Portal → Your App Service → Overview
   → Status should be "Running"
   ```

2. **View Application Logs**
   ```
   Your App Service → Monitoring → Log stream
   ```
   
   You should see:
   ```
   🚀 Attendance Telegram Bot Service Started
   Database connected successfully
   ✅ Scheduler initialized and started
   ```

### 2. Test Telegram Bots

1. **Test User Bot**
   - Open Telegram
   - Search for your bot
   - Send `/start`
   - You should get a welcome message

2. **Test Admin Bot**
   - Message your admin bot
   - Send `/stats`
   - Should receive system statistics

### 3. Register First Student

Using the user bot:
```
/reg 23691A3305 your_password Your Name
```

Or use step-by-step:
```
/register
```

### 4. Manual Attendance Check

Test the scraping system:
```
# Via user bot
/check

# Via admin bot
/manualcheck
```

---

## Environment Variables Configuration

Complete list of required environment variables:

```bash
# === REQUIRED ===
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
TELEGRAM_BOT_TOKEN=your_bot_token
ADMIN_TELEGRAM_BOT_TOKEN=your_admin_token
ADMIN_TELEGRAM_CHAT_IDS=123456789
HEADLESS_MODE=true
ENCRYPTION_KEY=your_64_char_hex_key

# === OPTIONAL ===
PORTAL_URL=http://mitsims.in
ATTENDANCE_CHECK_TIME=08:00
TZ=Asia/Kolkata
USE_MOCK_DATA=false
DEBUG=false
LOG_LEVEL=info
```

See `.env.azure.example` for detailed descriptions.

---

## Troubleshooting

### Common Issues & Solutions

#### 1. **App won't start / keeps restarting**

**Check Logs**:
```
Azure Portal → Your App Service → Monitoring → Log stream
```

**Common Causes**:
- Missing environment variables
- Wrong MongoDB connection string
- Port misconfiguration

**Solution**:
```bash
# Ensure PORT is set to 8080
# Verify all required environment variables are set
# Check MongoDB Atlas IP whitelist includes 0.0.0.0/0
```

#### 2. **Telegram bot not responding**

**Verify Bot Tokens**:
```
Azure Portal → Configuration → Application settings
→ Check TELEGRAM_BOT_TOKEN
→ Check ADMIN_TELEGRAM_BOT_TOKEN
```

**Test Tokens**:
```bash
# Test if token is valid
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe
```

#### 3. **Database connection failed**

**Check MongoDB Atlas**:
- Network Access allows 0.0.0.0/0
- Database user has correct password
- Connection string format is correct
- Replace `<password>` in connection string

**Test Connection String**:
```javascript
// Run locally first to test
node -e "const mongoose = require('mongoose'); mongoose.connect('YOUR_CONNECTION_STRING').then(() => console.log('✅ Connected')).catch(err => console.log('❌ Error:', err))"
```

#### 4. **Puppeteer / Scraper issues**

**For Linux App Service**:
Add these environment variables:
```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

**Alternative - Use Puppeteer Azure Function**:
Consider using Azure Functions for scraping if App Service has issues.

#### 5. **Deployment fails**

**GitHub Actions Errors**:
```
Check: GitHub → Actions → Failed workflow
→ View logs
→ Common: Wrong app name or expired publish profile
```

**Solution**:
- Verify `AZURE_WEBAPP_NAME` in workflow file
- Re-download publish profile if expired
- Update `AZURE_WEBAPP_PUBLISH_PROFILE` secret

#### 6. **App goes to sleep (Free tier)**

**Issue**: Free tier sleeps after 20 minutes of inactivity

**Solutions**:
1. **Upgrade to Basic (B1) tier** - Enables "Always On"
2. **Use external pinger** - Free service that pings your app every 5 minutes
   - [UptimeRobot](https://uptimerobot.com/) (free)
   - [Pingdom](https://www.pingdom.com/) (free tier)

---

## Monitoring & Logs

### Real-Time Logs

**Azure Portal Method**:
```
Your App Service → Monitoring → Log stream
```

**Azure CLI Method**:
```bash
az webapp log tail --name attendance-bot-yourname --resource-group attendance-system-rg
```

### Application Insights (Advanced Monitoring)

1. **Enable Application Insights**:
   ```
   Your App Service → Monitoring → Application Insights
   → "Turn on Application Insights"
   → Create new resource
   → Click "Apply"
   ```

2. **View Metrics**:
   - Request rates
   - Response times
   - Failure rates
   - Memory/CPU usage

### Set Up Alerts

1. **Create Alert Rule**:
   ```
   Your App Service → Monitoring → Alerts
   → "+ Create" → "Alert rule"
   ```

2. **Example Alert: App Down**:
   - **Condition**: HTTP 5xx errors > 5 in 5 minutes
   - **Action**: Email notification
   - **Details**: Alert name, description

---

## Cost Estimation

### Free Tier (F1)
- **Cost**: $0/month
- **Compute**: 60 minutes/day
- **Storage**: 1 GB
- **Best for**: Testing only

### Basic (B1) - Recommended
- **Cost**: ~$13/month
- **Compute**: Always on, unlimited
- **Storage**: 10 GB
- **Best for**: Production use

### Standard (S1)
- **Cost**: ~$70/month
- **Compute**: Auto-scaling, load balancing
- **Storage**: 50 GB
- **Best for**: High traffic production

### Additional Costs
- **MongoDB Atlas**: $0 (M0 free tier)
- **Bandwidth**: Usually free tier is enough
- **Application Insights**: Free tier available

**Total Monthly Cost (Recommended)**: ~$13 USD

---

## Security Best Practices

### 1. Environment Variables
- ✅ Never commit `.env` files to Git
- ✅ Use Azure App Configuration for secrets
- ✅ Rotate API keys regularly

### 2. MongoDB Security
- ✅ Use strong passwords
- ✅ Restrict IP access in production
- ✅ Enable MongoDB authentication
- ✅ Use SSL/TLS connections

### 3. Azure Security
- ✅ Enable HTTPS only
- ✅ Use Managed Identity where possible
- ✅ Regular security updates
- ✅ Monitor access logs

### 4. Telegram Security
- ✅ Verify admin chat IDs
- ✅ Use separate admin bot
- ✅ Never expose bot tokens

---

## Updating Your App

### Method 1: Git Push (Automatic)
```bash
git add .
git commit -m "Update message"
git push origin main
# GitHub Actions deploys automatically
```

### Method 2: Manual Deployment
```bash
# Pull latest publish profile
# Go to GitHub Actions → Manual Deploy
# Click "Run workflow"
```

### Method 3: Azure CLI
```bash
az webapp restart --name attendance-bot-yourname --resource-group attendance-system-rg
```

---

## Backup & Recovery

### Database Backup (MongoDB Atlas)

**Automatic Backups** (M10+ clusters):
- Atlas automatically backs up data

**Manual Backup** (M0 free tier):
```bash
# Export database
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/dbname" --out=backup/

# Restore database
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/dbname" backup/
```

### Application Backup

**Backup Configuration**:
```
Your App Service → Backups
→ Configure backup schedule
→ Choose storage account
```

---

## Next Steps

After successful deployment:

1. ✅ **Monitor logs** for first 24 hours
2. ✅ **Test all bot commands**
3. ✅ **Register test student accounts**
4. ✅ **Verify daily scheduled checks work**
5. ✅ **Set up Application Insights**
6. ✅ **Configure alerts for downtime**
7. ✅ **Document your deployment**

---

## Helpful Resources

- [Azure App Service Docs](https://docs.microsoft.com/azure/app-service/)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [GitHub Actions Docs](https://docs.github.com/actions)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Node.js on Azure](https://docs.microsoft.com/azure/app-service/quickstart-nodejs)

---

## Support

### Getting Help

1. **Check logs first**: Most issues appear in logs
2. **Search Azure docs**: Comprehensive documentation
3. **Check GitHub Issues**: Common problems and solutions
4. **Azure Support**: Available in Azure Portal

### Contact

- **GitHub Issues**: [Your Repository Issues](https://github.com/YOUR_USERNAME/YOUR_REPO/issues)
- **Azure Support**: Portal → Help + Support

---

## Summary Checklist

- [ ] Azure account created
- [ ] App Service created (B1 or higher recommended)
- [ ] MongoDB Atlas cluster created
- [ ] Environment variables configured
- [ ] GitHub Actions secrets added
- [ ] First deployment successful
- [ ] Telegram bots responding
- [ ] First student registered
- [ ] Attendance check working
- [ ] Monitoring enabled
- [ ] Alerts configured

**🎉 Congratulations! Your attendance system is now running 24/7 on Azure!**

---

*Last updated: 2025-01-05*
