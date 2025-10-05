# Azure Deployment Quick Reference

## Prerequisites Checklist

- [ ] Azure account created
- [ ] MongoDB Atlas account created
- [ ] Telegram bot tokens obtained
- [ ] Git installed
- [ ] GitHub repository created

## Quick Deploy Steps

### 1. Azure App Service Setup (5 minutes)

```bash
# Azure Portal: portal.azure.com
1. Create Resource → Web App
2. Name: attendance-bot-yourname
3. Runtime: Node 18 LTS
4. OS: Linux
5. Plan: Basic B1 (~$13/month)
6. Create
```

### 2. MongoDB Atlas Setup (5 minutes)

```bash
# MongoDB Atlas: cloud.mongodb.com
1. Create M0 Free Cluster
2. Provider: Azure (same region as App Service)
3. Create database user with password
4. Network Access: Allow 0.0.0.0/0
5. Copy connection string
```

### 3. Configure Environment Variables (5 minutes)

```bash
# Azure Portal → Your App Service → Configuration → Application settings
# Add these one by one:

NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
TELEGRAM_BOT_TOKEN=your_bot_token
ADMIN_TELEGRAM_BOT_TOKEN=your_admin_bot_token
ADMIN_TELEGRAM_CHAT_IDS=your_chat_id
HEADLESS_MODE=true
PORTAL_URL=http://mitsims.in
ATTENDANCE_CHECK_TIME=08:00
TZ=Asia/Kolkata
ENCRYPTION_KEY=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

### 4. GitHub Actions Setup (5 minutes)

```bash
# 1. Get Azure Publish Profile
Azure Portal → Your App Service → Get publish profile

# 2. Add GitHub Secret
GitHub Repo → Settings → Secrets → New repository secret
Name: AZURE_WEBAPP_PUBLISH_PROFILE
Value: <paste publish profile XML>

# 3. Update workflow file
Edit: .github/workflows/azure-deploy.yml
Line 10: AZURE_WEBAPP_NAME: your-actual-app-name

# 4. Commit and push
git add .
git commit -m "Setup Azure deployment"
git push origin main
```

### 5. Verify Deployment (2 minutes)

```bash
# Watch GitHub Actions
GitHub → Actions tab → See deployment progress

# Check Azure logs
Azure Portal → Your App Service → Log stream

# Test bots
Telegram → Your bot → /start
```

## Total Setup Time: ~20-25 minutes

## Common Commands

```bash
# View logs
az webapp log tail --name your-app-name --resource-group your-rg

# Restart app
az webapp restart --name your-app-name --resource-group your-rg

# Deploy manually
git push origin main  # Auto-deploys via GitHub Actions
```

## Environment Variables Quick Copy

```env
NODE_ENV=production
PORT=8080
MONGODB_URI=
TELEGRAM_BOT_TOKEN=
ADMIN_TELEGRAM_BOT_TOKEN=
ADMIN_TELEGRAM_CHAT_IDS=
HEADLESS_MODE=true
PORTAL_URL=http://mitsims.in
ATTENDANCE_CHECK_TIME=08:00
TZ=Asia/Kolkata
ENCRYPTION_KEY=
```

## Troubleshooting Quick Fixes

### App won't start
- Check all environment variables are set
- Verify MongoDB connection string
- Check logs: Azure Portal → Log stream

### Bot not responding
- Verify bot tokens in Configuration
- Test token: `curl https://api.telegram.org/bot<TOKEN>/getMe`

### Database connection failed
- Check MongoDB Atlas network access allows 0.0.0.0/0
- Verify password in connection string (no angle brackets)

### Deployment failed
- Check GitHub Actions logs
- Verify AZURE_WEBAPP_NAME matches actual app name
- Re-download publish profile if expired

## Cost Summary

- **App Service B1**: ~$13/month
- **MongoDB Atlas M0**: $0 (free)
- **Bandwidth**: Usually free tier
- **Total**: ~$13/month

## Support Links

- [Full Deployment Guide](AZURE_DEPLOYMENT_GUIDE.md)
- [Azure Docs](https://docs.microsoft.com/azure/app-service/)
- [MongoDB Atlas](https://docs.atlas.mongodb.com/)
