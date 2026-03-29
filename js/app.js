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
  const nodeEl = document.getElementById('nodeId');
  if (nodeEl) nodeEl.textContent = NODE_ID;

  renderZones();
  renderMap();
  renderResources();
  renderNGOs();
  initHypercerts();
  initMesh();
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

// ==============================================================
// ROLE LOGIN SYSTEM
// ==============================================================
const ROLE_FORMS = {
  rescuer: {
    icon: '🦺', label: 'RESCUER LOGIN',
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
    icon: '🆘', label: 'SEND SOS BEACON',
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
    icon: '🏥', label: 'MEDIC / MEDICAL STAFF LOGIN',
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
    icon: '🛰️', label: 'SURVEILLANCE ORG — COMMAND LOGIN',
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
    
    // Fire SOS
    setTimeout(() => fireSOS(name || 'Unknown civilian', location, emergType, count, condition), 200);
    return;
  }
  
  const roleLabels = { rescuer:'RESCUER', medic:'MEDIC', surveillance:'SURVEILLANCE' };
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
  document.getElementById('rolePill').style.borderColor = ROLE_FORMS[selectedRoleTemp].color.replace('var(--','rgba(').replace(')',',0.4)');
  document.getElementById('rolePill').style.color = ROLE_FORMS[selectedRoleTemp].color;

  setTimeout(() => runInitialAssessment(), 600);
}

function setupRoleUI() {
  // Adjust UI based on role
  if (currentRole === 'medic') {
    // Medics see treatment records more prominently — already in rescued tab
    addLog('system', '🏥 Medic mode active — you can update treatment records and file compensation claims from the RESCUED tab.');
  } else if (currentRole === 'surveillance') {
    addLog('system', '🛰️ Command mode active — full system access enabled. All zones, drones, and NGO coordination available.');
  } else if (currentRole === 'rescuer') {
    addLog('system', '🦺 Rescuer mode active — use the RESCUED tab to log persons you bring in. Field reports go to Impulse AI.');
  }
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
  document.getElementById('userPill').style.display = 'flex';
  document.getElementById('userLabel').textContent = 'DEMO MODE';
  document.getElementById('rolePill').style.display = 'flex';
  document.getElementById('rolePillIcon').textContent = '🛰️ ';
  document.getElementById('rolePillName').textContent = 'DEMO';
  addLog('system', 'Running in demo mode — all features available.');
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
      ${c.notes ? `<div style="font-size:10px;color:var(--text2);margin-top:4px">${c.notes}</div>` : ''}
    </div>
  `).join('');
}

function updateCompensationBadge() {
  const pending = compensationCases.filter(c => c.status === 'pending').length;
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
    el.innerHTML += `
      <div class="zone-card" id="zc${i}" onclick="selectZone(${i})">
        <div class="zone-top">
          <span class="zone-id">ZONE ${z.id}</span>
          <span class="sev sev-${z.sev}">${z.sev}</span>
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
function renderMap() {
  const container = document.getElementById('mapContent');
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
  if (!name || !zone) { showToast('Please fill in name and zone'); return; }
  showToast('🔐 Encrypting with Zama TFHE...');
  const cipher = await fheEncrypt(name + '|' + zone + '|' + note);
  const cid = await pinToIPFS({ name_enc:cipher, zone, note, ts:Date.now(), node:NODE_ID });
  const rec = { name, zone, note, time:new Date().toLocaleTimeString(), cipher, cid };
  missingPersons.unshift(rec);
  renderMissingPersons();
  document.getElementById('mpName').value = '';
  document.getElementById('mpZone').value = '';
  document.getElementById('mpNote').value = '';
  broadcastToMesh({ type:'missing_person', record:rec });
  addMeshLog(`📋 Missing person FHE-encrypted: ${name}`);
  showToast(`🔒 ${name} logged · FHE encrypted`);
}

function renderMissingPersons() {
  const el = document.getElementById('mpList');
  el.innerHTML = missingPersons.map(p => `
    <div class="mp-card">
      <div class="mp-name">${p.name}</div>
      <div class="mp-meta">Zone ${p.zone} · ${p.note||'No details'} · ${p.time}</div>
      <div class="mp-enc">🔒 FHE: ${p.cipher.substring(0,28)}...<br>📦 IPFS: ${p.cid.substring(0,32)}...</div>
    </div>`).join('');
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
  const overlay = document.getElementById('droneOverlay');
  if (!overlay) return;
  overlay.innerHTML = '';
  DRONES.forEach(d => {
    if (d.status === 'charging') return;
    const pos = DRONE_MAP_POS[d.id];
    const pin = document.createElement('div');
    pin.className = 'drone-pin';
    pin.style.left = pos.x + '%'; pin.style.top = pos.y + '%';
    pin.title = `${d.name} — ${d.status} — Zone ${d.zone}`;
    pin.innerHTML = `🚁<div class="drone-label">${d.id}</div>`;
    overlay.appendChild(pin);
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
  const d = DRONES[i];
  if (d.status === 'charging') return;
  const zones = ['A2','B1','C3','D1','E4','F2','G1'];
  d.status = 'delivering'; d.zone = zones.find(z => z !== d.zone) || 'A2'; d.eta = Math.floor(5+Math.random()*15)+'min';
  renderDrones();
  addLog('info', `🚁 ${d.name} dispatched → Zone ${d.zone}, ETA ${d.eta}`);
  showToast(`🚁 ${d.name} dispatched to Zone ${d.zone}`);
}

function recallDrone(i) {
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
function openDispatch() { window.open('dispatch.html', '_blank'); }

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
    if (msg.type === 'missing_person') { missingPersons.unshift({...msg.record, name:msg.record.name+' [SYNCED]'}); renderMissingPersons(); addMeshLog(`👤 Missing person synced: ${msg.record.name}`); }
    if (msg.type === 'rescued_person') { addMeshLog(`🦺 Rescued person synced: ${msg.person.name}`); }
    if (msg.type === 'agent_msg') addMeshLog(`⚡ AI decision synced from ${msg.from}`);
    if (msg.type === 'field_report') addMeshLog(`📍 Field report from ${msg.from}: "${msg.text.substring(0,45)}..."`);
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
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
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
  const overlay = document.getElementById('vulnerableOverlay');
  if (!overlay) return;
  overlay.innerHTML = '';
  if (!showVulnerable) return;
  ZONES.forEach(z => {
    const v = VULNERABLE[z.id];
    if (!v) return;
    v.clusters.forEach(c => {
      const pin = document.createElement('div');
      pin.className = 'vuln-pin';
      pin.style.left = c.lng + '%'; pin.style.top = c.lat + '%';
      pin.title = c.note + ' (' + c.count + ' people)';
      pin.innerHTML = `<div class="vuln-ring">${c.count}</div><div class="vuln-label">${c.note.substring(0,18)}...</div>`;
      pin.onclick = () => showVulnPopup(z.id, c);
      overlay.appendChild(pin);
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
