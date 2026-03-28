// ==============================================================
// STATE
// ==============================================================
const NODE_ID = 'NODE-' + (Math.random() * 9000 + 1000 | 0);
let apiKey = '';
let simMode = true;
let currentUser = null;
let channel;
let missingPersons = [];
let meshLogs = [];
let hypercerts = [];
let agentMessages = [];
let incidentLedger = [];
let syncQueue = [];
let lastExportAnchor = 'NONE';
let syncApiUrl = localStorage.getItem('dnet_sync_api_url') || 'http://localhost:8787/api/v1/sync-bundles';
let signingIdentity = {
  ready: false,
  privateKey: null,
  publicKey: null,
  publicKeyPem: '',
  algorithm: 'Ed25519'
};

const STORAGE_KEYS = {
  zones: 'dnet_zones_v1',
  resources: 'dnet_resources_v1',
  ngos: 'dnet_ngos_v1',
  missing: 'dnet_missing_v1',
  hypercerts: 'dnet_hypercerts_v1',
  meshLogs: 'dnet_mesh_logs_v1',
  ledger: 'dnet_ledger_v1',
  syncQueue: 'dnet_sync_queue_v1',
  exportAnchor: 'dnet_last_export_anchor_v1',
  signingPublicSpki: 'dnet_signing_public_spki_b64_v1',
  signingPrivatePkcs8: 'dnet_signing_private_pkcs8_b64_v1'
};

const ZONES = [
  { id:'A2', name:'Palghar District',   sev:'critical', lat:26, lng:20, victims:240, resources:12, detail:'Flash flood — 3.1m water level — 240 displaced — medical convoy rerouted' },
  { id:'B1', name:'Nashik Highway',     sev:'critical', lat:52, lng:44, victims:80,  resources:5,  detail:'Road collapse SH10 — supply convoy blocked — 80 stranded' },
  { id:'C3', name:'Raigad Hospital',    sev:'critical', lat:34, lng:72, victims:55,  resources:3,  detail:'Hospital overflow — 12 critical — oxygen reserves < 4hr' },
  { id:'D1', name:'Thane Central',      sev:'high',     lat:66, lng:28, victims:130, resources:22, detail:'Landslide — 2 routes blocked — rescue teams active' },
  { id:'E4', name:'Pune Outskirts',     sev:'high',     lat:71, lng:66, victims:60,  resources:18, detail:'Embankment breach — river overflowing — evacuation ongoing' },
  { id:'F2', name:'Solapur Region',     sev:'medium',   lat:82, lng:54, victims:25,  resources:30, detail:'Power outage — medical supplies needed — stable' },
  { id:'G1', name:'Kolhapur North',     sev:'low',      lat:88, lng:18, victims:15,  resources:45, detail:'Minor flooding — contained — monitoring' },
];

const RESOURCES = [
  { name:'Medical Teams',  total:24,  deployed:18, color:'var(--red)' },
  { name:'Rescue Boats',   total:40,  deployed:31, color:'var(--accent)' },
  { name:'Supply Convoys', total:15,  deployed:12, color:'var(--warn)' },
  { name:'Helicopters',    total:6,   deployed:5,  color:'var(--accent3)' },
  { name:'Field Medics',   total:120, deployed:89, color:'var(--orange)' },
  { name:'Ambulances',     total:20,  deployed:15, color:'var(--purple)' },
];

const NGOS = [
  { name:'Goonj Foundation',   amount:'₹42L',  zone:'A2, D1', status:'verified', color:'var(--accent3)' },
  { name:'SEEDS India',        amount:'₹35L',  zone:'B1, C3', status:'verified', color:'var(--accent3)' },
  { name:'Rapid Response MH',  amount:'₹28L',  zone:'C3, E4', status:'pending',  color:'var(--warn)' },
  { name:'Pratham Relief',     amount:'₹18L',  zone:'F2, G1', status:'pending',  color:'var(--warn)' },
];

const INITIAL_ZONES = JSON.parse(JSON.stringify(ZONES));
const INITIAL_RESOURCES = JSON.parse(JSON.stringify(RESOURCES));
const INITIAL_NGOS = JSON.parse(JSON.stringify(NGOS));

const SYSTEM_PROMPT = `You are Impulse AI, an autonomous disaster relief triage agent deployed in Maharashtra, India during a major flood emergency. You coordinate rescue workers on an offline mesh network.

Active zones:
${ZONES.map(z => `- Zone ${z.id} (${z.name}): ${z.sev.toUpperCase()} — ${z.victims} victims, ${z.resources} units — ${z.detail}`).join('\n')}

For each field report:
1. Assess severity and immediate life risk
2. Issue specific routing commands (e.g., "Redirect Convoy 4 from Zone F2 to Zone A2")
3. Flag if FHE-encrypted medical data needs sharing with hospitals via Lit Protocol
4. Note if a Hypercert should be minted for the responding volunteer team
5. Specify IPFS provenance log action

Be concise, operational, direct. Use zone codes. Max 4-5 sentences. Lead with ⚡ DECISION:`;

// ==============================================================
// BOOT
// ==============================================================
window.addEventListener('load', () => {
  document.getElementById('nodeId').textContent = NODE_ID;
  loadPersistentState();
  renderZones();
  renderMap();
  renderResources();
  renderNGOs();
  renderMissingPersons();
  initHypercerts();
  initMesh();
  wireConnectivity();
  renderSyncStatus();
  simulateMeshActivity();
  ensureSigningIdentity().catch(() => {
    updateSigningStatus('UNAVAILABLE');
  });

  const saved = sessionStorage.getItem('dnet_key');
  if (saved) { apiKey = saved; simMode = false; updateAIStatus(); }
});

// ==============================================================
// PERSISTENCE + LEDGER
// ==============================================================
function readStoredJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function replaceArray(target, source) {
  target.splice(0, target.length, ...source);
}

function loadPersistentState() {
  const storedZones = readStoredJSON(STORAGE_KEYS.zones, null);
  const storedResources = readStoredJSON(STORAGE_KEYS.resources, null);
  const storedNgos = readStoredJSON(STORAGE_KEYS.ngos, null);

  replaceArray(ZONES, Array.isArray(storedZones) ? storedZones : INITIAL_ZONES);
  replaceArray(RESOURCES, Array.isArray(storedResources) ? storedResources : INITIAL_RESOURCES);
  replaceArray(NGOS, Array.isArray(storedNgos) ? storedNgos : INITIAL_NGOS);

  missingPersons = readStoredJSON(STORAGE_KEYS.missing, []);
  hypercerts = readStoredJSON(STORAGE_KEYS.hypercerts, []);
  meshLogs = readStoredJSON(STORAGE_KEYS.meshLogs, []);
  incidentLedger = readStoredJSON(STORAGE_KEYS.ledger, []);
  syncQueue = readStoredJSON(STORAGE_KEYS.syncQueue, []);
  lastExportAnchor = localStorage.getItem(STORAGE_KEYS.exportAnchor) || 'NONE';
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEYS.zones, JSON.stringify(ZONES));
    localStorage.setItem(STORAGE_KEYS.resources, JSON.stringify(RESOURCES));
    localStorage.setItem(STORAGE_KEYS.ngos, JSON.stringify(NGOS));
    localStorage.setItem(STORAGE_KEYS.missing, JSON.stringify(missingPersons));
    localStorage.setItem(STORAGE_KEYS.hypercerts, JSON.stringify(hypercerts));
    localStorage.setItem(STORAGE_KEYS.meshLogs, JSON.stringify(meshLogs.slice(0, 60)));
    localStorage.setItem(STORAGE_KEYS.ledger, JSON.stringify(incidentLedger.slice(0, 300)));
    localStorage.setItem(STORAGE_KEYS.syncQueue, JSON.stringify(syncQueue));
    localStorage.setItem(STORAGE_KEYS.exportAnchor, lastExportAnchor);
  } catch {
    // If storage quota is exceeded, continue without blocking field operations.
  }
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function getBundleSigningPayload(bundle) {
  const signingMaterial = {
    schema: bundle.schema,
    nodeId: bundle.nodeId,
    generatedAt: bundle.generatedAt,
    previousAnchor: bundle.previousAnchor,
    headHash: bundle.headHash,
    eventCount: bundle.eventCount,
    eventHashes: Array.isArray(bundle.events) ? bundle.events.map(e => e.hash) : []
  };
  return stableStringify(signingMaterial);
}

function abToBase64(ab) {
  const bytes = new Uint8Array(ab);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}

function base64ToAb(b64) {
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes.buffer;
}

function spkiBase64ToPem(spkiB64) {
  const lines = spkiB64.match(/.{1,64}/g) || [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
}

function updateSigningStatus(label) {
  const el = document.getElementById('syncSignStatus');
  if (!el) return;
  el.textContent = `SIGNING ${label}`;
}

async function generateSigningIdentity() {
  if (!window.crypto?.subtle) {
    throw new Error('WebCrypto unavailable in this browser context');
  }

  const pair = await window.crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify']
  );

  const spki = await window.crypto.subtle.exportKey('spki', pair.publicKey);
  const pkcs8 = await window.crypto.subtle.exportKey('pkcs8', pair.privateKey);
  const spkiB64 = abToBase64(spki);
  const pkcs8B64 = abToBase64(pkcs8);

  localStorage.setItem(STORAGE_KEYS.signingPublicSpki, spkiB64);
  localStorage.setItem(STORAGE_KEYS.signingPrivatePkcs8, pkcs8B64);

  signingIdentity = {
    ready: true,
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
    publicKeyPem: spkiBase64ToPem(spkiB64),
    algorithm: 'Ed25519'
  };
}

async function loadSigningIdentity() {
  const spkiB64 = localStorage.getItem(STORAGE_KEYS.signingPublicSpki);
  const pkcs8B64 = localStorage.getItem(STORAGE_KEYS.signingPrivatePkcs8);
  if (!spkiB64 || !pkcs8B64) return false;

  if (!window.crypto?.subtle) return false;

  try {
    const publicKey = await window.crypto.subtle.importKey(
      'spki',
      base64ToAb(spkiB64),
      { name: 'Ed25519' },
      true,
      ['verify']
    );
    const privateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      base64ToAb(pkcs8B64),
      { name: 'Ed25519' },
      true,
      ['sign']
    );

    signingIdentity = {
      ready: true,
      privateKey,
      publicKey,
      publicKeyPem: spkiBase64ToPem(spkiB64),
      algorithm: 'Ed25519'
    };
    return true;
  } catch {
    return false;
  }
}

async function ensureSigningIdentity() {
  updateSigningStatus('INIT...');
  const loaded = await loadSigningIdentity();
  if (!loaded) {
    await generateSigningIdentity();
    addMeshLog('🔐 Generated local signing keypair for this node');
  }
  updateSigningStatus('READY');
  return signingIdentity;
}

async function rotateSigningKey() {
  localStorage.removeItem(STORAGE_KEYS.signingPublicSpki);
  localStorage.removeItem(STORAGE_KEYS.signingPrivatePkcs8);
  signingIdentity = { ready: false, privateKey: null, publicKey: null, publicKeyPem: '', algorithm: 'Ed25519' };
  try {
    await ensureSigningIdentity();
    showToast('Signing key rotated');
  } catch (e) {
    showToast(`Key rotation failed: ${e.message}`);
  }
}

function getSyncBaseUrl() {
  if (!syncApiUrl) return '';
  return syncApiUrl.replace(/\/api\/v1\/sync-bundles\/?$/, '');
}

async function registerSignerWithBackend() {
  const base = getSyncBaseUrl();
  if (!base) throw new Error('Invalid sync endpoint');

  const nearId = currentUser?.id || `${NODE_ID.toLowerCase()}.near`;
  const worldLevel = currentUser?.trust || 'DEMO';

  const res = await fetch(`${base}/api/v1/volunteers/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nodeId: NODE_ID,
      nearId,
      worldLevel,
      publicKeyPem: signingIdentity.publicKeyPem
    })
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || 'Volunteer registration failed');
  }

  return { nearId, worldLevel };
}

async function signBundle(bundle) {
  const payload = getBundleSigningPayload(bundle);
  const bytes = new TextEncoder().encode(payload);
  const signatureAb = await window.crypto.subtle.sign({ name: 'Ed25519' }, signingIdentity.privateKey, bytes);
  return abToBase64(signatureAb);
}

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function createLedgerEvent(type, payload, enqueue = true, rebroadcast = true) {
  const prevHash = incidentLedger[0]?.hash || 'GENESIS';
  const ts = new Date().toISOString();
  const id = `EVT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const hashBase = `${prevHash}|${type}|${stableStringify(payload)}|${ts}|${NODE_ID}`;
  const event = {
    id,
    type,
    payload,
    ts,
    node: NODE_ID,
    prevHash,
    hash: hashString(hashBase),
    status: enqueue ? 'queued' : 'local'
  };

  incidentLedger.unshift(event);
  if (enqueue) syncQueue.unshift(event.id);

  if (rebroadcast) {
    broadcastToMesh({ type: 'ledger_event', event });
  }

  persistState();
  renderSyncStatus();
  return event;
}

function ingestMeshLedgerEvent(event) {
  if (!event?.id) return;
  if (incidentLedger.some(e => e.id === event.id)) return;

  incidentLedger.unshift({ ...event, status: 'mesh-synced' });
  persistState();
  renderSyncStatus();
  addMeshLog(`🧾 Ledger event synced: ${event.type} · ${event.id}`);
}

function getQueuedEvents() {
  const queuedIds = new Set(syncQueue);
  return incidentLedger.filter(e => queuedIds.has(e.id));
}

function renderSyncStatus() {
  const ledgerCount = document.getElementById('ledgerCount');
  const queueCount = document.getElementById('queueCount');
  const anchor = document.getElementById('lastAnchor');
  const preview = document.getElementById('syncPreview');
  const endpoint = document.getElementById('syncEndpoint');

  if (!ledgerCount || !queueCount || !anchor || !preview || !endpoint) return;

  const queued = getQueuedEvents();
  ledgerCount.textContent = String(incidentLedger.length);
  queueCount.textContent = String(queued.length);
  anchor.textContent = lastExportAnchor === 'NONE' ? 'NONE' : lastExportAnchor.slice(0, 8).toUpperCase();
  endpoint.value = syncApiUrl;

  if (!queued.length) {
    preview.textContent = 'Sync queue empty. New field operations will be queued automatically.';
    return;
  }

  preview.innerHTML = queued.slice(0, 5).map(e => {
    const summary = e.type.replaceAll('_', ' ').toUpperCase();
    const hash = e.hash.toUpperCase().slice(0, 8);
    return `<div class="mesh-line"><span class="ts">${new Date(e.ts).toLocaleTimeString()}</span>${summary} · HASH ${hash}</div>`;
  }).join('');
}

function exportSyncBundle() {
  const queued = getQueuedEvents();
  if (!queued.length) {
    showToast('No queued records to export');
    return;
  }

  const headHash = incidentLedger[0]?.hash || 'GENESIS';
  const bundle = {
    schema: 'disasternet.sync.bundle.v1',
    generatedAt: new Date().toISOString(),
    nodeId: NODE_ID,
    previousAnchor: lastExportAnchor,
    headHash,
    eventCount: queued.length,
    events: queued
  };

  const filename = `disasternet-sync-${Date.now()}.json`;
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  const queuedSet = new Set(syncQueue);
  incidentLedger.forEach(e => {
    if (queuedSet.has(e.id)) e.status = 'exported';
  });
  syncQueue = [];
  lastExportAnchor = headHash;

  createLedgerEvent('sync_bundle_exported', { filename, eventCount: bundle.eventCount, headHash }, false);
  persistState();
  renderSyncStatus();
  showToast(`📦 Exported sync bundle (${bundle.eventCount} events)`);
}

function saveSyncEndpoint() {
  const input = document.getElementById('syncEndpoint');
  const next = input ? input.value.trim() : '';
  if (!next) {
    showToast('Sync endpoint cannot be empty');
    return;
  }

  syncApiUrl = next;
  localStorage.setItem('dnet_sync_api_url', syncApiUrl);
  showToast('Sync endpoint saved');
}

async function uploadSyncBundle() {
  if (!navigator.onLine) {
    showToast('Device offline. Export bundle for delayed sync.');
    return;
  }

  const queued = getQueuedEvents();
  if (!queued.length) {
    showToast('No queued records to upload');
    return;
  }

  const bundle = {
    schema: 'disasternet.sync.bundle.v1',
    generatedAt: new Date().toISOString(),
    nodeId: NODE_ID,
    previousAnchor: lastExportAnchor,
    headHash: incidentLedger[0]?.hash || 'GENESIS',
    eventCount: queued.length,
    events: queued
  };

  try {
    await ensureSigningIdentity();
    const signer = await registerSignerWithBackend();
    bundle.signer = signer;
    bundle.signature = await signBundle(bundle);

    const res = await fetch(syncApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bundle)
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.message || 'Sync upload failed');
    }

    const queuedSet = new Set(syncQueue);
    incidentLedger.forEach(e => {
      if (queuedSet.has(e.id)) e.status = 'synced';
    });
    syncQueue = [];
    lastExportAnchor = bundle.headHash;
    createLedgerEvent('sync_bundle_uploaded', {
      bundleId: data.bundleId,
      endpoint: syncApiUrl,
      eventCount: bundle.eventCount,
      headHash: bundle.headHash
    }, false);
    persistState();
    renderSyncStatus();
    showToast(`✓ Uploaded ${bundle.eventCount} events`);
  } catch (e) {
    showToast(`Upload failed: ${e.message}`);
  }
}

function markQueueAsSynced() {
  if (!syncQueue.length) {
    showToast('Queue already empty');
    return;
  }

  const queuedSet = new Set(syncQueue);
  incidentLedger.forEach(e => {
    if (queuedSet.has(e.id)) e.status = 'synced';
  });
  syncQueue = [];
  persistState();
  renderSyncStatus();
  showToast('✓ Queue marked as synced');
}

function resetLocalState() {
  if (!confirm('Reset local zone state, ledger, queue, and cached records on this device?')) return;

  replaceArray(ZONES, JSON.parse(JSON.stringify(INITIAL_ZONES)));
  replaceArray(RESOURCES, JSON.parse(JSON.stringify(INITIAL_RESOURCES)));
  replaceArray(NGOS, JSON.parse(JSON.stringify(INITIAL_NGOS)));
  missingPersons = [];
  hypercerts = [];
  meshLogs = [];
  incidentLedger = [];
  syncQueue = [];
  lastExportAnchor = 'NONE';

  renderZones();
  renderResources();
  renderNGOs();
  renderMissingPersons();
  initHypercerts();
  renderMeshLog();
  renderSyncStatus();
  persistState();
  showToast('Local state reset complete');
}

function wireConnectivity() {
  window.addEventListener('online', updateConnectivityStatus);
  window.addEventListener('offline', updateConnectivityStatus);
  updateConnectivityStatus();
}

function updateConnectivityStatus() {
  const el = document.getElementById('syncNetwork');
  const footer = document.getElementById('footerRight');
  if (!el || !footer) return;

  if (navigator.onLine) {
    el.textContent = 'ONLINE';
    el.className = 'badge badge-green';
    footer.textContent = 'CONNECTIVITY AVAILABLE · READY TO EXPORT';
  } else {
    el.textContent = 'OFFLINE';
    el.className = 'badge badge-orange';
    footer.textContent = 'BROADCASTCHANNEL MESH · OFFLINE-FIRST';
  }
}

// ==============================================================
// DETERMINISTIC TRIAGE ENGINE
// ==============================================================
function extractZoneCode(text) {
  const m = text.match(/zone\s+([a-z]\d)/i);
  return m ? m[1].toUpperCase() : null;
}

function getZoneByCode(zoneCode) {
  return ZONES.find(z => z.id.toUpperCase() === String(zoneCode || '').toUpperCase()) || ZONES[0];
}

function bumpResource(name, delta) {
  const r = RESOURCES.find(x => x.name === name);
  if (!r) return;
  r.deployed = Math.max(0, Math.min(r.total, r.deployed + delta));
}

function buildTriagePlan(report) {
  const lc = report.toLowerCase();
  const zone = getZoneByCode(extractZoneCode(report));
  const sevBase = { critical: 52, high: 36, medium: 22, low: 10 };

  let score = sevBase[zone.sev] + Math.min(24, Math.round(zone.victims / 10));
  if (/critical|urgent|collapse|trapped/.test(lc)) score += 15;
  if (/oxygen|hospital|medical|critical patients/.test(lc)) score += 14;
  if (/flood|water|boat|drown/.test(lc)) score += 12;
  if (/road|bridge|route|block|landslide/.test(lc)) score += 10;
  if (/food|supply|medicine/.test(lc)) score += 7;
  score = Math.max(1, Math.min(score, 99));

  const actions = [];
  if (/oxygen|hospital|medical|critical/.test(lc)) {
    actions.push('Deploy +1 Medical Team from nearest reserve');
    actions.push('Deploy +2 Field Medics to stabilize critical victims');
    bumpResource('Medical Teams', 1);
    bumpResource('Field Medics', 2);
    bumpResource('Ambulances', 1);
  }
  if (/flood|water|boat|stranded/.test(lc)) {
    actions.push('Deploy +2 Rescue Boats for evacuation corridor');
    bumpResource('Rescue Boats', 2);
  }
  if (/road|bridge|route|block|landslide/.test(lc)) {
    actions.push('Reroute 1 Supply Convoy through alternate route');
    bumpResource('Supply Convoys', 1);
  }
  if (/food|supply|medicine/.test(lc)) {
    actions.push('Dispatch medical and ration package bundle');
    bumpResource('Supply Convoys', 1);
  }

  if (!actions.length) {
    actions.push('Dispatch nearest available response team');
    bumpResource('Field Medics', 1);
  }

  zone.resources = Math.max(0, zone.resources - Math.min(actions.length, 3));

  const severity = score >= 80 ? 'CRITICAL' : score >= 55 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';
  const etaMin = Math.max(8, 35 - Math.floor(score / 4));
  const needsFHE = /hospital|medical|critical|patient|diagnostic/.test(lc);
  const shouldMintHypercert = score >= 55;

  renderResources();
  renderZones();

  return {
    zoneId: zone.id,
    zoneName: zone.name,
    score,
    severity,
    etaMin,
    actions,
    needsFHE,
    shouldMintHypercert
  };
}

function renderTriageSummary(plan) {
  const actionLine = plan.actions.slice(0, 2).join(' | ');
  const fheLine = plan.needsFHE ? 'FHE medical data path required.' : 'No medical data unlock needed.';
  return `📐 TRIAGE SCORE ${plan.score} (${plan.severity}) · Zone ${plan.zoneId}. ${actionLine}. ETA ${plan.etaMin} min. ${fheLine}`;
}

// ==============================================================
// WORLD ID / LOGIN
// ==============================================================
function verifyWorld(type) {
  // Simulate World ID verification
  const modal = document.getElementById('worldModal');
  const label = type === 'orb' ? 'ORB-VERIFIED' : 'DEV-VERIFIED';
  const nearId = 'rescue_' + Math.random().toString(36).substr(2,6) + '.near';
  
  modal.classList.remove('show');
  
  currentUser = { id: nearId, trust: label };
  document.getElementById('userPill').style.display = 'flex';
  document.getElementById('userLabel').textContent = nearId;
  
  showToast(`✓ Identity verified · ${nearId} · ${label}`);
  
  addLog('system', `🌍 NEAR + World ID verified: <strong>${nearId}</strong> (${label}). Volunteer registered on-chain. Ready to mint Hypercerts for contributions.`);
  
  // Add initial hypercert stub
  addHypercert({
    name: nearId,
    action: 'Identity registered on NEAR Protocol',
    zone: 'ALL',
    trust: label
  });
  
  setTimeout(() => runInitialAssessment(), 600);
}

function skipVerify() {
  document.getElementById('worldModal').classList.remove('show');
  currentUser = { id: 'demo.near', trust: 'DEMO' };
  document.getElementById('userPill').style.display = 'flex';
  document.getElementById('userLabel').textContent = 'DEMO MODE';
  addLog('system', `Running in demo mode. World ID verification skipped. For production, all volunteers must verify via NEAR + World proof-of-personhood to prevent fake volunteer fraud.`);
  setTimeout(() => runInitialAssessment(), 400);
}

function logoutUser() {
  currentUser = null;
  document.getElementById('userPill').style.display = 'none';
  showToast('Logged out of NEAR Protocol');
}

// ==============================================================
// API MODAL
// ==============================================================
function closeApiModal(useKey) {
  if (useKey) {
    const key = document.getElementById('apiKeyInput').value.trim();
    if (!key.startsWith('sk-ant-')) {
      alert('Please enter a valid Anthropic API key (starts with sk-ant-)');
      return;
    }
    apiKey = key;
    sessionStorage.setItem('dnet_key', key);
    simMode = false;
    updateAIStatus();
    showToast('⚡ Impulse AI activated with live Anthropic API');
  } else {
    simMode = true;
    updateAIStatus();
    showToast('Running in simulation mode');
  }
  document.getElementById('apiModal').classList.remove('show');
}

function updateAIStatus() {
  const pill = document.getElementById('aiStatusPill');
  const label = document.getElementById('aiLabel');
  if (!simMode) {
    label.textContent = 'AI ACTIVE';
    pill.querySelector('.dot').className = 'dot dot-green';
  } else {
    label.textContent = 'SIM MODE';
    pill.querySelector('.dot').className = 'dot dot-orange';
  }
}

// ==============================================================
// ZONES
// ==============================================================
function renderZones() {
  const el = document.getElementById('zoneList');
  el.innerHTML = '';
  ZONES.forEach((z, i) => {
    const pct = Math.min(100, Math.round(z.resources / (z.resources + z.victims * 0.05) * 100));
    const col = { critical:'var(--red)', high:'var(--orange)', medium:'var(--warn)', low:'var(--green)' }[z.sev];
    el.innerHTML += `
      <div class="zone-card" id="zc${i}" onclick="selectZone(${i})">
        <div class="zone-top">
          <span class="zone-id">ZONE ${z.id}</span>
          <span class="sev sev-${z.sev}">${z.sev}</span>
        </div>
        <div class="zone-name">${z.name}</div>
        <div class="zone-stats">
          <span>👥 ${z.victims}</span>
          <span>🚑 ${z.resources} units</span>
        </div>
        <div class="zone-bar">
          <div class="zone-fill" style="width:${pct}%;background:${col}"></div>
        </div>
      </div>`;
  });
}

function selectZone(i) {
  document.querySelectorAll('.zone-card').forEach(c => c.classList.remove('active'));
  document.getElementById('zc' + i).classList.add('active');
  document.getElementById('reportInput').value = `Zone ${ZONES[i].id} — ${ZONES[i].name}: ${ZONES[i].detail}`;
  document.getElementById('reportInput').focus();
}

// ==============================================================
// MAP
// ==============================================================
function renderMap() {
  const container = document.getElementById('mapContent');
  // Route lines first
  const pairs = [[0,1],[1,2],[2,3],[3,4],[4,5]];
  const mapEl = document.querySelector('.map');

  setTimeout(() => {
    const mw = mapEl.offsetWidth, mh = mapEl.offsetHeight;
    pairs.forEach(([a,b]) => {
      const za = ZONES[a], zb = ZONES[b];
      const x1 = za.lng/100*mw, y1 = za.lat/100*mh;
      const x2 = zb.lng/100*mw, y2 = zb.lat/100*mh;
      const len = Math.sqrt((x2-x1)**2+(y2-y1)**2);
      const ang = Math.atan2(y2-y1, x2-x1)*180/Math.PI;
      const line = document.createElement('div');
      line.className = 'map-route';
      line.style.cssText = `left:${x1}px;top:${y1}px;width:${len}px;transform:rotate(${ang}deg);background:linear-gradient(90deg,var(--accent3),transparent);animation-delay:${Math.random()*2}s`;
      container.appendChild(line);
    });
  }, 100);

  ZONES.forEach(z => {
    const pin = document.createElement('div');
    pin.className = 'zone-pin';
    pin.style.cssText = `left:${z.lng}%;top:${z.lat}%`;
    pin.innerHTML = `<div class="zone-pin-ring pin-${z.sev}" title="${z.name}: ${z.detail}">${z.id}</div>`;
    container.appendChild(pin);
  });
}

// ==============================================================
// AGENT LOG
// ==============================================================
function addLog(type, html) {
  const el = document.getElementById('agentLog');
  const div = document.createElement('div');
  div.className = `msg ${type}`;
  const labels = { system:'SYSTEM', alert:'FIELD ALERT', decision:'AI DECISION', info:'ASSESSMENT' };
  div.innerHTML = `<div class="msg-label">${labels[type]||'LOG'} · ${new Date().toLocaleTimeString()}</div>${html}`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
  broadcastToMesh({ type:'agent_msg', content:html, msgType:type });
}

function setThinking(v) {
  document.getElementById('agentThinking').className = 'agent-thinking' + (v?' on':'');
  document.getElementById('dispatchBtn').disabled = v;
}

// ==============================================================
// SUBMIT REPORT
// ==============================================================
async function submitReport() {
  const txt = document.getElementById('reportInput').value.trim();
  if (!txt) return;
  addLog('alert', `📍 Field report received: <strong>${txt}</strong>`);
  const triagePlan = buildTriagePlan(txt);
  addLog('system', renderTriageSummary(triagePlan));
  createLedgerEvent('field_report_logged', {
    reporter: currentUser?.id || 'unverified',
    text: txt,
    zone: triagePlan.zoneId,
    score: triagePlan.score,
    severity: triagePlan.severity,
    actions: triagePlan.actions,
    needsFHE: triagePlan.needsFHE
  });

  document.getElementById('reportInput').value = '';
  setThinking(true);
  document.getElementById('agentSub').textContent = 'PROCESSING FIELD DATA...';
  broadcastToMesh({ type:'field_report', text: txt });

  let decisionText;
  if (simMode || !apiKey) {
    decisionText = await simulatedDecision(txt);
  } else {
    decisionText = await callClaude(txt);
  }

  setThinking(false);
  document.getElementById('agentSub').textContent = 'MONITORING — READY';
  createLedgerEvent('triage_decision_issued', {
    zone: triagePlan.zoneId,
    score: triagePlan.score,
    decision: decisionText,
    etaMin: triagePlan.etaMin
  });

  // Maybe mint a hypercert for this action
  if (currentUser && (triagePlan.shouldMintHypercert || Math.random() > 0.5)) {
    const zone = txt.match(/Zone\s+(\w+)/i)?.[1] || 'FIELD';
    addHypercert({ name: currentUser.id, action: txt.substring(0,60)+'...', zone, trust: currentUser.trust });
  }

  persistState();
}

async function callClaude(report) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 350,
        system: SYSTEM_PROMPT,
        messages: [{ role:'user', content: report }]
      })
    });
    const data = await res.json();
    if (data.content?.[0]) {
      const text = data.content[0].text;
      addLog('decision', text);
      return text;
    } else if (data.error) {
      addLog('system', `⚠ API error: ${data.error.message}. Falling back to simulation.`);
      simMode = true; updateAIStatus();
      return await simulatedDecision(report);
    }
  } catch (e) {
    addLog('system', `⚠ Connection error: ${e.message}. Check API key. Falling back to simulation.`);
    simMode = true; updateAIStatus();
    return await simulatedDecision(report);
  }

  return 'No decision returned from model';
}

async function simulatedDecision(txt) {
  await new Promise(r => setTimeout(r, 1600 + Math.random()*800));
  const lc = txt.toLowerCase();
  let resp;

  if (lc.includes('oxygen') || lc.includes('hospital') || lc.includes('critical')) {
    resp = `⚡ DECISION: Medical emergency escalated. Triggering FHE-encrypted data share from Zone C3 hospital to Nashik Medical Hub via Lit Protocol key gate — diagnostics accessible to verified physicians only, individual records remain private. Requesting helicopter from Zone G1 (low priority). 3 field medics reassigned from Zone F2. Hypercert minting authorized for responding team. IPFS CID: Qm${randHex(8)}`;
  } else if (lc.includes('bridge') || lc.includes('road') || lc.includes('route') || lc.includes('block')) {
    resp = `⚡ DECISION: Route obstruction confirmed. Diverting Supply Convoy 4 via NH166 alternate — ETA +38min to Zone B1. Flagging route change to all mesh nodes (3 devices confirmed receipt). Zone D1 rescue team redirected to cover supply gap. Starknet contract updated with route deviation log. IPFS provenance hash: 0x${randHex(16)}`;
  } else if (lc.includes('flood') || lc.includes('water') || lc.includes('stranded') || lc.includes('boat')) {
    resp = `⚡ DECISION: Flood rescue activated. Dispatching 3 boats from Zone E4 reserve (18 units, can spare). Estimated rescue window 3.5hrs before water rises further. NEAR-verified volunteer Squad 7 activated — identity confirmed via World ID. All field logs encrypted and synced to IPFS/Filecoin via Storacha. Hypercert minting queued for Squad 7.`;
  } else if (lc.includes('supply') || lc.includes('food') || lc.includes('medicine')) {
    resp = `⚡ DECISION: Supply shortage logged. Redirecting 8 packages from Zone D1 (22 units available) to deficient zone. Ethereum agent re-optimized convoy routing — estimated delivery 2.3hrs. NGO disbursement contract on Starknet updated. Volunteer contribution logged for Hypercert minting — portable impact record generated.`;
  } else {
    resp = `⚡ DECISION: Report processed. Severity assessed as HIGH. Nearest available unit — Zone D1 team — dispatched (ETA 18min). Field data encrypted and broadcast to 3 mesh nodes. Resource reallocation complete: 2 medics reassigned to cover gap. IPFS CID logged: Qm${randHex(10)}. Monitoring for escalation.`;
  }

  addLog('decision', resp);
  return resp;
}

async function runInitialAssessment() {
  setThinking(true);
  document.getElementById('agentSub').textContent = 'SCANNING ALL ZONES...';
  const report = `Initial situation report: Maharashtra flood emergency. Zone A2 Palghar CRITICAL 240 victims, Zone B1 Nashik CRITICAL 80 stranded, Zone C3 Raigad hospital CRITICAL oxygen shortage, Zone D1 Thane HIGH 130 victims, Zone E4 Pune HIGH 60 victims, Zone F2 Solapur MEDIUM, Zone G1 Kolhapur LOW. Provide priority assessment and immediate resource routing.`;
  if (simMode || !apiKey) {
    await new Promise(r => setTimeout(r, 1800));
    const msg = `🔍 INITIAL SCAN COMPLETE: 7 zones active. Priority order: C3 (oxygen critical, 4hr window) → A2 (mass displacement, 240 victims) → B1 (route blocked, convoy stalled). Routing: Helicopter 2 → C3 immediately. Convoy 1 rerouted via NH48 → A2. Zone G1 and F2 resources freed for reallocation. All decisions broadcast to mesh. FHE sync active. Standing by for field updates.`;
    addLog('info', msg);
    createLedgerEvent('initial_assessment', { summary: msg }, false);
  } else {
    const msg = await callClaude(report);
    createLedgerEvent('initial_assessment', { summary: msg }, false);
  }
  setThinking(false);
  document.getElementById('agentSub').textContent = 'MONITORING — READY';
}

function randHex(n) { return Array.from({length:n},()=>Math.floor(Math.random()*16).toString(16)).join(''); }

// ==============================================================
// RESOURCES
// ==============================================================
function renderResources() {
  const el = document.getElementById('resList');
  el.innerHTML = RESOURCES.map(r => {
    const pct = Math.round(r.deployed/r.total*100);
    return `<div class="res-item">
      <div class="res-top">
        <span class="res-name">${r.name}</span>
        <span class="res-count">${r.deployed}/${r.total}</span>
      </div>
      <div class="res-bar"><div class="res-fill" style="width:${pct}%;background:${r.color}"></div></div>
      <div class="res-note">${pct}% deployed · ${r.total-r.deployed} in reserve</div>
    </div>`;
  }).join('');
}

function updateResourcesRandom() {
  RESOURCES.forEach(r => {
    if (Math.random() > 0.4) r.deployed = Math.min(r.total, r.deployed + 1);
  });
  renderResources();
}

// ==============================================================
// MISSING PERSONS / FHE
// ==============================================================
function logMissingPerson() {
  const name = document.getElementById('mpName').value.trim();
  const zone = document.getElementById('mpZone').value.trim();
  const note = document.getElementById('mpNote').value.trim();
  if (!name || !zone) { showToast('Please fill in name and zone'); return; }

  const cipher = randHex(40);
  const cid = 'Qm' + Array.from({length:22},()=>Math.floor(Math.random()*36).toString(36)).join('').toUpperCase();
  const rec = { id: `MP-${Date.now().toString(36).toUpperCase()}`, name, zone, note, time: new Date().toLocaleTimeString(), cipher, cid };

  missingPersons.unshift(rec);
  renderMissingPersons();
  document.getElementById('mpName').value = '';
  document.getElementById('mpZone').value = '';
  document.getElementById('mpNote').value = '';

  broadcastToMesh({ type:'missing_person', record: rec });
  addMeshLog(`📋 Missing person FHE-encrypted & broadcast: ${name}`);
  createLedgerEvent('missing_person_logged', {
    id: rec.id,
    name,
    zone,
    note,
    cipherHead: cipher.slice(0, 10),
    cid
  });
  persistState();
  showToast(`🔒 ${name} logged & encrypted to mesh`);
}

function renderMissingPersons() {
  const el = document.getElementById('mpList');
  el.innerHTML = missingPersons.map(p => `
    <div class="mp-card">
      <div class="mp-name">${p.name}</div>
      <div class="mp-meta">Zone ${p.zone} · ${p.note || 'No details'} · ${p.time}</div>
      <div class="mp-enc">🔒 FHE: ${p.cipher.substring(0,28)}...<br>📦 IPFS: ${p.cid.substring(0,20)}...</div>
    </div>`).join('');
}

// ==============================================================
// HYPERCERTS
// ==============================================================
function initHypercerts() {
  if (hypercerts.length) {
    renderHypercerts();
    return;
  }

  const seeds = [
    { name:'priya_v.near',  action:'Deployed rescue boats to Zone A2 Palghar',        zone:'A2', trust:'ORB-VERIFIED' },
    { name:'arjun_r.near',  action:'Coordinated medical supply delivery to Zone C3',   zone:'C3', trust:'ORB-VERIFIED' },
    { name:'meera_s.near',  action:'Organized 45-person evacuation in Zone D1 Thane',  zone:'D1', trust:'DEV-VERIFIED' },
  ];
  seeds.forEach(s => addHypercert(s, true));
  persistState();
}

function addHypercert({ name, action, zone, trust }, silent=false) {
  const id = 'HC-' + Date.now().toString(36).toUpperCase().slice(-6);
  hypercerts.unshift({ id, name, action, zone, trust, minted: false, time: new Date().toLocaleTimeString() });
  renderHypercerts();
  createLedgerEvent('hypercert_queued', { id, name, zone, trust, action }, false);
  persistState();
  if (!silent) showToast(`🏅 Hypercert queued: ${name}`);
}

function renderHypercerts() {
  const el = document.getElementById('hcList');
  if (!hypercerts.length) { el.innerHTML = '<div style="padding:20px;text-align:center;font-family:JetBrains Mono,monospace;font-size:10px;color:var(--text3)">No Hypercerts minted yet. Submit field reports to earn contribution certificates.</div>'; return; }
  el.innerHTML = hypercerts.map((h,i) => `
    <div class="hc-card">
      <div class="hc-top">
        <span class="hc-name">${h.name}</span>
        <span class="hc-id">${h.id}</span>
      </div>
      <div class="hc-desc">${h.action}</div>
      <div class="hc-meta">Zone ${h.zone} · ${h.trust} · ${h.time}</div>
      <div class="hc-mint-btn ${h.minted?'minted':''}" onclick="mintHC(${i})">${h.minted ? '✓ MINTED ON-CHAIN' : '⚡ MINT HYPERCERT'}</div>
    </div>`).join('');
}

function mintHC(i) {
  hypercerts[i].minted = true;
  renderHypercerts();
  showToast(`✓ Hypercert ${hypercerts[i].id} minted on-chain for ${hypercerts[i].name}`);
  addMeshLog(`🏅 Hypercert minted: ${hypercerts[i].id} — ${hypercerts[i].name}`);
  createLedgerEvent('hypercert_minted', { id: hypercerts[i].id, name: hypercerts[i].name, zone: hypercerts[i].zone });
  persistState();
}

// ==============================================================
// STARKNET / NGOs
// ==============================================================
function renderNGOs() {
  document.getElementById('ngoList').innerHTML = NGOS.map((n,i) => `
    <div class="ngo-card">
      <div class="ngo-dot" style="background:${n.color}"></div>
      <div class="ngo-info">
        <div class="ngo-name">${n.name}</div>
        <div class="ngo-meta">Zones: ${n.zone} · ${n.status.toUpperCase()}</div>
      </div>
      <div class="ngo-amt">${n.amount}</div>
      <div class="disburse-btn ${n.status==='disbursed'?'done':''}" id="dgbtn${i}" onclick="disburse(${i})">${n.status==='disbursed'?'DONE':'SEND'}</div>
    </div>`).join('');
}

function disburse(i) {
  NGOS[i].status = 'disbursed';
  document.getElementById('dgbtn'+i).textContent = 'DONE';
  document.getElementById('dgbtn'+i).classList.add('done');
  showToast(`✓ ${NGOS[i].amount} disbursed to ${NGOS[i].name} via Starknet`);
  addMeshLog(`💸 Starknet: ${NGOS[i].amount} disbursed to ${NGOS[i].name}`);
  createLedgerEvent('ngo_disbursement', { ngo: NGOS[i].name, amount: NGOS[i].amount, zone: NGOS[i].zone });
  persistState();
}

// ==============================================================
// MESH NETWORK
// ==============================================================
function initMesh() {
  channel = new BroadcastChannel('disasternet_mesh_v2');
  channel.onmessage = (e) => {
    const msg = e.data;
    if (msg.from === NODE_ID) return;

    if (msg.type === 'ping') {
      addMeshLog(`📡 Ping from ${msg.from}`);
      activatePhone(2); document.getElementById('n2s').textContent = 'ACTIVE';
      document.getElementById('arr1').classList.add('active');
      document.getElementById('md2').classList.add('on');
      channel.postMessage({ type:'pong', from:NODE_ID });
    }
    if (msg.type === 'pong') {
      addMeshLog(`✅ Pong from ${msg.from} — mesh link confirmed`);
      activatePhone(2);
    }
    if (msg.type === 'missing_person') {
      const r = msg.record;
      if (!missingPersons.some(p => p.id === r.id)) {
        missingPersons.unshift({ ...r, name: r.name + ' [SYNCED]' });
        renderMissingPersons();
        addMeshLog(`👤 Missing person synced: ${r.name}`);
        persistState();
      }
    }
    if (msg.type === 'agent_msg') {
      addMeshLog(`⚡ AI decision synced from ${msg.from}`);
    }
    if (msg.type === 'field_report') {
      addMeshLog(`📍 Field report from ${msg.from}: "${msg.text.substring(0,45)}..."`);
    }
    if (msg.type === 'ledger_event') {
      ingestMeshLedgerEvent(msg.event);
    }
  };

  addMeshLog(`🟢 ${NODE_ID} initialized on BroadcastChannel`);
  addMeshLog(`💡 Open in another tab to simulate a second device`);
}

function doBroadcastPing() {
  channel.postMessage({ type:'ping', from:NODE_ID, ts: Date.now() });
  addMeshLog(`📡 Ping broadcast from ${NODE_ID}`);
}

function broadcastToMesh(data) {
  if (channel) channel.postMessage({ ...data, from: NODE_ID });
}

function addMeshLog(txt) {
  meshLogs.unshift({ txt, ts: new Date().toLocaleTimeString() });
  if (meshLogs.length > 40) meshLogs.pop();
  renderMeshLog();
  persistState();
}

function renderMeshLog() {
  document.getElementById('meshLog').innerHTML = meshLogs.map(l =>
    `<div class="mesh-line"><span class="ts">${l.ts}</span>${l.txt}</div>`).join('');
}

function activatePhone(n) {
  document.getElementById('phone'+n).classList.add('active');
}

function simulateMeshActivity() {
  const events = [
    [3000, () => { addMeshLog('📊 Zone A2: packet relayed — 3 hops — 11ms'); document.getElementById('md2').classList.add('on'); }],
    [7000, () => { addMeshLog('🔄 Resource table sync — Δ3 records'); activatePhone(2); document.getElementById('md3').classList.add('on'); document.getElementById('n3s').textContent = 'SYNCING'; }],
    [12000, () => { addMeshLog('📦 IPFS batch queued — 47 records — awaiting connectivity window'); document.getElementById('md4').classList.add('on'); document.getElementById('n3s').textContent = 'ACTIVE'; }],
    [18000, () => { addMeshLog('⚡ AI decision propagated to 3 mesh nodes'); }],
    [25000, () => { addMeshLog('🌍 World ID: volunteer identity verification confirmed'); }],
    [32000, () => { addMeshLog('🔐 Lit Protocol: key gate checked for Zone C3 medical data'); }],
    [40000, () => { addMeshLog('📡 Zone B1: 2 packets dropped — retransmitting'); }],
  ];
  events.forEach(([delay, fn]) => setTimeout(fn, delay));
}

// ==============================================================
// TABS
// ==============================================================
function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('tab-'+name).classList.add('active');
}

// ==============================================================
// TOAST
// ==============================================================
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3200);
}

// ==============================================================
// LIVE STATS TICKER
// ==============================================================
setInterval(() => {
  const v = document.getElementById('statVictims');
  const n = parseInt(v.textContent);
  if (Math.random() > 0.6) v.textContent = n + Math.floor(Math.random()*3);
  
  const rv = document.getElementById('statResources');
  const rn = parseInt(rv.textContent);
  if (Math.random() > 0.7) rv.textContent = Math.min(rn+1, 220);

  const sv = document.getElementById('statVolunteers');
  const sn = parseInt(sv.textContent);
  if (Math.random() > 0.8) sv.textContent = sn + 1;
}, 4000);