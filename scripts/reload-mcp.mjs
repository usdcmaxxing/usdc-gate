// Trigger an MCP reload on the running gateway over its local WebSocket.
// Usage: node scripts/reload-mcp.mjs
import { execSync } from "node:child_process";
import WebSocket from "ws";

const raw = execSync("hermes gateway attach --json", { encoding: "utf8", timeout: 30000 });
const info = JSON.parse(raw);
const url = info.url;
const ticket = info.ticket;
const subprotocols = info.protocols;
console.log("gateway:", url);
console.log("protocols:", subprotocols.join(", "));

const ws = new WebSocket(url, subprotocols, { timeout: 15000 });

const done = (code, msg) => { console.log(msg); try { ws.close(); } catch {} process.exit(code); };

ws.on("open", () => {
  console.log("connected");
  ws.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "reload.mcp", params: { confirm: true } }));
});

ws.on("message", (data) => {
  const text = data.toString();
  console.log("←", text.slice(0, 600));
  let msg;
  try { msg = JSON.parse(text); } catch { return; }
  if (msg.id === 1) {
    if (msg.error) done(1, "RPC error: " + JSON.stringify(msg.error));
    else done(0, "✓ reload.mcp answered");
  }
});

ws.on("error", (e) => done(1, "ws error: " + e.message));
ws.on("unexpected-response", (_req, res) => done(1, "unexpected response: HTTP " + res.statusCode));

setTimeout(() => done(1, "timeout waiting for reply"), 25000);