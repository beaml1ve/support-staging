# PM2 Manager - JavaScript Implementation

Modern JavaScript implementation of comprehensive PM2 management utilities including state management, service control, and daemon restart using the PM2 API.

## 🚀 Features

- **Native PM2 API**: Direct integration with PM2 programmatic API
- **Platform Auto-Detection**: Automatically detects platform from sparse checkout configuration
- **Platform-Aware**: Supports multiple platforms with isolated state storage
- **Complete Service Management**: Start, stop, restart, reload individual services
- **Multiple Service Operations**: Manage multiple services simultaneously
- **Better Error Handling**: Comprehensive error handling and recovery
- **Rich Output**: Detailed status information with emojis and formatting
- **State Validation**: Automatic verification of state restoration
- **Service Information**: Detailed service info with metrics, timestamps, and log files
- **Log Integration**: PM2 daemon-based log detection with recent entries display
- **Rotated Logs Support**: Automatic detection and listing of gzipped rotated log files (.gz)
- **Async/Await**: Modern JavaScript with proper async handling

## 📁 Scripts Overview

### 🔧 Core Scripts

| Script | Purpose | Implementation |
|--------|---------|----------------|
| `pm2-manager.js` | Complete PM2 management | ✅ **JavaScript/PM2 API** |
| `pm2-daemon-restart.js` | Automated daemon restart | ✅ **JavaScript/PM2 API** |
| `pm2-test-runner.js` | Safe testing without PM2 | ✅ **JavaScript/Safe Testing** |

## 🎯 Platform Auto-Detection

The PM2 utilities automatically detect the active platform by scanning the `platforms/` directory:

- **Single Platform**: If only one platform directory exists, it's automatically selected
- **Multiple Platforms**: Defaults to `staging` if available, otherwise uses the first found
- **Sparse Checkout Aware**: Works seamlessly with sparse checkout configurations
- **Override Available**: Can be explicitly overridden by specifying platform as first argument

**Detection Logic:**
```bash
# Auto-detection examples
node pm2-manager.js show                     # Uses detected platform
node pm2-daemon-restart.js                  # Uses detected platform

# Override examples  
node pm2-manager.js staging show             # Forces staging platform
node pm2-daemon-restart.js production       # Forces production platform
```

## 🚀 Quick Start

### Save Current State and Restart Daemon
```bash
# One command to do everything (defaults to staging platform)
node pm2-restart/scripts/pm2-daemon-restart.js

# Or specify platform explicitly
node pm2-restart/scripts/pm2-daemon-restart.js staging
```

### Manual Process
```bash
# 1. Save current state (defaults to staging)
node pm2-restart/scripts/pm2-state-manager.js save

# Or specify platform explicitly
node pm2-restart/scripts/pm2-state-manager.js staging save

# 2. Restore with exact same state
node pm2-restart/scripts/pm2-state-manager.js restore
```

## 📋 Detailed Usage

### `pm2-manager.js` - Complete PM2 Management

**State Management:**
```bash
node pm2-manager.js save                    # Save current state (auto-detected platform)
node pm2-manager.js staging save            # Explicit platform override
node pm2-manager.js save backup-name        # Custom backup name
node pm2-manager.js restore                 # Restore latest state
node pm2-manager.js restore /path/to/state  # Specific state file
node pm2-manager.js show                    # Show current state
node pm2-manager.js list                    # List available states
```

**Service Management:**
```bash
node pm2-manager.js start cudb-test-dev     # Start a service (auto-detected platform)
node pm2-manager.js stop org-notaxi-dev     # Stop a service
node pm2-manager.js restart bds-dev         # Restart a service
node pm2-manager.js reload api-admin-core-dev # Reload (zero-downtime)
node pm2-manager.js info cudb-test-dev      # Get detailed service info with logs
```

**Multiple Service Management:**
```bash
node pm2-manager.js manage restart bds-dev bds2-dev custom-bds-dev  # Auto-detected platform
node pm2-manager.js manage stop org-test-dev org-test010-dev
node pm2-manager.js manage start cudb-test-dev cudb-test03-dev
```

**Service Information with Logs:**
```bash
node pm2-manager.js info cudb-test-dev      # Complete service details including:
                                            # - Process status and metrics
                                            # - Log file paths and sizes
                                            # - Recent log entries (last 10 lines)
                                            # - Both output and error logs
```

**Log Integration Features:**
- **PM2 Daemon Integration**: Uses PM2 daemon to retrieve actual log file paths via `service.pm2_env.pm_out_log_path` and `service.pm2_env.pm_err_log_path`
- **Automatic Detection**: Finds log files using PM2 naming conventions with fallback support
- **Rotated Log Files**: Detects and lists gzipped rotated log files (.gz) from log rotation
- **Multiple Formats**: Supports both service-name and PM-ID based log files
- **File Information**: Shows log file sizes and modification times for current and rotated logs
- **Recent Entries**: Displays last 10 lines from both output and error logs
- **Large File Handling**: Efficiently reads from end of large log files
- **Historical Logs**: Lists up to 5 most recent rotated log files with sizes and ages
- **Error Handling**: Graceful handling of missing or inaccessible log files

### `pm2-daemon-restart.js` - Automated Daemon Restart

**Full daemon restart:**
```bash
node pm2-daemon-restart.js                        # Auto-detected platform
node pm2-daemon-restart.js staging                # Explicit platform override
node pm2-daemon-restart.js production             # Override auto-detection
```

**Process:**
1. ✅ Saves current state to temporary file
2. 🛑 Stops all services
3. 💀 Kills PM2 daemon
4. ⏳ Waits for cleanup (3 seconds)
5. 🔄 Resurrects all processes (daemon auto-starts)
6. 🎯 Restores exact state (stops services that were stopped)
7. ✔️ Verifies result and shows comparison

## 🎯 Key Features

### ✨ Launch Order Preservation
- Services are processed in **PM2 ID order** (0, 1, 2, 3...)
- Maintains the exact sequence services were originally launched
- Consistent behavior across restarts

### 🔄 State Preservation
- **Online services** remain online after restart
- **Stopped services** remain stopped after restart
- **Automatic verification** of state restoration
- **Detailed comparison** of before/after states

### 📊 Rich Status Display
- **Visual indicators**: 🟢 Online, 🔴 Stopped, 🟡 Errored
- **Memory usage**: Real-time memory consumption
- **Uptime information**: Formatted uptime display
- **Process details**: PM2 ID, name, status, memory, uptime

### 🗂️ File Locations

**Staging Platform:**
- **State files:** `/var/www/beamdevlive/.pm2/custom_state_*.json`
- **Latest state:** `/var/www/beamdevlive/.pm2/latest_custom_state.json`
- **PM2 dump:** `/var/www/beamdevlive/.pm2/dump.pm2`
- **Temp files:** `/tmp/pm2_daemon_restart_*.json`

**Other Platforms:**
- Platform-specific paths configured in `PM2StateManager` class

## 🔧 NPM Scripts Integration

### Root Package Scripts
```bash
npm run pm2-save-state          # Save staging state
npm run pm2-restore-state       # Restore staging state
npm run pm2-show-state          # Show staging state
npm run pm2-list-states         # List staging state files
npm run pm2-daemon-restart      # Restart staging daemon
```

### Platform Package Scripts
```bash
cd platforms/staging
npm run pm2-save-state          # Save staging state
npm run pm2-restore-state       # Restore staging state
npm run pm2-show-state          # Show staging state
npm run pm2-list-states         # List staging state files
npm run pm2-daemon-restart      # Restart staging daemon
```

## 🔍 Error Handling

### Comprehensive Error Management
- **Connection errors**: Automatic PM2 connection management
- **Process errors**: Graceful handling of individual process failures
- **File system errors**: Proper handling of state file operations
- **Cleanup on failure**: Automatic cleanup of temporary files

### Recovery Procedures
```bash
# If PM2 connection fails
node pm2-state-manager.js show  # Check PM2 status

# If state restoration fails
node pm2-state-manager.js list  # List available states
node pm2-state-manager.js restore /path/to/specific/state

# If daemon restart fails
pm2 kill                        # Manual daemon kill
pm2 resurrect                   # Manual resurrection
node pm2-state-manager.js restore  # Restore state manually
```

## 📝 Examples

### Daily Maintenance Workflow
```bash
# Save current state
node pm2-state-manager.js save daily-backup

# Perform maintenance (updates, config changes, etc.)
# ...

# Restart daemon with exact same state
node pm2-daemon-restart.js

# Verify everything is back to normal
node pm2-state-manager.js show
```

### Emergency Recovery
```bash
# If PM2 is completely broken
pm2 kill
pm2 resurrect
node pm2-state-manager.js restore

# Verify everything is back to normal
node pm2-state-manager.js show
```

### Before System Reboot
```bash
# Save state before reboot
node pm2-state-manager.js save pre-reboot-backup

# After reboot, restore exact state
node pm2-state-manager.js restore
```

## 🔧 Platform Configuration

### Adding New Platforms

Edit `pm2-state-manager.js` to add new platform configurations:

```javascript
getPlatformConfig(platform) {
  const configs = {
    staging: {
      pm2Home: '/var/www/beamdevlive/.pm2',
      name: 'Staging Environment'
    },
    production: {
      pm2Home: '/var/www/production/.pm2',
      name: 'Production Environment'
    }
    // Add more platforms here
  };
  // ...
}
```

## ⚠️ Important Notes

1. **PM2 API Dependency**: Requires `pm2` npm package
2. **Node.js Version**: Requires Node.js >= 14.0.0
3. **Permissions**: Requires permissions to manage PM2 processes
4. **State Files**: Timestamped for easy identification
5. **Temporary Files**: Cleaned up automatically on success
6. **Platform Isolation**: Each platform has its own state storage

## 🔧 Requirements

- **Node.js** >= 14.0.0
- **PM2** npm package (^5.3.0)
- **Write permissions** to platform-specific PM2 directories
- **PM2 daemon** running and accessible

## 📞 Troubleshooting

### Common Issues

1. **PM2 connection failed**
   ```bash
   # Check PM2 status
   pm2 status
   # Restart PM2 daemon
   pm2 kill && pm2 resurrect
   ```

2. **State file not found**
   ```bash
   # List available states
   node pm2-state-manager.js list
   # Use specific state file
   node pm2-state-manager.js restore /path/to/state.json
   ```

3. **Permission denied**
   ```bash
   # Check PM2 home permissions
   ls -la /var/www/beamdevlive/.pm2/
   # Fix permissions if needed
   sudo chown -R $USER:$USER /var/www/beamdevlive/.pm2/
   ```

### Debug Information

Both scripts provide detailed output including:
- Platform and configuration information
- Step-by-step process execution
- Before/after state comparisons
- Error messages with suggested solutions
- File paths and locations

## 🆚 Advantages over Bash Implementation

1. **Better Error Handling**: Comprehensive try/catch with meaningful messages
2. **Rich Output**: Colored output with emojis and detailed formatting
3. **State Validation**: Automatic verification of restoration success
4. **Memory Management**: Proper cleanup of resources and connections
5. **Extensibility**: Easy to add new features and platforms
6. **Maintainability**: Modern JavaScript with clear structure
7. **API Integration**: Direct PM2 API usage instead of CLI parsing

---

**Implementation**: JavaScript with PM2 API  
**Location**: `/home/viktor/support-staging/pm2-restart/scripts/`  
**Platform**: Multi-platform support with staging default
