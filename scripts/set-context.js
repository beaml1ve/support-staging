#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CONTEXT_ARG = process.argv[2];
const ROOT_DIR = path.resolve(__dirname, '..');

// Backup original files
const BACKUP_DIR = path.join(ROOT_DIR, '.cursor-backup');
const ORIGINAL_CURSORRULES = path.join(ROOT_DIR, '.cursorrules');
const ORIGINAL_MCP_SETTINGS = path.join(ROOT_DIR, '.cursor', 'mcp_settings.json');

function initializeRootConfigs() {
  // Ensure root .cursor directory exists
  const rootCursorDir = path.dirname(ORIGINAL_MCP_SETTINGS);
  if (!fs.existsSync(rootCursorDir)) {
    fs.mkdirSync(rootCursorDir, { recursive: true });
  }

  // Create backup directory for original configs (only once)
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    
    // Backup original files only if they exist and aren't already backed up
    if (fs.existsSync(ORIGINAL_CURSORRULES)) {
      fs.copyFileSync(ORIGINAL_CURSORRULES, path.join(BACKUP_DIR, '.cursorrules.original'));
    }
    
    if (fs.existsSync(ORIGINAL_MCP_SETTINGS)) {
      fs.copyFileSync(ORIGINAL_MCP_SETTINGS, path.join(BACKUP_DIR, 'mcp_settings.json.original'));
    }
  }

  // Always restore root configs first (remove any existing symlinks)
  if (fs.existsSync(ORIGINAL_CURSORRULES)) {
    if (fs.lstatSync(ORIGINAL_CURSORRULES).isSymbolicLink()) {
      fs.unlinkSync(ORIGINAL_CURSORRULES);
    }
  }
  
  if (fs.existsSync(ORIGINAL_MCP_SETTINGS)) {
    if (fs.lstatSync(ORIGINAL_MCP_SETTINGS).isSymbolicLink()) {
      fs.unlinkSync(ORIGINAL_MCP_SETTINGS);
    }
  }

  // Restore original root configs from backup
  const backupCursorRules = path.join(BACKUP_DIR, '.cursorrules.original');
  const backupMcpSettings = path.join(BACKUP_DIR, 'mcp_settings.json.original');
  
  if (fs.existsSync(backupCursorRules)) {
    fs.copyFileSync(backupCursorRules, ORIGINAL_CURSORRULES);
  }
  
  if (fs.existsSync(backupMcpSettings)) {
    fs.copyFileSync(backupMcpSettings, ORIGINAL_MCP_SETTINGS);
  }
}

function setContext(context) {
  const contextPath = path.join(ROOT_DIR, 'platforms', context);
  
  if (!fs.existsSync(contextPath)) {
    console.error(`❌ Context '${context}' not found at ${contextPath}`);
    process.exit(1);
  }
  
  const contextCursorRules = path.join(contextPath, '.cursorrules');
  const contextMcpSettings = path.join(contextPath, '.cursor', 'mcp_settings.json');
  
  console.log(`🔄 Setting context: ${context}`);
  
  // Initialize root configs first (backup originals and restore clean state)
  console.log(`🔧 Initializing root configuration...`);
  initializeRootConfigs();
  
  // Link context .cursorrules to root
  if (fs.existsSync(contextCursorRules)) {
    if (fs.existsSync(ORIGINAL_CURSORRULES)) {
      fs.unlinkSync(ORIGINAL_CURSORRULES);
    }
    fs.symlinkSync(path.relative(ROOT_DIR, contextCursorRules), ORIGINAL_CURSORRULES);
    console.log(`✅ Linked .cursorrules from ${context}`);
  } else {
    console.warn(`⚠️  No .cursorrules found in ${context}`);
  }
  
  // Link context MCP settings to root
  if (fs.existsSync(contextMcpSettings)) {
    if (fs.existsSync(ORIGINAL_MCP_SETTINGS)) {
      fs.unlinkSync(ORIGINAL_MCP_SETTINGS);
    }
    fs.symlinkSync(path.relative(path.dirname(ORIGINAL_MCP_SETTINGS), contextMcpSettings), ORIGINAL_MCP_SETTINGS);
    console.log(`✅ Linked MCP settings from ${context}`);
  } else {
    console.warn(`⚠️  No MCP settings found in ${context}`);
  }
  
  // Create context marker
  const contextMarker = path.join(ROOT_DIR, '.cursor-active-context');
  fs.writeFileSync(contextMarker, context);
  
  console.log(`🎯 Context '${context}' set successfully!`);
  console.log(`📁 Working directory: ${contextPath}`);
  console.log(`💡 Run 'source scripts/set-context.sh' (no args) to restore monorepo configuration`);
}

if (!CONTEXT_ARG) {
  console.error('❌ Usage: npm run set-context <context-name>');
  console.error('📋 Available contexts:');
  
  const platformsDir = path.join(ROOT_DIR, 'platforms');
  if (fs.existsSync(platformsDir)) {
    const contexts = fs.readdirSync(platformsDir).filter(dir => 
      fs.statSync(path.join(platformsDir, dir)).isDirectory()
    );
    contexts.forEach(ctx => console.error(`   - ${ctx}`));
  }
  process.exit(1);
}

if (CONTEXT_ARG === '--restore-root') {
  console.log('🔧 Restoring monorepo root configuration...');
  initializeRootConfigs();
  
  // Remove context marker
  const contextMarker = path.join(ROOT_DIR, '.cursor-active-context');
  if (fs.existsSync(contextMarker)) {
    fs.unlinkSync(contextMarker);
  }
  
  console.log('✅ Monorepo configuration restored');
} else {
  setContext(CONTEXT_ARG);
}
