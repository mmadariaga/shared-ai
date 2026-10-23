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
//   record     {ref, path}               ref: deviation | override | report | finding | baseline
//   close      {outcome}                 outcome: completed | escalated | stopped
//   status     {}                        changes nothing; returns the run state

const { createRunMachine } = require('./run-core.js');

const machineId = 'implement-run@1';

const REFS = Object.freeze({
  deviation: 'deviations',
  override: 'overrides',
  report: 'reports',
  finding: 'findings',
  baseline: 'baselines',
});

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
  extraState: { step: '', committed: [] },
  handleEvent,
  onClose(current) {
    current.step = '';
  },
});
