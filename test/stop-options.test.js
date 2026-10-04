'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
// Normalize CRLF checkouts (Windows autocrlf) to LF so literal `\n`
// assertions hold on every platform. See .gitattributes (eol=lf).
const artifact = relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8').replace(/\r\n/g, '\n');
const policy = () => artifact('sai/policies/stop-options.md');

test('runner carries the conditional stop-options pointer right after public-chat', () => {
  const runner = artifact('sai/orchestration/command-runner.md');
  assert.match(
    runner,
    /Fetch @sai\/policies\/public-chat\.md and follow it exactly\.\n\nWhen a run stops on an error or an unexpected condition, Fetch @sai\/policies\/stop-options\.md and close the stop with its options\./
  );
});

test('policy defines unplanned stop and stop options', () => {
  const text = policy();
  assert.match(text, /unplanned stop/);
  assert.match(text, /two or three concrete, costed options with the recommended one first/);
});

test('policy excludes planned stops and pinned texts (E1, E2)', () => {
  const text = policy();
  assert.match(text, /MANDATORY STOP/);
  assert.match(text, /approval and feedback gates/);
  assert.match(text, /declined confirmation or a cancellation/);
  assert.match(text, /pins the exact stop text[\s\S]*no options follow/);
});

test('policy defines the default stop report', () => {
  assert.match(policy(), /no report, the default stop report states what stopped and why, what is done, what is pending, and the exact state left behind \(files written, staged, or committed, and whether the change stays retryable\)/);
});

test('policy covers existing choices, single path, and required reports (E3-E5)', () => {
  const text = policy();
  assert.match(text, /that choice is its options; add no second question/);
  assert.match(text, /only one viable path[\s\S]*no picker and no filler alternatives/);
  assert.match(text, /report first, then the options/);
});

test('policy covers unattended, Direct Build, and composition stops (E6-E8)', () => {
  const text = policy();
  assert.match(text, /unattended-runtime-recovery\.md/);
  assert.match(text, /implementation-closing-report\.md/);
  assert.match(text, /stop options follow Execution details as a separate decision prompt, outside the report/);
  assert.match(text, /closes once, at the supervisor/);
});

test('policy keeps scope and authority unchanged and uses the picker (E9-E11)', () => {
  const text = policy();
  assert.match(text, /widens no read or write scope/);
  assert.match(text, /authorizes only that action/);
  assert.match(text, /No option grants a retry budget/);
  assert.match(text, /names it so its confirmation fires/);
  assert.match(text, /@sai\/policies\/question-context\.md/);
  assert.match(text, /not an invalid option/);
});

test('policy names no harness', () => {
  const text = policy();
  assert.doesNotMatch(text, /Claude Code|opencode/i);
});

test('unattended recovery and Direct Build pipeline reference the policy', () => {
  const recovery = artifact('sai/policies/unattended-runtime-recovery.md');
  assert.match(recovery, /what the user must decide,\s+presented as the stop options of `@sai\/policies\/stop-options\.md`/);
  assert.match(recovery, /Do not ask a routine "how should I\s+proceed\?" question/);
  const pipeline = artifact('sai/commands/explore/steps/pipeline-direct-build.md');
  assert.match(pipeline, /stop options of `@sai\/policies\/stop-options\.md` follow after `Execution details` as a separate question/);
});

test('AGENTS.md lists the policy', () => {
  assert.match(artifact('AGENTS.md'), /sai\/policies\/stop-options\.md/);
});
