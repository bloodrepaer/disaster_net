const crypto = require('node:crypto');

function toPseudoCid(input) {
  const digest = crypto.createHash('sha256').update(input).digest('hex');
  // Deterministic CID-like identifier for local MVP until Storacha integration is wired.
  return `bafy${digest.slice(0, 44)}`;
}

function publishBundle(bundle) {
  const payload = JSON.stringify(bundle);
  const cid = toPseudoCid(payload);

  return {
    provider: 'local-publisher',
    mode: 'deterministic-mock',
    cid,
    pinned: false,
    recordedAt: new Date().toISOString(),
  };
}

module.exports = {
  publishBundle,
};
