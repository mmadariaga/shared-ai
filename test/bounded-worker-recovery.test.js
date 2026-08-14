'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const artifact = relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

test('worker failures expose closed classification metadata after resolution only', () => {
  const lifecycle = artifact('sai/worker-core.md');
  assert.match(lifecycle, /failure_class/);
  assert.match(lifecycle, /unrecoverable:\s*boolean/);
  assert.match(lifecycle, /blocking-contradiction[\s\S]*validation-failed[\s\S]*generation-error[\s\S]*dispatch-failed[\s\S]*envelope-contract-violation[\s\S]*unclassified-worker-fault/);
  assert.match(lifecycle, /outer-envelope-violation[\s\S]*(?:coordinator-authored|only the coordinator)/i);
  assert.match(lifecycle, /pre-resolution[\s\S]*(?:omit|only)[\s\S]*(?:failure_class|classification)/i);
});

test('shared runner owns the immutable three-attempt same-worker recovery pool', () => {
  const runner = artifact('sai/command-runner.md');
  assert.match(runner, /recovery_policy/);
  assert.match(runner, /continue_after_recovery/);
  assert.match(runner, /three|3/);
  assert.match(runner, /same[- ]worker/i);
  assert.match(runner, /recovery[\s\S]{0,400}(?:never|no)[\s\S]{0,120}replacement/i);
  assert.match(runner, /blocking-contradiction[\s\S]*validation-failed[\s\S]*generation-error[\s\S]*dispatch-failed[\s\S]*envelope-contract-violation[\s\S]*unclassified-worker-fault/);
  assert.match(runner, /outer-envelope-violation/);
});

test('recovery preserves ordinary continuation fallback and invocation accounting', () => {
  const runner = artifact('sai/command-runner.md');
  assert.match(runner, /outside recovery[\s\S]{0,260}(?:replacement|fallback)/i);
  assert.match(runner, /changed_files[\s\S]{0,260}(?:first-seen|ordered)[\s\S]{0,260}(?:never|not)[\s\S]{0,80}reset/i);
  assert.match(runner, /needs_input[\s\S]{0,300}(?:exit|resume)[\s\S]{0,180}(?:normal|input)/i);
  assert.match(runner, /cancelled[\s\S]{0,180}(?:never|no)[\s\S]{0,120}recovery/i);
  assert.match(runner, /--fast-track[\s\S]{0,180}(?:neither|not|same)[\s\S]{0,180}(?:pool|recovery)/i);
});

test('recovery reporting is conversational and never mutates progress plan state', () => {
  const runner = artifact('sai/command-runner.md');
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
