#!/usr/bin/env bash
# USDC Gate — end-to-end demo
# 1. starts the x402 server (Base Sepolia, USDC only)
# 2. shows the free sample verdict
# 3. shows an unpaid request returning a real HTTP 402
# 4. shows the buyer paying (real wire exchange; settles if the wallet is funded)
set -euo pipefail
cd "$(dirname "$0")"

export SELLER_PRIVATE_KEY="$(head -1 .seller)"

echo "############################################################"
echo "# USDC GATE — end-to-end demo"
echo "# chain: Base Sepolia (84532) | asset: native USDC"
echo "############################################################"

# 1. start server
node server.js &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 5

echo
echo "--- 1. health -------------------------------------------------"
curl -s http://localhost:4021/health | jq .

echo
echo "--- 2. free sample verdict ------------------------------------"
curl -s http://localhost:4021/v1/sample | jq '{sample, verdict, reason_codes}'

echo
echo "--- 3. unpaid request -> real HTTP 402 ------------------------"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST http://localhost:4021/v1/check-counterparty \
  -H 'content-type: application/json' \
  -d "{\"payer\":\"$(sed -n 2p .buyer)\",\"payee\":\"$(sed -n 2p .seller)\",\"amount\":\"0.02\"}"

echo
echo "--- 4. buyer pays (x402 client) -------------------------------"
node client.mjs

echo
echo "--- 5. live verdict logic (no payment needed) -----------------"
node demo-verdict.mjs
