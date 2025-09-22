#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PLATFORM_DIR = path.resolve(__dirname, '..');
const SESSIONS_DIR = path.join(PLATFORM_DIR, 'session-logs');
const ACTIVE_SESSION_FILE = path.join(PLATFORM_DIR, '.active-session');

function getActiveSession() {
  if (!fs.existsSync(ACTIVE_SESSION_FILE)) {
    console.log('❌ No active session found');
    console.log('💡 Use npm run open-session <name> to start a new session');
    return null;
  }
  
  const sessionId = fs.readFileSync(ACTIVE_SESSION_FILE, 'utf8').trim();
  const sessionFolder = path.join(SESSIONS_DIR, sessionId);
  
  if (!fs.existsSync(sessionFolder)) {
    console.log(`❌ Active session folder not found: ${sessionFolder}`);
    console.log('💡 The session may have been deleted or moved');
    return null;
  }
  
  return { sessionId, sessionFolder };
}

function getSessionInfo(sessionFolder) {
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
  
  return { metadata, notesContent };
}

function checkSessionStatus() {
  console.log(`🔍 Checking session status for platform: staging`);
  console.log('');
  
  const activeSession = getActiveSession();
  
  if (!activeSession) {
    return;
  }
  
  const { sessionId, sessionFolder } = activeSession;
  const { metadata } = getSessionInfo(sessionFolder);
  
  console.log('✅ Status: Active session found');
  console.log('');
  console.log('📋 Session Details:');
  console.log(`   Session ID: ${sessionId}`);
  console.log(`   Session Name: ${metadata.sessionName || 'Support Session'}`);
  console.log(`   Platform: staging`);
  console.log(`   Started: ${metadata.startTime || 'Unknown'}`);
  
  if (metadata.startTime) {
    const startTime = new Date(metadata.startTime);
    const now = new Date();
    const durationMs = now - startTime;
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    const duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    console.log(`   Duration: ${duration}`);
  }
  
  console.log(`   Status: ${metadata.status || 'active'}`);
  console.log('');
  console.log('📁 Session Files:');
  console.log(`   Folder: ${sessionFolder}`);
  console.log('   ✅ .cursorrules - Session-specific rules');
  console.log('   ✅ session-notes.md - Manual notes and observations');
  console.log('   ✅ chat-history.md - Chat history for continuation');
  console.log('   ✅ session-chat-prompt.md - New chat context prompt');
  console.log('   ✅ session-metadata.json - Session metadata');
  console.log('');
  console.log('💡 Available Commands:');
  console.log('   npm run close-session - Close current session');
  console.log('   npm run list-sessions - List all sessions');
  console.log(`   cd ${sessionFolder} - Navigate to session folder`);
}

checkSessionStatus();
