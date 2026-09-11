'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('CLI invocation surface: instructions.md fetches the common policy and names the owning machines', () => {
  const instructions = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'explore', 'instructions.md'), 'utf8');
  const policy = fs.readFileSync(path.join(__dirname, '..', 'sai', 'policies', 'stage-machine.md'), 'utf8');

  // Single source: the operational contract lives in the common policy.
  assert.match(instructions, /Fetch @sai\/policies\/stage-machine\.md/);
  assert.match(instructions, /explore-idea@1/);
  assert.match(instructions, /explore-slice@1/);
  assert.doesNotMatch(instructions, /explore-stage@1/);
  assert.doesNotMatch(instructions, /POST.*\/emit/);
  assert.doesNotMatch(instructions, /x-sai-token/);
  assert.match(instructions, /next\.follow/);

  // Canonical verb spellings live only in the policy, not in the prompt.
  assert.doesNotMatch(instructions, /sai-state spawn/);
  assert.doesNotMatch(instructions, /sai-state emit/);
  assert.doesNotMatch(instructions, /sai-state close/);
  assert.match(policy, /sai-state spawn/);
  assert.match(policy, /sai-state emit/);
  assert.match(policy, /sai-state close/);
});

test('store-owned state cycle: the policy owns the durable store and the spawn-then-emit cycle', () => {
  const instructions = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'explore', 'instructions.md'), 'utf8');
  const policy = fs.readFileSync(path.join(__dirname, '..', 'sai', 'policies', 'stage-machine.md'), 'utf8');

  // The prompt keeps only its event table: the stage-event turn and the owning machine.
  assert.match(instructions, /[Ee]very stage-event turn/);
  assert.match(instructions, /spawn-then-emit cycle/);

  // The operational detail lives in the policy.
  assert.match(policy, /durable store/);
  assert.match(policy, /sai-state spawn/);
  assert.match(policy, /sai-state emit/);
  assert.match(policy, /\{stage, next: \{follow, hint\}, rejected\?, warnings\?\}/);
  assert.match(policy, /no state object and no/i);
  assert.match(policy, /snapshot travel/i);
  assert.match(policy, /SESSION_FILE_CORRUPT/);
  assert.match(policy, /disposable presentation hint/i);
  assert.match(policy, /deletes the session file/);
  assert.match(policy, /starts from the initial/);
  assert.doesNotMatch(instructions, /SESSION_FILE_CORRUPT/);
  assert.doesNotMatch(instructions, /disposable presentation hint/);
  assert.doesNotMatch(instructions, /carry the returned `snapshot` in conversation/);
  assert.doesNotMatch(instructions, /restore-per-turn cycle/);
  assert.doesNotMatch(instructions, /spawn.*session start/i);
  assert.doesNotMatch(instructions, /spawn.*start of session/i);
  assert.doesNotMatch(instructions, /read-only probe/);
});

test('sidecar degraded path: the policy describes hold-and-ask without re-deriving rules', () => {
  const instructions = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'explore', 'instructions.md'), 'utf8');
  const policy = fs.readFileSync(path.join(__dirname, '..', 'sai', 'policies', 'stage-machine.md'), 'utf8');

  // Degraded path hold-and-ask lives in the policy.
  assert.match(policy, /hold the current stage/);
  assert.match(policy, /ask the user for an explicit next step/);
  assert.match(policy, /without re-deriving the transition table in prose/);

  // Restore failure handling lives in the policy, not the prompt.
  assert.match(policy, /Version-mismatch and closed-session outcomes fall to this degraded path/i);
  assert.match(policy, /version[- ]mismatch/i);
  assert.doesNotMatch(instructions, /hold the current stage/);
  assert.doesNotMatch(instructions, /Degradation due to version mismatch/);
});

test('single-source rule: transition rules removed from prose, not restated', () => {
  const common = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'explore', 'steps', 'common.md'), 'utf8');
  const instructions = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'explore', 'instructions.md'), 'utf8');

  // Verify removed destination-stage wording does not reappear
  assert.doesNotMatch(common, /advance to `Implementation details` without the agreement question/);
  assert.doesNotMatch(common, /advance without a confirmation question/);
  assert.doesNotMatch(common, /its deterministic rule may continue the same turn into `Crystallize`/);

  // Verify sole exceptions wording removed from instructions
  assert.doesNotMatch(instructions, /The sole exceptions are the deterministic empty-set rules/);

  // Verify machine is referenced, not rules re-stated
  assert.match(common, /The machine\'s transition function/);
  assert.match(instructions, /The machine consumes content-based recordings/);

  // Verify no state machine logic re-implemented in prose
  assert.doesNotMatch(common, /shouldAutoAdvance/);
  assert.doesNotMatch(common, /STAGES\.indexOf/);
  assert.doesNotMatch(instructions, /shouldAutoAdvance/);
  assert.doesNotMatch(instructions, /STAGES\[/);
});
