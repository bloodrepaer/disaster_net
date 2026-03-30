/*
  Phase 3 failure harness.

  Covers:
  1) Out-of-order bundle (anchor continuity fail)
  2) Duplicate event IDs (replay fail)
  3) Signature mismatch
  4) Intermittent connectivity simulation (network error)

  Run:
    node agent/failure_harness.js
*/

const crypto = require('node:crypto');
const { hashString, stableStringify } = require('./verifier');

const BASE = process.env.SYNC_BASE_URL || 'http://localhost:8787';

function logCase(name, ok, details) {
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name}`);
  if (details) console.log(`  ${details}`);
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

function makeEvent({ id, nodeId, prevHash, type = 'harness.event', payload = {} }) {
  const ts = new Date().toISOString();
  const hash = hashString(`${prevHash}|${type}|${stableStringify(payload)}|${ts}|${nodeId}`);
  return { id, type, ts, node: nodeId, prevHash, hash, payload };
}

function makeBundle({ nodeId, previousAnchor, events, signerPem }) {
  const generatedAt = new Date().toISOString();
  const eventCount = events.length;
  const headHash = events[0].hash;
  const bundle = {
    schema: 'disasternet.sync.bundle.v1',
    generatedAt,
    nodeId,
    previousAnchor,
    headHash,
    eventCount,
    events,
  };

  if (signerPem) {
    const payload = stableStringify({
      schema: bundle.schema,
      nodeId: bundle.nodeId,
      generatedAt: bundle.generatedAt,
      previousAnchor: bundle.previousAnchor,
      headHash: bundle.headHash,
      eventCount: bundle.eventCount,
      eventHashes: bundle.events.map((e) => e.hash),
    });
    const signature = crypto.sign(null, Buffer.from(payload), signerPem).toString('base64');
    bundle.signature = signature;
    bundle.signer = { nearId: `${nodeId.toLowerCase()}.near`, worldLevel: 'ORB-VERIFIED' };
  }

  return bundle;
}

async function run() {
  console.log('=== DisasterNet Phase 3 Failure Harness ===');

  const nodeId = `NODE-HARNESS-${Date.now().toString(36).toUpperCase()}`;
  const id1 = `EVT-${Date.now().toString(36).toUpperCase()}-A`;
  const id2 = `EVT-${Date.now().toString(36).toUpperCase()}-B`;

  // Baseline valid bundle for continuity context.
  const e1 = makeEvent({ id: id1, nodeId, prevHash: 'GENESIS', payload: { step: 1 } });
  const b1 = makeBundle({ nodeId, previousAnchor: 'NONE', events: [e1] });
  const r1 = await req('POST', '/api/v1/sync-bundles', b1);
  const baselineOk = r1.status === 201;
  logCase('Baseline valid upload', baselineOk, `status=${r1.status}`);

  // 1) Out-of-order: wrong previousAnchor after first accepted bundle.
  const e2 = makeEvent({ id: id2, nodeId, prevHash: e1.hash, payload: { step: 2 } });
  const bOutOfOrder = makeBundle({ nodeId, previousAnchor: 'WRONG_ANCHOR_HASH', events: [e2] });
  const rOut = await req('POST', '/api/v1/sync-bundles', bOutOfOrder);
  logCase('Out-of-order previousAnchor rejected', rOut.status === 409, `status=${rOut.status} msg=${rOut.data.message}`);

  // 2) Duplicate event ID replay: reuse id1 with a new event.
  const eDup = makeEvent({ id: id1, nodeId, prevHash: e1.hash, payload: { replay: true } });
  const bDup = makeBundle({ nodeId, previousAnchor: e1.hash, events: [eDup] });
  const rDup = await req('POST', '/api/v1/sync-bundles', bDup);
  logCase('Duplicate event ID rejected', rDup.status === 409, `status=${rDup.status} msg=${rDup.data.message}`);

  // 3) Signature mismatch: register signer, then send mismatched signature.
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const regNode = `NODE-SIG-${Date.now().toString(36).toUpperCase()}`;
  const nearId = `${regNode.toLowerCase()}.near`;
  const worldLevel = 'ORB-VERIFIED';
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  const rReg = await req('POST', '/api/v1/volunteers/register', { nodeId: regNode, nearId, worldLevel, publicKeyPem });
  const regOk = rReg.status === 201;
  logCase('Volunteer registration', regOk, `status=${rReg.status}`);

  const eSig = makeEvent({ id: `EVT-${Date.now().toString(36).toUpperCase()}-SIG`, nodeId: regNode, prevHash: 'GENESIS', payload: { signed: true } });
  const goodSigned = makeBundle({ nodeId: regNode, previousAnchor: 'NONE', events: [eSig], signerPem: privateKey });
  const badSigned = {
    ...goodSigned,
    signature: goodSigned.signature.slice(0, Math.max(8, goodSigned.signature.length - 8)) + 'ABCD',
  };
  const rSig = await req('POST', '/api/v1/sync-bundles', badSigned);
  logCase('Signature mismatch rejected', rSig.status === 401, `status=${rSig.status} msg=${rSig.data.message}`);

  // 4) Intermittent connectivity simulation: call wrong port.
  let netFail = false;
  try {
    await fetch('http://localhost:8788/health');
  } catch {
    netFail = true;
  }
  logCase('Intermittent connectivity simulated', netFail, netFail ? 'network error captured' : 'no error');

  console.log('=== Harness complete ===');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
