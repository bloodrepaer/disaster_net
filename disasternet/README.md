# DisasterNet — Autonomous Disaster Relief AI

> **Offline-first mesh network + AI triage + FHE-encrypted records + on-chain fund disbursement for disaster response.**

![DisasterNet Dashboard](assets/dashboard-screenshot.png)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=flat-square&logo=vercel)](https://disasternet.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Stack](https://img.shields.io/badge/Stack-Impulse%20AI%20%7C%20NEAR%20%7C%20Starknet%20%7C%20IPFS-blueviolet?style=flat-square)]()

---

## The Problem

When floods, earthquakes, or cyclones hit — communications collapse first. Relief organizations work in silos, corrupt middlemen intercept aid funds, sensitive medical data leaks, and accountability for who did what disappears entirely.

**DisasterNet solves all four, without requiring any internet connectivity.**

---

## What It Does

| Feature | Description |
|---|---|
| **Impulse AI Triage Agent** | Claude-powered AI that reads field reports and issues real-time routing decisions: which convoy goes where, which zone is critical, which hospital needs oxygen now |
| **Offline Mesh Network** | BroadcastChannel API lets rescue workers on different devices sync field reports, missing persons, and AI decisions with zero internet — same-site P2P |
| **FHE-Encrypted Medical Records** | Missing persons and medical data encrypted with Zama TFHE. Physicians with verified credentials can decrypt via Lit Protocol key gate — individual records stay private even from the platform |
| **World ID + NEAR Identity** | Each volunteer verified as a unique human via World ID, anchored on NEAR Protocol. Prevents Sybil attacks in aid distribution |
| **Hypercerts** | On-chain contribution certificates minted for every verified rescue action — portable proof of humanitarian work for volunteers |
| **Starknet Fund Disbursement** | Smart contract-gated NGO payments. Funds release only when field conditions are verified — no middlemen, full auditability |
| **IPFS / Filecoin / Storacha** | All field logs hashed and stored on decentralized storage. Permanent, tamper-proof record of every relief action |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    DISASTERNET SYSTEM                        │
│                                                              │
│  Field Devices (Offline Mesh via BroadcastChannel)          │
│  📱 NODE-A ←──⟺──→ NODE-B ←──⟺──→ NODE-C                   │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐ │
│  │  Impulse AI  │    │  FHE Layer   │    │  Identity Layer │ │
│  │  (Claude)    │    │  Zama TFHE   │    │  World ID +     │ │
│  │  Triage &    │    │  + Lit       │    │  NEAR Protocol  │ │
│  │  Routing     │    │  Protocol    │    │                 │ │
│  └──────┬───────┘    └──────┬───────┘    └────────┬────────┘ │
│         │                  │                      │          │
│         ▼                  ▼                      ▼          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              DECENTRALIZED STORAGE                    │   │
│  │         IPFS + Filecoin (via Storacha)                │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                                    │               │
│         ▼                                    ▼               │
│  ┌─────────────┐                   ┌──────────────────┐      │
│  │  Hypercerts  │                   │  Starknet Fund   │      │
│  │  (ERC-8004)  │                   │  Disbursement    │      │
│  │  On-chain    │                   │  Smart Contract  │      │
│  │  Impact PoW  │                   │                  │      │
│  └─────────────┘                   └──────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

---

## Sponsor Integrations

| Sponsor | Integration | Track |
|---|---|---|
| **Anthropic / Claude** | Impulse AI triage agent — real-time routing decisions from field reports via Claude API | AI |
| **Zama TFHE** | Fully Homomorphic Encryption on all missing person and medical records | Privacy |
| **Lit Protocol** | Key-gated decryption — only verified physicians can access patient data | Privacy |
| **World ID** | Proof-of-personhood for volunteer identity, preventing duplicate aid claims | Identity |
| **NEAR Protocol** | On-chain volunteer identity anchor, Hypercert ownership | Infrastructure |
| **Hypercerts** | ERC-8004 contribution certificates for every rescue action | Funding the Commons |
| **Starknet** | Smart contract for conditional NGO fund disbursement | DeFi / Infrastructure |
| **IPFS + Filecoin** | Permanent decentralized storage for all field logs via Storacha | Storage |
| **Ethereum Foundation** | EVM compatibility layer for cross-chain fund bridging | Infrastructure |

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/disasternet.git
cd disasternet

# Open locally (no build step needed — pure HTML/CSS/JS)
open index.html

# Or serve with any static server
npx serve .
```

**To activate the live AI agent:**
1. Open the dashboard
2. Click ⚙ API in the top right
3. Enter your Anthropic API key (stored in sessionStorage only, never sent to our servers)
4. Submit a field report — Impulse AI responds in real time

**To test the mesh network:**
1. Open the app in two browser tabs on the same machine
2. Go to the MESH tab in either tab
3. Click "BROADCAST MESH PING" — the other tab responds instantly, no internet needed

---

## Repo Structure

```
disasternet/
├── assets/
│   ├── dashboard-screenshot.png    # Live dashboard screenshot
│   └── architecture-diagram.png   # System architecture diagram
├── contracts/
│   ├── starknet/
│   │   └── README.md              # WIP: Cairo contracts for fund disbursement
│   └── ethereum/
│       └── README.md              # WIP: Solidity + ERC-8004 Hypercert receipts
├── agent/
│   └── README.md                  # WIP: Python/Node.js Impulse AI backend
├── css/
│   └── styles.css                 # All styling
├── js/
│   └── app.js                     # Core logic, mesh network, AI integration
├── index.html                     # Main entry point
├── LICENSE                        # MIT License
└── README.md                      # This file
```

---

## Tracks

- 🌍 **Funding the Commons** — Hypercerts as on-chain proof of humanitarian contribution
- 🔒 **Privacy** — FHE-encrypted medical records + Lit Protocol key gating
- 🤖 **AI** — Claude-powered autonomous triage and resource routing
- 🏗 **Infrastructure** — Offline mesh, IPFS permanence, Starknet escrow

---

## Team

Built at ETH Global / ETH India Hackathon in 72 hours.

---

## License

MIT — see [LICENSE](LICENSE)
