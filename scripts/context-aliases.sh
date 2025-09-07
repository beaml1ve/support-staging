#!/bin/bash

# Support Staging Monorepo - Context Aliases
# Usage: source scripts/context-aliases.sh
# This creates convenient aliases for context switching

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create aliases for context switching
alias set-context='source "$SCRIPT_DIR/set-context.sh"'
alias context-status='npm run context-status'

echo "🎯 Context aliases loaded:"
echo "   set-context <name>              # Set platform context, cd to platform, and npm install"
echo "   set-context <name> --skip-install  # Set context without npm install"
echo "   set-context                     # Restore monorepo root configuration"
echo "   context-status                  # Show current context status"
echo ""
echo "📋 Available contexts:"
if [ -d "$SCRIPT_DIR/../platforms" ]; then
    for dir in "$SCRIPT_DIR/../platforms"/*; do
        if [ -d "$dir" ]; then
            basename "$dir" | sed 's/^/   - /'
        fi
    done
fi
