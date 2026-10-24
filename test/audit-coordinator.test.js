'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const registry = require('../sai-state/registry.js');
const { loadInstallManifest, matrixRenderFor } = require('../bin/install-manifest.js');

const repoRoot = path.join(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const AUDITS = ['security', 'performance', 'accessibility'];
const WORKER = { security: 'sai-5-security-worker', performance: 'sai-6-performance-worker', accessibility: 'sai-7-accessibility-worker' };
const COMMAND = { security: 'sai-5-security', performance: 'sai-6-performance', accessibility: 'sai-7-accessibility' };

test('the shared audit coordinator follows the review coordinator shape: Goal, Start, The worker, Close, Obstacles', () => {
  const coordinator = read('sai/commands/audit/coordinator.md');
  const headings = [...coordinator.matchAll(/^## (.+)$/gm)].map(match => match[1]);
  assert.deepEqual(headings, ['Goal', 'Start', 'The worker', 'Close', 'Obstacles']);
  const review = read('sai/commands/review/coordinator.md');
  assert.deepEqual([...review.matchAll(/^## (.+)$/gm)].map(match => match[1]), headings);
});

test('the audit coordinator loads only the cross-cutting policies that never stop a run', () => {
  const coordinator = read('sai/commands/audit/coordinator.md');
  const fetched = [...coordinator.matchAll(/^Fetch @(\S+)/gm)].map(match => match[1]);
  assert.deepEqual(fetched, [
    'sai/policies/public-chat.md',
    'sai/policies/remember.md',
    'skills/safe-operations/SKILL.md',
    'sai/policies/tool-resolution.md',
    'sai/policies/finding-state.md',
    'sai/orchestration/workers/bindings/{audit}-worker.md',
  ]);
  for (const forbidden of ['command-runner', 'worker-core', 'bounded-recovery', 'stop-options', 'unattended-runtime-recovery', 'no-commit-guard', 'bounded-dispatch-retry', 'composition', 'prereqs']) {
    assert.doesNotMatch(coordinator, new RegExp(forbidden), `the audit coordinator must not mention ${forbidden}`);
  }
});

test('the audit coordinator states goals and completion criteria, with no case tables', () => {
  const coordinator = read('sai/commands/audit/coordinator.md');
  assert.doesNotMatch(coordinator, /^\|.*\|$/m, 'no table rows');
  assert.match(coordinator, /The run is done when `\{report\}` is written, verified, and committed \(or left on disk when the project ignores it\)/);
  assert.match(coordinator, /The command only audits: it fixes no finding/);
});

test('the audit coordinator runs one cycle per worker, so /sai-deep-review can drive several at once', () => {
  const coordinator = read('sai/commands/audit/coordinator.md');
  assert.match(coordinator, /The run is a cycle for one worker: create it, disclose the task, process its `step-done` events, verify the report, commit it/);
  assert.match(coordinator, /Each cycle keeps its own session key, and the driving session issues every `sai-state` call and every commit one at a time/);
  assert.match(coordinator, /key: `\{audit\}-\{name\}`/);
  assert.doesNotMatch(coordinator, /exclusive/i);
});

test('E1 to E9: the coordinator verifies, commits only the report, never pushes, and escalates after 3 attempts', () => {
  const coordinator = read('sai/commands/audit/coordinator.md');
  assert.match(coordinator, /node <lint-path> audit-report \{report\} --audit \{audit\}/);
  assert.match(coordinator, /node <cited-paths-path> audit-report \{name\} --audit \{audit\}/);
  assert.match(coordinator, /`git check-ignore -q \{report\}`/);
  assert.match(coordinator, /Never force-add with `-f`, never push, and commit nothing but this one file/);
  assert.match(coordinator, /Give each obstacle a budget of 3 attempts/);
  assert.match(coordinator, /Ask through the native picker/);
  assert.match(coordinator, /A scope the audit does not apply to still ends this way: the report is the Not Applicable form/);
  assert.match(coordinator, /silently: the command already runs with no human in the loop/);
  assert.match(coordinator, /A `question` is answered by you when the change, its artifacts, or the repository answer it/);
  assert.match(coordinator, /an interrupted run is not resumed/);
});

test('each audit has its options, steps, worker, binding, machine, and wrapper in place', () => {
  const manifest = loadInstallManifest(repoRoot);
  for (const audit of AUDITS) {
    const worker = read(`sai/commands/${audit}/worker.md`);
    const machine = registry.get(`${audit}-steps@1`);
    assert.ok(machine, `${audit}-steps@1 is registered`);
    assert.match(worker, /Fetch @sai\/commands\/audit\/worker-common\.md/);
    assert.match(worker, new RegExp(`Fetch @sai/commands/${audit}/steps/common\\.md`));
    assert.match(read(`sai/commands/${audit}/steps/common.md`), /Fetch @skills\/budget-ro\/SKILL\.md/);
    for (const step of machine.STEPS) assert.ok(worker.includes(`\`${step}\``), `${audit} worker lists ${step}`);
    for (const [step, file] of Object.entries(machine.STAGE_FILES)) {
      if (file !== 'none') assert.ok(fs.existsSync(path.join(repoRoot, file)), `${file} exists for ${step}`);
    }
    for (const harness of ['claude', 'opencode']) {
      const binding = matrixRenderFor(manifest, harness, repoRoot).find(item => item.kind === 'binding' && item.phase === audit);
      assert.equal(binding.destinationName, `${audit}-worker.md`);
      assert.match(binding.text, new RegExp(WORKER[audit]));
      assert.doesNotMatch(binding.text, /command-runner|continue_after_|panel-render/);
      const wrapper = read(`commands/${harness}/${COMMAND[audit]}.md`);
      assert.match(wrapper, new RegExp(`command_name: ${audit}\\n`));
      assert.match(wrapper, /Fetch @sai\/commands\/audit\/coordinator\.md/);
    }
  }
});

test('the audit workers keep what is specific to their audit and share the rest', () => {
  const shared = read('sai/commands/audit/worker-common.md');
  assert.match(shared, /The first dispatch carries no task\. Return exactly this and end the turn/);
  assert.match(shared, /Run no git command that changes the repository, create no commit, and run no `openspec` command/);
  assert.match(shared, /Dispatch only `budget-explorer`/);
  assert.match(shared, /Ask nothing the change, its artifacts, or the repository can answer/);
  assert.match(shared, /A tool, scanner, or environment that is not available is not an obstacle/);
  for (const audit of AUDITS) {
    const worker = read(`sai/commands/${audit}/worker.md`);
    assert.ok(worker.split('\n').length < 40, `${audit} worker keeps only its own plan`);
    assert.doesNotMatch(worker, /No git|ready handshake|event: ready/, `${audit} worker does not restate the shared rules`);
  }
});

test('the audit step files report step-done and keep E2 to E5 in their own steps', () => {
  assert.match(read('sai/commands/security/steps/resolve-sca.md'), /the report says SCA did not run and why/);
  assert.match(read('sai/commands/security/security-report.template.md'), /\*\*SCA:\*\* \{ran on \{manifests\} \| did not run — /);
  assert.match(read('sai/commands/accessibility/steps/map-ui-framework.md'), /even when `--runtime` was passed: no scanner runs/);
  assert.match(read('sai/commands/performance/performance-report.template.md'), /\*\*Diagnostics:\*\* \{not requested \| ran: \{list\} \| unavailable: \{which, why\}\}/);
  assert.match(read('sai/commands/accessibility/accessibility-report.template.md'), /^## Pending Manual Checks$/m);
  assert.match(read('openspec/schemas/sai-workflow/templates/accessibility.md'), /^## Pending Manual Checks$/m);
  for (const audit of AUDITS) {
    for (const file of fs.readdirSync(path.join(repoRoot, 'sai/commands', audit, 'steps'))) {
      assert.doesNotMatch(read(`sai/commands/${audit}/steps/${file}`), /progress event/, `${audit}/steps/${file} reports step-done`);
    }
  }
});

test('the audit commands run under a coordinator profile that can verify and commit', () => {
  const profiles = JSON.parse(read('sai/install-manifest.json')).capabilities.profiles;
  assert.deepEqual(profiles['audit-command'], { extends: 'coordinator', write: true, shell: ['*'], skills: ['safe-operations'] });
  for (const audit of AUDITS) {
    assert.deepEqual(profiles[`${audit}-command`], { extends: 'audit-command', delegate: [WORKER[audit]] });
  }
});
