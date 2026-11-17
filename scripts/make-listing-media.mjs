// Generate logo + screenshot PNGs for Agensi listings via headless Chromium.
// Usage: PLAYWRIGHT_BROWSERS_PATH=~/Library/Caches/ms-playwright node scripts/make-listing-media.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "skill-store", "media");
fs.mkdirSync(OUT, { recursive: true });

const SKILLS = [
  {
    slug: "agent-risk-scorecard-read-an-agent-s-on-chain-risk",
    short: "Agent Risk Scorecard",
    tag: "Read an Agent's On-Chain Risk",
    accent: "#34d399",
    price: "FREE",
    points: ["Checks the wallet, not the pitch", "4 mechanical gates + decision score", "Flags staged proofs and old tx history", "One verdict: fund / proof-first / decline"],
    cmd: "$ agent-risk score 0x9A04…276f",
    out: ["wallet age 14d  →  too new", "tx history 3 tx  →  no track record", "proof: none supplied", "VERDICT: PROOF-FIRST (score 22/100)"],
  },
  {
    slug: "agent-risk-verdicts-underwrite-ai-agents-with-signed-proof",
    short: "Agent Risk Verdicts",
    tag: "Underwrite AI Agents with Signed Proof",
    accent: "#f59e0b",
    price: "$29",
    points: ["Verdicts bound to a wallet + timestamp", "Challenges an agent to prove its claim", "Survives copying — the proof is on-chain", "Built for underwriters, not vibes"],
    cmd: "$ agent-risk verify --challenge 0x9A04…276f",
    out: ["challenge issued → eip712", "agent signed 0x8f31…c2", "proof age 2m  →  fresh", "VERDICT: FUND (score 88/100)"],
  },
  {
    slug: "x402-implementation-gotchas-the-bugs-that-actually-bite",
    short: "x402 Implementation Gotchas",
    tag: "The Bugs That Actually Bite",
    accent: "#22d3ee",
    price: "$19",
    points: ["viem getLogs drops a bare topics array", "Public Base RPC rate-limits eth_getLogs", "EIP-712 bigints break JSON.stringify", "Structure a paid route so settlement verifies"],
    cmd: "$ x402 test --route /v1/dataset",
    out: ["402 challenge  ✓", "facilitator     ✓", "settlement      ✓", "8 gotchas fixed"],
  },
  {
    slug: "build-paid-apis-for-ai-agents-x402-usdc",
    short: "Build Paid APIs for AI Agents",
    tag: "x402 + USDC, per call",
    accent: "#a78bfa",
    price: "$29",
    points: ["The 402 challenge flow, end to end", "Facilitator verifies + settles in USDC", "Pricing in atomic units", "The honest per-recipient economics"],
    cmd: "$ curl -i /v1/dataset -H 'accept: application/json'",
    out: ["HTTP 402 Payment Required", "x-payment: scheme=exact, USDC", "network: base, amount: 20000", "→ 200 OK after settlement"],
  },
  {
    slug: "ai-agent-security-audit-permissions-injection-spend",
    short: "AI Agent Security Audit",
    tag: "Permissions, Injection, Spend",
    accent: "#f43f5e",
    price: "FREE",
    points: ["Least-privilege tool and MCP scopes", "Instruction/data separation test", "Spend caps enforced in code, not prompts", "Scoped secrets + a real kill switch"],
    cmd: "$ agent-audit run ./agent",
    out: ["tools: 6 (2 over-scoped)", "injection test: PASSED", "spend cap: hard, in code", "VERDICT: SAFE TO RUN"],
  },
];

const logoHTML = (s) => `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:800px;height:800px;background:#070b12;display:flex;align-items:center;justify-content:center;
       font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;color:#e6edf3;overflow:hidden}
  .ring{position:absolute;width:760px;height:760px;border-radius:50%;border:1px solid ${s.accent}22}
  .ring2{position:absolute;width:560px;height:560px;border-radius:50%;border:1px dashed ${s.accent}33}
  .in{position:relative;text-align:center;padding:60px}
  .badge{display:inline-block;font-size:26px;letter-spacing:4px;color:${s.accent};border:1px solid ${s.accent}55;
         padding:10px 26px;border-radius:999px;margin-bottom:44px}
  h1{font-size:82px;line-height:1.02;font-weight:800;letter-spacing:-2px}
  h1 span{color:${s.accent}}
  .tag{margin-top:34px;font-size:34px;color:#8b98a9;font-weight:500}
  .price{margin-top:40px;font-size:30px;font-weight:700;color:#0b0f14;background:${s.accent};
         display:inline-block;padding:12px 34px;border-radius:10px}
</style></head><body>
  <div class="ring"></div><div class="ring2"></div>
  <div class="in">
    <div class="badge">AGENSI SKILL</div>
    <h1>${s.short.split(" ").map((w, i) => (i === 1 ? `<span>${w}</span>` : w)).join(" ")}</h1>
    <div class="tag">${s.tag}</div>
    <div class="price">${s.price}</div>
  </div>
</body></html>`;

const shotHTML = (s) => `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1440px;height:900px;background:#0a0e15;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;
       color:#e6edf3;padding:56px 64px;display:flex;flex-direction:column}
  .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:34px}
  .name{font-size:40px;font-weight:800;letter-spacing:-1px}
  .name span{color:${s.accent}}
  .pill{font-size:24px;font-weight:700;color:#0b0f14;background:${s.accent};padding:10px 26px;border-radius:999px}
  .grid{display:grid;grid-template-columns:1fr 1.35fr;gap:36px;flex:1}
  .card{background:#111826;border:1px solid #1f2a3a;border-radius:18px;padding:34px}
  .card h3{font-size:22px;letter-spacing:3px;color:${s.accent};margin-bottom:24px;text-transform:uppercase}
  ul{list-style:none}
  li{font-size:27px;line-height:1.5;color:#c6d0dc;padding-left:30px;position:relative;margin-bottom:18px}
  li:before{content:"▸";position:absolute;left:0;color:${s.accent}}
  .term{background:#05080d;border:1px solid #1f2a3a;border-radius:18px;padding:30px;
        font-family:'SF Mono',Menlo,monospace;font-size:24px;line-height:1.65;overflow:hidden}
  .term .p{color:${s.accent}}
  .term .ok{color:#34d399}
  .term .dim{color:#6b7787}
  .foot{margin-top:30px;font-size:21px;color:#6b7787;text-align:center;letter-spacing:1px}
</style></head><body>
  <div class="top">
    <div class="name">${s.short.split(" ").map((w, i) => (i === 1 ? `<span>${w}</span>` : w)).join(" ")}</div>
    <div class="pill">${s.price}</div>
  </div>
  <div class="grid">
    <div class="card"><h3>What you get</h3><ul>${s.points.map((p) => `<li>${p}</li>`).join("")}</ul></div>
    <div class="card"><h3>In action</h3><div class="term">
      <div><span class="p">${s.cmd.split(" ")[0]}</span> ${s.cmd.split(" ").slice(1).join(" ")}</div>
      ${s.out.map((l) => `<div class="${/✓|VERDICT|fixed|OK/.test(l) ? "ok" : "dim"}">${l}</div>`).join("")}
    </div></div>
  </div>
  <div class="foot">LOAD IT WITH ONE COMMAND · WORKS IN HERMES, CLAUDE CODE, OPENCLAW</div>
</body></html>`;

const browser = await chromium.launch();
for (const s of SKILLS) {
  const page = await browser.newPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 1 });
  await page.setContent(logoHTML(s));
  const logo = path.join(OUT, `${s.slug}-logo.png`);
  await page.screenshot({ path: logo });
  await page.close();

  const p2 = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await p2.setContent(shotHTML(s));
  const shot = path.join(OUT, `${s.slug}-shot.png`);
  await p2.screenshot({ path: shot });
  await p2.close();

  console.log(`${s.short.padEnd(30)} logo ${(fs.statSync(logo).size / 1024).toFixed(0)}KB  shot ${(fs.statSync(shot).size / 1024).toFixed(0)}KB`);
}
await browser.close();
console.log(`\n→ ${OUT}`);