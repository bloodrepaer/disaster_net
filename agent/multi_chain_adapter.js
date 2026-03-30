/**
 * Multi-Chain Adapter (Phase 4)
 * Coordinates contract calls across Starknet (anchor) and Ronin (compensation)
 */

const { ConfirmationPollingEngine } = require('./confirmation_polling_engine');

class MultiChainAdapter {
  constructor(starknetStub, roninStub) {
    this.starknet = starknetStub;
    this.ronin = roninStub;
    this.poller = new ConfirmationPollingEngine();
  }

  /**
   * ANCHOR_AND_COMPENSATE: Full flow
   * 1. Verify volunteer on Starknet
   * 2. Anchor bundle to Starknet
   * 3. Wait for Starknet confirmation
   * 4. Submit deceased to Ronin
   * 5. Poll Ronin until confirmed
   */
  async anchorAndCompensate(params) {
    const {
      nodeId,
      walletId,
      worldLevel,
      publicKeyPem,
      bundleHash,
      eventDataHash,
      personId,
      actorId,
      actorRole,
    } = params;

    console.log('[MultiChain] Starting anchor and compensate flow');

    // Step 1: Verify volunteer on Starknet
    const volReg = await this.starknet.registerVolunteer({
      walletId,
      nodeId,
      level: worldLevel,
      publicKeyPem,
    });
    console.log(`[MultiChain] Volunteer registered: ${volReg.txHash}`);

    // Step 2: Anchor bundle to Starknet
    const starkAnchor = await this.starknet.anchorBundle({
      nodeId,
      headHash: bundleHash,
      signer: walletId,
      eventDataHash,
    });
    console.log(`[MultiChain] Bundle anchored to Starknet: ${starkAnchor.txHash}`);

    // Step 3: Poll Starknet until confirmed
    const starkConfirm = await this.poller.poll(
      starkAnchor,
      async (receipt) => {
        const anchor = await this.starknet.getAnchor(bundleHash, nodeId);
        return {
          status: anchor ? 'confirmed' : 'pending',
          blocksDeep: anchor ? (Date.now() - anchor.anchoredAt) / 12000 : 0,
        };
      },
      'StarknetAnchor'
    );

    if (!starkConfirm.confirmed) {
      throw new Error(`Starknet anchor failed after ${starkConfirm.attempts} attempts`);
    }
    console.log(`[MultiChain] Starknet anchor confirmed: ${starkConfirm.attempts} attempts`);

    // Step 4: Submit deceased to Ronin
    const roninSubmit = await this.ronin.submitDeceased({
      personId,
      actorId,
      actorRole,
      amount: 0,
    });
    console.log(`[MultiChain] Deceased submitted to Ronin: ${roninSubmit.txHash}`);

    // Step 5: Poll Ronin until confirmed
    const roninConfirm = await this.poller.poll(
      roninSubmit,
      async (receipt) => {
        const compensations = await this.ronin.getCompensations(personId);
        return {
          status: compensations.length > 0 ? 'confirmed' : 'pending',
          blocksDeep: compensations.length > 0 ? 3 : 0,
        };
      },
      'RoninConfirmation'
    );

    if (!roninConfirm.confirmed) {
      throw new Error(`Ronin confirmation failed after ${roninConfirm.attempts} attempts`);
    }
    console.log(`[MultiChain] Ronin confirmation complete: ${roninConfirm.attempts} attempts`);

    return {
      success: true,
      starknetAnchor: starkAnchor.txHash,
      roninSubmit: roninSubmit.txHash,
      confirmationTime: starkConfirm.tookMs + roninConfirm.tookMs,
    };
  }

  /**
   * Check if person can unlock claim on Ronin
   */
  async checkClaimReady(personId) {
    const consensus = await this.ronin.isConsensusDeceased(personId);
    return { personId, claimReady: consensus };
  }

  /**
   * Unlock family claim on Ronin
   */
  async unlockFamilyClaim(personId, claimAmount) {
    const ready = await this.checkClaimReady(personId);
    if (!ready.claimReady) {
      throw new Error(`Person ${personId} not ready for claim unlock`);
    }

    return this.ronin.unlockClaim({
      personId,
      claimAmount,
    });
  }

  onPollingUpdate(callback) {
    this.poller.onUpdate(callback);
  }
}

module.exports = { MultiChainAdapter };
