# Slack Webhook Integration

This workspace provides Slack webhook integration for support session notifications across all platforms in the monorepo.

## 🚀 Quick Start

### 1. Configure Webhook
```bash
# Option A: Environment variable (recommended)
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

# Option B: Configuration file
cp slack-config.example.json slack-config.json
# Edit slack-config.json with your webhook URL
```

### 2. Test Integration
```bash
# From root workspace
npm run slack-test

# From this workspace
npm test
```

### 3. Validate Configuration
```bash
# From root workspace
npm run slack-validate

# From this workspace
npm run validate-config
```

## 📋 Available Scripts

- `npm run notify <session-folder>` - Send notification for specific session
- `npm test` - Test integration with latest session (sends full session-summary.md)
- `npm run test-full` - Test full session summary integration
- `npm run test-dev` - Test in development mode (uses dev webhook if configured)
- `npm run test-dry` - Dry run test (shows what would be sent without sending)
- `npm run test-skip-prod` - Skip production notifications during development
- `npm run setup` - Show setup instructions
- `npm run validate-config` - Check webhook configuration

## 🔧 Usage from Root

```bash
# Test Slack integration
npm run slack-test

# Send specific session notification
npm run slack-notify path/to/session-folder

# Validate configuration
npm run slack-validate

# Show setup instructions
npm run slack-setup
```

## 📁 Files

- `scripts/slack-notifier.js` - Main Slack integration module
- `slack-config.json` - Webhook configuration (create from example)
- `slack-config.example.json` - Configuration template
- `SLACK_SETUP.md` - Detailed setup instructions

## 🔗 Integration

This workspace is automatically used by:
- Platform session close scripts (`npm run close-session`) - sends full session-summary.md
- Root-level Slack commands
- All platforms in the monorepo

## 📄 Message Format

The Slack integration now sends the **complete session-summary.md file** content to Slack, including:
- Full session information and metadata
- Complete objective and process documentation
- Detailed key actions and commands executed
- Root cause analysis and findings
- Next steps and recommendations
- All session files and documentation links

The content is automatically formatted for Slack with:
- Markdown to Slack formatting conversion
- Proper code block formatting
- Bullet point conversion
- Content chunking for Slack's message limits

## 🚫 Preventing Duplicate Messages

To prevent duplicate messages to customer-support channel during development:

### Environment Variables
```bash
# Development mode - uses dev webhook if configured
export SLACK_DEV_MODE=true

# Skip production notifications entirely
export SLACK_SKIP_PRODUCTION=true

# Dry run mode - shows what would be sent without sending
export SLACK_DRY_RUN=true

# Separate webhooks for dev and production
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/PROD/WEBHOOK"
export SLACK_WEBHOOK_URL_DEV="https://hooks.slack.com/services/DEV/WEBHOOK"
```

### Configuration File Options
```json
{
  "webhookUrl": "https://hooks.slack.com/services/PROD/WEBHOOK",
  "webhookUrlDev": "https://hooks.slack.com/services/DEV/WEBHOOK",
  "preventDuplicates": true,
  "dryRun": false,
  "enabled": true
}
```

### Best Practices for Development
1. **Use separate channels**: Configure `webhookUrlDev` for a development channel
2. **Enable dry run**: Set `SLACK_DRY_RUN=true` for testing
3. **Skip production**: Set `SLACK_SKIP_PRODUCTION=true` during development
4. **Automatic duplicate prevention**: Built-in deduplication based on session content

## 📚 Documentation

See `SLACK_SETUP.md` for complete setup instructions and troubleshooting.

---

**Workspace**: `@support-staging/slack-webhook`  
**Type**: Utility workspace for cross-platform notifications
