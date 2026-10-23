'use strict';

// run-core — the generic part of a run machine: the coordinator's memory
// outside its context window. The state holds identifiers and paths only,
// because store events carry identifiers, never free text; free text lives in
// files inside the run directory and the machine records their paths.
//
// The core owns the attempt budget of 3 per obstacle and the events
//   start      {dir}                  opens the run; a completed or stopped run starts fresh
//   attempt    {obstacle}             spends one of the obstacle's attempts
//   escalate   {obstacle}             the run waits for the user's answer
//   answer     {obstacle, choice}     `continue` resets the obstacle, `stop` stops the run
//   record     {ref, path}            appends a path to the list the ref kind names
//   close      {outcome}              outcome: completed | escalated | stopped
//   status     {}                     changes nothing; returns the run state
//
// A run machine built on the core adds only its own vocabulary:
//   refs         ref kind -> state list field that `record` appends to
//   extraState   its own state fields, each a string ('') or a list of strings ([])
//   handleEvent  (ctx, current, sig) for the events the core does not own; returns
//                an outcome, or null for an unknown event
//   onClose      (current) called when the run closes

const ATTEMPT_BUDGET = 3;
const STAGES = Object.freeze(['idle', 'running', 'escalated', 'completed', 'stopped']);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

function strings(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : [];
}

function usableId(value) {
  return typeof value === 'string' && ID_PATTERN.test(value) ? value : null;
}

function usablePath(value) {
  return typeof value === 'string' && value.trim() !== '' && !/[\r\n]/.test(value) ? value.trim() : null;
}

function createRunMachine({ machineId, hint, refs, extraState, handleEvent, onClose }) {
  const extra = Object.freeze(Object.assign({}, extraState));
  const refFields = Object.freeze(Object.assign({}, refs));
  const fieldNames = Object.keys(extra).concat(Object.keys(refFields).map((kind) => refFields[kind]));

  const initialState = Object.freeze(Object.assign({
    stage: 'idle',
    dir: '',
    blocker: '',
    attempts: {},
  }, extra, Object.fromEntries(Object.keys(refFields).map((kind) => [refFields[kind], []]))));

  const next = Object.freeze({ follow: 'none', hint });

  function cloneField(name, src) {
    const initial = initialState[name];
    if (Array.isArray(initial)) return strings(src[name]);
    return typeof src[name] === 'string' ? src[name] : '';
  }

  function cloneState(state) {
    const src = state && typeof state === 'object' ? state : {};
    const attempts = {};
    if (src.attempts && typeof src.attempts === 'object' && !Array.isArray(src.attempts)) {
      for (const key of Object.keys(src.attempts)) {
        const n = Math.floor(Number(src.attempts[key]));
        if (Number.isFinite(n) && n > 0) attempts[key] = Math.min(n, ATTEMPT_BUDGET);
      }
    }
    const current = {
      stage: STAGES.indexOf(src.stage) === -1 ? 'idle' : src.stage,
      dir: typeof src.dir === 'string' ? src.dir : '',
      blocker: typeof src.blocker === 'string' ? src.blocker : '',
      attempts,
    };
    for (const name of fieldNames) current[name] = cloneField(name, src);
    return current;
  }

  function copyFields(current, target) {
    for (const name of fieldNames) {
      target[name] = Array.isArray(current[name]) ? current[name].slice() : current[name];
    }
    return target;
  }

  function budgetsOf(current) {
    const budgets = {};
    for (const key of Object.keys(current.attempts)) {
      budgets[key] = { spent: current.attempts[key], limit: ATTEMPT_BUDGET };
    }
    return budgets;
  }

  function viewOf(current) {
    return copyFields(current, { status: current.stage, dir: current.dir, blocker: current.blocker });
  }

  function snapshotOf(current) {
    return copyFields(current, {
      stage: current.stage,
      dir: current.dir,
      blocker: current.blocker,
      attempts: Object.assign({}, current.attempts),
    });
  }

  function outcome(current, more) {
    const result = {
      state: snapshotOf(current),
      snapshot: { state: snapshotOf(current), machineId },
      next,
      budgets: budgetsOf(current),
      run: viewOf(current),
    };
    return Object.assign(result, more || {});
  }

  function transition(state, signal) {
    const current = cloneState(state);
    const sig = signal && typeof signal === 'object' && !Array.isArray(signal) ? signal : null;
    if (!sig || typeof sig.kind !== 'string') return null;

    const reject = (reason, more) => outcome(current, Object.assign({ rejected: reason }, more || {}));
    const running = current.stage === 'running';

    switch (sig.kind) {
      case 'status':
        return outcome(current);

      case 'start': {
        const dir = usablePath(sig.dir);
        if (!dir) return reject('run directory required');
        // A finished run (completed or stopped) whose session outlived its close
        // must not block the next run of the same change: it starts fresh.
        // A running or escalated run is interrupted work and resumes instead.
        if (current.stage === 'running' || current.stage === 'escalated') return reject('ALREADY_RUNNING');
        const fresh = cloneState(initialState);
        fresh.stage = 'running';
        fresh.dir = dir;
        return outcome(fresh);
      }

      case 'attempt': {
        const obstacle = usableId(sig.obstacle);
        if (!obstacle) return reject('obstacle id required');
        if (!running) return reject('run is not running');
        const spent = current.attempts[obstacle] || 0;
        if (spent >= ATTEMPT_BUDGET) return reject('exhaustion', { exhausted: obstacle });
        current.attempts[obstacle] = spent + 1;
        return outcome(current);
      }

      case 'escalate': {
        const obstacle = usableId(sig.obstacle);
        if (!obstacle) return reject('obstacle id required');
        if (!running) return reject('run is not running');
        current.stage = 'escalated';
        current.blocker = obstacle;
        return outcome(current);
      }

      case 'answer': {
        const obstacle = usableId(sig.obstacle);
        if (!obstacle) return reject('obstacle id required');
        if (current.stage !== 'escalated') return reject('no escalation is waiting');
        if (current.blocker !== obstacle) return reject('obstacle is not the open escalation');
        if (sig.choice === 'continue') {
          delete current.attempts[obstacle];
          current.stage = 'running';
          current.blocker = '';
          return outcome(current);
        }
        if (sig.choice === 'stop') {
          current.stage = 'stopped';
          return outcome(current);
        }
        return reject('choice must be continue or stop');
      }

      case 'record': {
        const field = Object.prototype.hasOwnProperty.call(refFields, sig.ref) ? refFields[sig.ref] : null;
        const path = usablePath(sig.path);
        if (!field) return reject('unknown reference kind');
        if (!path) return reject('path required');
        if (current.stage === 'idle') return reject('run is not started');
        if (current[field].indexOf(path) === -1) current[field].push(path);
        return outcome(current);
      }

      case 'close': {
        if (['completed', 'escalated', 'stopped'].indexOf(sig.outcome) === -1) {
          return reject('outcome must be completed, escalated, or stopped');
        }
        if (current.stage === 'idle') return reject('run is not started');
        current.stage = sig.outcome;
        if (onClose) onClose(current);
        return outcome(current);
      }

      default:
        return handleEvent
          ? handleEvent({ outcome, reject, running, usableId, usablePath }, current, sig)
          : null;
    }
  }

  function project(state) {
    const current = cloneState(state);
    return {
      snapshot: { state: snapshotOf(current), machineId },
      budgets: budgetsOf(current),
      run: viewOf(current),
      next,
    };
  }

  return { machineId, ATTEMPT_BUDGET, initialState, transition, project };
}

module.exports = { createRunMachine };
