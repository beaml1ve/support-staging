#!/bin/bash

# Simple PM2 State Management
# Alternative approach using PM2 startup and save commands
# Platform-aware version - works with different platforms

# Get platform from command line or default to staging
PLATFORM="${1:-staging}"
if [[ "$1" =~ ^(save|restore|show|status)$ ]]; then
    PLATFORM="staging"
    COMMAND="$1"
    shift
else
    COMMAND="$2"
    shift 2
fi

# Set platform-specific paths
case "$PLATFORM" in
    "staging")
        PM2_HOME="/var/www/beamdevlive/.pm2"
        ;;
    *)
        echo "Error: Unknown platform '$PLATFORM'"
        echo "Supported platforms: staging"
        exit 1
        ;;
esac

echo "Using platform: $PLATFORM"
echo "PM2 home: $PM2_HOME"
echo ""

# Function to save current state
save_current_state() {
    echo "=== Saving Current PM2 State ==="
    
    # Create a custom state file with service names and their status
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    STATE_FILE="${PM2_HOME}/custom_state_${TIMESTAMP}.json"
    
    # Get current state in JSON format, ordered by PM2 ID (launch order)
    pm2 jlist | jq '[.[] | {pm_id: .pm_id, name: .name, status: .pm2_env.status}] | sort_by(.pm_id)' > "$STATE_FILE"
    
    # Also save the standard PM2 dump
    pm2 save
    
    echo "Custom state saved to: $STATE_FILE"
    echo "Standard PM2 dump saved to: ${PM2_HOME}/dump.pm2"
    
    # Create a symlink to the latest state
    ln -sf "$STATE_FILE" "${PM2_HOME}/latest_custom_state.json"
    
    echo "Latest state linked at: ${PM2_HOME}/latest_custom_state.json"
}

# Function to restore state
restore_state() {
    local state_file="${1:-${PM2_HOME}/latest_custom_state.json}"
    
    if [ ! -f "$state_file" ]; then
        echo "Error: State file not found: $state_file"
        echo "Available state files:"
        ls -la ${PM2_HOME}/custom_state_*.json 2>/dev/null || echo "No custom state files found"
        exit 1
    fi
    
    echo "=== Restoring PM2 State from: $state_file ==="
    
    # First, resurrect all processes (this will start them all)
    pm2 resurrect
    
    # Then adjust states based on saved state (in PM2 ID order)
    echo "Adjusting process states based on saved state (in launch order)..."
    
    # Read the state file and stop services that should be stopped, in PM2 ID order
    jq -r '.[] | select(.status == "stopped") | "\(.pm_id):\(.name)"' "$state_file" | sort -n | while IFS=':' read -r pm_id service; do
        if [ -n "$service" ]; then
            echo "Stopping service (ID $pm_id): $service"
            pm2 stop "$service"
        fi
    done
    
    echo "=== State restoration complete ==="
    pm2 list
}

# Function to show current state
show_state() {
    echo "=== Current PM2 State (in launch order) ==="
    pm2 jlist | jq -r '.[] | "\(.pm_id): \(.name): \(.pm2_env.status)"' | sort -n
    
    echo ""
    echo "=== Summary ==="
    local online_count=$(pm2 jlist | jq -r '.[] | select(.pm2_env.status == "online") | .name' | wc -l)
    local stopped_count=$(pm2 jlist | jq -r '.[] | select(.pm2_env.status == "stopped") | .name' | wc -l)
    
    echo "Online services: $online_count"
    echo "Stopped services: $stopped_count"
    echo "Total services: $((online_count + stopped_count))"
}

# Main script logic
case "$COMMAND" in
    "save")
        save_current_state
        ;;
    "restore")
        restore_state "$1"
        ;;
    "show"|"status")
        show_state
        ;;
    *)
        echo "Usage: $0 [platform] {save|restore [state_file]|show}"
        echo ""
        echo "Platforms:"
        echo "  staging                 - Staging environment (default)"
        echo ""
        echo "Commands:"
        echo "  save                    - Save current PM2 state"
        echo "  restore [state_file]    - Restore PM2 state (default: latest)"
        echo "  show                    - Show current PM2 state summary"
        echo ""
        echo "Examples:"
        echo "  $0 save                 - Save staging platform state"
        echo "  $0 staging save         - Save staging platform state"
        echo "  $0 restore              - Restore staging platform state"
        echo "  $0 staging restore      - Restore staging platform state"
        echo "  $0 show                 - Show staging platform state"
        exit 1
        ;;
esac
