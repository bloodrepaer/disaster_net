const SCHEMA = 'disasternet.sync.bundle.v1';

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateEventShape(event) {
  if (!event || typeof event !== 'object') return 'Event must be an object';
  if (!isNonEmptyString(event.id)) return 'Event.id is required';
  if (!isNonEmptyString(event.type)) return 'Event.type is required';
  if (!isNonEmptyString(event.ts)) return 'Event.ts is required';
  if (!isNonEmptyString(event.node)) return 'Event.node is required';
  if (!isNonEmptyString(event.prevHash)) return 'Event.prevHash is required';
  if (!isNonEmptyString(event.hash)) return 'Event.hash is required';
  if (!Object.prototype.hasOwnProperty.call(event, 'payload')) return 'Event.payload is required';

  const ts = Date.parse(event.ts);
  if (Number.isNaN(ts)) return 'Event.ts must be a valid timestamp';

  return null;
}

function verifyEventHash(event) {
  const base = `${event.prevHash}|${event.type}|${stableStringify(event.payload)}|${event.ts}|${event.node}`;
  const calculated = hashString(base);
  return calculated === event.hash;
}

function getBundleSigningPayload(bundle) {
  const signingMaterial = {
    schema: bundle.schema,
    nodeId: bundle.nodeId,
    generatedAt: bundle.generatedAt,
    previousAnchor: bundle.previousAnchor,
    headHash: bundle.headHash,
    eventCount: bundle.eventCount,
    eventHashes: Array.isArray(bundle.events) ? bundle.events.map((e) => e.hash) : [],
  };

  return stableStringify(signingMaterial);
}

function verifyBundle(bundle) {
  const errors = [];

  if (!bundle || typeof bundle !== 'object') {
    return { valid: false, errors: ['Bundle must be a JSON object'] };
  }

  if (bundle.schema !== SCHEMA) {
    errors.push(`schema must be ${SCHEMA}`);
  }

  if (!isNonEmptyString(bundle.generatedAt) || Number.isNaN(Date.parse(bundle.generatedAt))) {
    errors.push('generatedAt must be a valid timestamp string');
  }

  if (!isNonEmptyString(bundle.nodeId)) {
    errors.push('nodeId is required');
  }

  if (!isNonEmptyString(bundle.previousAnchor)) {
    errors.push('previousAnchor is required');
  }

  if (!isNonEmptyString(bundle.headHash)) {
    errors.push('headHash is required');
  }

  if (!Array.isArray(bundle.events)) {
    errors.push('events must be an array');
  }

  if (!Number.isInteger(bundle.eventCount)) {
    errors.push('eventCount must be an integer');
  }

  if (Array.isArray(bundle.events) && Number.isInteger(bundle.eventCount) && bundle.events.length !== bundle.eventCount) {
    errors.push('eventCount does not match events length');
  }

  if (!errors.length && Array.isArray(bundle.events)) {
    const seenIds = new Set();

    for (let i = 0; i < bundle.events.length; i++) {
      const event = bundle.events[i];
      const eventErr = validateEventShape(event);
      if (eventErr) {
        errors.push(`events[${i}]: ${eventErr}`);
        continue;
      }

      if (seenIds.has(event.id)) {
        errors.push(`events[${i}]: duplicate event id ${event.id}`);
      }
      seenIds.add(event.id);

      if (!verifyEventHash(event)) {
        errors.push(`events[${i}]: hash mismatch`);
      }

      if (i < bundle.events.length - 1) {
        const older = bundle.events[i + 1];
        if (older && older.hash && event.prevHash !== older.hash) {
          errors.push(`events[${i}]: prevHash does not match next older event hash`);
        }
      }
    }

    if (bundle.events[0] && bundle.events[0].hash !== bundle.headHash) {
      errors.push('headHash must equal the newest event hash');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  verifyBundle,
  verifyEventHash,
  getBundleSigningPayload,
  hashString,
  stableStringify,
};
