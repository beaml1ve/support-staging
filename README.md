# Support Staging Monorepo

A comprehensive npm workspace-based monorepo for managing multiple staging environments with platform-specific configurations, session management, and structured documentation.

## 🏗️ Architecture Overview

This monorepo enforces structured workflows through:
- **Context Switching**: Platform-specific work environments
- **Session Management**: Isolated support sessions with dedicated documentation
- **Rules Protection**: Prevents accidental modification of critical configuration files
- **Workspace Isolation**: Complete separation between different platforms

```
support-staging/                 # Root monorepo
├── package.json                # Root workspace configuration
├── .cursor/                    # Root MCP settings
├── .cursorrules               # Monorepo rules and constraints
├── scripts/                   # Management scripts
│   ├── set-context.sh         # Context switching
│   ├── context-aliases.sh     # Convenient aliases
│   └── protect-rules.js       # Rules protection
└── platforms/                 # Platform workspaces
    └── staging/               # Staging platform
        ├── .cursor/           # Platform MCP settings
        ├── .cursorrules       # Platform-specific rules
        ├── scripts/           # Session management
        ├── session-logs/      # Support documentation
        └── pm2-restart/       # Platform tools
```

## 🚀 Quick Start

### 1. Initial Setup
```bash
# Clone the repository
git clone https://github.com/beaml1ve/support-staging.git
cd support-staging

# Install dependencies for all workspaces
npm run install:all

# Load convenient aliases (optional)
source scripts/context-aliases.sh
```

### 2. Start Working on a Platform
```bash
# Set context to staging platform (required for all work)
source scripts/set-context.sh staging

# This will:
# - Switch to staging-specific configuration
# - Change directory to platforms/staging/
# - Install platform dependencies
# - Enable platform-specific rules and MCP settings
```

### 3. Open a Support Session
```bash
# Create a new support session (now in platforms/staging/)
npm run open-session "redis-performance-issue"

# This creates:
# - Dedicated session folder with timestamp
# - Session-specific .cursorrules (editable)
# - Session notes template
# - Chat context prompt for AI assistant
# - Metadata tracking
```

### 4. Work in Session Context
```bash
# Check session status
npm run session-status

# List all sessions
npm run list-sessions

# Edit session files as needed:
# - session-notes.md (document your work)
# - .cursorrules (modify rules for this session)
```

### 5. Close Session and Generate Documentation
```bash
# Close session and auto-generate documentation
npm run close-session

# This generates:
# - Comprehensive session summary
# - Chat history template for continuation
# - Archived session rules
# - Updated metadata with duration
```

### 6. Return to Root Context
```bash
# Return to monorepo root
source scripts/set-context.sh

# Or using aliases:
set-context  # (no arguments)
```

## 📋 Core Commands Reference

### Context Management
```bash
# Set platform context (MANDATORY for all work)
source scripts/set-context.sh staging
source scripts/set-context.sh staging --skip-install  # Skip npm install

# Load convenient aliases
source scripts/context-aliases.sh
set-context staging    # Short alias
set-context           # Return to root

# Check current context
npm run context-status
```

### Session Management (in platform workspace)
```bash
# Session operations
npm run open-session "session-name"
npm run close-session
npm run session-status
npm run list-sessions
```

### Rules Protection
```bash
# Protect rules from accidental modification
npm run protect-rules root
npm run protect-rules staging
npm run protect-rules all

# Allow modification
npm run unprotect-rules root
npm run unprotect-rules staging

# Check protection status
npm run rules-status
```

## 💡 Practical Examples

### Example 1: Redis Performance Investigation

```bash
# 1. Set context to staging
source scripts/set-context.sh staging
# ✅ Now in platforms/staging/ with staging-specific config

# 2. Open dedicated session
npm run open-session "redis-bds-high-memory-usage"
# ✅ Session folder created with timestamp and context

# 3. Start new AI chat using session-chat-prompt.md
# Copy content from session-chat-prompt.md to new chat
# AI now has full context of this specific session

# 4. Document work in session-notes.md
# Edit session-notes.md to track:
# - Commands executed
# - Files modified
# - Observations
# - Next steps

# 5. Modify session rules if needed
# Edit .cursorrules in session folder for session-specific rules

# 6. Close session when done
npm run close-session
# ✅ Auto-generates comprehensive documentation

# 7. Return to root
source scripts/set-context.sh
```

### Example 2: PM2 Microservices Restart

```bash
# 1. Context switching with aliases
source scripts/context-aliases.sh
set-context staging

# 2. Open session for microservices work
npm run open-session "pm2-restart-after-server-reboot"

# 3. Use platform-specific tools
cd pm2-restart/
./pm2-daemon-restart.sh

# 4. Document the process
# Update session-notes.md with:
# - Services restarted
# - Issues encountered
# - Resolution steps
# - Performance metrics

# 5. Close and document
npm run close-session
set-context  # Return to root
```

### Example 3: Multi-Session Complex Issue

```bash
# Day 1: Initial investigation
set-context staging
npm run open-session "database-connection-timeouts-investigation"
# ... work on initial analysis ...
npm run close-session

# Day 2: Continue investigation
set-context staging
npm run open-session "database-connection-timeouts-solution"
# Reference previous session folder for context
# Use previous session's chat-history.md for continuation
# ... implement solution ...
npm run close-session

# Day 3: Verification and monitoring
set-context staging
npm run open-session "database-connection-timeouts-verification"
# ... verify fix and monitor ...
npm run close-session
```

### Example 4: Team Handoff

```bash
# Team Member A completes initial work
set-context staging
npm run open-session "ssl-certificate-renewal"
# ... work documented in session ...
npm run close-session

# Team Member B continues the work
set-context staging
# Review previous session documentation
ls session-logs/
cat session-logs/2025-09-07_14-30-15_ssl-certificate-renewal/session-summary.md

# Start new session with context
npm run open-session "ssl-certificate-renewal-completion"
# Reference previous session folder
# Use session-chat-prompt.md for AI context
# ... complete the work ...
npm run close-session
```

## 🔐 Security and Safety Features

### Rules Protection System
```bash
# Protect critical configuration files
npm run protect-rules all
# ✅ .cursorrules files become read-only
# ✅ Protection markers created
# ✅ File integrity checksums stored

# Work safely
npm run unprotect-rules staging  # Only when needed
# ... make changes ...
npm run protect-rules staging    # Re-protect immediately
```

### Context Enforcement
- **CRITICAL**: No operations allowed in root context
- All platform work must be done within platform context
- Automatic configuration isolation
- Prevents accidental cross-platform contamination

### Session Isolation
- Each session has its own rules and documentation
- Session-specific configurations don't affect others
- Complete audit trail for all support work
- Easy session continuation and handoff

## 📊 Session Documentation Structure

Each session creates a comprehensive documentation package:

```
session-logs/2025-09-07_14-30-15_session-name/
├── .cursorrules           # Session-specific rules (archived)
├── session-notes.md       # Manual documentation
├── session-chat-prompt.md # AI chat context
├── chat-history.md        # Conversation continuation
├── session-summary.md     # Auto-generated summary
└── session-metadata.json # Tracking data
```

### Session Notes Template
```markdown
# Session Notes: session-name

**Session ID**: 2025-09-07_14-30-15_session-name
**Started**: 2025-09-07T14:30:15.000Z
**Platform**: staging

## Objective
[Main goal of this session]

## Key Actions
- [ ] Initial assessment
- [ ] Problem identification
- [ ] Solution implementation
- [ ] Verification and testing

## Commands Executed
[Track important commands and results]

## Files Modified
[List files changed during session]

## Next Steps
[What needs to be done next]
```

## 🛠️ Advanced Features

### Workspace Management
```bash
# Install dependencies across all workspaces
npm run install:all

# Run commands across workspaces
npm run build --workspaces
npm run test --workspaces
npm run lint --workspaces

# Clean all workspaces
npm run clean --workspaces
```

### Git Workflow
```bash
# Always commit from root level
cd ~/support-staging
git add .
git commit -m "feat(staging): description of changes"
git push origin main
```

### Platform Extension
```bash
# Add new platform
mkdir -p platforms/production
cd platforms/production

# Create platform-specific files
# - package.json
# - .cursor/mcp_settings.json
# - .cursorrules
# - scripts/

# Update root configuration
# - Add to workspaces in root package.json
# - Update context switching scripts
```

## 🔧 Troubleshooting

### Common Issues

**Context Not Set**
```bash
# Error: Operations rejected in root context
# Solution: Set platform context first
source scripts/set-context.sh staging
```

**Rules Protected**
```bash
# Error: Cannot modify .cursorrules
# Solution: Unprotect temporarily
npm run unprotect-rules staging
# ... make changes ...
npm run protect-rules staging
```

**Session Issues**
```bash
# Check active session
npm run session-status

# List all sessions
npm run list-sessions

# Force close if needed
rm .active-session
```

**Workspace Issues**
```bash
# Reinstall dependencies
npm run clean --workspaces
npm run install:all

# Check workspace structure
npm ls --workspaces
ls -la platforms/*/
```

## 📚 Best Practices

1. **Always Set Context**: Never work in root context
2. **Use Session Management**: All support work in dedicated sessions
3. **Document Everything**: Use session-notes.md actively
4. **Protect Rules**: Keep rules protected when not editing
5. **Commit from Root**: Maintain monorepo integrity
6. **Use Chat Context**: Start new chats with session-chat-prompt.md
7. **Close Sessions**: Always close sessions to generate documentation

## 🤝 Contributing

1. Follow the context switching workflow
2. Use session management for all changes
3. Document work in session notes
4. Commit from root level with descriptive messages
5. Protect rules after modifications

## 📞 Support

For questions about this monorepo system:
1. Check session documentation in `session-logs/`
2. Review platform-specific `.cursorrules`
3. Use session management for structured investigation
4. Reference this README for workflow guidance

---

**Remember**: This monorepo enforces structured workflows for safety and consistency. Always use context switching and session management for the best experience! 🚀
