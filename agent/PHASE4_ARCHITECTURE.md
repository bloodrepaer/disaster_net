# DisasterNet Phase 4: Contract-Driven Compensation Infrastructure

## Overview

Phase 4 implements the blockchain-backed compensation system with:
- **Multi-chain contracts** (Starknet + Ronin) for resilient anchoring and compensation
- **Confirmation polling** with exponential backoff for reliable transaction finality
- **Contract stubs** for testing without live endpoints
- **Live adapter mode** for end-to-end integration testing
- **OTP verification** for family claim finalization

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DisasterNet Phase 4                        │
│                   Compensation Infrastructure                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
        ┌───────v────┐  ┌─────v──────┐  ┌──v──────────┐
        │             │  │             │  │              │
        │  Starknet   │  │   Ronin    │  │  Polling    │
        │  Contract   │  │ Contract   │  │  Engine     │
        │  (Anchor)   │  │(Valuate)   │  │ (Finality)  │
        │             │  │             │  │              │
        └─────────────┘  └─────────────┘  └──────────────┘
                │             │                  │
                └─────────────┼──────────────────┘
                              │
                    ┌─────────v────────┐
                    │   MultiChain    │
                    │    Adapter      │
                    │                 │
                    └─────────────────┘
                              │
                    ┌─────────v────────┐
                    │   API Endpoints  │
                    │   (Phase 1-2)    │
                    └─────────────────┘
```

## Key Components

### 1. Contract Stubs

**StarknetContractStub** (`starknet_contract_stub.js`)
- `registerVolunteer()` — Register rescuer with World Level verification
- `anchorBundle()` — Anchor disaster relief bundle hash to chain
- `getAnchor()` — Query anchored bundle by hash + nodeId
- `getVolunteer()` — Query volunteer registration status

**RoninContractStub** (`ronin_contract_stub.js`)
- `submitDeceased()` — Submit person deceased status for compensation
- `getCompensations()` — Query all confirmations for person
- `isConsensusDeceased()` — Check if 2+ confirmations exist
- `unlockClaim()` — Unlock family claim tokens (requires consensus)

### 2. Confirmation Polling Engine

**ConfirmationPollingEngine** (`confirmation_polling_engine.js`)

Handles asynchronous blockchain transaction confirmation with:
- **Exponential backoff**: Initial 1s delay, max 30s
- **Configurable threshold**: Default 3 blocks deep
- **Polling callbacks**: Real-time status updates
- **Batch operations**: Poll multiple receipts in parallel

```javascript
const poller = new ConfirmationPollingEngine({
  maxAttempts: 36,        // ~3 minutes
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  confirmationThreshold: 3,
});

const result = await poller.poll(receipt, async (r) => {
  const status = await checkChain(r);
  return { status, blocksDeep: status.depth };
}, 'MyPolling');

// result.confirmed — true if succeeded
// result.attempts — number of retries
// result.finalStatus — final blockchain state
```

### 3. Multi-Chain Adapter

**MultiChainAdapter** (`multi_chain_adapter.js`)

Orchestrates end-to-end flows across Starknet + Ronin:

```javascript
const result = await adapter.anchorAndCompensate({
  nodeId: 'PHASE4-NODE-1',
  walletId: 'rescuer.starknet',
  worldLevel: 'ORB-VERIFIED',
  publicKeyPem: '...',
  bundleHash: '0xabc...',
  eventDataHash: '0xdef...',
  personId: 'PERSON-123',
  actorId: 'RESCUER-001',
  actorRole: 'rescuer',
});
```

**Flow:**
1. **Verify volunteer** on Starknet (World Level check)
2. **Anchor bundle** to Starknet (immutable disaster data)
3. **Poll Starknet** until confirmed
4. **Submit deceased** to Ronin (compensation trigger)
5. **Poll Ronin** until confirmed
6. Return combined TX hashes + confirmation time

### 4. Live Adapter Mode

**LiveAdapterMode** (`live_adapter_mode.js`)

Demonstration modes:

- **End-to-End Workflow**: Full anchor + compensate + polling cycle
- **Claim Unlock Workflow**: Show consensus (2+ confirmations) → unlock
- **Multi-Node Anchoring**: Resilience across 3+ nodes

```bash
node live_adapter_mode.js
```

Outputs real-time polling updates + completion summary.

## Integration Points

### with Phase 1-2 API

**Volunteer Registration** (POST `/api/v1/volunteers/register`)
→ Calls `starknet.registerVolunteer()` in background

**Bundle Submission** (POST `/api/v1/sync-bundles`)
→ Creates anchor job for `starknet.anchorBundle()`

**Receipt Tracking** (GET `/api/v1/anchor-receipts`)
→ Returns receipts with `confirmationStatus` + `confirmationChecksAt` array

**Person Status Update** (POST `/api/v1/persons/{id}/status`)
→ Triggers `ronin.submitDeceased()` when status = 'Deceased'

**Family Claim** (POST `/api/v1/persons/{id}/family/verify-otp`)
→ Checks `ronin.isConsensusDeceased()`, then calls `ronin.unlockClaim()`

### Persistent State

**Redis Keys:**
```
anchor:{headHash}:{nodeId} → { txHash, confirmationChecksAt: [...] }
person:{personId}:ronin_confirmations → [{ actorId, txHash, ... }]
volunteer:{walletId}:{nodeId}:verified → true/false
```

## Workflow: Person Status Update → Compensation

### 1. First Rescuer Confirms Deceased

```bash
POST /api/v1/persons/PERSON-123/status
{
  "status": "Deceased",
  "actorId": "RESCUER-001",
  "actorRole": "rescuer",
  "note": "Confirmed deceased"
}
```

**Backend:**
```javascript
await ronin.submitDeceased({
  personId: 'PERSON-123',
  actorId: 'RESCUER-001',
  actorRole: 'rescuer',
});
// Returns { txHash, blockNumber, status: 'pending' }

// Start polling
poller.poll(receipt, async (r) => {
  const comps = await ronin.getCompensations(personId);
  return { status: comps.length > 0 ? 'confirmed' : 'pending', blocksDeep: 0 };
});
```

**Response:**
```json
{
  "person": {
    "id": "PERSON-123",
    "status": "Deceased",
    "confirmationCount": 1,
    "compensation": null
  }
}
```

### 2. Second Rescuer Confirms Deceased

Same endpoint, different actorId.

**Backend detects consensus:**
```javascript
const comps = await ronin.getCompensations(personId);
if (comps.length >= 2) {
  // Consensus reached!
  const unlock = await ronin.unlockClaim({
    personId,
    claimAmount: 1000,
  });
  // Send SMS to next-of-kin
  await services.sms.send({
    phone: person.emergencyPhone,
    type: 'COMPENSATION_PROOF',
    amount: unlock.claimAmount,
  });
}
```

**Response:**
```json
{
  "person": {
    "id": "PERSON-123",
    "status": "Deceased",
    "confirmationCount": 2,
    "compensation": {
      "amount": 1000,
      "unlockedAt": "2026-03-21T12:34:56Z",
      "claimStatus": "pending",
      "nextSteps": "Family must verify OTP to claim"
    }
  }
}
```

## Workflow: OTP Verification → Family Claim

### 1. Family Requests OTP

```bash
POST /api/v1/persons/PERSON-123/family/request-otp
{ "phone": "+1234567890" }
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to +1234567890",
  "expiresIn": 600,
  "demoOtp": "123456"  // For testing only
}
```

### 2. Family Verifies OTP

```bash
POST /api/v1/persons/PERSON-123/family/verify-otp
{ "phone": "+1234567890", "otp": "123456" }
```

**Backend:**
```javascript
// Verify OTP against Redis
const stored = await redis.get(`otp:${personId}:${phone}`);
if (stored === otp && !isExpired) {
  // Check consensus on Ronin
  const ready = await ronin.isConsensusDeceased(personId);
  if (ready) {
    // Issue access token
    const token = jwt.sign({
      personId,
      phone,
      permission: 'claim',
    }, SECRET, { expiresIn: '1h' });
  }
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "claimAmount": 1000,
  "walletAddress": "0x1234...",
  "nextStep": "Use token to withdraw funds from Ronin contract"
}
```

## Testing

### Run Integration Harness

```bash
cd agent
node phase4_integration_harness.js
```

Tests:
- ✓ Volunteer registration
- ✓ Bundle submission with signing
- ✓ Anchor job queueing
- ✓ Receipt polling fields
- ✓ Person status update → compensation trigger
- ✓ Second rescuer confirms → consensus
- ✓ SMS proof logging
- ✓ OTP request + verification flow

### Run Live Adapter Demo

```bash
node live_adapter_mode.js
```

Shows:
- End-to-end workflow with real polling
- Claim unlock after reaching consensus
- Multi-node resilience

## Deployment Checklist

- [ ] Deploy contract stubs to test environment
- [ ] Configure Starknet RPC endpoint (production)
- [ ] Configure Ronin RPC endpoint (production)
- [ ] Set `CONFIRMATION_THRESHOLD` env var
- [ ] Enable polling callbacks for observability
- [ ] Configure SMS gateway for compensation proofs
- [ ] Load test OTP verification flow (1000 concurrent)
- [ ] Verify Redis persistence for polling state
- [ ] Set up monitoring for failed polls (alert if > 10%)
- [ ] Document family claim process in UI

## Environment Variables

```bash
# Contract endpoints (test)
STARKNET_RPC_URL=http://localhost:5050
RONIN_RPC_URL=http://localhost:8545

# Polling
CONFIRMATION_THRESHOLD=3
MAX_POLL_ATTEMPTS=36
POLL_INITIAL_DELAY_MS=1000
POLL_MAX_DELAY_MS=30000

# SMS
SMS_PROVIDER=twilio
SMS_ACCOUNT_SID=AC...
SMS_AUTH_TOKEN=...

# OTP
OTP_TTL_SECONDS=600
OTP_LENGTH=6
```

## Future Enhancements

1. **Cross-chain bridging** — Automated transfer between Starknet ↔ Ronin
2. **Multi-signature verification** — 3+ of 5 confirmations required
3. **Conditional compensation** — Payout based on damage assessment
4. **Fractional claims** — Family can claim partial amounts
5. **Appeal process** — Challenge deceased status with evidence
6. **Fiat on-ramp** — Convert tokens to local currency via Wise API
7. **Disaster severity tiers** — Compensation amount scales with zone disaster rating

---

**Phase 4 Status:** ✓ Contract integration + confirmation polling + multi-chain orchestration
