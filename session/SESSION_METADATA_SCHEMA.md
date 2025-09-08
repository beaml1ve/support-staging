# 📋 Session Metadata Schema

This document describes the JSON schema for session metadata files in the support-staging monorepo.

## 📁 Schema Location

- **Schema File**: `session/session-metadata.schema.json`
- **Used By**: All `session-metadata.json` files in session directories

## 🔧 Schema Validation

### Using JSON Schema Validators

**Node.js (Ajv)**:
```javascript
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const schema = require('./session/session-metadata.schema.json');

const ajv = new Ajv();
addFormats(ajv);
const validate = ajv.compile(schema);

const metadata = require('./path/to/session-metadata.json');
const valid = validate(metadata);

if (!valid) {
  console.log('Validation errors:', validate.errors);
}
```

**VS Code Integration**:
Add to your `settings.json`:
```json
{
  "json.schemas": [
    {
      "fileMatch": ["**/session-logs/**/session-metadata.json"],
      "url": "./session/session-metadata.schema.json"
    }
  ]
}
```

## 📊 Schema Structure

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Unique identifier (YYYY-MM-DD_HH-MM-SS_name format) |
| `sessionName` | string | Human-readable session name |
| `platform` | string | Platform (staging, production, development, testing) |
| `startTime` | string | ISO 8601 start timestamp |
| `status` | string | Session status (active, closed, paused, cancelled) |
| `objective` | string | Primary session objective |
| `files` | object | Session file references |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `endTime` | string\|null | ISO 8601 end timestamp |
| `tags` | array | Categorization tags |
| `participants` | array | Session participants |
| `duration` | string\|null | Human-readable duration |
| `priority` | string | Priority level (low, normal, high, critical) |
| `category` | string | Session category |
| `outcome` | object | Resolution details |
| `relatedSessions` | array | Related session IDs |
| `services` | array | Involved services |
| `environment` | object | Environment details |
| `metadata` | object | Custom metadata |

## 🏷️ Enums and Constraints

### Platform Values
- `staging` (default)
- `production`
- `development`
- `testing`

### Status Values
- `active` (default)
- `closed`
- `paused`
- `cancelled`

### Priority Values
- `low`
- `normal` (default)
- `high`
- `critical`

### Category Values
- `bug-investigation`
- `performance-optimization`
- `user-support`
- `system-maintenance`
- `feature-development`
- `troubleshooting`
- `monitoring`
- `other`

### Participant Roles
- `supporter`
- `user`
- `developer`
- `admin`
- `observer`

## 📝 Example Usage

### Minimal Session Metadata
```json
{
  "sessionId": "2025-09-08_14-30-00_quick-fix",
  "sessionName": "quick-fix",
  "platform": "staging",
  "startTime": "2025-09-08T14:30:00.000Z",
  "status": "active",
  "objective": "Fix minor configuration issue",
  "files": {
    "rules": ".cursorrules",
    "notes": "session-notes.md"
  }
}
```

### Complete Session Metadata
```json
{
  "sessionId": "2025-09-08_11-56-14_api-admin-core-dev-errors",
  "sessionName": "API Admin Core Dev Errors Investigation",
  "platform": "staging",
  "startTime": "2025-09-08T11:56:14.219Z",
  "endTime": "2025-09-08T13:13:58.266Z",
  "status": "closed",
  "objective": "Investigate api-admin-core-dev microservice errors during user registration",
  "files": {
    "rules": ".cursorrules",
    "notes": "session-notes.md",
    "chatHistory": "chat-history.md",
    "summary": "session-summary.md",
    "artifacts": ["debug-logs.txt", "workflow-analysis.md"]
  },
  "tags": ["bug-investigation", "microservice", "user-registration", "urgent"],
  "participants": [
    {
      "name": "Viktor Zambo",
      "role": "supporter",
      "email": "viktor@beam.live",
      "joinTime": "2025-09-08T11:56:14.219Z"
    },
    {
      "name": "Usman",
      "role": "user",
      "joinTime": "2025-09-08T12:15:30.000Z"
    }
  ],
  "duration": "1h 18m",
  "priority": "high",
  "category": "bug-investigation",
  "outcome": {
    "resolved": true,
    "resolution": "Identified incorrect force1FR flag in workflow configuration causing TypeId 2 authentication to fail for admin-initiated registrations",
    "followUpRequired": false,
    "rootCause": "Admin registration workflow invoked with force1FR: false for TypeId 2 authentication, preventing email/phone verification bypass",
    "preventionMeasures": [
      "Add validation for force1FR flag in admin registration workflows",
      "Update documentation for TypeId 2 authentication requirements",
      "Create monitoring alerts for authentication failures in admin flows"
    ]
  },
  "relatedSessions": ["2025-09-07_16-41-30_usman-organization-selection-issue"],
  "services": ["api-admin-core-dev", "work-admin", "org-saferide-africa", "redis", "postgresql"],
  "environment": {
    "ecosystem": "beamdevlive",
    "region": "staging",
    "version": "staging-2025.09.08"
  },
  "metadata": {
    "slackNotified": true,
    "escalated": false,
    "customerImpact": "medium"
  }
}
```

## 🔍 Validation Rules

### Session ID Format
- Pattern: `YYYY-MM-DD_HH-MM-SS_session-name`
- Example: `2025-09-08_11-56-14_api-admin-core-dev-errors`

### Duration Format
- Pattern: `(\d+h\s*)?(\d+m)?`
- Examples: `1h 18m`, `45m`, `2h`, `10m`

### Timestamps
- Format: ISO 8601 with timezone
- Example: `2025-09-08T11:56:14.219Z`

## 🛠️ Integration with Session Scripts

The session management scripts automatically generate and validate metadata:

- **`open-session.js`**: Creates initial metadata with required fields
- **`close-session.js`**: Updates metadata with end time, duration, and outcome
- **Schema validation**: Runs automatically during session operations

## 📚 Best Practices

1. **Always fill required fields** when creating sessions
2. **Use descriptive objectives** that explain the session purpose
3. **Add relevant tags** for easy searching and categorization
4. **Document participants** for accountability and follow-up
5. **Complete outcome section** when closing sessions
6. **Link related sessions** to maintain context
7. **List involved services** for impact analysis
8. **Use consistent naming** for session IDs and names

## 🔧 Extending the Schema

To add new fields:

1. Edit `session/session-metadata.schema.json`
2. Update this documentation
3. Test with existing session files
4. Update session management scripts if needed
5. Consider backward compatibility

---

**Schema Version**: 1.0.0  
**Last Updated**: 2025-09-08  
**Maintainer**: Support Team
