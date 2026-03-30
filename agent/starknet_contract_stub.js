/**
 * Starknet Contract Stub (Phase 4)
 * Simulates on-chain disaster relief registry contract
 */

class StarknetContractStub {
  constructor(chainId = 'starknet-mainnet') {
    this.chainId = chainId;
    this.registrations = new Map(); // walletId => { level, verified, ...}
    this.anchors = new Map();        // (headHash, nodeId) => { txHash, blockNum, ... }
    this.nextTxNum = 1000;
    this.nextBlockNum = 10000;
  }

  /**
   * INSTR_VERIFY_WORLD_LEVEL: Register volunteer with world passport
   */
  async registerVolunteer(params) {
    const key = `${params.walletId}@${params.nodeId}`;
    this.registrations.set(key, {
      walletId: params.walletId,
      nodeId: params.nodeId,
      level: params.level,
      publicKeyHash: this.hashKey(params.publicKeyPem),
      verified: true,
      registeredAt: Date.now(),
    });
    return {
      txHash: '0x' + (this.nextTxNum++).toString(16),
      event: 'VolunteerRegistered',
      data: { walletId: params.walletId, level: params.level },
    };
  }

  /**
   * INSTR_ANCHOR_BUNDLE: Anchor bundle hash to chain
   */
  async anchorBundle(params) {
    const vol = this.registrations.get(`${params.signer}@${params.nodeId}`);
    if (!vol || !vol.verified) {
      throw new Error(`Signer ${params.signer} not registered or verified on chain`);
    }

    const anchorKey = `${params.headHash}:${params.nodeId}`;
    const receipt = {
      nodeId: params.nodeId,
      headHash: params.headHash,
      txHash: '0x' + (this.nextTxNum++).toString(16),
      blockNumber: this.nextBlockNum++,
      eventIndex: 0,
      anchoredAt: Date.now(),
      signer: params.signer,
      dataHash: params.eventDataHash,
    };

    this.anchors.set(anchorKey, receipt);
    return receipt;
  }

  /**
   * QUERY_GET_ANCHOR: Query anchored bundle by hash
   */
  async getAnchor(headHash, nodeId) {
    const key = `${headHash}:${nodeId}`;
    return this.anchors.get(key) || null;
  }

  /**
   * QUERY_GET_VOLUNTEER: Query volunteer registration
   */
  async getVolunteer(walletId, nodeId) {
    const key = `${walletId}@${nodeId}`;
    return this.registrations.get(key) || null;
  }

  hashKey(pem) {
    const hash = require('crypto').createHash('sha256');
    hash.update(pem);
    return hash.digest('hex').slice(0, 32);
  }
}

module.exports = { StarknetContractStub };
