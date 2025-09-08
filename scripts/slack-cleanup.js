#!/usr/bin/env node

/**
 * Slack message cleanup utility
 * Requires Slack Bot Token with chat:write permissions
 */

const https = require('https');

class SlackCleanup {
  constructor(token) {
    this.token = token;
    this.baseUrl = 'https://slack.com/api';
  }

  async getChannelHistory(channelId, limit = 100) {
    const url = `${this.baseUrl}/conversations.history`;
    const params = new URLSearchParams({
      channel: channelId,
      limit: limit.toString()
    });

    const result = await this.makeRequest('GET', `${url}?${params}`);
    
    // Handle common errors
    if (!result.ok) {
      if (result.error === 'not_in_channel') {
        throw new Error(`Bot is not added to channel ${channelId}. Please add the bot to the channel first.`);
      } else if (result.error === 'channel_not_found') {
        throw new Error(`Channel ${channelId} not found. Please check the channel ID.`);
      } else if (result.error === 'missing_scope') {
        throw new Error(`Missing required permissions. Bot needs 'channels:history' and 'groups:history' scopes.`);
      }
    }
    
    return result;
  }

  async deleteMessage(channelId, timestamp) {
    const url = `${this.baseUrl}/chat.delete`;
    const data = {
      channel: channelId,
      ts: timestamp
    };

    return this.makeRequest('POST', url, data);
  }

  async joinChannel(channelId) {
    const url = `${this.baseUrl}/conversations.join`;
    const data = {
      channel: channelId
    };

    return this.makeRequest('POST', url, data);
  }

  async getChannelInfo(channelId) {
    const url = `${this.baseUrl}/conversations.info`;
    const params = new URLSearchParams({
      channel: channelId
    });

    return this.makeRequest('GET', `${url}?${params}`);
  }

  async findDuplicateMessages(channelId) {
    console.log('🔍 Searching for duplicate messages...');
    
    const history = await this.getChannelHistory(channelId, 200);
    if (!history.ok) {
      throw new Error(`Failed to get channel history: ${history.error}`);
    }

    const messages = history.messages.filter(msg => 
      msg.username === 'Support Session Bot' || 
      (msg.bot_id && msg.text && msg.text.includes('Support Session Completed'))
    );

    console.log(`📊 Found ${messages.length} bot messages`);

    // Group messages by session ID
    const sessionGroups = {};
    messages.forEach(msg => {
      const sessionMatch = msg.text.match(/Session ID.*?(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_[\w-]+)/);
      if (sessionMatch) {
        const sessionId = sessionMatch[1];
        if (!sessionGroups[sessionId]) {
          sessionGroups[sessionId] = [];
        }
        sessionGroups[sessionId].push(msg);
      }
    });

    // Find duplicates
    const duplicates = [];
    Object.entries(sessionGroups).forEach(([sessionId, msgs]) => {
      if (msgs.length > 1) {
        console.log(`🔄 Found ${msgs.length} messages for session: ${sessionId}`);
        // Keep the first message, mark others as duplicates
        duplicates.push(...msgs.slice(1));
      }
    });

    console.log(`❌ Found ${duplicates.length} duplicate messages`);
    return duplicates;
  }

  async cleanupDuplicates(channelId, dryRun = true) {
    try {
      // First, try to get channel info to verify it exists
      console.log('🔍 Checking channel access...');
      const channelInfo = await this.getChannelInfo(channelId);
      
      if (channelInfo.ok) {
        console.log(`📋 Channel: #${channelInfo.channel.name} (${channelInfo.channel.id})`);
      }
    } catch (error) {
      console.error('❌ Channel access error:', error.message);
      return;
    }

    let duplicates;
    try {
      duplicates = await this.findDuplicateMessages(channelId);
    } catch (error) {
      if (error.message.includes('not added to channel')) {
        console.log('🤖 Attempting to join channel...');
        try {
          const joinResult = await this.joinChannel(channelId);
          if (joinResult.ok) {
            console.log('✅ Successfully joined channel');
            duplicates = await this.findDuplicateMessages(channelId);
          } else {
            console.error('❌ Failed to join channel:', joinResult.error);
            console.log('💡 Please manually add the bot to the channel:');
            console.log('   1. Go to the Slack channel');
            console.log('   2. Type: /invite @YourBotName');
            console.log('   3. Or go to channel settings → Integrations → Add apps');
            return;
          }
        } catch (joinError) {
          console.error('❌ Cannot join channel:', joinError.message);
          console.log('💡 Please manually add the bot to the channel:');
          console.log('   1. Go to the Slack channel');
          console.log('   2. Type: /invite @YourBotName');
          console.log('   3. Or go to channel settings → Integrations → Add apps');
          return;
        }
      } else {
        throw error;
      }
    }
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate messages found');
      return;
    }

    if (dryRun) {
      console.log('🧪 DRY RUN MODE - Messages that would be deleted:');
      duplicates.forEach((msg, index) => {
        const sessionMatch = msg.text.match(/Session ID.*?(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_[\w-]+)/);
        const sessionId = sessionMatch ? sessionMatch[1] : 'unknown';
        console.log(`${index + 1}. Session: ${sessionId}, Timestamp: ${msg.ts}`);
      });
      console.log('\n💡 Run with --delete flag to actually delete messages');
      return;
    }

    console.log(`🗑️  Deleting ${duplicates.length} duplicate messages...`);
    
    for (let i = 0; i < duplicates.length; i++) {
      const msg = duplicates[i];
      try {
        await this.deleteMessage(channelId, msg.ts);
        console.log(`✅ Deleted message ${i + 1}/${duplicates.length}`);
        
        // Rate limiting - wait 1 second between deletions
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to delete message ${i + 1}: ${error.message}`);
      }
    }

    console.log('🎉 Cleanup completed');
  }

  makeRequest(method, url, data = null) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve(parsed);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const token = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID || args[0];
  const shouldDelete = args.includes('--delete');

  if (!token) {
    console.error('❌ SLACK_BOT_TOKEN environment variable required');
    console.error('💡 Get a bot token from https://api.slack.com/apps');
    process.exit(1);
  }

  if (!channelId) {
    console.error('❌ Channel ID required');
    console.error('💡 Usage: SLACK_BOT_TOKEN=xxx node slack-cleanup.js CHANNEL_ID [--delete]');
    console.error('💡 Or set SLACK_CHANNEL_ID environment variable');
    process.exit(1);
  }

  const cleanup = new SlackCleanup(token);
  
  cleanup.cleanupDuplicates(channelId, !shouldDelete)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Cleanup failed:', error.message);
      process.exit(1);
    });
}

module.exports = SlackCleanup;
