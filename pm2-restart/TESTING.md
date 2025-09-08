# PM2 Utilities Testing Guide

## ⚠️ Safety First

**CRITICAL**: PM2 utilities should **NEVER** be tested in live staging or production environments as they can disrupt running services and cause downtime.

## 🧪 Safe Testing Approach

### 1. Test Runner (Recommended)

Use the built-in test runner that validates functionality WITHOUT connecting to PM2:

```bash
# Run comprehensive tests (safe for any environment)
npm run pm2-test

# Or run directly
node pm2-restart/scripts/pm2-test-runner.js
```

**What it tests:**
- ✅ Platform configuration validation
- ✅ Method existence verification  
- ✅ Utility function testing
- ✅ File system operations
- ✅ CLI argument parsing
- ✅ Safety checks and environment detection

**Safety features:**
- 🔒 No PM2 daemon connection
- 🔒 No process state modification
- 🔒 Uses temporary directories for file tests
- 🔒 Environment detection with warnings

### 2. Development Environment Testing

If you need to test actual PM2 functionality:

#### Setup Isolated Environment
```bash
# Create isolated test environment
mkdir ~/pm2-test-env
cd ~/pm2-test-env

# Initialize test project
npm init -y
npm install pm2

# Create test processes
echo "console.log('Test process 1'); setInterval(() => {}, 1000);" > test1.js
echo "console.log('Test process 2'); setInterval(() => {}, 1000);" > test2.js
echo "console.log('Test process 3'); setInterval(() => {}, 1000);" > test3.js

# Start test processes
pm2 start test1.js --name "test-service-1"
pm2 start test2.js --name "test-service-2" 
pm2 start test3.js --name "test-service-3"

# Stop one to test mixed states
pm2 stop test-service-2
```

#### Test PM2 Utilities
```bash
# Copy scripts to test environment
cp /home/viktor/support-staging/pm2-restart/scripts/*.js .

# Test state management
node pm2-state-manager.js show
node pm2-state-manager.js save test-backup
node pm2-state-manager.js list

# Test daemon restart (in isolated environment only!)
node pm2-daemon-restart.js

# Verify state restoration
node pm2-state-manager.js show
```

#### Cleanup Test Environment
```bash
pm2 delete all
pm2 kill
cd ~
rm -rf ~/pm2-test-env
```

## 🔍 Testing Checklist

### Before Testing
- [ ] Confirm you're NOT in staging/production environment
- [ ] Run safety test runner first: `npm run pm2-test`
- [ ] Create isolated test environment if needed
- [ ] Backup any existing PM2 state if testing with real PM2

### During Testing
- [ ] Test platform configuration loading
- [ ] Test state save/restore functionality
- [ ] Test daemon restart process
- [ ] Verify state preservation accuracy
- [ ] Test error handling scenarios
- [ ] Test CLI argument parsing

### After Testing
- [ ] Clean up test processes
- [ ] Remove temporary files
- [ ] Verify no impact on real services
- [ ] Document any issues found

## 🚨 Environment Safety Checks

### Automatic Safety Features

The scripts include built-in safety checks:

```javascript
// Hostname detection
const hostname = require('os').hostname();
if (hostname.includes('staging') || hostname.includes('prod')) {
  console.warn('WARNING: Running on staging/production-like environment!');
}

// Environment variable checks
const env = process.env.NODE_ENV || 'development';
if (env === 'production') {
  console.warn('WARNING: Production environment detected!');
}
```

### Manual Safety Verification

Before running any PM2 utilities:

```bash
# Check hostname
hostname

# Check environment
echo $NODE_ENV

# Check current PM2 processes
pm2 list

# Verify you're in the right directory
pwd
```

## 🧪 Test Scenarios

### 1. Basic Functionality Tests
```bash
# Test help output
node pm2-state-manager.js --help
node pm2-daemon-restart.js --help

# Test platform validation
node pm2-state-manager.js invalid-platform show  # Should fail gracefully
```

### 2. State Management Tests
```bash
# In isolated environment with test processes:
node pm2-state-manager.js show                    # Show current state
node pm2-state-manager.js save test-state         # Save state
node pm2-state-manager.js list                    # List saved states
pm2 stop test-service-1                           # Change state
node pm2-state-manager.js restore test-state      # Restore previous state
node pm2-state-manager.js show                    # Verify restoration
```

### 3. Error Handling Tests
```bash
# Test with no PM2 daemon
pm2 kill
node pm2-state-manager.js show  # Should handle gracefully

# Test with missing state file
node pm2-state-manager.js restore nonexistent-state  # Should fail gracefully

# Test with invalid JSON
echo "invalid json" > /tmp/bad-state.json
node pm2-state-manager.js restore /tmp/bad-state.json  # Should handle gracefully
```

## 📊 Expected Test Results

### Test Runner Output
```
🧪 Starting PM2 Utilities Test Suite
🔒 This test suite runs WITHOUT connecting to PM2 daemon

🔒 Running safety checks before any PM2 operations
📋 Hostname: development-machine
📋 Environment: development

🧪 Running test: Platform Configuration
✅ Test passed: Platform Configuration

🧪 Running test: Invalid Platform Handling  
✅ Test passed: Invalid Platform Handling

... (more tests)

🏁 Test Results Summary:
✅ Platform Configuration: PASS
✅ Invalid Platform Handling: PASS
✅ State Manager Methods: PASS
✅ Daemon Restart Methods: PASS
✅ Utility Methods: PASS
✅ CLI Argument Parsing: PASS
✅ File System Operations: PASS

📋 Tests completed: 7 passed, 0 failed
🎉 All tests passed! Scripts are ready for use.
```

## ⚠️ Warning Signs

**STOP immediately if you see:**
- Hostname contains "staging", "prod", or "production"
- NODE_ENV is set to "production"
- PM2 list shows critical production services
- You're not in a dedicated test environment
- Any unexpected process names in PM2 list

## 🔧 Troubleshooting Test Issues

### Common Issues

1. **Module not found errors**
   ```bash
   npm install pm2  # Install PM2 dependency
   ```

2. **Permission denied**
   ```bash
   chmod +x pm2-restart/scripts/*.js  # Make scripts executable
   ```

3. **PM2 daemon not found**
   ```bash
   pm2 status  # Check if PM2 is installed and running
   ```

4. **File system errors**
   ```bash
   # Check permissions on PM2 directories
   ls -la ~/.pm2/
   ```

## 📝 Test Documentation

### Recording Test Results

Create a test log for each testing session:

```bash
# Create test log
echo "PM2 Utilities Test Session - $(date)" > pm2-test-log.txt
echo "Environment: $(hostname)" >> pm2-test-log.txt
echo "Node version: $(node --version)" >> pm2-test-log.txt
echo "PM2 version: $(pm2 --version)" >> pm2-test-log.txt
echo "" >> pm2-test-log.txt

# Run tests and capture output
npm run pm2-test >> pm2-test-log.txt 2>&1
```

### Test Report Template

```markdown
# PM2 Utilities Test Report

**Date**: YYYY-MM-DD
**Environment**: Development/Test
**Tester**: Name
**Node Version**: x.x.x
**PM2 Version**: x.x.x

## Tests Performed
- [ ] Safety test runner
- [ ] Platform configuration
- [ ] State save/restore
- [ ] Daemon restart
- [ ] Error handling

## Results
- Tests Passed: X/Y
- Issues Found: None/List issues
- Performance: Normal/Slow/Fast

## Recommendations
- Ready for staging use: Yes/No
- Issues to address: List any issues
- Additional testing needed: List if any
```

---

**Remember**: When in doubt, don't test in staging. Use the safe test runner or create an isolated environment.
