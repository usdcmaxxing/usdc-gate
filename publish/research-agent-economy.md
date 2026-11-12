# Agent Economy Research — Opportunities Report
*Compiled 2026-11-12 by finder, overnight autonomous session*

---

## Executive summary

Three things matter right now:

1. **The agent labor marketplace sector is pre-revenue.** ~$250 settled ever across all platforms. Don't build a business on "agents doing tasks for agents."
2. **The agent-to-agent *payments* infrastructure is real and growing.** x402: 165M+ payments, ~$50M cumulative USDC volume. Our USDC Gate sits in this layer — the right layer.
3. **Discovery is the binding constraint.** We're indexed on 1/4 directories. Circle Agent Marketplace and AgenticTrade are the two highest-value listings we don't have yet.

---

## Finding 1: The agent labor market is a graveyard

Source: *AI Agent Labor Marketplaces: A Comparative Audit (Nov 2026)* — an autonomous agent audited every platform via live API.

| Platform | Lifetime settled | Registered agents | Agents paid | Open funded jobs |
|---|---|---|---|---|
| MoltJobs | $46.30 | 1,330 | 7 | 2 (both unfunded) |
| DeskCrew Arena | $70.59 | ~454 | 21% approval | 0 |
| Toku | $10.00 | 4,059 | — | 378 (site-wide $10 earned) |
| OpenTask | unverified | — | — | $1-5 QA bounties |
| ugig.net | 0 paid | — | — | 2 commission-only |
| dealwork.ai | unverified | — | — | 19 bidding, 0 funded |

**Total: ~$250 across the entire sector.**

Key insight: *"Funded demand is the binding constraint, not agent supply."* 1,330 agents competing for 2 unfunded jobs.

**Verdict: do NOT build a labor marketplace or bid on agent tasks. The money isn't there.**

---

## Finding 2: The payments layer IS real

Source: *Agent-to-Agent Payments: A Field Guide to the 2026 Stack* (gigs.sh)

- x402: **165M+ payments, ~$50M cumulative USDC volume** (April 2026)
- 97% of onchain agent transactions use x402
- The default working stack: **MCP-aware agent + x402 wallet + USDC on Base**

**Two competing stacks:**
| | Crypto-native | Identity-native |
|---|---|---|
| Stack | Coinbase x402 + Circle USDC + ERC-8004 + World ID | Visa TAP + Mastercard Agent Pay + Stripe ACP + AP2 |
| Model | Pseudonymous agents | Every agent traces to a human |
| Status | Production | Pilot/issuer-gated |

**Verdict: USDC Gate is in the right layer. Keep building.**

---

## Finding 3: Directory landscape (where to list)

| Directory | Listed? | Notes |
|---|---|---|
| Agentic.Market (Coinbase) | ❌ | Auto-indexes after settled payment |
| CDP Bazaar | ❌ | Auto-indexes after settled payment |
| x402scan | ❌ | Manual registration |
| Agent402 | ✅ | Registered (5 tools) |
| **Circle Agent Marketplace** | ❌ | **Manual form, high value** |
| **AgenticTrade** | ❌ | **791 services, 1,254 agents, USDC payouts** |
| Glama | ❌ | MCP directory |
| Smithery | ❌ | MCP directory |

### Circle Agent Marketplace (HIGH PRIORITY)
- Launched July 2026 by Circle
- Curated catalog of x402 services that accept USDC
- **Every listing is sanctions-screened and health-checked**
- Discovery API: `GET https://api.circle.com/v2/x402/discovery/resources`
- 50 resources listed, all on Base mainnet (eip155:8453)
- **We're not listed because we're on Base Sepolia (eip155:84532)**

**Listing requirements (we meet all 3):**
1. ✅ Returns 402 when unpaid
2. ✅ Published OpenAPI spec
3. ✅ Confirmed payout wallet

**How to list:** Submit https://forms.gle/7YFzvdmMcn1JH5tF6 with endpoint URL, payout wallet, description.

### AgenticTrade (HIGH PRIORITY)
- 791+ services, 4,886 service calls, 1,254 active agents
- Commission: 0% first month, 5% months 2-3, caps at 10%
- Pays in USDC, auto-withdrawal
- Health score system (0-100): uptime, response time, error rate
- High-quality providers (95+) get commission discount (6% instead of 10%)
- MCP-based discovery
- **How to list:** https://agentictrade.io/providers

---

## Finding 4: ERC-8004 — agent identity & reputation

Source: 8004.org

- **Live on Ethereum mainnet since January 2026**
- 10,000+ agents registered, 20,000+ feedback entries
- Three on-chain registries: Identity, Reputation, Validation
- Authored by MetaMask AI Lead, Ethereum Foundation Head of AI, Google, Coinbase engineers
- Audited by Cyfrin, Nethermind, EF Security Team
- Coming to Base, Optimism, Polygon, Arbitrum, Linea, Scroll

**Why it matters:** If we register USDC Gate as an agent, we get:
- Portable identity (ERC-721 agent card)
- Verifiable reputation (feedback from buyers)
- Discovery on 8004scan.io, agentscan.info, 8004agents.ai

**Verdict: Register once Base deployment is live. Low cost, potential upside.**

---

## Finding 5: Circle's own facilitator

- **Circle Facilitator Service** launched September 2026
- Hosted x402 facilitator for Arc, Base, Polygon PoS
- Supports `upto` scheme for usage-based payments
- This is a direct alternative to x402.org's public facilitator

**Verdict: Consider switching to Circle's facilitator for mainnet. It's the issuer's own infrastructure.**

---

## Finding 6: Hackathons with real money

| Hackathon | Prize pool | Status |
|---|---|---|
| Crypto World's Fair | $840,000 + $2.5M seed | Submissions closed Oct 12 |
| NEAR Hackathon | $250,000 | Nov 1-14, 2026 (closed) |

**Verdict: Hackathons are real money but competitive. Worth tracking for future ones.**

---

## Recommended actions (in priority order)

### Immediate (no user decision needed)
1. ✅ Register on Agent402 — DONE
2. ✅ Build catalog, dashboard, landing page — DONE
3. ✅ Write publish-ready posts — DONE
4. ⬜ Prepare Circle Marketplace submission details (ready for user to submit)
5. ⬜ Prepare AgenticTrade listing details (ready for user to submit)

### Requires user decision
6. **Deploy on Base mainnet** — unlocks Circle Marketplace listing + real agents
7. **Fund wallets** — buyer needs USDC + ETH for gas; seller needs USDC
8. **Submit Circle Marketplace form** — https://forms.gle/7YFzvdmMcn1JH5tF6
9. **List on AgenticTrade** — https://agentictrade.io/providers
10. **Register on ERC-8004** — after mainnet deployment

---

## The honest bottom line

| Path | Revenue potential | Effort | Status |
|---|---|---|---|
| Agent labor marketplaces | ~$0 | High | Avoid |
| Agent-to-agent data APIs | $72-360/mo | Low | Building ✅ |
| Human compliance teams | $500-2,000/mo | Medium | Not started |
| Directory listings | Discovery only | Low | 1/6 done |

**The agent data market is real but thin. The human compliance market is the real revenue.** Same backend, different buyers.