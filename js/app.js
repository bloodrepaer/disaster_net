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
  renderZones();
  renderMap();
  renderResources();
  renderNGOs();
  initHypercerts();
  initMesh();
  simulateMeshActivity();

  const saved = sessionStorage.getItem('dnet_key');
  if (saved) { apiKey = saved; simMode = false; updateAIStatus(); }
});

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
  document.getElementById('reportInput').value = '';
  setThinking(true);
  document.getElementById('agentSub').textContent = 'PROCESSING FIELD DATA...';
  broadcastToMesh({ type:'field_report', text: txt });

  if (simMode || !apiKey) {
    await simulatedDecision(txt);
  } else {
    await callClaude(txt);
  }

  setThinking(false);
  document.getElementById('agentSub').textContent = 'MONITORING — READY';

  // Maybe mint a hypercert for this action
  if (currentUser && Math.random() > 0.5) {
    const zone = txt.match(/Zone\s+(\w+)/i)?.[1] || 'FIELD';
    addHypercert({ name: currentUser.id, action: txt.substring(0,60)+'...', zone, trust: currentUser.trust });
  }
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
      addLog('decision', data.content[0].text);
      updateResourcesRandom();
    } else if (data.error) {
      addLog('system', `⚠ API error: ${data.error.message}. Falling back to simulation.`);
      simMode = true; updateAIStatus();
      await simulatedDecision(report);
    }
  } catch (e) {
    addLog('system', `⚠ Connection error: ${e.message}. Check API key. Falling back to simulation.`);
    simMode = true; updateAIStatus();
    await simulatedDecision(report);
  }
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
  updateResourcesRandom();
}

async function runInitialAssessment() {
  setThinking(true);
  document.getElementById('agentSub').textContent = 'SCANNING ALL ZONES...';
  const report = `Initial situation report: Maharashtra flood emergency. Zone A2 Palghar CRITICAL 240 victims, Zone B1 Nashik CRITICAL 80 stranded, Zone C3 Raigad hospital CRITICAL oxygen shortage, Zone D1 Thane HIGH 130 victims, Zone E4 Pune HIGH 60 victims, Zone F2 Solapur MEDIUM, Zone G1 Kolhapur LOW. Provide priority assessment and immediate resource routing.`;
  if (simMode || !apiKey) {
    await new Promise(r => setTimeout(r, 1800));
    addLog('info', `🔍 INITIAL SCAN COMPLETE: 7 zones active. Priority order: C3 (oxygen critical, 4hr window) → A2 (mass displacement, 240 victims) → B1 (route blocked, convoy stalled). Routing: Helicopter 2 → C3 immediately. Convoy 1 rerouted via NH48 → A2. Zone G1 and F2 resources freed for reallocation. All decisions broadcast to mesh. FHE sync active. Standing by for field updates.`);
  } else {
    await callClaude(report);
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
  const rec = { name, zone, note, time: new Date().toLocaleTimeString(), cipher, cid };

  missingPersons.unshift(rec);
  renderMissingPersons();
  document.getElementById('mpName').value = '';
  document.getElementById('mpZone').value = '';
  document.getElementById('mpNote').value = '';

  broadcastToMesh({ type:'missing_person', record: rec });
  addMeshLog(`📋 Missing person FHE-encrypted & broadcast: ${name}`);
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
  const seeds = [
    { name:'priya_v.near',  action:'Deployed rescue boats to Zone A2 Palghar',        zone:'A2', trust:'ORB-VERIFIED' },
    { name:'arjun_r.near',  action:'Coordinated medical supply delivery to Zone C3',   zone:'C3', trust:'ORB-VERIFIED' },
    { name:'meera_s.near',  action:'Organized 45-person evacuation in Zone D1 Thane',  zone:'D1', trust:'DEV-VERIFIED' },
  ];
  seeds.forEach(s => addHypercert(s, true));
}

function addHypercert({ name, action, zone, trust }, silent=false) {
  const id = 'HC-' + Date.now().toString(36).toUpperCase().slice(-6);
  hypercerts.unshift({ id, name, action, zone, trust, minted: false, time: new Date().toLocaleTimeString() });
  renderHypercerts();
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
      missingPersons.unshift({...r, name: r.name + ' [SYNCED]'});
      renderMissingPersons();
      addMeshLog(`👤 Missing person synced: ${r.name}`);
    }
    if (msg.type === 'agent_msg') {
      addMeshLog(`⚡ AI decision synced from ${msg.from}`);
    }
    if (msg.type === 'field_report') {
      addMeshLog(`📍 Field report from ${msg.from}: "${msg.text.substring(0,45)}..."`);
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