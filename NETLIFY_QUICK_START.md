# Quick Netlify Deployment Guide

## ⚠️ READ THIS FIRST

**Netlify is NOT the recommended platform for this project** because it requires:
- Persistent server processes (Telegram polling, cron jobs)
- Long-running background tasks
- Continuous database connections

**Better Alternatives:**
- ✅ **Railway** (Recommended) - Full feature support
- ✅ **Render** - Free tier with background workers
- ✅ **Heroku** - Proven platform (no free tier)

See `NETLIFY_DEPLOYMENT.md` for full details.

## If You Still Want to Use Netlify (Hybrid Mode)

### Prerequisites

1. **MongoDB Atlas Account** (Free)
   - Sign up: https://www.mongodb.com/cloud/atlas
   - Create cluster and get connection string

2. **Netlify Account** (Free)
   - Sign up: https://www.netlify.com

3. **Telegram Bot Token**
   - Already have one from your bot

### Quick Steps

#### 1. Install Netlify CLI
\`\`\`bash
npm install -g netlify-cli
\`\`\`

#### 2. Login to Netlify
\`\`\`bash
netlify login
\`\`\`

#### 3. Initialize Project
\`\`\`bash
netlify init
\`\`\`

Follow the prompts:
- Create & configure a new site
- Site name: choose a unique name
- Build command: `npm install`
- Publish directory: `public`
- Functions directory: `netlify/functions`

#### 4. Set Environment Variables
\`\`\`bash
netlify env:set MONGODB_URI "your_mongodb_atlas_connection_string"
netlify env:set TELEGRAM_BOT_TOKEN "your_telegram_bot_token"
netlify env:set JWT_SECRET "your_secret_key_here"
netlify env:set ENCRYPTION_KEY "your_encryption_key_here"
netlify env:set NODE_ENV "production"
\`\`\`

#### 5. Deploy
\`\`\`bash
netlify deploy --prod
\`\`\`

#### 6. Set Up Telegram Webhook

After deployment, get your site URL and run:

\`\`\`bash
# Replace with your actual values
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://your-site-name.netlify.app/.netlify/functions/telegram-webhook"
\`\`\`

Or use this one-liner (PowerShell):
\`\`\`powershell
$botToken = "YOUR_BOT_TOKEN"
$webhookUrl = "https://your-site-name.netlify.app/.netlify/functions/telegram-webhook"
Invoke-WebRequest -Uri "https://api.telegram.org/bot$botToken/setWebhook" -Method POST -Body @{url=$webhookUrl}
\`\`\`

#### 7. Verify Webhook
\`\`\`bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
\`\`\`

### What Works on Netlify

✅ Static web pages (index.html, admin.html, client.html)
✅ User registration via Telegram
✅ Account management (view, remove accounts)
✅ Manual attendance checks via API

### What Doesn't Work

❌ Automatic scheduled attendance checks (no cron)
❌ Telegram bot polling (using webhooks instead)
❌ Real-time background processes

### API Endpoints (Serverless Functions)

After deployment, your API will be available at:

- `https://your-site.netlify.app/.netlify/functions/health`
- `https://your-site.netlify.app/.netlify/functions/students`
- `https://your-site.netlify.app/.netlify/functions/check-attendance`
- `https://your-site.netlify.app/.netlify/functions/telegram-webhook`

### Testing Deployment

1. Open your site: `https://your-site.netlify.app`
2. Test health endpoint: `https://your-site.netlify.app/.netlify/functions/health`
3. Test Telegram bot: Send `/start` to your bot

### Troubleshooting

**Issue: Functions timing out**
- Solution: Netlify has 10-second limit on free tier
- Upgrade to Pro for 26-second limit
- Or use Railway/Render instead

**Issue: Database connection errors**
- Check MongoDB Atlas IP whitelist (allow all: 0.0.0.0/0)
- Verify MONGODB_URI environment variable
- Check MongoDB Atlas cluster is running

**Issue: Telegram webhook not working**
- Verify webhook URL is correct
- Check Netlify function logs
- Ensure bot token is correct

### For Full Functionality, Use Railway

\`\`\`bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy (uses existing configs)
railway up
\`\`\`

Railway provides:
- ✅ Full feature support
- ✅ Persistent processes
- ✅ Cron jobs
- ✅ Free tier
- ✅ Simpler deployment

## Support

- Netlify Docs: https://docs.netlify.com
- Railway Docs: https://docs.railway.app
- MongoDB Atlas: https://www.mongodb.com/docs/atlas

---

**Recommendation:** Use Railway or Render for this project instead of Netlify for the best experience.
