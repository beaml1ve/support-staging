#!/usr/bin/env node

const pm2 = require('pm2');
const fs = require('fs');
const path = require('path');
const PM2Manager = require('./pm2m');

function detectActivePlatform() {
  try {
    // Get the repository root (assuming we're in pm2/scripts/)
    const repoRoot = path.resolve(__dirname, '../..');
    const platformsDir = path.join(repoRoot, 'platforms');
    
    if (!fs.existsSync(platformsDir)) {
      console.warn('⚠️  Platforms directory not found, defaulting to staging');
      return 'staging';
    }
    
    // Check which platforms are available (checked out)
    const availablePlatforms = fs.readdirSync(platformsDir)
      .filter(item => {
        const itemPath = path.join(platformsDir, item);
        return fs.statSync(itemPath).isDirectory();
      });
    
    if (availablePlatforms.length === 0) {
      console.warn('⚠️  No platforms found in platforms directory, defaulting to staging');
      return 'staging';
    }
    
    if (availablePlatforms.length === 1) {
      console.log(`🎯 Auto-detected platform: ${availablePlatforms[0]}`);
      return availablePlatforms[0];
    }
    
    // Multiple platforms available - check for sparse checkout or default to staging
    if (availablePlatforms.includes('staging')) {
      console.log(`🎯 Multiple platforms available, using: staging`);
      return 'staging';
    }
    
    // Use the first available platform
    console.log(`🎯 Multiple platforms available, using: ${availablePlatforms[0]}`);
    return availablePlatforms[0];
    
  } catch (error) {
    console.warn(`⚠️  Error detecting platform: ${error.message}, defaulting to staging`);
    return 'staging';
  }
}

class PM2DaemonRestart {
  constructor(platform = 'staging') {
    this.platform = platform;
    this.stateManager = new PM2Manager(platform);
    this.tempStateFile = `/tmp/pm2_daemon_restart_${Date.now()}.json`;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      pm2.connect((err) => {
        if (err) {
          reject(new Error(`Failed to connect to PM2: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  async disconnect() {
    return new Promise((resolve) => {
      pm2.disconnect(() => {
        resolve();
      });
    });
  }

  async killDaemon() {
    return new Promise((resolve, reject) => {
      pm2.killDaemon((err) => {
        if (err) {
          reject(new Error(`Failed to kill PM2 daemon: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  async stopAllProcesses() {
    return new Promise((resolve, reject) => {
      pm2.stop('all', (err) => {
        if (err) {
          reject(new Error(`Failed to stop all processes: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  async getProcessList() {
    return new Promise((resolve, reject) => {
      pm2.list((err, processes) => {
        if (err) {
          reject(new Error(`Failed to get process list: ${err.message}`));
        } else {
          const sortedProcesses = processes.sort((a, b) => a.pm_id - b.pm_id);
          resolve(sortedProcesses);
        }
      });
    });
  }

  async resurrectProcesses() {
    return new Promise((resolve, reject) => {
      pm2.resurrect((err) => {
        if (err) {
          reject(new Error(`Failed to resurrect processes: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  async stopProcess(processName) {
    return new Promise((resolve) => {
      pm2.stop(processName, (err) => {
        if (err) {
          console.log(`     Warning: Could not stop ${processName}: ${err.message}`);
        }
        resolve();
      });
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async performDaemonRestart() {
    try {
      console.log('🔄 PM2 Daemon Restart with State Preservation');
      console.log(`📋 Platform: ${this.platform}`);
      console.log(`📁 PM2 home: ${this.stateManager.pm2Home}`);
      console.log(`💾 Temp state file: ${this.tempStateFile}`);
      console.log('');

      // Step 1: Save current state
      console.log('📊 Step 1: Saving current PM2 state...');
      await this.connect();
      const processes = await this.getProcessList();

      const stateData = processes.map(proc => ({
        pm_id: proc.pm_id,
        name: proc.name,
        status: proc.pm2_env.status,
        restart_time: proc.pm2_env.restart_time,
        created_at: proc.pm2_env.created_at
      }));

      fs.writeFileSync(this.tempStateFile, JSON.stringify(stateData, null, 2));

      const onlineCount = stateData.filter(p => p.status === 'online').length;
      const stoppedCount = stateData.filter(p => p.status === 'stopped').length;
      const totalCount = stateData.length;

      console.log('✅ Current state saved:');
      console.log(`   🟢 Online services: ${onlineCount}`);
      console.log(`   🔴 Stopped services: ${stoppedCount}`);
      console.log(`   📊 Total services: ${totalCount}`);
      console.log('');

      // Step 2: Stop all services
      console.log('🛑 Step 2: Stopping all PM2 services...');
      await this.stopAllProcesses();
      console.log('✅ All services stopped.');
      console.log('');

      // Step 3: Kill PM2 daemon
      console.log('💀 Step 3: Killing PM2 daemon...');
      await this.killDaemon();
      await this.disconnect(); // Disconnect after killing daemon
      console.log('✅ PM2 daemon killed.');
      console.log('');

      // Step 4: Wait for cleanup
      console.log('⏳ Step 4: Waiting for cleanup...');
      await this.sleep(3000);
      console.log('✅ Cleanup complete.');
      console.log('');

      // Step 5: Resurrect all processes (this will restart PM2 daemon automatically)
      console.log('🔄 Step 5: Resurrecting all processes...');
      await this.connect(); // Reconnect (this will start daemon if needed)
      await this.resurrectProcesses();
      console.log('✅ All processes resurrected.');
      console.log('');

      // Step 6: Restore exact state
      console.log('🎯 Step 6: Restoring exact service states...');
      
      // Wait for processes to stabilize
      await this.sleep(2000);

      // Get current processes after resurrection
      const currentProcesses = await this.getProcessList();
      
      // Stop services that should be stopped (in PM2 ID order)
      console.log('🔧 Adjusting process states (in launch order)...');
      const processesToStop = stateData.filter(p => p.status === 'stopped');
      
      for (const processState of processesToStop) {
        const currentProcess = currentProcesses.find(p => p.name === processState.name);
        if (currentProcess && currentProcess.pm2_env.status === 'online') {
          console.log(`   🛑 Stopping (ID ${processState.pm_id}): ${processState.name}`);
          await this.stopProcess(processState.name);
        }
      }

      console.log('');

      // Step 7: Verify final state
      console.log('✅ Step 7: Verifying final state...');
      const finalProcesses = await this.getProcessList();
      const finalOnline = finalProcesses.filter(p => p.pm2_env.status === 'online').length;
      const finalStopped = finalProcesses.filter(p => p.pm2_env.status === 'stopped').length;
      const finalTotal = finalOnline + finalStopped;

      console.log('📊 Final state:');
      console.log(`   🟢 Online services: ${finalOnline}`);
      console.log(`   🔴 Stopped services: ${finalStopped}`);
      console.log(`   📊 Total services: ${finalTotal}`);
      console.log('');

      // Compare states
      if (onlineCount === finalOnline && stoppedCount === finalStopped) {
        console.log('🎉 SUCCESS: State restored perfectly!');
        console.log(`   Original: ${onlineCount} online, ${stoppedCount} stopped`);
        console.log(`   Final:    ${finalOnline} online, ${finalStopped} stopped`);
      } else {
        console.log('⚠️  WARNING: State mismatch detected!');
        console.log(`   Original: ${onlineCount} online, ${stoppedCount} stopped`);
        console.log(`   Final:    ${finalOnline} online, ${finalStopped} stopped`);
        console.log('');
        console.log('🔍 Services that might have issues:');
        
        // Show differences
        const expectedStopped = stateData.filter(p => p.status === 'stopped');
        for (const processState of expectedStopped) {
          const currentProcess = finalProcesses.find(p => p.name === processState.name);
          if (currentProcess && currentProcess.pm2_env.status === 'online') {
            console.log(`   ⚠️  ${processState.name} - Expected stopped but is online`);
          }
        }
      }

      console.log('');
      console.log('🏁 PM2 Daemon Restart Complete!');
      console.log(`💾 Temporary state file: ${this.tempStateFile}`);
      console.log('💡 You can remove the temp file when no longer needed.');
      console.log('');

      await this.disconnect();

      // Show final PM2 status
      console.log('📋 Current PM2 status:');
      await this.stateManager.showState();

    } catch (error) {
      await this.disconnect();
      
      // Clean up temp file on error
      if (fs.existsSync(this.tempStateFile)) {
        try {
          fs.unlinkSync(this.tempStateFile);
        } catch (cleanupError) {
          console.log(`Warning: Could not clean up temp file: ${cleanupError.message}`);
        }
      }
      
      throw error;
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  let platform = null;

  // Check if first argument is a platform
  if (args[0] && args[0] !== 'help' && args[0] !== '--help') {
    platform = args[0];
  }

  // Auto-detect platform if not explicitly provided
  if (!platform) {
    platform = detectActivePlatform();
  }

  if (args.includes('help') || args.includes('--help')) {
    console.log('PM2 Daemon Restart - JavaScript Implementation');
    console.log('');
    console.log('Usage: node pm2-daemon-restart.js [platform]');
    console.log('');
    console.log('Platforms:');
    console.log('  Auto-detected from platforms/ directory (sparse checkout aware)');
    console.log('  Can be overridden by specifying platform explicitly');
    console.log('  Default fallback: staging');
    console.log('');
    console.log('Description:');
    console.log('  Performs a complete PM2 daemon restart while preserving the exact');
    console.log('  state of all services. Services that were online will remain online,');
    console.log('  and services that were stopped will remain stopped.');
    console.log('');
    console.log('Process:');
    console.log('  1. Save current state');
    console.log('  2. Stop all services');
    console.log('  3. Kill PM2 daemon');
    console.log('  4. Wait for cleanup');
    console.log('  5. Resurrect all processes');
    console.log('  6. Restore exact state');
    console.log('  7. Verify result');
    console.log('');
    console.log('Examples:');
    console.log('  node pm2-daemon-restart.js              # Auto-detect platform');
    console.log('  node pm2-daemon-restart.js staging      # Explicit platform');
    console.log('  node pm2-daemon-restart.js production   # Override auto-detection');
    process.exit(0);
  }

  try {
    const restarter = new PM2DaemonRestart(platform);
    await restarter.performDaemonRestart();

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('  1. Check if PM2 is installed and accessible');
    console.error('  2. Verify you have permissions to manage PM2 processes');
    console.error('  3. Try running: pm2 status');
    console.error('  4. Check PM2 logs: pm2 logs');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PM2DaemonRestart;
