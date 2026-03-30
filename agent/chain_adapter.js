const crypto = require('node:crypto');

const DRY_RUN = String(process.env.ANCHOR_DRY_RUN ?? 'true').toLowerCase() !== 'false';
const DEFAULT_CHAIN = process.env.ANCHOR_CHAIN || 'starknet-sepolia';
const CHAIN_ENDPOINT = process.env.ANCHOR_CHAIN_ENDPOINT || 'https://example.invalid/rpc';
const CHAIN_RPC_METHOD = process.env.ANCHOR_RPC_METHOD || 'disasternet_submitAnchor';
const CHAIN_TIMEOUT_MS = Number(process.env.ANCHOR_TIMEOUT_MS || 10000);
const SIM_FAIL_RATE = Number(process.env.ANCHOR_SIM_FAIL_RATE || 0);
const STARKNET_RELIEF_FUND = process.env.STARKNET_RELIEF_FUND || '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const ETHEREUM_HYPERCERT = process.env.ETHEREUM_HYPERCERT || '0x0123456789abcdef0123456789abcdef01234567';
const ETHEREUM_TX_FROM = process.env.ETHEREUM_TX_FROM || '0xaabbccddeeff00112233445566778899aabbccdd';

function makeTxHash() {
  return `0x${crypto.randomBytes(32).toString('hex')}`;
}

function withSimFailure() {
  return SIM_FAIL_RATE > 0 && Math.random() < SIM_FAIL_RATE;
}

function extractRpcTxHash(result) {
  if (!result) return null;
  if (typeof result === 'string' && result.startsWith('0x')) return result;
  if (typeof result.txHash === 'string') return result.txHash;
  if (typeof result.transaction_hash === 'string') return result.transaction_hash;
  if (typeof result.hash === 'string') return result.hash;
  return null;
}

function buildStarknetPayload(payload) {
  return {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'starknet_addInvokeTransaction',
    params: [{
      type: 'INVOKE',
      sender_address: ETHEREUM_TX_FROM,
      calldata: [
        STARKNET_RELIEF_FUND,
        '0x036c6bb5ef0db1c6f45a7b3e60db9b37e9dfa87e94ab00ed8a68bd3daf6b5cb5',
        '5',
        payload.headHash || '0x0',
        payload.cid || '0x0',
        payload.nodeId || '0x0',
        payload.bundleId || '0x0',
        payload.previousAnchor || '0x0'
      ],
      max_fee: '0x1dcd6500'
    }]
  };
}

function buildEthereumPayload(payload) {
  return {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'eth_sendTransaction',
    params: [{
      from: ETHEREUM_TX_FROM,
      to: ETHEREUM_HYPERCERT,
      data: `0xb3a34c2b${[
        payload.headHash || '0x' + '00'.repeat(32),
        payload.nodeId || '0x' + '00'.repeat(32),
        payload.bundleId || '0x' + '00'.repeat(32)
      ].map(p => (typeof p === 'string' ? p.slice(2) : p.toString(16).padStart(64, '0'))).join('')}`,
      gas: '0x5b8d80',
      gasPrice: '0x1dcd6500'
    }]
  };
}

async function submitLiveRpc(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, CHAIN_TIMEOUT_MS));
  try {
    let rpcPayload;
    if (DEFAULT_CHAIN.startsWith('starknet')) {
      rpcPayload = buildStarknetPayload(payload);
    } else if (DEFAULT_CHAIN.startsWith('ethereum') || DEFAULT_CHAIN === 'mainnet' || DEFAULT_CHAIN === 'sepolia') {
      rpcPayload = buildEthereumPayload(payload);
    } else {
      rpcPayload = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: CHAIN_RPC_METHOD,
        params: [payload],
      };
    }

    const response = await fetch(CHAIN_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(rpcPayload),
      signal: controller.signal,
    });

    const text = await response.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        error: parsed?.error?.message || parsed?.message || `RPC submit failed with HTTP ${response.status}`,
        chain: DEFAULT_CHAIN,
        endpoint: CHAIN_ENDPOINT,
        mode: 'live-rpc',
      };
    }

    if (parsed?.error) {
      return {
        ok: false,
        error: parsed.error.message || 'RPC error returned by endpoint',
        chain: DEFAULT_CHAIN,
        endpoint: CHAIN_ENDPOINT,
        mode: 'live-rpc',
      };
    }

    const txHash = extractRpcTxHash(parsed?.result);
    if (!txHash) {
      return {
        ok: false,
        error: 'RPC response did not include a tx hash',
        chain: DEFAULT_CHAIN,
        endpoint: CHAIN_ENDPOINT,
        mode: 'live-rpc',
      };
    }

    return {
      ok: true,
      txHash,
      chain: DEFAULT_CHAIN,
      endpoint: CHAIN_ENDPOINT,
      mode: 'live-rpc',
      payloadSummary: {
        headHash: payload.headHash,
        cid: payload.cid,
        bundleId: payload.bundleId,
        nodeId: payload.nodeId,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: `Live RPC submission failed: ${err.message}`,
      chain: DEFAULT_CHAIN,
      endpoint: CHAIN_ENDPOINT,
      mode: 'live-rpc',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function submitAnchor(payload) {
  // Simulate chain submit latency to mimic an RPC call.
  await new Promise((resolve) => setTimeout(resolve, 250));

  if (withSimFailure()) {
    return {
      ok: false,
      error: 'Simulated intermittent chain connectivity failure',
      chain: DEFAULT_CHAIN,
      endpoint: CHAIN_ENDPOINT,
      mode: DRY_RUN ? 'dry-run' : 'live',
    };
  }

  if (!DRY_RUN) {
    return submitLiveRpc(payload);
  }

  return {
    ok: true,
    txHash: makeTxHash(),
    chain: DEFAULT_CHAIN,
    endpoint: CHAIN_ENDPOINT,
    mode: DRY_RUN ? 'dry-run' : 'live',
    payloadSummary: {
      headHash: payload.headHash,
      cid: payload.cid,
      bundleId: payload.bundleId,
      nodeId: payload.nodeId,
    },
  };
}

module.exports = {
  submitAnchor,
  DRY_RUN,
  DEFAULT_CHAIN,
  CHAIN_ENDPOINT,
  CHAIN_RPC_METHOD,
  CHAIN_TIMEOUT_MS,
  SIM_FAIL_RATE,
  buildStarknetPayload,
  buildEthereumPayload,
  STARKNET_RELIEF_FUND,
  ETHEREUM_HYPERCERT,
};
