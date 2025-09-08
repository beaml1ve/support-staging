#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PLATFORM_NAME = process.argv[2] || 'staging'; // Default to staging if not specified
const REPO_ROOT = path.resolve(__dirname, '../..');
const PLATFORM_DIR = path.join(REPO_ROOT, 'platforms', PLATFORM_NAME);
const SESSIONS_DIR = path.join(PLATFORM_DIR, 'session-logs');
const ACTIVE_SESSION_FILE = path.join(PLATFORM_DIR, '.active-session');

function checkSessionStatus() {
  console.log(`🔍 Checking session status for platform: ${PLATFORM_NAME}`);
  console.log('');
  
  // Check if active session file exists
  if (!fs.existsSync(ACTIVE_SESSION_FILE)) {
    console.log('📋 Status: No active session');
    console.log('💡 Use npm run open-session <name> to start a new session');
    return;
  }
  
  // Read active session ID
  const sessionId = fs.readFileSync(ACTIVE_SESSION_FILE, 'utf8').trim();
  const sessionFolder = path.join(SESSIONS_DIR, sessionId);
  
  // Check if session folder exists
  if (!fs.existsSync(sessionFolder)) {
    console.log('⚠️  Status: Active session file exists but folder is missing');
    console.log(`❌ Missing folder: ${sessionFolder}`);
    console.log('🧹 Cleaning up orphaned active session file...');
    fs.unlinkSync(ACTIVE_SESSION_FILE);
    console.log('✅ Cleaned up. No active session.');
    return;
  }
  
  // Read session metadata
  const metadataFile = path.join(sessionFolder, 'session-metadata.json');
  let metadata = null;
  
  if (fs.existsSync(metadataFile)) {
    try {
      metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
    } catch (error) {
      console.log('⚠️  Warning: Could not read session metadata');
    }
  }
  
  // Calculate duration
  let duration = 'Unknown';
  if (metadata && metadata.startTime) {
    const startTime = new Date(metadata.startTime);
    const now = new Date();
    const durationMs = now - startTime;
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
  
  // Display status
  console.log('✅ Status: Active session found');
  console.log('');
  console.log('📋 Session Details:');
  console.log(`   Session ID: ${sessionId}`);
  console.log(`   Session Name: ${metadata?.sessionName || 'Unknown'}`);
  console.log(`   Platform: ${metadata?.platform || PLATFORM_NAME}`);
  console.log(`   Started: ${metadata?.startTime || 'Unknown'}`);
  console.log(`   Duration: ${duration}`);
  console.log(`   Status: ${metadata?.status || 'active'}`);
  console.log('');
  console.log('📁 Session Files:');
  console.log(`   Folder: ${sessionFolder}`);
  
  // Check which files exist
  const files = [
    { name: '.cursorrules', desc: 'Session-specific rules' },
    { name: 'session-notes.md', desc: 'Manual notes and observations' },
    { name: 'chat-history.md', desc: 'Chat history for continuation' },
    { name: 'session-chat-prompt.md', desc: 'New chat context prompt' },
    { name: 'session-metadata.json', desc: 'Session metadata' }
  ];
  
  files.forEach(file => {
    const filePath = path.join(sessionFolder, file.name);
    const exists = fs.existsSync(filePath);
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${file.name} - ${file.desc}`);
  });
  
  console.log('');
  console.log('💡 Available Commands:');
  console.log('   npm run close-session - Close current session');
  console.log('   npm run list-sessions - List all sessions');
  console.log(`   cd ${sessionFolder} - Navigate to session folder`);
}

checkSessionStatus();
