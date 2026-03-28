const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, 'data');
const BUNDLES_FILE = path.join(DATA_DIR, 'bundles.json');
const VOLUNTEERS_FILE = path.join(DATA_DIR, 'volunteers.json');
const ANCHORS_FILE = path.join(DATA_DIR, 'anchors.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BUNDLES_FILE)) fs.writeFileSync(BUNDLES_FILE, '[]', 'utf8');
  if (!fs.existsSync(VOLUNTEERS_FILE)) fs.writeFileSync(VOLUNTEERS_FILE, '[]', 'utf8');
  if (!fs.existsSync(ANCHORS_FILE)) fs.writeFileSync(ANCHORS_FILE, '[]', 'utf8');
}

function readBundles() {
  ensureStore();
  try {
    const raw = fs.readFileSync(BUNDLES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function writeBundles(bundles) {
  ensureStore();
  fs.writeFileSync(BUNDLES_FILE, JSON.stringify(bundles, null, 2), 'utf8');
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
  ensureStore();
  try {
    const raw = fs.readFileSync(VOLUNTEERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function writeVolunteers(volunteers) {
  ensureStore();
  fs.writeFileSync(VOLUNTEERS_FILE, JSON.stringify(volunteers, null, 2), 'utf8');
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
  ensureStore();
  try {
    const raw = fs.readFileSync(ANCHORS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function writeAnchors(anchors) {
  ensureStore();
  fs.writeFileSync(ANCHORS_FILE, JSON.stringify(anchors, null, 2), 'utf8');
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
};
