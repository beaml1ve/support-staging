# Connector Scripts Mobile Issue - Investigation Results

**Issue Reported:** Usman reported at 07:32 local time that mobile devices unable to fetch connector scripts

## System Health Check Results

✅ **OS Health:** Stable (uptime 1 day, load avg 0.34-0.56, 60G RAM available, 61% disk usage)  
✅ **Platform Services:** All healthy (Apache2, PostgreSQL, Redis HA, Mosquitto, Tile38)  
✅ **Microservices:** 260+ PM2 services running  
✅ **Redis BDS:** Connected (10.128.0.21:6380)  
✅ **MQTT Broker:** Running on port 1883  

## Key Findings

🔍 **Connector service (connector-dev) uptime:** 54 minutes (restarted ~10:39 AM)  
🔍 **Service endpoint:** Port 8295, accessible via https://connector-api.staging.beam.live  
🔍 **Communication protocol:** MQTT/WebSocket, not REST endpoints  
🔍 **Mobile platforms available:** android, ios (multiple versions including ios_250401)  
🔍 **Only error:** 'SCHEMA_SERVICE is not valid: connector-service, service schema download skipped'  

## Technical Details

- **Service Architecture:** NestJS with MQTT microservice transport
- **MQTT Configuration:** localhost:1883, username: page, password: beamL1ve
- **Script Fetching:** Mobile devices use MQTT topic 'getConnectors' with platform parameter
- **Script Transpilation:** TypeScript snippets transpiled to JavaScript on service startup
- **Available Platforms:** android, ios, web, dev, and versioned variants

## Root Cause Analysis

The connector service was likely down or experiencing issues around 07:32 when Usman reported the problem. The service was subsequently restarted around 10:39 AM and is now functioning normally.

**Timeline:**
- 07:32 - Usman reports mobile devices unable to fetch connector scripts
- ~10:39 - Connector service restarted (current uptime: 54 minutes)
- 11:26 - Investigation started, service confirmed working

## Current Status

✅ Connector service is online and transpiling snippets correctly  
✅ MQTT connectivity working  
✅ All mobile platform snippets available  
✅ Service responding to MQTT requests  

## Recommendations

1. **Monitor connector service stability** - Set up alerts for service downtime
2. **Investigate restart cause** - Check system logs for what caused the earlier failure
3. **Implement health checks** - Add proper health endpoints for monitoring
4. **Document mobile integration** - Ensure mobile teams understand MQTT-based architecture

## Next Steps

- Monitor service for the next 24 hours
- Check with Usman if issue is resolved
- Consider implementing redundancy for critical connector service