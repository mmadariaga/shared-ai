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

test('change-overview registered in the artifact graph', () => {
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');
  assert.ok(schema.includes('id: change-overview'), 'schema.yaml should register an artifact with id: change-overview');
  assert.ok(schema.includes('generates: change-overview.md'), 'schema.yaml should declare generates: change-overview.md for change-overview');
  assert.ok(schema.includes('requires: [interfaces]'), 'schema.yaml should require [interfaces] for change-overview');
  const overviewSection = schema.substring(schema.indexOf('id: change-overview'));
  assert.ok(overviewSection.includes('id: implementation'), 'change-overview entry should be registered before the implementation entry');
});

test('apply is not gated on change-overview.md', () => {
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');
  const applyIndex = schema.indexOf('apply:');
  assert.ok(applyIndex >= 0, 'schema.yaml should have an apply: section');
  const applySection = schema.substring(applyIndex);
  assert.match(applySection, /requires:\s*\[\s*tasks\s*,\s*implementation\s*\]/);
  assert.ok(!applySection.includes('change-overview'), 'apply.requires must not list change-overview');
});

test('overview Target State contains exactly the two subsections in order', () => {
  const template = artifact('openspec/schemas/sai-workflow/templates/change-overview.md');
  const targetStateIndex = template.indexOf('## Target State');
  assert.ok(targetStateIndex >= 0, 'change-overview.md should contain ## Target State');
  const targetState = template.substring(targetStateIndex);
  const snapshotIndex = targetState.indexOf('### Architecture Snapshot');
  assert.ok(snapshotIndex >= 0, '## Target State should contain ### Architecture Snapshot');
  const manifestIndex = targetState.indexOf('### File Manifest');
  assert.ok(manifestIndex >= 0, '## Target State should contain ### File Manifest');
  assert.ok(snapshotIndex < manifestIndex, '### Architecture Snapshot should precede ### File Manifest');
});

test('interfaces.md keeps only step contracts', () => {
  const template = artifact('openspec/schemas/sai-workflow/templates/interfaces.md');

  assert.doesNotMatch(template, /## Target State/);
  assert.doesNotMatch(template, /### Architecture Snapshot/);
  assert.doesNotMatch(template, /### File Manifest/);
});

test('Target State is the first section of design.md', () => {
  const template = artifact('openspec/schemas/sai-workflow/templates/design.md');

  const targetStateIndex = template.indexOf('## Target State');
  assert.ok(targetStateIndex !== -1, 'design template should contain ## Target State');
  const snapshotIndex = template.indexOf('### Architecture Snapshot', targetStateIndex);
  assert.ok(snapshotIndex !== -1, '## Target State should contain ### Architecture Snapshot');
  const manifestIndex = template.indexOf('### File Manifest', snapshotIndex);
  assert.ok(manifestIndex !== -1, '### Architecture Snapshot should be followed by ### File Manifest');
  assert.ok(snapshotIndex < manifestIndex, '### Architecture Snapshot should precede ### File Manifest');

  const contextIndex = template.indexOf('## Context');
  assert.ok(contextIndex !== -1, 'design template should contain ## Context');
  assert.ok(targetStateIndex < contextIndex, '## Target State should appear before ## Context');
});

test('sentinel emitted when no step admits a contract', () => {
  const instruction = artifact('sai/instructions/design.md');
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');
  const interfacesTemplate = artifact('openspec/schemas/sai-workflow/templates/interfaces.md');

  for (const contract of [instruction, schema, interfacesTemplate]) {
    assert.match(contract, /None — no step contracts/,
      'the contract should define the exact None — no step contracts sentinel');
  }
});

test('Target State present in design surfaces, absent from interfaces template', () => {
  const instruction = artifact('sai/instructions/design.md');
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');
  const designTemplate = artifact('openspec/schemas/sai-workflow/templates/design.md');
  const interfacesTemplate = artifact('openspec/schemas/sai-workflow/templates/interfaces.md');

  assert.match(instruction, /## Target State/);
  assert.match(schema, /## Target State/);

  const firstTopLevel = designTemplate.search(/^## /m);
  assert.ok(firstTopLevel !== -1, 'design template should have a top-level heading');
  assert.match(designTemplate.slice(firstTopLevel), /^## Target State/,
    'design template should begin with ## Target State');

  assert.doesNotMatch(interfacesTemplate, /## Target State/);
});

test('shared instruction is the generation contract', () => {
  const instruction = artifact('sai/instructions/change-overview.md');

  assert.match(instruction, /write scope/i, 'generation contract should declare its single-file write scope');
  assert.match(instruction, /writes ONLY/i, 'generation contract should limit writes to exactly one artifact');
  assert.match(instruction, /single-file/i, 'generation contract should name the single-file write scope');

  assert.match(instruction, /organized by capability/i, 'generation contract should organize by capability');
  assert.match(instruction, /capability and behavior/i, 'generation contract should organize capability and behavior');

  assert.match(instruction, /validat/i, 'generation contract should contain a validation contract');

  assert.match(instruction, /contradiction_details/, 'result envelope should carry contradiction_details');
  assert.match(instruction, /failure_kind/, 'result envelope should carry failure_kind');
  assert.match(instruction, /success\s*\|\s*failed/, 'result envelope should use the success | failed status vocabulary');
});

test('state key transitions unmaterialized → materializing → current at first Continue', () => {
  const worker = artifact('sai/orchestration/workers/sai-2-design-worker.md');

  assert.match(worker, /unmaterialized/, 'worker contract should know the unmaterialized initial state');
  assert.match(worker, /materializing/, 'worker contract should mark materializing before dispatch');
  assert.match(worker, /current/, 'worker contract should mark current after success');
  assert.match(worker, /Continue/, 'worker contract should drive the transition through Continue');
});

test('effective source modification marks stale before the first write', () => {
  const worker = artifact('sai/orchestration/workers/sai-2-design-worker.md');

  const staleIndex = worker.search(/stale/);
  assert.ok(staleIndex !== -1, 'worker contract should contain the stale state');
  const preStale = worker.slice(0, staleIndex);
  assert.match(preStale, /immediately before/i, 'stale should be tied to immediately before the write');
  assert.match(preStale, /first/i, 'stale should be set before the first write');
  assert.match(preStale, /effective/i, 'stale should be tied to effective source writes');
});

test('no-effective-change transaction verifies the existing overview before restoring current', () => {
  const worker = artifact('sai/orchestration/workers/sai-2-design-worker.md');

  assert.match(worker, /byte-exact/, 'pre-transaction source capture should be byte-exact');
  assert.match(worker, /capture/, 'worker contract should capture sources before any write');
  assert.match(worker, /no effective change/i, 'worker contract should define the no-effective-change protocol');
  assert.match(worker, /verif/i, 'worker contract should verify the existing overview before restoring current');
});

test('opencode design worker permits budget dispatch beside explore', () => {
  const agent = artifact('agents/opencode/sai-2-design-worker.md');
  const binding = artifact('sai/orchestration/workers/bindings/opencode/design-worker.md');

  assert.match(agent, /explore:\s*allow/, 'permission.task should allow explore');
  assert.match(agent, /budget:\s*allow/, 'permission.task should allow budget dispatch beside explore');
  assert.match(binding, /budget/, 'opencode design worker binding should mention budget dispatch');
});

test('installation projections are mirrored with an explicit override entry', () => {
  const manifest = artifact('sai/install-manifest.json');

  assert.match(manifest, /change-overview-instruction/, 'manifest should declare the change-overview-instruction projection');
  assert.match(manifest, /instructions\/change-overview\.md/, 'manifest should project to instructions/change-overview.md');
  assert.match(manifest, /"overrides"\s*:\s*"sai-instructions"/, 'manifest should override the sai-instructions projection with an explicit entry');
});

// ─── Step 4: Continue-triggered overview generation in the design coordinator ─

test('Continue triggers the worker-owned generation after the gate closes', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(coordinator, /Continue/, 'the gate-closed next action should be Continue');
  assert.match(coordinator, /generation[\s-]?(?:pass|trigger|terminal)/i,
    'Continue should trigger the worker-owned generation pass');
  assert.match(coordinator, /same[\s-]?worker/i, 'generation should run via a same-worker continuation');
});

test('failed first materialization suppresses the success terminal', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(coordinator, /failed/i, 'coordinator should map a failed first materialization');
  assert.match(coordinator, /completion sentence/i, 'coordinator should reference the design completion sentence');
  assert.match(coordinator, /suppress|do\s*not\s*emit|does\s*not\s*emit/i,
    'coordinator should suppress the design completion sentence on a failed materialization');
});

test('run exits before Continue processing materializes nothing', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(coordinator, /materializ/i, 'coordinator should reference materialization');
  assert.match(coordinator, /without\s+materialization|no\s+overview|unmaterialized/i,
    'a continuation failure should end the run without materialization');
});

test('generation terminal changed_files are forwarded without re-derivation', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(coordinator, /changed_files/, 'coordinator should forward the generation terminal changed_files');
  assert.match(coordinator, /forward/i, 'coordinator should forward changed_files unchanged');
});
