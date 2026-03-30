const http = require('node:http');
const { URL } = require('node:url');
const crypto = require('node:crypto');
const { verifyBundle, getBundleSigningPayload } = require('./verifier');
const { publishBundle } = require('./publisher');
const { submitAnchor } = require('./chain_adapter');
const {
  addBundle,
  listBundles,
  getBundleById,
  upsertVolunteer,
  getVolunteerByNodeId,
  listVolunteers,
  getLatestBundleForNode,
  hasBundleHeadHash,
  hasAnyEventId,
  queueAnchor,
  listAnchors,
  getAnchorById,
  updateAnchor,
  addPerson,
  getPersonById,
  listPersons,
  updatePerson,
  searchPersons,
  setOtpRecord,
  getOtpRecord,
  clearOtpRecord,
  addSms,
  listSms,
  addAnchorReceipt,
  listAnchorReceipts,
  getAnchorReceiptById,
} = require('./storage');

const PORT = Number(process.env.PORT || 8787);
const REQUIRE_SIGNATURE = String(process.env.REQUIRE_SIGNATURE || 'false').toLowerCase() === 'true';
const PHASE2_STATUSES = ['Missing', 'Located', 'Displaced', 'Hospitalised', 'Deceased'];
const ANCHOR_WORKER_INTERVAL_MS = Number(process.env.ANCHOR_WORKER_INTERVAL_MS || 5000);
const ANCHOR_MAX_RETRIES = Number(process.env.ANCHOR_MAX_RETRIES || 3);

let anchorWorkerRunning = false;

function randomDigits(length) {
  let out = '';
  while (out.length < length) out += Math.floor(Math.random() * 10).toString();
  return out.slice(0, length);
}

function makeTxHash() {
  return `0x${crypto.randomBytes(32).toString('hex')}`;
}

function normalizeStatus(value) {
  const status = String(value || '').trim();
  return PHASE2_STATUSES.includes(status) ? status : null;
}

function formatPublicPerson(person) {
  return {
    id: person.id,
    name: person.name,
    status: person.status,
    lastSeenZone: person.lastSeenZone || 'UNKNOWN',
    lastUpdatedAt: person.updatedAt || person.createdAt,
  };
}

function triggerCompensationIfEligible(person) {
  if (person.status !== 'Deceased') return { triggered: false, reason: 'status_not_deceased' };
  if (!person.anchorCid) return { triggered: false, reason: 'missing_ipfs_anchor' };
  if (person.compensation && person.compensation.status === 'paid') return { triggered: false, reason: 'already_paid' };

  const txHash = makeTxHash();
  const compensation = {
    status: 'paid',
    amount: person.compensation?.amount || '₹2,00,000',
    txHash,
    paidAt: new Date().toISOString(),
    chain: 'starknet-sepolia',
    anchorCid: person.anchorCid,
  };

  person.compensation = compensation;
  person.statusHistory = person.statusHistory || [];
  person.statusHistory.push({
    status: 'Deceased',
    byId: 'AUTO-COMPENSATION',
    byRole: 'system',
    note: `Compensation auto-triggered. Tx ${txHash}`,
    ts: new Date().toISOString(),
  });

  if (person.phone) {
    addSms({
      id: `SMS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      personId: person.id,
      phone: person.phone,
      type: 'COMPENSATION_PROOF',
      message: `DisasterNet update: compensation processed for ${person.name}. Tx hash: ${txHash}`,
      txHash,
      sentAt: new Date().toISOString(),
    });
    compensation.smsNotified = true;
  }

  return { triggered: true, txHash };
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 3 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        reject(new Error('Request body is empty'));
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

async function normalizeBundleForStorage(bundle) {
  const now = new Date().toISOString();
  const publish = await publishBundle(bundle);
  return {
    id: `BND-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    receivedAt: now,
    nodeId: bundle.nodeId,
    headHash: bundle.headHash,
    previousAnchor: bundle.previousAnchor,
    eventCount: bundle.eventCount,
    schema: bundle.schema,
    generatedAt: bundle.generatedAt,
    signature: bundle.signature || null,
    signer: bundle.signer || null,
    publish,
    bundle,
  };
}

function createAnchorJobFromBundle(record) {
  return {
    id: `ANC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    bundleId: record.id,
    nodeId: record.nodeId,
    headHash: record.headHash,
    previousAnchor: record.previousAnchor,
    targetChain: 'starknet',
    contractRef: 'ReliefFund.v1',
    status: 'queued',
    txHash: null,
    error: null,
    attempts: 0,
    nextAttemptAt: null,
    lastAttemptAt: null,
    anchoredAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function backoffMs(attempts) {
  const clamped = Math.max(1, Math.min(attempts, 6));
  return Math.pow(2, clamped) * 1000;
}

async function pollConfirmation(anchor, receipt) {
  if (!anchor.txHash || anchor.status !== 'anchored') {
    return null;
  }

  // Mock confirmation polling: simulate chain confirmation delay
  const elapsedSeconds = (Date.now() - new Date(receipt.anchoredAt).getTime()) / 1000;
  const confirmationStatus = elapsedSeconds < 5 ? 'pending' : elapsedSeconds < 15 ? 'confirmed' : 'finalized';

  return {
    ok: true,
    confirmationStatus,
    blockNumber: confirmationStatus !== 'pending' ? Math.floor(Math.random() * 1000000) : null,
    timestamp: new Date().toISOString(),
  };
}

function shouldProcessAnchor(anchor) {
  if (!anchor) return false;
  if (anchor.status === 'queued') return true;
  if (anchor.status !== 'failed') return false;
  if (Number(anchor.attempts || 0) >= ANCHOR_MAX_RETRIES) return false;
  if (!anchor.nextAttemptAt) return true;
  return Date.now() >= new Date(anchor.nextAttemptAt).getTime();
}

async function processSingleAnchor(anchor) {
  const nowIso = new Date().toISOString();
  updateAnchor(anchor.id, {
    status: 'submitted',
    error: null,
    lastAttemptAt: nowIso,
  });

  const bundleRecord = getBundleById(anchor.bundleId);
  if (!bundleRecord) {
    const attempts = Number(anchor.attempts || 0) + 1;
    updateAnchor(anchor.id, {
      status: 'failed',
      attempts,
      error: `Bundle ${anchor.bundleId} not found`,
      nextAttemptAt: new Date(Date.now() + backoffMs(attempts)).toISOString(),
    });
    return;
  }

  const chainRes = await submitAnchor({
    anchorId: anchor.id,
    bundleId: anchor.bundleId,
    nodeId: anchor.nodeId,
    headHash: anchor.headHash,
    cid: bundleRecord.publish?.cid || null,
    previousAnchor: anchor.previousAnchor,
  });

  if (!chainRes.ok) {
    const attempts = Number(anchor.attempts || 0) + 1;
    updateAnchor(anchor.id, {
      status: 'failed',
      attempts,
      error: chainRes.error || 'Chain submit failed',
      nextAttemptAt: new Date(Date.now() + backoffMs(attempts)).toISOString(),
    });
    return;
  }

  const anchoredAt = new Date().toISOString();
  const attempts = Number(anchor.attempts || 0) + 1;
  updateAnchor(anchor.id, {
    status: 'anchored',
    attempts,
    txHash: chainRes.txHash,
    error: null,
    anchoredAt,
    nextAttemptAt: null,
  });

  addAnchorReceipt({
    id: `RCP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    anchorJobId: anchor.id,
    bundleId: anchor.bundleId,
    nodeId: anchor.nodeId,
    headHash: anchor.headHash,
    cid: bundleRecord.publish?.cid || null,
    chain: chainRes.chain,
    txHash: chainRes.txHash,
    mode: chainRes.mode,
    attempt: attempts,
    confirmationStatus: 'pending',
    confirmationChecksAt: [],
    finalizedAt: null,
    anchoredAt,
    createdAt: anchoredAt,
  });
}

async function runAnchorWorkerTick() {
  if (anchorWorkerRunning) return;
  anchorWorkerRunning = true;
  try {
    const candidates = listAnchors({ limit: 300 }).filter(shouldProcessAnchor);
    for (const anchor of candidates) {
      // Process sequentially to avoid duplicate submits.
      // eslint-disable-next-line no-await-in-loop
      await processSingleAnchor(anchor);
    }

    // Poll confirmations on recently anchored jobs
    const anchoredJobs = listAnchors({ limit: 300, status: 'anchored' });
    for (const anchor of anchoredJobs) {
      const receipt = (listAnchorReceipts({ limit: 1, anchorJobId: anchor.id }) || [])[0];
      if (receipt) {
        // eslint-disable-next-line no-await-in-loop
        const pollResult = await pollConfirmation(anchor, receipt);
        if (pollResult && pollResult.ok && pollResult.confirmationStatus !== 'pending') {
          const { getAnchorReceiptById } = require('./storage');
          const updatingReceipt = getAnchorReceiptById(receipt.id);
          if (updatingReceipt) {
            updatingReceipt.confirmationStatus = pollResult.confirmationStatus;
            if (!updatingReceipt.confirmationChecksAt) updatingReceipt.confirmationChecksAt = [];
            updatingReceipt.confirmationChecksAt.push(pollResult.timestamp);
            if (pollResult.confirmationStatus === 'finalized') {
              updatingReceipt.finalizedAt = pollResult.timestamp;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[AnchorWorker] tick failed:', err.message);
  } finally {
    anchorWorkerRunning = false;
  }
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validateVolunteerPayload(body) {
  const errors = [];
  if (!body || typeof body !== 'object') errors.push('Body must be a JSON object');
  if (!isNonEmptyString(body?.nodeId)) errors.push('nodeId is required');
  if (!isNonEmptyString(body?.nearId)) errors.push('nearId is required');
  if (!isNonEmptyString(body?.worldLevel)) errors.push('worldLevel is required');
  if (!isNonEmptyString(body?.publicKeyPem)) errors.push('publicKeyPem is required');
  return errors;
}

function validatePersonCreatePayload(body) {
  const errors = [];
  if (!body || typeof body !== 'object') errors.push('Body must be a JSON object');
  if (!isNonEmptyString(body?.name)) errors.push('name is required');
  if (!isNonEmptyString(body?.lastSeenZone)) errors.push('lastSeenZone is required');
  return errors;
}

function verifyBundleSignature(bundle, volunteer) {
  if (!bundle.signature || !bundle.signer) {
    return { ok: false, error: 'Bundle must include signature and signer metadata' };
  }

  if (bundle.signer.nearId !== volunteer.nearId) {
    return { ok: false, error: 'Signer nearId mismatch for node registry' };
  }

  if (bundle.signer.worldLevel !== volunteer.worldLevel) {
    return { ok: false, error: 'Signer worldLevel mismatch for node registry' };
  }

  const payload = getBundleSigningPayload(bundle);
  const publicKey = crypto.createPublicKey(volunteer.publicKeyPem);
  const sig = Buffer.from(bundle.signature, 'base64');
  const valid = crypto.verify(null, Buffer.from(payload), publicKey, sig);
  return valid ? { ok: true } : { ok: false, error: 'Invalid bundle signature' };
}

function checkNodeContinuity(bundle) {
  const latest = getLatestBundleForNode(bundle.nodeId);
  if (!latest) {
    if (bundle.previousAnchor !== 'NONE') {
      return { ok: false, error: 'previousAnchor must be NONE for first bundle of a node' };
    }
    return { ok: true };
  }

  if (bundle.previousAnchor !== latest.headHash) {
    return {
      ok: false,
      error: `Anchor continuity failed: expected previousAnchor ${latest.headHash}, got ${bundle.previousAnchor}`,
    };
  }

  return { ok: true };
}

function checkReplay(bundle) {
  if (hasBundleHeadHash(bundle.nodeId, bundle.headHash)) {
    return { ok: false, error: 'Duplicate headHash detected for this node (replay)' };
  }

  const eventIds = Array.isArray(bundle.events) ? bundle.events.map((e) => e.id) : [];
  if (hasAnyEventId(eventIds)) {
    return { ok: false, error: 'One or more event IDs already ingested (replay)' };
  }

  return { ok: true };
}

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, { ok: true });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'disasternet-sync-receiver',
      requireSignature: REQUIRE_SIGNATURE,
      time: new Date().toISOString(),
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/persons') {
    try {
      const body = await parseJsonBody(req);
      const errs = validatePersonCreatePayload(body);
      if (errs.length) {
        sendJson(res, 400, { ok: false, message: 'Invalid person payload', errors: errs });
        return;
      }

      const now = new Date().toISOString();
      const person = {
        id: `PRS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
        name: String(body.name).trim(),
        phone: String(body.phone || '').trim(),
        lastSeenZone: String(body.lastSeenZone).trim().toUpperCase(),
        note: String(body.note || '').trim(),
        anchorCid: String(body.anchorCid || '').trim() || null,
        status: 'Missing',
        statusHistory: [{
          status: 'Missing',
          byId: String(body.reporterId || 'UNKNOWN'),
          byRole: String(body.reporterRole || 'rescuer'),
          note: 'Initial report logged',
          ts: now,
        }],
        deceasedConfirmations: [],
        compensation: null,
        claimVerifiedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      addPerson(person);
      sendJson(res, 201, { ok: true, person, public: formatPublicPerson(person) });
      return;
    } catch (err) {
      sendJson(res, 400, { ok: false, message: err.message });
      return;
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/persons') {
    const limit = Number(url.searchParams.get('limit') || 200);
    const persons = listPersons(limit);
    sendJson(res, 200, { ok: true, count: persons.length, persons });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/family/search') {
    const query = String(url.searchParams.get('query') || '').trim();
    if (!query) {
      sendJson(res, 200, { ok: true, count: 0, results: [] });
      return;
    }
    const results = searchPersons(query, 50).map(formatPublicPerson);
    sendJson(res, 200, { ok: true, count: results.length, results });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/sms') {
    const limit = Number(url.searchParams.get('limit') || 100);
    const messages = listSms(limit);
    sendJson(res, 200, { ok: true, count: messages.length, messages });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/volunteers/register') {
    try {
      const body = await parseJsonBody(req);
      const errs = validateVolunteerPayload(body);
      if (errs.length) {
        sendJson(res, 400, { ok: false, message: 'Invalid volunteer payload', errors: errs });
        return;
      }

      const saved = upsertVolunteer({
        nodeId: body.nodeId,
        nearId: body.nearId,
        worldLevel: body.worldLevel,
        publicKeyPem: body.publicKeyPem,
      });

      sendJson(res, 201, {
        ok: true,
        volunteer: {
          nodeId: saved.nodeId,
          nearId: saved.nearId,
          worldLevel: saved.worldLevel,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
        },
      });
      return;
    } catch (err) {
      sendJson(res, 400, { ok: false, message: err.message });
      return;
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/volunteers') {
    const limit = Number(url.searchParams.get('limit') || 100);
    const volunteers = listVolunteers(limit).map((v) => ({
      nodeId: v.nodeId,
      nearId: v.nearId,
      worldLevel: v.worldLevel,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }));

    sendJson(res, 200, { ok: true, count: volunteers.length, volunteers });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/sync-bundles') {
    try {
      const bundle = await parseJsonBody(req);
      const verification = verifyBundle(bundle);
      if (!verification.valid) {
        sendJson(res, 400, {
          ok: false,
          message: 'Bundle verification failed',
          errors: verification.errors,
        });
        return;
      }

      const continuity = checkNodeContinuity(bundle);
      if (!continuity.ok) {
        sendJson(res, 409, { ok: false, message: continuity.error });
        return;
      }

      const replay = checkReplay(bundle);
      if (!replay.ok) {
        sendJson(res, 409, { ok: false, message: replay.error });
        return;
      }

      const volunteer = getVolunteerByNodeId(bundle.nodeId);
      if (REQUIRE_SIGNATURE && !volunteer) {
        sendJson(res, 401, {
          ok: false,
          message: `Signature required: no volunteer registration for node ${bundle.nodeId}`,
        });
        return;
      }

      if (volunteer) {
        const sigCheck = verifyBundleSignature(bundle, volunteer);
        if (!sigCheck.ok) {
          sendJson(res, 401, { ok: false, message: sigCheck.error });
          return;
        }
      } else if (bundle.signature || bundle.signer) {
        sendJson(res, 401, {
          ok: false,
          message: 'Bundle includes signer fields but node is not registered',
        });
        return;
      }

      const record = await normalizeBundleForStorage(bundle);
      addBundle(record);
      const anchorJob = queueAnchor(createAnchorJobFromBundle(record));

      sendJson(res, 201, {
        ok: true,
        bundleId: record.id,
        headHash: record.headHash,
        eventCount: record.eventCount,
        receivedAt: record.receivedAt,
        publish: record.publish,
        anchorJobId: anchorJob.id,
      });
      return;
    } catch (err) {
      sendJson(res, 400, { ok: false, message: err.message });
      return;
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/sync-bundles') {
    const limit = Number(url.searchParams.get('limit') || 50);
    const bundles = listBundles(limit).map((b) => ({
      id: b.id,
      receivedAt: b.receivedAt,
      nodeId: b.nodeId,
      headHash: b.headHash,
      previousAnchor: b.previousAnchor,
      eventCount: b.eventCount,
      schema: b.schema,
      generatedAt: b.generatedAt,
    }));

    sendJson(res, 200, { ok: true, count: bundles.length, bundles });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/anchors') {
    const limit = Number(url.searchParams.get('limit') || 100);
    const status = url.searchParams.get('status') || undefined;
    const anchors = listAnchors({ limit, status });
    sendJson(res, 200, { ok: true, count: anchors.length, anchors });
    return;
  }

  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'anchors' && parts[3]) {
    const anchor = getAnchorById(parts[3]);
    if (!anchor) {
      sendJson(res, 404, { ok: false, message: 'Anchor job not found' });
      return;
    }
    sendJson(res, 200, { ok: true, anchor });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/anchor-receipts') {
    const limit = Number(url.searchParams.get('limit') || 100);
    const nodeId = url.searchParams.get('nodeId') || undefined;
    const bundleId = url.searchParams.get('bundleId') || undefined;
    const receipts = listAnchorReceipts({ limit, nodeId, bundleId });
    sendJson(res, 200, { ok: true, count: receipts.length, receipts });
    return;
  }

  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'anchor-receipts' && parts[3]) {
    const receipt = getAnchorReceiptById(parts[3]);
    if (!receipt) {
      sendJson(res, 404, { ok: false, message: 'Anchor receipt not found' });
      return;
    }
    sendJson(res, 200, { ok: true, receipt });
    return;
  }

  if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'persons' && parts[3] && parts[4] === 'status') {
    try {
      const body = await parseJsonBody(req);
      const requestedStatus = normalizeStatus(body.status);
      if (!requestedStatus) {
        sendJson(res, 400, { ok: false, message: 'Invalid status. Use Missing, Located, Displaced, Hospitalised, Deceased' });
        return;
      }

      const actorId = String(body.actorId || '').trim() || 'UNKNOWN-ACTOR';
      const actorRole = String(body.actorRole || '').trim() || 'rescuer';
      const note = String(body.note || '').trim();
      const incomingZone = String(body.lastSeenZone || '').trim().toUpperCase();

      const updated = updatePerson(parts[3], (person) => {
        if (!person.statusHistory) person.statusHistory = [];
        if (!person.deceasedConfirmations) person.deceasedConfirmations = [];

        if (incomingZone) person.lastSeenZone = incomingZone;

        if (requestedStatus !== 'Deceased') {
          person.status = requestedStatus;
          person.statusHistory.push({
            status: requestedStatus,
            byId: actorId,
            byRole: actorRole,
            note: note || `Status updated to ${requestedStatus}`,
            ts: new Date().toISOString(),
          });
          return person;
        }

        if (actorRole !== 'rescuer') {
          throw new Error('Deceased confirmation requires rescue worker role');
        }

        const exists = person.deceasedConfirmations.some((c) => c.workerId === actorId);
        if (exists) {
          throw new Error('This rescuer already submitted a deceased confirmation');
        }

        person.deceasedConfirmations.push({ workerId: actorId, ts: new Date().toISOString() });

        if (person.deceasedConfirmations.length >= 2) {
          person.status = 'Deceased';
          person.deceasedConfirmedAt = new Date().toISOString();
          person.statusHistory.push({
            status: 'Deceased',
            byId: actorId,
            byRole: actorRole,
            note: note || 'Second independent rescuer confirmation received',
            ts: new Date().toISOString(),
          });

          const comp = triggerCompensationIfEligible(person);
          if (!comp.triggered && comp.reason === 'missing_ipfs_anchor') {
            person.statusHistory.push({
              status: 'Deceased',
              byId: 'SYSTEM',
              byRole: 'system',
              note: 'Compensation pending: IPFS anchor not found',
              ts: new Date().toISOString(),
            });
          }
        } else {
          person.statusHistory.push({
            status: person.status,
            byId: actorId,
            byRole: actorRole,
            note: `Deceased confirmation ${person.deceasedConfirmations.length}/2 recorded`,
            ts: new Date().toISOString(),
          });
        }

        return person;
      });

      if (!updated) {
        sendJson(res, 404, { ok: false, message: 'Person record not found' });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        person: updated,
        deceasedConfirmations: updated.deceasedConfirmations?.length || 0,
        compensation: updated.compensation || null,
        public: formatPublicPerson(updated),
      });
      return;
    } catch (err) {
      sendJson(res, 400, { ok: false, message: err.message });
      return;
    }
  }

  if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'persons' && parts[3] && parts[4] === 'family' && parts[5] === 'request-otp') {
    try {
      const body = await parseJsonBody(req);
      const person = getPersonById(parts[3]);
      if (!person) {
        sendJson(res, 404, { ok: false, message: 'Person record not found' });
        return;
      }

      const phone = String(body.phone || '').trim();
      if (!phone) {
        sendJson(res, 400, { ok: false, message: 'phone is required' });
        return;
      }

      if (person.phone && person.phone !== phone) {
        sendJson(res, 401, { ok: false, message: 'Phone number does not match registered family contact' });
        return;
      }

      const existingOtp = getOtpRecord(person.id);
      if (existingOtp && Date.now() < Number(existingOtp.expiresAt || 0)) {
        const waitSeconds = Math.ceil((Number(existingOtp.expiresAt || 0) - Date.now()) / 1000);
        sendJson(res, 429, {
          ok: false,
          message: `OTP already issued. Try again in ${waitSeconds} seconds.`,
          waitSeconds,
        });
        return;
      }

      const otp = randomDigits(6);
      const expiresAt = Date.now() + 5 * 60 * 1000;
      setOtpRecord(person.id, {
        otp,
        phone,
        expiresAt,
        tries: 0,
        verified: false,
        createdAt: new Date().toISOString(),
      });

      addSms({
        id: `SMS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
        personId: person.id,
        phone,
        type: 'OTP',
        message: `DisasterNet OTP for ${person.name}: ${otp}`,
        sentAt: new Date().toISOString(),
      });

      sendJson(res, 200, {
        ok: true,
        message: 'OTP sent via SMS',
        expiresInSeconds: 300,
        remainingAttempts: 5,
        demoOtp: otp,
      });
      return;
    } catch (err) {
      sendJson(res, 400, { ok: false, message: err.message });
      return;
    }
  }

  if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'persons' && parts[3] && parts[4] === 'family' && parts[5] === 'verify-otp') {
    try {
      const body = await parseJsonBody(req);
      const person = getPersonById(parts[3]);
      if (!person) {
        sendJson(res, 404, { ok: false, message: 'Person record not found' });
        return;
      }

      const otp = String(body.otp || '').trim();
      const phone = String(body.phone || '').trim();
      const saved = getOtpRecord(person.id);

      if (!saved) {
        sendJson(res, 401, { ok: false, message: 'OTP not requested or expired' });
        return;
      }

      if (Date.now() > Number(saved.expiresAt || 0)) {
        clearOtpRecord(person.id);
        sendJson(res, 401, { ok: false, message: 'OTP expired. Request a new OTP.' });
        return;
      }

      if (saved.phone !== phone) {
        sendJson(res, 401, { ok: false, message: 'Phone mismatch for OTP verification' });
        return;
      }

      if (saved.tries >= 5) {
        clearOtpRecord(person.id);
        sendJson(res, 429, {
          ok: false,
          message: 'Too many failed attempts. Request a new OTP.',
          remainingAttempts: 0,
        });
        return;
      }

      if (saved.otp !== otp) {
        const nextTries = Number(saved.tries || 0) + 1;
        setOtpRecord(person.id, { ...saved, tries: nextTries });
        sendJson(res, 401, {
          ok: false,
          message: 'Invalid OTP',
          remainingAttempts: Math.max(0, 5 - nextTries),
        });
        return;
      }

      clearOtpRecord(person.id);

      const updated = updatePerson(person.id, (p) => {
        p.claimVerifiedAt = new Date().toISOString();
        p.statusHistory = p.statusHistory || [];
        p.statusHistory.push({
          status: p.status,
          byId: 'FAMILY-OTP',
          byRole: 'family',
          note: 'Family claim verified by OTP',
          ts: new Date().toISOString(),
        });
        return p;
      }) || getPersonById(person.id);

      sendJson(res, 200, {
        ok: true,
        person: {
          id: updated.id,
          name: updated.name,
          phone: updated.phone,
          status: updated.status,
          lastSeenZone: updated.lastSeenZone,
          note: updated.note,
          updatedAt: updated.updatedAt,
          deceasedConfirmations: updated.deceasedConfirmations || [],
          compensation: updated.compensation || null,
          anchorCid: updated.anchorCid || null,
        },
      });
      return;
    } catch (err) {
      sendJson(res, 400, { ok: false, message: err.message });
      return;
    }
  }

  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'persons' && parts[3] && parts[4] === 'public') {
    const person = getPersonById(parts[3]);
    if (!person) {
      sendJson(res, 404, { ok: false, message: 'Person record not found' });
      return;
    }
    sendJson(res, 200, { ok: true, person: formatPublicPerson(person) });
    return;
  }

  if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'anchors' && parts[3] && parts[4] === 'mark') {
    try {
      const body = await parseJsonBody(req);
      const nextStatus = body.status;
      const allowed = new Set(['queued', 'submitted', 'anchored', 'failed']);
      if (!allowed.has(nextStatus)) {
        sendJson(res, 400, { ok: false, message: 'Invalid status value' });
        return;
      }

      const updated = updateAnchor(parts[3], {
        status: nextStatus,
        txHash: body.txHash || null,
        error: body.error || null,
      });
      if (!updated) {
        sendJson(res, 404, { ok: false, message: 'Anchor job not found' });
        return;
      }

      sendJson(res, 200, { ok: true, anchor: updated });
      return;
    } catch (err) {
      sendJson(res, 400, { ok: false, message: err.message });
      return;
    }
  }

  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'sync-bundles' && parts[3]) {
    const record = getBundleById(parts[3]);
    if (!record) {
      sendJson(res, 404, { ok: false, message: 'Bundle not found' });
      return;
    }

    const receipts = listAnchorReceipts({ limit: 20, bundleId: record.id });
    sendJson(res, 200, { ok: true, bundle: record, anchorReceipts: receipts });
    return;
  }

  sendJson(res, 404, { ok: false, message: 'Not found' });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    sendJson(res, 500, { ok: false, message: 'Internal error', error: err.message });
  });
});

server.listen(PORT, () => {
  console.log(`[DisasterNet Sync Receiver] running on http://localhost:${PORT}`);
});

setInterval(runAnchorWorkerTick, Math.max(1500, ANCHOR_WORKER_INTERVAL_MS));
runAnchorWorkerTick();
