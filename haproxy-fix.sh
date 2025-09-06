#!/bin/bash

# HAProxy High CPU Fix Script
# Disables failed Redis servers to reduce CPU usage

echo "=== HAProxy High CPU Fix ==="
echo "Current HAProxy CPU usage:"
ps aux | grep haproxy | grep -v grep

echo ""
echo "=== Current Backend Status ==="
curl -s http://localhost:6399/stats | grep -E "(REDIS_BDS|REDIS_BULL)" | grep -E "(UP|DOWN)" | head -10

echo ""
echo "=== Solution Options ==="
echo "1. Disable failed servers in HAProxy config"
echo "2. Increase health check intervals"
echo "3. Remove non-existent servers from config"
echo ""

read -p "Choose option (1-3): " choice

case $choice in
    1)
        echo "Disabling failed servers via HAProxy stats..."
        # Disable failed Redis BDS servers
        curl -X POST "http://localhost:6399/stats" -d "s=REDIS_BDS01&action=disable&b=Redis_BDS_Masters"
        curl -X POST "http://localhost:6399/stats" -d "s=REDIS_BDS02&action=disable&b=Redis_BDS_Masters"
        curl -X POST "http://localhost:6399/stats" -d "s=REDIS_BDS01&action=disable&b=Redis_BDS_Slaves"
        curl -X POST "http://localhost:6399/stats" -d "s=REDIS_BDS02&action=disable&b=Redis_BDS_Slaves"
        
        # Disable failed Redis Bull servers
        curl -X POST "http://localhost:6399/stats" -d "s=REDIS_BULL_00&action=disable&b=Redis_Bull_Masters"
        curl -X POST "http://localhost:6399/stats" -d "s=REDIS_BULL_01&action=disable&b=Redis_Bull_Masters"
        curl -X POST "http://localhost:6399/stats" -d "s=REDIS_BULL_02&action=disable&b=Redis_Bull_Masters"
        
        echo "Failed servers disabled. CPU usage should decrease."
        ;;
    2)
        echo "Creating optimized HAProxy config with longer intervals..."
        cp /etc/redis-stack/haproxy-redis-stack.cfg /etc/redis-stack/haproxy-redis-stack.cfg.backup
        
        # Create optimized config
        sed -i 's/inter 1000/inter 10000/g' /etc/redis-stack/haproxy-redis-stack.cfg
        sed -i 's/fall 1/fall 3/g' /etc/redis-stack/haproxy-redis-stack.cfg
        sed -i 's/rise 1/rise 3/g' /etc/redis-stack/haproxy-redis-stack.cfg
        
        echo "Config updated. Restart HAProxy to apply changes:"
        echo "sudo systemctl reload haproxy"
        ;;
    3)
        echo "Creating minimal HAProxy config with only working servers..."
        cp /etc/redis-stack/haproxy-redis-stack.cfg /etc/redis-stack/haproxy-redis-stack.cfg.backup
        
        # This would require editing the config file
        echo "Manual config edit required. Backup created."
        echo "Edit /etc/redis-stack/haproxy-redis-stack.cfg"
        echo "Comment out or remove failed server lines"
        ;;
    *)
        echo "Invalid choice"
        ;;
esac

echo ""
echo "=== After Fix - Check CPU Usage ==="
echo "Monitor with: watch 'ps aux | grep haproxy | grep -v grep'"

