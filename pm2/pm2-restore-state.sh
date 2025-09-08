#!/bin/bash

# PM2 State Restoration Script
# This script restores PM2 services to their exact previous state (online/stopped)

DUMP_FILE="/var/www/beamdevlive/.pm2/dump.pm2"
BACKUP_DIR="/var/www/beamdevlive/.pm2/backups"

# Function to save current state with timestamp
save_state() {
    echo "=== Saving PM2 State ==="
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Create timestamped backup
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="$BACKUP_DIR/dump_${TIMESTAMP}.pm2"
    
    # Save current state
    pm2 dump
    
    # Copy to timestamped backup
    cp "$DUMP_FILE" "$BACKUP_FILE"
    
    echo "State saved to: $BACKUP_FILE"
    echo "Current dump: $DUMP_FILE"
    
    # Also save a simple list for reference
    pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status)"' > "$BACKUP_DIR/services_state_${TIMESTAMP}.txt"
    echo "Service states saved to: $BACKUP_DIR/services_state_${TIMESTAMP}.txt"
}

# Function to restore state from dump file
restore_state() {
    local dump_file="${1:-$DUMP_FILE}"
    
    if [ ! -f "$dump_file" ]; then
        echo "Error: Dump file not found: $dump_file"
        echo "Available backups:"
        ls -la "$BACKUP_DIR"/*.pm2 2>/dev/null || echo "No backups found"
        exit 1
    fi
    
    echo "=== Restoring PM2 State from: $dump_file ==="
    
    # Stop all current processes
    echo "Stopping all current PM2 processes..."
    pm2 stop all
    
    # Delete all current processes
    echo "Deleting all current PM2 processes..."
    pm2 delete all
    
    # Restore from dump
    echo "Restoring processes from dump..."
    pm2 resurrect "$dump_file"
    
    # Now adjust the states based on what was saved
    echo "Adjusting process states..."
    
    # Extract service names and their states from the dump file
    node -e "
        const fs = require('fs');
        const dump = JSON.parse(fs.readFileSync('$dump_file', 'utf8'));
        
        dump.forEach(proc => {
            const name = proc.name;
            const status = proc.pm2_env ? proc.pm2_env.status : proc.status;
            
            if (status === 'stopped') {
                console.log('STOP:' + name);
            } else if (status === 'online') {
                console.log('START:' + name);
            }
        });
    " | while IFS=':' read -r action service; do
        if [ "$action" = "STOP" ]; then
            echo "Stopping service: $service"
            pm2 stop "$service" 2>/dev/null
        elif [ "$action" = "START" ]; then
            echo "Ensuring service is started: $service"
            pm2 start "$service" 2>/dev/null
        fi
    done
    
    echo "=== State restoration complete ==="
    pm2 list
}

# Function to list available backups
list_backups() {
    echo "=== Available PM2 State Backups ==="
    if [ -d "$BACKUP_DIR" ]; then
        ls -la "$BACKUP_DIR"/*.pm2 2>/dev/null | while read -r line; do
            file=$(echo "$line" | awk '{print $NF}')
            if [ -f "$file" ]; then
                timestamp=$(basename "$file" .pm2 | sed 's/dump_//')
                echo "Backup: $file (Created: $timestamp)"
                
                # Show service count and states
                if [ -f "${BACKUP_DIR}/services_state_${timestamp}.txt" ]; then
                    echo "  Services: $(wc -l < "${BACKUP_DIR}/services_state_${timestamp}.txt")"
                    echo "  States:"
                    grep -c ": online" "${BACKUP_DIR}/services_state_${timestamp}.txt" | xargs echo "    Online:"
                    grep -c ": stopped" "${BACKUP_DIR}/services_state_${timestamp}.txt" | xargs echo "    Stopped:"
                fi
                echo ""
            fi
        done
    else
        echo "No backups directory found"
    fi
}

# Main script logic
case "$1" in
    "save")
        save_state
        ;;
    "restore")
        restore_state "$2"
        ;;
    "list")
        list_backups
        ;;
    *)
        echo "Usage: $0 {save|restore [dump_file]|list}"
        echo ""
        echo "Commands:"
        echo "  save                    - Save current PM2 state with timestamp"
        echo "  restore [dump_file]     - Restore PM2 state from dump file (default: latest)"
        echo "  list                    - List available backup files"
        echo ""
        echo "Examples:"
        echo "  $0 save"
        echo "  $0 restore"
        echo "  $0 restore /path/to/specific/dump.pm2"
        echo "  $0 list"
        exit 1
        ;;
esac
