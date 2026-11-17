'use strict';

// implement-run@1 — the run state of `/sai-3-implement`: the coordinator's
// memory outside its context window. It survives a context compaction and lets
// the coordinator resume. The generic run core (attempt budget, escalation,
// answers, records, close) lives in `run-core.js`; this machine adds the
// implement vocabulary: the current step, the committed steps, and the
// reference kinds whose free text lives in files inside the run directory.
//
// Events, all JSON with a `kind`:
//   start      {dir}                     opens the run; `dir` is the run directory;
//                                        a completed or stopped run starts fresh
//   step-start {step}                    names the step now in progress
//   step-done  {step}                    the step is committed
//   attempt    {obstacle}                spends one of the obstacle's attempts
//   escalate   {obstacle}                the run waits for the user's answer
//   answer     {obstacle, choice}        `continue` resets the obstacle, `stop` stops the run
//   record     {ref, path}               ref: deviation | override | report | report-dir | finding | baseline
//   record     {ref: worker, role, handle, reason}
//                                        registers the handle of the worker of a role; reason:
//                                        create | replace | resume. A second distinct handle for a
//                                        role under reason create is recorded and answered with the
//                                        warning WORKER_HANDLE_CHANGED (`warnings` in the response)
//   close      {outcome}                 outcome: completed | escalated | stopped
//   status     {}                        changes nothing; returns the run state

const { createRunMachine } = require('./run-core.js');

const machineId = 'implement-run@1';

const REFS = Object.freeze({
  deviation: 'deviations',
  override: 'overrides',
  report: 'reports',
  'report-dir': 'report_dirs',
  finding: 'findings',
  baseline: 'baselines',
});

const WORKER_REASONS = Object.freeze(['create', 'replace', 'resume']);
const WORKER_HANDLE_CHANGED = 'WORKER_HANDLE_CHANGED';

// `workers` lists `role:handle` entries in registration order; the last entry of a role is its current handle.
function handlesOf(current, role) {
  const prefix = role + ':';
  return current.workers.filter((entry) => entry.indexOf(prefix) === 0).map((entry) => entry.slice(prefix.length));
}

function handleRecord(ctx, current, sig) {
  if (sig.ref !== 'worker') return null;
  if (current.stage === 'idle') return ctx.reject('run is not started');
  const role = ctx.usableId(sig.role);
  if (!role || role.indexOf(':') !== -1) return ctx.reject('role required');
  const handle = ctx.usableId(sig.handle);
  if (!handle) return ctx.reject('handle required');
  if (WORKER_REASONS.indexOf(sig.reason) === -1) return ctx.reject('reason must be create, replace, or resume');
  const handles = handlesOf(current, role);
  const previous = handles.length > 0 ? handles[handles.length - 1] : '';
  if (previous === handle) return ctx.outcome(current);
  current.workers.push(role + ':' + handle);
  if (previous !== '' && sig.reason === 'create') return ctx.outcome(current, { warnings: [WORKER_HANDLE_CHANGED] });
  return ctx.outcome(current);
}

function handleEvent(ctx, current, sig) {
  switch (sig.kind) {
    case 'step-start': {
      const step = ctx.usableId(sig.step);
      if (!step) return ctx.reject('step id required');
      if (!ctx.running) return ctx.reject('run is not running');
      current.step = step;
      return ctx.outcome(current);
    }

    case 'step-done': {
      const step = ctx.usableId(sig.step);
      if (!step) return ctx.reject('step id required');
      if (!ctx.running) return ctx.reject('run is not running');
      if (current.committed.indexOf(step) === -1) current.committed.push(step);
      if (current.step === step) current.step = '';
      return ctx.outcome(current);
    }

    default:
      return null;
  }
}

module.exports = createRunMachine({
  machineId,
  hint: 'implement run state — no fetch',
  refs: REFS,
  extraState: { step: '', committed: [], workers: [] },
  handleEvent,
  handleRecord,
  onClose(current) {
    current.step = '';
  },
});
