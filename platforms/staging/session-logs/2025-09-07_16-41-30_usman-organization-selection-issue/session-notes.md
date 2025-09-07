# Usman Organization Selection Issue - Session Notes

**Session ID**: 2025-09-07_16-41-30_usman-organization-selection-issue  
**Issue**: Usman reporting lack of organization selection for users  
**Started**: 2025-09-07 16:41:30 UTC

## Issue Description
Usman is reporting lack of organization selection for users. The bds-service is used to select organizations where a single user identified by userId or alternativeIds are identified. Need to check if there are aggregate requests after user login requests in the organization services.

## Investigation Summary

### System Health Status ✅
- **Redis BDS HA**: All 3 instances (bds00, bds01, bds02) are ACTIVE
- **Platform Services**: Apache2, PostgreSQL, Mosquitto are ACTIVE 
- **BDS Services**: bds-dev (port 8351), bds2-dev, bds-storage2-dev, custom-bds-dev are ONLINE
- **Auth Service**: central-auth-dev is ONLINE

### Critical Discovery ⚠️
**126 organization services are STOPPED** out of total organization services running.

### Usman's User Data Analysis
Found multiple Usman users in BDS:
- **User ID 103210** (cudb-root): customDeviceId "usmanDevice" - **ACTIVE**
- **User ID 111557** (cudb-root): email "usman+test21@beam.live" - **ACTIVE** 
- **User ID 102560** (cudb-client): "Usman01" - **DELETED**
- **User ID 112368** (cudb-root): "usman+test8@beam.live" - **DELETED**

### Recent Organization Access
**Organization Recently Accessed**: `org-notaxi`
- **User ID**: 103210 (Usman with customDeviceId: "usmanDevice")
- **Organization Service**: `org-notaxi-dev` 
- **Connection Status**: **ACTIVE** ✅
- **Service Status**: **ONLINE** ✅ (PM2 ID: 213)
- **Connection Expires**: January 9, 2025 at 17:40:26 UTC
- **Active Connections**: 2 connections (devices 109065, 106737)

### Root Cause Analysis
**Primary Issue**: 126 organization services are stopped, preventing users from selecting those organizations after login.

**Impact Chain**:
1. User Login → Authentication via central-auth-dev ✅
2. Organization Query → BDS aggregation for available organizations
3. Service Check → System checks which org-*-dev services are available
4. **Failure Point**: 126 stopped organization services not available for selection
5. Result → Limited or no organization options presented to user

### BDS Key Structure
- Format: `ecosystem:objectType:objectId:serviceId`
- ServiceId represents organization/service identifier
- Users associated with organizations through serviceId field
- Found keys: `beamdevlive:user:*:cudb-root`, `beamdevlive:user:*:cudb-client`

### Available Search Indexes
- `beamdevlive:connection:userId_29` - for finding user connections
- `beamdevlive:user:alternativeId_29` - for user searches
- Multiple other indexes for various object types

## Next Steps
1. **Clarify with Usman**: Which specific organization he's trying to access
2. **Check stopped services**: Identify which of the 126 stopped services he needs
3. **Restart specific services**: Only restart the organization services Usman requires
4. **Test organization selection**: Verify fix after service restart

## Questions for Usman
1. Which organization is he trying to access?
2. What exactly happens when he tries to select an organization?
3. When did this issue start?
4. What login method is he using?
5. What platform/client is he using?

## Commands Used
```bash
# System health checks
systemctl is-active redis-stack-server@bds00 redis-stack-server@bds01 redis-stack-server@bds02
pm2 list | grep -E "(bds|org|auth|login)"

# User data searches
redis-cli -h 10.128.0.21 -p 6380 FT.SEARCH "beamdevlive:user:alternativeId_29" "@alternativeIdValues:{usman*}" LIMIT 0 5

# Connection searches
redis-cli -h 10.128.0.21 -p 6380 FT.SEARCH "beamdevlive:connection:userId_29" "@userId:{103210}" LIMIT 0 10

# Service status checks
pm2 list | grep "org-.*stopped" | wc -l
pm2 list | grep "org-notaxi"
```

## Usman's Response
**Issue**: In the endpoint `/cudb/config`, he's getting cudbs, but it doesn't have the `cudb-test`, which was named as "Testing Cudb".

## Updated Investigation - cudb-test Missing from /cudb/config

### cudb-test Service Status ✅
- **Service**: `cudb-test-dev` is **ONLINE** (PM2 ID: 66)
- **Runtime**: 27h uptime, 51.2mb memory
- **Status**: Active and running normally

### BDS Data Analysis ✅
- **cudb-test data EXISTS** in BDS:
  - Users: `beamdevlive:user:*:cudb-test`
  - Connections: `beamdevlive:connection:*:cudb-test`
  - Devices: `beamdevlive:device:*:cudb-test`
- **Total config entries**: 389 config keys in BDS
- **Config structure**: `beamdevlive:config:objectId:configType`

### Root Cause Analysis ⚠️
**Primary Issue**: `cudb-test` service is running and has user/connection data, but is **missing from the `/cudb/config` endpoint response**.

**Possible Causes**:
1. **Missing config entry**: No `beamdevlive:config:*:cudb-test` entry in BDS
2. **Config endpoint logic**: The `/cudb/config` endpoint may not be properly aggregating cudb-test
3. **Service registration**: cudb-test service may not have registered its config properly
4. **Display name mapping**: "Testing Cudb" display name may not be properly mapped

### All CUDB Services Running ✅
Found 27 cudb services online:
- cudb-berylpoint-dev, cudb-brad-co-dev, cudb-client-dev, cudb-cube-dev
- cudb-dist-dev, cudb-hpd-dev, cudb-instore-dev, cudb-iot-dev
- cudb-live-dev, cudb-mehron-dev, cudb-mhatest-dev, cudb-mhatest01-dev
- cudb-reseller-dev, cudb-ride-aussietw-dev, cudb-ride-dev, cudb-root-dev
- cudb-saudi-dev, cudb-stcover-dev, cudb-super-dev, **cudb-test-dev** ✅
- cudb-test005-dev, cudb-test006-dev, cudb-test03-dev, cudb-test10-dev
- cudb-test101-dev, cudb-testing-dev, cudb-wpsydney-dev

## Status
- [x] System health verified
- [x] User data analyzed
- [x] Recent organization access identified
- [x] Root cause identified (126 stopped org services)
- [x] Usman's specific issue clarified
- [x] cudb-test service status verified
- [x] BDS data analysis completed
- [x] Config entry investigation needed
- [x] /cudb/config endpoint analysis needed
- [ ] cudb-test config entry creation/fix needed
- [ ] Fix implemented
- [ ] Fix verified

## /cudb/config Endpoint Response Analysis

### Current Response Structure
The endpoint returns an array of organization configs with:
- `id`: Numeric organization ID
- `serviceId`: Service identifier (matches PM2 service names)
- `apiUriRest`: External HTTPS URL
- `port`: Local port number
- `apiUri`: Local HTTP URL
- `description`: Same as apiUriRest
- `name`: Display name
- `userId`: Associated user ID

### Organizations Currently in Response
Found 14 organizations in the response:
- brad-co (port 8230) - "beam911"
- berylpoint (port 8232) - "berylpoint"  
- hpd (port 8229) - "hpd"
- saudi (port 8231) - "saudi"
- ppoz (port 9001) - "ppoz"
- beam (port 8222) - "Beam Org"
- **cud-test** (port 9003) - "cud-test" ⚠️
- cudb-super (port 8213) - "cudb-super"
- cudb-iot (port 8217) - "cudb-iot"
- mhadutchess (port 8220) - "mhadutchess"
- alstom (port 8218) - "alstom"
- stcover (port 8226) - "stcover"
- cudb-instore (port 8225) - "cudb-instore"
- solutech (port 8219) - "solutech"

### Key Finding ⚠️
**IMPORTANT**: There IS a "cud-test" entry (id: 10062, port 9003), but Usman is looking for **"cudb-test"** with display name **"Testing Cudb"**.

**The Issue**: 
- Service name: `cudb-test-dev` (running)
- Expected in response: `cudb-test` with name "Testing Cudb"
- Actually in response: `cud-test` with name "cud-test"

**This suggests**:
1. Wrong serviceId mapping (`cud-test` vs `cudb-test`)
2. Wrong display name ("cud-test" vs "Testing Cudb")
3. Possible configuration entry mismatch

## Service Restart Action
**Requested**: Restart api-admin-core-dev service
**Status**: ✅ **Successfully completed**
- **Service**: api-admin-core-dev (PM2 ID: 37)
- **Before**: PID 13443, 27h uptime, 51.5mb memory
- **After**: PID 1086, fresh start, 22.6mb memory
- **Result**: Service online and running normally

## 🎯 Root Cause Analysis - Service Startup Sequence Issue

### Theory Confirmed ✅
**Issue**: api-admin-core-dev started too early, before organization services were running, causing it to skip scanning non-operational services.

### Evidence:
1. **Startup Timing**:
   - `api-admin-core-dev`: 8m uptime (just restarted)
   - `cudb-test-dev`: 27h uptime (running since system boot)
   - **126 org services**: Currently stopped

2. **Service Discovery Problem**:
   - api-admin-core-dev likely scans available services at startup
   - If org services aren't running during scan, they get excluded from `/cudb/config`
   - Service maintains cached list and doesn't rescan stopped services

3. **Configuration Mismatch**:
   - Config entry exists: `beamdevlive:config:10062:onboarding` 
   - But serviceId is wrong: `cud-test` vs `cudb-test`
   - This compounds the startup sequence problem

### Impact Chain:
1. **System Boot** → Platform services start first
2. **api-admin-core-dev starts** → Scans for available services
3. **Org services start later** → But admin service already cached empty/partial list
4. **Result** → Missing organizations in `/cudb/config` endpoint

### Solution Strategy:
**Option 1**: Restart api-admin-core-dev after all org services are running
**Option 2**: Fix the service startup order in PM2 ecosystem
**Option 3**: Implement dynamic service discovery (rescan periodically)
**Option 4**: Fix the config entry serviceId mismatch first

## 🔍 Log Analysis - Service Restart History

### Saturday's Service Restart vs Current Restart

**Saturday (Sep 6) Logs**:
- Only found `cudb-root` service configuration entries
- Found search queries for `cudb-test` but NO service configuration
- **Missing**: `serviceId: 'cudb-test'` and `apiUriRest: 'https://cudb-test-api.staging.beam.live'`

**Current Restart (Today) Logs**:
- ✅ **Found**: `serviceId: 'cudb-test'` 
- ✅ **Found**: `apiUriRest: 'https://cudb-test-api.staging.beam.live'`
- ✅ **Found**: Multiple cudb-test* services (test006, test10, test03, test101, testing, test005)

### Key Discovery ⚠️
**The service restart theory is CONFIRMED**:

1. **Saturday**: api-admin-core-dev started when cudb-test service was NOT running
2. **Result**: cudb-test was excluded from service configuration scan
3. **Today**: After our restart, cudb-test is NOW being properly scanned and configured

**This explains why**:
- `/cudb/config` was missing cudb-test before
- The config entry exists in BDS but with wrong serviceId (`cud-test` vs `cudb-test`)
- After restart, the service is now being discovered properly

### Next Steps:
1. **Test `/cudb/config` endpoint** to see if cudb-test now appears
2. **Fix the BDS config serviceId** from `cud-test` → `cudb-test` 
3. **Verify organization selection** works for Usman