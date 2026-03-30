/**
 * Phase 4 API Integration Wiring
 * Shows how contract stubs and polling integrate with existing Phase 1-2 API
 */

// This file demonstrates how to integrate Phase 4 components into the existing API
// It is NOT meant to be executed directly, but shows the integration pattern

const { StarknetContractStub } = require('./starknet_contract_stub');
const { RoninContractStub } = require('./ronin_contract_stub');
const { MultiChainAdapter } = require('./multi_chain_adapter');
const { ConfirmationPollingEngine } = require('./confirmation_polling_engine');

// ============================================================================
// INTEGRATION POINT 1: Initialize contract stubs in server startup
// ============================================================================

function initializePhase4Contracts() {
  const starknet = new StarknetContractStub(process.env.STARKNET_CHAIN || 'starknet-mainnet');
  const ronin = new RoninContractStub(process.env.RONIN_CHAIN || 'ronin-mainnet');
  const adapter = new MultiChainAdapter(starknet, ronin);

  return { starknet, ronin, adapter };
}

// ============================================================================
// INTEGRATION POINT 2: POST /api/v1/volunteers/register
// ============================================================================

async function handleVolunteerRegistration(req, res, contracts) {
  const { nodeId, nearId, worldLevel, publicKeyPem } = req.body;

  // Phase 1-2: Store in DB
  const volunteer = await db.volunteers.create({
    nodeId,
    nearId,
    worldLevel,
    publicKeyPem,
    registeredAt: new Date(),
  });

  // Phase 4: Register on Starknet
  try {
    const starknetReg = await contracts.starknet.registerVolunteer({
      walletId: nearId,
      nodeId,
      level: worldLevel,
      publicKeyPem,
    });

    // Store receipt
    await redis.set(
      `volunteer:${nodeId}:${nearId}:starknet`,
      JSON.stringify({
        txHash: starknetReg.txHash,
        registeredAt: Date.now(),
      })
    );

    res.status(201).json({
      volunteer,
      starknetRegistration: {
        txHash: starknetReg.txHash,
        event: starknetReg.event,
      },
    });
  } catch (err) {
    console.error('[Phase4] Starknet registration failed:', err.message);
    // Fall back to Phase 1-2 only
    res.status(201).json({ volunteer, starknetError: err.message });
  }
}

// ============================================================================
// INTEGRATION POINT 3: POST /api/v1/sync-bundles (trigger anchor job)
// ============================================================================

async function createAnchorJobAndTriggerPhase4(bundleId, nodeId, headHash, contracts) {
  // Phase 1-2: Create anchor job
  const anchorJob = await db.anchorJobs.create({
    bundleId,
    nodeId,
    status: 'queued',
    attempt: 0,
    createdAt: new Date(),
  });

  // Phase 4: Async background job to anchor on Starknet
  setImmediate(async () => {
    try {
      const volunteer = await db.volunteers.findOne({ nodeId });
      if (!volunteer) throw new Error(`Volunteer not found for node ${nodeId}`);

      const receipt = await contracts.starknet.anchorBundle({
        nodeId,
        headHash,
        signer: volunteer.nearId,
        eventDataHash: 'hash_of_bundle_events', // computed from bundle
      });

      // Phase 4: Start confirmation polling
      const poller = new ConfirmationPollingEngine();
      poller.onUpdate((update) => {
        console.log(
          `[Phase4] Poll ${update.label}: ${update.attempt}/${update.attempt}, ` +
          `status=${update.status}`
        );
      });

      const confirmResult = await poller.poll(
        receipt,
        async (r) => {
          const anchor = await contracts.starknet.getAnchor(headHash, nodeId);
          return {
            status: anchor ? 'confirmed' : 'pending',
            blocksDeep: anchor ? 3 : 0,
          };
        },
        'StarknetAnchor'
      );

      // Phase 1-2: Store receipt
      await db.anchorReceipts.create({
        bundleId,
        nodeId,
        chainName: 'starknet',
        txHash: receipt.txHash,
        blockNumber: receipt.blockNumber,
        confirmationStatus: confirmResult.confirmed ? 'confirmed' : 'pending',
        confirmationChecksAt: [/* timestamps of poll attempts */],
        createdAt: new Date(),
      });

      // Phase 1-2: Update anchor job
      await db.anchorJobs.updateOne(
        { id: anchorJob.id },
        {
          status: confirmResult.confirmed ? 'anchored' : 'failed',
          txHash: receipt.txHash,
          completedAt: new Date(),
        }
      );
    } catch (err) {
      console.error('[Phase4] Anchor job failed:', err.message);
      await db.anchorJobs.updateOne(
        { id: anchorJob.id },
        { status: 'failed', error: err.message }
      );
    }
  });

  return anchorJob;
}

// ============================================================================
// INTEGRATION POINT 4: GET /api/v1/anchor-receipts (poll status)
// ============================================================================

async function getAnchorReceipts(query, contracts) {
  const receipts = await db.anchorReceipts.find(query).limit(query.limit || 50);

  // Enhance with live polling status
  const enhanced = await Promise.all(
    receipts.map(async (receipt) => {
      // Check if confirmation polling is still in progress
      const inProgress = await redis.get(
        `polling:in_progress:${receipt.bundleId}`
      );

      return {
        ...receipt,
        confirmationStatus: inProgress ? 'polling' : receipt.confirmationStatus,
        nextCheckAt: inProgress
          ? new Date(parseInt(inProgress) + 5000)
          : null,
      };
    })
  );

  return enhanced;
}

// ============================================================================
// INTEGRATION POINT 5: POST /api/v1/persons/{id}/status
// Trigger compensation flow when status = 'Deceased'
// ============================================================================

async function handlePersonStatusUpdate(personId, req, res, contracts) {
  const { status, actorId, actorRole, note } = req.body;

  // Phase 1-2: Update person status
  const updated = await db.persons.updateOne(
    { id: personId },
    { status, lastUpdatedBy: actorId, lastUpdatedAt: new Date() }
  );

  // Phase 4: If status is 'Deceased', submit to Ronin contract
  if (status === 'Deceased') {
    try {
      const confirmation = await contracts.ronin.submitDeceased({
        personId,
        actorId,
        actorRole,
        amount: 0, // Will be computed per-zone
      });

      // Store confirmation
      await redis.lpush(
        `ronin:confirmations:${personId}`,
        JSON.stringify({
          actorId,
          actorRole,
          txHash: confirmation.txHash,
          blockNumber: confirmation.blockNumber,
          submittedAt: Date.now(),
        })
      );

      // Check if consensus reached
      const confirmations = await redis.lrange(`ronin:confirmations:${personId}`, 0, -1);
      const parsedConfirms = confirmations.map(c => JSON.parse(c));

      // Phase 4: If 2+ confirmations, trigger compensation unlock
      if (parsedConfirms.length >= 2) {
        const unlockResult = await contracts.ronin.unlockClaim({
          personId,
          claimAmount: 1000, // Placeholder
        });

        // Phase 1-2: Log SMS proof
        await db.sms.create({
          type: 'COMPENSATION_PROOF',
          personId,
          phone: updated.emergencyPhone,
          amount: unlockResult.claimAmount,
          txHash: unlockResult.txHash,
          sentAt: new Date(),
        });

        res.json({
          person: updated,
          confirmationCount: parsedConfirms.length,
          compensation: {
            amount: unlockResult.claimAmount,
            txHash: unlockResult.txHash,
            status: 'unlocked',
          },
        });
      } else {
        res.json({
          person: updated,
          confirmationCount: parsedConfirms.length,
          compensation: null,
        });
      }
    } catch (err) {
      console.error('[Phase4] Ronin submission failed:', err.message);
      res.status(500).json({ error: err.message });
    }
  } else {
    res.json({ person: updated, compensation: null });
  }
}

// ============================================================================
// INTEGRATION POINT 6: POST /api/v1/persons/{id}/family/request-otp
// ============================================================================

async function handleFamilyOTPRequest(personId, phone, res) {
  // Phase 1-2: Check person exists and is Deceased with compensation
  const person = await db.persons.findOne({ id: personId });
  if (!person || person.status !== 'Deceased') {
    return res.status(404).json({ error: 'Person not found or not deceased' });
  }

  const compensations = await redis.lrange(`ronin:confirmations:${personId}`, 0, -1);
  if (compensations.length < 2) {
    return res.status(403).json({ error: 'Consensus not reached for compensation' });
  }

  // Phase 4: Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const ttl = parseInt(process.env.OTP_TTL_SECONDS || '600');

  await redis.setex(`otp:${personId}:${phone}`, ttl, otp);

  // Phase 1-2: Send SMS (mock)
  console.log(`[SMS] OTP for family claim: ${otp}`);

  res.json({
    success: true,
    message: `OTP sent to ${phone}`,
    expiresIn: ttl,
    demoOtp: otp, // For testing only
  });
}

// ============================================================================
// INTEGRATION POINT 7: POST /api/v1/persons/{id}/family/verify-otp
// Final unlock of family claim
// ============================================================================

async function handleFamilyOTPVerify(personId, phone, otp, res) {
  // Verify OTP
  const stored = await redis.get(`otp:${personId}:${phone}`);
  if (!stored || stored !== otp) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }

  // Issue access token for family claim portal
  const token = jwt.sign(
    {
      personId,
      phone,
      permission: 'family_claim',
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Invalidate OTP
  await redis.del(`otp:${personId}:${phone}`);

  res.json({
    success: true,
    token,
    claimAmount: 1000, // From compensation unlock
    walletAddress: 'ronin_' + phone.replace(/\D/g, ''),
    nextStep: 'Use token to withdraw from Ronin contract via portal',
  });
}

// ============================================================================
// Usage in Express Setup
// ============================================================================

/*
const express = require('express');
const app = express();

// Initialize contracts
const contracts = initializePhase4Contracts();

// Register routes
app.post('/api/v1/volunteers/register', async (req, res) => {
  await handleVolunteerRegistration(req, res, contracts);
});

app.post('/api/v1/persons/:id/status', async (req, res) => {
  await handlePersonStatusUpdate(req.params.id, req, res, contracts);
});

app.post('/api/v1/persons/:id/family/request-otp', async (req, res) => {
  const { phone } = req.body;
  await handleFamilyOTPRequest(req.params.id, phone, res);
});

app.post('/api/v1/persons/:id/family/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  await handleFamilyOTPVerify(req.params.id, phone, otp, res);
});

app.listen(3000);
*/

module.exports = {
  initializePhase4Contracts,
  handleVolunteerRegistration,
  createAnchorJobAndTriggerPhase4,
  getAnchorReceipts,
  handlePersonStatusUpdate,
  handleFamilyOTPRequest,
  handleFamilyOTPVerify,
};
