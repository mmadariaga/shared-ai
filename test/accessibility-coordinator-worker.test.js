'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

test('accessibility invocation core loads budget, instruction, and remember in order', () => {
  const core = artifact('sai/commands/accessibility/invocation.md');
  const required = [
    'Fetch @skills/budget/SKILL.md',
    'Fetch @sai/instructions/accessibility.md',
    'Fetch @sai/policies/remember.md',
  ];

  let previous = -1;
  for (const instruction of required) {
    const position = core.indexOf(instruction);
    assert.ok(position > previous, `${instruction} should be loaded in order`);
    previous = position;
  }

  assert.match(core, /^arguments:\s*\$ARGUMENTS\s*$/m);
});

test('Copilot inline accessibility caller loads the shared core once without a routed binding', () => {
  const caller = artifact('sai/commands/sai-8-accessibility.md');
  const coreLoads = caller.match(/Fetch @sai\/commands\/accessibility\/invocation\.md/g) || [];

  assert.equal(coreLoads.length, 1);
  assert.doesNotMatch(caller, /Fetch @sai\/orchestration\/workers\/bindings\//);
  assert.doesNotMatch(caller, /Fetch @skills\/(?:claude|opencode)\/sai-8-accessibility-worker\//);
});

test('accessibility scope, runtime, and parent arguments reach the shared core unchanged', () => {
  const caller = artifact('sai/commands/sai-8-accessibility.md');
  const core = artifact('sai/commands/accessibility/invocation.md');
  const argumentsValue = '--full --path src/components --runtime feature-branch';

  assert.match(caller, /Fetch @sai\/commands\/accessibility\/invocation\.md/);
  assert.match(caller, /arguments:\s*\$ARGUMENTS/);
  assert.match(core, /arguments:\s*\$ARGUMENTS/);
  assert.ok(caller.includes('$ARGUMENTS'), `complete arguments should preserve ${argumentsValue}`);
  assert.ok(core.includes('$ARGUMENTS'), `complete arguments should reach the core: ${argumentsValue}`);
});

test('accessibility review defaults to static-only without a runtime scanner', () => {
  const instruction = artifact('sai/instructions/accessibility.md');

  assert.match(instruction, /`--runtime` to enable browser-based[\s\S]{0,160}Default:\s*static-only/i);
  assert.match(instruction, /Runtime requires[\s\S]{0,160}explicitly authorize each command/i);
});

// ─── Step 2: routed accessibility lifecycle ─────────────────────────────────

test('Step 2 accessibility coordinator dispatches one worker and performs no technical I/O', () => {
  const coordinator = artifact('sai/commands/accessibility/coordinator.md');

  assert.match(coordinator, /dispatch[\s\S]{0,160}exactly one[\s\S]{0,160}sai-8-accessibility-worker/i);
  assert.equal((coordinator.match(/sai-8-accessibility-worker/g) || []).length, 1);
  for (const operation of ['prerequisite', 'argument', 'git', 'source', 'scanner', 'research', 'artifact']) {
    assert.match(
      coordinator,
      new RegExp(`(?:SHALL NOT|MUST NOT|does not|no)[^\\n]{0,180}${operation}`, 'i'),
      `coordinator should prohibit ${operation} I/O`
    );
  }
});

test('Step 2 accessibility worker preserves input precedence, grammar, change resolution, and scope ownership', () => {
  const worker = artifact('sai/orchestration/workers/sai-8-accessibility-worker.md');

  assert.match(worker, /wrapper_echo_value[\s\S]{0,240}precedence/i);
  assert.match(worker, /arguments_value/);
  assert.match(worker, /--full/);
  assert.match(worker, /--path/);
  assert.match(worker, /--runtime/);
  assert.match(worker, /resolve[\s-]+(?:the )?change/);
  assert.match(worker, /scope/);
});

test('Step 2 accessibility findings use the closed severity set and promote legacy Major findings', () => {
  const worker = artifact('sai/orchestration/workers/sai-8-accessibility-worker.md');

  for (const severity of ['Critical', 'High', 'Medium', 'Low', 'Informational']) {
    assert.match(worker, new RegExp(`\\b${severity}\\b`));
  }
  assert.match(worker, /Major[\s\S]{0,160}(?:High|promot|at least High)/i);
});

test('Step 2 accessibility worker owns small-scope inspection without mandatory explorer delegation', () => {
  const worker = artifact('sai/orchestration/workers/sai-8-accessibility-worker.md');

  assert.match(worker, /five or fewer|<=\s*5|at most five/i);
  assert.match(worker, /source inspection[\s\S]{0,180}(?:worker|direct)/i);
  assert.match(worker, /without mandatory explorer|explorer delegation is not mandatory|no mandatory explorer/i);
});

test('Step 2 accessibility worker delegates large-scope inspection in bounded parallel areas', () => {
  const worker = artifact('sai/orchestration/workers/sai-8-accessibility-worker.md');

  assert.match(worker, /more than five|>\s*5|six or more/i);
  assert.match(worker, /per-component inspection|component[s-]level inspection/i);
  assert.match(worker, /parallel(?:ize|ized| independent)/i);
  assert.match(worker, /no more than eight|eight explorer|8 explorer/i);
});

test('Step 2 runtime mode asks for server confirmation before any scanner command', () => {
  const worker = artifact('sai/orchestration/workers/sai-8-accessibility-worker.md');

  assert.match(worker, /runtime/);
  assert.match(worker, /server confirmation|confirm.*server|server.*question/i);
  assert.match(worker, /one server question|exactly one.*server|single.*server/i);
  assert.match(worker, /before[\s\S]{0,160}(?:scanner command|scanner)/i);
});

test('Step 2 applicable scanners require one authorize-or-skip question and explicit authorization', () => {
  const worker = artifact('sai/orchestration/workers/sai-8-accessibility-worker.md');

  assert.match(worker, /applicable scanner|scanner.*applicable/i);
  assert.match(worker, /authorize/);
  assert.match(worker, /skip/);
  assert.match(worker, /one authorize[/-]or[/-]skip question|exactly one.*authorize.*skip|single.*authorize.*skip/i);
  assert.match(worker, /only.*explicitly authorized|execute only.*authorized|authorized command/i);
});

test('Step 2 Claude and opencode bindings continue the same worker with only the selected value', () => {
  for (const harness of ['claude', 'opencode']) {
    const binding = artifact(`sai/orchestration/workers/bindings/${harness}/accessibility-worker.md`);
    assert.match(binding, /continue_same_worker|same-worker continuation/i);
    assert.match(binding, /selected value|selected_value/);
    assert.match(binding, /only.*selected|forwards only.*value/i);
    assert.match(binding, /preserv.*active worker state|active worker state.*preserv/i);
  }
});

test('Step 2 replacement restart excludes prior authorization, results, evidence, journal, and report content', () => {
  for (const harness of ['claude', 'opencode']) {
    const binding = artifact(`sai/orchestration/workers/bindings/${harness}/accessibility-worker.md`);
    assert.match(binding, /dispatch_one_replacement_worker|one replacement/i);
    for (const item of ['authorization', 'command results', 'evidence', 'journal', 'artifact content']) {
      assert.match(
        binding,
        new RegExp(`replacement[\\s\\S]{0,320}(?:without|exclude|not)[^\\n]{0,120}${item}`, 'i'),
        `${harness} replacement should exclude ${item}`
      );
    }
  }
});

test('Step 2 completion writes only accessibility.md and prints the exact completion line', () => {
  const worker = artifact('sai/orchestration/workers/sai-8-accessibility-worker.md');
  const coordinator = artifact('sai/commands/accessibility/coordinator.md');

  assert.match(worker, /openspec\/changes\/\{change-name\}\/accessibility\.md/);
  assert.match(worker, /changed_files[\s\S]{0,180}only[\s\S]{0,120}accessibility\.md/i);
  assert.match(coordinator, /worker-authored summary/);
  assert.match(coordinator, /ordered duplicate-free changed_files/);
  assert.ok(coordinator.includes('Accessibility audit done.'));
});

test('Step 2 GitHub Copilot remains inline without a routed accessibility binding or worker projection', () => {
  const copilot = artifact('commands/copilot/sai-8-accessibility.prompt.md');
  const entrypoint = artifact('sai/commands/sai-8-accessibility.md');
  const manifest = artifact('sai/install-manifest.json');

  assert.match(copilot, /sai\/orchestration\/inline-invocation\.md/);
  assert.match(copilot, /phase: sai-8-accessibility/);
  assert.doesNotMatch(copilot, /sai-8-accessibility-worker|accessibility[\\/]coordinator/);
  assert.doesNotMatch(entrypoint, /sai-8-accessibility-worker|accessibility[\\/]coordinator/);
  assert.doesNotMatch(manifest, /sai-8-accessibility-worker|accessibility[\\/]coordinator/);
});
