#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const COMMAND = process.argv[2];
const TARGET = process.argv[3];

const PROTECTION_DIR = path.join(ROOT_DIR, '.rules-protection');
const ROOT_CURSORRULES = path.join(ROOT_DIR, '.cursorrules');

function ensureProtectionDir() {
  if (!fs.existsSync(PROTECTION_DIR)) {
    fs.mkdirSync(PROTECTION_DIR, { recursive: true });
  }
}

function getProtectionFile(target) {
  if (target === 'root') {
    return path.join(PROTECTION_DIR, 'root.protected');
  } else {
    return path.join(PROTECTION_DIR, `${target}.protected`);
  }
}

function getRulesFile(target) {
  if (target === 'root') {
    return ROOT_CURSORRULES;
  } else {
    return path.join(ROOT_DIR, 'platforms', target, '.cursorrules');
  }
}

function protectRules(target) {
  const rulesFile = getRulesFile(target);
  const protectionFile = getProtectionFile(target);
  
  if (!fs.existsSync(rulesFile)) {
    console.error(`❌ Rules file not found: ${rulesFile}`);
    process.exit(1);
  }
  
  if (fs.existsSync(protectionFile)) {
    console.log(`ℹ️  ${target} rules are already protected`);
    return;
  }
  
  // Create protection marker with metadata
  const protectionData = {
    target: target,
    rulesFile: rulesFile,
    protectedAt: new Date().toISOString(),
    originalPermissions: fs.statSync(rulesFile).mode,
    checksum: generateChecksum(rulesFile)
  };
  
  fs.writeFileSync(protectionFile, JSON.stringify(protectionData, null, 2));
  
  // Make rules file read-only
  fs.chmodSync(rulesFile, 0o444); // Read-only for all
  
  console.log(`🔒 Protected ${target} rules: ${rulesFile}`);
  console.log(`📄 Protection marker: ${protectionFile}`);
}

function unprotectRules(target) {
  const rulesFile = getRulesFile(target);
  const protectionFile = getProtectionFile(target);
  
  if (!fs.existsSync(protectionFile)) {
    console.log(`ℹ️  ${target} rules are not protected`);
    return;
  }
  
  // Read protection data
  const protectionData = JSON.parse(fs.readFileSync(protectionFile, 'utf8'));
  
  // Verify file integrity
  const currentChecksum = generateChecksum(rulesFile);
  if (currentChecksum !== protectionData.checksum) {
    console.warn(`⚠️  Warning: ${target} rules file has been modified while protected`);
    console.warn(`   Original checksum: ${protectionData.checksum}`);
    console.warn(`   Current checksum:  ${currentChecksum}`);
  }
  
  // Restore original permissions
  fs.chmodSync(rulesFile, protectionData.originalPermissions);
  
  // Remove protection marker
  fs.unlinkSync(protectionFile);
  
  console.log(`🔓 Unprotected ${target} rules: ${rulesFile}`);
  console.log(`✅ Restored original permissions`);
}

function showStatus() {
  ensureProtectionDir();
  
  console.log('🔐 Rules Protection Status:');
  console.log('');
  
  // Check root protection
  const rootProtectionFile = getProtectionFile('root');
  const rootProtected = fs.existsSync(rootProtectionFile);
  
  console.log(`📄 Root Rules (.cursorrules):`);
  console.log(`   Status: ${rootProtected ? '🔒 PROTECTED' : '🔓 Unprotected'}`);
  console.log(`   File: ${ROOT_CURSORRULES}`);
  
  if (rootProtected) {
    const rootData = JSON.parse(fs.readFileSync(rootProtectionFile, 'utf8'));
    console.log(`   Protected since: ${rootData.protectedAt}`);
  }
  
  console.log('');
  
  // Check platform protections
  const platformsDir = path.join(ROOT_DIR, 'platforms');
  if (fs.existsSync(platformsDir)) {
    const platforms = fs.readdirSync(platformsDir).filter(dir => 
      fs.statSync(path.join(platformsDir, dir)).isDirectory()
    );
    
    console.log('🏗️  Platform Rules:');
    
    platforms.forEach(platform => {
      const platformProtectionFile = getProtectionFile(platform);
      const platformProtected = fs.existsSync(platformProtectionFile);
      const platformRulesFile = getRulesFile(platform);
      
      console.log(`   ${platform}:`);
      console.log(`     Status: ${platformProtected ? '🔒 PROTECTED' : '🔓 Unprotected'}`);
      console.log(`     File: ${platformRulesFile}`);
      
      if (platformProtected) {
        const platformData = JSON.parse(fs.readFileSync(platformProtectionFile, 'utf8'));
        console.log(`     Protected since: ${platformData.protectedAt}`);
      }
    });
  }
  
  console.log('');
  console.log('💡 Commands:');
  console.log('   npm run protect-rules root           # Protect root rules');
  console.log('   npm run protect-rules <platform>     # Protect platform rules');
  console.log('   npm run unprotect-rules root         # Unprotect root rules');
  console.log('   npm run unprotect-rules <platform>   # Unprotect platform rules');
  console.log('   npm run rules-status                 # Show this status');
}

function generateChecksum(filePath) {
  const crypto = require('crypto');
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function protectAll() {
  console.log('🔒 Protecting all rules files...');
  
  // Protect root
  protectRules('root');
  
  // Protect all platforms
  const platformsDir = path.join(ROOT_DIR, 'platforms');
  if (fs.existsSync(platformsDir)) {
    const platforms = fs.readdirSync(platformsDir).filter(dir => 
      fs.statSync(path.join(platformsDir, dir)).isDirectory()
    );
    
    platforms.forEach(platform => {
      protectRules(platform);
    });
  }
  
  console.log('');
  console.log('✅ All rules files protected');
}

function unprotectAll() {
  console.log('🔓 Unprotecting all rules files...');
  
  // Unprotect root
  unprotectRules('root');
  
  // Unprotect all platforms
  const platformsDir = path.join(ROOT_DIR, 'platforms');
  if (fs.existsSync(platformsDir)) {
    const platforms = fs.readdirSync(platformsDir).filter(dir => 
      fs.statSync(path.join(platformsDir, dir)).isDirectory()
    );
    
    platforms.forEach(platform => {
      unprotectRules(platform);
    });
  }
  
  console.log('');
  console.log('✅ All rules files unprotected');
}

// Main command handling
ensureProtectionDir();

if (!COMMAND) {
  showStatus();
  process.exit(0);
}

switch (COMMAND.toLowerCase()) {
  case 'protect':
    if (!TARGET) {
      console.error('❌ Usage: npm run protect-rules <target>');
      console.error('📋 Targets: root, <platform-name>, all');
      process.exit(1);
    }
    
    if (TARGET === 'all') {
      protectAll();
    } else {
      protectRules(TARGET);
    }
    break;
    
  case 'unprotect':
    if (!TARGET) {
      console.error('❌ Usage: npm run unprotect-rules <target>');
      console.error('📋 Targets: root, <platform-name>, all');
      process.exit(1);
    }
    
    if (TARGET === 'all') {
      unprotectAll();
    } else {
      unprotectRules(TARGET);
    }
    break;
    
  case 'status':
    showStatus();
    break;
    
  default:
    console.error(`❌ Unknown command: ${COMMAND}`);
    console.error('📋 Available commands: protect, unprotect, status');
    process.exit(1);
}
