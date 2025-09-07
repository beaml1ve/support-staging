#!/bin/bash

# Support Staging Monorepo - Set Context Script
# Usage: source scripts/set-context.sh <context-name> [--skip-install]
# or: . scripts/set-context.sh <context-name> [--skip-install]

CONTEXT_NAME="$1"
SKIP_INSTALL="$2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -z "$CONTEXT_NAME" ]; then
    # No context name provided - restore to monorepo root
    echo "🔄 Restoring monorepo configuration..."
    node "$SCRIPT_DIR/set-context.js" --restore-root
    
    if [ $? -eq 0 ]; then
        cd "$ROOT_DIR"
        echo "📁 Changed directory to: $(pwd)"
        echo "🎯 Monorepo configuration restored!"
        echo ""
        echo "💡 Available commands:"
        echo "   source scripts/set-context.sh <context>  # Set platform context"
        echo "   npm run context-status                   # Check current context"
        echo ""
        echo "📋 Available contexts:"
        if [ -d "$ROOT_DIR/platforms" ]; then
            for dir in "$ROOT_DIR/platforms"/*; do
                if [ -d "$dir" ]; then
                    basename "$dir" | sed 's/^/   - /'
                fi
            done
        fi
    else
        echo "❌ Failed to restore monorepo configuration"
        return 1 2>/dev/null || exit 1
    fi
    return 0 2>/dev/null || exit 0
fi

CONTEXT_PATH="$ROOT_DIR/platforms/$CONTEXT_NAME"

if [ ! -d "$CONTEXT_PATH" ]; then
    echo "❌ Context '$CONTEXT_NAME' not found at $CONTEXT_PATH"
    return 1 2>/dev/null || exit 1
fi

# Run the Node.js script to set up symlinks
echo "🔄 Setting up context configuration..."
node "$SCRIPT_DIR/set-context.js" "$CONTEXT_NAME"

if [ $? -eq 0 ]; then
    # Change to the context directory
    cd "$CONTEXT_PATH"
    echo "📁 Changed directory to: $(pwd)"
    
    # Install workspace dependencies (unless skipped)
    if [ "$SKIP_INSTALL" != "--skip-install" ]; then
        echo "📦 Installing workspace dependencies..."
        if [ -f "package.json" ]; then
            npm install
            if [ $? -eq 0 ]; then
                echo "✅ Dependencies installed successfully"
            else
                echo "⚠️  Warning: npm install failed, but continuing..."
            fi
        else
            echo "ℹ️  No package.json found, skipping npm install"
        fi
    else
        echo "⏭️  Skipping npm install (--skip-install flag used)"
    fi
    
    echo ""
    echo "🎯 Context '$CONTEXT_NAME' is now active!"
    echo ""
    echo "💡 Available commands:"
    echo "   - npm run unset-context    # Restore monorepo config"
    echo "   - npm run context-status   # Check current context"
    echo "   - cd ~/support-staging     # Return to monorepo root"
else
    echo "❌ Failed to set context"
    return 1 2>/dev/null || exit 1
fi
