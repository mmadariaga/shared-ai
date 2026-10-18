'use strict';

// implement-run@1 — the run state of `/sai-3-implement`: the coordinator's
// memory outside its context window. It survives a context compaction and lets
// the coordinator resume. The state holds identifiers and paths only (the
// current step, the attempts spent per obstacle, and references to the files
// that carry the free text), because store events carry identifiers, never free
// text. Deviations, overrides, worker reports, and findings live in files inside
// the run directory; this machine records their paths.
//
// Events, all JSON with a `kind`:
//   start      {dir}                     opens the run; `dir` is the run directory;
//                                        a completed or stopped run starts fresh
//   step-start {step}                    names the step now in progress
//   step-done  {step}                    the step is committed
//   attempt    {obstacle}                spends one of the obstacle's attempts
//   escalate   {obstacle}                the run waits for the user's answer
//   answer     {obstacle, choice}        `continue` resets the obstacle, `stop` stops the run
//   record     {ref, path}               ref: deviation | override | report | finding | baseline
//   close      {outcome}                 outcome: completed | escalated | stopped
//   status     {}                        changes nothing; returns the run state

const machineId = 'implement-run@1';

const ATTEMPT_BUDGET = 3;
const STAGES = Object.freeze(['idle', 'running', 'escalated', 'completed', 'stopped']);
const REFS = Object.freeze({
  deviation: 'deviations',
  override: 'overrides',
  report: 'reports',
  finding: 'findings',
  baseline: 'baselines',
});
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

const initialState = Object.freeze({
  stage: 'idle',
  dir: '',
  step: '',
  blocker: '',
  committed: [],
  attempts: {},
  deviations: [],
  overrides: [],
  reports: [],
  findings: [],
  baselines: [],
});

function strings(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : [];
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
  return {
    stage: STAGES.indexOf(src.stage) === -1 ? 'idle' : src.stage,
    dir: typeof src.dir === 'string' ? src.dir : '',
    step: typeof src.step === 'string' ? src.step : '',
    blocker: typeof src.blocker === 'string' ? src.blocker : '',
    committed: strings(src.committed),
    attempts,
    deviations: strings(src.deviations),
    overrides: strings(src.overrides),
    reports: strings(src.reports),
    findings: strings(src.findings),
    baselines: strings(src.baselines),
  };
}

function usableId(value) {
  return typeof value === 'string' && ID_PATTERN.test(value) ? value : null;
}

function usablePath(value) {
  return typeof value === 'string' && value.trim() !== '' && !/[\r\n]/.test(value) ? value.trim() : null;
}

function budgetsOf(current) {
  const budgets = {};
  for (const key of Object.keys(current.attempts)) {
    budgets[key] = { spent: current.attempts[key], limit: ATTEMPT_BUDGET };
  }
  return budgets;
}

function viewOf(current) {
  return {
    status: current.stage,
    dir: current.dir,
    step: current.step,
    blocker: current.blocker,
    committed: current.committed.slice(),
    deviations: current.deviations.slice(),
    overrides: current.overrides.slice(),
    reports: current.reports.slice(),
    findings: current.findings.slice(),
    baselines: current.baselines.slice(),
  };
}

function snapshotOf(current) {
  return {
    stage: current.stage,
    dir: current.dir,
    step: current.step,
    blocker: current.blocker,
    committed: current.committed.slice(),
    attempts: Object.assign({}, current.attempts),
    deviations: current.deviations.slice(),
    overrides: current.overrides.slice(),
    reports: current.reports.slice(),
    findings: current.findings.slice(),
    baselines: current.baselines.slice(),
  };
}

const NEXT = Object.freeze({ follow: 'none', hint: 'implement run state — no fetch' });

function outcome(current, extra) {
  const result = {
    state: snapshotOf(current),
    snapshot: { state: snapshotOf(current), machineId },
    next: NEXT,
    budgets: budgetsOf(current),
    run: viewOf(current),
  };
  return Object.assign(result, extra || {});
}

function transition(state, signal) {
  const current = cloneState(state);
  const sig = signal && typeof signal === 'object' && !Array.isArray(signal) ? signal : null;
  if (!sig || typeof sig.kind !== 'string') return null;

  const reject = (reason, extra) => outcome(current, Object.assign({ rejected: reason }, extra || {}));
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

    case 'step-start': {
      const step = usableId(sig.step);
      if (!step) return reject('step id required');
      if (!running) return reject('run is not running');
      current.step = step;
      return outcome(current);
    }

    case 'step-done': {
      const step = usableId(sig.step);
      if (!step) return reject('step id required');
      if (!running) return reject('run is not running');
      if (current.committed.indexOf(step) === -1) current.committed.push(step);
      if (current.step === step) current.step = '';
      return outcome(current);
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
      const field = Object.prototype.hasOwnProperty.call(REFS, sig.ref) ? REFS[sig.ref] : null;
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
      current.step = '';
      return outcome(current);
    }

    default:
      return null;
  }
}

function project(state) {
  const current = cloneState(state);
  return {
    snapshot: { state: snapshotOf(current), machineId },
    budgets: budgetsOf(current),
    run: viewOf(current),
    next: NEXT,
  };
}

module.exports = {
  machineId,
  ATTEMPT_BUDGET,
  initialState,
  transition,
  project,
};
