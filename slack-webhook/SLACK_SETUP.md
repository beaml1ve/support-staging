# Slack Integration Setup

This document explains how to set up Slack notifications for session summaries.

## 🚀 Quick Setup

### 1. Create Slack App and Webhook

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name your app (e.g., "Support Session Bot")
4. Select your workspace
5. Go to "Incoming Webhooks" in the sidebar
6. Toggle "Activate Incoming Webhooks" to On
7. Click "Add New Webhook to Workspace"
8. Select the channel where you want notifications
9. Copy the webhook URL

### 2. Configure the Integration

**Option A: Environment Variable (Recommended)**
```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
```

**Option B: Configuration File**
```bash
cp slack-config.example.json slack-config.json
# Edit slack-config.json with your webhook URL
```

### 3. Test the Integration

```bash
# Test from root workspace
npm run slack-test

# Test with a specific session
npm run slack-notify platforms/staging/session-logs/2025-01-08_11-56-14_test-session

# Or close a session normally (will auto-notify if configured)
cd platforms/staging
npm run close-session
```

## 📋 Message Format

The Slack notification now sends the **complete session-summary.md file** content, including:

- **Session Header**: Session name and completion status
- **Session Details**: ID, duration, platform, status
- **Full Session Summary**: Complete markdown content from session-summary.md
- **Process Documentation**: Detailed key actions, commands, and files modified
- **Root Cause Analysis**: Complete investigation findings and technical details
- **Next Steps**: Follow-up actions and recommendations
- **Session Files**: Links to all session documentation

The content is automatically formatted for Slack with proper markdown conversion and chunking for readability.

## ⚙️ Configuration Options

### Environment Variables

- `SLACK_WEBHOOK_URL`: Slack webhook URL (required)
- `SLACK_NOTIFICATIONS_ENABLED`: Enable/disable notifications (default: true)

### Configuration File (`slack-config.json`)

```json
{
  "webhookUrl": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
  "channel": "#support-sessions",
  "enabled": true,
  "notifyOnClose": true,
  "notifyOnError": false
}
```

## 🔧 Advanced Usage

### Manual Notification

Send notification for any session folder:

```bash
# From root workspace
npm run slack-notify path/to/session-folder

# Direct script usage
node scripts/slack-notifier.js path/to/session-folder
```

### Disable Notifications

```bash
# Temporarily disable
export SLACK_NOTIFICATIONS_ENABLED=false

# Or remove webhook URL
unset SLACK_WEBHOOK_URL
```

### Custom Channel

Create multiple webhooks for different channels and switch the `SLACK_WEBHOOK_URL` as needed.

## 🛠️ Troubleshooting

### Common Issues

1. **"Slack webhook not configured"**
   - Set `SLACK_WEBHOOK_URL` environment variable
   - Or create `slack-config.json` with valid webhook URL

2. **"Failed to send to Slack: 404"**
   - Webhook URL is invalid or expired
   - Recreate the webhook in Slack

3. **"Failed to send to Slack: 403"**
   - App doesn't have permission to post to the channel
   - Reinstall the app or check channel permissions

4. **Message truncated**
   - Session content is very long
   - The notifier automatically truncates long content to fit Slack limits

### Debug Mode

Add debug logging by setting:
```bash
export DEBUG=slack-notifier
```

## 🔒 Security Notes

- Keep webhook URLs secure (don't commit to git)
- Use environment variables in production
- Webhook URLs have posting permissions to your Slack workspace
- Consider using Slack app tokens for more advanced integrations

## 📚 Integration Examples

### CI/CD Integration

```bash
# In your deployment script
export SLACK_WEBHOOK_URL="$PRODUCTION_SLACK_WEBHOOK"
npm run close-session
```

### Multiple Environments

```bash
# Development
export SLACK_WEBHOOK_URL="$DEV_SLACK_WEBHOOK"

# Staging  
export SLACK_WEBHOOK_URL="$STAGING_SLACK_WEBHOOK"

# Production
export SLACK_WEBHOOK_URL="$PROD_SLACK_WEBHOOK"
```

---

**Need help?** Check the [Slack API documentation](https://api.slack.com/messaging/webhooks) or create an issue in the repository.
