#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PLATFORM_DIR = path.resolve(__dirname, '..');
const SESSIONS_DIR = path.join(PLATFORM_DIR, 'session-logs');
const ACTIVE_SESSION_FILE = path.join(PLATFORM_DIR, '.active-session');

function getActiveSession() {
  if (!fs.existsSync(ACTIVE_SESSION_FILE)) {
    console.error('❌ No active session found');
    console.error('💡 Use npm run open-session <name> to start a new session');
    process.exit(1);
  }
  
  const sessionId = fs.readFileSync(ACTIVE_SESSION_FILE, 'utf8').trim();
  const sessionFolder = path.join(SESSIONS_DIR, sessionId);
  
  if (!fs.existsSync(sessionFolder)) {
    console.error(`❌ Active session folder not found: ${sessionFolder}`);
    console.error('💡 The session may have been deleted or moved');
    process.exit(1);
  }
  
  return { sessionId, sessionFolder };
}

function updateSessionMetadata(sessionFolder) {
  const metadataFile = path.join(sessionFolder, 'session-metadata.json');
  
  if (fs.existsSync(metadataFile)) {
    const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
    metadata.endTime = new Date().toISOString();
    metadata.status = 'closed';
    
    // Calculate duration
    const startTime = new Date(metadata.startTime);
    const endTime = new Date(metadata.endTime);
    const durationMs = endTime - startTime;
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    metadata.duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    console.log(`⚙️  Updated session metadata`);
    
    return metadata;
  }
  
  return null;
}

function generateSessionSummary(sessionFolder, metadata) {
  const sessionId = path.basename(sessionFolder);
  const summaryFile = path.join(sessionFolder, 'session-summary.md');
  
  // Read session notes if available
  const notesFile = path.join(sessionFolder, 'session-notes.md');
  let notesContent = '';
  if (fs.existsSync(notesFile)) {
    notesContent = fs.readFileSync(notesFile, 'utf8');
  }
  
  // Extract key information from notes
  const objectiveMatch = notesContent.match(/## Objective\s*\n(.*?)(?=\n##|\n$)/s);
  const objective = objectiveMatch ? objectiveMatch[1].trim() : 'Not specified';
  
  const actionsMatch = notesContent.match(/## Key Actions\s*\n(.*?)(?=\n##|\n$)/s);
  const actions = actionsMatch ? actionsMatch[1].trim() : 'No actions documented';
  
  const notesMatch = notesContent.match(/## Notes\s*\n(.*?)(?=\n##|\n$)/s);
  const notes = notesMatch ? notesMatch[1].trim() : 'No notes available';
  
  const commandsMatch = notesContent.match(/## Commands Executed\s*\n(.*?)(?=\n##|\n$)/s);
  const commands = commandsMatch ? commandsMatch[1].trim() : 'No commands documented';
  
  const filesMatch = notesContent.match(/## Files Modified\s*\n(.*?)(?=\n##|\n$)/s);
  const files = filesMatch ? filesMatch[1].trim() : 'No files documented';
  
  const nextStepsMatch = notesContent.match(/## Next Steps\s*\n(.*?)(?=\n##|\n$)/s);
  const nextSteps = nextStepsMatch ? nextStepsMatch[1].trim() : 'No next steps defined';
  
  const summaryContent = `# Support Session Summary: ${metadata?.sessionName || 'Support Session'}

## Session Information
- **Session ID**: ${sessionId}
- **Start Time**: ${metadata?.startTime || 'Unknown'}
- **End Time**: ${metadata?.endTime || new Date().toISOString()}
- **Duration**: ${metadata?.duration || 'Unknown'}
- **Platform**: ${metadata?.platform || 'staging'}
- **Status**: ${metadata?.status || 'closed'}

## Session Summary
${objective}

## Process and Challenges

### Key Actions Taken
${actions}

### Commands Executed
${commands}

### Files Modified
${files}

## Outcome

### Notes and Observations
${notes}

### Next Steps
${nextSteps}

## Session Files
- **Rules**: \`.cursorrules\` - Session-specific rules used during this session
- **Notes**: \`session-notes.md\` - Detailed session notes and observations
- **Chat History**: \`chat-history.md\` - Conversation history for session continuation
- **Metadata**: \`session-metadata.json\` - Session metadata and tracking information

## Key Learnings
<!-- Add important insights and lessons learned from this session -->

---
*This summary was automatically generated on ${new Date().toISOString()} by the close-session script.*
*Session folder: ${sessionFolder}*
`;

  fs.writeFileSync(summaryFile, summaryContent);
  console.log(`📄 Generated session summary: ${summaryFile}`);
}

function generateChatHistory(sessionFolder) {
  const chatHistoryFile = path.join(sessionFolder, 'chat-history.md');
  const sessionId = path.basename(sessionFolder);
  
  // Check if session chat prompt exists
  const chatPromptFile = path.join(sessionFolder, 'session-chat-prompt.md');
  const hasChatPrompt = fs.existsSync(chatPromptFile);
  
  const chatHistoryContent = `# Chat History: ${sessionId}

**Session Closed**: ${new Date().toISOString()}

## Session Chat Context
${hasChatPrompt ? `This session was started with a dedicated chat context. See \`session-chat-prompt.md\` for the initial context provided to the AI assistant.` : 'No dedicated chat context was created for this session.'}

## Conversation Log

### Session Start
*Session opened with npm run open-session*
${hasChatPrompt ? '*Dedicated chat context created in session-chat-prompt.md*' : ''}

### Session Activities
*This section should contain the actual conversation history from the dedicated chat*
*To preserve chat history for future sessions:*
*1. Copy the conversation from your AI assistant*
*2. Paste it in this section*
*3. This enables session continuation and knowledge transfer*

### Session End
*Session closed with npm run close-session*

## Chat Continuation Instructions

To continue this session later or transfer knowledge:

### Option 1: Resume Session Context
1. Review the \`session-summary.md\` for complete context
2. Check \`session-notes.md\` for detailed technical information
3. Use the \`session-chat-prompt.md\` to start a new chat with full context
4. Reference this chat history for conversation flow

### Option 2: New Session with Context
1. Open a new session: \`npm run open-session "continuation-of-${sessionId}"\`
2. Reference this session folder for background context
3. Copy relevant information to the new session

## Session Files Reference
- **\`session-chat-prompt.md\`**: ${hasChatPrompt ? 'Initial chat context for AI assistant' : 'Not created'}
- **\`session-summary.md\`**: Complete session summary and outcomes
- **\`session-notes.md\`**: Detailed technical notes and observations
- **\`.cursorrules\`**: Session-specific rules used during this session
- **\`session-metadata.json\`**: Session tracking and metadata

## Technical Details
- **Session Folder**: ${sessionFolder}
- **Platform**: staging
- **Session Duration**: See session-metadata.json
- **Session Rules**: Available in .cursorrules file
- **Session Notes**: Available in session-notes.md file

---
*Chat history template generated automatically on session close*
*Manual conversation history should be added to the "Session Activities" section*
`;

  fs.writeFileSync(chatHistoryFile, chatHistoryContent);
  console.log(`💬 Updated chat history template: ${chatHistoryFile}`);
}

function archiveSessionRules(sessionFolder) {
  const rulesFile = path.join(sessionFolder, '.cursorrules');
  
  if (fs.existsSync(rulesFile)) {
    // Add archive header to the rules file
    let rulesContent = fs.readFileSync(rulesFile, 'utf8');
    
    const archiveHeader = `# ARCHIVED SESSION RULES
# Session closed on: ${new Date().toISOString()}
# These rules were active during the session and are preserved for reference
# Session ID: ${path.basename(sessionFolder)}

`;
    
    // Only add header if not already present
    if (!rulesContent.includes('# ARCHIVED SESSION RULES')) {
      rulesContent = archiveHeader + rulesContent;
      fs.writeFileSync(rulesFile, rulesContent);
      console.log(`📚 Archived session rules: ${rulesFile}`);
    }
  }
}

function clearActiveSession() {
  if (fs.existsSync(ACTIVE_SESSION_FILE)) {
    fs.unlinkSync(ACTIVE_SESSION_FILE);
    console.log(`🧹 Cleared active session marker`);
  }
}

function closeSession() {
  console.log(`🔄 Closing active support session...`);
  
  const { sessionId, sessionFolder } = getActiveSession();
  
  console.log(`📁 Session: ${sessionId}`);
  console.log(`📂 Folder: ${sessionFolder}`);
  
  // Update metadata
  const metadata = updateSessionMetadata(sessionFolder);
  
  // Generate documentation
  generateSessionSummary(sessionFolder, metadata);
  generateChatHistory(sessionFolder);
  archiveSessionRules(sessionFolder);
  
  // Clear active session
  clearActiveSession();
  
  console.log('');
  console.log('✅ Session closed successfully!');
  console.log('');
  console.log('📋 Session Summary:');
  console.log(`   Session ID: ${sessionId}`);
  console.log(`   Duration: ${metadata?.duration || 'Unknown'}`);
  console.log(`   Status: Closed`);
  console.log('');
  console.log('📁 Generated Files:');
  console.log('   session-summary.md     - Complete session summary');
  console.log('   chat-history.md        - Chat history for continuation');
  console.log('   .cursorrules (archived) - Session rules preserved');
  console.log('   session-metadata.json  - Updated with close information');
  console.log('');
  console.log('💡 Session Documentation:');
  console.log(`   All files preserved in: ${sessionFolder}`);
  console.log('   Use these files to review or continue the session later');
  console.log('');
  console.log('🚀 Ready for next session:');
  console.log('   npm run open-session <name> - Start a new session');
}

closeSession();
