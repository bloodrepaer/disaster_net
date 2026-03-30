/*
  Phase 3 interaction stub.
  Usage:
    node contracts/ethereum/scripts/mint_hypercert_mock.js --zone C3 --action "Delivered oxygen" --cid bafy...
*/

function getArg(name, fallback = '') {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

async function main() {
  const zone = getArg('zone', 'A2');
  const action = getArg('action', 'Rescue action placeholder');
  const ipfsCid = getArg('cid', 'bafy-placeholder');
  const volunteer = getArg('volunteer', '0x0000000000000000000000000000000000000001');

  const payload = {
    network: process.env.ETH_NETWORK || 'sepolia',
    rpcUrl: process.env.ETH_RPC_URL || 'https://example.invalid/rpc',
    contract: process.env.HYPERCERT_ADDRESS || '0xHYPERCERT_PLACEHOLDER',
    method: 'mintContribution',
    args: {
      volunteer,
      zone,
      action,
      nearId: getArg('nearId', 'volunteer.near'),
      ipfsCid,
    },
    mode: 'dry-run-script',
  };

  console.log('[EthereumMock] Prepared hypercert mint payload');
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
