// ==============================================================
// STATE
// ==============================================================
const NODE_ID = 'NODE-' + (Math.random() * 9000 + 1000 | 0);
let apiKey = '';
let simMode = true;
let currentUser = null;
let currentRole = null;
let channel;
let missingPersons = [];
let rescuedPersons = [];
let compensationCases = [];
let meshLogs = [];
let hypercerts = [];
let agentMessages = [];
let tfheReady = false;
let selectedRoleTemp = null;
let treatmentTargetId = null;
let compensationTargetId = null;
let allowedTabsForCurrentRole = new Set(['rescued', 'missing', 'drones', 'mesh', 'res', 'hc', 'recovery', 'funds']);
let backendSnapshot = { healthy: null, bundleCount: null, anchorQueued: null, anchoredReceipts: null };

const SYNC_API_BASE = sessionStorage.getItem('dnet_sync_api') || (
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8787'
    : null
);

const ROLE_LABELS = {
  rescuer: 'RESCUE WORKER',
  danger: 'VICTIM',
  medic: 'HOSPITAL',
  surveillance: 'MAIN STATION',
};

const ROLE_ALLOWED_TABS = {
  surveillance: ['rescued', 'missing', 'drones', 'mesh', 'res', 'hc', 'recovery', 'funds'],
  rescuer: ['rescued', 'missing', 'mesh'],
  medic: ['rescued', 'missing'],
  danger: ['missing'],
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

const ZONE_COORDS = {
  A2: [19.70, 72.77],
  B1: [20.00, 73.78],
  C3: [18.52, 73.15],
  D1: [19.22, 72.98],
  E4: [18.52, 73.85],
  F2: [17.66, 75.91],
  G1: [16.70, 74.24],
};

const ROAD_EDGES = [
  { id: 'R-A2-D1', from: 'A2', to: 'D1', points: [[19.70, 72.77], [19.50, 72.88], [19.22, 72.98]], baseCost: 58 },
  { id: 'R-D1-C3', from: 'D1', to: 'C3', points: [[19.22, 72.98], [18.95, 73.05], [18.52, 73.15]], baseCost: 65 },
  { id: 'R-C3-E4', from: 'C3', to: 'E4', points: [[18.52, 73.15], [18.49, 73.45], [18.52, 73.85]], baseCost: 80 },
  { id: 'R-E4-F2', from: 'E4', to: 'F2', points: [[18.52, 73.85], [18.00, 74.90], [17.66, 75.91]], baseCost: 180 },
  { id: 'R-F2-G1', from: 'F2', to: 'G1', points: [[17.66, 75.91], [17.15, 75.10], [16.70, 74.24]], baseCost: 210 },
  { id: 'R-D1-B1', from: 'D1', to: 'B1', points: [[19.22, 72.98], [19.55, 73.30], [20.00, 73.78]], baseCost: 150 },
  { id: 'R-B1-E4', from: 'B1', to: 'E4', points: [[20.00, 73.78], [19.30, 73.90], [18.52, 73.85]], baseCost: 240 },
  { id: 'R-A2-C3', from: 'A2', to: 'C3', points: [[19.70, 72.77], [19.10, 72.95], [18.52, 73.15]], baseCost: 125 },
  { id: 'R-D1-E4', from: 'D1', to: 'E4', points: [[19.22, 72.98], [18.95, 73.45], [18.52, 73.85]], baseCost: 140 },
];

const ROAD_STATUS_COLORS = {
  clear: '#00c851',
  risky: '#ffcc00',
  blocked: '#ff1744',
};

let mapInstance = null;
let routeLayer = null;
let zoneMarkersById = {};
let roadLayersById = {};
let droneLeafletMarkers = {};
let vulnerableLeafletMarkers = [];
let currentRoadPaintMode = 'clear';
let roadStatusById = {};
let droneRequiredZones = new Set();

try {
  roadStatusById = JSON.parse(localStorage.getItem('dnet_road_status_v1') || '{}');
} catch (e) {
  roadStatusById = {};
}

try {
  const rawDroneRequired = JSON.parse(localStorage.getItem('dnet_drone_required_v1') || '[]');
  droneRequiredZones = new Set(Array.isArray(rawDroneRequired) ? rawDroneRequired : []);
} catch (e) {
  droneRequiredZones = new Set();
}

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
  const nodeEl = document.getElementById('nodeId');
  if (nodeEl) nodeEl.textContent = NODE_ID;

  registerOfflineServiceWorker();
  initMapToolSelectors();
  hydrateZoneDroneFlags();

  renderZones();
  renderMap();
  renderResources();
  renderNGOs();
  initHypercerts();
  initMesh();
  refreshMissingPersonsFromBackend();
  setInterval(refreshMissingPersonsFromBackend, 20000);
  refreshLiveBackendSnapshot();
  setInterval(refreshLiveBackendSnapshot, 30000);
  simulateMeshActivity();
  initTFHE();
  renderDrones();
  renderDams();
  initRecovery();
  renderNGOBoard();
  initAnticipatoryEngine();

  const saved = sessionStorage.getItem('dnet_key');
  if (saved) { apiKey = saved; simMode = false; updateAIStatus(); }
});

async function fetchJsonSafe(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function postJsonSafe(url, payload) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, status: res.status, data };
    return { ok: true, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { ok: false, message: 'Network unavailable' } };
  }
}

function mapBackendPersonToUi(person) {
  const history = Array.isArray(person.statusHistory) ? person.statusHistory : [];
  return {
    id: person.id,
    name: person.name,
    zone: person.lastSeenZone || 'UNKNOWN',
    note: person.note || '',
    phone: person.phone || '',
    status: person.status || 'Missing',
    updatedAt: person.updatedAt || person.createdAt || new Date().toISOString(),
    time: new Date(person.updatedAt || person.createdAt || Date.now()).toLocaleTimeString(),
    cipher: person.anchorCid ? person.anchorCid.slice(0, 40) : randHex(40),
    cid: person.anchorCid || '',
    anchorCid: person.anchorCid || '',
    deceasedConfirmations: (person.deceasedConfirmations || []).length,
    compensation: person.compensation || null,
    statusHistory: history
      .slice()
      .sort((a, b) => new Date(b.ts || 0).getTime() - new Date(a.ts || 0).getTime())
      .slice(0, 4),
  };
}

function upsertMissingPersonLocal(person) {
  const mapped = mapBackendPersonToUi(person);
  const idx = missingPersons.findIndex((p) => p.id === mapped.id);
  if (idx >= 0) missingPersons[idx] = mapped;
  else missingPersons.unshift(mapped);
}

function toLocaleDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN');
}

function toLocaleTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString();
}

function buildBackendCompensationCases(persons, smsMessages) {
  const proofByPersonId = {};
  smsMessages
    .filter((m) => m && m.type === 'COMPENSATION_PROOF' && m.personId)
    .forEach((msg) => {
      const existing = proofByPersonId[msg.personId];
      if (!existing || new Date(msg.sentAt || 0).getTime() >= new Date(existing.sentAt || 0).getTime()) {
        proofByPersonId[msg.personId] = msg;
      }
    });

  return persons
    .filter((p) => p.status === 'Deceased' || Number(p.deceasedConfirmations || 0) > 0)
    .map((p) => {
      const proof = proofByPersonId[p.id];
      const isPaid = p.compensation && p.compensation.status === 'paid';
      return {
        source: 'backend',
        personId: p.id,
        name: p.name,
        zone: p.zone,
        deathTime: toLocaleTime(p.updatedAt),
        deathDate: toLocaleDate(p.updatedAt),
        familyContact: p.phone ? `Registered family contact · ${p.phone}` : null,
        amount: p.compensation?.amount || null,
        status: isPaid ? 'filed' : 'pending',
        filedBy: isPaid ? 'AUTO-COMPENSATION' : 'SYSTEM',
        txHash: p.compensation?.txHash || null,
        smsProofAt: proof?.sentAt || null,
        note: isPaid
          ? `On-chain compensation paid (${p.compensation?.chain || 'starknet-sepolia'})`
          : `Awaiting conditions. Deceased confirmations: ${p.deceasedConfirmations || 0}/2${p.anchorCid ? '' : ' · anchor CID missing'}`,
      };
    });
}

function syncCompensationCasesFromBackend(persons, smsMessages = []) {
  const manualCases = compensationCases.filter((c) => c.source !== 'backend');
  const backendCases = buildBackendCompensationCases(persons, smsMessages);
  compensationCases = [...manualCases, ...backendCases];
  renderCompensationCases();
  updateCompensationBadge();
}

async function refreshMissingPersonsFromBackend() {
  if (!SYNC_API_BASE) return;
  const data = await fetchJsonSafe(`${SYNC_API_BASE}/api/v1/persons?limit=300`);
  if (!data || !data.ok || !Array.isArray(data.persons)) return;

  const smsData = await fetchJsonSafe(`${SYNC_API_BASE}/api/v1/sms?limit=300`);
  const smsMessages = smsData && smsData.ok && Array.isArray(smsData.messages) ? smsData.messages : [];

  missingPersons = data.persons.map(mapBackendPersonToUi);
  syncCompensationCasesFromBackend(missingPersons, smsMessages);
  renderMissingPersons();
}

async function refreshLiveBackendSnapshot() {
  if (!SYNC_API_BASE) return;
  if (currentRole && currentRole !== 'surveillance') return;

  const health = await fetchJsonSafe(`${SYNC_API_BASE}/health`);
  const bundles = await fetchJsonSafe(`${SYNC_API_BASE}/api/v1/sync-bundles?limit=1`);
  const queuedAnchors = await fetchJsonSafe(`${SYNC_API_BASE}/api/v1/anchors?status=queued&limit=1`);
  const receipts = await fetchJsonSafe(`${SYNC_API_BASE}/api/v1/anchor-receipts?limit=200`);

  const healthy = !!(health && health.ok);
  const bundleCount = bundles && typeof bundles.count === 'number' ? bundles.count : null;
  const anchorQueued = queuedAnchors && typeof queuedAnchors.count === 'number' ? queuedAnchors.count : null;
  const anchoredReceipts = receipts && typeof receipts.count === 'number' ? receipts.count : null;

  const changed =
    backendSnapshot.healthy !== healthy ||
    backendSnapshot.bundleCount !== bundleCount ||
    backendSnapshot.anchorQueued !== anchorQueued ||
    backendSnapshot.anchoredReceipts !== anchoredReceipts;

  backendSnapshot = { healthy, bundleCount, anchorQueued, anchoredReceipts };

  if (!changed) return;

  if (!healthy) {
    addMeshLog('🟠 Sync receiver unreachable — running local-only mode');
    return;
  }

  const bundleText = bundleCount === null ? 'n/a' : String(bundleCount);
  const queuedText = anchorQueued === null ? 'n/a' : String(anchorQueued);
  const receiptsText = anchoredReceipts === null ? 'n/a' : String(anchoredReceipts);
  addMeshLog(`🟢 Sync receiver online · bundles: ${bundleText} · queued anchors: ${queuedText} · receipts: ${receiptsText}`);
}

function registerOfflineServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then(() => {
    addMeshLog('🗺 Service worker ready for offline map + tile cache');
  }).catch(() => {
    addMeshLog('🗺 Service worker registration failed; map will run online-only');
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    const message = event.data || {};
    if (message.type === 'tiles-prefetch-done') {
      const count = Number(message.count || 0);
      setMapRouteStatus(`Offline tile cache completed: ${count} tiles prepared.`);
      addMeshLog(`🧭 Offline tile prefetch completed (${count} tiles)`);
    }
  });
}

function latLngToTileXY(lat, lng, zoom) {
  const latRad = lat * Math.PI / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

function tileUrlsForBBox(minLat, minLng, maxLat, maxLng, zoomLevels) {
  const urls = [];
  zoomLevels.forEach((z) => {
    const nw = latLngToTileXY(maxLat, minLng, z);
    const se = latLngToTileXY(minLat, maxLng, z);
    for (let x = nw.x; x <= se.x; x++) {
      for (let y = nw.y; y <= se.y; y++) {
        urls.push(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`);
      }
    }
  });
  return urls;
}

function buildDisasterRegionTileList() {
  const regions = [
    { name: 'Maharashtra', bbox: [15.6, 72.6, 22.1, 80.9] },
    { name: 'Bihar', bbox: [24.2, 83.2, 27.6, 88.3] },
    { name: 'Odisha', bbox: [17.7, 81.3, 22.7, 87.6] },
    { name: 'Kerala', bbox: [8.1, 74.8, 12.9, 77.4] },
  ];

  const zoomLevels = [7, 8];
  const all = new Set();
  regions.forEach((region) => {
    const [minLat, minLng, maxLat, maxLng] = region.bbox;
    tileUrlsForBBox(minLat, minLng, maxLat, maxLng, zoomLevels).forEach((url) => all.add(url));
  });
  return Array.from(all);
}

function predownloadDisasterTiles() {
  if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
    setMapRouteStatus('Service worker not active yet. Reload once, then try CACHE TILES again.');
    return;
  }
  const urls = buildDisasterRegionTileList();
  navigator.serviceWorker.controller.postMessage({ type: 'prefetch-tiles', urls });
  setMapRouteStatus(`Caching disaster-region map tiles (${urls.length} requested)...`);
  addMeshLog(`🧭 Tile prefetch requested for Maharashtra, Bihar, Odisha, Kerala (${urls.length} tiles)`);
}

// ==============================================================
// ROLE LOGIN SYSTEM
// ==============================================================
const ROLE_FORMS = {
  rescuer: {
    icon: '🦺', label: 'RESCUE WORKER LOGIN',
    color: 'var(--accent)',
    fields: `
      <input class="mp-input" id="rf_name" placeholder="Your full name *" />
      <input class="mp-input" id="rf_team" placeholder="Team / unit ID (e.g. NDRF-Team-7)" />
      <input class="mp-input" id="rf_zone" placeholder="Assigned zone (e.g. A2, B1)" />
      <input class="mp-input" id="rf_phone" placeholder="Contact number" />
      <div class="modal-hint" style="margin-top:4px">As a rescuer, you can log rescued persons, update conditions, and submit field reports to Impulse AI.</div>
    `
  },
  danger: {
    icon: '🆘', label: 'VICTIM SOS LOGIN',
    color: 'var(--red)',
    fields: `
      <input class="mp-input" id="rf_name" placeholder="Your name (optional)" />
      <input class="mp-input" id="rf_location" placeholder="Your location / landmark *" />
      <select class="mp-input" id="rf_danger_type" style="color:var(--text2)">
        <option value="">Type of emergency *</option>
        <option>Trapped by floodwater</option>
        <option>Stranded on roof/high ground</option>
        <option>Medical emergency</option>
        <option>Building collapse</option>
        <option>Swept away / at risk of drowning</option>
        <option>Other emergency</option>
      </select>
      <input class="mp-input" id="rf_count" placeholder="Number of people at this location" />
      <textarea class="mp-input" id="rf_condition" placeholder="Any medical conditions, injuries, special needs..." style="resize:none;height:52px;font-size:11px"></textarea>
      <div class="modal-hint" style="border-color:rgba(255,23,68,0.3);background:rgba(255,23,68,0.06);color:var(--red);margin-top:4px">⚡ Pressing SEND SOS will immediately alert all rescue teams in your area.</div>
    `
  },
  medic: {
    icon: '🏥', label: 'HOSPITAL LOGIN',
    color: 'var(--accent3)',
    fields: `
      <input class="mp-input" id="rf_name" placeholder="Doctor / nurse / paramedic name *" />
      <input class="mp-input" id="rf_qualification" placeholder="Qualification (e.g. MBBS, Paramedic, Nurse)" />
      <input class="mp-input" id="rf_facility" placeholder="Current facility / camp" />
      <input class="mp-input" id="rf_reg" placeholder="Medical registration number (optional)" />
      <div class="modal-hint" style="margin-top:4px">As a medic, you can update treatment records, triage patients from the Rescued tab, and file deceased compensation claims.</div>
    `
  },
  surveillance: {
    icon: '🛰️', label: 'MAIN STATION COMMAND LOGIN',
    color: 'var(--purple)',
    fields: `
      <input class="mp-input" id="rf_name" placeholder="Officer name *" />
      <input class="mp-input" id="rf_org" placeholder="Organisation (e.g. NDMA, State Disaster Authority)" />
      <input class="mp-input" id="rf_rank" placeholder="Rank / designation" />
      <input class="mp-input" id="rf_auth" placeholder="Authorization code (demo: NDMA-2024)" />
      <div class="modal-hint" style="margin-top:4px">Full command access: drone dispatch, zone management, NGO coordination, AI agent, all system functions.</div>
    `
  }
};

function selectRole(role) {
  selectedRoleTemp = role;
  const config = ROLE_FORMS[role];
  document.getElementById('roleGrid').style.display = 'none';
  document.getElementById('roleActions').style.display = 'none';
  document.getElementById('roleForm').style.display = 'block';
  document.getElementById('roleFormHeader').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border)">
      <span style="font-size:24px">${config.icon}</span>
      <div>
        <div style="font-family:'Orbitron',sans-serif;font-size:12px;font-weight:700;color:${config.color};letter-spacing:1px">${config.label}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3);margin-top:2px">Fill in your details to proceed</div>
      </div>
    </div>
  `;
  document.getElementById('roleFormFields').innerHTML = config.fields;
  if (role === 'danger') {
    document.getElementById('loginConfirmBtn').textContent = '🆘 SEND SOS BEACON';
    document.getElementById('loginConfirmBtn').style.background = 'var(--red)';
  } else {
    document.getElementById('loginConfirmBtn').textContent = 'ENTER SYSTEM';
    document.getElementById('loginConfirmBtn').style.background = '';
  }
}

function backToRoleSelect() {
  selectedRoleTemp = null;
  document.getElementById('roleGrid').style.display = 'grid';
  document.getElementById('roleActions').style.display = 'flex';
  document.getElementById('roleForm').style.display = 'none';
}

function confirmLogin() {
  const nameEl = document.getElementById('rf_name');
  if (!nameEl || !nameEl.value.trim()) { showToast('Please enter your name'); return; }
  const name = nameEl.value.trim();
  
  if (selectedRoleTemp === 'danger') {
    // SOS flow
    const locEl = document.getElementById('rf_location');
    const typeEl = document.getElementById('rf_danger_type');
    if (!locEl || !locEl.value.trim()) { showToast('Please enter your location'); return; }
    if (!typeEl || !typeEl.value) { showToast('Please select emergency type'); return; }
    
    const location = locEl.value.trim();
    const emergType = typeEl.value;
    const count = document.getElementById('rf_count')?.value || '1';
    const condition = document.getElementById('rf_condition')?.value || '';
    
    document.getElementById('roleModal').classList.remove('show');
    currentUser = { id: name || 'Unknown', trust: 'CIVILIAN', role: 'danger' };
    currentRole = 'danger';
    setupRoleUI();
    
    // Fire SOS
    setTimeout(() => fireSOS(name || 'Unknown civilian', location, emergType, count, condition), 200);
    return;
  }
  
  const roleLabels = {
    rescuer: ROLE_LABELS.rescuer,
    medic: ROLE_LABELS.medic,
    surveillance: ROLE_LABELS.surveillance,
  };
  currentRole = selectedRoleTemp;
  currentUser = { id: name, trust: 'ROLE-VERIFIED', role: selectedRoleTemp };
  
  document.getElementById('roleModal').classList.remove('show');
  setupRoleUI();
  showToast(`✓ Logged in as ${name} — ${roleLabels[selectedRoleTemp]}`);
  addLog('system', `🔐 <strong>${name}</strong> logged in as <strong>${roleLabels[selectedRoleTemp]}</strong>. Role-based access granted.`);
  
  document.getElementById('userPill').style.display = 'flex';
  document.getElementById('userLabel').textContent = name;
  document.getElementById('rolePill').style.display = 'flex';
  document.getElementById('rolePillIcon').textContent = ROLE_FORMS[selectedRoleTemp].icon + ' ';
  document.getElementById('rolePillName').textContent = roleLabels[selectedRoleTemp];
  const roleColorMap = { accent:'rgba(0,212,255,0.4)', accent3:'rgba(57,255,20,0.4)', red:'rgba(255,23,68,0.4)', purple:'rgba(139,92,246,0.4)', warn:'rgba(255,204,0,0.4)', orange:'rgba(255,107,53,0.4)' };
  const colorVar = (ROLE_FORMS[selectedRoleTemp].color.match(/--([a-z0-9]+)/) || [])[1] || 'accent';
  document.getElementById('rolePill').style.borderColor = roleColorMap[colorVar] || roleColorMap.accent;
  document.getElementById('rolePill').style.color = ROLE_FORMS[selectedRoleTemp].color;

  setTimeout(() => runInitialAssessment(), 600);
}

function setupRoleUI() {
  applyRoleAccess();

  // Adjust UI based on role
  if (currentRole === 'medic') {
    addLog('system', '🏥 Hospital mode active — essential treatment and patient status features enabled.');
  } else if (currentRole === 'surveillance') {
    addLog('system', '🛰️ Main Station mode active — full command dashboard enabled.');
  } else if (currentRole === 'rescuer') {
    addLog('system', '🦺 Rescue Worker mode active — essential field operations only.');
  } else if (currentRole === 'danger') {
    addLog('system', '🆘 Victim mode active — essential SOS and status features only.');
  }
}

function getAllowedTabsForRole(role) {
  return ROLE_ALLOWED_TABS[role] || ROLE_ALLOWED_TABS.surveillance;
}

function extractTabNameFromElement(tabEl) {
  const onclickAttr = tabEl.getAttribute('onclick') || '';
  const match = onclickAttr.match(/switchTab\('([^']+)'/);
  return match ? match[1] : null;
}

function applyRoleAccess() {
  const role = currentRole || 'surveillance';
  const allowedTabs = getAllowedTabsForRole(role);
  allowedTabsForCurrentRole = new Set(allowedTabs);

  const workspace = document.querySelector('.workspace');
  const left = document.querySelector('.left');
  const right = document.querySelector('.right');
  const center = document.querySelector('.center');

  // Victim/danger role — replace the entire workspace with a clean SOS status screen
  if (role === 'danger') {
    if (left) left.style.display = 'none';
    if (right) right.style.display = 'none';
    if (workspace) workspace.style.gridTemplateColumns = '1fr';
    if (center) {
      center.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:20px;padding:40px;text-align:center">
          <div style="font-size:64px;animation:blink 0.8s ease-in-out infinite">🆘</div>
          <div style="font-family:'Orbitron',sans-serif;font-size:20px;font-weight:900;color:var(--red);letter-spacing:3px">SOS TRANSMITTED</div>
          <div style="max-width:420px;font-size:12px;color:var(--text2);line-height:1.8">
            Your emergency has been broadcast to all rescue teams in the Maharashtra mesh network.<br>
            <strong style="color:var(--text)">Stay calm. Remain in place if safe.</strong>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;width:100%;max-width:380px">
            <div style="padding:12px 16px;background:rgba(255,23,68,0.07);border:1px solid rgba(255,23,68,0.25);border-radius:4px;font-size:10px;color:var(--text2);text-align:left;line-height:1.8">
              📍 Location broadcast to all rescue nodes<br>
              🚁 Nearest drone dispatched to your area<br>
              🚑 Rescue team alerted — ETA being calculated<br>
              📦 SOS logged to IPFS mesh for redundancy
            </div>
            <div style="padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:4px;font-size:10px;color:var(--text3);text-align:left;line-height:2">
              <div style="color:var(--text2);font-weight:700;margin-bottom:4px">WHILE YOU WAIT:</div>
              Move to highest ground available · Signal with bright cloth or light · Keep phone charged · Do not attempt to cross floodwater
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:8px">
            <button onclick="document.getElementById('roleModal').classList.add('show')" style="padding:8px 20px;background:rgba(255,23,68,0.12);border:1px solid rgba(255,23,68,0.4);border-radius:3px;color:var(--red);font-family:'JetBrains Mono',monospace;font-size:10px;cursor:pointer;letter-spacing:1px">🆘 SEND ANOTHER SOS</button>
            <button onclick="window.open('family-search.html','_blank')" style="padding:8px 20px;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);border-radius:3px;color:var(--accent);font-family:'JetBrains Mono',monospace;font-size:10px;cursor:pointer;letter-spacing:1px">👨‍👩‍👧 FAMILY SEARCH</button>
          </div>
          <div style="font-size:9px;color:var(--text3);margin-top:8px">Emergency line: 112 · Flood helpline: 1078 · NDRF: 011-24363260</div>
        </div>`;
    }
    return;
  }

  if (role === 'surveillance') {
    if (left) left.style.display = '';
    if (right) right.style.display = '';
    if (workspace) workspace.style.gridTemplateColumns = '264px 1fr 316px';
  } else {
    if (left) left.style.display = 'none';
    if (right) right.style.display = 'none';
    if (workspace) workspace.style.gridTemplateColumns = '1fr';
  }

  const tabs = Array.from(document.querySelectorAll('#mainTabs .tab'));
  tabs.forEach((tabEl) => {
    const tabName = extractTabNameFromElement(tabEl);
    if (!tabName) return;
    const allowed = allowedTabsForCurrentRole.has(tabName);
    tabEl.style.display = allowed ? '' : 'none';

    const contentEl = document.getElementById('tab-' + tabName);
    if (contentEl) contentEl.style.display = allowed ? '' : 'none';
  });

  const rescuedForm = document.getElementById('rescuedForm');
  if (rescuedForm) {
    const canLogRescues = role === 'rescuer' || role === 'surveillance';
    rescuedForm.style.display = canLogRescues ? '' : 'none';
  }

  const mapTools = document.getElementById('mapTools');
  if (mapTools) {
    const canUseRouting = role === 'rescuer' || role === 'surveillance';
    mapTools.style.display = canUseRouting ? '' : 'none';
  }

  const compensationPanel = document.getElementById('compensationList');
  if (compensationPanel) {
    const canSeeComp = role === 'medic' || role === 'surveillance';
    compensationPanel.style.display = canSeeComp ? '' : 'none';
  }

  const activeTab = document.querySelector('#mainTabs .tab.active');
  const activeTabName = activeTab ? extractTabNameFromElement(activeTab) : null;
  if (!activeTabName || !allowedTabsForCurrentRole.has(activeTabName)) {
    const firstAllowedTab = tabs.find((tabEl) => {
      const tabName = extractTabNameFromElement(tabEl);
      return !!tabName && allowedTabsForCurrentRole.has(tabName);
    });
    if (firstAllowedTab) {
      const firstAllowedTabName = extractTabNameFromElement(firstAllowedTab);
      switchTab(firstAllowedTabName, firstAllowedTab);
    }
  }
}

function roleCanAccess(action) {
  const role = currentRole || 'surveillance';
  const access = {
    log_rescued: ['rescuer', 'surveillance'],
    update_treatment: ['medic', 'surveillance'],
    file_compensation: ['medic', 'surveillance'],
    dispatch_drones: ['surveillance'],
    disburse_funds: ['surveillance'],
    mint_hypercert: ['surveillance'],
  };
  const allowedRoles = access[action] || ['surveillance'];
  return allowedRoles.includes(role);
}

function fireSOS(name, location, type, count, condition) {
  const sosId = 'SOS-' + Date.now().toString(36).toUpperCase().slice(-6);
  
  document.getElementById('sosDetails').innerHTML = `
    SOS ID: <strong>${sosId}</strong><br>
    Name: <strong>${name}</strong><br>
    Location: <strong>${location}</strong><br>
    Emergency: <strong>${type}</strong><br>
    People at location: <strong>${count}</strong><br>
    ${condition ? `Conditions: ${condition}<br>` : ''}
    Time: <strong>${new Date().toLocaleTimeString()}</strong>
  `;
  document.getElementById('sosModal').classList.add('show');
  
  addLog('alert', `🆘 SOS BEACON — <strong>${sosId}</strong><br>
    📍 <strong>${location}</strong> · ${type}<br>
    👥 ${count} person(s) · ${name}<br>
    <span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--warn)">⚡ Rescue teams alerted · Nearest drone dispatched · All mesh nodes notified</span>`);
  
  // Auto-log as missing/at-risk
  const mp = { name: name + ' (SOS)', zone: 'UNLOCATED', note: `${type} at ${location} — ${count} people`, time: new Date().toLocaleTimeString(), cipher: randHex(40), cid: 'Qm' + randHex(22).toUpperCase() };
  missingPersons.unshift(mp);
  renderMissingPersons();
  
  showToast(`🆘 SOS broadcast — ${sosId}`);
}

function skipVerify() {
  document.getElementById('roleModal').classList.remove('show');
  currentUser = { id: 'demo.near', trust: 'DEMO', role: 'surveillance' };
  currentRole = 'surveillance';
  applyRoleAccess();
  document.getElementById('userPill').style.display = 'flex';
  document.getElementById('userLabel').textContent = 'MAIN STATION DEMO';
  document.getElementById('rolePill').style.display = 'flex';
  document.getElementById('rolePillIcon').textContent = '🛰️ ';
  document.getElementById('rolePillName').textContent = 'MAIN STATION';
  addLog('system', 'Running in Main Station demo mode — full features available.');
  setTimeout(() => runInitialAssessment(), 400);
}

function logoutUser() {
  currentUser = null; currentRole = null;
  document.getElementById('userPill').style.display = 'none';
  document.getElementById('rolePill').style.display = 'none';
  showToast('Logged out');
}

// ==============================================================
// RESCUED PERSONS TRACKER
// ==============================================================
let rescuedIdCounter = 1;

function logRescuedPerson() {
  if (!roleCanAccess('log_rescued')) {
    showToast('Only Rescue Worker or Main Station can log rescued persons');
    return;
  }

  const name = document.getElementById('rescuedName').value.trim() || `Unknown-${String(rescuedIdCounter).padStart(3,'0')}`;
  const age = document.getElementById('rescuedAge').value.trim();
  const zone = document.getElementById('rescuedZone').value.trim();
  const gender = document.getElementById('rescuedGender').value;
  const condition = document.getElementById('rescuedCondition').value;
  const notes = document.getElementById('rescuedNotes').value.trim();
  const rescuerName = document.getElementById('rescuedRescuerName').value.trim() || (currentUser ? currentUser.id : 'Unknown rescuer');

  if (!condition) { showToast('Please select initial condition'); return; }
  if (!zone) { showToast('Please enter rescue zone'); return; }

  const conditionLabels = {
    critical: '🔴 CRITICAL', serious: '🟠 SERIOUS', stable: '🟡 STABLE', minor: '🟢 MINOR', uninjured: '✅ UNINJURED'
  };

  const person = {
    id: 'RSC-' + (Date.now().toString(36).toUpperCase().slice(-6)),
    name, age: age || 'Unknown', zone, gender: gender || 'Not specified',
    initialCondition: condition,
    initialConditionLabel: conditionLabels[condition],
    notes,
    rescuerName,
    rescueTime: new Date().toLocaleTimeString(),
    rescueDate: new Date().toLocaleDateString('en-IN'),
    currentStatus: 'awaiting_treatment',
    treatmentRecords: [],
    deceased: false,
    compensationFiled: false
  };

  rescuedPersons.unshift(person);
  rescuedIdCounter++;
  renderRescuedPersons();
  updateRescuedCount();

  // Update stats
  const statEl = document.getElementById('statRescued');
  if (statEl) statEl.textContent = rescuedPersons.length;

  // Clear form
  document.getElementById('rescuedName').value = '';
  document.getElementById('rescuedAge').value = '';
  document.getElementById('rescuedZone').value = '';
  document.getElementById('rescuedGender').value = '';
  document.getElementById('rescuedCondition').value = '';
  document.getElementById('rescuedNotes').value = '';
  document.getElementById('rescuedRescuerName').value = '';

  addLog('info', `🦺 PERSON RESCUED — <strong>${name}</strong><br>
    Zone: ${zone} · Condition: ${conditionLabels[condition]} · Rescuer: ${rescuerName}<br>
    <span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3)">ID: ${person.id} · ${person.rescueDate} ${person.rescueTime}</span>`);
  showToast(`🦺 ${name} logged — ID: ${person.id}`);
  broadcastToMesh({ type: 'rescued_person', person });
}

function renderRescuedPersons() {
  const el = document.getElementById('rescuedList');
  if (!rescuedPersons.length) {
    el.innerHTML = '<div class="rescued-empty">No persons logged yet. Use the form above to log a rescued person.</div>';
    return;
  }

  const conditionColors = {
    critical: 'var(--red)', serious: 'var(--orange)', stable: 'var(--warn)',
    minor: 'var(--accent3)', uninjured: 'var(--accent3)'
  };

  const statusLabels = {
    awaiting_treatment: '⏳ AWAITING TREATMENT',
    recovering: '🟢 RECOVERING',
    treated: '✅ TREATED & DISCHARGED',
    transferred: '🔄 TRANSFERRED',
    critical: '🔴 CRITICAL CARE',
    deceased: '⚰ DECEASED',
  };
  const statusColors = {
    awaiting_treatment: 'var(--warn)', recovering: 'var(--accent3)', treated: 'var(--accent3)',
    transferred: 'var(--accent)', critical: 'var(--red)', deceased: 'var(--text3)'
  };

  const canUpdateTreatment = currentRole === 'medic' || currentRole === 'surveillance' || currentRole === null;

  el.innerHTML = rescuedPersons.map(p => {
    const latestTreatment = p.treatmentRecords.length > 0 ? p.treatmentRecords[p.treatmentRecords.length - 1] : null;
    const treatBtn = canUpdateTreatment ? `<button class="drone-btn dispatch" style="font-size:8px;padding:3px 8px" onclick="openTreatmentModal('${p.id}')">🏥 UPDATE TREATMENT</button>` : '';
    const compBtn = p.deceased && !p.compensationFiled ? `<button class="drone-btn" style="font-size:8px;padding:3px 8px;border-color:rgba(255,23,68,0.4);color:var(--red);background:rgba(255,23,68,0.08)" onclick="openCompensationModal('${p.id}')">⚰ FILE COMPENSATION</button>` : '';
    const compDone = p.compensationFiled ? `<span style="font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--text3);padding:3px 8px">✓ COMPENSATION FILED</span>` : '';

    return `
    <div class="rescued-card ${p.deceased ? 'deceased' : ''}" id="rcard-${p.id}">
      <div class="rescued-card-top">
        <div class="rescued-id">${p.id}</div>
        <div class="rescued-status" style="color:${statusColors[p.currentStatus]}">${statusLabels[p.currentStatus] || p.currentStatus}</div>
      </div>
      <div class="rescued-name">${p.name}</div>
      <div class="rescued-meta">
        ${p.age !== 'Unknown' ? `Age: ${p.age} · ` : ''}${p.gender !== 'Not specified' ? `${p.gender} · ` : ''}Zone ${p.zone} · ${p.rescueDate} ${p.rescueTime}
      </div>
      <div class="rescued-condition-row">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--text3);margin-bottom:2px">INITIAL CONDITION</div>
          <div class="rescued-cond-badge" style="color:${conditionColors[p.initialCondition]};border-color:${conditionColors[p.initialCondition]}20">${p.initialConditionLabel}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--text3);margin-bottom:2px">AFTER TREATMENT</div>
          <div class="rescued-cond-badge" style="color:${statusColors[p.currentStatus]};border-color:${statusColors[p.currentStatus]}20">${statusLabels[p.currentStatus] || '—'}</div>
        </div>
      </div>
      ${p.notes ? `<div class="rescued-notes">${p.notes}</div>` : ''}
      ${latestTreatment ? `
        <div class="rescued-treatment-row">
          <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--text3)">LAST TREATMENT · ${latestTreatment.time}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">${latestTreatment.notes}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--text3);margin-top:2px">By: ${latestTreatment.medic} ${latestTreatment.facility ? '· ' + latestTreatment.facility : ''}</div>
        </div>
      ` : ''}
      ${p.treatmentRecords.length > 1 ? `<div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--text3);margin-top:4px">📋 ${p.treatmentRecords.length} treatment records total</div>` : ''}
      <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--text3);margin-top:6px">🦺 Rescued by: ${p.rescuerName}</div>
      <div class="rescued-actions">
        ${treatBtn}
        ${compBtn}
        ${compDone}
      </div>
    </div>`;
  }).join('');
}

function updateRescuedCount() {
  const el = document.getElementById('rescuedCount');
  if (el) el.textContent = `${rescuedPersons.length} LOGGED`;
}

// ==============================================================
// TREATMENT MODAL
// ==============================================================
function openTreatmentModal(personId) {
  if (!roleCanAccess('update_treatment')) {
    showToast('Only Hospital or Main Station can update treatment');
    return;
  }

  treatmentTargetId = personId;
  const p = rescuedPersons.find(x => x.id === personId);
  if (!p) return;

  document.getElementById('treatmentModalPersonInfo').innerHTML = `
    ID: ${p.id} · ${p.name} · Zone ${p.zone}<br>
    Initial condition: ${p.initialConditionLabel}<br>
    Rescue time: ${p.rescueDate} ${p.rescueTime}
  `;
  document.getElementById('treatmentStatus').value = '';
  document.getElementById('treatmentNotes').value = '';
  document.getElementById('treatmentMedicName').value = currentUser?.id || '';
  document.getElementById('treatmentFacility').value = '';
  document.getElementById('treatmentModal').classList.add('show');
}

function closeTreatmentModal() {
  document.getElementById('treatmentModal').classList.remove('show');
  treatmentTargetId = null;
}

function saveTreatmentRecord() {
  if (!roleCanAccess('update_treatment')) {
    showToast('Only Hospital or Main Station can update treatment');
    return;
  }

  const status = document.getElementById('treatmentStatus').value;
  const notes = document.getElementById('treatmentNotes').value.trim();
  const medic = document.getElementById('treatmentMedicName').value.trim();
  const facility = document.getElementById('treatmentFacility').value.trim();

  if (!status) { showToast('Please select a status'); return; }
  if (!notes) { showToast('Please add treatment notes'); return; }

  const p = rescuedPersons.find(x => x.id === treatmentTargetId);
  if (!p) return;

  const record = {
    status, notes, medic: medic || 'Unknown medic',
    facility, time: new Date().toLocaleTimeString(),
    date: new Date().toLocaleDateString('en-IN')
  };

  p.treatmentRecords.push(record);
  p.currentStatus = status;
  if (status === 'deceased') {
    p.deceased = true;
    // Create compensation case
    createCompensationCase(p);
  }

  closeTreatmentModal();
  renderRescuedPersons();

  const statusLabels = { recovering:'RECOVERING', treated:'TREATED & DISCHARGED', transferred:'TRANSFERRED', critical:'CRITICAL CARE', deceased:'DECEASED' };
  addLog('info', `🏥 TREATMENT UPDATE — <strong>${p.name}</strong> (${p.id})<br>
    Status: <strong>${statusLabels[status] || status}</strong><br>
    ${notes}<br>
    <span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3)">By: ${medic} ${facility ? '· ' + facility : ''}</span>`);
  showToast(`✓ Treatment record saved for ${p.name}`);

  if (status === 'deceased') {
    showToast(`⚰ ${p.name} marked deceased — compensation case created`);
    setTimeout(() => switchTab('funds', document.querySelector('[onclick="switchTab(\'funds\',this)"]')), 1500);
  }
}

// ==============================================================
// COMPENSATION SYSTEM
// ==============================================================
function createCompensationCase(person) {
  const existing = compensationCases.find(c => c.personId === person.id);
  if (existing) return;

  compensationCases.push({
    personId: person.id,
    name: person.name,
    zone: person.zone,
    rescueTime: person.rescueTime,
    rescueDate: person.rescueDate,
    initialCondition: person.initialConditionLabel,
    deathTime: new Date().toLocaleTimeString(),
    deathDate: new Date().toLocaleDateString('en-IN'),
    familyContact: null,
    amount: null,
    status: 'pending',
    filedBy: currentUser?.id || 'System'
  });

  renderCompensationCases();
  updateCompensationBadge();
}

function openCompensationModal(personId) {
  if (!roleCanAccess('file_compensation')) {
    showToast('Only Hospital or Main Station can file compensation');
    return;
  }

  compensationTargetId = personId;
  const p = rescuedPersons.find(x => x.id === personId);
  if (!p) return;

  document.getElementById('compensationPersonInfo').innerHTML = `
    ID: ${p.id} · ${p.name}<br>
    Zone: ${p.zone} · Initial condition: ${p.initialConditionLabel}<br>
    Rescue: ${p.rescueDate} ${p.rescueTime}
  `;
  document.getElementById('compFamilyName').value = '';
  document.getElementById('compPhone').value = '';
  document.getElementById('compRelation').value = '';
  document.getElementById('compAmount').value = '';
  document.getElementById('compNotes').value = '';
  document.getElementById('compensationModal').classList.add('show');
}

function closeCompensationModal() {
  document.getElementById('compensationModal').classList.remove('show');
  compensationTargetId = null;
}

function saveCompensation() {
  if (!roleCanAccess('file_compensation')) {
    showToast('Only Hospital or Main Station can file compensation');
    return;
  }

  const familyName = document.getElementById('compFamilyName').value.trim();
  const phone = document.getElementById('compPhone').value.trim();
  const relation = document.getElementById('compRelation').value.trim();
  const amount = document.getElementById('compAmount').value;
  const notes = document.getElementById('compNotes').value.trim();

  if (!familyName || !amount) { showToast('Please fill family name and compensation tier'); return; }

  const p = rescuedPersons.find(x => x.id === compensationTargetId);
  const c = compensationCases.find(x => x.personId === compensationTargetId);
  if (!p || !c) return;

  c.familyContact = `${familyName} (${relation}) · ${phone}`;
  c.amount = amount;
  c.notes = notes;
  c.status = 'filed';
  c.filedTime = new Date().toLocaleTimeString();
  p.compensationFiled = true;

  closeCompensationModal();
  renderRescuedPersons();
  renderCompensationCases();
  updateCompensationBadge();

  addLog('decision', `⚰ COMPENSATION FILED — <strong>${p.name}</strong> (${p.id})<br>
    Family: ${familyName} (${relation})<br>
    Amount: <strong>${amount}</strong> — queued on Starknet<br>
    <span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3)">Filed by: ${currentUser?.id || 'System'} · IPFS anchored</span>`);
  showToast(`⚰ Compensation claim filed for ${p.name} — ${amount}`);
}

function renderCompensationCases() {
  const el = document.getElementById('compensationList');
  if (!el) return;
  if (!compensationCases.length) {
    el.innerHTML = '<div style="padding:10px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;font-family:\'JetBrains Mono\',monospace;font-size:9px;color:var(--text3);text-align:center">No deceased compensation cases yet.</div>';
    return;
  }
  el.innerHTML = compensationCases.map(c => `
    <div style="background:var(--bg2);border:1px solid ${c.status==='filed'?'var(--border)':'rgba(255,23,68,0.25)'};border-left:2px solid ${c.status==='filed'?'var(--text3)':'var(--red)'};border-radius:4px;padding:10px 12px;margin-bottom:6px;animation:msg-in 0.2s ease-out">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:var(--text)">${c.name}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:${c.status==='filed'?'var(--text3)':'var(--red)'}">
          ${c.status==='filed'?'✓ FILED':'⏳ PENDING'}
        </div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3)">Zone ${c.zone} · ${c.deathDate} ${c.deathTime}</div>
      ${c.familyContact ? `<div style="font-size:11px;color:var(--text2);margin-top:4px">👨‍👩‍👧 ${c.familyContact}</div>` : ''}
      ${c.amount ? `<div style="font-family:'Orbitron',monospace;font-size:14px;color:var(--accent3);margin-top:4px">${c.amount}</div>` : ''}
      ${c.txHash ? `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--accent3);margin-top:4px">⛓ TX: ${c.txHash}</div>` : ''}
      ${c.smsProofAt ? `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3);margin-top:2px">📲 SMS proof sent: ${new Date(c.smsProofAt).toLocaleString()}</div>` : ''}
      ${c.notes ? `<div style="font-size:10px;color:var(--text2);margin-top:4px">${c.notes}</div>` : ''}
      ${c.note ? `<div style="font-size:10px;color:var(--text2);margin-top:4px">${c.note}</div>` : ''}
    </div>
  `).join('');
}

function updateCompensationBadge() {
  const pending = compensationCases.filter((c) => c.status !== 'filed').length;
  const badge = document.getElementById('compensationBadge');
  if (badge) {
    badge.textContent = pending + ' PENDING';
    badge.style.display = pending > 0 ? '' : 'none';
  }
}

// ==============================================================
// ZAMA TFHE
// ==============================================================
async function initTFHE() {
  try {
    const { TfheClientKey, TfheCompactPublicKey, CompactCiphertextList } = await import('https://cdn.jsdelivr.net/npm/tfhe@0.6.4/tfhe.js');
    const clientKey = TfheClientKey.generate();
    const publicKey = TfheCompactPublicKey.new(clientKey);
    window.__tfhe = { clientKey, publicKey, CompactCiphertextList };
    addMeshLog('🔐 Zama TFHE: WASM loaded — FHE encryption active');
  } catch (e) {
    addMeshLog('🔐 Zama TFHE: running in simulation mode');
  }
}

async function fheEncrypt(text) {
  if (window.__tfhe) {
    try {
      const { publicKey, CompactCiphertextList } = window.__tfhe;
      const builder = CompactCiphertextList.builder(publicKey);
      const bytes = new TextEncoder().encode(text.substring(0, 16));
      bytes.forEach(b => builder.push_u8(b));
      const list = builder.build();
      const serialized = list.serialize();
      return Array.from(serialized.slice(0, 20)).map(b => b.toString(16).padStart(2,'0')).join('');
    } catch (e) { return randHex(40); }
  }
  return randHex(40);
}

async function pinToIPFS(data) {
  try {
    const { create } = await import('https://esm.sh/@web3-storage/w3up-client@16');
    const client = await create();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const file = new File([blob], `disasternet-${Date.now()}.json`);
    const cid = await client.uploadFile(file);
    const cidStr = cid.toString();
    addMeshLog(`📦 IPFS pinned: ${cidStr.substring(0,20)}...`);
    return cidStr;
  } catch (e) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(data)));
    const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
    return 'Qm' + hex.substring(0, 44).toUpperCase();
  }
}

// ==============================================================
// API MODAL
// ==============================================================
function closeApiModal(useKey) {
  if (useKey) {
    const key = document.getElementById('apiKeyInput').value.trim();
    if (!key.startsWith('sk-ant-')) { alert('Please enter a valid Anthropic API key (starts with sk-ant-)'); return; }
    apiKey = key;
    sessionStorage.setItem('dnet_key', key);
    simMode = false;
    updateAIStatus();
    showToast('⚡ Impulse AI activated');
  } else {
    simMode = true; updateAIStatus();
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
    const droneBadge = z.droneRequired ? '<span class="badge badge-cyan" style="font-size:8px;padding:1px 4px">DRONE REQUIRED</span>' : '';
    el.innerHTML += `
      <div class="zone-card" id="zc${i}" onclick="selectZone(${i})">
        <div class="zone-top">
          <span class="zone-id">ZONE ${z.id}</span>
          <span style="display:flex;align-items:center;gap:6px"><span class="sev sev-${z.sev}">${z.sev}</span>${droneBadge}</span>
        </div>
        <div class="zone-name">${z.name}</div>
        <div class="zone-stats"><span>👥 ${z.victims}</span><span>🚑 ${z.resources} units</span></div>
        <div class="zone-bar"><div class="zone-fill" style="width:${pct}%;background:${col}"></div></div>
      </div>`;
  });
}

function selectZone(i) {
  document.querySelectorAll('.zone-card').forEach(c => c.classList.remove('active'));
  document.getElementById('zc' + i).classList.add('active');
}

// ==============================================================
// MAP
// ==============================================================
function getZoneById(zoneId) {
  return ZONES.find((z) => z.id === zoneId) || null;
}

function hydrateZoneDroneFlags() {
  ZONES.forEach((zone) => {
    zone.droneRequired = droneRequiredZones.has(zone.id);
  });
}

function saveRoadStatuses() {
  localStorage.setItem('dnet_road_status_v1', JSON.stringify(roadStatusById));
}

function saveDroneRequiredZones() {
  localStorage.setItem('dnet_drone_required_v1', JSON.stringify(Array.from(droneRequiredZones)));
}

function setMapRouteStatus(text) {
  const el = document.getElementById('mapRouteStatus');
  if (el) el.textContent = text;
}

function getRoadStatus(edgeId) {
  return roadStatusById[edgeId] || 'clear';
}

function roadTraversalCost(edge) {
  const status = getRoadStatus(edge.id);
  if (status === 'blocked') return Infinity;
  if (status === 'risky') return edge.baseCost * 2.2;
  return edge.baseCost;
}

function initMapToolSelectors() {
  const fromEl = document.getElementById('routeFromZone');
  const toEl = document.getElementById('routeToZone');
  if (!fromEl || !toEl) return;

  const options = ZONES.map((zone) => `<option value="${zone.id}">${zone.id} — ${zone.name}</option>`).join('');
  fromEl.innerHTML = options;
  toEl.innerHTML = options;
  fromEl.value = 'D1';
  toEl.value = 'B1';
}

function setRoadPaintMode(mode) {
  currentRoadPaintMode = mode;
  ['clear', 'risky', 'blocked'].forEach((m) => {
    const btn = document.getElementById(`roadMode${m.charAt(0).toUpperCase() + m.slice(1)}`);
    if (!btn) return;
    if (m === mode) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  setMapRouteStatus(`Road marking mode: ${mode.toUpperCase()}. Tap any road segment on map.`);
}

function renderMap() {
  const mapContainer = document.getElementById('mapContent');
  if (!mapContainer) return;
  if (typeof L === 'undefined') {
    mapContainer.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;font-size:10px;text-align:center;padding:20px">
      <div style="font-size:28px">🗺</div>
      <div style="color:var(--warn);font-weight:700;letter-spacing:1px">MAP OFFLINE</div>
      <div>Leaflet CDN unavailable — check internet connection.</div>
      <div style="font-size:9px">Zone data and all other features remain operational.</div>
      <button onclick="location.reload()" style="margin-top:8px;padding:5px 14px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);border-radius:3px;color:var(--accent);cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px">↺ RETRY</button>
    </div>`;
    return;
  }

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  mapContainer.innerHTML = '';

  mapInstance = L.map('mapContent', {
    zoomControl: true,
    attributionControl: true,
    preferCanvas: true,
  }).setView([19.10, 74.40], 7);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 14,
    minZoom: 6,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(mapInstance);

  zoneMarkersById = {};
  ZONES.forEach((zone) => {
    const coords = ZONE_COORDS[zone.id];
    if (!coords) return;

    const severityColors = {
      critical: '#ff1744',
      high: '#ff6b35',
      medium: '#ffcc00',
      low: '#00c851',
    };
    const markerColor = zone.droneRequired ? '#00d4ff' : (severityColors[zone.sev] || '#00d4ff');

    const marker = L.circleMarker(coords, {
      radius: zone.droneRequired ? 9 : 7,
      color: markerColor,
      weight: 2,
      fillColor: markerColor,
      fillOpacity: 0.22,
    }).addTo(mapInstance);

    marker.bindPopup(
      `<strong>Zone ${zone.id} — ${zone.name}</strong><br>${zone.detail}<br>` +
      `Victims: ${zone.victims} · Resources: ${zone.resources}` +
      (zone.droneRequired ? '<br><span style="color:#00d4ff;font-weight:700">DRONE REQUIRED</span>' : '')
    );

    marker.on('click', () => {
      const idx = ZONES.findIndex((z) => z.id === zone.id);
      if (idx >= 0) selectZone(idx);
    });

    zoneMarkersById[zone.id] = marker;
  });

  roadLayersById = {};
  ROAD_EDGES.forEach((edge) => {
    const status = getRoadStatus(edge.id);
    const layer = L.polyline(edge.points, {
      color: ROAD_STATUS_COLORS[status],
      weight: status === 'blocked' ? 6 : 5,
      opacity: status === 'blocked' ? 0.9 : 0.75,
      dashArray: status === 'risky' ? '8 8' : null,
    }).addTo(mapInstance);

    layer.bindTooltip(`${edge.from} ↔ ${edge.to} · ${status.toUpperCase()}`, { sticky: true });
    layer.on('click', () => {
      setRoadStatus(edge.id, currentRoadPaintMode, { shouldBroadcast: true, source: 'local' });
    });

    roadLayersById[edge.id] = layer;
  });

  if (routeLayer) {
    routeLayer.remove();
    routeLayer = null;
  }

  renderDroneOverlay();
  renderVulnerableOverlay();
  setMapRouteStatus('Offline routing ready. Tap roads to update status.');
}

function setRoadStatus(edgeId, status, options = {}) {
  const edge = ROAD_EDGES.find((r) => r.id === edgeId);
  if (!edge) return;

  roadStatusById[edgeId] = status;
  saveRoadStatuses();

  const layer = roadLayersById[edgeId];
  if (layer) {
    layer.setStyle({
      color: ROAD_STATUS_COLORS[status],
      weight: status === 'blocked' ? 6 : 5,
      opacity: status === 'blocked' ? 0.9 : 0.75,
      dashArray: status === 'risky' ? '8 8' : null,
    });
    layer.setTooltipContent(`${edge.from} ↔ ${edge.to} · ${status.toUpperCase()}`);
  }

  setMapRouteStatus(`Road ${edge.from} ↔ ${edge.to} set to ${status.toUpperCase()}.`);
  addMeshLog(`🛣 ${edge.from} ↔ ${edge.to} marked ${status.toUpperCase()}`);

  if (options.shouldBroadcast) {
    broadcastToMesh({
      type: 'road_status',
      edgeId,
      status,
      by: NODE_ID,
      ts: Date.now(),
    });
  }
}

function buildRoadGraph() {
  const graph = {};
  ROAD_EDGES.forEach((edge) => {
    const cost = roadTraversalCost(edge);
    if (!Number.isFinite(cost)) return;

    if (!graph[edge.from]) graph[edge.from] = [];
    if (!graph[edge.to]) graph[edge.to] = [];

    graph[edge.from].push({ to: edge.to, edgeId: edge.id, cost });
    graph[edge.to].push({ to: edge.from, edgeId: edge.id, cost });
  });
  return graph;
}

function haversineKm(a, b) {
  const toRad = (v) => v * Math.PI / 180;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return 6371 * c;
}

function computeAStarPath(fromZoneId, toZoneId) {
  const graph = buildRoadGraph();
  if (!graph[fromZoneId] || !graph[toZoneId]) return null;

  const open = new Set([fromZoneId]);
  const cameFrom = {};
  const gScore = {};
  const fScore = {};

  ZONES.forEach((z) => {
    gScore[z.id] = Infinity;
    fScore[z.id] = Infinity;
  });

  gScore[fromZoneId] = 0;
  fScore[fromZoneId] = haversineKm(ZONE_COORDS[fromZoneId], ZONE_COORDS[toZoneId]);

  while (open.size > 0) {
    let current = null;
    open.forEach((node) => {
      if (current === null || fScore[node] < fScore[current]) current = node;
    });

    if (current === toZoneId) {
      const path = [current];
      const edgePath = [];
      while (cameFrom[current]) {
        edgePath.unshift(cameFrom[current].edgeId);
        current = cameFrom[current].node;
        path.unshift(current);
      }
      return { zones: path, edges: edgePath, cost: gScore[toZoneId] };
    }

    open.delete(current);
    const neighbors = graph[current] || [];
    neighbors.forEach((neighbor) => {
      const tentative = gScore[current] + neighbor.cost;
      if (tentative < gScore[neighbor.to]) {
        cameFrom[neighbor.to] = { node: current, edgeId: neighbor.edgeId };
        gScore[neighbor.to] = tentative;
        fScore[neighbor.to] = tentative + haversineKm(ZONE_COORDS[neighbor.to], ZONE_COORDS[toZoneId]);
        open.add(neighbor.to);
      }
    });
  }

  return null;
}

function drawRoute(route) {
  if (!mapInstance) return;

  if (routeLayer) {
    routeLayer.remove();
    routeLayer = null;
  }

  const points = route.zones.map((zoneId) => ZONE_COORDS[zoneId]).filter(Boolean);
  routeLayer = L.polyline(points, {
    color: '#00d4ff',
    weight: 4,
    opacity: 0.95,
    dashArray: '10 6',
  }).addTo(mapInstance);
}

function flagZoneDroneRequired(zoneId, reason, options = {}) {
  if (droneRequiredZones.has(zoneId)) return;
  droneRequiredZones.add(zoneId);
  saveDroneRequiredZones();

  const zone = getZoneById(zoneId);
  if (zone) zone.droneRequired = true;
  renderZones();

  const marker = zoneMarkersById[zoneId];
  if (marker) {
    marker.setStyle({ color: '#00d4ff', fillColor: '#00d4ff', radius: 9, fillOpacity: 0.28 });
  }

  addLog('alert', `🚁 DRONE REQUIRED — Zone ${zoneId}<br>${reason}`);
  setMapRouteStatus(`No road route available to Zone ${zoneId}. Zone flagged as DRONE REQUIRED.`);

  if (options.shouldBroadcast) {
    broadcastToMesh({ type: 'drone_required', zoneId, reason, ts: Date.now(), by: NODE_ID });
  }
}

function calculateOfflineRoute() {
  const fromEl = document.getElementById('routeFromZone');
  const toEl = document.getElementById('routeToZone');
  if (!fromEl || !toEl) return;

  const fromZoneId = fromEl.value;
  const toZoneId = toEl.value;

  if (!fromZoneId || !toZoneId || fromZoneId === toZoneId) {
    setMapRouteStatus('Pick different FROM and TO zones to compute route.');
    return;
  }

  const route = computeAStarPath(fromZoneId, toZoneId);
  if (!route) {
    flagZoneDroneRequired(
      toZoneId,
      `Offline A* could not find valid path from ${fromZoneId}. Road network blocked; queue scout drone mission.`,
      { shouldBroadcast: true }
    );
    return;
  }

  drawRoute(route);
  const blockedRoads = ROAD_EDGES.filter((edge) => getRoadStatus(edge.id) === 'blocked').length;
  setMapRouteStatus(`Route ${fromZoneId} → ${toZoneId}: ${route.zones.join(' → ')} · cost ${Math.round(route.cost)} · blocked roads ${blockedRoads}.`);
  addMeshLog(`🧭 Offline A* route ${fromZoneId} → ${toZoneId}: ${route.zones.join(' → ')}`);
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
}

// ==============================================================
// SUBMIT REPORT
// ==============================================================
async function submitReport() {
  const txt = document.getElementById('reportInput')?.value?.trim();
  if (!txt) return;
  addLog('alert', `📍 Field report: <strong>${txt}</strong>`);
  document.getElementById('reportInput').value = '';
  setThinking(true);
  document.getElementById('agentSub').textContent = 'PROCESSING FIELD DATA...';
  broadcastToMesh({ type:'field_report', text: txt });
  const cid = await pinToIPFS({ report: txt, ts: Date.now(), node: NODE_ID });
  if (simMode || !apiKey) await simulatedDecision(txt, cid);
  else await callClaude(txt, cid);
  setThinking(false);
  document.getElementById('agentSub').textContent = 'MONITORING — READY';
  if (currentUser && Math.random() > 0.5) {
    const zone = txt.match(/Zone\s+(\w+)/i)?.[1] || 'FIELD';
    addHypercert({ name: currentUser.id, action: txt.substring(0,60)+'...', zone, trust: currentUser.trust });
  }
}

async function callClaude(report, cid) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:350, system:SYSTEM_PROMPT, messages:[{role:'user',content:report}] })
    });
    const data = await res.json();
    if (data.content?.[0]) {
      addLog('decision', data.content[0].text + `<br><span style="font-family:JetBrains Mono,monospace;font-size:9px;color:var(--text3)">📦 IPFS: ${cid.substring(0,24)}...</span>`);
      updateResourcesRandom();
    } else if (data.error) {
      simMode = true; updateAIStatus();
      await simulatedDecision(report, cid);
    }
  } catch (e) { simMode = true; updateAIStatus(); await simulatedDecision(report, cid); }
}

async function simulatedDecision(txt, cid) {
  await new Promise(r => setTimeout(r, 1600 + Math.random()*800));
  const lc = txt.toLowerCase();
  const cidStr = cid || ('Qm' + randHex(22).toUpperCase());
  let resp;
  if (lc.includes('oxygen') || lc.includes('hospital') || lc.includes('critical'))
    resp = `⚡ DECISION: Medical emergency escalated. FHE-encrypted data share from Zone C3 hospital to Nashik Medical Hub via Lit Protocol. Helicopter from Zone G1 redirected. 3 field medics reassigned from Zone F2. Hypercert minting authorized.`;
  else if (lc.includes('bridge') || lc.includes('road') || lc.includes('block'))
    resp = `⚡ DECISION: Route obstruction confirmed. Diverting Supply Convoy 4 via NH166 — ETA +38min to Zone B1. Zone D1 rescue team redirected. Starknet contract updated with route deviation log.`;
  else if (lc.includes('flood') || lc.includes('water') || lc.includes('stranded'))
    resp = `⚡ DECISION: Flood rescue activated. Dispatching 3 boats from Zone E4 reserve. Rescue window 3.5hrs. NEAR-verified volunteer Squad 7 activated. Hypercert minting queued.`;
  else
    resp = `⚡ DECISION: Report processed. Severity assessed HIGH. Zone D1 team dispatched (ETA 18min). Field data encrypted and broadcast to 3 mesh nodes. 2 medics reassigned.`;
  addLog('decision', resp + `<br><span style="font-family:JetBrains Mono,monospace;font-size:9px;color:var(--text3)">📦 IPFS: ${cidStr.substring(0,24)}...</span>`);
  updateResourcesRandom();
}

async function runInitialAssessment() {
  setThinking(true);
  document.getElementById('agentSub').textContent = 'SCANNING ALL ZONES...';
  if (simMode || !apiKey) {
    await new Promise(r => setTimeout(r, 1800));
    addLog('info', `🔍 INITIAL SCAN COMPLETE: 7 zones active. Priority: C3 (oxygen critical) → A2 (240 victims) → B1 (route blocked). Helicopter 2 → C3. Convoy 1 rerouted via NH48 → A2. FHE sync active.`);
  } else {
    const cid = await pinToIPFS({ type:'initial_scan', ts:Date.now(), node:NODE_ID });
    await callClaude(`Initial situation report: Maharashtra flood. Zones: A2 CRITICAL 240 victims, B1 CRITICAL 80 stranded, C3 CRITICAL oxygen shortage, D1 HIGH 130 victims, E4 HIGH 60 victims. Provide priority assessment.`, cid);
  }
  setThinking(false);
  document.getElementById('agentSub').textContent = 'MONITORING — READY';
}

function randHex(n) { return Array.from({length:n},()=>Math.floor(Math.random()*16).toString(16)).join(''); }

// ==============================================================
// RESOURCES
// ==============================================================
function renderResources() {
  document.getElementById('resList').innerHTML = RESOURCES.map(r => {
    const pct = Math.round(r.deployed/r.total*100);
    return `<div class="res-item">
      <div class="res-top"><span class="res-name">${r.name}</span><span class="res-count">${r.deployed}/${r.total}</span></div>
      <div class="res-bar"><div class="res-fill" style="width:${pct}%;background:${r.color}"></div></div>
      <div class="res-note">${pct}% deployed · ${r.total-r.deployed} in reserve</div>
    </div>`;
  }).join('');
}

function updateResourcesRandom() {
  RESOURCES.forEach(r => { if (Math.random() > 0.4) r.deployed = Math.min(r.total, r.deployed + 1); });
  renderResources();
}

// ==============================================================
// MISSING PERSONS / FHE
// ==============================================================
async function logMissingPerson() {
  const name = document.getElementById('mpName').value.trim();
  const zone = document.getElementById('mpZone').value.trim();
  const note = document.getElementById('mpNote').value.trim();
  const phone = document.getElementById('mpPhone')?.value?.trim() || '';
  if (!name || !zone) { showToast('Please fill in name and zone'); return; }
  showToast('🔐 Encrypting with Zama TFHE...');
  const cipher = await fheEncrypt(name + '|' + zone + '|' + note);
  const cid = await pinToIPFS({ name_enc:cipher, zone, note, ts:Date.now(), node:NODE_ID });
  const rec = {
    id: 'LOCAL-' + Date.now().toString(36).toUpperCase(),
    name,
    zone,
    note,
    phone,
    status: 'Missing',
    updatedAt: new Date().toISOString(),
    time:new Date().toLocaleTimeString(),
    cipher,
    cid,
    anchorCid: cid,
    deceasedConfirmations: 0,
    compensation: null,
  };

  const reporterRole = currentRole === 'surveillance' ? 'surveillance' : (currentRole || 'rescuer');
  const backendRes = await postJsonSafe(`${SYNC_API_BASE}/api/v1/persons`, {
    name,
    phone,
    lastSeenZone: zone,
    note,
    anchorCid: cid,
    reporterId: currentUser?.id || NODE_ID,
    reporterRole,
  });

  if (backendRes.ok && backendRes.data?.person) {
    upsertMissingPersonLocal(backendRes.data.person);
  } else {
    missingPersons.unshift(rec);
  }

  renderMissingPersons();
  document.getElementById('mpName').value = '';
  document.getElementById('mpZone').value = '';
  document.getElementById('mpNote').value = '';
  const mpPhoneEl = document.getElementById('mpPhone');
  if (mpPhoneEl) mpPhoneEl.value = '';
  broadcastToMesh({ type:'missing_person', record:rec });
  addMeshLog(`📋 Missing person FHE-encrypted: ${name}`);
  showToast(`🔒 ${name} logged · FHE encrypted`);
}

async function updateMissingPersonStatus(personId) {
  const selectEl = document.getElementById(`mpStatus_${personId}`);
  if (!selectEl) return;

  const newStatus = selectEl.value;
  if (!newStatus) return;

  const person = missingPersons.find((p) => p.id === personId);
  if (!person) return;

  const actorRole = currentRole === 'surveillance' ? 'surveillance' : (currentRole || 'rescuer');
  const payload = {
    status: newStatus,
    actorId: currentUser?.id || NODE_ID,
    actorRole,
    note: `Status updated from dashboard by ${currentUser?.id || NODE_ID}`,
    lastSeenZone: person.zone,
  };

  const res = await postJsonSafe(`${SYNC_API_BASE}/api/v1/persons/${personId}/status`, payload);
  if (!res.ok) {
    showToast(res.data?.message || 'Status update failed');
    return;
  }

  if (res.data?.person) upsertMissingPersonLocal(res.data.person);
  renderMissingPersons();

  if (newStatus === 'Deceased' && res.data?.deceasedConfirmations < 2) {
    showToast(`Deceased confirmation recorded (${res.data.deceasedConfirmations}/2)`);
  } else {
    showToast(`Status updated to ${newStatus}`);
  }

  if (res.data?.compensation?.txHash) {
    addLog('decision', `💸 AUTO COMPENSATION TRIGGERED — ${res.data.person.name}<br>Tx: ${res.data.compensation.txHash}`);
    showToast(`Compensation paid: ${res.data.compensation.txHash.slice(0, 12)}...`);
  }
}

function renderMissingPersons() {
  const el = document.getElementById('mpList');
  if (!el) return;

  if (!missingPersons.length) {
    el.innerHTML = '<div class="mp-card" style="text-align:center;color:var(--text3)">No missing-person records yet.</div>';
    return;
  }

  const statusColors = {
    Missing: 'var(--red)',
    Located: 'var(--accent)',
    Displaced: 'var(--warn)',
    Hospitalised: 'var(--orange)',
    Deceased: 'var(--text3)',
  };

  const canUpdate = currentRole === 'rescuer' || currentRole === 'medic' || currentRole === 'surveillance' || currentRole === null;

  el.innerHTML = missingPersons.map((p) => {
    const cidPreview = (p.anchorCid || p.cid || '').toString();
    const statusColor = statusColors[p.status] || 'var(--text2)';
    const confirmationLabel = p.status === 'Deceased'
      ? `<div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--text3);margin-top:4px">Rescuer confirmations: ${p.deceasedConfirmations || 0}/2</div>`
      : '';

    const actions = canUpdate ? `
      <div style="display:flex;gap:6px;margin-top:7px;align-items:center">
        <select class="mp-input" id="mpStatus_${p.id}" style="margin:0;font-size:10px;padding:6px;max-width:170px;color:var(--text2)">
          <option value="Missing" ${p.status==='Missing'?'selected':''}>Missing</option>
          <option value="Located" ${p.status==='Located'?'selected':''}>Located</option>
          <option value="Displaced" ${p.status==='Displaced'?'selected':''}>Displaced</option>
          <option value="Hospitalised" ${p.status==='Hospitalised'?'selected':''}>Hospitalised</option>
          <option value="Deceased" ${p.status==='Deceased'?'selected':''}>Deceased</option>
        </select>
        <button class="drone-btn dispatch" style="font-size:8px;padding:4px 8px" onclick="updateMissingPersonStatus('${p.id}')">UPDATE</button>
      </div>` : '';

    const compensation = p.compensation?.txHash
      ? `<div class="mp-enc" style="margin-top:5px;color:var(--accent3)">💸 Compensation TX: ${p.compensation.txHash}</div>`
      : '';

    const timeline = (p.statusHistory || []).length
      ? `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed rgba(255,255,255,0.08)">
          ${(p.statusHistory || []).map((h) => {
            const ts = new Date(h.ts || Date.now()).toLocaleString();
            const by = `${h.byRole || 'user'}:${h.byId || 'unknown'}`;
            return `<div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--text3);margin-bottom:3px">• ${h.status || p.status} · ${ts} · ${by}${h.note ? ` · ${h.note}` : ''}</div>`;
          }).join('')}
        </div>`
      : '';

    return `
      <div class="mp-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <div class="mp-name">${p.name}</div>
          <span class="badge" style="font-size:8px;border:1px solid ${statusColor};color:${statusColor};background:transparent">${p.status || 'Missing'}</span>
        </div>
        <div class="mp-meta">Zone ${p.zone || 'UNKNOWN'} · ${(p.note || 'No details')} · ${new Date(p.updatedAt || Date.now()).toLocaleString()}</div>
        <div class="mp-enc">🔒 FHE: ${(p.cipher || '').substring(0,28)}...<br>📦 IPFS: ${cidPreview ? cidPreview.substring(0,32) + '...' : 'pending'}</div>
        ${confirmationLabel}
        ${compensation}
        ${timeline}
        ${actions}
      </div>`;
  }).join('');
}

// ==============================================================
// HYPERCERTS
// ==============================================================
function initHypercerts() {
  const seeds = [
    { name:'priya_v.near', action:'Deployed rescue boats to Zone A2 Palghar', zone:'A2', trust:'ORB-VERIFIED' },
    { name:'arjun_r.near', action:'Coordinated medical supply delivery to Zone C3', zone:'C3', trust:'ORB-VERIFIED' },
    { name:'meera_s.near', action:'Organized 45-person evacuation in Zone D1 Thane', zone:'D1', trust:'DEV-VERIFIED' },
  ];
  seeds.forEach(s => addHypercert(s, true));
}

function addHypercert({ name, action, zone, trust }, silent=false) {
  const id = 'HC-' + Date.now().toString(36).toUpperCase().slice(-6);
  hypercerts.unshift({ id, name, action, zone, trust, minted:false, time:new Date().toLocaleTimeString() });
  renderHypercerts();
  if (!silent) showToast(`🏅 Hypercert queued: ${name}`);
}

function renderHypercerts() {
  const el = document.getElementById('hcList');
  if (!hypercerts.length) { el.innerHTML = '<div style="padding:20px;text-align:center;font-family:JetBrains Mono,monospace;font-size:10px;color:var(--text3)">No Hypercerts minted yet.</div>'; return; }
  el.innerHTML = hypercerts.map((h,i) => `
    <div class="hc-card">
      <div class="hc-top"><span class="hc-name">${h.name}</span><span class="hc-id">${h.id}</span></div>
      <div class="hc-desc">${h.action}</div>
      <div class="hc-meta">Zone ${h.zone} · ${h.trust} · ${h.time}</div>
      <div class="hc-mint-btn ${h.minted?'minted':''}" onclick="mintHC(${i})">${h.minted?'✓ MINTED ON-CHAIN':'⚡ MINT HYPERCERT'}</div>
    </div>`).join('');
}

function mintHC(i) {
  if (!roleCanAccess('mint_hypercert')) {
    showToast('Only Main Station can mint Hypercerts');
    return;
  }

  hypercerts[i].minted = true;
  renderHypercerts();
  showToast(`✓ Hypercert ${hypercerts[i].id} minted on-chain`);
}

// ==============================================================
// STARKNET / NGOs
// ==============================================================
function renderNGOs() {
  document.getElementById('ngoList').innerHTML = NGOS.map((n,i) => `
    <div class="ngo-card">
      <div class="ngo-dot" style="background:${n.color}"></div>
      <div class="ngo-info"><div class="ngo-name">${n.name}</div><div class="ngo-meta">Zones: ${n.zone} · ${n.status.toUpperCase()}</div></div>
      <div class="ngo-amt">${n.amount}</div>
      <div class="disburse-btn ${n.status==='disbursed'?'done':''}" id="dgbtn${i}" onclick="disburse(${i})">${n.status==='disbursed'?'DONE':'SEND'}</div>
    </div>`).join('');
}

function disburse(i) {
  if (!roleCanAccess('disburse_funds')) {
    showToast('Only Main Station can disburse funds');
    return;
  }

  NGOS[i].status = 'disbursed';
  document.getElementById('dgbtn'+i).textContent = 'DONE';
  document.getElementById('dgbtn'+i).classList.add('done');
  showToast(`✓ ${NGOS[i].amount} disbursed to ${NGOS[i].name} via Starknet`);
  addMeshLog(`💸 Starknet: ${NGOS[i].amount} disbursed to ${NGOS[i].name}`);
}

// ==============================================================
// DRONE FLEET
// ==============================================================
const DRONES = [
  { id:'D1', name:'Drone D1', status:'surveillance', zone:'A2', payload:'Thermal camera · aerial feed', battery:78, eta:null },
  { id:'D2', name:'Drone D2', status:'delivering',   zone:'B1', payload:'Water purification kits · 12kg', battery:61, eta:'9min' },
  { id:'D3', name:'Drone D3', status:'delivering',   zone:'C3', payload:'Oxygen canisters · 8kg', battery:54, eta:'6min' },
  { id:'D4', name:'Drone D4', status:'charging',     zone:'BASE', payload:'—', battery:22, eta:null },
  { id:'D5', name:'Drone D5', status:'standby',      zone:'D1', payload:'Medical kit · 5kg', battery:95, eta:null },
  { id:'D6', name:'Drone D6', status:'surveillance', zone:'E4', payload:'Thermal camera · aerial feed', battery:83, eta:null },
];

const DRONE_MAP_POS = {
  D1:{x:32,y:28},D2:{x:48,y:55},D3:{x:62,y:35},D4:{x:50,y:85},D5:{x:38,y:62},D6:{x:60,y:72}
};

function renderDrones() {
  const el = document.getElementById('droneList');
  if (!el) return;
  el.innerHTML = '';
  DRONES.forEach((d, i) => {
    const battCol = d.battery > 60 ? 'var(--accent3)' : d.battery > 30 ? 'var(--warn)' : 'var(--red)';
    const etaStr = d.eta ? ` · ETA ${d.eta}` : '';
    const card = document.createElement('div');
    card.className = `drone-card ${d.status}`;
    card.innerHTML = `
      <div class="drone-top"><div class="drone-id">🚁 ${d.name}</div><div class="drone-status-badge ${d.status}">${d.status.toUpperCase()}${etaStr}</div></div>
      <div class="drone-zone">📍 ${d.zone==='BASE'?'BASE STATION':'Zone '+d.zone}</div>
      <div class="drone-payload">📦 ${d.payload}</div>
      <div class="drone-bar"><div class="drone-bar-fill" style="width:${d.battery}%;background:${battCol}"></div></div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--text3);margin-bottom:6px">🔋 BATTERY: ${d.battery}%</div>
      <div class="drone-actions">
        <button class="drone-btn dispatch ${d.status==='charging'?'disabled':''}" onclick="dispatchDrone(${i})">⚡ DISPATCH</button>
        <button class="drone-btn recall ${d.status==='charging'||d.status==='standby'?'disabled':''}" onclick="recallDrone(${i})">↩ RECALL</button>
      </div>`;
    el.appendChild(card);
  });
  renderDroneOverlay();
  updateDroneStats();
}

function renderDroneOverlay() {
  if (!mapInstance || typeof L === 'undefined') return;

  Object.values(droneLeafletMarkers).forEach((marker) => mapInstance.removeLayer(marker));
  droneLeafletMarkers = {};

  DRONES.forEach((drone) => {
    if (drone.status === 'charging') return;
    const coords = ZONE_COORDS[drone.zone];
    if (!coords) return;

    const icon = L.divIcon({
      className: 'leaflet-drone-icon',
      html: `<div style="font-size:16px;filter:drop-shadow(0 0 6px rgba(0,212,255,0.8))">🚁</div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    const marker = L.marker(coords, { icon }).addTo(mapInstance);
    marker.bindTooltip(`${drone.name} · ${drone.status.toUpperCase()} · Zone ${drone.zone}`, { direction: 'top' });
    droneLeafletMarkers[drone.id] = marker;
  });
}

function updateDroneStats() {
  const s = { active:0, delivering:0, surveillance:0, charging:0 };
  DRONES.forEach(d => {
    if (d.status === 'charging') s.charging++;
    else { s.active++; if (d.status === 'delivering') s.delivering++; else if (d.status === 'surveillance') s.surveillance++; }
  });
  if (document.getElementById('dronesActive')) document.getElementById('dronesActive').textContent = s.active;
  if (document.getElementById('dronesDelivering')) document.getElementById('dronesDelivering').textContent = s.delivering;
  if (document.getElementById('dronesSurveillance')) document.getElementById('dronesSurveillance').textContent = s.surveillance;
  if (document.getElementById('dronesCharging')) document.getElementById('dronesCharging').textContent = s.charging;
}

function dispatchDrone(i) {
  if (!roleCanAccess('dispatch_drones')) {
    showToast('Only Main Station can dispatch drones');
    return;
  }

  const d = DRONES[i];
  if (d.status === 'charging') return;
  const zones = ['A2','B1','C3','D1','E4','F2','G1'];
  d.status = 'delivering'; d.zone = zones.find(z => z !== d.zone) || 'A2'; d.eta = Math.floor(5+Math.random()*15)+'min';
  renderDrones();
  addLog('info', `🚁 ${d.name} dispatched → Zone ${d.zone}, ETA ${d.eta}`);
  showToast(`🚁 ${d.name} dispatched to Zone ${d.zone}`);
}

function recallDrone(i) {
  if (!roleCanAccess('dispatch_drones')) {
    showToast('Only Main Station can recall drones');
    return;
  }

  DRONES[i].status = 'standby'; DRONES[i].eta = null;
  renderDrones();
  addLog('info', `↩ ${DRONES[i].name} recalled to base.`);
}

setInterval(() => {
  DRONES.forEach(d => {
    if (d.status === 'charging') { d.battery = Math.min(100, d.battery + 3); if (d.battery >= 95) { d.status = 'standby'; showToast(`🚁 ${d.name} charged — standby`); } }
    else if (d.status === 'delivering' || d.status === 'surveillance') {
      d.battery = Math.max(10, d.battery - 0.5);
      if (d.battery <= 10) { d.status = 'charging'; d.zone = 'BASE'; d.eta = null; showToast(`⚠ ${d.name} low battery`); }
    }
    if (d.status === 'delivering' && d.eta) {
      const mins = parseInt(d.eta);
      if (!isNaN(mins)) {
        if (mins - 1 <= 0) { addLog('decision', `✅ ${d.name} delivery complete at Zone ${d.zone}.`); d.status = 'surveillance'; d.eta = null; }
        else d.eta = (mins-1)+'min';
      }
    }
  });
  updateDroneStats(); renderDroneOverlay();
}, 30000);

// ==============================================================
// DISPATCH CONSOLE
// ==============================================================
function openDispatch() {
  const w = window.open('dispatch.html', '_blank');
  if (!w) showToast('⚠ Popup blocked — allow popups for this site to open the Dispatch Console');
}

// ==============================================================
// MESH
// ==============================================================
function initMesh() {
  channel = new BroadcastChannel('disasternet_mesh_v2');
  channel.onmessage = (e) => {
    const msg = e.data;
    if (msg.from === NODE_ID) return;
    if (msg.type === 'ping') { addMeshLog(`📡 Ping from ${msg.from}`); activatePhone(2); document.getElementById('n2s').textContent = 'ACTIVE'; document.getElementById('arr1').classList.add('active'); document.getElementById('md2').classList.add('on'); channel.postMessage({ type:'pong', from:NODE_ID }); }
    if (msg.type === 'pong') { addMeshLog(`✅ Pong from ${msg.from}`); activatePhone(2); }
    if (msg.type === 'missing_person') {
      refreshMissingPersonsFromBackend();
      addMeshLog(`👤 Missing person synced: ${msg.record.name}`);
    }
    if (msg.type === 'rescued_person') { addMeshLog(`🦺 Rescued person synced: ${msg.person.name}`); }
    if (msg.type === 'agent_msg') addMeshLog(`⚡ AI decision synced from ${msg.from}`);
    if (msg.type === 'field_report') addMeshLog(`📍 Field report from ${msg.from}: "${msg.text.substring(0,45)}..."`);
    if (msg.type === 'road_status') {
      setRoadStatus(msg.edgeId, msg.status, { shouldBroadcast: false, source: 'mesh' });
      addMeshLog(`🛣 Mesh sync: road ${msg.edgeId} marked ${msg.status.toUpperCase()} by ${msg.by || msg.from}`);
    }
    if (msg.type === 'drone_required' && msg.zoneId) {
      flagZoneDroneRequired(msg.zoneId, msg.reason || `No-route alert received from ${msg.by || msg.from}`, { shouldBroadcast: false });
      addMeshLog(`🚁 Mesh sync: Zone ${msg.zoneId} flagged DRONE REQUIRED`);
    }
  };
  addMeshLog(`🟢 ${NODE_ID} initialized on BroadcastChannel`);
  addMeshLog(`💡 Open in another tab to simulate a second device`);
}

function doBroadcastPing() { channel.postMessage({ type:'ping', from:NODE_ID, ts:Date.now() }); addMeshLog(`📡 Ping broadcast from ${NODE_ID}`); }
function broadcastToMesh(data) { if (channel) channel.postMessage({ ...data, from:NODE_ID }); }
function addMeshLog(txt) { meshLogs.unshift({ txt, ts:new Date().toLocaleTimeString() }); if (meshLogs.length > 40) meshLogs.pop(); renderMeshLog(); }
function renderMeshLog() { document.getElementById('meshLog').innerHTML = meshLogs.map(l => `<div class="mesh-line"><span class="ts">${l.ts}</span>${l.txt}</div>`).join(''); }
function activatePhone(n) { document.getElementById('phone'+n).classList.add('active'); }

function simulateMeshActivity() {
  const events = [
    [3000,  () => addMeshLog('📊 Zone A2: packet relayed — 3 hops — 11ms')],
    [7000,  () => { addMeshLog('🔄 Resource table sync — Δ3 records'); activatePhone(2); document.getElementById('md3').classList.add('on'); document.getElementById('n3s').textContent = 'SYNCING'; }],
    [12000, () => { addMeshLog('📦 IPFS batch queued — 47 records'); document.getElementById('md4').classList.add('on'); document.getElementById('n3s').textContent = 'ACTIVE'; }],
    [18000, () => addMeshLog('⚡ AI decision propagated to 3 mesh nodes')],
    [25000, () => addMeshLog('🌍 World ID: volunteer identity confirmed')],
    [32000, () => addMeshLog('🔐 Lit Protocol: key gate checked for Zone C3 medical data')],
    [50000, () => addMeshLog('🔒 Zama TFHE: 12 new records encrypted — batch broadcast')],
    [62000, () => addMeshLog('💸 Starknet: disbursement condition verified')],
  ];
  events.forEach(([delay, fn]) => setTimeout(fn, delay));
}

// ==============================================================
// TABS
// ==============================================================
function switchTab(name, el) {
  if (!allowedTabsForCurrentRole.has(name)) {
    showToast('Access limited for your role');
    return;
  }
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => {
    t.classList.remove('active');
    // Only clear inline display if this tab is allowed (avoids re-showing restricted tabs)
    const tabNameMatch = t.id.replace('tab-', '');
    if (allowedTabsForCurrentRole.has(tabNameMatch)) {
      t.style.display = '';
    }
  });
  if (el) el.classList.add('active');
  const contentEl = document.getElementById('tab-'+name);
  if (contentEl) { contentEl.style.display = ''; contentEl.classList.add('active'); }
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
// VULNERABLE POPULATION
// ==============================================================
const VULNERABLE = {
  A2: { elderly:14, disabled:3, infants:2, nonLocal:8, total:27, clusters:[{lat:24,lng:18,count:12,note:'Elderly cluster — riverside settlement'},{lat:30,lng:22,count:15,note:'Mixed vulnerable — low-lying area'}] },
  B1: { elderly:8, disabled:5, infants:4, nonLocal:12, total:29, clusters:[{lat:50,lng:42,count:17,note:'Wheelchair users — blocked road access'}] },
  C3: { elderly:22, disabled:7, infants:6, nonLocal:3, total:38, clusters:[{lat:32,lng:70,count:22,note:'ICU patients — hospital overflow'},{lat:36,lng:74,count:16,note:'Elderly camp — medical priority'}] },
  D1: { elderly:11, disabled:2, infants:3, nonLocal:6, total:22, clusters:[{lat:64,lng:26,count:13,note:'Isolated settlement — landslide cut-off'}] },
  E4: { elderly:6, disabled:1, infants:5, nonLocal:4, total:16, clusters:[{lat:69,lng:64,count:11,note:'Families stranded on embankment'}] },
  F2: { elderly:4, disabled:0, infants:1, nonLocal:2, total:7, clusters:[{lat:80,lng:52,count:7,note:'Stable — monitoring only'}] },
  G1: { elderly:2, disabled:0, infants:0, nonLocal:1, total:3, clusters:[{lat:86,lng:16,count:3,note:'Minor risk — contained'}] },
};

let showVulnerable = false;

function toggleVulnerable() {
  showVulnerable = !showVulnerable;
  const btn = document.getElementById('vulnToggleBtn');
  if (btn) btn.textContent = showVulnerable ? '🟣 HIDE VULNERABLE' : '🟣 SHOW VULNERABLE';
  renderVulnerableOverlay();
}

function renderVulnerableOverlay() {
  if (!mapInstance || typeof L === 'undefined') return;

  vulnerableLeafletMarkers.forEach((marker) => mapInstance.removeLayer(marker));
  vulnerableLeafletMarkers = [];

  if (!showVulnerable) return;

  ZONES.forEach((zone) => {
    const v = VULNERABLE[zone.id];
    const zoneCoords = ZONE_COORDS[zone.id];
    if (!v || !zoneCoords) return;

    v.clusters.forEach((cluster, idx) => {
      const jitterLat = (idx + 1) * 0.04;
      const jitterLng = (idx + 1) * 0.05;
      const markerCoords = [zoneCoords[0] + jitterLat, zoneCoords[1] + jitterLng];

      const marker = L.circleMarker(markerCoords, {
        radius: Math.max(6, Math.min(12, Math.round(cluster.count / 2))),
        color: '#8b5cf6',
        fillColor: '#8b5cf6',
        fillOpacity: 0.28,
        weight: 2,
      }).addTo(mapInstance);

      marker.bindTooltip(`Vulnerable cluster · ${cluster.count} people`, { direction: 'top' });
      marker.on('click', () => showVulnPopup(zone.id, cluster));
      vulnerableLeafletMarkers.push(marker);
    });
  });
}

function showVulnPopup(zoneId, cluster) {
  const v = VULNERABLE[zoneId];
  showToast(`Zone ${zoneId}: ${v.elderly} elderly · ${v.disabled} disabled · ${v.infants} infants`);
  addLog('alert', `🟣 VULNERABLE CLUSTER — Zone ${zoneId}: ${cluster.note}<br><span style="font-size:11px">👴 Elderly: ${v.elderly} · ♿ Disabled: ${v.disabled} · 👶 Infants: ${v.infants} · 🌐 Non-local: ${v.nonLocal}</span><br><span style="font-family:JetBrains Mono,monospace;font-size:9px;color:var(--warn)">⚠ PRIORITY EVACUATION RECOMMENDED</span>`);
}

// ==============================================================
// DAM WATER LEVEL FEED
// ==============================================================
const DAMS = [
  { name:'Koyna Dam',   location:'Satara',   capacity:105.25, current:97.8,  status:'critical', zones:['B1','C3'] },
  { name:'Almatti Dam', location:'Karnataka (Cross-state)', capacity:519.60, current:498.2, status:'watch', zones:['A2','D1'] },
  { name:'Ujjani Dam',  location:'Solapur',  capacity:117.00, current:89.4,  status:'safe',  zones:['F2'] },
  { name:'Mulshi Dam',  location:'Pune',     capacity:7.98,   current:7.21,  status:'watch', zones:['E4'] },
];

function renderDams() {
  const el = document.getElementById('damList');
  if (!el) return;
  el.innerHTML = DAMS.map(d => {
    const pct = Math.round(d.current/d.capacity*100);
    const col = d.status==='critical'?'var(--red)':d.status==='watch'?'var(--warn)':'var(--accent3)';
    const statusLabel = d.status==='critical'?'🔴 CRITICAL':d.status==='watch'?'🟡 WATCH':'🟢 SAFE';
    return `<div class="dam-card dam-${d.status}">
      <div class="dam-top">
        <div><div class="dam-name">${d.name}</div><div class="dam-location">📍 ${d.location} · Affects: Zone ${d.zones.join(', Zone ')}</div></div>
        <div class="dam-status-badge dam-badge-${d.status}">${statusLabel}</div>
      </div>
      <div class="dam-bar"><div class="dam-fill" style="width:${pct}%;background:${col}"></div></div>
      <div class="dam-stats">
        <span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${col}">${d.current} TMC / ${d.capacity} TMC (${pct}%)</span>
        ${d.status==='critical'?'<span style="font-family:JetBrains Mono,monospace;font-size:9px;color:var(--red);animation:blink 0.8s infinite">⚠ OVERFLOW RISK</span>':''}
      </div>
    </div>`;
  }).join('');
}

setInterval(() => {
  DAMS.forEach(d => {
    const delta = (Math.random()-0.4)*0.3;
    d.current = Math.max(d.capacity*0.5, Math.min(d.capacity*0.99, d.current+delta));
    const pct = d.current/d.capacity;
    const oldStatus = d.status;
    d.status = pct>0.95?'critical':pct>0.85?'watch':'safe';
    if (oldStatus !== 'critical' && d.status === 'critical') {
      addLog('alert', `⚠ DAM ALERT: ${d.name} reached CRITICAL level (${Math.round(d.current/d.capacity*100)}%). Downstream zones ${d.zones.join(', ')} at flood risk within 6hr.`);
      showToast(`⚠ ${d.name} CRITICAL — ${Math.round(d.current/d.capacity*100)}%`);
    }
  });
  renderDams();
}, 15000);

// ==============================================================
// ANTICIPATORY ACTION ENGINE
// ==============================================================
const ANTICIPATORY_ALERTS = [
  { delay:45000,  zone:'C3', msg:'⚡ ANTICIPATORY ALERT: Zone C3 oxygen at 4hr reserve + hospital 100% capacity. <strong>PREDICTED CRITICAL in 3.2hr.</strong> Pre-positioning Helicopter 2 now.', type:'alert' },
  { delay:90000,  zone:'A2', msg:'⚡ ANTICIPATORY ALERT: Zone A2 water rising 0.3m/hr. D1 highway floods in 2hr. <strong>Pre-emptive rerouting recommended.</strong> CON-02 should divert via NH66.', type:'alert' },
  { delay:140000, zone:'B1', msg:'⚡ ANTICIPATORY ALERT: Drone D2 thermal feed shows 40+ signatures at Zone B1 outskirts. <strong>New survivor group detected.</strong> Drone D5 dispatched for confirmation.', type:'decision' },
  { delay:200000, zone:'ALL', msg:'⚡ ANTICIPATORY DISBURSEMENT: Koyna Dam at 94%. Downstream zones B1, C3 at risk within 6hr. <strong>Pre-emptive Starknet fund release ₹28L to SEEDS India</strong> recommended.', type:'decision' },
  { delay:270000, zone:'D1', msg:'⚡ ANTICIPATORY ALERT: Zone D1 hospital 95% capacity. 48hr rainfall forecast. <strong>Patient overflow in 18hr.</strong> Immediate transfer to Nashik Medical Hub authorized.', type:'alert' },
];

function initAnticipatoryEngine() {
  ANTICIPATORY_ALERTS.forEach(({ delay, zone, msg, type }) => {
    setTimeout(() => {
      addLog(type, `<span style="font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--purple);letter-spacing:1px">ANTICIPATORY ENGINE · Zone ${zone}</span><br>` + msg);
      showToast(`⚡ Anticipatory alert — Zone ${zone}`);
      document.getElementById('agentSub').textContent = 'ANTICIPATORY ALERT ISSUED';
      setTimeout(() => { document.getElementById('agentSub').textContent = 'MONITORING — READY'; }, 3000);
    }, delay);
  });
}

// ==============================================================
// RECOVERY TRACKER
// ==============================================================
let recoveryZones = {};

function initRecovery() {
  recoveryZones['G1'] = {
    zone:'G1', name:'Kolhapur North',
    startDate: new Date(Date.now() - 3*24*60*60*1000),
    familiesHelped:12, homesAssessed:8, homesRebuilt:3,
    fundsReleased:'₹8.4L', volunteersActive:6,
    events:[
      { time:'2 days ago', txt:'Flood waters receded — zone moved to RECOVERY' },
      { time:'1 day ago', txt:'12 families assisted — temporary shelter arranged' },
      { time:'6hr ago', txt:'SEEDS India: 3 homes assessed for reconstruction' },
    ]
  };
  renderRecovery();
}

function moveToRecovery(zoneId) {
  const zone = ZONES.find(z => z.id === zoneId);
  if (!zone) return;
  recoveryZones[zoneId] = {
    zone: zoneId, name: zone.name, startDate: new Date(),
    familiesHelped:0, homesAssessed:0, homesRebuilt:0,
    fundsReleased:'₹0', volunteersActive:0,
    events:[{ time:'Just now', txt:`Zone ${zoneId} moved from ${zone.sev.toUpperCase()} → RECOVERY` }]
  };
  zone.sev = 'low';
  renderZones(); renderRecovery();
  addLog('decision', `✅ Zone ${zoneId} transitioned to RECOVERY phase. Hypercert minting authorized for all volunteers.`);
  showToast(`✅ Zone ${zoneId} → RECOVERY`);
}

function renderRecovery() {
  const el = document.getElementById('recoveryList');
  if (!el) return;
  const zones = Object.values(recoveryZones);
  if (!zones.length) { el.innerHTML = '<div style="padding:20px;text-align:center;font-family:JetBrains Mono,monospace;font-size:10px;color:var(--text3)">No zones in recovery phase yet.</div>'; return; }
  el.innerHTML = zones.map(r => `
    <div class="recovery-card">
      <div class="recovery-top"><div class="recovery-zone-id">ZONE ${r.zone} — ${r.name}</div><div class="recovery-badge">🟢 RECOVERY</div></div>
      <div class="recovery-stats">
        <div class="rec-stat"><div class="rec-stat-val" style="color:var(--accent3)">${r.familiesHelped}</div><div class="rec-stat-lbl">FAMILIES HELPED</div></div>
        <div class="rec-stat"><div class="rec-stat-val" style="color:var(--accent)">${r.homesAssessed}</div><div class="rec-stat-lbl">HOMES ASSESSED</div></div>
        <div class="rec-stat"><div class="rec-stat-val" style="color:var(--warn)">${r.homesRebuilt}</div><div class="rec-stat-lbl">REBUILT</div></div>
        <div class="rec-stat"><div class="rec-stat-val" style="color:var(--accent3)">${r.fundsReleased}</div><div class="rec-stat-lbl">DISBURSED</div></div>
      </div>
      <div class="recovery-timeline">${r.events.map(e => `<div class="rec-event"><span class="rec-time">${e.time}</span>${e.txt}</div>`).join('')}</div>
      <button class="drone-btn dispatch" style="margin-top:6px;width:100%" onclick="mintRecoveryCert('${r.zone}')">🏅 MINT RECOVERY CERTIFICATE</button>
    </div>`).join('');
}

function mintRecoveryCert(zoneId) {
  const r = recoveryZones[zoneId];
  showToast(`✅ Recovery Certificate minted for Zone ${zoneId}`);
  addLog('decision', `🏅 RECOVERY CERTIFICATE minted for Zone ${zoneId} (ERC-8004).<br><span style="font-size:11px">Families: ${r.familiesHelped} · Funds: ${r.fundsReleased} · Volunteers: ${r.volunteersActive}</span><br><span style="font-family:JetBrains Mono,monospace;font-size:9px;color:var(--text3)">📦 IPFS: Qm${Math.random().toString(36).substr(2,20).toUpperCase()}...</span>`);
}

// ==============================================================
// NGO COORDINATION BOARD
// ==============================================================
const NGO_BOARD = [
  { name:'Goonj Foundation',  zones:['A2','D1'], resources:'12 trucks, 3 medical teams', status:'active',   color:'var(--accent3)', conflict:false },
  { name:'SEEDS India',       zones:['B1','C3'], resources:'8 boats, 2 ambulances',     status:'active',   color:'var(--accent3)', conflict:false },
  { name:'Rapid Response MH', zones:['C3','E4'], resources:'4 helicopters, med supplies', status:'active', color:'var(--warn)',    conflict:true  },
  { name:'Pratham Relief',    zones:['F2','G1'], resources:'6 trucks, food supplies',    status:'standby',  color:'var(--text2)',   conflict:false },
  { name:'Red Cross MH',      zones:['A2','B1'], resources:'Mobile hospital unit',       status:'en-route', color:'var(--orange)',  conflict:true  },
];

function renderNGOBoard() {
  const el = document.getElementById('ngoBoardList');
  if (!el) return;
  const zoneNGOMap = {};
  NGO_BOARD.forEach(n => n.zones.forEach(z => { if (!zoneNGOMap[z]) zoneNGOMap[z]=[]; zoneNGOMap[z].push(n.name); }));
  const conflicts = Object.entries(zoneNGOMap).filter(([z, ngos]) => ngos.length > 1);
  let conflictHtml = '';
  if (conflicts.length) {
    conflictHtml = `<div class="ngo-conflict-banner">⚡ IMPULSE AI: ${conflicts.length} deployment conflict${conflicts.length>1?'s':''} detected. ${conflicts.map(([z,ngos])=>`Zone ${z}: ${ngos.join(' + ')}`).join(' · ')} — Recommend deconflicting.</div>`;
  }
  el.innerHTML = conflictHtml + NGO_BOARD.map((n,i) => `
    <div class="ngo-board-card ${n.conflict?'conflict':''}">
      <div class="ngo-board-top">
        <div class="ngo-dot" style="background:${n.color}"></div>
        <div class="ngo-board-info">
          <div class="ngo-board-name">${n.name} ${n.conflict?'<span style="color:var(--red);font-size:9px">⚠ OVERLAP</span>':''}</div>
          <div class="ngo-board-zones">${n.zones.map(z=>`<span class="ngo-zone-tag">${z}</span>`).join('')}</div>
          <div class="ngo-board-res">${n.resources}</div>
        </div>
        <div class="ngo-status-badge" style="color:${n.color}">${n.status.toUpperCase()}</div>
      </div>
    </div>`).join('');
}

function deconflictNGOs() {
  addLog('decision', `⚡ NGO DECONFLICT: Rapid Response MH reassigned Zone C3 → Zone E4. Red Cross MH assigned Zone A2 exclusively. Coverage gap eliminated. All zones have dedicated NGO. Broadcasting to mesh.`);
  NGO_BOARD[2].conflict = false; NGO_BOARD[4].conflict = false;
  NGO_BOARD[4].zones = ['A2']; NGO_BOARD[0].zones = ['D1'];
  renderNGOBoard();
  showToast('✅ NGO deployment deconflicted');
}

// ==============================================================
// LIVE STATS TICKER
// ==============================================================
setInterval(() => {
  const v = document.getElementById('statVictims');
  if (v) { const n = parseInt(v.textContent); if (Math.random() > 0.6) v.textContent = n + Math.floor(Math.random()*3); }
  const rv = document.getElementById('statResources');
  if (rv) { const rn = parseInt(rv.textContent); if (Math.random() > 0.7) rv.textContent = Math.min(rn+1, 220); }
}, 4000);
