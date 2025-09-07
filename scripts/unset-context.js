#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(ROOT_DIR, '.cursor-backup');
const CONTEXT_MARKER = path.join(ROOT_DIR, '.cursor-active-context');
const ORIGINAL_CURSORRULES = path.join(ROOT_DIR, '.cursorrules');
const ORIGINAL_MCP_SETTINGS = path.join(ROOT_DIR, '.cursor', 'mcp_settings.json');

function unsetContext() {
  // Check if context is set
  if (!fs.existsSync(CONTEXT_MARKER)) {
    console.log('ℹ️  No context currently set');
    return;
  }
  
  const activeContext = fs.readFileSync(CONTEXT_MARKER, 'utf8').trim();
  console.log(`🔄 Unsetting context: ${activeContext}`);
  
  // Remove current symlinks
  if (fs.lstatSync(ORIGINAL_CURSORRULES).isSymbolicLink()) {
    fs.unlinkSync(ORIGINAL_CURSORRULES);
    console.log('🗑️  Removed .cursorrules symlink');
  }
  
  if (fs.existsSync(ORIGINAL_MCP_SETTINGS) && fs.lstatSync(ORIGINAL_MCP_SETTINGS).isSymbolicLink()) {
    fs.unlinkSync(ORIGINAL_MCP_SETTINGS);
    console.log('🗑️  Removed MCP settings symlink');
  }
  
  // Restore original files from backup
  const backupCursorRules = path.join(BACKUP_DIR, '.cursorrules.original');
  const backupMcpSettings = path.join(BACKUP_DIR, 'mcp_settings.json.original');
  
  if (fs.existsSync(backupCursorRules)) {
    fs.copyFileSync(backupCursorRules, ORIGINAL_CURSORRULES);
    console.log('✅ Restored original .cursorrules');
  }
  
  if (fs.existsSync(backupMcpSettings)) {
    fs.copyFileSync(backupMcpSettings, ORIGINAL_MCP_SETTINGS);
    console.log('✅ Restored original MCP settings');
  }
  
  // Clean up
  fs.unlinkSync(CONTEXT_MARKER);
  
  // Optionally clean up backup directory
  if (fs.existsSync(BACKUP_DIR)) {
    fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
    console.log('🧹 Cleaned up backup files');
  }
  
  console.log(`🎯 Context '${activeContext}' unset successfully!`);
  console.log('📁 Restored monorepo configuration');
}

function showStatus() {
  if (fs.existsSync(CONTEXT_MARKER)) {
    const activeContext = fs.readFileSync(CONTEXT_MARKER, 'utf8').trim();
    console.log(`🎯 Active context: ${activeContext}`);
    
    // Show current symlink targets
    if (fs.existsSync(ORIGINAL_CURSORRULES) && fs.lstatSync(ORIGINAL_CURSORRULES).isSymbolicLink()) {
      const target = fs.readlinkSync(ORIGINAL_CURSORRULES);
      console.log(`📄 .cursorrules -> ${target}`);
    }
    
    if (fs.existsSync(ORIGINAL_MCP_SETTINGS) && fs.lstatSync(ORIGINAL_MCP_SETTINGS).isSymbolicLink()) {
      const target = fs.readlinkSync(ORIGINAL_MCP_SETTINGS);
      console.log(`⚙️  MCP settings -> ${target}`);
    }
  } else {
    console.log('ℹ️  No context currently set (using monorepo configuration)');
  }
}

const command = process.argv[2];

if (command === 'status') {
  showStatus();
} else {
  unsetContext();
}
