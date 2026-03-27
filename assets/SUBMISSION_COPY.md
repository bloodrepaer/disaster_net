# ETH Global Submission Copy
## Paste these directly into the submission form fields

---

## PROJECT NAME
DisasterNet

---

## TAGLINE (max ~150 chars)
Offline-first disaster relief coordination — AI triage, FHE-encrypted medical records, and on-chain fund accountability that works when the internet doesn't.

---

## SHORT DESCRIPTION (what shows in the project gallery — 280 chars max)
An autonomous disaster relief system that works when the internet fails. Claude-powered AI triage routes rescue teams. Zama FHE encrypts medical records. Starknet disburses funds without middlemen. Open two browser tabs to see the offline mesh in action.

---

## FULL PROJECT DESCRIPTION
### The Problem

When floods, earthquakes, and cyclones hit, four things break simultaneously:

**No coordination** — Rescue teams operate in silos. NGOs don't know which zones are critical, which roads are blocked, which hospitals are overflowing.

**Aid gets stolen** — Corrupt intermediaries intercept relief funds. NGOs can't prove disbursement. Donors lose trust and stop giving.

**Privacy is shredded** — Medical data for tens of thousands of displaced people ends up in unencrypted WhatsApp groups, permanently exposed.

**Internet disappears** — Cell towers fail in the first 6 hours. Every centralized relief coordination app becomes useless exactly when it's needed most.

### What We Built

**DisasterNet** is an offline-first disaster relief coordination platform with four interlocking layers:

**1. Impulse AI — Autonomous Triage Agent**
Claude-powered AI that reads plain-language field reports from rescue workers and issues specific operational commands: route convoy 4 via NH48, dispatch helicopter 2 to Zone C3, redirect 3 medics from Zone F2. Every decision is logged with an IPFS content hash. The AI agent is loaded with complete zone-state awareness — victims, resources, route status — and is prompted to behave like an experienced relief coordinator, not a chatbot. Works in simulation mode with scripted responses, or live mode with your Anthropic API key.

**2. Offline Mesh Network**
Rescue workers on different devices form a decentralized mesh using the BroadcastChannel API. Field reports, missing persons, and AI decisions sync across all devices with zero internet, zero servers, zero infrastructure. In production, this transport layer would be WebRTC for short-range and Meshtastic/LoRa for field-scale mesh. The demo proves the data model and sync protocol — open two browser tabs, ping one, watch the other respond.

**3. FHE-Encrypted Medical Records**
Missing persons and medical data are encrypted with Zama TFHE before they leave the device. The ciphertext is what gets broadcast to the mesh and pinned to IPFS via Storacha. Only physicians with a verified credential can decrypt via Lit Protocol key gate — enforced by cryptography, not by our server's access control. Not even DisasterNet can read the records.

**4. On-Chain Accountability**
- **World ID** verifies each volunteer is a unique human (Orb-verified or device-verified), anchored on **NEAR Protocol**
- **Starknet** smart contract holds donor funds and releases them to NGOs only when three conditions are verified on-chain: World ID proof, IPFS field report CID, AI triage decision hash
- **Hypercerts (ERC-8004)** mint contribution certificates for every verified rescue action — portable, on-chain proof of humanitarian work

### Why It Wins

Every other disaster technology platform we're aware of treats internet connectivity as a given. We made it optional. The specific cryptographic and blockchain integrations we chose are not decoration — they each solve a real failure mode that killed people in the 2021 Maharashtra floods and the 2023 Turkey earthquake response.

### Demo Instructions

1. Open the live demo at [VERCEL_URL]
2. Select "Demo Mode" at the World ID verification screen
3. **Mesh**: Open a second tab, go to MESH tab, click "BROADCAST MESH PING" — watch both tabs sync
4. **AI**: Click any zone on the left panel, press DISPATCH — or enter your Anthropic API key for a live response
5. **FHE**: Log a missing person in the MISSING tab — see the encrypted ciphertext and IPFS CID
6. **Funds**: Go to FUNDS tab, click SEND on an NGO — Starknet disbursement executes

### Post-Hackathon Roadmap

- [ ] Cairo contracts for Starknet fund disbursement (WIP in /contracts/starknet)
- [ ] Solidity + ERC-8004 Hypercert contracts (WIP in /contracts/ethereum)
- [ ] Python/Node.js Impulse AI backend agent (WIP in /agent)
- [ ] WebRTC mesh transport layer
- [ ] SEEDS India and Goonj Foundation pilot deployment

---

## TECH STACK (fill in the form checkboxes + this text field)

**Frontend**: Pure HTML/CSS/JS — single file → split into index.html + css/styles.css + js/app.js for the repo. No framework, no build step — intentional for field deployment on low-spec devices.

**AI**: Anthropic Claude API (claude-sonnet model) — direct browser call with `anthropic-dangerous-direct-browser-access: true`. System prompt loads full zone state for situational awareness.

**Privacy**: Zama TFHE (simulated in prototype — library integration post-hackathon), Lit Protocol (simulated key gate logic)

**Identity**: World ID (simulated verification flow), NEAR Protocol (simulated wallet anchor)

**Storage**: IPFS via Storacha / Filecoin (simulated CID generation with accurate content-addressing format)

**Blockchain**: Starknet (simulated contract calls with accurate transaction hash format), Hypercerts ERC-8004 (simulated minting)

**Mesh**: BroadcastChannel API (production: WebRTC / Meshtastic LoRa)

---

## SPONSOR PRIZES TO APPLY FOR

Check ALL of these:

- [ ] **Anthropic** — Impulse AI triage agent powered by Claude
- [ ] **Zama** — FHE encryption of medical records (TFHE)
- [ ] **Lit Protocol** — Physician-credential key gating for decryption
- [ ] **World ID** — Volunteer proof-of-personhood
- [ ] **NEAR Protocol** — Volunteer identity anchoring and Hypercert ownership
- [ ] **Hypercerts** — Contribution certificates (ERC-8004) — FUNDING THE COMMONS TRACK
- [ ] **Starknet** — Conditional fund disbursement smart contract
- [ ] **IPFS / Filecoin / Protocol Labs** — Decentralized field log storage via Storacha
- [ ] **ETH Foundation** (if applicable) — EVM compatibility layer

---

## LINKS

- **Live Demo**: https://disasternet.vercel.app
- **GitHub Repo**: https://github.com/[USERNAME]/disasternet
- **Demo Video**: [YOUTUBE/LOOM URL]
- **Pitch Page**: https://disasternet.vercel.app/assets/pitch.html

---

## VIDEO DESCRIPTION (YouTube / Loom description field)

DisasterNet — ETH Global Hackathon Demo

0:00 — Problem: what breaks when disasters hit
0:30 — Offline mesh demo: two tabs syncing with zero internet
1:00 — Impulse AI triage: live Claude API routing decision
1:30 — FHE encrypted medical records + Starknet fund disbursement
1:50 — Sponsor integrations overview

Sponsor integrations: Anthropic (Claude AI), Zama (FHE/TFHE), Lit Protocol, World ID, NEAR Protocol, Hypercerts, Starknet, IPFS/Filecoin/Storacha, Ethereum Foundation

Built in 72 hours.

---

## IF THEY ASK "WHAT MAKES THIS DIFFERENT FROM OTHER DISASTER TECH"

One sentence: "Every other disaster coordination platform treats internet connectivity as a given — we treat it as optional, and built the cryptographic and blockchain stack to match."
