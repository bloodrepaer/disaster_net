/**
 * Confirmation Polling Engine (Phase 4)
 * Polls blockchain receipts until confirmed, with exponential backoff
 */

class ConfirmationPollingEngine {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 36; // ~3 minutes with exp backoff
    this.initialDelayMs = options.initialDelayMs || 1000;
    this.maxDelayMs = options.maxDelayMs || 30000;
    this.confirmationThreshold = options.confirmationThreshold || 3; // blocks
    this.pollCallbacks = [];
    this.running = false;
  }

  /**
   * Poll a receipt until confirmed
   * @param {object} receipt - receipt from contract stub
   * @param {function} checkFn - async function to check receipt status
   * @param {string} label - for logging
   * @returns {object} { confirmed, attempts, finalStatus, error }
   */
  async poll(receipt, checkFn, label = 'Receipt') {
    let attempts = 0;
    let delay = this.initialDelayMs;
    let confirmed = false;
    let finalStatus = null;
    let error = null;

    while (attempts < this.maxAttempts && !confirmed) {
      try {
        attempts++;
        const status = await checkFn(receipt);
        this.notify({
          label,
          attempt: attempts,
          status: status.status,
          blocksDeep: status.blocksDeep || 0,
        });

        if (status.blocksDeep >= this.confirmationThreshold) {
          confirmed = true;
          finalStatus = status;
        } else {
          // Exponential backoff
          await this.delay(delay);
          delay = Math.min(delay * 1.5, this.maxDelayMs);
        }
      } catch (err) {
        error = err;
        await this.delay(delay);
        delay = Math.min(delay * 1.5, this.maxDelayMs);
      }
    }

    return {
      label,
      confirmed,
      attempts,
      finalStatus,
      error,
      tookMs: attempts * this.initialDelayMs,
    };
  }

  /**
   * Batch poll multiple receipts
   */
  async pollMultiple(receipts, checkFn, label = 'Batch') {
    const results = await Promise.all(
      receipts.map((r, i) => this.poll(r, checkFn, `${label}-${i}`))
    );
    return {
      label,
      totalReceipts: receipts.length,
      confirmedCount: results.filter(r => r.confirmed).length,
      results,
      allConfirmed: results.every(r => r.confirmed),
    };
  }

  /**
   * Register callback for polling updates
   */
  onUpdate(callback) {
    this.pollCallbacks.push(callback);
  }

  notify(update) {
    this.pollCallbacks.forEach(cb => cb(update));
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { ConfirmationPollingEngine };
