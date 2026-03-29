# DisasterNet Sync Receiver (MVP)

This service ingests sync bundles exported from the frontend mesh UI, verifies event hash integrity, and stores accepted bundles locally.

## What It Does

- Accepts `POST /api/v1/sync-bundles` with `disasternet.sync.bundle.v1` payload.
- Verifies:
  - bundle schema and metadata,
  - event count consistency,
  - per-event deterministic hash,
  - chained `prevHash` continuity inside the submitted sequence,
  - `headHash` consistency with newest event.
- Persists valid bundles to `agent/data/bundles.json`.
- Enforces per-node anchor continuity (`previousAnchor` must match last accepted `headHash`).
- Rejects replays (duplicate `headHash` or previously-seen event IDs).
- Attaches deterministic CID-like publish metadata for downstream anchoring.
- Creates an anchor job per accepted bundle for chain settlement tracking.

## Volunteer Identity + Signature (NEAR/World Binding)

The receiver now supports a volunteer registry that binds:

- `nodeId` -> device/node identity
- `nearId` -> volunteer account identity
- `worldLevel` -> verification tier
- `publicKeyPem` -> signing key for bundle signatures

Register a volunteer:

```bash
curl -X POST http://localhost:8787/api/v1/volunteers/register \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId":"NODE-1234",
    "nearId":"rescue_team_1.near",
    "worldLevel":"ORB-VERIFIED",
    "publicKeyPem":"-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----"
  }'
```

List volunteers:

```bash
curl http://localhost:8787/api/v1/volunteers
```

If a node is registered, uploads must include valid `signature` + `signer` fields.

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

## Anchor Workflow

1. Bundle accepted by `/api/v1/sync-bundles`.
2. Backend creates `anchorJobId` with status `queued`.
3. Worker/operator can update status to `submitted`, `anchored`, or `failed`.
4. `txHash` and `error` fields can be attached via mark endpoint.

## Example Upload

```bash
curl -X POST http://localhost:8787/api/v1/sync-bundles \
  -H "Content-Type: application/json" \
  -d @disasternet-sync-123456.json
```

## Notes

- Storage is local JSON for MVP velocity.
- Publish metadata currently uses deterministic local CID-like IDs (`publisher.js`).
- Swap `publisher.js` to Storacha/IPFS client for production pinning.
