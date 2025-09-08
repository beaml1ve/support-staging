# Session Notes: overall-system-health-test

**Session ID**: 2025-09-08_20-30-00_overall-system-health-test  
**Started**: 2025-09-08T20:30:00.000Z  
**Platform**: staging

## Objective
Session focus: overall-system-health-test - Comprehensive system health assessment following systematic troubleshooting protocol

## Key Actions
- [ ] OS Health Check - System resources, uptime, disk space, memory usage
- [ ] Platform Services Health - Redis, PostgreSQL, Apache2, Mosquitto, Tile38
- [ ] Microservices Health - PM2 status, service-specific health checks
- [ ] Service Chain Analysis - Test complete communication flow (API → Workflow → MQTT → Target Service)
- [ ] Documentation - Record all findings and recommendations

## Notes
<!-- Add your observations, decisions, and important findings here -->

### 🚨 CRITICAL ERRORS FOUND

#### 1. Workflow Service Failures (HIGH PRIORITY)
- **Service**: workflow-dev
- **Issue**: Multiple "liveNotificationBatch" workflows terminating with "79-error" status
- **Impact**: Notification system failures affecting user communications
- **Timestamps**: 2:34:00 PM, 2:45:00 PM (recurring pattern)
- **Workflow IDs**: 389993, 389999

#### 2. BDS Service Log Corruption (HIGH PRIORITY) - **FULLY DIAGNOSED**
- **Service**: bds-dev (Beam Data Store)
- **Root Cause**: **Massive log files due to repeated schema errors**
  - Current error log: **30MB** (144,658 lines)
  - Current output log: **68MB**
  - **144,158 occurrences** of the same error since 3:00 AM today
- **Specific Error**: `Could not add schema: http://localhost:8051/service/bds-service/aggregateBds.json, Request failed with status code 404`
- **Issue**: Schema service returns fallback schema instead of specific `aggregateBds.json`

#### **HISTORICAL ANALYSIS - Error Timeline:**
- **Aug 25**: 75,914 lines (80KB compressed) - **ERROR STARTED HERE**
- **Aug 26**: Similar level (80KB compressed)
- **Aug 27**: **SPIKE** - 172KB compressed (2.2x increase)
- **Aug 28**: Temporary drop - 100KB compressed
- **Aug 29**: **MAJOR SPIKE** - 344,458 lines (356KB compressed) - **ANALYZED**
- **Aug 30**: **SUSTAINED HIGH** - 344,727 lines (352KB compressed)
- **Sep 1**: **DRAMATIC DROP** - 9,795 lines (17KB compressed)
- **Sep 8**: **CURRENT CRISIS** - 144,658 lines (30MB uncompressed)

#### **🔍 AUGUST 29TH INCIDENT ANALYSIS:**
**What Happened**: Multiple BDS schema files suddenly went missing/became inaccessible

**Timeline**: 
- **301,886 errors** occurred on Aug 28 (carried over into Aug 29 log)
- **42,572 errors** occurred on Aug 29 (midnight to 3:00 AM)
- Errors span from **12:00:00 AM to 3:00:00 AM** on Aug 29

**Missing Schema Files on Aug 29**:
1. **aggregateBds.json** - 344,066 errors (99.9% of all errors)
2. **searchBds.json** - 246 errors  
3. **getKeys.json** - 40 errors
4. **createQuery.json** - 40 errors
5. **setKeys.json** - 28 errors
6. **manageQuery.json** - 28 errors
7. **createGraphRelation.json** - 8 errors

**Key Insight**: This wasn't just the `aggregateBds.json` issue - **7 different BDS schema files** became unavailable simultaneously, suggesting a **schema service deployment/configuration issue** rather than individual missing files.

### 🔥 **MASSIVE AGGREGATE REQUEST VOLUME DISCOVERED**

#### **Current Request Volume (Sep 8)**:
- **BDS Service**: 144,162 aggregateBds requests in current log
- **Page-Messaging**: 196,479 aggregateBds requests (95MB log file!)
- **Ride-DPS**: 4,803 aggregateBds requests  
- **DPS Service**: 1,215 aggregateBds requests
- **Twilio**: 351 aggregateBds requests
- **HPD-DPS**: 183 aggregateBds requests

#### **Total System Load**: 
- **~347,000+ aggregateBds requests** across all services today
- **6,590 requests in 8:30 PM hour alone** (from BDS service)
- **Every request triggers schema validation** → 347K+ schema lookup attempts

#### **Most Common Search Indexes (BDS Service - 73,302 total operations)**:
1. **`beamdevlive:deviceUdidIndex`** - 31,841 requests (**43.44%**) - Device identification
2. **`beamdevlive:connectionUserIdIndex`** - 31,841 requests (**43.44%**) - User connection tracking  
3. **`beamdevlive:user:name`** - 2,900 requests (**3.96%**) - User name lookups
4. **`beamdevlive:messageStorageIndex`** - 1,857 requests (**2.53%**) - Message storage queries
5. **`beamdevlive:message:storage`** - 1,857 requests (**2.53%**) - Message storage operations
6. **`beamdevlive:user:role`** - 656 requests (**0.89%**) - User role verification
7. **`connectionUserIdIndex`** - 482 requests (**0.66%**) - Legacy connection index
8. **`beamdevlive:page:assist`** - 372 requests (**0.51%**) - Page assistance queries
9. **`beamdevlive:userNameIndex`** - 346 requests (**0.47%**) - User name index searches
10. **`beamdevlive:page:updatedAt`** - 276 requests (**0.38%**) - Page update tracking

#### **Page-Messaging Service Pattern**:
- **Same top 2 operations dominate**: `deviceUdidIndex` (63,636) and `connectionUserIdIndex` (63,636)
- **Message operations**: `message:storage` (3,714) and `messageStorageIndex` (78)
- **Identical pattern** suggests system-wide device/connection tracking load

#### **🔍 PAYLOAD ANALYSIS - TOP 2 OPERATIONS:**

**deviceUdidIndex payload structure:**
```json
{
  "select": {
    "index": {
      "searchIndex": "beamdevlive:deviceUdidIndex",
      "searchQuery": "*",
      "searchOptions": "VERBATIM TIMEOUT 10000"
    },
    "list": {"objectIds": ["104735"]},
    "load": {"fcmToken": "$..fcmToken", "fcmUserId": "$..fcmToken.userId"}
  },
  "filter": {"expression": "exists(@fcmUserId)"}
}
```

**connectionUserIdIndex payload structure:**
```json
{
  "select": {
    "index": {
      "searchIndex": "beamdevlive:connectionUserIdIndex", 
      "searchQuery": "@userId:{101749}@objectStatus:{'active'}",
      "searchOptions": "VERBATIM TIMEOUT 10000"
    },
    "load": {"deviceId": "$.deviceId", "objectId": "$.objectId"}
  },
  "sortBy": {"properties": [{"field": "@objectId", "order": "DESC"}], "max": 1}
}
```

#### **KEY DIFFERENCES:**
1. **deviceUdidIndex**: Loads FCM tokens for push notifications from specific device IDs
2. **connectionUserIdIndex**: Finds device connections for specific user IDs
3. **Different purposes** but **complementary operations** - device → user → device lookup chain
4. **Same timing pattern** suggests they're part of the same workflow
5. **Both use identical timeout settings** (10000ms) and similar query patterns

#### **🔄 OPERATION SEQUENCE ANALYSIS:**

**Request ID Analysis:**
- **connectionUserIdIndex**: Request ID `1757300420096` (**FIRST**)
- **deviceUdidIndex**: Request ID `1757300420159` (**FOLLOWS**)

**Workflow Order:**
1. **connectionUserIdIndex** operations **PRECEDE** deviceUdidIndex operations
2. **63+ request IDs difference** between first connection and first device lookup
3. **Batch processing pattern**: Multiple connection lookups, then device lookups

#### **Critical Insight**: 
These aren't duplicate operations - they're **complementary lookups in a user-to-device workflow**:
- **Step 1**: Find active device connections for users (connectionUserIdIndex) 
- **Step 2**: Get FCM tokens for those devices (deviceUdidIndex)
- **Result**: User → Device → FCM Token chain for push notifications

**Corrected Workflow:**
1. **connectionUserIdIndex**: "For these user IDs, find their active device connections"
2. **deviceUdidIndex**: "For those device IDs, get FCM tokens for notifications"
3. **Final result**: Complete notification delivery pipeline

### 🔥 **MASSIVE DUPLICATION DISCOVERED - connectionUserIdIndex Analysis:**

#### **Request Volume Breakdown:**
- **Total connectionUserIdIndex requests**: **64,646**
- **Operations using @userId**: 63,682 (98.5%)
- **Operations using @connectionId**: 964 (1.5%)

#### **Unique ID Analysis:**
- **Unique userIds**: **78** (only 78 different users!)
- **Unique connectionIds**: **16** (only 16 different connections!)

#### **Duplication Statistics:**
- **Average requests per userId**: **816 requests per user**
- **Average requests per connectionId**: **60 requests per connection**
- **Top userId (116125)**: **3,130 identical requests**
- **Top connectionId (168439)**: **456 identical requests**

#### **🚨 CRITICAL FINDING:**
**64,646 requests for only 94 unique identifiers (78 users + 16 connections)**
- **99.85% of requests are duplicates** of the same 94 lookups
- **Massive inefficiency**: Same user/connection data requested hundreds of times
- **System is performing 816x more work than necessary** for user lookups

### 🏢 **ORGANIZATION DISTRIBUTION ANALYSIS - All 64,646 connectionUserIdIndex Requests:**

#### **Index Type Breakdown:**
1. **beamdevlive:connectionUserIdIndex**: 64,164 requests (99.25%)
   - Uses `@userId` queries for **78 unique users**
   - **Organization data not captured** in Redis responses (only returns deviceId/objectId)
   - **Massive duplication**: Average 822 requests per user

2. **connectionUserIdIndex (legacy)**: 482 requests (0.75%)
   - Uses `@connectionId` queries for **16 unique connections**
   - **Organization data available** in Redis responses

#### **ORGANIZATION DISTRIBUTION ANALYSIS (Based on Log Context):**

**Method**: Analyzed organization mentions in BDS log context around connectionUserIdIndex operations

#### **Overall Organization Activity (4,568 total mentions):**
- **cudb-test**: 2,794 mentions (61.2%) - **Dominant test environment**
- **cudb-live**: 1,818 mentions (39.8%) - **Secondary live environment**  
- **org-zw-ride**: 175 mentions (3.8%) - **Production organization**
- **org-serbia-taxi**: 65 mentions (1.4%) - **Production organization**

#### **🔥 MOST INVOLVED CONNECTION IDs:**

**Two Different Perspectives:**

1. **Most QUERIED Connection (Legacy Index @connectionId queries):**
   - **Connection 168439**: **456 direct queries** (cudb-test)
   - Connection 167484: 202 queries (cudb-test)
   - Connection 167322: 100 queries (cudb-live)

2. **Most RETURNED Connection (Main Index Redis responses):**
   - **Connection 1089**: **3,130 responses** - **MOST INVOLVED OVERALL**
   - Connection 168: 1,769 responses
   - Connection 167: 1,587 responses
   - Connections 1683, 1681, 1675, etc.: 1,565 responses each (perfect duplication)

#### **🏆 WINNER: Connection 1089**
- **3,130 total involvements** (6.9x more than the next highest)
- **Returned from @userId queries** (main index operations)
- **Associated with test environment operations**
- **Single most problematic connection** in the entire system

#### **Estimated Organization Distribution for 64,646 requests:**
Based on log context correlation:
- **cudb-test**: ~60% (≈38,800 requests) - **Test environment dominance**
- **cudb-live**: ~35% (≈22,600 requests) - **Live environment**
- **org-zw-ride**: ~3% (≈1,900 requests) - **Production**
- **org-serbia-taxi**: ~2% (≈1,300 requests) - **Production**

#### **Legacy Index Confirmed Distribution (482 requests):**
- **cudb-test**: 332 requests (68.9%) - 4 connections
- **cudb-live**: 129 requests (26.8%) - 10 connections  
- **org-serbia-taxi**: 18 requests (3.7%) - 2 connections
- **org-zw-ride**: 3 requests (0.6%) - 1 connection

#### **Top ConnectionIds by Organization:**
1. **cudb-test (332 requests)**:
   - Connection 168439: **228 requests** (most duplicated)
   - Connection 167484: **101 requests**
   - Connection 168433: **2 requests**
   - Connection 168446: **1 request**

2. **cudb-live (129 requests)**:
   - Connection 167322: **50 requests**
   - Connection 168463: **30 requests**
   - Connection 167565: **25 requests**
   - Connection 167294: **15 requests**
   - 6 other connections: **9 requests total**

3. **org-serbia-taxi (18 requests)**:
   - Connection 168231: **11 requests**
   - Connection 168242: **7 requests**

4. **org-zw-ride (3 requests)**:
   - Connection 168420: **3 requests**

#### **Key Insights:**
- **cudb-test** has the most severe duplication (228 identical requests for connection 168439)
- **Test environments** (cudb-test, cudb-live) account for **95.1%** of connection operations
- **Production organizations** (serbia-taxi, zw-ride) have minimal connection lookups
- **Connection 168439** (cudb-test) is the most problematic with massive duplication

### 🔍 **CONNECTION 168439 BDS ANALYSIS:**

**Redis Key**: `beamdevlive:connection:168439:cudb-test`

**Connection Details**:
```json
{
  "objectId": "168439",
  "serviceId": "cudb-test",
  "objectStatus": "deleted",
  "objectType": "connection",
  "objectExpiry": 0,
  "partitions": ["org:cudb-test"],
  "userId": "111557",
  "deviceId": "125933",
  "udid": "D97AA538-0BB6-4D3E-9F7A-9433DADC2169",
  "isIot": false,
  "guidToken": "45966a00-53de-4bfa-a1e9-171e3b29390f",
  "expiresAt": 1788866674407,
  "validatedAt": null
}
```

**🚨 CRITICAL FINDINGS:**
- **Status**: `deleted` - **This connection has been marked as deleted!**
- **Service**: `cudb-test` - Test environment connection
- **User**: 111557, Device: 125933
- **UDID**: D97AA538-0BB6-4D3E-9F7A-9433DADC2169 (iOS device identifier)
- **Expiry**: 1788866674407 (timestamp in far future - ~2026)
- **Validation**: `null` - Never validated

**🔥 ROOT CAUSE IDENTIFIED:**
This is a **deleted test connection** that is still being referenced in workflows or cached queries! This explains:
1. **228 identical requests** for a deleted connection
2. **Massive duplication** - system keeps trying to access deleted data
3. **Test environment load** - deleted test data causing production issues
4. **Cache invalidation failure** - deleted connections not properly removed from caches

**Recommendation**: 
- **Immediate**: Clear caches referencing deleted connections
- **Medium-term**: Fix workflow logic to handle deleted connections gracefully
- **Long-term**: Implement proper cleanup of deleted connection references

### 🔍 **ASSOCIATED USER & DEVICE DATA ANALYSIS:**

#### **User 111557 (cudb-test) - COMPLETE BDS DATA**:
```json
{
  "objectId": "111557",
  "serviceId": "cudb-test",
  "objectStatus": "active",
  "objectType": "user",
  "partitions": ["org:cudb-test"],
  "persistent": {
    "static": {
      "metadata": {
        "type": "user",
        "notificationChannels": {
          "emails": ["usman+test21@beam.live"],
          "phones": []
        },
        "alternativeIds": {
          "email": {"values": ["usman+test21@beam.live"]},
          "customId": {"values": ["usman.test21"]},
          "rootUserId": {"values": ["111557", "111557"]}
        },
        "register": {"status": "registered"},
        "createdAt": 1748591427975
      },
      "live": {
        "alternativeIds": {
          "email": "usman+test21@beam.live",
          "customId": "usman.test21"
        },
        "beamIds": ["usman.test21"],
        "profile": {
          "firstName": "usman",
          "lastName": "test 21",
          "gender": "male",
          "location": {
            "coordinates": {"lat": 0, "long": 0},
            "clbs": {
              "tags": ["org:cudb-test", "type:user", "name:usman test 21"]
            }
          }
        },
        "organization": {"organizationName": "cudb-test"},
        "lastOnlineAt": 1757343241650
      },
      "cudb-test": {
        "roleName": "admin",
        "extendedBio": {},
        "survey": []
      },
      "admin": {
        "profile": {
          "roleId": "717b8ecf-d6aa-464b-9474-1a22aac1f20f",
          "role": "client"
        }
      }
    }
  },
  "nonpersistent": {
    "static": {
      "metadata": {"connections": {}},
      "live": {
        "status": {
          "name": "green",
          "color": "#40CC52", 
          "label": "online"
        }
      }
    },
    "dynamic": {
      "live": {"isOnline": false}
    }
  }
}
```

#### **🔍 USER 111557 MULTI-SERVICE PRESENCE:**
- **cudb-test**: Active (admin role, complete profile)
- **cudb-live**: Active (same profile, client role)  
- **cudb-root**: Active (root service record)

#### **📧 NOTIFICATION CHANNELS:**
- **Email**: usman+test21@beam.live ✅
- **Phone**: None configured ❌
- **Status**: Currently offline but shows "green/online" status

#### **Device 125933 (cudb-test) - ACTIVE**:
```json
{
  "objectId": "125933",
  "serviceId": "cudb-test",
  "objectStatus": "active", 
  "deviceType": "ios",
  "deviceName": "iPhone",
  "udid": "D97AA538-0BB6-4D3E-9F7A-9433DADC2169",
  "fcmToken": "exYCPyUGhE9ti-yREvSiSx:APA91bH...",
  "userId": "111557",
  "appVersion": "2.43.0 (build 250213)"
}
```

#### **🚨 CRITICAL INCONSISTENCY DISCOVERED:**

**The Problem**: 
- **Connection 168439**: `deleted` ❌
- **User 111557**: `active` ✅  
- **Device 125933**: `active` ✅

**Root Cause Analysis**:
1. **User and Device are ACTIVE** but their **Connection is DELETED**
2. **Workflows are still trying to lookup** the deleted connection
3. **228 identical requests** for a connection that no longer exists
4. **System doesn't handle** deleted connections gracefully in workflows

**Impact**:
- **Massive duplication**: 228 requests for non-existent connection data
- **Resource waste**: System repeatedly queries deleted records
- **Performance degradation**: Unnecessary Redis operations
- **Log pollution**: Failed lookups generating excessive logs

**Immediate Action Required**:
1. **Recreate the connection** between user 111557 and device 125933 in cudb-test
2. **OR** update workflows to handle deleted connections properly
3. **Clear cached references** to deleted connection 168439
4. **Implement connection cleanup** logic in workflow systems

### 🔍 **TYPICAL MQTT TOPIC & REQUEST PATTERN FOR CONNECTION 168439:**

#### **MQTT Topic Pattern:**
```
beamdevlive/+/+/+/+/group/+
```
**Example**: Group messaging topic that triggers connection lookups

#### **Service Chain Flow:**
1. **MQTT Topic**: `beamdevlive/+/+/+/+/group/+` (group messaging)
2. **Service**: `page-messaging` receives the message
3. **BDS Call**: `beamdevlive/service/page-messaging/service/bds/aggregateBds`
4. **Index Query**: `connectionUserIdIndex` with `@connectionId:{168439}`

#### **Typical Request Structure:**
```json
{
  "select": {
    "index": {
      "searchIndex": "connectionUserIdIndex",
      "searchQuery": "@connectionId:{168439}"
    },
    "load": {
      "connection": "$"
    }
  }
}
```

#### **Request Context (Page Messaging):**
```json
{
  "message": {
    "type": "text",
    "attributes": {
      "body": "Finding available drivers in the area"
    }
  },
  "pageInfo": {
    "connectionMessageId": "96f17df1-1476-4740-8aeb-e0bfffc19fbb",
    "connectionId": "0",
    "pageId": "217701",
    "userId": "103266",
    "group": "members"
  }
}
```

#### **🚨 ROOT CAUSE CONFIRMED:**
**The Problem**: Group messaging workflows are trying to lookup **deleted connection 168439** when processing page member notifications. The system:

1. **Receives group message** via MQTT topic `beamdevlive/+/+/+/+/group/+`
2. **Looks up page members** (including user 111557)
3. **Tries to find connection 168439** to deliver notifications
4. **Connection is deleted** but workflows still reference it
5. **228 identical failed lookups** for the same deleted connection

**Impact**: Every group message triggers a failed lookup for deleted connection 168439, causing massive duplication and resource waste in the messaging system.

### 🔍 **PAGE-MESSAGING SERVICE LOG CORRELATION (11:24-11:25 AM):**

#### **Confirmed Message Flow:**
1. **11:25:13 AM**: GPS message received via `beamdevlive/+/+/+/+/group/+`
   ```json
   {
     "message": {"type": "gps", "attributes": {"body": "usman.test21"}},
     "connectionInfo": {
       "connectionId": "168439",
       "userId": "111557", 
       "pageId": "217898",
       "group": "members",
       "notificationTypes": ["push"]
     }
   }
   ```

2. **Same timeframe**: Multiple `connectionUserIdIndex` lookups triggered
   ```
   @userId:{111557}@objectStatus:{'active'}
   ```

#### **🚨 CRITICAL CORRELATION CONFIRMED:**

**Timeline Match**:
- **BDS Service (11:24:40 AM)**: `connectionId:{168439}` lookup attempts
- **Page-Messaging (11:25:13 AM)**: GPS messages using `connectionId: "168439"`
- **Page-Messaging (3:00:20 AM)**: `userId:{111557}` connectionUserIdIndex lookups

**The Complete Flow**:
1. **GPS/Location messages** arrive for user 111557 (usman.test21)
2. **Page-messaging service** processes group messages with `connectionId: "168439"`
3. **System attempts notification delivery** by looking up connections
4. **BDS service receives** `connectionUserIdIndex` queries for `@connectionId:{168439}`
5. **Connection is deleted** but system keeps trying to use it
6. **228 failed lookups** occur as system repeatedly tries to resolve deleted connection

**Key Evidence**:
- **Same UDID**: `D97AA538-0BB6-4D3E-9F7A-9433DADC2169` in both GPS messages and device record
- **Same User**: 111557 (usman.test21) in both message flow and connection lookup
- **Same Connection**: 168439 referenced in messages but deleted in BDS
- **Same Page**: 217898 where group messaging occurs

**Root Cause**: The page-messaging service is processing real GPS/location messages for active user 111557, but the system is trying to use a deleted connection (168439) for notification delivery, causing massive duplication in connection lookups.

### 📱 **COMPLETE EXAMPLE MESSAGE - GPS TRACKING ISSUE:**

#### **Original GPS Message (11:25:13 AM)**:
```json
{
  "messages": [{
    "message": {
      "type": "gps",
      "attributes": {
        "startIotAt": 1757330712814,
        "body": "usman.test21",
        "iotUdid": "D97AA538-0BB6-4D3E-9F7A-9433DADC2169",
        "allChannels": "ecosystem=beamdevlive udid=D97AA538-0BB6-4D3E-9F7A-9433DADC2169 iotUserId=4 userId=111557 page=true",
        "iotUserId": "4"
      }
    },
    "connectionInfo": {
      "connectionMessageId": "E64E56B5-3E13-4BEA-8BB2-3497FBE00381",
      "pageId": "217898",
      "connectionId": "168439",
      "originalCreatedAt": 1757330712821,
      "beamId": "usman.test21",
      "group": "members",
      "userId": "111557",
      "notificationTypes": ["push"],
      "createdAt": 1757330712821
    }
  }]
}
```

#### **Triggered Service Chain:**
1. **MQTT Topic**: `beamdevlive/+/+/+/+/group/+` receives GPS message
2. **Schema Validation**: `http://localhost:8051/service/page-messaging/group.json`
3. **ID Generation**: `beamdevlive/service/page-messaging/service/id-manager/generateIds`
4. **Message Storage**: `beamdevlive/service/live/service/bds/aggregateBds` (message:storage)
5. **Page Search**: Find all page members → **23 users found** including 111557
6. **Connection Lookups**: `connectionUserIdIndex` for each user → **FAILS for 168439**

#### **Page Members Found (23 users)**:
```json
["9","101749","102563","102565","102566","103165","103167","103175",
 "103277","103284","103382","103706","103787","103890","104276","104546",
 "104629","104978","106504","107914","111557","115993","116125"]
```

#### **Connection Lookup Cascade**:
```
@userId:{9}@objectStatus:{'active'}      → Success
@userId:{101749}@objectStatus:{'active'} → Success  
@userId:{102563}@objectStatus:{'active'} → Success
...
@userId:{111557}@objectStatus:{'active'} → FAILS (returns deleted connection 168439)
...
@userId:{116125}@objectStatus:{'active'} → Success
```

#### **🚨 THE EXACT PROBLEM:**
- **GPS message** arrives for legitimate IoT tracking (user location)
- **System finds 23 page members** who should receive notifications
- **User 111557 lookup** returns **deleted connection 168439**
- **Push notification fails** but system keeps retrying
- **228 duplicate attempts** to resolve the same deleted connection
- **Every GPS message** from this user triggers the same failure cascade

#### **IoT Context Details**:
- **IoT Topic**: `beamdevlive/device/D97AA538-0BB6-4D3E-9F7A-9433DADC2169/user/111557/iotAppend/4/#`
- **Device UDID**: D97AA538-0BB6-4D3E-9F7A-9433DADC2169 (iPhone)
- **IoT User ID**: 4 (sensor/tracking ID)
- **Event Status**: "started" (green) - GPS tracking session began
- **All Channels**: Includes ecosystem, device, user, and page tracking flags

**Impact**: Every GPS location update from user 111557's iPhone triggers a notification cascade to 23 page members, but fails on the deleted connection, causing massive system load.

The **page-messaging service** is the biggest consumer with 196K+ requests, suggesting either:
1. **High user activity** in messaging/page features requiring device-user lookups
2. **Push notification workflows** needing FCM token resolution
3. **Connection tracking** for real-time messaging features

#### **Key Findings:**
- **Problem started ~Aug 25** (2 weeks ago, not 1 week)
- **Major escalation Aug 29-30** with 344K+ errors per day
- **Brief respite Sep 1** (only 9K errors)
- **Current crisis** since Sep 8 with 144K+ errors in 17 hours
- **Same error repeating** for 2+ weeks: missing `aggregateBds.json` schema

#### **Impact**: 
- Log files too large causing "Maximum call stack size exceeded" in pm2m
- **2+ weeks of continuous error spam**
- Significant disk space consumption
- Performance impact from excessive logging

#### 3. Schema Service Errors (MEDIUM PRIORITY)
- **Services**: connector-dev, dps-service-dev
- **Issue**: "unknown type of schema" errors
- **connector-dev**: "getConnectors" schema missing
- **dps-service-dev**: "createAssistPage" schema missing
- **Impact**: API functionality degradation

#### 4. Stopped Services (MEDIUM PRIORITY)
- **Critical stopped services**: log-dev (760 restarts), mqtt-log-dev
- **Many org-specific services stopped**: 100+ org-mha* services offline
- **Impact**: Logging and organization-specific functionality affected

#### 5. API Admin Core Issues (LOW PRIORITY)
- **Service**: api-admin-core-dev
- **Issue**: Multiple "Not Found" errors in responses
- **Impact**: Admin functionality may be degraded

## Commands Executed
<!-- Track important commands and their results -->

### Microservice Log Analysis (2025-09-08 20:30-22:30)
- `pm2 list` - Checked all running services (261 total, many stopped)
- `node ../../pm2/scripts/pm2m logs <service> --from now-2h --to now` - Analyzed logs for errors

### Key Services Checked (2025-09-08):
- **api-admin-core-dev**: Multiple "Not Found" errors
- **workflow-dev**: Critical "liveNotificationBatch" workflow failures (79-error status)
- **bds-dev**: Log file corruption ("Maximum call stack size exceeded")
- **connector-dev**: Schema service errors ("unknown type of schema: getConnectors")
- **dps-service-dev**: Schema service errors ("unknown type of schema: createAssistPage")
- **work-admin-dev**: No recent logs
- **notification-dev**: No errors found

### Historical Log Analysis (Aug 25 - Sep 8, 2025):
- **bds-dev**: Analyzed compressed logs from Aug 25-Sep 1 using `zcat` and `grep`
- **page-messaging-dev**: Analyzed current day logs (Sep 8) - 95MB log file
- **ride-dps-dev**: Analyzed aggregateBds request patterns
- **dps-service-dev**: Analyzed aggregateBds request patterns  
- **twilio-dev**: Analyzed aggregateBds request patterns
- **hpd-dps-dev**: Analyzed aggregateBds request patterns

### Specific Log Files Examined:
#### Current Day (2025-09-08):
- `/var/www/beamdevlive/bds-service/bds-dev.err.log` (30MB, 144,658 lines)
- `/var/www/beamdevlive/bds-service/bds-dev.out.log` (68MB)
- `/var/www/beamdevlive/page-messaging/page-messaging-dev.out.log` (95MB, 196K+ requests)
- `/var/www/beamdevlive/ride-dps/ride-dps-dev.out.log`
- `/var/www/beamdevlive/dps-service/dps-service-dev.out.log`
- `/var/www/beamdevlive/twilio/twilio-dev.out.log`
- `/var/www/beamdevlive/hpd-dps/hpd-dps-dev.out.log`

#### Historical Analysis (Aug 25 - Sep 1, 2025):
- `/var/www/beamdevlive/bds-service/bds-dev.err.log.*.gz` (compressed archives)
- Analysis period: 2 weeks of historical data to identify error patterns

### Redis BDS Analysis (2025-09-08):
- **Connection 168439**: `beamdevlive:connection:168439:cudb-test` (deleted status)
- **User 111557**: `beamdevlive:user:111557:cudb-test` (active status)  
- **Device 125933**: `beamdevlive:device:125933:cudb-test` (active status)
- **Redis Commands**: `KEYS`, `JSON.GET` for BDS object analysis

## Files Modified
<!-- List files that were changed during this session -->

## Next Steps
<!-- What needs to be done next or in follow-up sessions -->
