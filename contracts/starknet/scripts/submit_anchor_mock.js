/*
  Phase 3 interaction stub.
  Usage:
    node contracts/starknet/scripts/submit_anchor_mock.js --headHash 0xabc --cid bafy... --bundleId BND-...
*/

function getArg(name, fallback = '') {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

async function main() {
  const chain = process.env.STARKNET_NETWORK || 'sepolia';
  const endpoint = process.env.STARKNET_RPC_URL || 'https://example.invalid/rpc';
  const headHash = getArg('headHash', '0xHEAD_HASH_PLACEHOLDER');
  const cid = getArg('cid', 'bafy-placeholder');
  const bundleId = getArg('bundleId', 'BND-PLACEHOLDER');

  const payload = {
    chain,
    endpoint,
    contract: process.env.RELIEF_FUND_ADDRESS || '0xRELIEF_FUND_PLACEHOLDER',
    method: 'anchor_bundle_hash',
    args: { bundleId, headHash, cid },
    mode: 'dry-run-script',
  };

  console.log('[StarknetMock] Prepared anchor transaction payload');
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
