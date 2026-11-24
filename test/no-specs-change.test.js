'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const { checkDocument } = require('../sai/tools/change-document');
const { document } = require('./helpers/change-document-fixture');
const { derivePanelCells, renderBulk } = require('../sai/tools/status');

const read = relative => fs.readFileSync(path.join(repoRoot, relative), 'utf8');

// A dispatchable document whose `## Change` section carries the given `Specs:` line (null: no line).
function withSpecs(value) {
  const text = document('no-specs-demo');
  return value === null ? text : `${text}- Specs:${value}\n`;
}

function problems(verdict) {
  return verdict.violations.map(entry => entry.problem);
}

// ---------------------------------------------------------------------------
// Change document: the no-specs field (I3, E9, E8)
// ---------------------------------------------------------------------------

test('a document with `Specs: none — <reason>` passes the check and skips the specs', () => {
  const verdict = checkDocument(withSpecs(' none — pure refactor, no behavior changes'));
  assert.deepEqual(problems(verdict), []);
  assert.equal(verdict.change.skip_specs, true);
  assert.equal(verdict.change.specs_reason, 'pure refactor, no behavior changes');
});

test('E9: an empty reason, a missing dash, or any other value fails the check', () => {
  for (const value of [' none —', ' none — ', ' none', ' some', ' None — reason']) {
    const verdict = checkDocument(withSpecs(value));
    assert.equal(verdict.ok, false, `"${value}" must fail`);
    assert.ok(problems(verdict).some(problem => /SPECS/.test(problem)), `"${value}" names the Specs field`);
  }
  assert.ok(problems(checkDocument(withSpecs(' none —'))).includes('EMPTY_SPECS_REASON'));
});

test('the Specs line is one key of the Change section, in any position, and an empty value is rejected', () => {
  const before = document('no-specs-demo').replace('- Change name: no-specs-demo\n', '- Specs: none — reason\n- Change name: no-specs-demo\n');
  assert.deepEqual(problems(checkDocument(before)), []);
  assert.ok(problems(checkDocument(withSpecs(''))).includes('INVALID_SPECS_FIELD'));
});

test('E8: a document without the Specs line is valid and keeps today\'s behavior', () => {
  const verdict = checkDocument(withSpecs(null));
  assert.equal(verdict.ok, true, JSON.stringify(problems(verdict)));
  assert.equal(verdict.change.skip_specs, false);
  assert.match(read('sai/policies/issue-format.md'), /A\s+document without the line keeps the rule that every phase requires at least one\s+non-empty spec file/);
});

test('the format policy defines the field in the Change section', () => {
  const policy = read('sai/policies/issue-format.md');
  assert.match(policy, /`Specs:` — optional; `none — <reason>` declares that the change has no/);
  assert.match(policy, /files already under `specs\/` win over the line/);
});

// ---------------------------------------------------------------------------
// /sai-status (E3)
// ---------------------------------------------------------------------------

function statuses(overrides = {}) {
  const names = ['proposal', 'specs', 'design', 'tasks', 'interfaces', 'change-overview', 'review', 'security', 'performance', 'accessibility'];
  const map = {};
  for (const name of names) map[name] = { present: false, skipped: false, status: 'blocked' };
  for (const [name, state] of Object.entries(overrides)) {
    map[name] = { present: state === 'done', skipped: state === 'skipped', status: state };
  }
  return map;
}

test('E3: a skipped specs artifact shows `skipped` and never asks for /sai-1-spec or approval', () => {
  const noDesign = derivePanelCells(statuses({ proposal: 'done', specs: 'skipped' }), { approval_specs_approved_at: null }, {}, '');
  assert.equal(noDesign.specsCell, 'skipped');
  assert.equal(noDesign.next, '/sai-2-design');

  const designed = derivePanelCells(statuses({ proposal: 'done', specs: 'skipped', design: 'done', tasks: 'done' }), null, {}, '0/3');
  assert.equal(designed.specsCell, 'skipped');
  assert.equal(designed.next, '/sai-3-implement');
});

test('E8: absent or unapproved specs keep the existing hints and cells', () => {
  const absent = derivePanelCells(statuses({ proposal: 'done' }), null, {}, '');
  assert.equal(absent.specsCell, '·');
  assert.equal(absent.next, '/sai-1-spec');
  const unapproved = derivePanelCells(statuses({ proposal: 'done', specs: 'done' }), null, {}, '');
  assert.equal(unapproved.specsCell, '○');
  assert.equal(unapproved.next, '/sai-2-design');
});

test('the bulk table shows a skipped specs cell for CLI output that names artifacts by id', async () => {
  const cwd = fs.mkdtempSync(path.join(require('os').tmpdir(), 'no-specs-status-'));
  try {
    fs.mkdirSync(path.join(cwd, 'openspec', 'changes', 'demo'), { recursive: true });
    const artifacts = [{ id: 'proposal', status: 'done' }, { id: 'specs', status: 'skipped' }, { id: 'design', status: 'ready' }];
    const result = await renderBulk(cwd, async () => ({ data: { artifacts } }), async () => ['demo']);
    assert.equal(result.rows[0].specsCell, 'skipped');
    assert.equal(result.rows[0].cells.proposal, '●');
    assert.equal(result.rows[0].next, '/sai-2-design');
    assert.match(result.table, /\| demo \| ● \| skipped \|/);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Phase contracts honor the declaration (E1, E2, E3, E4, E8)
// ---------------------------------------------------------------------------

test('E1: /sai-1-spec writes only the proposal, sets skip_specs, and keeps the files on disk (E2)', () => {
  const worker = read('sai/commands/spec/worker.md');
  assert.match(worker, /Specs: none — <reason>/);
  assert.match(worker, /Write `proposal\.md` only[\s\S]{0,120}write no file under `specs\/`[\s\S]{0,60}set `skip_specs: true` in `\.openspec\.yaml`/);
  assert.match(worker, /files already exist under `specs\/`, leave them and do not set the marker: the files on disk win/);
  assert.match(worker, /to set `skip_specs: true` when the document declares no specs/);
  const proposalStep = read('sai/commands/spec/steps/proposal.md');
  assert.match(proposalStep, /merge `skip_specs: true` into the change's `\.openspec\.yaml`/);
  assert.match(proposalStep, /`specs\/` holds no\s+file/);
  assert.match(read('sai/commands/spec/steps/specs.md'), /`skip_specs: true`, the change has no spec: write no\s+file under `specs\/`/);
  assert.match(read('sai/commands/spec/steps/common.md'), /exception is a change\s+whose `\.openspec\.yaml` sets `skip_specs: true`/);
});

test('E8: no spec worker sets skip_specs on its own judgment', () => {
  const worker = read('sai/commands/spec/worker.md');
  assert.match(worker, /A document without that line never leads to `skip_specs`: no judgment of yours replaces the document's declaration/);
  assert.match(read('sai/commands/spec/coordinator.md'), /without that declaration, `skip_specs` is never set/);
  const schema = read('openspec/schemas/sai-workflow/schema.yaml');
  assert.match(schema, /only when the Ready to Propose block declares `\*\*Specs\*\*: none — <reason>`; never opt out on your own judgment/);
});

test('E1: /sai-2-design starts from the proposal and names its tests from it', () => {
  const coordinator = read('sai/commands/design/coordinator.md');
  assert.match(coordinator, /either at least one file under `specs\/` or a `\.openspec\.yaml` that sets `skip_specs: true`/);
  assert.match(coordinator, /skip `check-delta-headers\.js`/);
  const worker = read('sai/commands/design/worker.md');
  assert.match(worker, /unless `\.openspec\.yaml` sets `skip_specs: true`/);
  assert.match(worker, /A change with `skip_specs: true` has no specs to approve: write no approval key for it/);
  assert.match(read('sai/commands/implement/steps/red-step.md'), /a change whose `\.openspec\.yaml` sets `skip_specs: true` has none: its assertions anchor to `proposal\.md`/);
  assert.match(read('sai/commands/design/steps/tasks.md'), /For a change whose `\.openspec\.yaml` sets `skip_specs: true`, the bullets are short titles of the statements of the proposal's What Changes/);
});

test('the implementation and plan phases accept a change that declares skip_specs', () => {
  assert.match(read('sai/commands/implement/coordinator.md'), /either at least one file under `specs\/` or a `\.openspec\.yaml` that sets `skip_specs: true`/);
  assert.match(read('sai/commands/deep-review/coordinator.md'), /either at least one file under `specs\/` or a `\.openspec\.yaml` that sets `skip_specs: true`/);
  assert.match(read('sai/commands/plan/coordinator.md'), /`specs\/` holds no file, and `\.openspec\.yaml` sets `skip_specs: true`: the change has no specs by declaration/);
});

test('E3: archive treats skipped specs as satisfied and syncs no delta', () => {
  const tool = read('sai/tools/archive-plan.js');
  assert.match(tool, /!\(id === 'specs' && skipSpecs\)/, 'a skipped specs artifact is satisfied and never collected');
  assert.match(tool, /skip_specs is declared, so no delta syncs/);
  assert.match(read('sai/commands/archive/coordinator.md'), /A change that declares `skip_specs` has no delta spec, so the CLI syncs nothing/);
});

test('E4: Direct Build backfill drafts no spec for a no-specs block, and the receivers allow skip_specs', () => {
  const instructions = read('sai/commands/backfill/instructions.md');
  assert.match(instructions, /the run is a \*\*no-specs run\*\*/);
  assert.match(instructions, /adds the one optional key `skip_specs: true` to either form/);
  assert.match(instructions, /A no-specs run composes none: its draft set is `\.openspec\.yaml` and `proposal\.md` only/);
  assert.match(instructions, /Without that line, no draft carries `skip_specs`/);
  assert.match(read('sai/commands/backfill/coordinator.md'), /only on a no-specs run, the optional `skip_specs: true`/);
  assert.match(read('sai/commands/explore/direct-build-coordinator.md'), /the optional `skip_specs: true` \(a no-specs draft set carries no capability spec\)/);
});
