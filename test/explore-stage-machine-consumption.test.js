'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('sidecar invocation surface: instructions.md names spawn and loopback routes', () => {
  const instructions = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'explore', 'instructions.md'), 'utf8');

  // Sidecar invocation contract
  assert.match(instructions, /sai-state spawn/);
  assert.match(instructions, /explore-stage@1/);
  assert.match(instructions, /POST.*\/emit/);
  assert.match(instructions, /POST.*\/restore/);
  assert.match(instructions, /\/close/);
  assert.match(instructions, /x-sai-token/);
  assert.match(instructions, /next\.follow/);
  assert.match(instructions, /state\.stage/);
});

test('sidecar restore-per-turn cycle: contract names every stage-event turn as trigger', () => {
  const instructions = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'explore', 'instructions.md'), 'utf8');

  // The sidecar is not a persistent holder: every stage-event turn runs the
  // same restore-per-turn cycle (spawn reuse-or-fresh, /restore, then /emit).
  assert.match(instructions, /restore-per-turn cycle/);
  assert.match(instructions, /every stage-event turn/);
  assert.match(instructions, /spawn \(reuse-or-fresh\), `\/restore`, then `\/emit`/);
  assert.match(instructions, /carry the returned `snapshot` in conversation/);
  assert.doesNotMatch(instructions, /spawn.*session start/i);
  assert.doesNotMatch(instructions, /spawn.*start of session/i);
});

test('sidecar degraded path: contract describes hold-and-ask without re-deriving rules', () => {
  const instructions = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'explore', 'instructions.md'), 'utf8');

  // Degraded path hold-and-ask
  assert.match(instructions, /sidecar is unreachable.*hold the current stage/);
  assert.match(instructions, /ask the user to advance explicitly/);
  assert.match(instructions, /degraded mode without re-deriving the transition table in prose/);

  // Restore failure handling
  assert.match(instructions, /Restore failures.*fall to the degraded path/);
  assert.match(instructions, /version mismatch/);

  // Degraded path stated once, not as full fallback
  const degradedPathMatches = instructions.match(/degraded.*path/gi);
  assert.ok(degradedPathMatches && degradedPathMatches.length >= 1);

  // Hold stage without re-deriving rules in prose
  assert.match(instructions, /hold the current stage/);
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
