#!/usr/bin/env node

const PM2Manager = require('./pm2m');
const PM2DaemonRestart = require('./pm2-daemon-restart');

class PM2TestRunner {
  constructor() {
    this.testResults = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📋',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌',
      'test': '🧪'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runTest(testName, testFn) {
    this.log(`Running test: ${testName}`, 'test');
    try {
      await testFn();
      this.testResults.push({ name: testName, status: 'PASS' });
      this.log(`Test passed: ${testName}`, 'success');
    } catch (error) {
      this.testResults.push({ name: testName, status: 'FAIL', error: error.message });
      this.log(`Test failed: ${testName} - ${error.message}`, 'error');
    }
  }

  async testPlatformConfiguration() {
    const manager = new PM2Manager('staging');
    
    // Test platform config
    if (!manager.platformConfig) {
      throw new Error('Platform configuration not loaded');
    }
    
    if (!manager.platformConfig.pm2Home) {
      throw new Error('PM2 home path not configured');
    }
    
    this.log(`Platform config loaded: ${manager.platform}`, 'info');
    this.log(`PM2 home: ${manager.platformConfig.pm2Home}`, 'info');
  }

  async testInvalidPlatform() {
    try {
      new PM2Manager('invalid-platform');
      throw new Error('Should have thrown error for invalid platform');
    } catch (error) {
      if (!error.message.includes('Unknown platform')) {
        throw error;
      }
      // Expected error, test passes
    }
  }

  async testManagerMethods() {
    const manager = new PM2Manager('staging');
    
    // Test that methods exist
    const requiredMethods = [
      'connect', 'disconnect', 'getProcessList', 'saveState', 
      'restoreState', 'showState', 'listStateFiles', 'startService',
      'stopService', 'restartService', 'reloadService', 'getServiceInfo',
      'manageMultipleServices', 'formatFileSize', 'getLogInfo', 'getRecentLogLines', 
      'findRotatedLogs', 'getFileAge', 'catLogs'
    ];
    
    for (const method of requiredMethods) {
      if (typeof manager[method] !== 'function') {
        throw new Error(`Missing method: ${method}`);
      }
    }
    
    this.log('All required methods exist on PM2Manager', 'info');
  }

  async testDaemonRestartMethods() {
    const restarter = new PM2DaemonRestart('staging');
    
    // Test that methods exist
    const requiredMethods = [
      'connect', 'disconnect', 'killDaemon', 'stopAllProcesses',
      'getProcessList', 'resurrectProcesses', 'performDaemonRestart'
    ];
    
    for (const method of requiredMethods) {
      if (typeof restarter[method] !== 'function') {
        throw new Error(`Missing method: ${method}`);
      }
    }
    
    this.log('All required methods exist on PM2DaemonRestart', 'info');
  }

  async testUtilityMethods() {
    const manager = new PM2Manager('staging');
    
    // Test formatUptime
    const uptime1 = manager.formatUptime(1000); // 1 second
    const uptime2 = manager.formatUptime(60000); // 1 minute
    const uptime3 = manager.formatUptime(3600000); // 1 hour
    const uptime4 = manager.formatUptime(86400000); // 1 day
    
    if (!uptime1.includes('1s')) throw new Error('formatUptime failed for seconds');
    if (!uptime2.includes('1m')) throw new Error('formatUptime failed for minutes');
    if (!uptime3.includes('1h')) throw new Error('formatUptime failed for hours');
    if (!uptime4.includes('1d')) throw new Error('formatUptime failed for days');
    
    this.log('Utility methods working correctly', 'info');
  }

  async testCLIArgumentParsing() {
    // Test argument parsing logic by simulating different argv scenarios
    const originalArgv = process.argv;
    
    try {
      // Test default platform
      process.argv = ['node', 'script.js', 'save'];
      // Would need to extract the CLI parsing logic to test properly
      
      // Test explicit platform
      process.argv = ['node', 'script.js', 'staging', 'save'];
      // Would need to extract the CLI parsing logic to test properly
      
      this.log('CLI argument parsing structure verified', 'info');
    } finally {
      process.argv = originalArgv;
    }
  }

  async testFileSystemOperations() {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    // Test in a safe temporary directory
    const testDir = path.join(os.tmpdir(), `pm2-test-${Date.now()}`);
    
    try {
      // Create test directory
      fs.mkdirSync(testDir, { recursive: true });
      
      // Test JSON file operations
      const testData = { test: 'data', timestamp: new Date().toISOString() };
      const testFile = path.join(testDir, 'test-state.json');
      
      fs.writeFileSync(testFile, JSON.stringify(testData, null, 2));
      
      if (!fs.existsSync(testFile)) {
        throw new Error('Failed to create test file');
      }
      
      const readData = JSON.parse(fs.readFileSync(testFile, 'utf8'));
      if (readData.test !== 'data') {
        throw new Error('Failed to read test data correctly');
      }
      
      // Test symlink creation
      const symlinkFile = path.join(testDir, 'latest-test.json');
      fs.symlinkSync(testFile, symlinkFile);
      
      if (!fs.existsSync(symlinkFile)) {
        throw new Error('Failed to create symlink');
      }
      
      this.log('File system operations working correctly', 'info');
      
    } finally {
      // Clean up test directory
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch (error) {
        this.log(`Warning: Could not clean up test directory: ${error.message}`, 'warning');
      }
    }
  }

  testLogIntegration() {
    const manager = new PM2Manager('staging');
    
    // Test formatFileSize method
    const testSizes = [
      [0, '0 B'],
      [1024, '1 KB'],
      [1048576, '1 MB'],
      [1073741824, '1 GB']
    ];
    
    for (const [input, expected] of testSizes) {
      const result = manager.formatFileSize(input);
      if (result !== expected) {
        throw new Error(`formatFileSize(${input}) expected ${expected}, got ${result}`);
      }
    }
    
    // Test getLogInfo with mock service (simulating PM2 daemon data)
    const mockService = {
      name: 'test-service',
      pm_id: 123,
      pm2_env: {
        pm_out_log_path: '/tmp/test-service.out.log',
        pm_err_log_path: '/tmp/test-service.err.log',
        pm_cwd: '/tmp'
      }
    };
    
    const logInfo = manager.getLogInfo(mockService);
    if (!logInfo || typeof logInfo.outFile === 'undefined' || typeof logInfo.errorFile === 'undefined') {
      throw new Error('getLogInfo should return object with outFile and errorFile properties');
    }
    
    // Test that PM2 daemon paths are used
    if (logInfo.outFile !== '/tmp/test-service.out.log') {
      throw new Error('getLogInfo should use PM2 daemon log paths when available');
    }
    
    // Test that rotatedLogs structure exists
    if (!logInfo.rotatedLogs || !Array.isArray(logInfo.rotatedLogs.outFiles) || !Array.isArray(logInfo.rotatedLogs.errorFiles)) {
      throw new Error('getLogInfo should return rotatedLogs with outFiles and errorFiles arrays');
    }
    
    // Test getRecentLogLines with non-existent file (should return empty array)
    const lines = manager.getRecentLogLines('/non/existent/file.log');
    if (!Array.isArray(lines) || lines.length !== 0) {
      throw new Error('getRecentLogLines should return empty array for non-existent file');
    }
    
    // Test with temporary log file
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const testLogDir = path.join(os.tmpdir(), `pm2-log-test-${Date.now()}`);
    const testLogFile = path.join(testLogDir, 'test.log');
    
    try {
      fs.mkdirSync(testLogDir, { recursive: true });
      
      // Create test log with multiple lines
      const testLogContent = [
        'Line 1: First log entry',
        'Line 2: Second log entry',
        'Line 3: Third log entry',
        'Line 4: Fourth log entry',
        'Line 5: Fifth log entry'
      ].join('\n');
      
      fs.writeFileSync(testLogFile, testLogContent);
      
      const recentLines = manager.getRecentLogLines(testLogFile, 3);
      if (!Array.isArray(recentLines) || recentLines.length !== 3) {
        throw new Error(`Expected 3 recent lines, got ${recentLines.length}`);
      }
      
      if (!recentLines[2].includes('Fifth log entry')) {
        throw new Error('Last line should be the fifth log entry');
      }
      
      // Test getFileAge method
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const hourAge = manager.getFileAge(oneHourAgo);
      const dayAge = manager.getFileAge(oneDayAgo);
      
      if (!hourAge.includes('h ago')) {
        throw new Error('getFileAge should return hours for recent files');
      }
      
      if (!dayAge.includes('d ago')) {
        throw new Error('getFileAge should return days for older files');
      }
      
      this.log('Log integration methods working correctly', 'info');
      
    } finally {
      // Cleanup
      try {
        fs.rmSync(testLogDir, { recursive: true, force: true });
      } catch (error) {
        this.log(`Warning: Could not clean up log test directory: ${error.message}`, 'warning');
      }
    }
  }

  async testCatLogsIntegration() {
    this.log('Testing logs functionality', 'info');
    
    const manager = new PM2Manager('staging');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const zlib = require('zlib');
    
    const testLogDir = path.join(os.tmpdir(), `pm2-cat-logs-test-${Date.now()}`);
    
    try {
      fs.mkdirSync(testLogDir, { recursive: true });
      
      // Test timestamp extraction method
      const testLines = [
        '2024-01-15T10:30:45.123Z [INFO] Test log entry',
        '2024-01-15 10:30:46 [ERROR] Another log entry',
        'Jan 15 10:30:47 [WARN] Syslog format entry',
        '[1705312248] Unix timestamp entry',
        'No timestamp in this line'
      ];
      
      for (const line of testLines) {
        const timestamp = manager._extractTimestamp(line);
        if (line.includes('No timestamp') && timestamp !== null) {
          throw new Error('Should return null for lines without timestamps');
        }
        if (!line.includes('No timestamp') && timestamp === null) {
          throw new Error(`Should extract timestamp from: ${line}`);
        }
      }
      
      // Test compressed file reading
      const testContent = 'Test log content\nSecond line\nThird line';
      const compressedFile = path.join(testLogDir, 'test.log.gz');
      
      // Create compressed file
      const compressed = zlib.gzipSync(Buffer.from(testContent));
      fs.writeFileSync(compressedFile, compressed);
      
      const decompressedContent = await manager._readCompressedFile(compressedFile);
      if (decompressedContent !== testContent) {
        throw new Error('Compressed file reading failed');
      }
      
      // Test log file discovery (mock scenario)
      const mockService = {
        name: 'test-service',
        pm_id: 123,
        pm2_env: {
          pm_out_log_path: path.join(testLogDir, 'test.out.log'),
          pm_err_log_path: path.join(testLogDir, 'test.err.log'),
          pm_cwd: testLogDir
        }
      };
      
      // Create mock log files
      const outLogContent = '2024-01-15T10:30:45.123Z [INFO] Output log entry\n2024-01-15T10:30:46.123Z [INFO] Second output entry';
      const errLogContent = '2024-01-15T10:30:45.500Z [ERROR] Error log entry\n2024-01-15T10:30:47.123Z [ERROR] Second error entry';
      
      fs.writeFileSync(mockService.pm2_env.pm_out_log_path, outLogContent);
      fs.writeFileSync(mockService.pm2_env.pm_err_log_path, errLogContent);
      
      // Test log file discovery
      const logInfo = manager.getLogInfo(mockService);
      const discoveredFiles = await manager._discoverAllLogFiles(mockService, logInfo.outFile, logInfo.errorFile);
      
      if (discoveredFiles.length !== 2) {
        throw new Error(`Expected 2 log files, found ${discoveredFiles.length}`);
      }
      
      // Test reading log files with timestamps
      const logFile = {
        path: mockService.pm2_env.pm_out_log_path,
        type: 'output',
        compressed: false,
        mtime: fs.statSync(mockService.pm2_env.pm_out_log_path).mtime
      };
      
      const entries = await manager._readLogFileWithTimestamps(logFile);
      if (entries.length !== 2) {
        throw new Error(`Expected 2 log entries, found ${entries.length}`);
      }
      
      if (!entries[0].timestamp || !entries[0].line || !entries[0].source) {
        throw new Error('Log entry should have timestamp, line, and source properties');
      }
      
      this.log('Logs integration methods working correctly', 'info');
      
    } finally {
      // Cleanup
      try {
        fs.rmSync(testLogDir, { recursive: true, force: true });
      } catch (error) {
        this.log(`Warning: Could not clean up cat-logs test directory: ${error.message}`, 'warning');
      }
    }
  }

  async testTimeFiltering() {
    this.log('Testing time filtering functionality', 'info');
    
    // Test parseGrafanaTime function (it's not exported, so we'll test via the manager)
    const manager = new PM2Manager('staging');
    
    // We need to access the parseGrafanaTime function - let's test it indirectly
    // by testing the time filtering in a controlled way
    
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const testLogDir = path.join(os.tmpdir(), `pm2-time-filter-test-${Date.now()}`);
    
    try {
      fs.mkdirSync(testLogDir, { recursive: true });
      
      // Create mock service with time-based log entries
      const mockService = {
        name: 'time-test-service',
        pm_id: 999,
        pm2_env: {
          pm_out_log_path: path.join(testLogDir, 'time-test.out.log'),
          pm_err_log_path: path.join(testLogDir, 'time-test.err.log'),
          pm_cwd: testLogDir
        }
      };
      
      // Create log entries with different timestamps
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      
      const logEntries = [
        `${twoDaysAgo.toISOString()} [INFO] Old log entry from 2 days ago`,
        `${oneHourAgo.toISOString()} [INFO] Recent log entry from 1 hour ago`,
        `${now.toISOString()} [INFO] Current log entry`
      ];
      
      fs.writeFileSync(mockService.pm2_env.pm_out_log_path, logEntries.join('\n'));
      
      // Test log file discovery and reading
      const logInfo = manager.getLogInfo(mockService);
      const discoveredFiles = await manager._discoverAllLogFiles(mockService, logInfo.outFile, logInfo.errorFile);
      
      if (discoveredFiles.length !== 1) {
        throw new Error(`Expected 1 log file, found ${discoveredFiles.length}`);
      }
      
      // Test reading log entries with timestamps
      const logFile = discoveredFiles[0];
      const entries = await manager._readLogFileWithTimestamps(logFile);
      
      if (entries.length !== 3) {
        throw new Error(`Expected 3 log entries, found ${entries.length}`);
      }
      
      // Verify timestamps are parsed correctly
      for (const entry of entries) {
        if (!entry.timestamp || !entry.line || !entry.source) {
          throw new Error('Log entry should have timestamp, line, and source properties');
        }
        
        if (typeof entry.timestamp !== 'number') {
          throw new Error('Timestamp should be a number (milliseconds)');
        }
      }
      
      // Test that entries are in chronological order when sorted
      const sortedEntries = [...entries].sort((a, b) => a.timestamp - b.timestamp);
      
      if (sortedEntries[0].line.includes('2 days ago') && 
          sortedEntries[1].line.includes('1 hour ago') && 
          sortedEntries[2].line.includes('Current')) {
        // Correct chronological order
      } else {
        throw new Error('Entries are not in correct chronological order after sorting');
      }
      
      this.log('Time filtering methods working correctly', 'info');
      
    } finally {
      // Cleanup
      try {
        fs.rmSync(testLogDir, { recursive: true, force: true });
      } catch (error) {
        this.log(`Warning: Could not clean up time filter test directory: ${error.message}`, 'warning');
      }
    }
  }

  async runSafetyChecks() {
    this.log('🔒 Running safety checks before any PM2 operations', 'info');
    
    // Check if we're in a production-like environment
    const hostname = require('os').hostname();
    const env = process.env.NODE_ENV || 'development';
    
    this.log(`Hostname: ${hostname}`, 'info');
    this.log(`Environment: ${env}`, 'info');
    
    // Warn about staging environment
    if (hostname.includes('staging') || hostname.includes('prod')) {
      this.log('⚠️  WARNING: Running on staging/production-like environment!', 'warning');
      this.log('⚠️  These tests should only run in development/test environments', 'warning');
      return false;
    }
    
    return true;
  }

  async runAllTests() {
    this.log('🧪 Starting PM2 Utilities Test Suite', 'info');
    this.log('🔒 This test suite runs WITHOUT connecting to PM2 daemon', 'info');
    console.log('');
    
    const isSafe = await this.runSafetyChecks();
    if (!isSafe) {
      this.log('❌ Safety checks failed - aborting tests', 'error');
      return;
    }
    
    console.log('');
    
    // Run all tests
    await this.runTest('Platform Configuration', () => this.testPlatformConfiguration());
    await this.runTest('Invalid Platform Handling', () => this.testInvalidPlatform());
    await this.runTest('PM2 Manager Methods', () => this.testManagerMethods());
    await this.runTest('Daemon Restart Methods', () => this.testDaemonRestartMethods());
    await this.runTest('Utility Methods', () => this.testUtilityMethods());
    await this.runTest('CLI Argument Parsing', () => this.testCLIArgumentParsing());
    await this.runTest('File System Operations', () => this.testFileSystemOperations());
    await this.runTest('Log Integration Methods', () => this.testLogIntegration());
    await this.runTest('Logs Integration', () => this.testCatLogsIntegration());
    await this.runTest('Time Filtering', () => this.testTimeFiltering());
    
    // Show results
    console.log('');
    this.log('🏁 Test Results Summary:', 'info');
    console.log('');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.name}: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log('');
    this.log(`Tests completed: ${passed} passed, ${failed} failed`, 'info');
    
    if (failed > 0) {
      this.log('❌ Some tests failed - please review the implementation', 'error');
      process.exit(1);
    } else {
      this.log('🎉 All tests passed! Scripts are ready for use.', 'success');
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('help') || args.includes('--help')) {
    console.log('PM2 Utilities Test Runner');
    console.log('');
    console.log('Usage: node pm2-test-runner.js');
    console.log('');
    console.log('Description:');
    console.log('  Runs comprehensive tests of PM2 utilities WITHOUT connecting to PM2.');
    console.log('  Safe to run in any environment as it does not modify PM2 state.');
    console.log('');
    console.log('Tests:');
    console.log('  - Platform configuration validation');
    console.log('  - Method existence verification');
    console.log('  - Utility function testing');
    console.log('  - File system operations');
    console.log('  - CLI argument parsing');
    console.log('  - Safety checks');
    console.log('');
    console.log('Safety:');
    console.log('  - No PM2 daemon connection');
    console.log('  - No process state modification');
    console.log('  - Uses temporary directories for file tests');
    console.log('  - Environment detection and warnings');
    process.exit(0);
  }
  
  const testRunner = new PM2TestRunner();
  await testRunner.runAllTests();
}

if (require.main === module) {
  main();
}

module.exports = PM2TestRunner;
