'use strict';

// plan-run@1 — the run state of `/sai-1-spec`, `/sai-2-design`, and `/sai-plan`:
// the coordinator's memory outside its context window. It survives a context
// compaction and lets the coordinator resume. The generic run core (attempt
// budget, escalation, answers, records, close) lives in `run-core.js`; this
// machine adds the plan vocabulary: the segment now running (`spec` or
// `design`), the segments already completed, and the reference kinds whose free
// text lives in files inside the run directory.
//
// Events, all JSON with a `kind`:
//   start         {dir}                  opens the run; `dir` is the run directory;
//                                        a completed or stopped run starts fresh
//   segment-start {segment}              names the segment now running (spec | design)
//   segment-done  {segment}              the segment closed
//   attempt       {obstacle}             spends one of the obstacle's attempts
//   escalate      {obstacle}             the run waits for the user's answer
//   answer        {obstacle, choice}     `continue` resets the obstacle, `stop` stops the run
//   record        {ref, path}            ref: assumption | report | finding | baseline
//   close         {outcome}              outcome: completed | escalated | stopped
//   status        {}                     changes nothing; returns the run state

const { createRunMachine } = require('./run-core.js');

const machineId = 'plan-run@1';

const SEGMENTS = Object.freeze(['spec', 'design']);

const REFS = Object.freeze({
  assumption: 'assumptions',
  report: 'reports',
  finding: 'findings',
  baseline: 'baselines',
});

function usableSegment(value) {
  return SEGMENTS.indexOf(value) === -1 ? null : value;
}

function handleEvent(ctx, current, sig) {
  switch (sig.kind) {
    case 'segment-start': {
      const segment = usableSegment(sig.segment);
      if (!segment) return ctx.reject('segment must be spec or design');
      if (!ctx.running) return ctx.reject('run is not running');
      current.segment = segment;
      return ctx.outcome(current);
    }

    case 'segment-done': {
      const segment = usableSegment(sig.segment);
      if (!segment) return ctx.reject('segment must be spec or design');
      if (!ctx.running) return ctx.reject('run is not running');
      if (current.completed.indexOf(segment) === -1) current.completed.push(segment);
      if (current.segment === segment) current.segment = '';
      return ctx.outcome(current);
    }

    default:
      return null;
  }
}

module.exports = createRunMachine({
  machineId,
  hint: 'plan run state — no fetch',
  refs: REFS,
  extraState: { segment: '', completed: [] },
  handleEvent,
  onClose(current) {
    current.segment = '';
  },
});

module.exports.SEGMENTS = SEGMENTS;
