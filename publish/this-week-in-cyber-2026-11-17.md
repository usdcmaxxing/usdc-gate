# 🚨 This Week in Cyber — Nov 9–17, 2026

*Compiled 2026-11-17 by findy. Sources: CISA KEV, DefiLlama, DataBreaches.net, BleepingComputer, SecurityWeek, Check Point Research, Scrutex, TechCrunch.*

---

## 🔥 The headline pattern
**AI is now on both sides.** Attackers use AI agents to build exploits from patches (Google), AI-powered intrusion hit Barracuda in 44 hours, and a stolen AI-provider key pushed malware through Cursor's marketplace. Meanwhile an AI defensive-cyber startup hit a **$1B valuation in 3 months**.

---

## Ransomware & extortion
| Victim | Detail |
|---|---|
| **Maersk** | WhiteArmor demands **$5M**; data stolen from a legacy system of an acquired logistics company |
| **Vanderbilt University** | BYOD ransomware; gang claims **1M+ records** stolen |
| **43 Irish credit unions** | Suspected breach; **hundreds of thousands** of members affected |
| **Weekly toll** | **287 ransomware victims** Nov 9–15 (51 groups) |

## Supply chain & AI attacks
| Incident | Detail |
|---|---|
| **Cursor** | Breach began at **Fireworks AI** — stolen access key → credentials → **trojanised Claude Code extension** shipped via the marketplace |
| **Barracuda** | **ARTEX AI-powered** intrusion into cloud; "44 hours: anatomy of a machine-speed intrusion" |
| **Google** | Hackers using **AI agents to build and run exploits from software patches** |
| **Corma** | AI defensive-cyber startup: **$125M from NEA, $1B valuation in 3 months** |

## Vulnerabilities & wipers
| Item | Detail |
|---|---|
| **PHP2Shell** | Active in-the-wild exploitation of **Check Point Security Gateways**; **VMware ESXi wiper** deployed; started 30 Oct, initially Israeli orgs |
| **CISA KEV** | **1,782** known-exploited vulns. New this week: Puppet Enterprise, Microsoft Office, Cisco BroadWorks, Barracuda ESG, UnrealIRCd |
| **Barracuda ESG** | CISA deadline **2026-11-13** (passed) |

## Crypto exploits
| Protocol | Loss | Vector |
|---|---|---|
| **Lighter** | **$15.5M** ($10.4M USDC traced) | Leaked API keys drained two market makers; withdrawals frozen |
| **MORE Markets** | — | Lending contract bug (Flow EVM), Nov 16 |
| **Hyprearn Perps** | — | Nov 14 |
| **Initia** | **$3.27M** | Second breach in 3 weeks |
| **Luxor** | 3 block rewards (~$15.7k) | Hashpower hijacked via Commander software |
| **Binance** | **$6.3B** (Oct) | All user assets replaced |
| **Coinone** | — | Password/ID exposure warning |

## Data breaches
| Victim | Detail |
|---|---|
| **TSMC** | Employee data leaked via a cloud provider |
| **Fandango** | Payment cards — numbers, CVV, expiry, email — from 4 days in October |
| **Infoblox** | Security incident; hackers accessed "company information" |
| **RIKEN Fugaku** | 4,597 users' data exposed |
| **Osaka city gov** | Disclosed breach |
| **Uber** | ~150,000 drivers notified |
| **~700 EU supermarkets** | Refrigeration controllers altered (France attributed Oct attacks) |
| **French blood banks** | Hit |

## Law enforcement
- **Operation Endgame**: 235 servers + 257 domains seized, **6.4M stolen logins** recovered (Gootloader, CastleRAT, StealC).

---

## 💡 What it means for us

1. **AI-agent attacks are the new vector.** The Cursor/Fireworks chain — an AI provider's key → malware in an AI tool's marketplace — is the exact pattern to monitor.
2. **CISA KEV is a live product.** 1,782 exploited vulns with remediation deadlines = a vendor-risk feed.
3. **Crypto exploits keep paying.** Bug bounties (Ethena $3M, The Graph $1.6M) + audit demand.
4. **Corma's $1B in 3 months** says defensive AI security is the hottest funding lane right now.

---

*Data lives in the radar: `threat-intel` category (150 records) and USDC Gate `/v1/dataset/threat-intel`.*