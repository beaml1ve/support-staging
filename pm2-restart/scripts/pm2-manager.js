#!/usr/bin/env node

const pm2 = require('pm2');
const fs = require('fs');
const path = require('path');

function detectActivePlatform() {
  try {
    // Get the repository root (assuming we're in pm2-restart/scripts/)
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

class PM2Manager {
  constructor(platform = 'staging') {
    this.platform = platform;
    this.platformConfig = this.getPlatformConfig(platform);
    this.pm2Home = this.platformConfig.pm2Home;
  }

  getPlatformConfig(platform) {
    const configs = {
      staging: {
        pm2Home: '/var/www/beamdevlive/.pm2',
        name: 'Staging Environment'
      }
      // Add more platforms as needed
    };

    if (!configs[platform]) {
      throw new Error(`Unknown platform: ${platform}. Supported platforms: ${Object.keys(configs).join(', ')}`);
    }

    return configs[platform];
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

  async getProcessList() {
    return new Promise((resolve, reject) => {
      pm2.list((err, processes) => {
        if (err) {
          reject(new Error(`Failed to get process list: ${err.message}`));
        } else {
          // Sort by PM2 ID to maintain launch order
          const sortedProcesses = processes.sort((a, b) => a.pm_id - b.pm_id);
          resolve(sortedProcesses);
        }
      });
    });
  }

  async saveState(customName = null) {
    try {
      console.log(`🔄 Saving PM2 state for platform: ${this.platform}`);
      console.log(`📁 PM2 home: ${this.pm2Home}`);
      console.log('');

      await this.connect();
      const processes = await this.getProcessList();

      // Create custom state data
      const stateData = processes.map(proc => ({
        pm_id: proc.pm_id,
        name: proc.name,
        status: proc.pm2_env.status,
        restart_time: proc.pm2_env.restart_time,
        created_at: proc.pm2_env.created_at
      }));

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = customName || `custom_state_${timestamp}.json`;
      const stateFile = path.join(this.pm2Home, filename);
      const latestStateFile = path.join(this.pm2Home, 'latest_custom_state.json');

      // Ensure PM2 home directory exists
      if (!fs.existsSync(this.pm2Home)) {
        fs.mkdirSync(this.pm2Home, { recursive: true });
      }

      // Save state data
      fs.writeFileSync(stateFile, JSON.stringify(stateData, null, 2));
      
      // Create symlink to latest state
      if (fs.existsSync(latestStateFile)) {
        fs.unlinkSync(latestStateFile);
      }
      fs.symlinkSync(stateFile, latestStateFile);

      // Also save standard PM2 dump
      await this.savePM2Dump();

      // Show summary
      const onlineCount = stateData.filter(p => p.status === 'online').length;
      const stoppedCount = stateData.filter(p => p.status === 'stopped').length;

      console.log('✅ State saved successfully!');
      console.log('');
      console.log('📊 State Summary:');
      console.log(`   Online services: ${onlineCount}`);
      console.log(`   Stopped services: ${stoppedCount}`);
      console.log(`   Total services: ${stateData.length}`);
      console.log('');
      console.log('📁 Files:');
      console.log(`   Custom state: ${stateFile}`);
      console.log(`   Latest state: ${latestStateFile}`);
      console.log(`   PM2 dump: ${path.join(this.pm2Home, 'dump.pm2')}`);

      await this.disconnect();
      return stateFile;

    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  async savePM2Dump() {
    return new Promise((resolve, reject) => {
      pm2.dump((err) => {
        if (err) {
          reject(new Error(`Failed to save PM2 dump: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  async restoreState(stateFile = null) {
    try {
      const targetStateFile = stateFile || path.join(this.pm2Home, 'latest_custom_state.json');
      
      if (!fs.existsSync(targetStateFile)) {
        throw new Error(`State file not found: ${targetStateFile}`);
      }

      console.log(`🔄 Restoring PM2 state for platform: ${this.platform}`);
      console.log(`📁 State file: ${targetStateFile}`);
      console.log('');

      // Read state data
      const stateData = JSON.parse(fs.readFileSync(targetStateFile, 'utf8'));
      
      await this.connect();

      // First, resurrect all processes
      console.log('📦 Resurrecting all processes...');
      await this.resurrectProcesses();

      // Wait a moment for processes to start
      await this.sleep(2000);

      // Get current process list
      const currentProcesses = await this.getProcessList();
      
      // Stop processes that should be stopped (in PM2 ID order)
      console.log('🛑 Adjusting process states...');
      const processesToStop = stateData.filter(p => p.status === 'stopped');
      
      for (const processState of processesToStop) {
        const currentProcess = currentProcesses.find(p => p.name === processState.name);
        if (currentProcess && currentProcess.pm2_env.status === 'online') {
          console.log(`   Stopping (ID ${processState.pm_id}): ${processState.name}`);
          await this.stopProcess(processState.name);
        }
      }

      // Verify final state
      const finalProcesses = await this.getProcessList();
      const finalOnline = finalProcesses.filter(p => p.pm2_env.status === 'online').length;
      const finalStopped = finalProcesses.filter(p => p.pm2_env.status === 'stopped').length;
      
      const expectedOnline = stateData.filter(p => p.status === 'online').length;
      const expectedStopped = stateData.filter(p => p.status === 'stopped').length;

      console.log('');
      console.log('✅ State restoration complete!');
      console.log('');
      console.log('📊 Final State:');
      console.log(`   Online services: ${finalOnline} (expected: ${expectedOnline})`);
      console.log(`   Stopped services: ${finalStopped} (expected: ${expectedStopped})`);
      console.log(`   Total services: ${finalOnline + finalStopped}`);

      if (finalOnline === expectedOnline && finalStopped === expectedStopped) {
        console.log('');
        console.log('🎉 Perfect match! State restored successfully.');
      } else {
        console.log('');
        console.log('⚠️  State mismatch detected. Some services may need manual adjustment.');
      }

      await this.disconnect();

    } catch (error) {
      await this.disconnect();
      throw error;
    }
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
    return new Promise((resolve, reject) => {
      pm2.stop(processName, (err) => {
        if (err) {
          // Don't reject on stop errors, just warn
          console.log(`     Warning: Could not stop ${processName}: ${err.message}`);
        }
        resolve();
      });
    });
  }

  async showState() {
    try {
      console.log(`📊 Current PM2 state for platform: ${this.platform}`);
      console.log(`📁 PM2 home: ${this.pm2Home}`);
      console.log('');

      await this.connect();
      const processes = await this.getProcessList();

      console.log('🔍 Process List (in launch order):');
      console.log('');

      processes.forEach(proc => {
        const status = proc.pm2_env.status;
        const statusIcon = status === 'online' ? '🟢' : status === 'stopped' ? '🔴' : '🟡';
        const memory = proc.monit ? `${Math.round(proc.monit.memory / 1024 / 1024)}MB` : 'N/A';
        const uptime = proc.pm2_env.pm_uptime ? this.formatUptime(Date.now() - proc.pm2_env.pm_uptime) : 'N/A';
        
        console.log(`${statusIcon} ID ${proc.pm_id}: ${proc.name}`);
        console.log(`   Status: ${status} | Memory: ${memory} | Uptime: ${uptime}`);
      });

      const onlineCount = processes.filter(p => p.pm2_env.status === 'online').length;
      const stoppedCount = processes.filter(p => p.pm2_env.status === 'stopped').length;
      const errorCount = processes.filter(p => p.pm2_env.status === 'errored').length;

      console.log('');
      console.log('📈 Summary:');
      console.log(`   🟢 Online: ${onlineCount}`);
      console.log(`   🔴 Stopped: ${stoppedCount}`);
      console.log(`   🟡 Errored: ${errorCount}`);
      console.log(`   📊 Total: ${processes.length}`);

      await this.disconnect();

    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  async listStateFiles() {
    try {
      const stateFiles = fs.readdirSync(this.pm2Home)
        .filter(file => file.startsWith('custom_state_') && file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.pm2Home, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            created: stats.mtime,
            size: stats.size
          };
        })
        .sort((a, b) => b.created - a.created);

      console.log(`📁 Available state files for platform: ${this.platform}`);
      console.log(`📂 Location: ${this.pm2Home}`);
      console.log('');

      if (stateFiles.length === 0) {
        console.log('No state files found.');
        return;
      }

      stateFiles.forEach((file, index) => {
        const isLatest = index === 0;
        const icon = isLatest ? '⭐' : '📄';
        console.log(`${icon} ${file.name}`);
        console.log(`   Created: ${file.created.toLocaleString()}`);
        console.log(`   Size: ${Math.round(file.size / 1024)}KB`);
        console.log(`   Path: ${file.path}`);
        console.log('');
      });

    } catch (error) {
      throw new Error(`Failed to list state files: ${error.message}`);
    }
  }

  async startService(serviceName) {
    try {
      console.log(`🚀 Starting service: ${serviceName}`);
      console.log(`📋 Platform: ${this.platform}`);
      console.log('');

      await this.connect();

      return new Promise((resolve, reject) => {
        pm2.start(serviceName, (err, proc) => {
          if (err) {
            reject(new Error(`Failed to start ${serviceName}: ${err.message}`));
          } else {
            console.log(`✅ Service started successfully: ${serviceName}`);
            resolve(proc);
          }
        });
      });

    } catch (error) {
      await this.disconnect();
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async stopService(serviceName) {
    try {
      console.log(`🛑 Stopping service: ${serviceName}`);
      console.log(`📋 Platform: ${this.platform}`);
      console.log('');

      await this.connect();

      return new Promise((resolve, reject) => {
        pm2.stop(serviceName, (err, proc) => {
          if (err) {
            reject(new Error(`Failed to stop ${serviceName}: ${err.message}`));
          } else {
            console.log(`✅ Service stopped successfully: ${serviceName}`);
            resolve(proc);
          }
        });
      });

    } catch (error) {
      await this.disconnect();
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async restartService(serviceName) {
    try {
      console.log(`🔄 Restarting service: ${serviceName}`);
      console.log(`📋 Platform: ${this.platform}`);
      console.log('');

      await this.connect();

      return new Promise((resolve, reject) => {
        pm2.restart(serviceName, (err, proc) => {
          if (err) {
            reject(new Error(`Failed to restart ${serviceName}: ${err.message}`));
          } else {
            console.log(`✅ Service restarted successfully: ${serviceName}`);
            resolve(proc);
          }
        });
      });

    } catch (error) {
      await this.disconnect();
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async reloadService(serviceName) {
    try {
      console.log(`🔃 Reloading service: ${serviceName}`);
      console.log(`📋 Platform: ${this.platform}`);
      console.log('');

      await this.connect();

      return new Promise((resolve, reject) => {
        pm2.reload(serviceName, (err, proc) => {
          if (err) {
            reject(new Error(`Failed to reload ${serviceName}: ${err.message}`));
          } else {
            console.log(`✅ Service reloaded successfully: ${serviceName}`);
            resolve(proc);
          }
        });
      });

    } catch (error) {
      await this.disconnect();
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async getServiceInfo(serviceName) {
    try {
      console.log(`🔍 Getting service information: ${serviceName}`);
      console.log(`📋 Platform: ${this.platform}`);
      console.log('');

      await this.connect();
      const processes = await this.getProcessList();
      
      const service = processes.find(proc => 
        proc.name === serviceName || proc.pm_id.toString() === serviceName
      );

      if (!service) {
        throw new Error(`Service not found: ${serviceName}`);
      }

      const status = service.pm2_env.status;
      const statusIcon = status === 'online' ? '🟢' : status === 'stopped' ? '🔴' : '🟡';
      const memory = service.monit ? `${Math.round(service.monit.memory / 1024 / 1024)}MB` : 'N/A';
      const cpu = service.monit ? `${service.monit.cpu}%` : 'N/A';
      const uptime = service.pm2_env.pm_uptime ? this.formatUptime(Date.now() - service.pm2_env.pm_uptime) : 'N/A';
      const restarts = service.pm2_env.restart_time || 0;

      console.log(`${statusIcon} Service Information: ${service.name}`);
      console.log('');
      console.log(`📊 Status Details:`);
      console.log(`   ID: ${service.pm_id}`);
      console.log(`   Name: ${service.name}`);
      console.log(`   Status: ${status}`);
      console.log(`   Memory: ${memory}`);
      console.log(`   CPU: ${cpu}`);
      console.log(`   Uptime: ${uptime}`);
      console.log(`   Restarts: ${restarts}`);
      console.log(`   PID: ${service.pid || 'N/A'}`);
      
      if (service.pm2_env.pm_exec_path) {
        console.log(`   Script: ${service.pm2_env.pm_exec_path}`);
      }
      
      if (service.pm2_env.pm_cwd) {
        console.log(`   Working Dir: ${service.pm2_env.pm_cwd}`);
      }

      console.log('');
      console.log(`🕐 Timestamps:`);
      console.log(`   Created: ${new Date(service.pm2_env.created_at).toLocaleString()}`);
      console.log(`   Started: ${new Date(service.pm2_env.pm_uptime).toLocaleString()}`);
      
      if (service.pm2_env.restart_time > 0) {
        console.log(`   Last Restart: ${new Date(service.pm2_env.restart_time).toLocaleString()}`);
      }

      // Log file information
      console.log('');
      console.log(`📄 Log Files:`);
      
      const logInfo = this.getLogInfo(service);
      if (logInfo.outFile) {
        console.log(`   Output Log: ${logInfo.outFile}`);
        if (fs.existsSync(logInfo.outFile)) {
          const outStats = fs.statSync(logInfo.outFile);
          console.log(`   Output Size: ${this.formatFileSize(outStats.size)}`);
          console.log(`   Output Modified: ${outStats.mtime.toLocaleString()}`);
        }
      }
      
      if (logInfo.errorFile) {
        console.log(`   Error Log: ${logInfo.errorFile}`);
        if (fs.existsSync(logInfo.errorFile)) {
          const errStats = fs.statSync(logInfo.errorFile);
          console.log(`   Error Size: ${this.formatFileSize(errStats.size)}`);
          console.log(`   Error Modified: ${errStats.mtime.toLocaleString()}`);
        }
      }

      // Display rotated log files
      if (logInfo.rotatedLogs) {
        const { outFiles, errorFiles } = logInfo.rotatedLogs;
        
        if (outFiles.length > 0) {
          console.log('');
          console.log(`📦 Rotated Output Logs (${outFiles.length} files):`);
          outFiles.slice(0, 5).forEach((log, index) => {
            const age = this.getFileAge(log.modified);
            console.log(`   ${index + 1}. ${log.name} (${this.formatFileSize(log.size)}, ${age})`);
          });
          if (outFiles.length > 5) {
            console.log(`   ... and ${outFiles.length - 5} more files`);
          }
        }
        
        if (errorFiles.length > 0) {
          console.log('');
          console.log(`📦 Rotated Error Logs (${errorFiles.length} files):`);
          errorFiles.slice(0, 5).forEach((log, index) => {
            const age = this.getFileAge(log.modified);
            console.log(`   ${index + 1}. ${log.name} (${this.formatFileSize(log.size)}, ${age})`);
          });
          if (errorFiles.length > 5) {
            console.log(`   ... and ${errorFiles.length - 5} more files`);
          }
        }
      }

      // Recent log entries
      console.log('');
      console.log(`📋 Recent Log Entries (last 10 lines):`);
      
      if (logInfo.outFile && fs.existsSync(logInfo.outFile)) {
        console.log('');
        console.log(`🟢 Output Log:`);
        try {
          const recentOutput = this.getRecentLogLines(logInfo.outFile, 10);
          if (recentOutput.length > 0) {
            recentOutput.forEach(line => console.log(`   ${line}`));
          } else {
            console.log(`   (No recent output)`);
          }
        } catch (err) {
          console.log(`   ⚠️  Error reading output log: ${err.message}`);
        }
      }
      
      if (logInfo.errorFile && fs.existsSync(logInfo.errorFile)) {
        console.log('');
        console.log(`🔴 Error Log:`);
        try {
          const recentErrors = this.getRecentLogLines(logInfo.errorFile, 10);
          if (recentErrors.length > 0) {
            recentErrors.forEach(line => console.log(`   ${line}`));
          } else {
            console.log(`   (No recent errors)`);
          }
        } catch (err) {
          console.log(`   ⚠️  Error reading error log: ${err.message}`);
        }
      }

      await this.disconnect();
      return service;

    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  async manageMultipleServices(action, serviceNames) {
    const results = [];
    
    console.log(`🔧 ${action.toUpperCase()} multiple services:`);
    serviceNames.forEach(name => console.log(`   - ${name}`));
    console.log('');

    for (const serviceName of serviceNames) {
      try {
        let result;
        switch (action.toLowerCase()) {
          case 'start':
            result = await this.startService(serviceName);
            break;
          case 'stop':
            result = await this.stopService(serviceName);
            break;
          case 'restart':
            result = await this.restartService(serviceName);
            break;
          case 'reload':
            result = await this.reloadService(serviceName);
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }
        results.push({ service: serviceName, status: 'success', result });
      } catch (error) {
        results.push({ service: serviceName, status: 'error', error: error.message });
        console.log(`❌ Failed to ${action} ${serviceName}: ${error.message}`);
      }
    }

    console.log('');
    console.log(`📊 ${action.toUpperCase()} Results Summary:`);
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;
    
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Total: ${results.length}`);

    if (failed > 0) {
      console.log('');
      console.log('❌ Failed services:');
      results.filter(r => r.status === 'error').forEach(result => {
        console.log(`   - ${result.service}: ${result.error}`);
      });
    }

    return results;
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileAge(modifiedDate) {
    const now = new Date();
    const diffMs = now - modifiedDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'just now';
    }
  }

  getLogInfo(service) {
    let outFile = null;
    let errorFile = null;
    let rotatedLogs = { outFiles: [], errorFiles: [] };
    
    // Get log paths directly from PM2 daemon via service.pm2_env
    // PM2 stores the actual log file paths in pm2_env
    if (service.pm2_env.pm_out_log_path) {
      outFile = service.pm2_env.pm_out_log_path;
    }
    if (service.pm2_env.pm_err_log_path) {
      errorFile = service.pm2_env.pm_err_log_path;
    }
    
    // Fallback: if PM2 doesn't have log paths, try standard locations
    if (!outFile || !errorFile) {
      const pm2Home = this.pm2Home;
      const serviceName = service.name;
      const pmId = service.pm_id;
      const logDir = path.join(pm2Home, 'logs');
      
      if (!outFile) {
        // Try service name based logs first
        const nameBasedOut = path.join(logDir, `${serviceName}-out.log`);
        const idBasedOut = path.join(logDir, `${pmId}-out.log`);
        
        if (fs.existsSync(nameBasedOut)) {
          outFile = nameBasedOut;
        } else if (fs.existsSync(idBasedOut)) {
          outFile = idBasedOut;
        }
      }
      
      if (!errorFile) {
        const nameBasedError = path.join(logDir, `${serviceName}-error.log`);
        const idBasedError = path.join(logDir, `${pmId}-error.log`);
        
        if (fs.existsSync(nameBasedError)) {
          errorFile = nameBasedError;
        } else if (fs.existsSync(idBasedError)) {
          errorFile = idBasedError;
        }
      }
    }
    
    // Find rotated (gzipped) log files
    rotatedLogs = this.findRotatedLogs(service, outFile, errorFile);
    
    return { outFile, errorFile, rotatedLogs };
  }

  findRotatedLogs(service, currentOutFile, currentErrorFile) {
    const serviceName = service.name;
    const rotatedLogs = { outFiles: [], errorFiles: [] };
    
    try {
      // Determine search directories based on actual log file locations from PM2
      const searchDirs = new Set();
      
      // Add directories where current log files are located (from PM2 daemon)
      if (currentOutFile) {
        const outDir = path.dirname(currentOutFile);
        if (fs.existsSync(outDir)) {
          searchDirs.add(outDir);
        }
      }
      
      if (currentErrorFile) {
        const errorDir = path.dirname(currentErrorFile);
        if (fs.existsSync(errorDir)) {
          searchDirs.add(errorDir);
        }
      }
      
      // Fallback: Add PM2 logs directory if no current files found
      if (searchDirs.size === 0) {
        const pm2LogDir = path.join(this.pm2Home, 'logs');
        if (fs.existsSync(pm2LogDir)) {
          searchDirs.add(pm2LogDir);
        }
        
        // Also check service working directory
        if (service.pm2_env.pm_cwd && fs.existsSync(service.pm2_env.pm_cwd)) {
          searchDirs.add(service.pm2_env.pm_cwd);
        }
      }
      
      // Search for rotated (.gz) log files in each directory
      for (const dir of searchDirs) {
        try {
          const files = fs.readdirSync(dir);
          
          for (const file of files) {
            // Look for gzipped log files related to this service
            // Log rotation typically compresses files with .gz extension
            if (file.includes(serviceName) && file.endsWith('.gz')) {
              const filePath = path.join(dir, file);
              
              try {
                const stats = fs.statSync(filePath);
                const logInfo = {
                  path: filePath,
                  size: stats.size,
                  modified: stats.mtime,
                  name: file
                };
                
                // Determine if it's output or error log based on filename patterns
                // Common patterns: service.out__date.log.gz, service-out__date.log.gz, service.err__date.log.gz
                if (file.includes('.out') || file.includes('-out')) {
                  rotatedLogs.outFiles.push(logInfo);
                } else if (file.includes('.err') || file.includes('-error') || file.includes('-err')) {
                  rotatedLogs.errorFiles.push(logInfo);
                }
              } catch (statError) {
                // Skip files we can't stat
                continue;
              }
            }
          }
        } catch (readdirError) {
          // Skip directories we can't read
          continue;
        }
      }
      
      // Sort by modification time (newest first)
      rotatedLogs.outFiles.sort((a, b) => b.modified - a.modified);
      rotatedLogs.errorFiles.sort((a, b) => b.modified - a.modified);
      
    } catch (error) {
      console.warn(`Warning: Error searching for rotated logs: ${error.message}`);
    }
    
    return rotatedLogs;
  }

  getRecentLogLines(filePath, lineCount = 10) {
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }
      
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        return [];
      }
      
      // For large files, read from the end
      const maxChunkSize = 8192; // 8KB chunks
      const fd = fs.openSync(filePath, 'r');
      
      let lines = [];
      let position = stats.size;
      let buffer = Buffer.alloc(maxChunkSize);
      let remainder = '';
      
      try {
        while (lines.length < lineCount && position > 0) {
          const chunkSize = Math.min(maxChunkSize, position);
          position -= chunkSize;
          
          const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, position);
          const chunk = buffer.subarray(0, bytesRead).toString('utf8');
          
          const fullChunk = chunk + remainder;
          const chunkLines = fullChunk.split('\n');
          
          // Keep the first part for the next iteration (incomplete line)
          remainder = chunkLines.shift() || '';
          
          // Add lines to the beginning of our array (since we're reading backwards)
          lines = chunkLines.concat(lines);
        }
        
        // Add the remainder if we've read the entire file
        if (position === 0 && remainder) {
          lines.unshift(remainder);
        }
        
        // Return the last N lines, filtered to remove empty lines
        return lines
          .filter(line => line.trim().length > 0)
          .slice(-lineCount)
          .map(line => line.length > 120 ? line.substring(0, 117) + '...' : line);
          
      } finally {
        fs.closeSync(fd);
      }
      
    } catch (error) {
      console.warn(`Warning: Could not read log file ${filePath}: ${error.message}`);
      return [];
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  let platform = null;
  let command = args[0];
  let additionalArgs = args.slice(1);

  // Check if first argument is a platform
  const validCommands = ['save', 'restore', 'show', 'list', 'start', 'stop', 'restart', 'reload', 'info', 'manage'];
  if (args[0] && !validCommands.includes(args[0])) {
    platform = args[0];
    command = args[1];
    additionalArgs = args.slice(2);
  }

  // Auto-detect platform if not explicitly provided
  if (!platform) {
    platform = detectActivePlatform();
  }

  if (!command) {
    console.log('PM2 Manager - JavaScript Implementation');
    console.log('');
    console.log('Usage: node pm2-manager.js [platform] <command> [options]');
    console.log('');
    console.log('Platforms:');
    console.log('  Auto-detected from platforms/ directory (sparse checkout aware)');
    console.log('  Can be overridden by specifying platform explicitly');
    console.log('  Default fallback: staging');
    console.log('');
    console.log('State Management Commands:');
    console.log('  save [name]             - Save current PM2 state');
    console.log('  restore [state_file]    - Restore PM2 state (default: latest)');
    console.log('  show                    - Show current PM2 state');
    console.log('  list                    - List available state files');
    console.log('');
    console.log('Service Management Commands:');
    console.log('  start <service>         - Start a service');
    console.log('  stop <service>          - Stop a service');
    console.log('  restart <service>       - Restart a service');
    console.log('  reload <service>        - Reload a service (zero-downtime)');
    console.log('  info <service>          - Get detailed service information with logs');
    console.log('  manage <action> <svc1> [svc2] [svc3]... - Manage multiple services');
    console.log('');
    console.log('Examples:');
    console.log('  # State management (auto-detected platform)');
    console.log('  node pm2-manager.js save');
    console.log('  node pm2-manager.js restore');
    console.log('  node pm2-manager.js show');
    console.log('  node pm2-manager.js list');
    console.log('');
    console.log('  # Service management (auto-detected platform)');
    console.log('  node pm2-manager.js start cudb-test-dev');
    console.log('  node pm2-manager.js stop org-notaxi-dev');
    console.log('  node pm2-manager.js restart api-admin-core-dev');
    console.log('  node pm2-manager.js reload bds-dev');
    console.log('  node pm2-manager.js info cudb-test-dev      # Get detailed service info with logs');
    console.log('');
    console.log('  # Multiple service management (auto-detected platform)');
    console.log('  node pm2-manager.js manage restart bds-dev bds2-dev');
    console.log('  node pm2-manager.js manage stop org-test-dev org-test010-dev');
    console.log('');
    console.log('  # Override platform explicitly');
    console.log('  node pm2-manager.js staging save');
    console.log('  node pm2-manager.js staging start cudb-test-dev');
    console.log('  node pm2-manager.js production manage restart bds-dev bds2-dev');
    process.exit(1);
  }

  try {
    const manager = new PM2Manager(platform);

    switch (command) {
      case 'save':
        await manager.saveState(additionalArgs[0]);
        break;
      
      case 'restore':
        await manager.restoreState(additionalArgs[0]);
        break;
      
      case 'show':
        await manager.showState();
        break;
      
      case 'list':
        await manager.listStateFiles();
        break;
      
      case 'start':
        if (!additionalArgs[0]) {
          console.error('❌ Error: Service name required for start command');
          console.error('Usage: node pm2-manager.js start <service-name>');
          process.exit(1);
        }
        await manager.startService(additionalArgs[0]);
        break;
      
      case 'stop':
        if (!additionalArgs[0]) {
          console.error('❌ Error: Service name required for stop command');
          console.error('Usage: node pm2-manager.js stop <service-name>');
          process.exit(1);
        }
        await manager.stopService(additionalArgs[0]);
        break;
      
      case 'restart':
        if (!additionalArgs[0]) {
          console.error('❌ Error: Service name required for restart command');
          console.error('Usage: node pm2-manager.js restart <service-name>');
          process.exit(1);
        }
        await manager.restartService(additionalArgs[0]);
        break;
      
      case 'reload':
        if (!additionalArgs[0]) {
          console.error('❌ Error: Service name required for reload command');
          console.error('Usage: node pm2-manager.js reload <service-name>');
          process.exit(1);
        }
        await manager.reloadService(additionalArgs[0]);
        break;
      
      case 'info':
        if (!additionalArgs[0]) {
          console.error('❌ Error: Service name required for info command');
          console.error('Usage: node pm2-manager.js info <service-name>');
          process.exit(1);
        }
        await manager.getServiceInfo(additionalArgs[0]);
        break;
      
      case 'manage':
        if (additionalArgs.length < 2) {
          console.error('❌ Error: Action and service names required for manage command');
          console.error('Usage: node pm2-manager.js manage <action> <service1> [service2] [service3]...');
          console.error('Actions: start, stop, restart, reload');
          process.exit(1);
        }
        const action = additionalArgs[0];
        const serviceNames = additionalArgs.slice(1);
        await manager.manageMultipleServices(action, serviceNames);
        break;
      
      default:
        console.error(`Unknown command: ${command}`);
        console.error('Run without arguments to see available commands.');
        process.exit(1);
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PM2Manager;
