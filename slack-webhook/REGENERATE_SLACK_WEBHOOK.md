# 🔄 How to Regenerate Slack Webhook URL

Your current webhook URL might be expired or invalid. Here's how to create a new one:

## 🚀 Quick Steps

### 1. **Go to Slack API Dashboard**
- Visit: https://api.slack.com/apps
- Sign in with your Slack account

### 2. **Create New App (or use existing)**

**Option A: Create New App**
- Click **"Create New App"**
- Choose **"From scratch"**
- App Name: `Support Staging Notifications` (or any name)
- Workspace: Select `beamlive-workspace`
- Click **"Create App"**

**Option B: Use Existing App**
- Find your existing app in the list
- Click on it to open settings

### 3. **Enable Incoming Webhooks**
- In the left sidebar, click **"Incoming Webhooks"**
- Toggle **"Activate Incoming Webhooks"** to **ON**

### 4. **Create New Webhook URL**
- Click **"Add New Webhook to Workspace"**
- Select the channel: `#customer-support` (or your preferred channel)
- Click **"Allow"**

### 5. **Copy the New Webhook URL**
- You'll see a new webhook URL like:
  ```
  https://hooks.slack.com/services/T123ABC456/B123ABC456/XYZ123abc456def789
  ```
- **Copy this URL**

## 🔧 Update Your Configuration

### Method 1: Environment Variable (Recommended)
```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/NEW/WEBHOOK"
```

### Method 2: Update Config File
Edit `slack-webhook/slack-config.json`:
```json
{
  "webhookUrl": "https://hooks.slack.com/services/YOUR/NEW/WEBHOOK",
  "enabled": true,
  "preventDuplicates": true,
  "developmentMode": false,
  "dryRun": false,
  "maxRetries": 3,
  "retryDelay": 1000
}
```

## ✅ Test the New Webhook

```bash
# Test the webhook
npm run slack-test

# Or test with a specific session
npm run slack-notify platforms/staging/session-logs/2025-09-08_11-56-14_api-admin-core-dev-errors-20250908
```

## 🔒 Security Best Practices

1. **Keep URLs Private**: Never commit webhook URLs to public repositories
2. **Use Environment Variables**: Store sensitive URLs as environment variables
3. **Regular Rotation**: Regenerate webhooks periodically
4. **Monitor Usage**: Check Slack app activity for unauthorized usage

## 🆘 Troubleshooting

### Common Issues:
- **404 Error**: Webhook URL is invalid/expired → Regenerate
- **403 Error**: App doesn't have permission → Check app permissions
- **Channel Not Found**: Channel was deleted → Create webhook for existing channel

### Test Commands:
```bash
# Validate current configuration
npm run slack-validate

# Test with dry run
SLACK_DRY_RUN=true npm run slack-test

# Check webhook status
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message"}' \
  YOUR_WEBHOOK_URL
```

## 📱 Alternative: Using Bot Token (Advanced)

For more advanced features (like deleting messages), you can also create a Bot Token:

1. In your Slack app, go to **"OAuth & Permissions"**
2. Add these scopes:
   - `chat:write`
   - `channels:history`
   - `chat:write.public`
3. Install app to workspace
4. Copy the **Bot User OAuth Token**
5. Set `SLACK_BOT_TOKEN` environment variable

---

**Need Help?** Check the [Slack API Documentation](https://api.slack.com/messaging/webhooks) or ask in the team chat.
