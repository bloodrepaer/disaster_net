/**
 * Ronin Contract Stub (Phase 4)
 * Simulates on-chain disaster compensation contract
 */

class RoninContractStub {
  constructor(chainId = 'ronin-mainnet') {
    this.chainId = chainId;
    this.compensations = new Map(); // personId => [...confirms]
    this.nextTxNum = 2000;
    this.nextBlockNum = 20000;
  }

  /**
   * INSTR_SUBMIT_DECEASED: Submit person deceased status for compensation
   */
  async submitDeceased(params) {
    const key = params.personId;
    if (!this.compensations.has(key)) {
      this.compensations.set(key, []);
    }

    const confirmation = {
      personId: params.personId,
      txHash: '0x' + (this.nextTxNum++).toString(16),
      blockNumber: this.nextBlockNum++,
      actorId: params.actorId,
      actorRole: params.actorRole,
      confirmedAt: Date.now(),
      amount: params.amount || 0, // mocked
      status: 'pending_claim',
    };

    this.compensations.get(key).push(confirmation);

    return {
      txHash: confirmation.txHash,
      blockNumber: confirmation.blockNumber,
      status: 'confirmed',
    };
  }

  /**
   * QUERY_GET_COMPENSATIONS: Query all confirmations for person
   */
  async getCompensations(personId) {
    return this.compensations.get(personId) || [];
  }

  /**
   * Is deceased status consensus (2+ confirmations)? 
   */
  async isConsensusDeceased(personId) {
    const confirms = await this.getCompensations(personId);
    return confirms.length >= 2;
  }

  /**
   * INSTR_UNLOCK_CLAIM: Unlock family claim tokens
   */
  async unlockClaim(params) {
    const consensus = await this.isConsensusDeceased(params.personId);
    if (!consensus) {
      throw new Error(`Person ${params.personId} does not have consensus deceased status`);
    }

    return {
      txHash: '0x' + (this.nextTxNum++).toString(16),
      blockNumber: this.nextBlockNum++,
      claimAmount: params.claimAmount || 1000,
      unlockedAt: Date.now(),
      status: 'unlocked',
    };
  }
}

module.exports = { RoninContractStub };
