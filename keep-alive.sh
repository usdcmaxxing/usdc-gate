#!/bin/bash
# Auto-restart localhost.run tunnel and re-register with Agent402
cd ~/usdc-gate
while true; do
  # Kill any existing tunnel
  pkill -f "localhost.run" 2>/dev/null
  sleep 2
  
  # Start new tunnel
  ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:4021 nokey@localhost.run > /tmp/tunnel.log 2>&1 &
  TUNNEL_PID=$!
  
  # Wait for URL
  for i in $(seq 1 30); do
    URL=$(grep -o "https://[a-z0-9]*\.lhr\.life" /tmp/tunnel.log 2>/dev/null | head -1)
    if [ -n "$URL" ]; then
      break
    fi
    sleep 1
  done
  
  if [ -n "$URL" ]; then
    echo "Tunnel up: $URL"
    # Restart server with new origin
    pkill -f "node server.js" 2>/dev/null
    sleep 1
    SELLER_PRIVATE_KEY=$(head -1 .seller) PUBLIC_ORIGIN="$URL" node server.js > /tmp/server.log 2>&1 &
    sleep 3
    # Re-register with Agent402
    curl -s -X POST https://agent402.tools/api/index/register \
      -H 'content-type: application/json' \
      -d "{\"origin\":\"$URL\"}" > /tmp/register.log 2>&1
    echo "Registered: $(cat /tmp/register.log)"
  fi
  
  # Keep tunnel alive, check every 60s
  while kill -0 $TUNNEL_PID 2>/dev/null; do
    sleep 60
    # Ping to keep alive
    curl -s --max-time 5 "$URL/health" > /dev/null 2>&1
  done
  
  echo "Tunnel died, restarting in 5s..."
  sleep 5
done
