const http = require('node:http');
const { URL } = require('node:url');
const crypto = require('node:crypto');
const { verifyBundle, getBundleSigningPayload } = require('./verifier');
const { publishBundle } = require('./publisher');
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
} = require('./storage');

const PORT = Number(process.env.PORT || 8787);
const REQUIRE_SIGNATURE = String(process.env.REQUIRE_SIGNATURE || 'false').toLowerCase() === 'true';

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

function normalizeBundleForStorage(bundle) {
  const now = new Date().toISOString();
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
    publish: publishBundle(bundle),
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
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

      const record = normalizeBundleForStorage(bundle);
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

    sendJson(res, 200, { ok: true, bundle: record });
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
