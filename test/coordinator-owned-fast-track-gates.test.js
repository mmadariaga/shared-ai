'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) { return fs.readFileSync(path.join(__dirname, '..', file), 'utf8'); }

test('implementation coordinator owns typed lookup decisions for build and standalone', () => {
  const coordinator = read('sai/commands/implement/coordinator.md');
  const worker = read('sai/commands/implement/worker.md');
  const step = read('sai/commands/implement/steps/plan-generation.md');
  assert.match(coordinator, /Validate the entire payload with `worker-report-validator\.js` before any/);
  assert.match(coordinator, /Only a valid `needs_input` with `lookup_request\.type: bounded-project-lookup`/);
  assert.match(coordinator, /approve every valid item with\s+`answer_value: yes` without presenting the picker/);
  assert.match(coordinator, /Otherwise present each\s+question and its ordered yes\/no options/);
  assert.match(coordinator, /lookup_request_history[\s\S]*replacement resumes a decided request without presenting it again/);
  assert.match(step, /≤3 citations per area, ≤20 lines per citation, project-root confined/);
  assert.match(step, /The worker never auto-approves this permission/);
  assert.match(worker, /post-ready task continuation and again in replacement reconstruction/);
  assert.match(coordinator, /Do not send the raw `--fast-track` token to the worker/);
});

test('apply grants first Step and eligible terminal local commits at segment entry only', () => {
  const apply = read('sai/commands/apply/coordinator.md');
  const build = read('sai/commands/meta-build/coordinator.md');
  const runner = read('sai/commands/apply/runner.md');
  const invocation = read('sai/commands/apply/invocation.md');
  assert.match(apply, /after the standalone Fast-track parse or the chained supervisor's injected signal is known and before Run-Start Step Projection or first Step work, set `session_commit_authorized=true`/);
  assert.match(build, /At apply segment activation, inject fast-track true before Run-Start Step Projection/);
  assert.match(invocation, /sole authority that detects and removes `--fast-track`/);
  assert.match(runner, /Visibility report[\s\S]*Message[\s\S]*Authorization[\s\S]*git add -- <add-list>` exactly/);
  assert.match(apply, /does not authorize pushes, branch changes, unrelated files, unresolved-conflict stops/);
});

test('both harness wrappers use the same coordinator and implementation binding', () => {
  for (const harness of ['claude', 'opencode']) {
    assert.match(read(`commands/${harness}/sai-build.md`), /@sai\/commands\/meta-build\/command-bootstrap\.md/);
    assert.match(read(`commands/${harness}/sai-3-implement.md`), /@sai\/commands\/implement\/command-bootstrap\.md/);
    assert.match(read(`commands/${harness}/sai-4-apply.md`), /@sai\/commands\/apply\/command-bootstrap\.md/);
  }
});

test('build specification is aligned by a delta without editing the published specification', () => {
  const delta = read('openspec/changes/coordinator-owned-fast-track-gates/specs/sai-build-command/spec.md');
  assert.match(delta, /## MODIFIED Requirements/);
  assert.match(delta, /implement activation/);
  assert.match(delta, /## ADDED Requirements/);
  assert.match(delta, /lookup authorization/);
  assert.match(delta, /before the first Step/);
});
