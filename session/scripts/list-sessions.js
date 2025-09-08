#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PLATFORM_NAME = process.argv[2] || 'staging'; // Default to staging if not specified
const REPO_ROOT = path.resolve(__dirname, '../..');
const PLATFORM_DIR = path.join(REPO_ROOT, 'platforms', PLATFORM_NAME);
const SESSIONS_DIR = path.join(PLATFORM_DIR, 'session-logs');
const ACTIVE_SESSION_FILE = path.join(PLATFORM_DIR, '.active-session');

function getActiveSessionId() {
  if (fs.existsSync(ACTIVE_SESSION_FILE)) {
    return fs.readFileSync(ACTIVE_SESSION_FILE, 'utf8').trim();
  }
  return null;
}

function formatDuration(startTime, endTime) {
  if (!startTime) return 'Unknown';
  
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const durationMs = end - start;
  const durationMinutes = Math.round(durationMs / (1000 * 60));
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function listSessions() {
  console.log(`📋 Listing sessions for platform: ${PLATFORM_NAME}`);
  console.log('');
  
  // Check if sessions directory exists
  if (!fs.existsSync(SESSIONS_DIR)) {
    console.log('📁 No sessions directory found');
    console.log(`💡 Sessions will be created in: ${SESSIONS_DIR}`);
    console.log('🚀 Use npm run open-session <name> to create your first session');
    return;
  }
  
  // Get all session folders
  const sessionFolders = fs.readdirSync(SESSIONS_DIR)
    .filter(item => {
      const itemPath = path.join(SESSIONS_DIR, item);
      return fs.statSync(itemPath).isDirectory();
    })
    .sort()
    .reverse(); // Most recent first
  
  if (sessionFolders.length === 0) {
    console.log('📁 No sessions found');
    console.log('🚀 Use npm run open-session <name> to create your first session');
    return;
  }
  
  const activeSessionId = getActiveSessionId();
  
  console.log(`📊 Found ${sessionFolders.length} session(s):`);
  console.log('');
  
  sessionFolders.forEach((sessionId, index) => {
    const sessionFolder = path.join(SESSIONS_DIR, sessionId);
    const metadataFile = path.join(sessionFolder, 'session-metadata.json');
    
    let metadata = null;
    if (fs.existsSync(metadataFile)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
      } catch (error) {
        // Ignore metadata read errors
      }
    }
    
    const isActive = sessionId === activeSessionId;
    const status = isActive ? '🟢 ACTIVE' : (metadata?.status === 'closed' ? '🔴 CLOSED' : '⚪ UNKNOWN');
    const duration = formatDuration(metadata?.startTime, metadata?.endTime);
    
    console.log(`${index + 1}. ${status} ${sessionId}`);
    console.log(`   Name: ${metadata?.sessionName || 'Unknown'}`);
    console.log(`   Started: ${metadata?.startTime ? new Date(metadata.startTime).toLocaleString() : 'Unknown'}`);
    console.log(`   Duration: ${duration}`);
    console.log(`   Platform: ${metadata?.platform || PLATFORM_NAME}`);
    console.log(`   Folder: ${sessionFolder}`);
    console.log('');
  });
  
  // Show summary
  const activeSessions = sessionFolders.filter(id => id === activeSessionId).length;
  const closedSessions = sessionFolders.filter(id => {
    const metadataFile = path.join(SESSIONS_DIR, id, 'session-metadata.json');
    if (fs.existsSync(metadataFile)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
        return metadata.status === 'closed';
      } catch (error) {
        return false;
      }
    }
    return false;
  }).length;
  
  console.log('📊 Summary:');
  console.log(`   Total Sessions: ${sessionFolders.length}`);
  console.log(`   Active: ${activeSessions}`);
  console.log(`   Closed: ${closedSessions}`);
  console.log(`   Other: ${sessionFolders.length - activeSessions - closedSessions}`);
  console.log('');
  
  if (activeSessions > 0) {
    console.log('💡 Commands:');
    console.log('   npm run session-status - Check active session details');
    console.log('   npm run close-session - Close active session');
  } else {
    console.log('💡 Commands:');
    console.log('   npm run open-session <name> - Start a new session');
  }
}

listSessions();
