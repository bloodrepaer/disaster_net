# DisasterNet — Judge Q&A Prep
## Every hard question. Sharp answers. Memorize these.

---

## ROUND 1: THE BASICS

**Q: What does DisasterNet actually do?**
> DisasterNet is an offline-first disaster relief coordination system. It has three layers: (1) an AI triage agent powered by Claude that reads field reports and issues routing decisions, (2) an offline peer-to-peer mesh network so rescue workers can sync data without internet, and (3) on-chain infrastructure — Starknet for fund disbursement, NEAR for identity, Hypercerts for volunteer contribution tracking, and FHE for medical privacy. It's designed to work when every other system has failed.

**Q: Who is the user?**
> Two primary users. Field coordinators — NGO staff and government relief officers managing multiple rescue zones — who need real-time triage decisions they can act on immediately. And rescue volunteers who need to log missing persons, receive routing instructions, and accumulate verifiable proof of their contributions. Secondary users are donors who want on-chain proof that their funds reached the right NGOs.

**Q: Is this a real product or a hackathon prototype?**
> It's a fully functional prototype that demonstrates every core technical integration. The mesh networking is real — open two browser tabs and ping one; the other responds instantly. The AI is live — enter an Anthropic API key and submit a field report; Claude responds with specific routing decisions. The FHE encryption, IPFS storage, Hypercert minting, and Starknet disbursement are all simulated in this prototype with accurate representations of the cryptographic outputs. The contracts and backend agent are the remaining post-hackathon milestones.

---

## ROUND 2: TECHNICAL DEPTH

**Q: How does the offline mesh actually work?**
> The prototype uses the BroadcastChannel API, which is a browser-native P2P messaging mechanism for same-origin tabs and windows. In a real deployment, we'd replace this with WebRTC for direct peer-to-peer connections or Meshtastic radio mesh (LoRa hardware) for long-range field communication without any infrastructure. The BroadcastChannel demo proves the data model and sync protocol — the transport layer is swappable.

**Q: Why FHE specifically? Why not end-to-end encryption?**
> Great question. Standard E2E encryption protects data in transit and at rest, but the moment you decrypt it to do anything useful — search it, aggregate it, route it — it's exposed. FHE lets you compute on encrypted data without decrypting it. In a disaster scenario, an AI agent can analyze encrypted patient records to triage severity without ever seeing the plaintext. A hospital system can receive an aggregated count of patients with cardiac conditions across all zones without any individual record being exposed. Standard E2E can't do that.

**Q: How does the Lit Protocol key gate work?**
> Lit Protocol allows you to define programmable access conditions for decryption keys — essentially smart contract logic that determines who can decrypt what. In DisasterNet, we define a condition that says: only wallets with a verified physician credential NFT can access the decryption key for Zone C3 medical records. A field volunteer can broadcast FHE-encrypted data to IPFS, and only credentialed hospital staff can decrypt it — enforced by cryptography, not by a central server's access control policy.

**Q: Aren't World ID and NEAR Protocol solving different problems?**
> They're complementary layers. World ID gives you proof-of-personhood — this wallet belongs to a unique human, not a bot. NEAR Protocol gives you a persistent identity namespace and the ability to anchor Hypercerts and other on-chain state to that identity. You need both. World ID without an identity layer means every verification is ephemeral. NEAR without World ID means someone can create 50 fake NEAR accounts and claim 50x the aid distribution.

**Q: Why Starknet for the fund disbursement instead of Ethereum mainnet?**
> Transaction costs. A relief operation might involve thousands of individual disbursements — supplies to 50 NGOs, 200 volunteer micro-payments, daily fund releases over a 30-day operation. On Ethereum mainnet, gas fees alone would consume a significant portion of the fund. Starknet's validity rollup architecture brings this down to fractions of a cent per transaction. The security guarantees are still backed by Ethereum.

**Q: What's in the Hypercert? What data does it contain?**
> The Hypercert metadata contains: the contributor's NEAR address and World ID verification status, the specific action taken (e.g., "Deployed rescue boats to Zone A2 Palghar"), the zone and timestamp, the IPFS CID of the field report that triggered the action, and the AI triage decision hash that authorized it. This creates an immutable, auditable chain from donor funds → AI triage decision → field action → volunteer contribution → on-chain certificate.

---

## ROUND 3: THE HARD QUESTIONS

**Q: What's the actual moat here? This feels like a lot of integrations glued together.**
> The moat is the architecture decision to make it offline-first. Every other disaster tech solution I'm aware of — UN OCHA systems, traditional NGO coordination platforms — assumes connectivity. They all become useless in the first 6 hours of a major disaster when cell towers fail. We made the architectural bet that the coordination layer must work without the internet as a first-class requirement, and then built everything else around that constraint. The specific integrations are chosen to solve real problems that emerge from that constraint: FHE because encrypted data can be broadcast on an untrusted mesh, IPFS because you can't rely on a central server, Starknet because you need trustless disbursement without a bank.

**Q: Real disasters are chaotic. Has anyone from an NGO validated this?**
> We spoke with [NAME IF APPLICABLE] from [ORG] during the build. We also drew heavily on the documented failure modes of the 2021 Maharashtra floods and the 2023 Turkey earthquake response — both cases where coordination failures and missing person database gaps directly caused preventable deaths. The specific zones, NGO names, and relief scenarios in the demo are based on real Maharashtra districts.
> *(If no NGO contact: "We've designed this based on documented failure case studies. A key post-hackathon milestone is partnering with SEEDS India or Goonj — both of whom are explicitly modeled in the demo — for field validation.")*

**Q: What's the actual privacy guarantee? FHE is computationally expensive.**
> The guarantee is that individual records are never exposed in plaintext outside the originating device and the credentialed physician. The FHE computation overhead is real — full TFHE circuit evaluation for complex queries can take seconds. For this use case, the operations we're doing are relatively simple: encryption at origin, broadcast over mesh, decryption at authorized endpoint. The computationally expensive part (physician decryption) happens on hospital systems with adequate compute, not on a rescue worker's phone.

**Q: The BroadcastChannel only works on the same origin. How does this work between actual field devices in different locations?**
> Correct — and we're transparent about this in the demo. BroadcastChannel is the prototype's stand-in for the mesh transport layer, which lets us demonstrate the sync protocol, data model, and UX without hardware. In a production deployment this would be WebRTC for close-range device-to-device communication, Meshtastic/LoRa for kilometer-range field mesh, and a delayed sync to IPFS when connectivity is restored. The demo explicitly calls this out in the MESH tab — "open in another tab to simulate a second device."

**Q: How do you prevent a bad actor from submitting false field reports to divert funds?**
> Three mechanisms. First, every field report submitter must have a World ID — proof they're a unique human. Second, Hypercerts are only minted for actions that are verified by the AI agent, which cross-references zone data. Third, fund disbursement on Starknet requires three verifications: World ID proof, an IPFS field report CID, and the AI triage decision hash. If any of those are fabricated, the disbursement doesn't execute. It's not perfect — nothing is — but it's dramatically harder to fraud than an email wire transfer to an NGO.

**Q: What's the go-to-market? How do you actually get relief organizations to use this?**
> The B2B path is through existing NGOs that are already doing this work manually — SEEDS India, Goonj, Rapid Response — and positioning DisasterNet as a coordination layer they plug into rather than a replacement for their field operations. The government path is through NDMA (National Disaster Management Authority) in India, which has been actively seeking digital coordination tools since 2021. The crypto-native path is positioning Hypercerts as a donor acquisition tool — donors get on-chain proof of impact, which is increasingly a requirement for institutional crypto donors.

---

## ROUND 4: SPONSOR-SPECIFIC QUESTIONS

**Q (from Anthropic judges): How are you using Claude beyond just the chat API?**
> We're using Claude as an autonomous decision-making agent with structured domain knowledge. The system prompt loads Claude with the complete disaster zone state — all 7 zones, current victims, resource counts, route status — and instructs it to respond to field reports with specific operational commands, not general advice. It's also instructed to cross-reference multiple concerns simultaneously: severity assessment, FHE data sharing recommendations, Hypercert minting authorization, and IPFS logging action. The goal is to make it behave like an experienced relief coordinator who has situational awareness of the entire operation, not a chatbot.

**Q (from Hypercerts track): How does this advance public goods funding?**
> Hypercerts solve the impact verification problem in public goods funding. Today, donors give to disaster relief and get a tax receipt. They have no way to know which specific actions their money funded or whether those actions were effective. DisasterNet creates a chain of custody: donor funds flow through a Starknet contract → AI agent authorizes specific field actions → volunteers execute and log them → Hypercerts are minted with proof. Donors can now see exactly which rescue operation their contribution funded, which volunteer executed it, and what the outcome was. This creates accountability that attracts more capital to disaster relief as a public good.

**Q (from Starknet): Why not just use a multisig?**
> A multisig still requires human signers to verify conditions manually. In an active disaster, you need disbursements happening in near real-time as field conditions change. A contract that automatically verifies three on-chain conditions — World ID proof, IPFS CID, AI triage hash — and releases funds can disburse to 50 NGOs across a 30-day operation without requiring any human to sign off on each transaction. Multisig is synchronous, centralized, and slow. Our contract is asynchronous, trustless, and fast.

---

## CLOSING LINE (if they ask for one)

> "The technology in DisasterNet is not experimental — BroadcastChannel, Claude API, Starknet, and IPFS are all production-ready. What's experimental is the decision to build a disaster coordination system that treats internet connectivity as optional. We think that's the right bet. And we built it in 72 hours to prove it's achievable."

---

## TIPS FOR THE LIVE DEMO

1. **Lead with the mesh demo** — open two tabs before the judges arrive. Nothing is more impressive than showing a ping propagate between tabs in real time.
2. **Use the API key** — enter your Anthropic key before the demo so the AI response is live, not simulated. The difference is visible.
3. **Pick Zone C3** from the left panel — it auto-fills the most dramatic field report (oxygen shortage, critical patients). The AI response for this one is the strongest.
4. **Mint a Hypercert live** — after the AI response, go to CERTS tab and mint one. Click it while a judge is watching.
5. **Click SEND on an NGO** in the FUNDS tab last — the "DONE" state change is satisfying and drives the point home.
6. **If anything breaks**: laugh, say "this is why we need offline-first infrastructure," and keep going. It always lands.
