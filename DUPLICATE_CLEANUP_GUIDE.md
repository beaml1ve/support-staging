# 🗑️ Slack Duplicate Messages Cleanup Guide

This guide explains how to remove duplicate messages from your Slack channel that were sent during development/testing.

## 🚫 **Prevention First (For Future)**

Before cleaning up, set up prevention to avoid future duplicates:

### Quick Prevention Setup
```bash
# Skip production notifications during development
export SLACK_SKIP_PRODUCTION=true

# Or use dry run mode for testing
export SLACK_DRY_RUN=true

# Or use separate dev webhook
export SLACK_WEBHOOK_URL_DEV="https://hooks.slack.com/services/DEV/WEBHOOK"
export SLACK_DEV_MODE=true
```

## 🧹 **Manual Cleanup Methods**

### **Method 1: Manual Deletion (Recommended for Small Numbers)**

**If you have message deletion permissions:**

1. **Go to your Slack channel** (e.g., #customer-support)
2. **Find duplicate messages** from "Support Session Bot"
3. **For each duplicate message:**
   - Hover over the message
   - Click the **"⋯" (more actions)** menu
   - Select **"Delete message"**
   - Confirm deletion

**Bulk Selection Tips:**
- Hold `Shift` and click to select multiple messages (if supported)
- Look for messages with identical session IDs
- Keep the first message, delete subsequent duplicates

### **Method 2: Automated Cleanup Script**

**For bulk cleanup, use the provided cleanup script:**

#### **Prerequisites:**
1. **Create a Slack Bot Token:**
   - Go to https://api.slack.com/apps
   - Create new app or use existing
   - Go to "OAuth & Permissions"
   - Add scopes: `chat:write`, `channels:history`, `groups:history`
   - Install app to workspace
   - Copy the "Bot User OAuth Token"

2. **Get Channel ID:**
   - Right-click on channel name in Slack
   - Select "Copy link"
   - Extract channel ID from URL (e.g., `C1234567890`)

#### **Usage:**

**Dry Run (Recommended First):**
```bash
# From root workspace
export SLACK_BOT_TOKEN="xoxb-your-bot-token"
export SLACK_CHANNEL_ID="C1234567890"
npm run slack-cleanup-dry

# Or from slack-webhook workspace
cd slack-webhook
SLACK_BOT_TOKEN="xoxb-your-bot-token" npm run cleanup-duplicates-dry C1234567890
```

**Actual Cleanup:**
```bash
# From root workspace
npm run slack-cleanup

# Or from slack-webhook workspace
cd slack-webhook
SLACK_BOT_TOKEN="xoxb-your-bot-token" npm run cleanup-duplicates C1234567890 --delete
```

#### **What the Script Does:**
1. **Scans** the channel for messages from "Support Session Bot"
2. **Groups** messages by session ID
3. **Identifies** duplicates (multiple messages for same session)
4. **Keeps** the first message, marks others for deletion
5. **Deletes** duplicates with rate limiting (1 second between deletions)

### **Method 3: Slack Admin Console (For Admins)**

**If you're a workspace admin:**

1. **Go to Slack Admin Console**
2. **Navigate to** "Manage" → "Messages"
3. **Search for** messages from "Support Session Bot"
4. **Filter by** date range when duplicates occurred
5. **Bulk select** and delete duplicate messages

## 🔍 **Identifying Duplicates**

**Look for these patterns:**
- Multiple messages with same **Session ID**
- Messages sent within **minutes of each other**
- **Identical content** from "Support Session Bot"
- Same **session folder path**

**Example duplicate pattern:**
```
🔧 Support Session Completed: api-admin-core-dev-errors-20250908
Session ID: 2025-09-08_11-56-14_api-admin-core-dev-errors-20250908
[Same content repeated multiple times]
```

## ⚙️ **Configuration for Future Prevention**

### **Environment Variables**
```bash
# Development mode
export SLACK_DEV_MODE=true

# Skip production entirely
export SLACK_SKIP_PRODUCTION=true

# Dry run mode
export SLACK_DRY_RUN=true

# Separate webhooks
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/PROD/WEBHOOK"
export SLACK_WEBHOOK_URL_DEV="https://hooks.slack.com/services/DEV/WEBHOOK"
```

### **Configuration File**
```json
{
  "webhookUrl": "https://hooks.slack.com/services/PROD/WEBHOOK",
  "webhookUrlDev": "https://hooks.slack.com/services/DEV/WEBHOOK",
  "preventDuplicates": true,
  "dryRun": false,
  "enabled": true
}
```

## 🛡️ **Built-in Duplicate Prevention**

The system now includes automatic duplicate prevention:

- **Content-based deduplication** using session ID + content hash
- **24-hour cache** of sent messages
- **Persistent storage** in `.sent-messages.json`
- **Automatic cleanup** of old cache entries

## 🚨 **Emergency Stop**

**If messages are being sent in a loop:**

```bash
# Immediately disable all Slack notifications
export SLACK_WEBHOOK_URL=""
export SLACK_SKIP_PRODUCTION=true

# Or disable in config
echo '{"enabled": false}' > slack-webhook/slack-config.json
```

## 📋 **Cleanup Checklist**

- [ ] **Identify** all duplicate messages in the channel
- [ ] **Test cleanup script** with dry run first
- [ ] **Run actual cleanup** with proper bot token and permissions
- [ ] **Verify** duplicates are removed
- [ ] **Set up prevention** for future (dev webhook, dry run mode, etc.)
- [ ] **Update team** on new development practices

## 🔧 **Troubleshooting**

### **"Permission Denied" Errors**
- Ensure bot token has `chat:write` permissions
- Check if bot is added to the channel
- Verify workspace admin permissions

### **"Channel Not Found" Errors**
- Double-check channel ID format
- Ensure bot has access to the channel
- Try with channel name instead of ID

### **Script Not Finding Duplicates**
- Check message username/bot_id matching
- Verify session ID pattern matching
- Adjust time range if needed

---

**Need Help?** Check the bot token permissions, channel access, and ensure you're using the correct channel ID format.
