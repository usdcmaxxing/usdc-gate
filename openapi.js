// AgentCash / x402scan discovery document (OpenAPI 3.1 with x-payment-info)
// Spec: https://agentcash.dev/discovery

export function openApiDocument(origin) {
  return {
    openapi: "3.1.0",
    info: {
      title: "USDC Gate",
      version: "1.0.0",
      description:
        "Pre-flight counterparty risk for USDC payments. USDC only. " +
        "Checks Circle issuer blacklist, OFAC SDN, and on-chain flow patterns.",
      contact: {
        name: "USDC Gate",
        url: "https://github.com/usdcmaxxing/usdc-gate",
      },
      "x-guidance":
        "Use POST /v1/check-counterparty to check if an address is safe to pay in USDC. " +
        "Use GET /v1/token-price?symbol=ETH for real-time token prices. " +
        "Use POST /v1/wallet-score for a broader wallet risk score (0-100). " +
        "All paid endpoints return 402 Payment Required until paid in USDC via x402.",
    },
    "x-discovery": {
      ownershipProofs: [],
    },
    servers: [{ url: origin }],
    paths: {
      "/v1/check-counterparty": {
        post: {
          operationId: "checkCounterparty",
          summary: "Counterparty risk check (paid)",
          description:
            "Pre-flight counterparty risk check for a USDC payment. " +
            "Returns APPROVE, HOLD, or REJECT with reason codes.",
          tags: ["Risk"],
          "x-payment-info": {
            price: { mode: "fixed", currency: "USD", amount: "0.020000" },
            protocols: [{ x402: {} }],
          },
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    payer: { type: "string", description: "Payer address (0x…)" },
                    payee: { type: "string", description: "Payee address (0x…)" },
                    chain: { type: "string", enum: ["base-sepolia", "base"] },
                    amount: { type: "string" },
                  },
                  required: ["payer", "payee"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Risk verdict",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      verdict: { type: "string", enum: ["APPROVE", "HOLD", "REJECT"] },
                      reason_codes: { type: "array", items: { type: "string" } },
                    },
                  },
                },
              },
            },
            "402": { description: "Payment Required" },
          },
        },
        get: {
          operationId: "checkCounterpartyGet",
          summary: "Counterparty risk check (paid, query params)",
          tags: ["Risk"],
          "x-payment-info": {
            price: { mode: "fixed", currency: "USD", amount: "0.020000" },
            protocols: [{ x402: {} }],
          },
          parameters: [
            { name: "payer", in: "query", required: true, schema: { type: "string" } },
            { name: "payee", in: "query", required: true, schema: { type: "string" } },
            { name: "chain", in: "query", schema: { type: "string", enum: ["base-sepolia", "base"] } },
          ],
          responses: {
            "200": { description: "Risk verdict" },
            "402": { description: "Payment Required" },
          },
        },
      },
      "/v1/token-price": {
        get: {
          operationId: "tokenPrice",
          summary: "Real-time token price (paid)",
          description: "Fetches current token price from CoinGecko.",
          tags: ["Data"],
          "x-payment-info": {
            price: { mode: "fixed", currency: "USD", amount: "0.010000" },
            protocols: [{ x402: {} }],
          },
          parameters: [
            { name: "symbol", in: "query", schema: { type: "string" }, description: "Token symbol (ETH, BTC, SOL)" },
            { name: "symbols", in: "query", schema: { type: "string" }, description: "Comma-separated symbols" },
          ],
          responses: {
            "200": {
              description: "Token price",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      token: { type: "string" },
                      price_usd: { type: "number" },
                      change_24h_pct: { type: "number" },
                    },
                  },
                },
              },
            },
            "402": { description: "Payment Required" },
          },
        },
      },
      "/v1/wallet-score": {
        post: {
          operationId: "walletScore",
          summary: "Wallet risk score (paid)",
          description: "Broader wallet risk assessment: sanctions, blacklist, activity, contract detection.",
          tags: ["Risk"],
          "x-payment-info": {
            price: { mode: "fixed", currency: "USD", amount: "0.030000" },
            protocols: [{ x402: {} }],
          },
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    address: { type: "string", description: "Wallet address (0x…)" },
                    chain: { type: "string", enum: ["base-sepolia", "base"] },
                  },
                  required: ["address"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Wallet risk score",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      address: { type: "string" },
                      risk_score: { type: "number" },
                      risk_level: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
                      flags: { type: "array", items: { type: "string" } },
                    },
                  },
                },
              },
            },
            "402": { description: "Payment Required" },
          },
        },
      },
      "/v1/sample": {
        get: {
          operationId: "sample",
          summary: "Free sample verdict",
          description: "Static example of the verdict shape. Free, ungated.",
          tags: ["Free"],
          responses: {
            "200": { description: "Sample verdict" },
          },
        },
      },
      "/health": {
        get: {
          operationId: "health",
          summary: "Health check",
          description: "Liveness check. Free, ungated.",
          tags: ["Free"],
          responses: {
            "200": { description: "OK" },
          },
        },
      },
    },
  };
}