// Smoke test for the MCP server (stdio). Spawns the real server and speaks
// JSON-RPC to it: initialize -> tools/list -> tools/call. No test runner needed.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const proc = spawn("node", ["mcp-server.js"], {
  cwd: ROOT,
  stdio: ["pipe", "pipe", "pipe"],
});

let buffer = "";
const pending = new Map();

proc.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  let idx;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    } catch {
      // non-JSON noise on stdout: ignore
    }
  }
});

proc.stderr.on("data", () => {});

function send(obj) {
  proc.stdin.write(JSON.stringify(obj) + "\n");
}

function request(id, method, params) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timeout waiting for id=${id}`)),
      60_000
    );
    pending.set(id, (msg) => {
      clearTimeout(timer);
      resolve(msg);
    });
    send({ jsonrpc: "2.0", id, method, params });
  });
}

const assert = (cond, msg) => {
  if (!cond) throw new Error(`assert failed: ${msg}`);
};

const init = await request(1, "initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "smoke", version: "1.0" },
});
assert(init.result, "initialize failed");

send({ jsonrpc: "2.0", method: "notifications/initialized" });

const tools = await request(2, "tools/list", {});
const names = tools.result.tools.map((t) => t.name);
assert(names.includes("check_counterparty"), "check_counterparty tool missing");

const info = await request(3, "tools/call", {
  name: "service_info",
  arguments: {},
});
const infoJson = JSON.parse(info.result.content[0].text);
assert(infoJson.service === "USDC Gate", "service_info returned wrong service");

const check = await request(4, "tools/call", {
  name: "check_counterparty",
  arguments: {
    payer: "0x1111111111111111111111111111111111111111",
    payee: "0x2222222222222222222222222222222222222222",
    amount: "0.02",
  },
});
const verdict = JSON.parse(check.result.content[0].text);
assert(
  ["APPROVE", "HOLD", "REJECT"].includes(verdict.verdict),
  `unexpected verdict: ${verdict.verdict}`
);

proc.kill();
console.log(`MCP smoke OK — tools: ${names.join(", ")}; verdict: ${verdict.verdict}`);
