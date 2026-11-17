// Call Agensi MCP tools directly (Streamable HTTP + cached OAuth token).
// Usage:
//   node scripts/agensi.mjs <tool> [json-args]
//   node scripts/agensi.mjs tools            # list available tools
//
// Examples:
//   node scripts/agensi.mjs search_skills '{"query":"pdf"}'
//   node scripts/agensi.mjs get_skill '{"slug":"some-skill"}'
//   node scripts/agensi.mjs my_credits

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(__dirname, "..", "..", ".hermes", "profiles", "findy", "mcp-tokens", "agensi.json");
const ENDPOINT = "https://mcp.agensi.io/mcp/auth";

let token;
try {
  token = JSON.parse(readFileSync(TOKEN_FILE, "utf8")).access_token;
} catch (e) {
  console.error("No Agensi token. Run: hermes mcp login agensi");
  process.exit(1);
}

async function rpc(method, params = {}, { notify = false, sessionId } = {}) {
  const payload = { jsonrpc: "2.0", method, params };
  if (!notify) payload.id = 1;
  const headers = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    authorization: `Bearer ${token}`,
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  const res = await fetch(ENDPOINT, { method: "POST", headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(60000) });
  const sid = res.headers.get("mcp-session-id") || sessionId;
  const text = (await res.text()).trim();
  if (!text) return { sid, json: null };
  const json = text.startsWith("{") ? JSON.parse(text) : parseSse(text);
  return { sid, json };
}

function parseSse(text) {
  for (const line of text.split("\n")) {
    if (line.startsWith("data:")) {
      try { return JSON.parse(line.slice(5).trim()); } catch {}
    }
  }
  return JSON.parse(text);
}

async function main() {
  const [tool, argsJson] = process.argv.slice(2);
  const args = argsJson ? JSON.parse(argsJson) : {};

  // handshake
  const init = await rpc("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "findy", version: "1.0" },
  });
  const sid = init.sid;
  await rpc("notifications/initialized", {}, { notify: true, sessionId: sid });

  if (!tool || tool === "tools") {
    const r = await rpc("tools/list", {}, { sessionId: sid });
    const tools = r.json.result?.tools || [];
    for (const t of tools) console.log(`  ${t.name.padEnd(24)} ${(t.description || "").slice(0, 80)}`);
    console.log(`\n${tools.length} tools`);
    return;
  }

  const r = await rpc("tools/call", { name: tool, arguments: args }, { sessionId: sid });
  const content = r.json.result?.content;
  if (content) {
    for (const c of content) {
      if (c.type === "text") console.log(c.text);
      else console.log(JSON.stringify(c, null, 2));
    }
  } else {
    console.log(JSON.stringify(r.json, null, 2));
  }
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });