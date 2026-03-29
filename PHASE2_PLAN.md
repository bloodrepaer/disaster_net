# DisasterNet Phase 2 Plan (2-3 Weeks)

## Goal
Move from strong MVP demo to integration-ready system with authenticated sync, anchor tracking, and contract/IPFS execution hooks.

## Week 1: Data Trust + Anchor Pipeline

### Completed
- Signed bundle upload path from frontend to backend.
- Volunteer registry + signature verification in sync receiver.
- Replay and anchor continuity guards.
- Anchor job queue created automatically after each accepted bundle.

### In Progress
- Anchor lifecycle API (`queued -> submitted -> anchored/failed`).
- Backend persistence for anchor jobs.

### Remaining
- Add anchor worker loop and retries.
- Add chain adapter interface (Starknet/Ethereum) with dry-run mode.

## Week 2: Storage + Chain Settlement

### Planned
- Replace deterministic publish mock with Storacha publish module.
- Store real CIDs and pin status.
- Add `anchor receipts` object that links CID + chain tx hash + node + headHash.
- Expose endpoint to fetch receipts by bundle and by node.

## Week 3: Smart Contract Integration + Hardening

### Planned
- Add first deployable contract stubs and interaction scripts.
- Wire backend anchor worker to submit hashes to selected chain endpoint.
- Add conflict/failure test harness:
  - out-of-order bundles,
  - duplicate event IDs,
  - signature mismatch,
  - intermittent connectivity.

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
