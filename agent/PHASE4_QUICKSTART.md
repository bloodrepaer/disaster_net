# DisasterNet Phase 4: Quick Start Guide

## What is Phase 4?

Phase 4 transforms DisasterNet from a data-collection system into a **compensation distribution system** using blockchain contracts. When two rescuers confirm a person is deceased, the system:

1. **Verifies** rescuers on Starknet
2. **Anchors** disaster data permanently
3. **Waits** for blockchain confirmation (~3 blocks)
4. **Triggers** Ronin compensation contract
5. **Requires** 2+ confirmations for consensus
6. **Unlocks** family claim via OTP verification

## Project Structure

```
agent/
├── starknet_contract_stub.js           # Anchor contract simulator
├── ronin_contract_stub.js              # Compensation contract simulator
├── confirmation_polling_engine.js      # Transaction finality checker (exponential backoff)
├── multi_chain_adapter.js              # Orchestrates full flow
├── live_adapter_mode.js                # Live demonstration + testing
├── phase4_integration_harness.js       # Integration test suite
├── phase4_api_integration.js           # Wiring into Express API
├── PHASE4_ARCHITECTURE.md              # Full specification
└── README.md                           # This file
```

## Quick Start: 3 Minutes

### 1. Run the Integration Harness

Tests all Phase 4 components end-to-end:

```bash
cd agent
node phase4_integration_harness.js
```

Expected output:
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

=== Summary ===
Passed: 9
Failed:  0
Total:   9
```

### 2. Run the Live Adapter Demo

See the system in action with real polling:

```bash
node live_adapter_mode.js
```

Shows:
- Real polling with exponential backoff
- Consensus detection (2+ confirmations)
- Multi-node resilience simulation

## Key Workflows

### Workflow 1: Volunteer Registration + Bundle Anchoring

```bash
# Frontend calls API
POST /api/v1/volunteers/register
{
  "nodeId": "RESCUE-NODE-1",
  "nearId": "rescuer.near",
  "worldLevel": "ORB-VERIFIED",
  "publicKeyPem": "-----BEGIN PUBLIC KEY-----..."
}

# Backend:
# 1. Stores volunteer in DB (Phase 1)
# 2. Registers on Starknet (Phase 4)
# 3. Returns combined receipt

Response:
{
  "volunteer": { "id": "...", "nodeId": "..." },
  "starknetRegistration": { "txHash": "0x..." }
}
```

### Workflow 2: Person Status Update → Compensation Flow

```bash
# First Rescuer Confirms Deceased
POST /api/v1/persons/PERSON-123/status
{
  "status": "Deceased",
  "actorId": "RESCUER-001",
  "actorRole": "rescuer"
}

# Backend:
# 1. Updates DB (Phase 1)
# 2. Submits to Ronin contract (Phase 4)
# 3. Starts polling until confirmed
# Returns: confirmationCount = 1, no compensation yet

# Second Rescuer Confirms Deceased  
POST /api/v1/persons/PERSON-123/status
{
  "status": "Deceased",
  "actorId": "RESCUER-002",
  "actorRole": "rescuer"
}

# Backend:
# 1. Gets 2nd confirmation on Ronin (consensus!)
# 2. Calls unlockClaim() on Ronin
# 3. Sends SMS proof to next-of-kin

Response:
{
  "person": { "status": "Deceased", "confirmationCount": 2 },
  "compensation": {
    "amount": 1000,
    "txHash": "0x...",
    "claimStatus": "unlocked"
  }
}
```

### Workflow 3: Family Claims Compensation

```bash
# Step 1: Request OTP
POST /api/v1/persons/PERSON-123/family/request-otp
{ "phone": "+1234567890" }

Response:
{ "message": "OTP sent", "expiresIn": 600, "demoOtp": "123456" }

# Step 2: Verify OTP (gets claim token)
POST /api/v1/persons/PERSON-123/family/verify-otp
{ "phone": "+1234567890", "otp": "123456" }

Response:
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "claimAmount": 1000,
  "walletAddress": "0x1234...",
  "nextStep": "Use token to withdraw via portal"
}

# Token can be used to access family claim portal
# Portal queries Ronin to finalize payout
```

## Components Deep Dive

### StarknetContractStub

Simulates the **Disaster Relief Registry** contract:
- `registerVolunteer()` — Verify rescuer credentials via World Passport
- `anchorBundle()` — Immutably record disaster data hash
- `getAnchor()` — Query anchored bundle by hash

```javascript
const starknet = new StarknetContractStub();

const reg = await starknet.registerVolunteer({
  walletId: 'rescuer.starknet',
  nodeId: 'RESCUE-1',
  level: 'ORB-VERIFIED',
  publicKeyPem: '...',
});
// Returns: { txHash: "0x...", event: "VolunteerRegistered" }

const anchor = await starknet.anchorBundle({
  nodeId: 'RESCUE-1',
  headHash: '0xabc...',
  signer: 'rescuer.starknet',
  eventDataHash: '0xdef...',
});
// Returns: { txHash: "0x...", blockNumber: 10000 }
```

### RoninContractStub

Simulates the **Disaster Relief Fund** contract:
- `submitDeceased()` — Record rescuer confirmation person is deceased
- `getCompensations()` — Query confirmations for person
- `unlockClaim()` — Release family compensation (requires 2+ confirmations)

```javascript
const ronin = new RoninContractStub();

// First confirmation
await ronin.submitDeceased({
  personId: 'PERSON-123',
  actorId: 'RESCUER-1',
  actorRole: 'rescuer',
});

// Second confirmation
await ronin.submitDeceased({
  personId: 'PERSON-123',
  actorId: 'RESCUER-2',
  actorRole: 'rescuer',
});

// Check consensus
const consensus = await ronin.isConsensusDeceased('PERSON-123');
// Returns: true (2+ confirmations)

// Unlock compensation
const unlock = await ronin.unlockClaim({
  personId: 'PERSON-123',
  claimAmount: 1000,
});
// Returns: { txHash: "0x...", status: "unlocked" }
```

### ConfirmationPollingEngine

Polls blockchain until transaction is sufficiently confirmed:
- **Exponential backoff**: 1s → 1.5s → 2.25s ... up to 30s
- **Configurable threshold**: Default 3 blocks deep
- **Batch operations**: Poll multiple receipts in parallel

```javascript
const poller = new ConfirmationPollingEngine({
  maxAttempts: 36,           // ~3 min of retries
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  confirmationThreshold: 3,  // blocks deep
});

// Single receipt
const result = await poller.poll(
  receipt,
  async (r) => {
    const status = await checkChain(r);
    return { status: status.ok ? 'confirmed' : 'pending', blocksDeep: status.depth };
  },
  'MyTx'
);
// Returns: { confirmed: true, attempts: 5, finalStatus: {...} }

// Multiple receipts (parallel)
const batch = await poller.pollMultiple(
  [receipt1, receipt2, receipt3],
  checkChainFn,
  'Batch'
);
// Returns: { totalReceipts: 3, confirmedCount: 3, allConfirmed: true }
```

### MultiChainAdapter

Orchestrates the full end-to-end flow across Starknet + Ronin:

```javascript
const adapter = new MultiChainAdapter(starknet, ronin);

const result = await adapter.anchorAndCompensate({
  nodeId: 'RESCUE-1',
  walletId: 'rescuer.starknet',
  worldLevel: 'ORB-VERIFIED',
  publicKeyPem: '...',
  bundleHash: '0xabc...',
  eventDataHash: '0xdef...',
  personId: 'PERSON-123',
  actorId: 'RESCUER-001',
  actorRole: 'rescuer',
});

// Returns:
// {
//   success: true,
//   starknetAnchor: "0x...",  // Tx hash for anchoring
//   roninSubmit: "0x...",      // Tx hash for compensation
//   confirmationTime: 15234    // Total ms spent polling
// }
```

## Testing

### Run All Tests

```bash
# Integration harness (tests all components)
node phase4_integration_harness.js

# Live demo (shows real workflows)
node live_adapter_mode.js
```

### Test Coverage

**phase4_integration_harness.js** tests:
- ✓ Volunteer registration → Starknet
- ✓ Bundle submission with signatures
- ✓ Anchor job creation + processing
- ✓ Receipt polling logic
- ✓ Person status → Ronin compensation
- ✓ Consensus detection (2+ confirmations)
- ✓ SMS proof logging
- ✓ OTP request + verification

**live_adapter_mode.js** demonstrates:
- ✓ End-to-end anchor + compensate flow with polling
- ✓ Claim unlock after consensus
- ✓ Multi-node resilience (3+ simultaneous flows)

## Integrating into Express API

See `phase4_api_integration.js` for complete wiring. Summary:

### At Startup

```javascript
const { initializePhase4Contracts } = require('./phase4_api_integration');
const contracts = initializePhase4Contracts();

const app = express();
// ... wire routes with contracts passed in
```

### Route Additions

```javascript
// Existing Phase 1-2 routes ENHANCED with Phase 4:

app.post('/api/v1/volunteers/register', async (req, res) => {
  // 1. Store in DB (Phase 1)
  // 2. Register on Starknet (Phase 4)
  // 3. Return combined receipt
});

app.post('/api/v1/sync-bundles', async (req, res) => {
  // 1. Create sync bundle (Phase 2)
  // 2. Trigger anchor job (Phase 2)
  // 3. Async anchor on Starknet + poll (Phase 4)
});

app.post('/api/v1/persons/:id/status', async (req, res) => {
  // 1. Update person status (Phase 1)
  // 2. If Deceased: submit to Ronin (Phase 4)
  // 3. Check if 2+ confirmations → unlock compensation
});

app.post('/api/v1/persons/:id/family/request-otp', async (req, res) => {
  // 1. Verify person is deceased + compensated
  // 2. Generate + send OTP
});

app.post('/api/v1/persons/:id/family/verify-otp', async (req, res) => {
  // 1. Verify OTP against Redis
  // 2. Check Ronin consensus
  // 3. Issue JWT token for family claim portal
});
```

## Environment Variables

```bash
# Contracts
STARKNET_RPC_URL=http://localhost:5050
RONIN_RPC_URL=http://localhost:8545

# Polling
CONFIRMATION_THRESHOLD=3
MAX_POLL_ATTEMPTS=36
POLL_INITIAL_DELAY_MS=1000
POLL_MAX_DELAY_MS=30000

# OTP
OTP_TTL_SECONDS=600
OTP_LENGTH=6

# SMS
SMS_PROVIDER=twilio
SMS_ACCOUNT_SID=AC...
SMS_AUTH_TOKEN=...
```

## Monitoring & Observability

### Key Metrics to Track

1. **Poll Success Rate**: % of receipts confirmed within threshold
2. **Poll Latency**: Time from submission to confirmation
3. **Consensus Time**: Time to get 2+ Ronin confirmations
4. **Compensation Unlock Rate**: % of deceased statuses resulting in compensation
5. **Family Claim Completion**: % of OTP verifications → successful withdrawal

### Logs to Monitor

```bash
# Polling progress
[Phase4] Poll StarknetAnchor: attempt=1, status=pending
[Phase4] Poll StarknetAnchor: attempt=2, status=pending
[Phase4] Poll StarknetAnchor: attempt=3, status=confirmed

# Consensus events
[Phase4] Person PERSON-123: consensus reached after 2 confirmations

# Compensation unlocks
[Phase4] Compensation unlocked for PERSON-123: 1000 units
[SMS] Compensation proof sent to +1234567890
```

## Deployment Checklist

- [ ] Deploy Starknet contract to testnet/mainnet
- [ ] Deploy Ronin contract to testnet/mainnet
- [ ] Configure RPC endpoints in environment
- [ ] Load test confirmation polling (1000 concurrent receipts)
- [ ] Enable monitoring for poll success rates
- [ ] Set up alerts for consensus failures
- [ ] Configure SMS gateway for compensation proofs
- [ ] Test OTP generation + verification at scale (1000/min)
- [ ] Integrate family claim portal
- [ ] Document emergency procedures (manual compensation if consensus fails)

## FAQ

**Q: What if the second rescuer never confirms?**
A: Compensation unlocking is deferred until 2+ confirmations. Families can appeal through manual process.

**Q: What about cross-chain bridge attacks?**
A: Starknet anchor is immutable for historical record. Ronin consensus requires >50% validator signature. Cross-chain bridge uses standard message verification.

**Q: How long does confirmation take?**
A: With 3-block threshold and 12s block time, ~36s typical. Exponential backoff waits up to 3 minutes before failing.

**Q: Can confirmations be reverted?**
A: On Starknet: immutable once anchored. On Ronin: recorded but funds only released after OTP. Reverts require 2 rescuers to sign contradiction.

**Q: What if OTP expires?**
A: Family can request new OTP. Helpful during connectivity issues in disaster zones.

---

**Status:** ✅ Phase 4 complete with contract stubs, polling engine, multi-chain orchestration, and live demonstration

**Next:** Deploy contracts to Starknet/Ronin testnets, integrate with production API, scale family claim portal
