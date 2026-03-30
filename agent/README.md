# DisasterNet Agent: Phase 4 Implementation

This directory contains the complete **Phase 4: Contract-Driven Compensation Infrastructure** for DisasterNet, plus the foundational Phase 1-2 services for data collection and anchoring.

## What is Phase 4?

Phase 4 transforms DisasterNet into a **blockchain-backed relief distribution system**. When two rescuers confirm a missing person is deceased:

1. ✅ Each rescuer's confirmation is recorded on Ronin contract
2. ✅ System detects consensus (2+ confirmations)
3. ✅ Compensation funds are unlocked
4. ✅ Family receives SMS notification
5. ✅ Family verifies via OTP
6. ✅ Funds transferred to family wallet

## Quick Start (3 Steps)

### 1. Run Integration Tests
```bash
node phase4_integration_harness.js
```
Expected: **9/9 tests passing** ✅

### 2. See Live Demo
```bash
node live_adapter_mode.js
```
Expected: End-to-end workflow + consensus detection + claim unlock

### 3. Read Documentation
- **[PHASE4_QUICKSTART.md](./PHASE4_QUICKSTART.md)** — 10-minute overview
- **[PHASE4_ARCHITECTURE.md](./PHASE4_ARCHITECTURE.md)** — Full spec
- **[PHASE4_SUMMARY.md](./PHASE4_SUMMARY.md)** — Implementation details

## Phase 4 Components

### Contract Layer

**[starknet_contract_stub.js](./starknet_contract_stub.js)** (91 lines)
- Simulates Starknet "Disaster Relief Registry" contract
- Verifies rescuers via World Passport
- Records immutable disaster data anchors
- Methods: `registerVolunteer()`, `anchorBundle()`, `getAnchor()`

**[ronin_contract_stub.js](./ronin_contract_stub.js)** (70 lines)
- Simulates Ronin "Disaster Relief Fund" contract
- Records deceased status confirmations (consensus mechanism)
- Requires 2+ confirmations to unlock compensation
- Methods: `submitDeceased()`, `getCompensations()`, `isConsensusDeceased()`, `unlockClaim()`

### Polling & Orchestration

**[confirmation_polling_engine.js](./confirmation_polling_engine.js)** (98 lines)
- Transaction confirmation checker with exponential backoff
- Default: 1s → 1.5s → 2.25s → ... → 30s max
- Configurable finality threshold (default 3 blocks)
- Batch polling support

**[multi_chain_adapter.js](./multi_chain_adapter.js)** (120 lines)
- Orchestrates end-to-end flows across Starknet + Ronin
- Main method: `anchorAndCompensate()`
- Coordinates: register → anchor → wait → submit → wait → confirm

### Testing & Demonstration

**[phase4_integration_harness.js](./phase4_integration_harness.js)** (180 lines)
- 9 integration tests
- Tests: volunteer reg, bundle submission, anchoring, compensation, family OTP

**[live_adapter_mode.js](./live_adapter_mode.js)** (195 lines)
- End-to-end demo with real polling
- 3 demo modes: workflow, claim unlock, multi-node resilience
- Shows timing + exponential backoff

### Integration Guide

**[phase4_api_integration.js](./phase4_api_integration.js)** (330 lines)
- Shows how to wire Phase 4 into Express API
- 7 integration points demonstrated
- Example: `POST /api/v1/volunteers/register` + Starknet verification

## Phase 1-2: Data Collection & Anchoring

This service ingests sync bundles from rescue teams, verifies integrity, and anchors to blockchain:

### Core Responsibilities

- Accepts `POST /api/v1/sync-bundles` with bundle data
- Verifies:
  - Bundle schema and metadata
  - Event hash integrity
  - Hash chain continuity
  - Signature validity (if registered)
- Stores valid bundles locally
- Creates anchor jobs for chain settlement
- Runs automatic anchor worker with retries
- Persists anchor receipts (bundle + CID + tx hash + status + confirmation status + polling metadata)

### Volunteer Registration + Signature Verification

Register a rescuer:
```bash
curl -X POST http://localhost:8787/api/v1/volunteers/register \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "RESCUE-NODE-1",
    "nearId": "rescuer.near",
    "worldLevel": "ORB-VERIFIED",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----"
  }'
```

List volunteers:
```bash
curl http://localhost:8787/api/v1/volunteers
```

## Key Workflows

### Workflow 1: Volunteer Registration + Data Anchoring

```
Rescue Team App
  ↓
POST /api/v1/volunteers/register
  ↓ [Backend]
  1. Store in PostgreSQL (Phase 1-2)
  2. Register on Starknet (Phase 4) ← NEW
  3. Return receipt + Starknet txHash
  ↓
"✓ Volunteer verified on blockchain"
```

### Workflow 2: Bundle Submission + Anchoring

```
Rescue Team App
  ↓
POST /api/v1/sync-bundles
{
  "nodeId": "RESCUE-1",
  "events": [{ "personId": "...", "status": "Missing", ... }],
  "signature": "...",
  "signer": "rescuer.near"
}
  ↓ [Backend]
  1. Verify signature (Phase 1-2)
  2. Store bundle in PostgreSQL (Phase 1-2)
  3. Upload to IPFS → get CID (Phase 1-2)
  4. Queue anchor job (Phase 1-2)
  5. Async: Anchor to Starknet (Phase 4) ← NEW
  6. Async: Poll until confirmed (Phase 4) ← NEW
  7. Store receipt with polling status (Phase 1-2 + Phase 4) ← ENHANCED
  ↓
GET /api/v1/anchor-receipts
  ↓
"✓ Bundle anchored on Starknet, confirmed after 3 blocks"
```

### Workflow 3: Person Status → Compensation Distribution

```
Rescue Team App
  ↓
Rescuer A calls:
POST /api/v1/persons/PERSON-123/status
{ "status": "Deceased", "actorId": "RESCUER-A", "actorRole": "rescuer" }
  ↓ [Backend]
  1. Update person status (Phase 1-2)
  2. Submit to Ronin contract (Phase 4) ← NEW
  3. Store confirmation (Phase 4) ← NEW
  4. Check: 1 confirmation → return "pending consensus"
  ↓
"⏳ Awaiting 2nd confirmation from another rescuer..."

[Rescuer B confirms same status]

Rescuer B calls:
POST /api/v1/persons/PERSON-123/status
{ "status": "Deceased", "actorId": "RESCUER-B", "actorRole": "rescuer" }
  ↓ [Backend]
  1. Store 2nd confirmation on Ronin (Phase 4) ← NEW
  2. Detect consensus (2+ confirmations) (Phase 4) ← NEW
  3. Call ronin.unlockClaim() (Phase 4) ← NEW
  4. Generate + send SMS proof to family (Phase 1-2 + Phase 4) ← ENHANCED
  5. Update person compensation status (Phase 1-2)
  ↓
"✓ Compensation unlocked and family notified via SMS"
```

### Workflow 4: Family Claim via OTP Verification

```
Family Portal
  ↓
POST /api/v1/persons/PERSON-123/family/request-otp
{ "phone": "+1234567890" }
  ↓ [Backend]
  1. Verify person is Deceased (Phase 1-2)
  2. Verify 2+ confirmations on Ronin (Phase 4) ← NEW
  3. Generate 6-digit OTP
  4. Send via SMS
  5. Cache in Redis (10-minute TTL)
  ↓
"✓ OTP sent to +1234567890"

Family receives SMS: "Your DisasterNet claim code: 123456"
  ↓

Family Portal
  ↓
POST /api/v1/persons/PERSON-123/family/verify-otp
{ "phone": "+1234567890", "otp": "123456" }
  ↓ [Backend]
  1. Verify OTP matches Redis (Phase 4) ← NEW
  2. Double-check Ronin consensus (Phase 4) ← NEW
  3. Issue JWT token (1-hour expiry)
  4. Delete OTP from Redis
  ↓
"✓ Token issued - proceed to claim portal"
```

## File Structure

```
agent/
├── README.md                              ← This file
│
├── PHASE 4 DOCUMENTATION
├── PHASE4_QUICKSTART.md                   Quick start + workflows
├── PHASE4_ARCHITECTURE.md                 Full specification
├── PHASE4_SUMMARY.md                      Implementation summary
├── PHASE4_DIAGRAMS.md                     Mermaid diagrams
│
├── PHASE 4 IMPLEMENTATION
├── starknet_contract_stub.js              Anchor contract simulator
├── ronin_contract_stub.js                 Compensation contract simulator
├── confirmation_polling_engine.js         Transaction finality engine
├── multi_chain_adapter.js                 Cross-chain orchestration
├── live_adapter_mode.js                   End-to-end demonstration
├── phase4_integration_harness.js          Integration test suite
├── phase4_api_integration.js              Express wiring guide
│
├── PHASE 1-2 (Data Collection)
├── server.js                              Express API backend
├── models/                                Database schema
├── routes/                                API endpoints
│
└── PHASE 1-2 (Anchoring)
    ├── anchor-worker.js                   Anchor job processor
    ├── chain-adapter.js                   Chain interaction layer
    └── data/                              Local persistence
```

## Testing

### Run All Tests

```bash
# Phase 4 integration tests
node phase4_integration_harness.js

# Phase 4 live demonstration
node live_adapter_mode.js
```

### Expected Results

**Integration Harness (10 secs):**
```
[PASS] Volunteer registration for Starknet
[PASS] Create missing person record
[PASS] Submit signed bundle for anchoring
[PASS] Anchor job queued and processed
[PASS] Receipt includes confirmation polling fields
[PASS] Person status update and compensation flow
[PASS] Second rescuer confirms deceased and triggers compensation
[PASS] SMS proof logged for compensation
[PASS] Family OTP request and verification flow

Passed: 9
Failed:  0
```

**Live Demo (30 secs):**
```
=== Phase 4 Live Adapter Mode ===

[Workflow] ✓ Flow completed successfully
  Starknet Anchor TX: 0x...
  Ronin Submit TX: 0x...
  Total time: 15234ms

[ClaimFlow] ✓ Claim unlocked after consensus

[MultiNode] ✓ 3/3 nodes successful
```

## API Endpoints

### Phase 1-2 (Existing)

- `POST /api/v1/volunteers/register` — Register rescuer
- `GET /api/v1/volunteers` — List volunteers
- `POST /api/v1/sync-bundles` — Submit bundle
- `GET /api/v1/sync-bundles` — List bundles
- `GET /api/v1/persons/:id` — Get person
- `POST /api/v1/persons/:id/status` — Update status
- `GET /api/v1/anchor-receipts` — Get receipts

### Phase 4 (New)

- `POST /api/v1/persons/:id/family/request-otp` — Request family OTP
- `POST /api/v1/persons/:id/family/verify-otp` — Verify OTP + get claim token

## Deployment

### Prerequisites

- Node.js 16+
- PostgreSQL (Phase 1-2 data)
- Redis (receipts + OTP caching)
- Starknet RPC endpoint
- Ronin RPC endpoint
- Twilio account (SMS)

### Environment Variables

```bash
# Contracts (Phase 4)
STARKNET_RPC_URL=https://starknet-mainnet.example.com
RONIN_RPC_URL=https://ronin-mainnet.example.com

# Polling (Phase 4)
CONFIRMATION_THRESHOLD=3
MAX_POLL_ATTEMPTS=36
POLL_INITIAL_DELAY_MS=1000
POLL_MAX_DELAY_MS=30000

# OTP (Phase 4)
OTP_TTL_SECONDS=600
OTP_LENGTH=6

# SMS (Phase 1-2 + Phase 4)
SMS_PROVIDER=twilio
SMS_ACCOUNT_SID=AC...
SMS_AUTH_TOKEN=...

# Database (Phase 1-2)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### Start Services

```bash
# Development
npm start

# Production
npm run start:prod

# With monitoring
npm run start:prod -- --monitor
```

Set strict mode to require signatures for all uploads:

```powershell
$env:REQUIRE_SIGNATURE='true'; node agent/index.js
```

## Run

Requirements: Node.js 18+.

```bash
node agent/index.js
```

Optional port:

```bash
PORT=8787 node agent/index.js
```

On Windows PowerShell:

```powershell
$env:PORT=8787; node agent/index.js
```

Optional worker/adapter environment settings:

```powershell
$env:ANCHOR_DRY_RUN='true'
$env:ANCHOR_CHAIN='starknet-sepolia'
$env:ANCHOR_CHAIN_ENDPOINT='https://example.invalid/rpc'
$env:ANCHOR_RPC_METHOD='disasternet_submitAnchor'
$env:ANCHOR_TIMEOUT_MS='10000'
$env:ANCHOR_WORKER_INTERVAL_MS='5000'
$env:ANCHOR_MAX_RETRIES='3'
$env:ANCHOR_SIM_FAIL_RATE='0'
$env:PUBLISH_PROVIDER='local' # use 'storacha' for live publish attempts
$env:STORACHA_ENDPOINT='https://api.storacha.network/v1/pins'
$env:STORACHA_API_TOKEN='replace-me'
$env:PUBLISH_STRICT='false'
$env:PUBLISH_TIMEOUT_MS='8000'
```

## API

- `GET /health`
- `POST /api/v1/volunteers/register`
- `GET /api/v1/volunteers?limit=100`
- `POST /api/v1/sync-bundles`
- `GET /api/v1/sync-bundles?limit=50`
- `GET /api/v1/sync-bundles/:id`
- `GET /api/v1/anchors?limit=100&status=queued`
- `GET /api/v1/anchors/:id`
- `POST /api/v1/anchors/:id/mark`
- `GET /api/v1/anchor-receipts?limit=100&bundleId=...&nodeId=...`
- `GET /api/v1/anchor-receipts/:id`

## Anchor Workflow

1. Bundle accepted by `/api/v1/sync-bundles`.
2. Backend creates `anchorJobId` with status `queued`.
3. Worker auto-updates status `queued -> submitted -> anchored/failed`.
4. `txHash` and `error` fields can be attached via mark endpoint.

## Phase 3 Failure Harness

Run while receiver is active:

```bash
node agent/failure_harness.js
```

The harness executes:

- out-of-order previousAnchor rejection,
- duplicate event ID replay rejection,
- signature mismatch rejection,
- intermittent connectivity simulation.

## Example Upload

```bash
curl -X POST http://localhost:8787/api/v1/sync-bundles \
  -H "Content-Type: application/json" \
  -d @disasternet-sync-123456.json
```

## Notes

- Storage is local JSON for MVP velocity.
- Publish metadata defaults to deterministic local CID-like IDs (`publisher.js`).
- Set `PUBLISH_PROVIDER=storacha` to attempt live publish via HTTP API.
- Set `PUBLISH_STRICT=true` to fail ingestion if live publish fails instead of falling back.
