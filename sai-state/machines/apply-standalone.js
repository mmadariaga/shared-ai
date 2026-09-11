'use strict';

// apply-standalone@1 — run-scoped Step cursor for sai-4-apply self-gating.
// Owns the Step cursor and routing mode for apply runs: re-seeded from the plan
// file at each spawn, derives active Step from on-disk checkbox state per E1/E2,
// and provides routing-file pointers for each Step's inner stages.
//
// State shape (I2): follows explore-slice@1's { stage, set, active, done, mode }.
//  - set: Step inventory from implementation.md (order is authoritative)
//  - active: current Step; null when all are done
//  - done: completed Steps (fully-marked checkboxes)
//  - mode: routing mode of active Step (one of five conditions per runner.md)
//  - stage: position within routing (entry, re-seed position, terminal)
//
// Seeding (E1, I3): signal carries both set and done, because apply re-seeds
// a partially-completed run. Derives active from the rule (E2): fully-marked
// Step is done, first not-fully-marked is active, remainder pending.
//
// Routing (I7): composite stage IDs flatten mode × stage into STAGE_FILES keys,
// e.g., 'split-flow_entry', 'green-direct_entry', terminal. Five routing-mode
// files already exist under sai/commands/apply/steps/ (I4: no file I/O in machine).
//
// Re-seed stages (E3): partially-marked Step re-enters at entry stage; checkbox
// granularity carries no inner-stage info, so stage resets to entry.
//
// Terminal (E8): terminal-lifecycle.md fetched once at end when all Steps done;
// no progress protocol, no progress event (E6).
//
// Degradation (E9): on store failure, coordinator falls back to loading routing
// unconditionally; machine just provides the pointer.

const machineId = 'apply-standalone@1';

// Five routing conditions from runner.md § Step Routing Tree
const ROUTING_MODES = Object.freeze([
  'split-flow',                       // Condition 4: RED + contract + production
  'green-direct',                     // Condition 1: RED absent + production
  'green-exception-test-only',        // Condition 2: RED absent + no production
  'green-exception-no-production',    // Condition 5: RED + contract + no production
  'stop-missing-contract',            // Condition 3: RED absent matching contract
]);

// Map composite stage IDs to routing files (I7: flatten mode × stage lookup)
const STAGE_FILES = Object.freeze({
  'split-flow_entry': 'sai/commands/apply/steps/routing-split-flow.md',
  'green-direct_entry': 'sai/commands/apply/steps/routing-green-direct.md',
  'green-exception-test-only_entry': 'sai/commands/apply/steps/routing-green-exception-test-only.md',
  'green-exception-no-production_entry': 'sai/commands/apply/steps/routing-green-exception-no-production.md',
  'stop-missing-contract_entry': 'sai/commands/apply/steps/routing-stop-missing-contract.md',
  terminal: 'sai/commands/apply/steps/terminal-lifecycle.md',
});

const DONE_STAGE = 'done';

const initialState = Object.freeze({
  stage: 'entry',
  set: [],
  active: null,
  done: [],
  mode: null,
});

function cloneState(state) {
  const src = state && typeof state === 'object' ? state : {};
  const stage = typeof src.stage === 'string' ? src.stage : 'entry';
  const set = Array.isArray(src.set) ? src.set.slice() : [];
  const active = src.active == null ? null : src.active;
  const done = Array.isArray(src.done) ? src.done.slice() : [];
  const mode = typeof src.mode === 'string' ? src.mode : null;
  return { stage, set, active, done, mode };
}

function snapshotOf(current) {
  return {
    stage: current.stage,
    set: current.set.slice(),
    active: current.active,
    done: current.done.slice(),
    mode: current.mode,
  };
}

// E2: derivation rule from coordinator.md:68.
// Fully-marked Step is done, first not-fully-marked is active, rest pending.
function deriveActive(set, done) {
  for (const step of set) {
    if (done.indexOf(step) === -1) return step;
  }
  return null; // All Steps complete
}

function nextFor(mode, stage) {
  // Terminal: all Steps done, load final lifecycle
  if (stage === DONE_STAGE) {
    return { follow: STAGE_FILES.terminal, hint: 'fetch terminal lifecycle — all steps complete' };
  }

  // Composite key for mode and stage (I7: flatten mode × stage)
  const key = mode ? `${mode}_${stage}` : stage;
  const follow = STAGE_FILES[key] || 'none';
  return { follow, hint: `fetch ${mode || 'current'} routing — ${stage} stage` };
}

function outcome(current, rejected) {
  const state = {
    stage: current.stage,
    set: current.set.slice(),
    active: current.active,
    done: current.done.slice(),
    mode: current.mode,
  };
  const result = {
    state,
    snapshot: { state: snapshotOf(state), machineId },
    next: nextFor(state.mode, state.stage),
  };
  if (rejected) result.rejected = rejected;
  return result;
}

function project(state) {
  const current = cloneState(state);
  // E3: replacement re-resolves active from surviving done set
  if (!current.active || current.done.indexOf(current.active) !== -1) {
    current.active = deriveActive(current.set, current.done);
  }
  // Re-seed: active Step re-enters at entry stage
  if (current.active && current.stage !== 'entry') {
    current.stage = 'entry';
  }
  // All done: enter terminal stage
  if (!current.active) {
    current.stage = DONE_STAGE;
  }
  return {
    snapshot: { state: snapshotOf(current), machineId },
    next: nextFor(current.mode, current.stage),
  };
}

function transition(state, signal) {
  const current = cloneState(state);
  const sig = signal && typeof signal === 'object' ? signal : {};

  // E1, I3: seeding event carries both set and done (divergence from explore-slice)
  // Support both recordedDone and done field names for flexibility
  if (Array.isArray(sig.recordedList)) {
    current.set = sig.recordedList.slice();
    if (Array.isArray(sig.recordedDone)) {
      current.done = sig.recordedDone.slice();
    } else if (Array.isArray(sig.done)) {
      current.done = sig.done.slice();
    } else {
      current.done = [];
    }
    current.active = deriveActive(current.set, current.done);
    current.stage = current.active ? 'entry' : DONE_STAGE;
    current.mode = null; // Mode set by later signal
    return outcome(current);
  }

  // Coordinator signals with mode when routing conditions are determined
  if (sig.mode && ROUTING_MODES.indexOf(sig.mode) !== -1) {
    if (!current.active) {
      return outcome(current, 'ALREADY_DONE');
    }
    current.mode = sig.mode;
    current.stage = 'entry'; // E3: re-enter at entry stage
    return outcome(current);
  }

  // Advance to next Step (after current Step completes all stages)
  if (sig.intent === 'next-step' || sig.intent === 'complete-step') {
    if (current.active && current.done.indexOf(current.active) === -1) {
      current.done = current.done.concat([current.active]);
    }
    current.active = deriveActive(current.set, current.done);
    current.mode = null;
    current.stage = current.active ? 'entry' : DONE_STAGE;
    return outcome(current);
  }

  // Empty signal: parked state, no change
  if (!sig || Object.keys(sig).length === 0) {
    return outcome(current);
  }

  // Unknown signal
  return outcome(current, 'UNKNOWN_SIGNAL');
}

module.exports = {
  machineId,
  initialState,
  transition,
  project,
  ROUTING_MODES,
  STAGE_FILES,
  DONE_STAGE,
};
