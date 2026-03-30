# DisasterNet

Offline-first autonomous coordination layer for disaster relief operations.

## Problem We Are Solving

When floods or earthquakes hit, internet connectivity often degrades first while coordination demand spikes.
DisasterNet focuses on:

- Field coordination without internet.
- Resource routing and triage prioritization in real time.
- Tamper-evident recordkeeping for aid delivery and decisions.
- Privacy-preserving medical workflows and verified identity/funding rails.

## Current MVP Status

Implemented now in the browser prototype:

- Offline mesh simulation using BroadcastChannel across tabs/devices.
- Deterministic local triage scoring and routing suggestions.
- Persistent local state for zones, resources, missing persons, NGOs, and Hypercert workflow.
- Tamper-evident local incident ledger with hash-chained events.
- Sync queue with exportable provenance bundle JSON for post-connectivity upload.
- Optional online upload path from UI to local sync receiver (`agent/index.js`).
- Automatic Ed25519 signing key management on device (generate/load/rotate) for signed sync uploads.

Planned next (Phase 4 direction):

- Real device-to-device transport (Wi-Fi Direct / BLE / LoRa bridge adapters).
- Harden Storacha IPFS/Filecoin production publish flow (live endpoint + auth + pin-state checks).
- Zama FHE-backed medical compute workflow and Lit Protocol key gating.
- World + NEAR production verification integration.
- Starknet disbursement and Ethereum Hypercert contracts (production deploy + confirmations).

Implemented in backend sync receiver (`agent/`):

- Per-node anchor continuity checks (`previousAnchor` must match last accepted `headHash`).
- Replay protection (duplicate `headHash` and duplicate event ID rejection).
- Volunteer registry with NEAR + World metadata and Ed25519 signature verification support.
- Strict signature mode via `REQUIRE_SIGNATURE=true` for authenticated ingestion only.
- Deterministic publish metadata (`cid`-like IDs) returned on accepted bundles.
- Optional Storacha live publish mode with fallback (`PUBLISH_PROVIDER=storacha`).
- Automatic anchor worker loop with retries and backoff.
- Dry-run and live JSON-RPC chain adapter modes (`ANCHOR_DRY_RUN=true|false`).
- Anchor receipts APIs for querying by bundle/node.

## Architecture Direction

1. Edge Agent (phone): ingest report, score risk, generate routing action, append signed ledger event.
2. Mesh Relay: replicate reports/ledger events to nearby responders.
3. Sync Worker: when online, batch queued events and publish bundles to decentralized storage.
4. Chain Settlement: anchor proofs/hashes and disbursement outcomes on Starknet/Ethereum.

## Quick Start

1. Open `index.html` in browser.
2. Open a second tab to simulate another responder node.
3. Submit field reports and missing-person records.
4. Go to Mesh tab and use Export Bundle to generate a sync artifact.

### Optional: Run Sync Receiver

1. Start backend receiver:

```bash
node agent/index.js
```

2. In Mesh tab, set endpoint to:

```text
http://localhost:8787/api/v1/sync-bundles
```

3. Click `UPLOAD NOW` to submit queued events directly.
4. The client auto-registers node signer identity and submits signed bundles (strict-mode compatible).

## Important Notes

- This repository is currently a functional frontend MVP, not a production deployment.
- The ledger hash chain in this version is a lightweight tamper-evidence mechanism for demo/MVP purposes.
- Secrets/API keys are not persisted beyond browser session storage.

## Next Build Milestones

1. Deploy and connect production contracts in `contracts/ethereum` and `contracts/starknet`.
2. Move Storacha publish integration from fallback-capable mode to strict mode with pin verification.
3. Wire chain adapter live RPC mode to target Starknet/Ethereum endpoints and add confirmation polling.
4. Extend failure harness to CI + staged chaos tests (partition/delay/conflict) with release gates.

## Current Build Status (Today)

- Frontend offline triage + mesh + signed upload path is working.
- Backend verifies signatures/integrity and stores sync bundles.
- Backend now auto-queues anchor jobs for every accepted bundle.
- Anchor lifecycle endpoints are live (`queued -> submitted -> anchored/failed`) with tx hash tracking.
- Anchor worker now auto-processes queued jobs and persists anchor receipts.
- Phase 3 failure harness is now automated in CI (`.github/workflows/phase3-harness.yml`).
- Phase 4 bridge integrations are available: optional Storacha live publish and live JSON-RPC anchor submit mode.

See detailed execution roadmap in [PHASE2_PLAN.md](PHASE2_PLAN.md).
