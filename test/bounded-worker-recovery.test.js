'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const artifact = relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

test('worker failures expose closed classification metadata after resolution only', () => {
  const lifecycle = artifact('sai/orchestration/worker-core.md');
  assert.match(lifecycle, /failure_class/);
  assert.match(lifecycle, /unrecoverable:\s*boolean/);
  assert.match(lifecycle, /blocking-contradiction[\s\S]*validation-failed[\s\S]*generation-error[\s\S]*dispatch-failed[\s\S]*envelope-contract-violation[\s\S]*unclassified-worker-fault/);
  assert.match(lifecycle, /outer-envelope-violation[\s\S]*(?:coordinator-authored|only the coordinator)/i);
  assert.match(lifecycle, /pre-resolution[\s\S]*(?:omit|only)[\s\S]*(?:failure_class|classification)/i);
});

test('shared runner owns the immutable three-attempt same-worker recovery pool', () => {
  const runner = artifact('sai/orchestration/command-runner.md');
  assert.match(runner, /recovery_policy/);
  assert.match(runner, /continue_after_recovery/);
  assert.match(runner, /three|3/);
  assert.match(runner, /same[- ]worker/i);
  assert.match(runner, /recovery[\s\S]{0,400}(?:never|no)[\s\S]{0,120}replacement/i);
  assert.match(runner, /blocking-contradiction[\s\S]*validation-failed[\s\S]*generation-error[\s\S]*dispatch-failed[\s\S]*envelope-contract-violation[\s\S]*unclassified-worker-fault/);
  assert.match(runner, /outer-envelope-violation/);
});

test('recovery preserves ordinary continuation fallback and invocation accounting', () => {
  const runner = artifact('sai/orchestration/command-runner.md');
  assert.match(runner, /outside recovery[\s\S]{0,260}(?:replacement|fallback)/i);
  assert.match(runner, /changed_files[\s\S]{0,260}(?:first-seen|ordered)[\s\S]{0,260}(?:never|not)[\s\S]{0,80}reset/i);
  assert.match(runner, /needs_input[\s\S]{0,300}(?:exit|resume)[\s\S]{0,180}(?:normal|input)/i);
  assert.match(runner, /cancelled[\s\S]{0,180}(?:never|no)[\s\S]{0,120}recovery/i);
  assert.match(runner, /--fast-track[\s\S]{0,180}(?:neither|not|same)[\s\S]{0,180}(?:pool|recovery)/i);
});

test('recovery reporting is conversational and never mutates progress plan state', () => {
  const runner = artifact('sai/orchestration/command-runner.md');
  assert.match(runner, /failure class[\s\S]{0,220}(?:1|2|3)[\s\S]{0,100}of 3/i);
  assert.match(runner, /attempts spent|attempt count/i);
  assert.match(runner, /recovery[\s\S]{0,260}(?:does not|never)[\s\S]{0,180}(?:mark|extend|rename|add)[\s\S]{0,120}progress/i);
});

test('active orchestration capability declares the optional recovery seam', () => {
  const spec = artifact('openspec/specs/orchestration-core/spec.md');
  assert.match(spec, /optional static `recovery_policy`/);
  assert.match(spec, /continue_after_recovery/);
  assert.match(spec, /never dispatch a replacement worker from that recovery path/i);
});

test('design overview recovery keeps generator classification separate from the closed nested envelope', () => {
  const routing = artifact('openspec/specs/change-overview-generation-routing/spec.md');
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(routing, /failure_kind[\s\S]{0,260}(?:unchanged|same)[\s\S]{0,220}failure_class/i,
    'valid failed generator results should propagate failure_kind unchanged to failure_class');
  assert.match(routing, /status[\s\S]{0,180}changed_files[\s\S]{0,180}validation[\s\S]{0,180}failure_details[\s\S]{0,180}failure_kind/i,
    'the nested generator result should retain the five-field order');
  assert.match(worker, /post-resolution[\s\S]{0,300}overview_language[\s\S]{0,300}failure_class[\s\S]{0,300}unrecoverable/i,
    'post-resolution design failures should retain invocation-scoped overview_language with failure metadata');
  assert.match(worker, /overview_language[\s\S]{0,260}(?:absent|missing)[\s\S]{0,180}English/i,
    'the absent overview language flag should default to English');
});

test('overview soundness vetoes the first envelope violation before any bounded recovery attempt', () => {
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(worker, /before[\s\S]{0,300}(?:first )?return(?:ing)?[\s\S]{0,180}envelope-contract-violation[\s\S]{0,420}(?:overview|existing overview)[\s\S]{0,160}sound/i,
    'overview soundness must be verified before returning the first envelope violation');
  assert.match(worker, /unsound[\s\S]{0,260}unrecoverable:\s*true[\s\S]{0,260}(?:zero|0)[\s\S]{0,120}recovery attempts/i,
    'an unsound overview must veto recovery with zero attempts');
});

test('overview recovery re-dispatches eligible failures inside the shared attempt pool', () => {
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(worker, /validation[\s\S]{0,180}generation[\s\S]{0,180}dispatch[\s\S]{0,240}re-dispatch/i,
    'validation, generation, and dispatch failures should all permit overview re-dispatch');
  assert.match(worker, /re-dispatch[\s\S]{0,240}(?:existing|same)[\s\S]{0,100}attempt/i,
    'overview recovery should stay inside the existing attempt');
  assert.match(worker, /(?:no|without|never)[\s\S]{0,180}(?:second|additional)[\s\S]{0,160}(?:ordinary )?regeneration allowance/i,
    'overview recovery must not open a second ordinary regeneration allowance');
});

test('verified recovery commits current overview state and preserves incomplete-state accounting', () => {
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(worker, /verified recovery completion[\s\S]{0,300}overview\.state:\s*current/i,
    'verified recovery completion should commit overview.state: current');
  assert.match(worker, /current[\s\S]{0,300}(?:clear|clears|cleared)[\s\S]{0,160}(?:both|failure_kind[\s\S]{0,80}failure_details)/i,
    'verified recovery completion should clear both overview diagnostics');
  assert.match(worker, /ordered[\s-]+changed[-_]file union[\s\S]{0,240}\.openspec\.yaml/i,
    'durable metadata should enter the ordered changed-file union');
  assert.match(worker, /(?:first materialization|first-materialization)[\s\S]{0,300}failed[\s\S]{0,240}(?:regeneration|re-generation)[\s\S]{0,220}stale/i,
    'incomplete recovery should retain failed versus stale state mapping');
  assert.match(worker, /(?:failure class|failure_class)[\s\S]{0,220}(?:attempts spent|attempt ordinal|attempts)[\s\S]{0,220}(?:stopping reason|reason for stopping)/i,
    'incomplete recovery should report class, attempts spent, and stopping reason');
});

test('composition scopes the recovery pool per adapter segment and keeps the changed-files union across transitions', () => {
  const runner = artifact('sai/orchestration/command-runner.md');
  assert.match(runner, /segment-scoped|active adapter segment/i,
    'recovery pool must be segment-scoped under composition');
  assert.match(runner, /fresh[\s\S]{0,80}three[- ]attempt|fresh[\s\S]{0,80}pool/i,
    'a later recovery_policy: true segment must receive a fresh three-attempt pool');
  assert.match(runner, /(?:shall not|must not|does not|never)[\s\S]{0,120}inherit[\s\S]{0,120}(?:depleted|exhausted|remaining)/i,
    'a later segment must not inherit a depleted budget');
  assert.match(runner, /changed[-_ ]files[\s\S]{0,200}(?:across|span)[\s\S]{0,120}(?:transition|segment)/i,
    'the changed-files union must continue across segment transitions');
  assert.match(runner, /(?:shall not|must not|never)[\s\S]{0,80}reset[\s\S]{0,80}(?:at a )?transition/i,
    'the union must not reset at a transition');
});
