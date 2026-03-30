#!/usr/bin/env node
/**
 * DisasterNet Phase 4 Integration Harness
 * Tests: contract RPC payloads, confirmation polling, multi-chain, and live adapter mode
 */

const http = require('node:http');

const BASE = 'http://localhost:8787';

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      method,
      headers: { 'content-type': 'application/json' },
    };

    const req = http.request(url, opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(label, fn) {
  try {
    await fn();
    console.log(`[PASS] ${label}`);
    return true;
  } catch (err) {
    console.log(`[FAIL] ${label}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('=== DisasterNet Phase 4 Integration Harness ===\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Volunteer registration
  if (await test('Volunteer registration for Starknet', async () => {
    const res = await request('POST', '/api/v1/volunteers/register', {
      nodeId: 'PHASE4-STARKNET-1',
      nearId: 'starknet_worker.near',
      worldLevel: 'ORB-VERIFIED',
      publicKeyPem: '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\n-----END PUBLIC KEY-----',
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
  })) passed++; else failed++;

  // Test 2: Create missing person
  let personId;
  if (await test('Create missing person record', async () => {
    const res = await request('POST', '/api/v1/persons', {
      name: 'Test Person Phase4',
      phone: '+1234567890',
      lastSeenZone: 'ZONE-A',
      reporterId: 'PHASE4-STARKNET-1',
      reporterRole: 'rescuer',
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    personId = res.data.person.id;
  })) passed++; else failed++;

  // Test 3: Submit bundle with signed credentials
  let bundleId;
  if (await test('Submit signed bundle for anchoring', async () => {
    const bundle = {
      schema: 'disasternet.sync.bundle.v1',
      nodeId: 'PHASE4-STARKNET-1',
      headHash: `0x${Date.now().toString(16)}`,
      previousAnchor: 'NONE',
      eventCount: 1,
      generatedAt: new Date().toISOString(),
      signer: {
        nearId: 'starknet_worker.near',
        worldLevel: 'ORB-VERIFIED',
      },
      signature: 'MOCK_SIGNATURE_' + Math.random().toString(36).slice(2),
      events: [
        {
          id: 'EVT-PHASE4-001',
          type: 'person_report',
          personId,
          data: { status: 'Missing', zone: 'ZONE-A' },
        },
      ],
    };

    const res = await request('POST', '/api/v1/sync-bundles', bundle);
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    bundleId = res.data.bundleId;
  })) passed++; else failed++;

  // Test 4: Verify anchor job created and transitioned
  if (await test('Anchor job queued and processed', async () => {
    await new Promise(r => setTimeout(r, 3000)); // Wait for worker tick
    const res = await request('GET', '/api/v1/sync-bundles/' + bundleId);
    if (!res.data.anchorReceipts || res.data.anchorReceipts.length === 0) {
      throw new Error('No anchor receipts found');
    }
    const receipt = res.data.anchorReceipts[0];
    if (!receipt.txHash) throw new Error('No tx hash in receipt');
  })) passed++; else failed++;

  // Test 5: Confirm receipts include confirmation status
  if (await test('Receipt includes confirmation polling fields', async () => {
    const res = await request('GET', '/api/v1/anchor-receipts?limit=1');
    if (!res.data.receipts || res.data.receipts.length === 0) throw new Error('No receipts');
    const receipt = res.data.receipts[0];
    if (!('confirmationStatus' in receipt)) throw new Error('Missing confirmationStatus field');
    if (!Array.isArray(receipt.confirmationChecksAt)) throw new Error('Missing confirmationChecksAt array');
  })) passed++; else failed++;

  // Test 6: Update person status to trigger compensation
  if (await test('Person status update and compensation flow', async () => {
    const res = await request('POST', `/api/v1/persons/${personId}/status`, {
      status: 'Deceased',
      actorId: 'PHASE4-RESCUER-1',
      actorRole: 'rescuer',
      note: 'Phase 4 test deceased confirmation',
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  })) passed++; else failed++;

  // Test 7: Confirm second rescuer can finalize deceased status
  if (await test('Second rescuer confirms deceased and triggers compensation', async () => {
    const res = await request('POST', `/api/v1/persons/${personId}/status`, {
      status: 'Deceased',
      actorId: 'PHASE4-RESCUER-2',
      actorRole: 'rescuer',
      note: 'Phase 4 test second confirmation',
      lastSeenZone: 'ZONE-A',
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.compensation) throw new Error('Compensation not triggered');
  })) passed++; else failed++;

  // Test 8: Verify SMS was sent (mock)
  if (await test('SMS proof logged for compensation', async () => {
    const res = await request('GET', '/api/v1/sms?limit=10');
    const compensationSms = (res.data.messages || []).find(m => m.type === 'COMPENSATION_PROOF');
    if (!compensationSms) throw new Error('No compensation SMS found');
  })) passed++; else failed++;

  // Test 9: Family claim verification with OTP
  if (await test('Family OTP request and verification flow', async () => {
    const phone = '+1234567890';
    const res1 = await request('POST', `/api/v1/persons/${personId}/family/request-otp`, { phone });
    if (res1.status !== 200) throw new Error(`OTP request failed: ${res1.status}`);

    const otp = res1.data.demoOtp;
    const res2 = await request('POST', `/api/v1/persons/${personId}/family/verify-otp`, { phone, otp });
    if (res2.status !== 200) throw new Error(`OTP verify failed: ${res2.status}`);
  })) passed++; else failed++;

  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Harness error:', err);
  process.exit(1);
});
