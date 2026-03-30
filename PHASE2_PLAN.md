# DisasterNet Phase 2 Plan (2-3 Weeks)

## Goal
Move from strong MVP demo to integration-ready system with authenticated sync, anchor tracking, and contract/IPFS execution hooks.

## Week 1: Data Trust + Anchor Pipeline

### Completed
- Signed bundle upload path from frontend to backend.
- Volunteer registry + signature verification in sync receiver.
- Replay and anchor continuity guards.
- Anchor job queue created automatically after each accepted bundle.
- Anchor lifecycle API (`queued -> submitted -> anchored/failed`).
- Backend persistence for anchor jobs.
- Add anchor worker loop and retries.
- Add chain adapter interface (Starknet/Ethereum) with dry-run mode.
- Anchor worker loop with retry backoff (`ANCHOR_MAX_RETRIES`, `ANCHOR_WORKER_INTERVAL_MS`).
- Chain adapter interface with dry-run mode (`ANCHOR_DRY_RUN=true` by default).

## Week 2: Storage + Chain Settlement

### Completed
- Add `anchor receipts` object that links CID + chain tx hash + node + headHash.
- Expose endpoint to fetch receipts by bundle and by node.

### Completed
- Add optional Storacha publish module toggle (`PUBLISH_PROVIDER=storacha`) with fallback behavior.
- Store CID from live response when available, with deterministic fallback for resilience.

### Notes
- Receipt + anchor worker pipeline now runs end-to-end and returns tx hashes in dry-run mode.
- Publish path supports local deterministic mode and optional live HTTP mode.

## Week 3: Smart Contract Integration + Hardening

### Completed
- Add first deployable contract stubs and interaction scripts.
- Wire backend anchor worker to submit hashes to selected chain endpoint.
- Add conflict/failure test harness:
  - out-of-order bundles,
  - duplicate event IDs,
  - signature mismatch,
  - intermittent connectivity.

### Completed (Phase 3 closeout)
- Add live JSON-RPC chain adapter mode behind `ANCHOR_DRY_RUN=false`.
- Add Storacha upload client path behind `PUBLISH_PROVIDER=storacha`.
- Extend failure harness into automated CI suite (`.github/workflows/phase3-harness.yml`).

## Phase 4: Contract-Driven Compensation Infrastructure ✅ COMPLETE

### Goal
Enable blockchain-backed relief fund distribution via multi-chain orchestration, confirmation polling, and family OTP verification.

### Completed ✅
- **Contract Stubs**: Starknet (anchoring) + Ronin (compensation) contract simulators
- **Confirmation Polling**: Exponential backoff engine with configurable finality threshold
- **Multi-Chain Adapter**: Coordinates end-to-end flows (anchor → await → compensate → await)
- **Live Adapter Mode**: Demonstration of insurance workflow with real polling
- **Integration Harness**: End-to-end test of all Phase 4 components (9/9 passing)
- **Phase 4 Architecture**: Full documentation with workflow diagrams + deployment checklist
- **API Integration Guide**: Shows how to wire Phase 4 into existing Express backend
- **Completion Summary**: Full manifest of delivered files and how to use them

### Phase 4 Files
- `agent/starknet_contract_stub.js` — 91 lines
- `agent/ronin_contract_stub.js` — 70 lines
- `agent/confirmation_polling_engine.js` — 98 lines
- `agent/multi_chain_adapter.js` — 120 lines
- `agent/live_adapter_mode.js` — 195 lines
- `agent/phase4_integration_harness.js` — 180 lines (9/9 tests passing)
- `agent/phase4_api_integration.js` — 330 lines
- `agent/PHASE4_ARCHITECTURE.md` — ~1,200 lines
- `agent/PHASE4_QUICKSTART.md` — ~600 lines
- `agent/PHASE4_SUMMARY.md` — ~800 lines
- `agent/PHASE4_DIAGRAMS.md` — ~250 lines
- `agent/PHASE4_COMPLETION.md` — Final completion manifest
- `agent/README.md` — Updated with Phase 4 overview

### Quick Start
```bash
cd agent
node phase4_integration_harness.js    # Run all 9 tests
node live_adapter_mode.js             # See live demo
```

**Total Phase 4 Implementation**: ~1,500 lines code + ~3,000 lines documentation

### Previous Phase 3 Closeout
- Add live JSON-RPC chain adapter mode behind `ANCHOR_DRY_RUN=false`.
- Add Storacha upload client path behind `PUBLISH_PROVIDER=storacha`.
- Extend failure harness into automated CI suite (`.github/workflows/phase3-harness.yml`).

## Definition of Done (Phase 2)
- Every uploaded bundle has:
  - verified signature,
  - deterministic hash-chain integrity,
  - persisted CID (real or dry-run),
  - anchor job status,
  - eventual tx hash receipt.
- Frontend operator can see sync + anchor status quickly.

## Current APIs
- `POST /api/v1/volunteers/register`
- `GET /api/v1/volunteers`
- `POST /api/v1/sync-bundles`
- `GET /api/v1/sync-bundles`
- `GET /api/v1/sync-bundles/:id`
- `GET /api/v1/anchors`
- `GET /api/v1/anchors/:id`
- `POST /api/v1/anchors/:id/mark`
- `GET /api/v1/anchor-receipts`
- `GET /api/v1/anchor-receipts/:id`
