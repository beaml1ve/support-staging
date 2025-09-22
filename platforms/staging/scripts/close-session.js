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
  }
}

function generateSessionSummary(sessionFolder) {
  const sessionId = path.basename(sessionFolder);
  const metadataFile = path.join(sessionFolder, 'session-metadata.json');
  const notesFile = path.join(sessionFolder, 'session-notes.md');
  
  let metadata = {};
  if (fs.existsSync(metadataFile)) {
    metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
  }
  
  let notesContent = '';
  if (fs.existsSync(notesFile)) {
    notesContent = fs.readFileSync(notesFile, 'utf8');
  }
  
  const summaryFile = path.join(sessionFolder, 'session-summary.md');
  const summaryContent = `# Session Summary: ${metadata.sessionName || 'Support Session'}

**Session ID**: ${sessionId}  
**Platform**: staging  
**Started**: ${metadata.startTime || 'Unknown'}  
**Ended**: ${metadata.endTime || new Date().toISOString()}  
**Duration**: ${metadata.duration || 'Unknown'}

## Session Objective
${metadata.objective || 'General support session'}

## Key Achievements
<!-- Auto-generated from session notes -->

## Files Created/Modified
<!-- Auto-generated from session notes -->

## Investigation Timeline
<!-- Auto-generated from session notes -->

## Technical Details
<!-- Auto-generated from session notes -->

## Next Steps
<!-- Auto-generated from session notes -->

---

## Complete Session Notes
\`\`\`
${notesContent}
\`\`\`

---
*This summary was automatically generated when the session was closed.*
`;

  fs.writeFileSync(summaryFile, summaryContent);
  console.log(`📄 Generated session summary: ${summaryFile}`);
  
  return summaryFile;
}

function clearActiveSession() {
  if (fs.existsSync(ACTIVE_SESSION_FILE)) {
    fs.unlinkSync(ACTIVE_SESSION_FILE);
    console.log(`🎯 Cleared active session`);
  }
}

function closeSession() {
  console.log(`🔒 Closing support session...`);
  
  const { sessionId, sessionFolder } = getActiveSession();
  
  console.log(`📋 Session Details:`);
  console.log(`   Session ID: ${sessionId}`);
  console.log(`   Folder: ${sessionFolder}`);
  
  // Update metadata
  updateSessionMetadata(sessionFolder);
  
  // Generate summary
  generateSessionSummary(sessionFolder);
  
  // Clear active session
  clearActiveSession();
  
  console.log('');
  console.log('✅ Session closed successfully!');
  console.log('');
  console.log('📁 Session Files:');
  console.log(`   📂 Session folder: ${sessionFolder}`);
  console.log('   📄 session-summary.md - Complete session documentation');
  console.log('   📝 session-notes.md - Manual notes and observations');
  console.log('   💬 chat-history.md - Chat history for continuation');
  console.log('   ⚙️  session-metadata.json - Session tracking data');
  console.log('   📋 .cursorrules - Session-specific rules');
  console.log('');
  console.log('💡 Session Continuation:');
  console.log('   • Use the chat-history.md file to continue this session in a new chat');
  console.log('   • Copy the session-chat-prompt.md content for new chat context');
  console.log('   • All session files are preserved for future reference');
  console.log('');
  console.log('🔧 Slack Integration:');
  console.log('   • Session summaries can be sent to Slack (if configured)');
  console.log('   • Test with: cd ../../ && npm run slack-test');
  console.log('   • Configure SLACK_WEBHOOK_URL or slack-webhook/slack-config.json');
}

closeSession();
