# Session Management Utilities

Centralized session management system for support staging environments.

## Overview

This directory provides session management utilities that can be used across all platforms in the support-staging monorepo. Sessions provide structured documentation, context isolation, and comprehensive tracking for all support work.

## Features

- **Platform-agnostic**: Works with any platform in the monorepo
- **Structured Documentation**: Auto-generated session summaries and chat history
- **Context Isolation**: Each session has its own rules and environment
- **Session Continuation**: Chat history and context for resuming work
- **Comprehensive Tracking**: Metadata, duration, and status tracking

## Installation

Session utilities are part of the root workspace and require no separate installation.

## Usage

### Basic Commands

```bash
# Open a new session (defaults to staging platform)
npm run open-session "session-name"

# Open a session for a specific platform
npm run open-session "session-name" staging

# Check current session status
npm run session-status

# List all sessions
npm run list-sessions

# Close active session
npm run close-session
```

### Session Workflow

1. **Open Session**
   ```bash
   npm run open-session "redis-performance-issue"
   ```

2. **Work in Session**
   - Use session-specific `.cursorrules` file
   - Document work in `session-notes.md`
   - Follow session-specific environment

3. **Close Session**
   ```bash
   npm run close-session
   ```

## Session Structure

Each session creates the following structure:

```
session-logs/YYYY-MM-DD_HH-MM-SS_session-name/
├── .cursorrules           # Session-specific rules (editable)
├── session-notes.md       # Manual notes and observations
├── chat-history.md        # Chat history for continuation
├── session-summary.md     # Auto-generated comprehensive summary
├── session-chat-prompt.md # Context for new AI chats
└── session-metadata.json # Session tracking data
```

## Platform Integration

### From Platform Workspaces

When working in a platform workspace (e.g., `platforms/staging/`), you can use the centralized session utilities:

```bash
# Add to platform package.json scripts:
{
  "scripts": {
    "open-session": "node ../../session/scripts/open-session.js",
    "close-session": "node ../../session/scripts/close-session.js",
    "session-status": "node ../../session/scripts/session-status.js",
    "list-sessions": "node ../../session/scripts/list-sessions.js"
  }
}
```

### Session Files Location

Sessions are created in the platform's directory:
- **Staging**: `platforms/staging/session-logs/`
- **Other platforms**: `platforms/{platform}/session-logs/`

## Session Best Practices

1. **Always Start with a Session**: Every support task should begin with opening a session
2. **Descriptive Names**: Use clear, descriptive session names
3. **Document Everything**: Use `session-notes.md` to track all actions and decisions
4. **Session-Specific Rules**: Modify `.cursorrules` for session-specific requirements
5. **Close Properly**: Always close sessions to generate documentation

## Scripts Reference

### open-session.js

Creates a new session with structured documentation.

**Usage**: `node scripts/open-session.js <session-name> [platform]`

**Features**:
- Generates unique session ID with timestamp
- Creates session folder structure
- Copies platform rules as starting point
- Creates session documentation templates
- Sets up chat context for AI assistants

### close-session.js

Closes active session and generates comprehensive documentation.

**Usage**: `node scripts/close-session.js [platform]`

**Features**:
- Updates session metadata with end time and duration
- Generates session summary from notes
- Creates chat history template
- Archives session rules
- Clears active session marker

### session-status.js

Displays current session status and details.

**Usage**: `node scripts/session-status.js [platform]`

**Features**:
- Shows active session information
- Displays session duration
- Lists available session files
- Provides next step commands

### list-sessions.js

Lists all sessions for a platform with summary information.

**Usage**: `node scripts/list-sessions.js [platform]`

**Features**:
- Shows all sessions sorted by date (newest first)
- Displays session status (active/closed)
- Shows session metadata and duration
- Provides session statistics

## Integration with AI Assistants

Each session creates a `session-chat-prompt.md` file that provides complete context for AI assistants:

1. **Session Context**: Objective, platform, and environment details
2. **File Structure**: Available session files and their purposes
3. **Rules Reference**: Session-specific rules and guidelines
4. **Command Reference**: Available session management commands

To use with AI assistants:
1. Copy content from `session-chat-prompt.md`
2. Paste into new AI chat/conversation
3. AI will have full session context and can help with documentation

## Migration from Platform-Specific Scripts

If migrating from platform-specific session scripts:

1. **Update package.json scripts** to point to centralized utilities
2. **Existing sessions remain** in platform directories
3. **No data loss** - all existing session data is preserved
4. **Enhanced functionality** with platform-agnostic design

## Development

### Adding New Features

1. Create new script in `scripts/` directory
2. Add corresponding npm script to `package.json`
3. Update README with usage instructions
4. Test across different platforms

### Testing

```bash
# Test session creation
npm run open-session "test-session" staging

# Test session status
npm run session-status staging

# Test session listing
npm run list-sessions staging

# Test session closure
npm run close-session staging
```

## Troubleshooting

### Common Issues

1. **No active session found**
   - Use `npm run open-session <name>` to start a new session

2. **Session folder missing**
   - Session utilities will clean up orphaned active session files automatically

3. **Platform not found**
   - Ensure platform directory exists in `platforms/` folder
   - Check platform name spelling

### Debug Information

Session utilities provide detailed output including:
- Session folder paths
- File creation status
- Error messages with suggested solutions
- Next step recommendations

## License

MIT License - Part of the support-staging monorepo.
