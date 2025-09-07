#!/bin/bash

# Support Staging Monorepo - Unset Context Script
# Usage: source scripts/unset-context.sh
# or: . scripts/unset-context.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Run the Node.js script to restore configuration
echo "🔄 Restoring monorepo configuration..."
node "$SCRIPT_DIR/unset-context.js"

if [ $? -eq 0 ]; then
    # Change back to monorepo root
    cd "$ROOT_DIR"
    echo "📁 Changed directory to: $(pwd)"
    echo "🎯 Monorepo configuration restored!"
    echo ""
    echo "💡 Available commands:"
    echo "   - source scripts/set-context.sh <context>  # Set platform context"
    echo "   - npm run context-status                   # Check current context"
else
    echo "❌ Failed to unset context"
    return 1 2>/dev/null || exit 1
fi
