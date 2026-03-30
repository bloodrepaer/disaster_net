const crypto = require('node:crypto');

const PUBLISH_PROVIDER = String(process.env.PUBLISH_PROVIDER || 'local').toLowerCase();
const PUBLISH_STRICT = String(process.env.PUBLISH_STRICT || 'false').toLowerCase() === 'true';
const STORACHA_ENDPOINT = process.env.STORACHA_ENDPOINT || 'https://api.storacha.network/v1/pins';
const STORACHA_API_TOKEN = process.env.STORACHA_API_TOKEN || '';
const PUBLISH_TIMEOUT_MS = Number(process.env.PUBLISH_TIMEOUT_MS || 8000);

function toPseudoCid(input) {
  const digest = crypto.createHash('sha256').update(input).digest('hex');
  // Deterministic CID-like identifier for local MVP until Storacha integration is wired.
  return `bafy${digest.slice(0, 44)}`;
}

function toLocalPublish(bundle, reason) {
  const payload = JSON.stringify(bundle);
  const cid = toPseudoCid(payload);

  return {
    provider: 'local-publisher',
    mode: 'deterministic-mock',
    cid,
    pinned: false,
    recordedAt: new Date().toISOString(),
    ...(reason ? { fallbackReason: reason } : {}),
  };
}

function extractCid(responseJson, fallbackCid) {
  if (!responseJson || typeof responseJson !== 'object') return fallbackCid;
  return (
    responseJson.cid ||
    responseJson.CID ||
    responseJson.result?.cid ||
    responseJson.value?.cid ||
    fallbackCid
  );
}

async function publishToStoracha(bundle) {
  if (!STORACHA_API_TOKEN) {
    throw new Error('STORACHA_API_TOKEN is not configured');
  }

  const payload = JSON.stringify(bundle);
  const fallbackCid = toPseudoCid(payload);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, PUBLISH_TIMEOUT_MS));

  try {
    const response = await fetch(STORACHA_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${STORACHA_API_TOKEN}`,
      },
      body: JSON.stringify({
        schema: bundle.schema,
        nodeId: bundle.nodeId,
        headHash: bundle.headHash,
        previousAnchor: bundle.previousAnchor,
        eventCount: bundle.eventCount,
        generatedAt: bundle.generatedAt,
        payload,
      }),
      signal: controller.signal,
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const reason = data?.error || data?.message || `Storacha publish failed with HTTP ${response.status}`;
      throw new Error(reason);
    }

    return {
      provider: 'storacha',
      mode: 'live-http',
      endpoint: STORACHA_ENDPOINT,
      cid: extractCid(data, fallbackCid),
      pinned: data?.pinned !== false,
      recordedAt: new Date().toISOString(),
      responseRef: data?.id || data?.requestId || null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function publishBundle(bundle) {
  if (PUBLISH_PROVIDER !== 'storacha') {
    return toLocalPublish(bundle);
  }

  try {
    return await publishToStoracha(bundle);
  } catch (err) {
    if (PUBLISH_STRICT) {
      throw err;
    }
    return toLocalPublish(bundle, `storacha_fallback:${err.message}`);
  }
}

module.exports = {
  publishBundle,
  PUBLISH_PROVIDER,
  PUBLISH_STRICT,
  STORACHA_ENDPOINT,
};
