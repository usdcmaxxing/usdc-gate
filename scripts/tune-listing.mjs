// Tune a live Agensi listing's search metadata.
// Usage: node scripts/tune-listing.mjs <skill-folder> <fields.json>
// Reads every file in the folder and ships them with new listing fields.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTSI = path.join(__dirname, "agensi.mjs");

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e.startsWith(".")) continue;
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const [folder, fieldsJson] = process.argv.slice(2);
if (!folder || !fieldsJson) {
  console.error("usage: node tune-listing.mjs <skill-folder> <fields.json>");
  process.exit(1);
}

const files = walk(folder).map((p) => ({
  path: path.relative(folder, p),
  content: readFileSync(p, "utf8"),
}));
const fields = JSON.parse(fieldsJson);

// call the MCP tool through the helper (it prints the result)
import { execFileSync } from "node:child_process";
const args = JSON.stringify({ ...fields, files });
const out = execFileSync("node", [AGENTSI, "update_skill", args], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
console.log(out);