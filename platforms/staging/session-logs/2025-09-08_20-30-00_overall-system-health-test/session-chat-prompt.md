# Session Chat Context

**Session ID**: 2025-09-08_20-30-00_overall-system-health-test  
**Session Name**: overall-system-health-test  
**Platform**: staging  
**Started**: 2025-09-08T20:30:00.000Z

## Session Context for AI Assistant

This is a dedicated support session with the following context:

### Session Objective
Working on: overall-system-health-test

### Session Environment
- **Platform**: Staging environment (beamdevlive ecosystem)
- **Infrastructure**: Redis BDS, PostgreSQL, Apache2, PM2 microservices
- **Session Folder**: `/home/viktor/support-staging/platforms/staging/session-logs/2025-09-08_20-30-00_overall-system-health-test`
- **Session Rules**: Available in `.cursorrules` file in this session folder

### Session Files
- **`.cursorrules`**: Session-specific rules (copied from platform, editable)
- **`session-notes.md`**: Manual documentation and observations
- **`chat-history.md`**: This conversation for continuation
- **`session-metadata.json`**: Session tracking data

### Instructions for AI Assistant
1. **Context Awareness**: This is session 2025-09-08_20-30-00_overall-system-health-test focused on: overall-system-health-test
2. **Documentation**: Help document all actions in session-notes.md
3. **Session Rules**: Follow the .cursorrules file in this session folder
4. **File Management**: All session work should reference this session folder
5. **Continuation**: This chat history will be saved for session continuation
6. **Slack Integration**: Session summaries will be sent to Slack when closed (if configured)

### Session Commands Available
- `npm run close-session` - Close this session and generate documentation (+ Slack notification)
- `npm run session-status` - Check current session status
- `cd ../../ && npm run slack-test` - Test Slack integration (slack-webhook workspace)
- Edit session files as needed for this specific support work

---
**Ready to begin session work. Please confirm you understand the session context.**
