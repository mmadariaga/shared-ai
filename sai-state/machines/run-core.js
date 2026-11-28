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
//   publication {value}               only for a machine built with `publication: true`: records
//                                     the run's publication answer, one of the machine's
//                                     `publicationAnswers` (yes | no by default); an explicit
//                                     later value replaces the recorded one
//
// A run machine built on the core adds only its own vocabulary:
//   refs         ref kind -> state list field that `record` appends to
//   extraState   its own state fields, each a string ('') or a list of strings ([])
//   handleEvent  (ctx, current, sig) for the events the core does not own; returns
//                an outcome, or null for an unknown event
//   handleRecord (ctx, current, sig) for a `record` whose ref is not in `refs`; returns an
//                outcome, or null to leave the ref unknown
//   onClose      (current) called when the run closes
//   onStart      (fresh, sig, ctx) called when a run starts, with the fresh state it opens; returns
//                a rejection reason to refuse the start, or nothing to accept it
//   publication  true when the run carries a publication answer: the `publication` state field
//                ('' until answered), the `publication` event, and the field in the `run` view.
//                `publicationAnswers` names the values the machine accepts (yes | no by default),
//                so each run machine opens only its own surface. The answer survives a
//                resumption; a fresh run starts with none.
//   choices      extra closed-choice fields of the machine, `{field: [value ...]}`: each one is a
//                state field ('' until answered), an event of the field's name, and a field of the
//                `run` view, exactly like `publication` above. An explicit later value replaces the
//                recorded one.

const ATTEMPT_BUDGET = 3;
const STAGES = Object.freeze(['idle', 'running', 'escalated', 'completed', 'stopped']);
const PUBLICATION_ANSWERS = Object.freeze(['yes', 'no']);
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

const WORKER_REASONS = Object.freeze(['create', 'replace', 'resume']);
const WORKER_HANDLE_CHANGED = 'WORKER_HANDLE_CHANGED';

// `record {ref: worker, role, handle, reason}` for a machine whose state holds a
// `workers` list of `role:handle` entries in registration order; the last entry
// of a role is its current handle. A second distinct handle for a role under
// reason `create` is recorded and answered with the warning WORKER_HANDLE_CHANGED.
function workerHandleRecord(ctx, current, sig) {
  if (sig.ref !== 'worker') return null;
  if (current.stage === 'idle') return ctx.reject('run is not started');
  const role = ctx.usableId(sig.role);
  if (!role || role.indexOf(':') !== -1) return ctx.reject('role required');
  const handle = ctx.usableId(sig.handle);
  if (!handle) return ctx.reject('handle required');
  if (WORKER_REASONS.indexOf(sig.reason) === -1) return ctx.reject('reason must be create, replace, or resume');
  const prefix = role + ':';
  const handles = current.workers.filter((entry) => entry.indexOf(prefix) === 0).map((entry) => entry.slice(prefix.length));
  const previous = handles.length > 0 ? handles[handles.length - 1] : '';
  if (previous === handle) return ctx.outcome(current);
  current.workers.push(role + ':' + handle);
  if (previous !== '' && sig.reason === 'create') return ctx.outcome(current, { warnings: [WORKER_HANDLE_CHANGED] });
  return ctx.outcome(current);
}

function createRunMachine({ machineId, hint, refs, extraState, handleEvent, handleRecord, onClose, onStart, publication, publicationAnswers, choices }) {
  const declared = Object.assign({}, choices && typeof choices === 'object' && !Array.isArray(choices) ? choices : {});
  const answers = publication === true
    ? Object.freeze(Array.isArray(publicationAnswers) && publicationAnswers.length > 0
      ? publicationAnswers.slice()
      : PUBLICATION_ANSWERS)
    : null;
  if (answers !== null) declared.publication = answers;
  const choiceFields = Object.freeze(Object.fromEntries(
    Object.entries(declared).map(([field, values]) => [field, Object.freeze(Array.isArray(values) ? values.slice() : [])]),
  ));
  const extra = Object.freeze(Object.assign({}, extraState, Object.fromEntries(Object.keys(choiceFields).map((field) => [field, '']))));
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

    // A declared closed-choice field: its event name is the field name.
    if (Object.prototype.hasOwnProperty.call(choiceFields, sig.kind)) {
      const values = choiceFields[sig.kind];
      if (!running) return reject('run is not running');
      if (values.indexOf(sig.value) === -1) return reject(sig.kind + ' must be ' + values.join(' or '));
      current[sig.kind] = sig.value;
      return outcome(current);
    }

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
        const refusal = onStart ? onStart(fresh, sig, { usableId, usablePath }) : null;
        if (refusal) return reject(refusal);
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
        if (!field && handleRecord) {
          const handled = handleRecord({ outcome, reject, running, usableId, usablePath }, current, sig);
          if (handled) return handled;
        }
        const path = usablePath(sig.path);
        if (!field) return reject('unknown reference kind');
        if (!path) return reject('path required');
        if (current.stage === 'idle') return reject('run is not started');
        if (current[field].indexOf(path) === -1) current[field].push(path);
        return outcome(current);
      }

      case 'publication': {
        // A declared `publication` field is handled above as a closed choice; an
        // undeclared machine hands the event to its own vocabulary.
        return handleEvent ? handleEvent({ outcome, reject, running, usableId, usablePath }, current, sig) : null;
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

module.exports = { createRunMachine, workerHandleRecord, ID_PATTERN };
