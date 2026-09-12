'use strict';

// recovery-ledger@1 — per-segment three-slot ledger for bounded recovery.
// Owns diagnosis-key normalization, duplicate detection, and slot accounting.
// Coordinator sends raw (path, point, boundary) tuples; machine normalizes
// them for comparison. State tracks seen keys and remaining slots. Always
// returns next: { follow: 'none', ... } per E4.

const machineId = 'recovery-ledger@1';

const initialState = Object.freeze({
  ledger: [],     // Array of normalized [path, point, boundary] tuples seen
  stage: '',      // Current slot ordinal as string ('1', '2', '3', or '')
});

// Normalize diagnosis key components per spec item 5:
// - path: repository-relative with / separators, remove redundant . segments
// - point: trim and collapse whitespace
// - boundary: canonical spelling
function normalizeKey(key) {
  if (!Array.isArray(key) || key.length !== 3) {
    return null;
  }

  const [path, point, boundary] = key;

  // Normalize path: repository-relative, /, remove redundant .
  let normalizedPath = String(path || '')
    .replace(/\\/g, '/')           // Windows to Unix separators
    .replace(/\/\.\//g, '/')       // Remove /./ segments
    .replace(/^\.\//, '')          // Remove leading ./
    .replace(/\/\.$/g, '');        // Remove trailing /.

  // Normalize concrete point: trim and collapse whitespace
  let normalizedPoint = String(point || '')
    .trim()
    .replace(/\s+/g, ' ');

  // Canonical spelling for correction boundary
  let normalizedBoundary = String(boundary || '');

  return [normalizedPath, normalizedPoint, normalizedBoundary];
}

// Convert key to stable string for comparison
function keyToString(key) {
  if (!Array.isArray(key) || key.length !== 3) {
    return null;
  }
  return JSON.stringify(key);
}

function cloneState(state) {
  const src = state && typeof state === 'object' ? state : {};
  const ledger = Array.isArray(src.ledger) ? src.ledger.slice() : [];
  const stage = typeof src.stage === 'string' ? src.stage : '';
  return { ledger, stage };
}

function snapshotOf(current) {
  return {
    ledger: current.ledger.slice(),
    stage: current.stage || '',
  };
}

function slotsUsed(ledger) {
  return Math.min(ledger.length, 3);
}

function transition(state, signal) {
  const current = cloneState(state);
  const sig = signal && typeof signal === 'object' ? signal : {};
  const rawKey = Array.isArray(sig.key) ? sig.key : null;

  const normalizedKey = rawKey ? normalizeKey(rawKey) : null;

  // Check if key is a duplicate (among normalized keys)
  let isDuplicate = false;
  if (normalizedKey) {
    const targetStr = keyToString(normalizedKey);
    for (const entry of current.ledger) {
      if (keyToString(entry) === targetStr) {
        isDuplicate = true;
        break;
      }
    }
  }

  const result = {
    state: {
      ledger: current.ledger.slice(),
      stage: '',
    },
    snapshot: { state: snapshotOf({ ledger: current.ledger, stage: '' }), machineId },
    next: { follow: 'none', hint: 'recovery ledger — no fetch' },
  };

  if (isDuplicate) {
    // Duplicate: reject with stopping reason, spend zero slots
    result.rejected = 'duplicate diagnosis';
    result.state.stage = '';
    result.state = Object.freeze(result.state);
    return result;
  }

  if (!normalizedKey) {
    // No key provided: no action, spend zero slots
    result.state.stage = '';
    result.state = Object.freeze(result.state);
    return result;
  }

  // Check if slots remain
  const slotsUsedNow = slotsUsed(current.ledger);
  if (slotsUsedNow >= 3) {
    // Exhaustion: no slots remain, spend zero slots
    result.rejected = 'exhaustion';
    result.state.stage = '';
    result.state = Object.freeze(result.state);
    return result;
  }

  // Record new key: add to ledger, consume one slot
  result.state.ledger = current.ledger.concat([normalizedKey]);
  result.state.ledger = Object.freeze(result.state.ledger);

  // stage carries the slot ordinal (1, 2, or 3) as a string so it reaches the wire
  const nextOrdinal = slotsUsedNow + 1;
  result.state.stage = String(nextOrdinal);
  result.state = Object.freeze(result.state);

  return result;
}

function project(state) {
  const current = cloneState(state);
  return {
    snapshot: { state: snapshotOf(current), machineId },
    next: { follow: 'none', hint: 'recovery ledger — no fetch' },
  };
}

module.exports = {
  machineId,
  initialState,
  transition,
  project,
};
