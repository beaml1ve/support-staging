#!/bin/bash

# Manual PM2 Daemon Restart Steps
# This script provides step-by-step commands for manual execution

echo "=== Manual PM2 Daemon Restart with State Preservation ==="
echo ""
echo "Follow these steps in order:"
echo ""

echo "1. Save current state:"
echo "   ./pm2-simple-state.sh save"
echo ""

echo "2. Stop all services:"
echo "   pm2 stop all"
echo ""

echo "3. Kill PM2 daemon:"
echo "   pm2 kill"
echo ""

echo "4. Wait for cleanup (optional):"
echo "   sleep 3"
echo ""

echo "5. Resurrect all processes (restarts daemon automatically):"
echo "   pm2 resurrect"
echo ""

echo "6. Restore exact state:"
echo "   ./pm2-simple-state.sh restore"
echo ""

echo "7. Verify state:"
echo "   ./pm2-simple-state.sh show"
echo ""

echo "=== Alternative: One-command execution ==="
echo "Run the automated script:"
echo "   ./pm2-daemon-restart.sh"
echo ""

echo "=== Important Notes ==="
echo "- 'pm2 kill' stops the PM2 daemon completely"
echo "- 'pm2 resurrect' automatically restarts the daemon and loads saved processes"
echo "- The state restoration ensures stopped services remain stopped"
echo "- Always save state before killing the daemon"
