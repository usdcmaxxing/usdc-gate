#!/usr/bin/env node
// USDC Gate — MCP server (stdio).
//
// Exposes the counterparty check to MCP clients (Claude Desktop, Cursor, etc.).
// This is the acquisition funnel: the tool is free but rate-limited, and the
// production paid endpoint is the x402 route on server.js.
//
// Run:  node mcp-server.js
// Configure an MCP client with:  node /path/to/mcp-server.js  (stdio)

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { checkCounterparty } from "./check.js";

const RATE_LIMIT = Number(process.env.MCP_RATE_LIMIT || 30);
const RATE_WINDOW_MS = Number(process.env.MCP_RATE_WINDOW_MS || 3_600_000);
const CHAIN_KEY = process.env.CHAIN_KEY || "base-sepolia";

const hits = [];

function rateLimited() {
  const now = Date.now();
  while (hits.length && now - hits[0] > RATE_WINDOW_MS) hits.shift();
  if (hits.length >= RATE_LIMIT) return true;
  hits.push(now);
  return false;
}

const server = new McpServer({
  name: "usdc-gate",
  version: "0.2.0",
  description:
    "Pre-flight counterparty risk for USDC payments. USDC only. " +
    "The issuer blacklist is read live on-chain; OFAC SDN is a dated snapshot.",
});

const inputSchema = {
  payer: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/, "payer must be an EVM address"),
  payee: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/, "payee must be an EVM address"),
  chain: z
    .enum(["base-sepolia", "base"])
    .optional()
    .describe("Chain key (default: base-sepolia)"),
  asset: z
    .string()
    .optional()
    .describe("Asset contract address (default: native USDC on the chain)"),
  amount: z.string().optional().describe("Optional amount for policy checks"),
};

server.registerTool(
  "check_counterparty",
  {
    title: "USDC counterparty check",
    description:
      "Pre-flight counterparty risk check for a USDC payment. Answers: is the asset " +
      "real Circle-native USDC, is either address on Circle's live on-chain issuer " +
      "blacklist or the OFAC SDN list, and what does the money flow look like " +
      "(shared funder, mixer exposure, peel chain)? Free for evaluation, rate-limited; " +
      "the production paid endpoint is POST /v1/check-counterparty (x402, $0.02).",
    inputSchema,
  },
  async ({ payer, payee, chain, asset, amount }) => {
    if (rateLimited()) {
      return {
        content: [
          {
            type: "text",
            text: `Rate limit reached (${RATE_LIMIT} calls per hour). For production volume, use the paid x402 endpoint: POST /v1/check-counterparty.`,
          },
        ],
        isError: true,
      };
    }
    try {
      const verdict = await checkCounterparty({
        payer,
        payee,
        chain: chain || CHAIN_KEY,
        asset,
        amount,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(verdict, null, 2) }],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Check failed: ${e?.message || e}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "service_info",
  {
    title: "USDC Gate service info",
    description: "Returns what this service checks, the chains it supports, and how to pay for it.",
    inputSchema: {},
  },
  async () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            service: "USDC Gate",
            checks: [
              "asset identity (native vs bridged USDC)",
              "Circle live issuer blacklist (on-chain isBlacklisted)",
              "OFAC SDN (dated snapshot)",
              "flow: shared funder, mixer exposure, peel chain, new payee",
            ],
            chains: ["base-sepolia", "base"],
            paid_endpoint: "POST /v1/check-counterparty (x402, $0.02 USDC)",
            note: "This MCP tool is the free evaluation funnel. Production traffic belongs on the paid endpoint.",
          },
          null,
          2
        ),
      },
    ],
  })
);

await server.connect(new StdioServerTransport());
console.error("[usdc-gate-mcp] listening on stdio");
