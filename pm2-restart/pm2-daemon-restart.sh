#!/bin/bash

# PM2 Daemon Restart with State Preservation
# This script stops all services, restarts PM2 daemon, and restores exact state

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_STATE_FILE="/tmp/pm2_state_before_restart_$(date +%s).json"

echo "=== PM2 Daemon Restart with State Preservation ==="
echo "Script directory: $SCRIPT_DIR"
echo "Temporary state file: $TEMP_STATE_FILE"
echo ""

# Step 1: Save current state
echo "Step 1: Saving current PM2 state..."
pm2 jlist | jq '[.[] | {pm_id: .pm_id, name: .name, status: .pm2_env.status}] | sort_by(.pm_id)' > "$TEMP_STATE_FILE"

# Show current state summary
online_count=$(jq -r '.[] | select(.status == "online") | .name' "$TEMP_STATE_FILE" | wc -l)
stopped_count=$(jq -r '.[] | select(.status == "stopped") | .name' "$TEMP_STATE_FILE" | wc -l)
total_count=$((online_count + stopped_count))

echo "Current state saved:"
echo "  - Online services: $online_count"
echo "  - Stopped services: $stopped_count"
echo "  - Total services: $total_count"
echo ""

# Step 2: Stop all services
echo "Step 2: Stopping all PM2 services..."
pm2 stop all
echo "All services stopped."
echo ""

# Step 3: Kill PM2 daemon
echo "Step 3: Killing PM2 daemon..."
pm2 kill
echo "PM2 daemon killed."
echo ""

# Step 4: Wait a moment for cleanup
echo "Step 4: Waiting for cleanup..."
sleep 3
echo ""

# Step 5: Resurrect all processes (this will restart PM2 daemon automatically)
echo "Step 5: Resurrecting all processes (PM2 daemon will restart automatically)..."
pm2 resurrect
echo "All processes resurrected."
echo ""

# Step 6: Restore exact state
echo "Step 6: Restoring exact service states (in launch order)..."

# Stop services that should be stopped, in PM2 ID order
echo "Stopping services that were previously stopped (in launch order)..."
jq -r '.[] | select(.status == "stopped") | "\(.pm_id):\(.name)"' "$TEMP_STATE_FILE" | sort -n | while IFS=':' read -r pm_id service; do
    if [ -n "$service" ]; then
        echo "  Stopping (ID $pm_id): $service"
        pm2 stop "$service" 2>/dev/null || echo "    Warning: Could not stop $service"
    fi
done

echo ""

# Step 7: Verify final state
echo "Step 7: Verifying final state..."
final_online=$(pm2 jlist | jq -r '.[] | select(.pm2_env.status == "online") | .name' | wc -l)
final_stopped=$(pm2 jlist | jq -r '.[] | select(.pm2_env.status == "stopped") | .name' | wc -l)
final_total=$((final_online + final_stopped))

echo "Final state:"
echo "  - Online services: $final_online"
echo "  - Stopped services: $final_stopped"
echo "  - Total services: $final_total"
echo ""

# Compare states
if [ "$online_count" -eq "$final_online" ] && [ "$stopped_count" -eq "$final_stopped" ]; then
    echo "✅ SUCCESS: State restored perfectly!"
    echo "   Original: $online_count online, $stopped_count stopped"
    echo "   Final:    $final_online online, $final_stopped stopped"
else
    echo "⚠️  WARNING: State mismatch detected!"
    echo "   Original: $online_count online, $stopped_count stopped"
    echo "   Final:    $final_online online, $final_stopped stopped"
    echo ""
    echo "Services that might have issues:"
    
    # Show differences
    echo "Expected to be stopped but are online:"
    jq -r '.[] | select(.status == "stopped") | .name' "$TEMP_STATE_FILE" | while read -r service; do
        if [ -n "$service" ]; then
            current_status=$(pm2 jlist | jq -r ".[] | select(.name == \"$service\") | .pm2_env.status")
            if [ "$current_status" = "online" ]; then
                echo "  - $service"
            fi
        fi
    done
fi

echo ""
echo "=== PM2 Daemon Restart Complete ==="
echo "Temporary state file saved at: $TEMP_STATE_FILE"
echo "You can remove it manually when no longer needed."
echo ""

# Show final PM2 status
echo "Current PM2 status:"
pm2 list
