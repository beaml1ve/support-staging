#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PLATFORM_DIR = path.resolve(__dirname, '..');
const SESSIONS_DIR = path.join(PLATFORM_DIR, 'session-logs');
const ACTIVE_SESSION_FILE = path.join(PLATFORM_DIR, '.active-session');

function getActiveSessionId() {
  if (fs.existsSync(ACTIVE_SESSION_FILE)) {
    return fs.readFileSync(ACTIVE_SESSION_FILE, 'utf8').trim();
  }
  return null;
}

function getSessionInfo(sessionFolder) {
  const metadataFile = path.join(sessionFolder, 'session-metadata.json');
  
  if (fs.existsSync(metadataFile)) {
    return JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
  }
  
  return {
    sessionId: path.basename(sessionFolder),
    sessionName: 'Unknown Session',
    platform: 'staging',
    startTime: 'Unknown',
    status: 'unknown'
  };
}

function listSessions() {
  console.log(`📋 Listing all sessions for platform: staging`);
  console.log('');
  
  if (!fs.existsSync(SESSIONS_DIR)) {
    console.log('❌ No sessions directory found');
    console.log('💡 Use npm run open-session <name> to start a new session');
    return;
  }
  
  const sessionFolders = fs.readdirSync(SESSIONS_DIR)
    .filter(item => {
      const itemPath = path.join(SESSIONS_DIR, item);
      return fs.statSync(itemPath).isDirectory();
    })
    .sort((a, b) => {
      // Sort by creation time (newest first)
      const aPath = path.join(SESSIONS_DIR, a);
      const bPath = path.join(SESSIONS_DIR, b);
      return fs.statSync(bPath).birthtime - fs.statSync(aPath).birthtime;
    });
  
  if (sessionFolders.length === 0) {
    console.log('❌ No sessions found');
    console.log('💡 Use npm run open-session <name> to start a new session');
    return;
  }
  
  const activeSessionId = getActiveSessionId();
  
  console.log(`📊 Found ${sessionFolders.length} session(s):`);
  console.log('');
  
  sessionFolders.forEach((sessionFolder, index) => {
    const sessionPath = path.join(SESSIONS_DIR, sessionFolder);
    const sessionInfo = getSessionInfo(sessionPath);
    const isActive = sessionInfo.sessionId === activeSessionId;
    
    console.log(`${index + 1}. ${isActive ? '🟢' : '⚪'} ${sessionInfo.sessionName}`);
    console.log(`   Session ID: ${sessionInfo.sessionId}`);
    console.log(`   Started: ${sessionInfo.startTime}`);
    console.log(`   Status: ${sessionInfo.status}${isActive ? ' (ACTIVE)' : ''}`);
    console.log(`   Folder: ${sessionPath}`);
    console.log('');
  });
  
  if (activeSessionId) {
    console.log('💡 Active session commands:');
    console.log('   npm run session-status - Check active session details');
    console.log('   npm run close-session - Close active session');
  } else {
    console.log('💡 No active session. Use npm run open-session <name> to start a new session');
  }
}

listSessions();
