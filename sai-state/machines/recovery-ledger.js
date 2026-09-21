'use strict';

// recovery-ledger@1 — per-recovery-scope three-slot worker ledger for bounded
// recovery, plus the coordinator's own three-attempt budget for the same scope.
// Owns diagnosis-key normalization, duplicate detection, and slot accounting
// for both budgets. Coordinator sends raw (path, point, boundary) tuples;
// machine normalizes them for comparison. State tracks seen worker keys, seen
// coordinator keys, the steps already entered in this scope, and coordinator
// attempts spent. Always returns next: { follow: 'none', ... } per E4.
// A reset (segment boundary) clears everything; a `step-entry` signal grants a
// fresh pair of budgets on the first entry to a Step only, so a Step re-entered
// after a correction keeps its already spent budgets (E9).
// Every outcome reports both budgets, and an exhaustion names the budget that
// ran out, so what was spent on each is readable from the store response.

const machineId = 'recovery-ledger@1';

const COORDINATOR_BUDGET = 3;
const WORKER_SLOTS = 3;

const initialState = Object.freeze({
  ledger: [],     // Array of normalized [path, point, boundary] tuples seen
  stage: '',      // Current slot ordinal as string ('1', '2', '3', or '')
  coordinator_attempts: 0, // Coordinator attempts spent in this recovery scope
  coordinator_ledger: [],  // Normalized keys the coordinator already attempted
  entered_steps: [],       // Step identifiers already entered in this scope
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

function containsKey(entries, normalizedKey) {
  if (!normalizedKey) return false;
  const targetStr = keyToString(normalizedKey);
  for (const entry of entries) {
    if (keyToString(entry) === targetStr) {
      return true;
    }
  }
  return false;
}

// A Step identifier is usable only when it is a non-empty trimmed string.
function normalizeStepId(step) {
  if (typeof step !== 'string') return null;
  const trimmed = step.trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed : null;
}

function cloneState(state) {
  const src = state && typeof state === 'object' ? state : {};
  const ledger = Array.isArray(src.ledger) ? src.ledger.slice() : [];
  const stage = typeof src.stage === 'string' ? src.stage : '';
  const raw = Number(src.coordinator_attempts);
  const coordinatorAttempts = Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), COORDINATOR_BUDGET) : 0;
  const coordinatorLedger = Array.isArray(src.coordinator_ledger) ? src.coordinator_ledger.slice() : [];
  const enteredSteps = Array.isArray(src.entered_steps)
    ? src.entered_steps.filter((entry) => typeof entry === 'string')
    : [];
  return {
    ledger,
    stage,
    coordinator_attempts: coordinatorAttempts,
    coordinator_ledger: coordinatorLedger,
    entered_steps: enteredSteps,
  };
}

function snapshotOf(current) {
  return {
    ledger: current.ledger.slice(),
    stage: current.stage || '',
    coordinator_attempts: current.coordinator_attempts || 0,
    coordinator_ledger: (current.coordinator_ledger || []).slice(),
    entered_steps: (current.entered_steps || []).slice(),
  };
}

// Self-describing tallies: which budget is exhausted and what each has spent
// is readable from the store response instead of remembered in conversation.
function budgetsOf(current) {
  return {
    worker: { spent: slotsUsed(current.ledger), limit: WORKER_SLOTS },
    coordinator: { spent: current.coordinator_attempts || 0, limit: COORDINATOR_BUDGET },
  };
}

function isCoordinatorSignal(sig) {
  return sig.kind === 'coordinator-attempt' || sig.scope === 'coordinator';
}

function isStepEntrySignal(sig) {
  return sig.kind === 'step-entry';
}

function slotsUsed(ledger) {
  return Math.min(ledger.length, WORKER_SLOTS);
}

function finish(result, stateAfter) {
  result.budgets = budgetsOf(stateAfter);
  result.state = Object.freeze(result.state);
  return result;
}

function transition(state, signal) {
  const current = cloneState(state);
  const sig = signal && typeof signal === 'object' ? signal : {};
  const rawKey = Array.isArray(sig.key) ? sig.key : null;

  const normalizedKey = rawKey ? normalizeKey(rawKey) : null;

  const result = {
    state: {
      ledger: current.ledger.slice(),
      stage: '',
      coordinator_attempts: current.coordinator_attempts,
      coordinator_ledger: current.coordinator_ledger.slice(),
      entered_steps: current.entered_steps.slice(),
    },
    snapshot: {
      state: snapshotOf(Object.assign({}, current, { stage: '' })),
      machineId,
    },
    next: { follow: 'none', hint: 'recovery ledger — no fetch' },
  };

  // Step entry: the reset is what grants the budgets, so it is guarded by the
  // Step identity. A Step entered for the first time in this scope gets a fresh
  // pair of budgets; a Step re-entered after a correction keeps what it spent.
  if (isStepEntrySignal(sig)) {
    const stepId = normalizeStepId(sig.step);
    if (!stepId) {
      // No usable Step identity: fail closed and grant nothing.
      result.step_entry = 'unidentified';
      return finish(result, result.state);
    }
    if (current.entered_steps.indexOf(stepId) !== -1) {
      result.step_entry = 're-entry';
      return finish(result, result.state);
    }
    result.state.ledger = [];
    result.state.coordinator_ledger = [];
    result.state.coordinator_attempts = 0;
    result.state.entered_steps = current.entered_steps.concat([stepId]);
    result.step_entry = 'first';
    return finish(result, result.state);
  }

  // Coordinator budget: attempts the coordinator spends itself (delegating a
  // corrective dispatch or self-editing), counted separately from the worker
  // ledger slots and exhausted at COORDINATOR_BUDGET per recovery scope. A
  // coordinator attempt carries the same diagnosis key as a worker attempt, so
  // a repeated diagnosis costs zero instead of spending an attempt.
  if (isCoordinatorSignal(sig)) {
    if (!normalizedKey) {
      // No concrete key: unresolved cause, spend zero attempts.
      result.rejected = 'unresolved cause';
      return finish(result, result.state);
    }
    if (containsKey(current.coordinator_ledger, normalizedKey)) {
      result.rejected = 'duplicate diagnosis';
      return finish(result, result.state);
    }
    const spent = current.coordinator_attempts;
    if (spent >= COORDINATOR_BUDGET) {
      result.rejected = 'exhaustion';
      result.exhausted = 'coordinator';
      return finish(result, result.state);
    }
    result.state.coordinator_attempts = spent + 1;
    result.state.coordinator_ledger = current.coordinator_ledger.concat([normalizedKey]);
    result.state.stage = String(spent + 1);
    return finish(result, result.state);
  }

  if (containsKey(current.ledger, normalizedKey)) {
    // Duplicate: reject with stopping reason, spend zero slots
    result.rejected = 'duplicate diagnosis';
    return finish(result, result.state);
  }

  if (!normalizedKey) {
    // No key provided: no action, spend zero slots
    return finish(result, result.state);
  }

  // Check if slots remain
  const slotsUsedNow = slotsUsed(current.ledger);
  if (slotsUsedNow >= WORKER_SLOTS) {
    // Exhaustion: no slots remain, spend zero slots
    result.rejected = 'exhaustion';
    result.exhausted = 'worker';
    return finish(result, result.state);
  }

  // Record new key: add to ledger, consume one slot
  result.state.ledger = Object.freeze(current.ledger.concat([normalizedKey]));

  // stage carries the slot ordinal (1, 2, or 3) as a string so it reaches the wire
  result.state.stage = String(slotsUsedNow + 1);

  return finish(result, result.state);
}

function project(state) {
  const current = cloneState(state);
  return {
    snapshot: { state: snapshotOf(current), machineId },
    budgets: budgetsOf(current),
    next: { follow: 'none', hint: 'recovery ledger — no fetch' },
  };
}

module.exports = {
  machineId,
  initialState,
  transition,
  project,
};
