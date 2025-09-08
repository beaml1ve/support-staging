# PM2 State Management and Daemon Restart Scripts

This folder contains platform-aware scripts for managing PM2 service states and performing daemon restarts while preserving the exact running state of services across different platforms.

## 📁 Scripts Overview

### 🔧 Core Scripts

| Script | Purpose | Recommended Use |
|--------|---------|-----------------|
| `pm2-simple-state.sh` | Simple state management | ✅ **Primary tool** for daily use |
| `pm2-daemon-restart.sh` | Automated daemon restart | ✅ **One-click** daemon restart |
| `pm2-restore-state.sh` | Advanced state management | 🔄 **Backup/restore** with timestamps |
| `pm2-manual-restart.sh` | Manual instructions | 📖 **Reference** for step-by-step process |

## 🚀 Quick Start

### Save Current State and Restart Daemon
```bash
# One command to do everything (defaults to staging platform)
./pm2-daemon-restart.sh

# Or specify platform explicitly
./pm2-daemon-restart.sh staging
```

### Manual Process
```bash
# 1. Save current state (defaults to staging)
./pm2-simple-state.sh save

# Or specify platform explicitly
./pm2-simple-state.sh staging save

# 2. Stop all services
pm2 stop all

# 3. Kill PM2 daemon
pm2 kill

# 4. Restore with exact same state
./pm2-simple-state.sh restore
# Or: ./pm2-simple-state.sh staging restore
```

## 📋 Detailed Usage

### `pm2-simple-state.sh` - Primary Tool

**Save current state:**
```bash
./pm2-simple-state.sh save                    # Default to staging
./pm2-simple-state.sh staging save            # Explicit platform
```
- Saves service states with PM2 ID order (launch order)
- Creates timestamped backup in platform-specific location
- Links to `latest_custom_state.json`

**Restore state:**
```bash
./pm2-simple-state.sh restore [state_file]    # Default to staging
./pm2-simple-state.sh staging restore         # Explicit platform
```
- Restores services in PM2 ID order
- Maintains exact online/stopped status
- Uses latest state if no file specified

**Show current state:**
```bash
./pm2-simple-state.sh show                    # Default to staging
./pm2-simple-state.sh staging show            # Explicit platform
```
- Displays services in launch order (PM2 ID: 0, 1, 2...)
- Shows format: `ID: service-name: status`
- Provides summary statistics

### `pm2-daemon-restart.sh` - Automated Restart

**Full daemon restart:**
```bash
./pm2-daemon-restart.sh
```

**Process:**
1. ✅ Saves current state
2. 🛑 Stops all services
3. 💀 Kills PM2 daemon
4. ⏳ Waits for cleanup
5. 🔄 Resurrects all processes
6. 🎯 Restores exact state
7. ✔️ Verifies result

### `pm2-restore-state.sh` - Advanced Management

**Save with timestamp:**
```bash
./pm2-restore-state.sh save
```

**List backups:**
```bash
./pm2-restore-state.sh list
```

**Restore from specific backup:**
```bash
./pm2-restore-state.sh restore /path/to/backup.pm2
```

## 🎯 Key Features

### ✨ Launch Order Preservation
- Services are processed in **PM2 ID order** (0, 1, 2, 3...)
- Maintains the exact sequence services were originally launched
- Consistent behavior across restarts

### 🔄 State Preservation
- **Online services** remain online after restart
- **Stopped services** remain stopped after restart
- No manual intervention needed

### 📊 Current System State
Your system currently has:
- **Online services:** ~84
- **Stopped services:** ~138
- **Total services:** ~222

### 🗂️ File Locations

**Staging Platform:**
- **State files:** `/var/www/beamdevlive/.pm2/custom_state_*.json`
- **Latest state:** `/var/www/beamdevlive/.pm2/latest_custom_state.json`
- **PM2 dump:** `/var/www/beamdevlive/.pm2/dump.pm2`
- **Backups:** `/var/www/beamdevlive/.pm2/backups/`

**Other Platforms:**
- Platform-specific paths will be configured as needed

## 🔍 Troubleshooting

### Common Issues

**State mismatch after restore:**
```bash
# Check differences
./pm2-simple-state.sh show
# Re-run restore if needed
./pm2-simple-state.sh restore
```

**PM2 daemon not responding:**
```bash
# Force kill and restart
pm2 kill
pm2 resurrect
./pm2-simple-state.sh restore
```

**Missing state file:**
```bash
# List available backups
./pm2-restore-state.sh list
# Restore from specific backup
./pm2-restore-state.sh restore /path/to/backup
```

## 📝 Examples

### Daily Maintenance Workflow
```bash
# Save current state
./pm2-simple-state.sh save

# Perform maintenance (updates, config changes, etc.)
# ...

# Restart daemon with exact same state
./pm2-daemon-restart.sh
```

### Emergency Recovery
```bash
# If PM2 is completely broken
pm2 kill
pm2 resurrect
./pm2-simple-state.sh restore

# Verify everything is back to normal
./pm2-simple-state.sh show
```

### Before System Reboot
```bash
# Save state before reboot
./pm2-simple-state.sh save

# After reboot, restore exact state
./pm2-simple-state.sh restore
```

## ⚠️ Important Notes

1. **Always save state** before making major changes
2. **PM2 ID order** is preserved (launch sequence: 0, 1, 2, 3...)
3. **Stopped services** will remain stopped after restoration
4. **State files** are timestamped for easy identification
5. **Backup files** are kept for recovery purposes

## 🔧 Requirements

- **PM2** installed and configured
- **jq** for JSON processing
- **Bash** shell environment
- **Write permissions** to `/var/www/beamdevlive/.pm2/`

## 📞 Support

If you encounter issues:
1. Check the script output for error messages
2. Verify PM2 is running: `pm2 status`
3. Check state files exist: `ls -la /var/www/beamdevlive/.pm2/custom_state_*.json`
4. Use manual instructions: `./pm2-manual-restart.sh`

---

**Created:** $(date)  
**Location:** `/var/www/beamdevlive/support/pm2-restart/`  
**System:** Beam Development Environment

