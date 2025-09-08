#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Slack notification utility for session summaries
 * Requires SLACK_WEBHOOK_URL environment variable or config file
 */

class SlackNotifier {
  constructor() {
    this.webhookUrl = this.getWebhookUrl();
    this.config = this.getConfig();
    this.sentMessagesFile = path.join(__dirname, '..', '.sent-messages.json');
    this.sentMessages = this.loadSentMessages(); // Track sent messages to prevent duplicates
  }

  getWebhookUrl() {
    // Check for development mode first
    if (this.isDevelopmentMode()) {
      // Use development webhook if available
      if (process.env.SLACK_WEBHOOK_URL_DEV) {
        return process.env.SLACK_WEBHOOK_URL_DEV;
      }
      // If no dev webhook, check if we should skip production
      if (process.env.SLACK_SKIP_PRODUCTION === 'true') {
        console.log('🚫 Development mode: Skipping production Slack notifications');
        return null;
      }
    }

    // Try environment variable first
    if (process.env.SLACK_WEBHOOK_URL) {
      return process.env.SLACK_WEBHOOK_URL;
    }

    // Try workspace config file
    const workspaceConfigFile = path.join(__dirname, '..', 'slack-config.json');
    if (fs.existsSync(workspaceConfigFile)) {
      try {
        const config = JSON.parse(fs.readFileSync(workspaceConfigFile, 'utf8'));
        
        // Use development webhook if in dev mode
        if (this.isDevelopmentMode() && config.webhookUrlDev) {
          return config.webhookUrlDev;
        }
        
        return config.webhookUrl;
      } catch (error) {
        console.warn('⚠️  Failed to read slack-config.json:', error.message);
      }
    }

    // Try root config file (backward compatibility)
    const rootConfigFile = path.join(__dirname, '..', '..', 'slack-config.json');
    if (fs.existsSync(rootConfigFile)) {
      try {
        const config = JSON.parse(fs.readFileSync(rootConfigFile, 'utf8'));
        
        // Use development webhook if in dev mode
        if (this.isDevelopmentMode() && config.webhookUrlDev) {
          return config.webhookUrlDev;
        }
        
        return config.webhookUrl;
      } catch (error) {
        console.warn('⚠️  Failed to read root slack-config.json:', error.message);
      }
    }

    return null;
  }

  getConfig() {
    const defaultConfig = {
      enabled: true,
      preventDuplicates: true,
      developmentMode: this.isDevelopmentMode(),
      dryRun: process.env.SLACK_DRY_RUN === 'true',
      maxRetries: 3,
      retryDelay: 1000
    };

    // Try workspace config file
    const workspaceConfigFile = path.join(__dirname, '..', 'slack-config.json');
    if (fs.existsSync(workspaceConfigFile)) {
      try {
        const fileConfig = JSON.parse(fs.readFileSync(workspaceConfigFile, 'utf8'));
        return { ...defaultConfig, ...fileConfig };
      } catch (error) {
        console.warn('⚠️  Failed to read slack-config.json:', error.message);
      }
    }

    return defaultConfig;
  }

  isDevelopmentMode() {
    return process.env.NODE_ENV === 'development' || 
           process.env.SLACK_DEV_MODE === 'true' ||
           process.env.NODE_ENV === 'test';
  }

  loadSentMessages() {
    try {
      if (fs.existsSync(this.sentMessagesFile)) {
        const data = JSON.parse(fs.readFileSync(this.sentMessagesFile, 'utf8'));
        // Clean up old entries (older than 24 hours)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const validEntries = data.filter(entry => entry.timestamp > oneDayAgo);
        
        if (validEntries.length !== data.length) {
          this.saveSentMessages(validEntries);
        }
        
        return new Set(validEntries.map(entry => entry.messageId));
      }
    } catch (error) {
      console.warn('⚠️  Failed to load sent messages cache:', error.message);
    }
    return new Set();
  }

  saveSentMessages(entries = null) {
    try {
      const data = entries || Array.from(this.sentMessages).map(messageId => ({
        messageId,
        timestamp: Date.now()
      }));
      fs.writeFileSync(this.sentMessagesFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('⚠️  Failed to save sent messages cache:', error.message);
    }
  }

  isEnabled() {
    return !!this.webhookUrl;
  }

  async sendSessionSummary(sessionData) {
    // Check if notifications are disabled
    if (!this.config.enabled) {
      console.log('ℹ️  Slack notifications disabled in configuration');
      return false;
    }

    if (!this.isEnabled()) {
      console.log('ℹ️  Slack notifications disabled (no webhook URL configured)');
      return false;
    }

    // Generate message ID for duplicate prevention
    const messageId = this.generateMessageId(sessionData);
    
    // Check for duplicates (can be overridden with SLACK_ALLOW_DUPLICATES=true)
    const allowDuplicates = process.env.SLACK_ALLOW_DUPLICATES === 'true';
    if (this.config.preventDuplicates && !allowDuplicates && this.sentMessages.has(messageId)) {
      console.log(`⚠️  Duplicate message prevented for session: ${sessionData.sessionId}`);
      console.log('💡 Use SLACK_ALLOW_DUPLICATES=true to override');
      return false;
    }

    // Development mode warning
    if (this.isDevelopmentMode()) {
      console.log('🔧 Development mode detected');
      if (process.env.SLACK_WEBHOOK_URL_DEV) {
        console.log('📡 Using development webhook');
      } else {
        console.log('⚠️  No development webhook configured, using production');
      }
    }

    try {
      const message = this.formatFullSessionSummary(sessionData);
      
      // Dry run mode
      if (this.config.dryRun) {
        console.log('🧪 DRY RUN MODE - Message would be sent:');
        console.log('📋 Session:', sessionData.sessionId);
        console.log('📝 Content length:', JSON.stringify(message).length, 'characters');
        console.log('🎯 Webhook:', this.webhookUrl ? 'configured' : 'not configured');
        return true;
      }

      await this.sendToSlack(message);
      
      // Mark as sent to prevent duplicates
      if (this.config.preventDuplicates) {
        this.sentMessages.add(messageId);
        this.saveSentMessages();
      }
      
      console.log('✅ Session summary sent to Slack');
      if (this.isDevelopmentMode()) {
        console.log('🔧 Development mode: Message sent to', 
          process.env.SLACK_WEBHOOK_URL_DEV ? 'development' : 'production', 'channel');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send to Slack:', error.message);
      return false;
    }
  }

  generateMessageId(sessionData) {
    // Create a unique ID based on session ID and summary content hash
    const crypto = require('crypto');
    const content = sessionData.sessionId + (sessionData.fullSummaryContent || '');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  formatFullSessionSummary(sessionData) {
    const {
      sessionId,
      sessionName,
      duration,
      platform,
      sessionFolder,
      fullSummaryContent
    } = sessionData;

    // Use the session folder name directly for the title
    const folderName = path.basename(sessionFolder);
    const displayName = folderName;

    // Convert markdown to Slack-compatible format
    const slackFormattedContent = this.convertMarkdownToSlack(fullSummaryContent || 'No session summary available');

    const blocks = [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": `🔧 Support Session Completed: ${displayName}`
        }
      },
      {
        "type": "section",
        "fields": [
          {
            "type": "mrkdwn",
            "text": `*Session ID:*\n\`${sessionId}\``
          },
          {
            "type": "mrkdwn",
            "text": `*Duration:*\n${duration || 'Unknown'}`
          },
          {
            "type": "mrkdwn",
            "text": `*Platform:*\n${platform || 'staging'}`
          },
          {
            "type": "mrkdwn",
            "text": `*Status:*\n✅ Closed`
          }
        ]
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*📁 Session Documentation:*\n\`${sessionFolder}\``
        }
      },
      {
        "type": "divider"
      }
    ];

    // Split content into chunks to respect Slack's 3000 character limit per block
    const contentChunks = this.splitContentIntoChunks(slackFormattedContent, 2800);
    
    contentChunks.forEach((chunk, index) => {
      blocks.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": chunk
        }
      });
    });

    return {
      blocks: blocks,
      username: "Support Session Bot",
      icon_emoji: ":gear:"
    };
  }

  convertMarkdownToSlack(markdown) {
    // Convert markdown to Slack-compatible formatting
    let slackText = markdown
      // Convert headers
      .replace(/^# (.*$)/gm, '*$1*')
      .replace(/^## (.*$)/gm, '*$1*')
      .replace(/^### (.*$)/gm, '*$1*')
      .replace(/^#### (.*$)/gm, '*$1*')
      // Convert bold
      .replace(/\*\*(.*?)\*\*/g, '*$1*')
      // Convert code blocks to Slack format
      .replace(/```[\s\S]*?```/g, (match) => {
        return '```' + match.slice(3, -3) + '```';
      })
      // Convert inline code
      .replace(/`([^`]+)`/g, '`$1`')
      // Convert bullet points
      .replace(/^- (.*$)/gm, '• $1')
      .replace(/^\* (.*$)/gm, '• $1')
      // Convert numbered lists
      .replace(/^\d+\. (.*$)/gm, '• $1')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Clean up excessive whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return slackText;
  }

  splitContentIntoChunks(content, maxChunkSize) {
    if (content.length <= maxChunkSize) {
      return [content];
    }

    const chunks = [];
    let currentChunk = '';
    const lines = content.split('\n');

    for (const line of lines) {
      // If adding this line would exceed the limit, start a new chunk
      if (currentChunk.length + line.length + 1 > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = line;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  formatSessionMessage(sessionData) {
    const {
      sessionId,
      sessionName,
      duration,
      platform,
      objective,
      rootCause,
      keyActions,
      nextSteps,
      sessionFolder
    } = sessionData;

    // Extract session name from ID for cleaner display
    const displayName = sessionName || sessionId.replace(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_/, '');

    const blocks = [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": `🔧 Support Session Completed: ${displayName}`
        }
      },
      {
        "type": "section",
        "fields": [
          {
            "type": "mrkdwn",
            "text": `*Session ID:*\n\`${sessionId}\``
          },
          {
            "type": "mrkdwn",
            "text": `*Duration:*\n${duration || 'Unknown'}`
          },
          {
            "type": "mrkdwn",
            "text": `*Platform:*\n${platform || 'staging'}`
          },
          {
            "type": "mrkdwn",
            "text": `*Status:*\n✅ Closed`
          }
        ]
      }
    ];

    // Add objective if available
    if (objective && objective !== 'Not specified') {
      blocks.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*🎯 Objective:*\n${this.truncateText(objective, 500)}`
        }
      });
    }

    // Add root cause if identified
    if (rootCause) {
      blocks.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*🔍 Root Cause:*\n${this.truncateText(rootCause, 500)}`
        }
      });
    }

    // Add key actions if available
    if (keyActions && keyActions !== 'No actions documented') {
      blocks.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*⚙️ Key Actions:*\n${this.truncateText(keyActions, 500)}`
        }
      });
    }

    // Add next steps if available
    if (nextSteps && nextSteps !== 'No next steps defined') {
      blocks.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*🚀 Next Steps:*\n${this.truncateText(nextSteps, 500)}`
        }
      });
    }

    // Add session folder link
    blocks.push({
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `*📁 Session Documentation:*\n\`${sessionFolder}\``
      }
    });

    return {
      blocks: blocks,
      username: "Support Session Bot",
      icon_emoji: ":gear:"
    };
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  sendToSlack(message) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.webhookUrl);
      const postData = JSON.stringify(message);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`Slack API returned ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  static extractSessionData(sessionFolder, metadata, notesContent) {
    const sessionId = path.basename(sessionFolder);
    
    // Try to read the full session-summary.md file
    const summaryFile = path.join(sessionFolder, 'session-summary.md');
    let fullSummaryContent = '';
    
    if (fs.existsSync(summaryFile)) {
      try {
        fullSummaryContent = fs.readFileSync(summaryFile, 'utf8');
      } catch (error) {
        console.warn('⚠️  Failed to read session-summary.md:', error.message);
      }
    }

    // If no session summary exists, fall back to extracting from notes
    if (!fullSummaryContent && notesContent) {
      // Extract key information from notes as fallback
      const objectiveMatch = notesContent.match(/## Objective\s*\n(.*?)(?=\n##|\n$)/s);
      const objective = objectiveMatch ? objectiveMatch[1].trim() : 'Not specified';
      
      const actionsMatch = notesContent.match(/## Key Actions\s*\n(.*?)(?=\n##|\n$)/s);
      const keyActions = actionsMatch ? actionsMatch[1].trim() : 'No actions documented';
      
      const nextStepsMatch = notesContent.match(/## Next Steps\s*\n(.*?)(?=\n##|\n$)/s);
      const nextSteps = nextStepsMatch ? nextStepsMatch[1].trim() : 'No next steps defined';

      // Try to extract root cause from various sections
      let rootCause = null;
      const rootCausePatterns = [
        /(?:🎯|ROOT CAUSE|Root Cause).*?IDENTIFIED[:\s]*\n(.*?)(?=\n##|\n\*\*|\n$)/si,
        /(?:🔍|ACTUAL ROOT CAUSE|Actual Root Cause)[:\s]*\n(.*?)(?=\n##|\n\*\*|\n$)/si,
        /(?:PROBLEM|Problem)[:\s]*\n(.*?)(?=\n##|\n\*\*|\n$)/si
      ];

      for (const pattern of rootCausePatterns) {
        const match = notesContent.match(pattern);
        if (match && match[1].trim()) {
          rootCause = match[1].trim();
          break;
        }
      }

      // Create a basic summary from notes if no session-summary.md exists
      fullSummaryContent = `# Session Summary: ${metadata?.sessionName || 'Support Session'}

## Session Information
- **Session ID**: ${sessionId}
- **Duration**: ${metadata?.duration || 'Unknown'}
- **Platform**: ${metadata?.platform || 'staging'}
- **Status**: Closed

## Objective
${objective}

## Key Actions
${keyActions}

${rootCause ? `## Root Cause\n${rootCause}\n` : ''}

## Next Steps
${nextSteps}

## Session Files
- **Rules**: \`.cursorrules\` - Session-specific rules
- **Notes**: \`session-notes.md\` - Detailed session notes
- **Chat History**: \`chat-history.md\` - Conversation history
- **Metadata**: \`session-metadata.json\` - Session metadata

---
*Session folder: ${sessionFolder}*`;
    }

    return {
      sessionId,
      sessionName: metadata?.sessionName,
      duration: metadata?.duration,
      platform: metadata?.platform,
      sessionFolder,
      fullSummaryContent
    };
  }
}

module.exports = SlackNotifier;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node slack-notifier.js <session-folder>');
    console.log('Environment: Set SLACK_WEBHOOK_URL or create slack-config.json in slack-webhook workspace');
    process.exit(1);
  }

  const sessionFolder = args[0];
  const notifier = new SlackNotifier();

  if (!notifier.isEnabled()) {
    console.log('❌ Slack webhook not configured');
    console.log('💡 Set SLACK_WEBHOOK_URL environment variable or create slack-config.json');
    process.exit(1);
  }

  // Read session data
  const metadataFile = path.join(sessionFolder, 'session-metadata.json');
  const notesFile = path.join(sessionFolder, 'session-notes.md');

  let metadata = null;
  let notesContent = '';

  if (fs.existsSync(metadataFile)) {
    metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
  }

  if (fs.existsSync(notesFile)) {
    notesContent = fs.readFileSync(notesFile, 'utf8');
  }

  const sessionData = SlackNotifier.extractSessionData(sessionFolder, metadata, notesContent);
  
  notifier.sendSessionSummary(sessionData)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
