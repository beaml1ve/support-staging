#!/bin/bash

echo "🚀 Sending closed sessions to Slack..."
echo ""

# Find all session directories with summaries
sessions=($(find platforms/*/session-logs -name "session-summary.md" -type f | xargs dirname | sort))

echo "📋 Found ${#sessions[@]} sessions to send:"
for session in "${sessions[@]}"; do
    session_name=$(basename "$session")
    echo "  • $session_name"
done
echo ""

# Check if dry run mode
if [ "$1" = "--dry-run" ]; then
    echo "🧪 DRY RUN MODE - Testing what would be sent:"
    export SLACK_DRY_RUN=true
fi

# Send each session
for session in "${sessions[@]}"; do
    session_name=$(basename "$session")
    echo "📤 Sending: $session_name"
    
    if npm run slack-notify "$session" 2>/dev/null; then
        echo "✅ Sent: $session_name"
    else
        echo "❌ Failed: $session_name"
    fi
    echo ""
    
    # Rate limiting - wait 2 seconds between sends
    sleep 2
done

echo "🎉 Batch send completed!"
