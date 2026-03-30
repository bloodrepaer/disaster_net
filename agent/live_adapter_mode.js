/**
 * Live Adapter Demonstrator (Phase 4)
 * Shows contract integration + confirmation polling in real-time mode
 */

const { StarknetContractStub } = require('./starknet_contract_stub');
const { RoninContractStub } = require('./ronin_contract_stub');
const { MultiChainAdapter } = require('./multi_chain_adapter');

class LiveAdapterMode {
  constructor() {
    this.starknet = new StarknetContractStub('starknet-mainnet');
    this.ronin = new RoninContractStub('ronin-mainnet');
    this.adapter = new MultiChainAdapter(this.starknet, this.ronin);
    this.setupLogging();
  }

  setupLogging() {
    this.adapter.onPollingUpdate((update) => {
      console.log(
        `  [Poll] ${update.label}: attempt=${update.attempt}, ` +
        `status=${update.status}, blocksDeep=${update.blocksDeep}`
      );
    });
  }

  /**
   * Simulate disaster relief workflow end-to-end
   */
  async runEndToEndDemo() {
    console.log('=== Phase 4 Live Adapter Mode: End-to-End Workflow ===\n');

    const params = {
      nodeId: 'LIVE-DEMO-NODE-1',
      walletId: 'live_volunteer.starknet',
      worldLevel: 'ORB-VERIFIED',
      publicKeyPem: '-----BEGIN PUBLIC KEY-----\nDEMO_KEY_DATA\n-----END PUBLIC KEY-----',
      bundleHash: '0xdeadbeef123456789',
      eventDataHash: '0xcafebabe987654321',
      personId: 'LIVE-PERSON-123',
      actorId: 'LIVE-RESCUER-001',
      actorRole: 'rescuer',
    };

    console.log('[Workflow] Starting relief contribution flow...\n');

    try {
      const result = await this.adapter.anchorAndCompensate(params);
      console.log('\n[Workflow] ✓ Flow completed successfully');
      console.log(`  Starknet Anchor TX: ${result.starknetAnchor}`);
      console.log(`  Ronin Submit TX:    ${result.roninSubmit}`);
      console.log(`  Total time:         ${result.confirmationTime}ms\n`);

      // Check compensation status
      const compensations = await this.ronin.getCompensations(params.personId);
      console.log(`[Workflow] Ronin confirms ${compensations.length} rescuer(s)\n`);

      return result;
    } catch (err) {
      console.error('[Workflow] ✗ Flow failed:', err.message);
      throw err;
    }
  }

  /**
   * Simulate multiple confirmations -> consensus -> claim unlock
   */
  async runClaimUnlockDemo() {
    console.log('=== Phase 4 Live Adapter Mode: Claim Unlock Workflow ===\n');

    const personId = 'LIVE-CLAIM-PERSON';

    console.log('[ClaimFlow] Submitting first rescuer confirmation...');
    await this.ronin.submitDeceased({
      personId,
      actorId: 'RESCUER-ALPHA',
      actorRole: 'rescuer',
    });

    const status1 = await this.adapter.checkClaimReady(personId);
    console.log(`[ClaimFlow] After 1st confirm: claimReady = ${status1.claimReady}`);

    console.log('\n[ClaimFlow] Submitting second rescuer confirmation...');
    await this.ronin.submitDeceased({
      personId,
      actorId: 'RESCUER-BETA',
      actorRole: 'rescuer',
    });

    const status2 = await this.adapter.checkClaimReady(personId);
    console.log(`[ClaimFlow] After 2nd confirm: claimReady = ${status2.claimReady}`);

    if (status2.claimReady) {
      console.log('\n[ClaimFlow] Consensus reached! Unlocking family claim...');
      const claimTx = await this.adapter.unlockFamilyClaim(personId, 1000);
      console.log(`[ClaimFlow] ✓ Claim unlocked: ${claimTx.txHash}`);
      console.log(`[ClaimFlow]   Block: ${claimTx.blockNumber}`);
      console.log(`[ClaimFlow]   Amount: ${claimTx.claimAmount}`);
      console.log(`[ClaimFlow]   Status: ${claimTx.status}\n`);
    }
  }

  /**
   * Simulate multi-node anchoring (distributed resilience)
   */
  async runMultiNodeAnchoringDemo() {
    console.log('=== Phase 4 Live Adapter Mode: Multi-Node Anchoring ===\n');

    const nodes = ['LIVE-NODE-1', 'LIVE-NODE-2', 'LIVE-NODE-3'];
    const sharedBundleHash = '0xmultinode' + Date.now().toString(16);

    console.log(`[MultiNode] Anchoring bundle ${sharedBundleHash.slice(0, 16)}...to ${nodes.length} nodes\n`);

    const results = [];
    for (const nodeId of nodes) {
      try {
        const result = await this.adapter.anchorAndCompensate({
          nodeId,
          walletId: `volunteer_${nodeId.toLowerCase()}.starknet`,
          worldLevel: 'ORB-VERIFIED',
          publicKeyPem: '-----BEGIN PUBLIC KEY-----\nMULTINODE_KEY\n-----END PUBLIC KEY-----',
          bundleHash: sharedBundleHash,
          eventDataHash: '0xmultinode_data_hash',
          personId: `PERSON-${nodeId}`,
          actorId: `RESCUER-${nodeId}`,
          actorRole: 'rescuer',
        });
        results.push({ nodeId, success: true, ...result });
        console.log(`[MultiNode] ✓ Node ${nodeId} anchored successfully\n`);
      } catch (err) {
        results.push({ nodeId, success: false, error: err.message });
        console.log(`[MultiNode] ✗ Node ${nodeId} failed: ${err.message}\n`);
      }
    }

    console.log('[MultiNode] Results summary:');
    results.forEach(r => {
      const status = r.success ? '✓' : '✗';
      console.log(`  ${status} ${r.nodeId}`);
    });
  }
}

// Run if invoked directly
if (require.main === module) {
  (async () => {
    const live = new LiveAdapterMode();

    try {
      await live.runEndToEndDemo();
      await live.runClaimUnlockDemo();
      await live.runMultiNodeAnchoringDemo();

      console.log('\n=== All Live Demos Complete ===\n');
      process.exit(0);
    } catch (err) {
      console.error('Demo failed:', err);
      process.exit(1);
    }
  })();
}

module.exports = { LiveAdapterMode };
