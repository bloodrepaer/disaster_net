const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, 'data');
const BUNDLES_FILE = path.join(DATA_DIR, 'bundles.json');
const VOLUNTEERS_FILE = path.join(DATA_DIR, 'volunteers.json');
const ANCHORS_FILE = path.join(DATA_DIR, 'anchors.json');
const PERSONS_FILE = path.join(DATA_DIR, 'persons.json');
const OTP_FILE = path.join(DATA_DIR, 'otps.json');
const SMS_FILE = path.join(DATA_DIR, 'sms.json');
const RECEIPTS_FILE = path.join(DATA_DIR, 'anchor_receipts.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BUNDLES_FILE)) fs.writeFileSync(BUNDLES_FILE, '[]', 'utf8');
  if (!fs.existsSync(VOLUNTEERS_FILE)) fs.writeFileSync(VOLUNTEERS_FILE, '[]', 'utf8');
  if (!fs.existsSync(ANCHORS_FILE)) fs.writeFileSync(ANCHORS_FILE, '[]', 'utf8');
  if (!fs.existsSync(PERSONS_FILE)) fs.writeFileSync(PERSONS_FILE, '[]', 'utf8');
  if (!fs.existsSync(OTP_FILE)) fs.writeFileSync(OTP_FILE, '{}', 'utf8');
  if (!fs.existsSync(SMS_FILE)) fs.writeFileSync(SMS_FILE, '[]', 'utf8');
  if (!fs.existsSync(RECEIPTS_FILE)) fs.writeFileSync(RECEIPTS_FILE, '[]', 'utf8');
}

function readJsonArray(filePath) {
  ensureStore();
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray(filePath, rows) {
  ensureStore();
  fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf8');
}

function readJsonObject(filePath) {
  ensureStore();
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    return {};
  } catch {
    return {};
  }
}

function writeJsonObject(filePath, data) {
  ensureStore();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function readBundles() {
  return readJsonArray(BUNDLES_FILE);
}

function writeBundles(bundles) {
  writeJsonArray(BUNDLES_FILE, bundles);
}

function addBundle(entry) {
  const bundles = readBundles();
  bundles.unshift(entry);
  writeBundles(bundles);
  return entry;
}

function listBundles(limit = 50) {
  return readBundles().slice(0, Math.max(1, Math.min(limit, 200)));
}

function getBundleById(id) {
  return readBundles().find((b) => b.id === id) || null;
}

function readVolunteers() {
  return readJsonArray(VOLUNTEERS_FILE);
}

function writeVolunteers(volunteers) {
  writeJsonArray(VOLUNTEERS_FILE, volunteers);
}

function upsertVolunteer(record) {
  const volunteers = readVolunteers();
  const idx = volunteers.findIndex((v) => v.nodeId === record.nodeId);
  if (idx >= 0) {
    volunteers[idx] = { ...volunteers[idx], ...record, updatedAt: new Date().toISOString() };
  } else {
    volunteers.unshift({ ...record, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  writeVolunteers(volunteers);
  return volunteers.find((v) => v.nodeId === record.nodeId) || null;
}

function getVolunteerByNodeId(nodeId) {
  return readVolunteers().find((v) => v.nodeId === nodeId) || null;
}

function listVolunteers(limit = 100) {
  return readVolunteers().slice(0, Math.max(1, Math.min(limit, 500)));
}

function getLatestBundleForNode(nodeId) {
  return readBundles().find((b) => b.nodeId === nodeId) || null;
}

function hasBundleHeadHash(nodeId, headHash) {
  return readBundles().some((b) => b.nodeId === nodeId && b.headHash === headHash);
}

function hasAnyEventId(eventIds) {
  if (!Array.isArray(eventIds) || !eventIds.length) return false;
  const idSet = new Set(eventIds);
  const bundles = readBundles();
  for (const b of bundles) {
    const events = b.bundle?.events || [];
    for (const e of events) {
      if (idSet.has(e.id)) return true;
    }
  }
  return false;
}

function readAnchors() {
  return readJsonArray(ANCHORS_FILE);
}

function writeAnchors(anchors) {
  writeJsonArray(ANCHORS_FILE, anchors);
}

function queueAnchor(entry) {
  const anchors = readAnchors();
  anchors.unshift(entry);
  writeAnchors(anchors);
  return entry;
}

function listAnchors({ limit = 100, status } = {}) {
  let anchors = readAnchors();
  if (status) anchors = anchors.filter((a) => a.status === status);
  return anchors.slice(0, Math.max(1, Math.min(limit, 500)));
}

function getAnchorById(id) {
  return readAnchors().find((a) => a.id === id) || null;
}

function updateAnchor(id, updates) {
  const anchors = readAnchors();
  const idx = anchors.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  anchors[idx] = {
    ...anchors[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeAnchors(anchors);
  return anchors[idx];
}

function readPersons() {
  return readJsonArray(PERSONS_FILE);
}

function writePersons(persons) {
  writeJsonArray(PERSONS_FILE, persons);
}

function addPerson(person) {
  const persons = readPersons();
  persons.unshift(person);
  writePersons(persons);
  return person;
}

function getPersonById(personId) {
  return readPersons().find((p) => p.id === personId) || null;
}

function listPersons(limit = 200) {
  return readPersons().slice(0, Math.max(1, Math.min(limit, 1000)));
}

function updatePerson(personId, mutator) {
  const persons = readPersons();
  const idx = persons.findIndex((p) => p.id === personId);
  if (idx < 0) return null;
  const next = mutator({ ...persons[idx] });
  if (!next) return null;
  persons[idx] = { ...next, updatedAt: new Date().toISOString() };
  writePersons(persons);
  return persons[idx];
}

function searchPersons(query, limit = 50) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  return readPersons()
    .filter((p) => {
      const name = String(p.name || '').toLowerCase();
      const phone = String(p.phone || '').toLowerCase();
      return name.includes(q) || phone.includes(q);
    })
    .slice(0, Math.max(1, Math.min(limit, 200)));
}

function readOtps() {
  return readJsonObject(OTP_FILE);
}

function writeOtps(otps) {
  writeJsonObject(OTP_FILE, otps);
}

function setOtpRecord(personId, otpRecord) {
  const all = readOtps();
  all[personId] = otpRecord;
  writeOtps(all);
  return otpRecord;
}

function getOtpRecord(personId) {
  const all = readOtps();
  return all[personId] || null;
}

function clearOtpRecord(personId) {
  const all = readOtps();
  delete all[personId];
  writeOtps(all);
}

function listSms(limit = 200) {
  return readJsonArray(SMS_FILE).slice(0, Math.max(1, Math.min(limit, 1000)));
}

function addSms(entry) {
  const rows = readJsonArray(SMS_FILE);
  rows.unshift(entry);
  writeJsonArray(SMS_FILE, rows);
  return entry;
}

function listAnchorReceipts({ limit = 200, nodeId, bundleId } = {}) {
  let rows = readJsonArray(RECEIPTS_FILE);
  if (nodeId) rows = rows.filter((r) => r.nodeId === nodeId);
  if (bundleId) rows = rows.filter((r) => r.bundleId === bundleId);
  return rows.slice(0, Math.max(1, Math.min(limit, 1000)));
}

function getAnchorReceiptById(id) {
  return readJsonArray(RECEIPTS_FILE).find((r) => r.id === id) || null;
}

function addAnchorReceipt(entry) {
  const rows = readJsonArray(RECEIPTS_FILE);
  rows.unshift(entry);
  writeJsonArray(RECEIPTS_FILE, rows);
  return entry;
}

module.exports = {
  addBundle,
  listBundles,
  getBundleById,
  upsertVolunteer,
  getVolunteerByNodeId,
  listVolunteers,
  getLatestBundleForNode,
  hasBundleHeadHash,
  hasAnyEventId,
  queueAnchor,
  listAnchors,
  getAnchorById,
  updateAnchor,
  addPerson,
  getPersonById,
  listPersons,
  updatePerson,
  searchPersons,
  setOtpRecord,
  getOtpRecord,
  clearOtpRecord,
  addSms,
  listSms,
  addAnchorReceipt,
  listAnchorReceipts,
  getAnchorReceiptById,
};
