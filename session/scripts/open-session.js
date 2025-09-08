#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SESSION_NAME = process.argv[2];
const PLATFORM_DIR = path.resolve(__dirname, '..');
const SESSIONS_DIR = path.join(PLATFORM_DIR, 'session-logs');
const PLATFORM_CURSORRULES = path.join(PLATFORM_DIR, '.cursorrules');

function generateSessionId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}_${hour}-${minute}-${second}`;
}

function createSessionFolder(sessionId, sessionName) {
  // Create folder name with timestamp prefix and session name suffix
  const folderName = sessionName ? `${sessionId}_${sessionName}` : sessionId;
  const sessionFolder = path.join(SESSIONS_DIR, folderName);
  
  if (fs.existsSync(sessionFolder)) {
    console.error(`❌ Session folder already exists: ${sessionFolder}`);
    process.exit(1);
  }
  
  // Create session folder
  fs.mkdirSync(sessionFolder, { recursive: true });
  console.log(`📁 Created session folder: ${sessionFolder}`);
  
  return sessionFolder;
}

function copyPlatformRules(sessionFolder) {
  const sessionRulesFile = path.join(sessionFolder, '.cursorrules');
  
  if (fs.existsSync(PLATFORM_CURSORRULES)) {
    // Copy platform rules as starting point
    let rulesContent = fs.readFileSync(PLATFORM_CURSORRULES, 'utf8');
    
    // Add session-specific header
    const sessionHeader = `# Session-Specific Rules
# This file contains rules active during this support session
# Original platform rules copied and can be modified for this session context
# Session ID: ${path.basename(sessionFolder)}

`;
    
    rulesContent = sessionHeader + rulesContent;
    fs.writeFileSync(sessionRulesFile, rulesContent);
    console.log(`📄 Created session .cursorrules: ${sessionRulesFile}`);
  } else {
    console.warn(`⚠️  Platform .cursorrules not found, creating minimal session rules`);
    
    const minimalRules = `# Session-Specific Rules
# Session ID: ${path.basename(sessionFolder)}

## Session Context
This session is for: ${SESSION_NAME || 'Support session'}

## Active Rules
- Document all actions and decisions in this session
- Update session summary regularly
- Use session-specific configurations as needed

## Session Files
- \`.cursorrules\`: This file - session-specific rules
- \`session-summary.md\`: Session documentation (auto-generated on close)
- \`chat-history.md\`: Chat history for session continuation
- \`session-notes.md\`: Manual notes and observations
`;
    
    fs.writeFileSync(sessionRulesFile, minimalRules);
    console.log(`📄 Created minimal session .cursorrules: ${sessionRulesFile}`);
  }
}

function createSessionFiles(sessionFolder, sessionName) {
  const sessionId = path.basename(sessionFolder);
  
  // Create session notes file
  const notesFile = path.join(sessionFolder, 'session-notes.md');
  const notesContent = `# Session Notes: ${sessionName || 'Support Session'}

**Session ID**: ${sessionId}  
**Started**: ${new Date().toISOString()}  
**Platform**: staging

## Objective
${sessionName ? `Session focus: ${sessionName}` : 'Document the main objective of this session'}

## Key Actions
- [ ] Initial assessment
- [ ] Problem identification
- [ ] Solution implementation
- [ ] Verification and testing
- [ ] Documentation completion

## Notes
<!-- Add your observations, decisions, and important findings here -->

## Commands Executed
<!-- Track important commands and their results -->

## Files Modified
<!-- List files that were changed during this session -->

## Next Steps
<!-- What needs to be done next or in follow-up sessions -->
`;
  
  fs.writeFileSync(notesFile, notesContent);
  console.log(`📝 Created session notes: ${notesFile}`);
  
  // Create chat history placeholder
  const chatHistoryFile = path.join(sessionFolder, 'chat-history.md');
  const chatHistoryContent = `# Chat History: ${sessionName || 'Support Session'}

**Session ID**: ${sessionId}  
**Started**: ${new Date().toISOString()}

## Chat Log
<!-- This file will be populated by the close-session script -->
<!-- It contains the conversation history for session continuation -->

*Chat history will be automatically generated when the session is closed.*
`;
  
  fs.writeFileSync(chatHistoryFile, chatHistoryContent);
  console.log(`💬 Created chat history placeholder: ${chatHistoryFile}`);
  
  // Create session metadata
  const metadataFile = path.join(sessionFolder, 'session-metadata.json');
  const metadata = {
    sessionId: sessionId,
    sessionName: sessionName || 'Support Session',
    platform: 'staging',
    startTime: new Date().toISOString(),
    endTime: null,
    status: 'active',
    objective: sessionName || '',
    files: {
      rules: '.cursorrules',
      notes: 'session-notes.md',
      chatHistory: 'chat-history.md',
      summary: 'session-summary.md'
    },
    tags: [],
    participants: []
  };
  
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
  console.log(`⚙️  Created session metadata: ${metadataFile}`);
}

function updateActiveSession(sessionFolder) {
  const activeSessionFile = path.join(PLATFORM_DIR, '.active-session');
  const sessionId = path.basename(sessionFolder);
  
  fs.writeFileSync(activeSessionFile, sessionId);
  console.log(`🎯 Set active session: ${sessionId}`);
}

function createSessionChatPrompt(sessionFolder, sessionName) {
  const sessionId = path.basename(sessionFolder);
  const chatPromptFile = path.join(sessionFolder, 'session-chat-prompt.md');
  
  const chatPrompt = `# Session Chat Context

**Session ID**: ${sessionId}  
**Session Name**: ${sessionName || 'Support Session'}  
**Platform**: staging  
**Started**: ${new Date().toISOString()}

## Session Context for AI Assistant

This is a dedicated support session with the following context:

### Session Objective
${sessionName ? `Working on: ${sessionName}` : 'General support session'}

### Session Environment
- **Platform**: Staging environment (beamdevlive ecosystem)
- **Infrastructure**: Redis BDS, PostgreSQL, Apache2, PM2 microservices
- **Session Folder**: \`${sessionFolder}\`
- **Session Rules**: Available in \`.cursorrules\` file in this session folder

### Session Files
- **\`.cursorrules\`**: Session-specific rules (copied from platform, editable)
- **\`session-notes.md\`**: Manual documentation and observations
- **\`chat-history.md\`**: This conversation for continuation
- **\`session-metadata.json\`**: Session tracking data

### Instructions for AI Assistant
1. **Context Awareness**: This is session ${sessionId} focused on: ${sessionName || 'support work'}
2. **Documentation**: Help document all actions in session-notes.md
3. **Session Rules**: Follow the .cursorrules file in this session folder
4. **File Management**: All session work should reference this session folder
5. **Continuation**: This chat history will be saved for session continuation
6. **Slack Integration**: Session summaries will be sent to Slack when closed (if configured)

### Session Commands Available
- \`npm run close-session\` - Close this session and generate documentation (+ Slack notification)
- \`npm run session-status\` - Check current session status
- \`cd ../../ && npm run slack-test\` - Test Slack integration (slack-webhook workspace)
- Edit session files as needed for this specific support work

---
**Ready to begin session work. Please confirm you understand the session context.**
`;

  fs.writeFileSync(chatPromptFile, chatPrompt);
  console.log(`💬 Created session chat prompt: ${chatPromptFile}`);
  
  return chatPromptFile;
}

function displayChatInstructions(sessionFolder, sessionName) {
  const sessionId = path.basename(sessionFolder);
  
  console.log('');
  console.log('🗣️  NEW CHAT SETUP:');
  console.log('');
  console.log('📋 To start a new chat for this session:');
  console.log('   1. Open a new chat/conversation in your AI assistant');
  console.log('   2. Copy and paste the content from: session-chat-prompt.md');
  console.log('   3. This will provide the AI with full session context');
  console.log('');
  console.log('💡 Chat Context Benefits:');
  console.log('   • AI understands this specific session');
  console.log('   • Session-specific rules and environment');
  console.log('   • Proper documentation workflow');
  console.log('   • Continuation support for complex issues');
  console.log('   • Slack integration for team notifications');
  console.log('');
  console.log('📄 Session Chat Prompt File:');
  console.log(`   ${path.join(sessionFolder, 'session-chat-prompt.md')}`);
}

function openSession(sessionName) {
  console.log(`🚀 Opening new support session...`);
  
  // Ensure sessions directory exists
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    console.log(`📁 Created sessions directory: ${SESSIONS_DIR}`);
  }
  
  // Generate session ID and create folder
  const sessionId = generateSessionId();
  const sessionFolder = createSessionFolder(sessionId, sessionName);
  
  // Copy platform rules and create session files
  copyPlatformRules(sessionFolder);
  createSessionFiles(sessionFolder, sessionName);
  
  // Create session chat prompt for new chat
  createSessionChatPrompt(sessionFolder, sessionName);
  
  updateActiveSession(sessionFolder);
  
  console.log('');
  console.log('🎉 Session opened successfully!');
  console.log('');
  console.log('📋 Session Details:');
  console.log(`   Session ID: ${path.basename(sessionFolder)}`);
  console.log(`   Folder: ${sessionFolder}`);
  console.log(`   Name: ${sessionName || 'Support Session'}`);
  console.log('');
  console.log('📁 Session Files Created:');
  console.log('   .cursorrules           - Session-specific rules (editable)');
  console.log('   session-notes.md       - Manual notes and observations');
  console.log('   chat-history.md        - Chat history (auto-populated on close)');
  console.log('   session-chat-prompt.md - New chat context prompt');
  console.log('   session-metadata.json  - Session metadata');
  
  // Display chat setup instructions
  displayChatInstructions(sessionFolder, sessionName);
  
  console.log('');
  console.log('💡 Next Steps:');
  console.log('   1. Start a new chat using session-chat-prompt.md');
  console.log('   2. Edit session-notes.md to document your work');
  console.log('   3. Modify .cursorrules if needed for this session');
  console.log('   4. Use npm run close-session when finished (auto-notifies Slack)');
  console.log('');
  console.log('🔧 Slack Integration:');
  console.log('   • Session summaries will be sent to Slack when closed');
  console.log('   • Configure SLACK_WEBHOOK_URL or slack-webhook/slack-config.json');
  console.log('   • Test with: cd ../../ && npm run slack-test');
  console.log('');
  console.log(`📂 Session folder: ${sessionFolder}`);
}

if (!SESSION_NAME) {
  console.error('❌ Usage: npm run open-session <session-name>');
  console.error('📋 Examples:');
  console.error('   npm run open-session "redis-performance-issue"');
  console.error('   npm run open-session "api-admin-core-errors"');
  console.error('   npm run open-session "slack-integration-setup"');
  process.exit(1);
}

openSession(SESSION_NAME);