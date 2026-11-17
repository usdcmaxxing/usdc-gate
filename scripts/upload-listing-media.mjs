// Upload generated logo + screenshot to Agensi listings (base64 data URLs).
// Usage: node scripts/upload-listing-media.mjs
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA = path.join(__dirname, "..", "skill-store", "media");
const AGENTSI = path.join(__dirname, "agensi.mjs");

const skills = readdirSync(MEDIA)
  .filter((f) => f.endsWith("-logo.png"))
  .map((f) => f.replace("-logo.png", ""));

for (const slug of skills) {
  const logo = readFileSync(path.join(MEDIA, `${slug}-logo.png`)).toString("base64");
  const shots = readdirSync(MEDIA)
    .filter((f) => f.startsWith(`${slug}-`) && f.endsWith("-shot.png"))
    .map((f) => `data:image/png;base64,` + readFileSync(path.join(MEDIA, f)).toString("base64"));

  const args = JSON.stringify({
    skill_slug: slug,
    logo: `data:image/png;base64,${logo}`,
    screenshots: shots,
  });
  try {
    const out = execFileSync("node", [AGENTSI, "upload_skill_media", args], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    console.log(`✅ ${slug}\n${out.trim()}\n`);
  } catch (e) {
    console.log(`❌ ${slug}: ${e.message}\n${e.stdout || ""}${e.stderr || ""}`);
  }
}