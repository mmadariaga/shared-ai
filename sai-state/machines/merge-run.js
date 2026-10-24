'use strict';

// merge-run@1 — the run state of `/sai-merge`: the coordinator's memory outside
// its context window. It survives a context compaction and lets the
// coordinator resume an interrupted run. The generic run core (attempt budget,
// escalation, answers, records, close) lives in `run-core.js`; this machine
// adds the merge vocabulary: the method and branch of the run, the `HEAD`
// recorded before the launch, the baseline record, the conflict stop now being
// worked, and the reference kinds whose free text lives in files inside the run
// directory.
//
// Events, all JSON with a `kind`:
//   start      {dir}                                  opens the run; `dir` is the run directory;
//                                                     a completed or stopped run starts fresh
//   launch     {method, branch, head, baseline}       names the integration: method is merge | rebase |
//                                                     rebase-squash, head is the pre-launch HEAD, baseline is the
//                                                     path of the baseline record (omit when it is unavailable)
//   stop       {stop}                                 names the conflict stop now in progress (a positive integer)
//   attempt    {obstacle}                             spends one of the obstacle's attempts
//   escalate   {obstacle}                             the run waits for the user's answer
//   answer     {obstacle, choice}                     `continue` resets the obstacle, `stop` stops the run
//   record     {ref, path}                            ref: obstacle | finding | assumption
//   close      {outcome}                              outcome: completed | escalated | stopped
//   status     {}                                     changes nothing; returns the run state

const { createRunMachine } = require('./run-core.js');

const machineId = 'merge-run@1';

const METHODS = Object.freeze(['merge', 'rebase', 'rebase-squash']);

const REFS = Object.freeze({
  obstacle: 'obstacles',
  finding: 'findings',
  assumption: 'assumptions',
});

const COMMIT_ID = /^[0-9a-f]{7,64}$/;

function handleEvent(ctx, current, sig) {
  switch (sig.kind) {
    case 'launch': {
      if (METHODS.indexOf(sig.method) === -1) return ctx.reject('method must be merge, rebase, or rebase-squash');
      const branch = ctx.usablePath(sig.branch);
      if (!branch) return ctx.reject('branch required');
      if (typeof sig.head !== 'string' || !COMMIT_ID.test(sig.head)) return ctx.reject('pre-launch head commit required');
      const baseline = sig.baseline === undefined ? '' : ctx.usablePath(sig.baseline);
      if (baseline === null) return ctx.reject('baseline must be a path');
      if (!ctx.running) return ctx.reject('run is not running');
      current.method = sig.method;
      current.branch = branch;
      current.head = sig.head;
      current.baseline = baseline;
      return ctx.outcome(current);
    }

    case 'stop': {
      const index = Number(sig.stop);
      if (!Number.isInteger(index) || index < 1) return ctx.reject('stop index must be a positive integer');
      if (!ctx.running) return ctx.reject('run is not running');
      current.stop = String(index);
      return ctx.outcome(current);
    }

    default:
      return null;
  }
}

module.exports = createRunMachine({
  machineId,
  hint: 'merge run state — no fetch',
  refs: REFS,
  extraState: { method: '', branch: '', head: '', baseline: '', stop: '' },
  handleEvent,
  onClose(current) {
    current.stop = '';
  },
});

module.exports.METHODS = METHODS;
