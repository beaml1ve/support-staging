#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Validates that only one platform is checked out in the sparse checkout configuration
 * Provides helpful error messages and instructions for proper sparse checkout setup
 */

function checkSparseCheckoutEnabled() {
  try {
    const result = execSync('git config core.sparseCheckout', { encoding: 'utf8' }).trim();
    return result === 'true';
  } catch (error) {
    return false;
  }
}

function getSparseCheckoutInfo() {
  try {
    const sparseCheckoutFile = path.join('.git', 'info', 'sparse-checkout');
    if (!fs.existsSync(sparseCheckoutFile)) {
      return null;
    }
    
    const content = fs.readFileSync(sparseCheckoutFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    return lines;
  } catch (error) {
    return null;
  }
}

function getCheckedOutPlatforms() {
  const platformsDir = path.join('platforms');
  if (!fs.existsSync(platformsDir)) {
    return [];
  }
  
  try {
    return fs.readdirSync(platformsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch (error) {
    return [];
  }
}

function printSparseCheckoutInstructions() {
  console.log('\n📋 HOW TO SET UP SPARSE CHECKOUT FOR ONE PLATFORM:\n');
  
  console.log('1️⃣ Enable sparse checkout:');
  console.log('   git config core.sparseCheckout true\n');
  
  console.log('2️⃣ Configure sparse checkout (choose ONE platform):');
  console.log('   # For staging platform:');
  console.log('   echo "/*" > .git/info/sparse-checkout');
  console.log('   echo "!platforms/*" >> .git/info/sparse-checkout');
  console.log('   echo "platforms/staging/" >> .git/info/sparse-checkout\n');
  
  console.log('   # For production platform (example):');
  console.log('   echo "/*" > .git/info/sparse-checkout');
  console.log('   echo "!platforms/*" >> .git/info/sparse-checkout');
  console.log('   echo "platforms/production/" >> .git/info/sparse-checkout\n');
  
  console.log('3️⃣ Apply sparse checkout:');
  console.log('   git read-tree -m -u HEAD\n');
  
  console.log('4️⃣ Verify setup:');
  console.log('   npm run validate-checkout\n');
  
  console.log('📚 SPARSE CHECKOUT BENEFITS:');
  console.log('   ✅ Only one platform checked out at a time');
  console.log('   ✅ No context switching scripts needed');
  console.log('   ✅ Cleaner workspace with focused configuration');
  console.log('   ✅ Reduced disk usage and faster operations');
  console.log('   ✅ Automatic platform isolation\n');
}

function printSwitchPlatformInstructions(currentPlatform) {
  console.log('\n🔄 HOW TO SWITCH TO A DIFFERENT PLATFORM:\n');
  
  console.log('1️⃣ Update sparse checkout configuration:');
  console.log('   echo "/*" > .git/info/sparse-checkout');
  console.log('   echo "!platforms/*" >> .git/info/sparse-checkout');
  console.log('   echo "platforms/NEW_PLATFORM_NAME/" >> .git/info/sparse-checkout\n');
  
  console.log('2️⃣ Apply the changes:');
  console.log('   git read-tree -m -u HEAD\n');
  
  console.log('3️⃣ Install dependencies:');
  console.log('   npm install\n');
  
  if (currentPlatform) {
    console.log(`📝 NOTE: Currently checked out platform: ${currentPlatform}`);
  }
}

function main() {
  const isValidation = process.argv.includes('--validate');
  const isQuiet = process.argv.includes('--quiet');
  
  if (!isQuiet) {
    console.log('🔍 Validating sparse checkout configuration...\n');
  }
  
  // Check if sparse checkout is enabled
  const sparseCheckoutEnabled = checkSparseCheckoutEnabled();
  if (!sparseCheckoutEnabled) {
    console.error('❌ ERROR: Sparse checkout is not enabled\n');
    console.error('🎯 SOLUTION: This monorepo requires sparse checkout to work with only one platform at a time.\n');
    printSparseCheckoutInstructions();
    process.exit(1);
  }
  
  // Get sparse checkout configuration
  const sparseCheckoutLines = getSparseCheckoutInfo();
  if (!sparseCheckoutLines) {
    console.error('❌ ERROR: Sparse checkout configuration not found\n');
    console.error('🎯 SOLUTION: Sparse checkout is enabled but not configured.\n');
    printSparseCheckoutInstructions();
    process.exit(1);
  }
  
  // Get checked out platforms
  const checkedOutPlatforms = getCheckedOutPlatforms();
  
  if (checkedOutPlatforms.length === 0) {
    console.error('❌ ERROR: No platforms are checked out\n');
    console.error('🎯 SOLUTION: Configure sparse checkout to include exactly one platform.\n');
    printSparseCheckoutInstructions();
    process.exit(1);
  }
  
  if (checkedOutPlatforms.length > 1) {
    console.error('❌ ERROR: Multiple platforms are checked out\n');
    console.error(`📋 Found platforms: ${checkedOutPlatforms.join(', ')}\n`);
    console.error('🎯 SOLUTION: This monorepo supports only ONE platform at a time for focused work.\n');
    printSwitchPlatformInstructions();
    process.exit(1);
  }
  
  // Success - exactly one platform
  const platform = checkedOutPlatforms[0];
  
  if (!isQuiet) {
    console.log('✅ SPARSE CHECKOUT VALIDATION PASSED\n');
    console.log(`🎯 Active Platform: ${platform}`);
    console.log(`📁 Platform Path: platforms/${platform}/`);
    console.log(`🔧 Platform Config: platforms/${platform}/.cursorrules`);
    console.log(`⚙️  Platform MCP: platforms/${platform}/.cursor/mcp_settings.json\n`);
    
    // Check if platform has required files
    const platformPath = path.join('platforms', platform);
    const requiredFiles = [
      '.cursorrules',
      'package.json',
      '.cursor/mcp_settings.json'
    ];
    
    console.log('📋 Platform Configuration Status:');
    for (const file of requiredFiles) {
      const filePath = path.join(platformPath, file);
      const exists = fs.existsSync(filePath);
      console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    }
    
    console.log('\n🚀 Ready to work with the', platform, 'platform!\n');
    
    if (isValidation) {
      console.log('💡 TIP: You can now run platform-specific commands:');
      console.log(`   cd platforms/${platform}`);
      console.log('   npm run open-session "session-name"');
      console.log('   npm run session-status');
      console.log('   npm run list-sessions\n');
    }
  }
  
  // Return platform name for other scripts
  if (process.argv.includes('--get-platform')) {
    console.log(platform);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkSparseCheckoutEnabled,
  getSparseCheckoutInfo,
  getCheckedOutPlatforms,
  printSparseCheckoutInstructions,
  printSwitchPlatformInstructions
};
