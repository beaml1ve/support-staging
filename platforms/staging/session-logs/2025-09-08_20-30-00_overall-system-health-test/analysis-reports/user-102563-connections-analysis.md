# User 102563 Active Connections Analysis
**Session**: 2025-09-08_20-30-00_overall-system-health-test  
**Date**: $(date)  
**User ID**: 102563  
**Total Active Connections**: 67

## Connection Distribution by Service

### Service Breakdown:
- **cudb-test**: 52 connections (77.6%)
- **org-quincy**: 14 connections (20.9%)
- **cudb-live**: 1 connection (1.5%)

## Complete Connection List

### cudb-test Connections (52):
1. beamdevlive:connection:108211:cudb-test
2. beamdevlive:connection:107344:cudb-test
3. beamdevlive:connection:102347:cudb-test
4. beamdevlive:connection:117591:cudb-test
5. beamdevlive:connection:105694:cudb-test
6. beamdevlive:connection:108092:cudb-test
7. beamdevlive:connection:113310:cudb-test
8. beamdevlive:connection:108147:cudb-test
9. beamdevlive:connection:105677:cudb-test
10. beamdevlive:connection:107906:cudb-test
11. beamdevlive:connection:108322:cudb-test
12. beamdevlive:connection:102401:cudb-test
13. beamdevlive:connection:108138:cudb-test
14. beamdevlive:connection:102501:cudb-test
15. beamdevlive:connection:102294:cudb-test
16. beamdevlive:connection:107000:cudb-test
17. beamdevlive:connection:105444:cudb-test
18. beamdevlive:connection:102303:cudb-test
19. beamdevlive:connection:109352:cudb-test
20. beamdevlive:connection:102307:cudb-test
21. beamdevlive:connection:108170:cudb-test
22. beamdevlive:connection:107972:cudb-test
23. beamdevlive:connection:108143:cudb-test
24. beamdevlive:connection:103645:cudb-test
25. beamdevlive:connection:106684:cudb-test
26. beamdevlive:connection:108345:cudb-test
27. beamdevlive:connection:113314:cudb-test
28. beamdevlive:connection:108125:cudb-test
29. beamdevlive:connection:108315:cudb-test
30. beamdevlive:connection:107905:cudb-test
31. beamdevlive:connection:108336:cudb-test
32. beamdevlive:connection:102329:cudb-test
33. beamdevlive:connection:107935:cudb-test
34. beamdevlive:connection:105807:cudb-test
35. beamdevlive:connection:106254:cudb-test
36. beamdevlive:connection:102315:cudb-test
37. beamdevlive:connection:102295:cudb-test
38. beamdevlive:connection:102333:cudb-test
39. beamdevlive:connection:107968:cudb-test
40. beamdevlive:connection:108457:cudb-test
41. beamdevlive:connection:103259:cudb-test
42. beamdevlive:connection:106207:cudb-test
43. beamdevlive:connection:108818:cudb-test
44. beamdevlive:connection:109567:cudb-test
45. beamdevlive:connection:102299:cudb-test
46. beamdevlive:connection:108337:cudb-test
47. beamdevlive:connection:108121:cudb-test
48. beamdevlive:connection:108522:cudb-test
49. beamdevlive:connection:107976:cudb-test
50. beamdevlive:connection:168098:cudb-test

### org-quincy Connections (14):
1. beamdevlive:connection:102765:org-quincy
2. beamdevlive:connection:102761:org-quincy
3. beamdevlive:connection:107763:org-quincy
4. beamdevlive:connection:102773:org-quincy
5. beamdevlive:connection:102927:org-quincy
6. beamdevlive:connection:107814:org-quincy
7. beamdevlive:connection:107827:org-quincy
8. beamdevlive:connection:108768:org-quincy
9. beamdevlive:connection:107772:org-quincy
10. beamdevlive:connection:104005:org-quincy
11. beamdevlive:connection:107723:org-quincy
12. beamdevlive:connection:103018:org-quincy
13. beamdevlive:connection:103040:org-quincy
14. beamdevlive:connection:107880:org-quincy
15. beamdevlive:connection:107884:org-quincy
16. beamdevlive:connection:102695:org-quincy

### cudb-live Connections (1):
1. beamdevlive:connection:119427:cudb-live

## Analysis Summary

### Key Findings:
- **Multi-Service User**: User 102563 is connected across 3 different services
- **Primary Service**: cudb-test (77.6% of connections)
- **Secondary Service**: org-quincy (20.9% of connections)  
- **Minimal Live**: Only 1 connection to cudb-live
- **Connection Range**: Connection IDs range from 102294 to 168098
- **High Activity**: 67 active connections indicates very active user

### Connection Patterns:
- **Test Environment Dominant**: Most connections in cudb-test
- **Organization Access**: Significant presence in org-quincy
- **Live Environment**: Minimal activity in cudb-live
- **Connection Persistence**: All connections currently active

### Implications for Notifications:
- **Multiple Service Queries**: FCM token retrieval must check all 3 services
- **High BDS Load**: 67 connections mean 67 potential device queries
- **Service Distribution**: Notification logic must handle cross-service scenarios

## Connection to Main Issue
User 102563's 67 active connections explain why this user contributes significantly to the BDS query load:
- Each notification attempt queries all 67 connections
- Multiple services require separate BDS queries
- High connection count amplifies the retry loop impact

---
**Generated**: $(date)  
**Query**: FT.SEARCH "beamdevlive:connectionUserIdIndex" "@userId:{102563} @objectStatus:{active}"  
**Total Results**: 67 active connections
