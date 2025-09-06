#!/bin/bash

# Fix Redis BDS01/BDS02 HAProxy Configuration
# Remove slave servers from masters backend to fix health checks

echo "=== Redis BDS01/BDS02 HAProxy Fix ==="
echo ""

echo "Current Redis roles:"
echo "BDS00 (6380): $(redis-cli -p 6380 info replication | grep 'role:')"
echo "BDS01 (6381): $(redis-cli -p 6381 info replication | grep 'role:')" 
echo "BDS02 (6382): $(redis-cli -p 6382 info replication | grep 'role:')"
echo ""

echo "Problem: BDS01 and BDS02 are slaves but HAProxy expects them to be masters"
echo "Solution: Remove slave servers from Redis_BDS_Masters backend"
echo ""

# Backup current config
sudo cp /etc/redis-stack/haproxy-redis-stack.cfg /etc/redis-stack/haproxy-redis-stack.cfg.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Config backed up"

# Create fixed configuration
cat > /tmp/haproxy-redis-fixed.cfg << 'EOF'
global
  log		/dev/log	local6

frontend Redis_BDS
  bind		:6379
  mode            tcp
  maxconn         20000
  timeout client  1h
  timeout client-fin 1m

  option tcp-smart-accept
  option tcplog

  default_backend Redis_BDS_Masters

  log global

frontend Redis_BDS_Read_Only
  bind		:6370
  mode            tcp
  maxconn         20000
  timeout client  1h
  timeout client-fin 1m

  option tcp-smart-accept
  option tcplog

  default_backend Redis_BDS_Slaves

backend Redis_BDS_Masters
  mode            tcp
  fullconn        65535

  timeout connect 100ms
  timeout tunnel  1h
  timeout server-fin 5s

  balance leastconn

  option tcp-smart-connect
  option tcpka
  option tcp-check
  tcp-check send PING\r\n
  tcp-check expect string +PONG
  tcp-check send info\ replication\r\n
  tcp-check expect string role:master
  tcp-check send QUIT\r\n
  tcp-check expect string +OK

  # Only the master server
  server REDIS_BDS00 127.0.0.1:6380 check port 6380 inter 5000 fall 3 rise 2 on-marked-down shutdown-sessions

backend Redis_BDS_Slaves
  mode            tcp
  fullconn        65535

  timeout connect 100ms
  timeout tunnel  1h
  timeout server-fin 5s

  balance leastconn

  option tcp-smart-connect
  option tcpka
  option tcp-check
  tcp-check send PING\r\n
  tcp-check expect string +PONG
  tcp-check send info\ replication\r\n
  tcp-check expect string role:slave
  tcp-check send QUIT\r\n
  tcp-check expect string +OK

  # Only the slave servers
  server REDIS_BDS01 127.0.0.1:6381 check port 6381 inter 5000 fall 3 rise 2 on-marked-down shutdown-sessions
  server REDIS_BDS02 127.0.0.1:6382 check port 6382 inter 5000 fall 3 rise 2 on-marked-down shutdown-sessions

listen Redis_Bull_Masters
  bind            0.0.0.0:6377
  mode            tcp
  maxconn         20000
  fullconn        65535
  timeout client  3s
  timeout server  3s
  timeout connect 100ms
  timeout tunnel  400s

  balance leastconn

  option tcp-smart-accept
  option tcp-smart-connect
  option tcpka
  option tcplog
  option tcp-check
  tcp-check send PING\r\n
  tcp-check expect string +PONG
  tcp-check send info\ replication\r\n
  tcp-check expect string role:master
  tcp-check send QUIT\r\n
  tcp-check expect string +OK

  # Disabled - these servers don't exist
  # server REDIS_BULL_00 127.0.0.1:6390 check port 6390 fall 3 rise 3 on-marked-down shutdown-sessions disabled
  # server REDIS_BULL_01 127.0.0.1:6391 check port 6391 fall 3 rise 3 on-marked-down shutdown-sessions disabled
  # server REDIS_BULL_02 127.0.0.1:6392 check port 6392 fall 3 rise 3 on-marked-down shutdown-sessions disabled

frontend prometheus
  bind :8007
  mode http
  http-request use-service prometheus-exporter if { path /metrics }
  no log
  maxconn 10

frontend stats
  mode http
  bind *:6399
  stats enable
  stats uri /stats
  stats refresh 10s
  stats admin if LOCALHOST
  maxconn 10
EOF

echo "✅ Fixed configuration created"
echo ""
echo "Key changes:"
echo "1. ✅ Only BDS00 (master) in Redis_BDS_Masters backend"
echo "2. ✅ Only BDS01/BDS02 (slaves) in Redis_BDS_Slaves backend"  
echo "3. ✅ Increased health check intervals (1s → 5s)"
echo "4. ✅ Increased fall/rise thresholds for stability"
echo "5. ✅ Disabled non-existent Redis Bull servers"
echo ""

read -p "Apply the fixed configuration? (y/N): " confirm
if [[ $confirm =~ ^[Yy]$ ]]; then
    sudo cp /tmp/haproxy-redis-fixed.cfg /etc/redis-stack/haproxy-redis-stack.cfg
    echo "✅ Configuration applied"
    
    echo "Reloading HAProxy..."
    sudo systemctl reload haproxy
    
    if [ $? -eq 0 ]; then
        echo "✅ HAProxy reloaded successfully"
        echo ""
        echo "Monitoring CPU usage..."
        sleep 5
        echo "Before fix: ~44% CPU"
        echo "Current CPU: $(ps aux | grep haproxy | grep -v grep | awk '{print $3}')%"
        echo ""
        echo "Check stats: http://localhost:6399/stats"
    else
        echo "❌ HAProxy reload failed - restoring backup"
        sudo cp /etc/redis-stack/haproxy-redis-stack.cfg.backup.* /etc/redis-stack/haproxy-redis-stack.cfg
        sudo systemctl reload haproxy
    fi
else
    echo "Configuration not applied. Manual review recommended."
    echo "Fixed config available at: /tmp/haproxy-redis-fixed.cfg"
fi
