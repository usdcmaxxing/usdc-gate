// Submit a skill folder to Agensi. Two-phase: preview (draft) then confirm.
// Usage: node scripts/submit-skill.mjs <folder> <fields.json> [--confirm]
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.join(__dirname, "agensi.mjs");

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

const [folder, fieldsPath] = process.argv.slice(2);
const fields = JSON.parse(readFileSync(fieldsPath, "utf8"));
const files = walk(folder).map((p) => ({
  path: path.relative(folder, p),
  content: readFileSync(p, "utf8"),
}));

const args = JSON.stringify({ ...fields, files });

const { execFileSync } = await import("node:child_process");
const out = execFileSync("node", [SKILL_DIR, "submit_skill", args], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
console.log(out);