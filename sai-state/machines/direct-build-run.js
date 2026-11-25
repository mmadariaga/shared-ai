'use strict';

// direct-build-run@1 — the run state of the Direct Build - Unattended route of
// `/sai-explore`: the coordinator card's memory outside its context window. It
// lives in the explore session next to `explore-slice@1`, holds the state of ONE
// slice at a time (`change`), survives a context compaction, and lets a parked
// slice resume and rewind to any route item whose state it stores. The generic
// run core (attempt budget, escalation, answers, records, close) lives in
// `run-core.js`; this machine adds the Direct Build vocabulary. It holds
// identifiers and paths only: reports and free text stay in the run directory,
// and `/sai-direct-build` never writes to it.
//
// Events, all JSON with a `kind`:
//   start        {dir, change}              opens the run of one slice; `dir` is the run directory
//   resume       {change}                   reopens the parked run of that slice (stopped, escalated, or running)
//   step         {step}                     the pending step: step-1, step-2, step-2b, step-3 … step-8
//   field        {field, value}             field: base_sha | slice_snapshot | route (no-specs | worker) |
//                                           fix_rounds | gate_rounds
//   checkpoint   {item}                     the state a route item needs on entry is stored; item:
//                                           build-implement | backfill | archive. Later items lose their
//                                           checkpoint, because their state is recomputed from here
//   order        {order, snapshot}          an execute order (backfill-execute | archive-execute) is about to
//                                           be sent, with its No-effect check reference; its effect is
//                                           uncertain until `order-result`
//   order-result {result}                   done (the order took effect: an archive order is consumed) |
//                                           no-effect (verified none) | uncertain (the check was inconclusive)
//   consume      {grant}                    a commit grant is consumed: archive-commit | telemetry-commit
//   attempt      {obstacle}                 spends one of the obstacle's attempts (obstacle: step-1 … step-8)
//   escalate     {obstacle}                 the run waits for the user's answer
//   answer       {obstacle, choice}         `continue` resets the obstacle, `stop` stops the run
//   record       {ref, path}                ref: report-dir | transfer-dir | evidence | project-dir | commit |
//                                           baseline | swap (`baseline` points only to the dirty git state, the
//                                           uncommitted paths the run never owns, recorded when the implementer is
//                                           dispatched; `swap` points to the record file of a test classification,
//                                           which a resumed run reads to bring the run's files back)
//   record       {ref: worker, role, handle, reason}
//                                           registers the handle of the worker of a role (implementer,
//                                           backfill, archive); reason: create | replace | resume
//   close        {outcome}                  outcome: completed | escalated | stopped
//   status       {}                         changes nothing; returns the run state
//
// Two events belong to `explore-slice@1`, whose CLI applies them in the same
// store write as the slice outcome: `discard {change}` returns a slice's run
// state to the initial state, and `rewind {change, item}` drops the checkpoints
// after `item` (the first item discards everything). Both leave another
// slice's state alone.

const { createRunMachine, workerHandleRecord } = require('./run-core.js');
const { DIRECT_BUILD_STEPS: ITEMS } = require('./explore-slice.js');

const machineId = 'direct-build-run@1';

const STEPS = Object.freeze(['step-1', 'step-2', 'step-2b', 'step-3', 'step-4', 'step-5', 'step-6', 'step-7', 'step-8']);
const ITEM_FIRST_STEP = Object.freeze({ 'build-implement': 'step-1', backfill: 'step-3', archive: 'step-7' });
const ORDERS = Object.freeze(['backfill-execute', 'archive-execute']);
const ORDER_RESULTS = Object.freeze(['done', 'no-effect', 'uncertain']);
const GRANTS = Object.freeze(['archive-commit', 'telemetry-commit']);
const ROUTES = Object.freeze(['no-specs', 'worker']);
const COUNTERS = Object.freeze(['fix_rounds', 'gate_rounds']);
const FIELDS = Object.freeze(['base_sha', 'slice_snapshot', 'route'].concat(COUNTERS));
const COMMIT_ID = /^[0-9a-f]{7,64}$/;
const NOT_APPLICABLE = 'n/a';

// What a route item needs in the store before its checkpoint is accepted.
const BASE_STATE = Object.freeze(['base_sha', 'slice_snapshot', 'report_dirs']);
const REQUIRED = Object.freeze({
  'build-implement': BASE_STATE,
  backfill: BASE_STATE.concat(['evidence']),
  archive: BASE_STATE.concat(['evidence', 'route', 'transfer_dirs']),
});

const REFS = Object.freeze({
  'report-dir': 'report_dirs',
  'transfer-dir': 'transfer_dirs',
  evidence: 'evidence',
  'project-dir': 'project_dirs',
  commit: 'commits',
  baseline: 'baselines',
  swap: 'swaps',
});

// A snapshot reference is the name of a record directory, or the literal `n/a`
// recorded when no snapshot could be taken.
function snapshotRef(ctx, raw) {
  return raw === NOT_APPLICABLE ? raw : ctx.usableId(raw);
}

function fieldValue(ctx, field, raw) {
  if (field === 'base_sha') return typeof raw === 'string' && COMMIT_ID.test(raw) ? raw : null;
  if (field === 'slice_snapshot') return snapshotRef(ctx, raw);
  if (field === 'route') return ROUTES.indexOf(raw) === -1 ? null : raw;
  const count = Number(raw);
  return raw !== '' && Number.isInteger(count) && count >= 0 && count <= 99 ? String(count) : null;
}

function isEmpty(value) {
  return Array.isArray(value) ? value.length === 0 : value === '';
}

// Returns a state to its initial values, keeping nothing of the slice.
function reset(current) {
  const initial = machine.initialState;
  for (const name of Object.keys(initial)) {
    const value = initial[name];
    current[name] = Array.isArray(value) ? value.slice() : (value && typeof value === 'object' ? {} : value);
  }
  return current;
}

function onStart(fresh, sig, ctx) {
  const change = ctx.usableId(sig.change);
  if (!change) return 'change name required';
  fresh.change = change;
  fresh.fix_rounds = '0';
  fresh.gate_rounds = '0';
  return null;
}

function handleEvent(ctx, current, sig) {
  switch (sig.kind) {
    case 'resume': {
      if (ctx.usableId(sig.change) !== current.change || current.change === '') return ctx.reject('no run state for that change');
      if (current.stage === 'idle') return ctx.reject('run is not started');
      if (current.stage === 'completed') return ctx.reject('run is completed');
      current.stage = 'running';
      current.blocker = '';
      return ctx.outcome(current);
    }

    case 'step': {
      if (STEPS.indexOf(sig.step) === -1) return ctx.reject('step must be step-1 … step-8');
      if (!ctx.running) return ctx.reject('run is not running');
      current.step = sig.step;
      return ctx.outcome(current);
    }

    case 'field': {
      if (FIELDS.indexOf(sig.field) === -1) return ctx.reject('field must be ' + FIELDS.join(', '));
      if (!ctx.running) return ctx.reject('run is not running');
      const value = fieldValue(ctx, sig.field, sig.value);
      if (value === null) return ctx.reject('value is not valid for ' + sig.field);
      current[sig.field] = value;
      return ctx.outcome(current);
    }

    case 'checkpoint': {
      const index = ITEMS.indexOf(sig.item);
      if (index === -1) return ctx.reject('item must be ' + ITEMS.join(', '));
      if (!ctx.running) return ctx.reject('run is not running');
      const missing = REQUIRED[sig.item].filter((name) => isEmpty(current[name]));
      if (missing.length > 0) return ctx.reject('run state incomplete', { missing });
      current.items = ITEMS.slice(0, index + 1);
      current.step = ITEM_FIRST_STEP[sig.item];
      return ctx.outcome(current);
    }

    case 'order': {
      if (ORDERS.indexOf(sig.order) === -1) return ctx.reject('order must be ' + ORDERS.join(' or '));
      const snapshot = snapshotRef(ctx, sig.snapshot);
      if (!snapshot) return ctx.reject('order snapshot required');
      if (!ctx.running) return ctx.reject('run is not running');
      if (current.consumed.indexOf(sig.order) !== -1) return ctx.reject('order already consumed');
      current.order = sig.order;
      current.order_snapshot = snapshot;
      current.order_state = 'sent';
      return ctx.outcome(current);
    }

    case 'order-result': {
      if (ORDER_RESULTS.indexOf(sig.result) === -1) return ctx.reject('result must be ' + ORDER_RESULTS.join(', '));
      if (current.order === '') return ctx.reject('no order is in flight');
      if (sig.result === 'uncertain') {
        current.order_state = 'uncertain';
        return ctx.outcome(current);
      }
      if (sig.result === 'done' && current.order === 'archive-execute') current.consumed.push(current.order);
      current.order = '';
      current.order_state = '';
      return ctx.outcome(current);
    }

    case 'consume': {
      if (GRANTS.indexOf(sig.grant) === -1) return ctx.reject('grant must be ' + GRANTS.join(' or '));
      if (!ctx.running) return ctx.reject('run is not running');
      if (current.consumed.indexOf(sig.grant) === -1) current.consumed.push(sig.grant);
      return ctx.outcome(current);
    }

    case 'discard': {
      if (ctx.usableId(sig.change) === current.change) reset(current);
      return ctx.outcome(current);
    }

    case 'rewind': {
      const index = ITEMS.indexOf(sig.item);
      if (index === -1) return ctx.reject('item must be ' + ITEMS.join(', '));
      if (ctx.usableId(sig.change) !== current.change) return ctx.outcome(current);
      if (index === 0) return ctx.outcome(reset(current));
      current.items = current.items.filter((item) => ITEMS.indexOf(item) <= index);
      current.step = ITEM_FIRST_STEP[sig.item];
      return ctx.outcome(current);
    }

    default:
      return null;
  }
}

const machine = createRunMachine({
  machineId,
  hint: 'direct build run state — no fetch',
  refs: REFS,
  extraState: {
    change: '',
    step: '',
    base_sha: '',
    slice_snapshot: '',
    route: '',
    fix_rounds: '0',
    gate_rounds: '0',
    order: '',
    order_snapshot: '',
    order_state: '',
    items: [],
    consumed: [],
    workers: [],
  },
  handleEvent,
  handleRecord: workerHandleRecord,
  onStart,
});

// What `explore-slice@1` needs to judge a rewind, passed in its `goto` event:
// the slice the stored state belongs to, the route items whose state is stored,
// and whether a rewind is held (`consumed`: an archive order or a commit grant
// was consumed, which a rewind would renew; `uncertain`: an execute order's
// effect is not settled, which a rewind would replay).
function rewindView(state) {
  const current = machine.project(state).run;
  let hold = '';
  if (current.consumed.length > 0) hold = 'consumed';
  else if (current.order_state !== '') hold = 'uncertain';
  return { change: current.change, items: current.items, hold };
}

module.exports = Object.assign({}, machine, { ITEMS, STEPS, rewindView });
