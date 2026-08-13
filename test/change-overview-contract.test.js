'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

const { loadInstallManifest, matrixRenderFor } = require('../bin/install-manifest.js');

const matrixManifest = loadInstallManifest(path.join(__dirname, '..'));
function matrixItem(harness, phase, kind) {
  const item = matrixRenderFor(matrixManifest, harness, path.join(__dirname, '..'))
    .find(entry => entry.kind === kind && entry.phase === phase);
  assert.ok(item, `${harness}/${phase} matrix ${kind} should exist`);
  return item.text;
}

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
  const instruction = artifact('sai/commands/design/instructions.md');
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');
  const interfacesTemplate = artifact('openspec/schemas/sai-workflow/templates/interfaces.md');

  for (const contract of [instruction, schema, interfacesTemplate]) {
    assert.match(contract, /None — no step contracts/,
      'the contract should define the exact None — no step contracts sentinel');
  }
});

test('Target State present in design surfaces, absent from interfaces template', () => {
  const instruction = artifact('sai/commands/design/instructions.md');
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
  const instruction = artifact('sai/change-overview.md');

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
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(worker, /unmaterialized/, 'worker contract should know the unmaterialized initial state');
  assert.match(worker, /materializing/, 'worker contract should mark materializing before dispatch');
  assert.match(worker, /current/, 'worker contract should mark current after success');
  assert.match(worker, /Continue/, 'worker contract should drive the transition through Continue');
});

test('effective source modification marks stale before the first write', () => {
  const worker = artifact('sai/commands/design/worker.md');

  const staleIndex = worker.search(/stale/);
  assert.ok(staleIndex !== -1, 'worker contract should contain the stale state');
  const preStale = worker.slice(0, staleIndex);
  assert.match(preStale, /immediately before/i, 'stale should be tied to immediately before the write');
  assert.match(preStale, /first/i, 'stale should be set before the first write');
  assert.match(preStale, /effective/i, 'stale should be tied to effective source writes');
});

test('no-effective-change transaction verifies the existing overview before restoring current', () => {
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(worker, /byte-exact/, 'pre-transaction source capture should be byte-exact');
  assert.match(worker, /capture/, 'worker contract should capture sources before any write');
  assert.match(worker, /no effective change/i, 'worker contract should define the no-effective-change protocol');
  assert.match(worker, /verif/i, 'worker contract should verify the existing overview before restoring current');
});

test('opencode design worker permits budget dispatch beside explore', () => {
  const agent = matrixItem('opencode', 'design', 'agent');
  const binding = matrixItem('opencode', 'design', 'binding');

  assert.match(agent, /explore:\s*allow/, 'permission.task should allow explore');
  assert.match(agent, /budget:\s*allow/, 'permission.task should allow budget dispatch beside explore');
  assert.match(binding, /budget/, 'opencode design worker binding should mention budget dispatch');
  assert.match(binding, /overview_generation|overview_language/,
    'the design binding should carry the overview-generation option');
  assert.match(binding, /continue_after_notice/,
    'the design binding should carry the notice continuation option');
});

test('installation projects the shared change-overview instruction at the sai root', () => {
  const manifest = artifact('sai/install-manifest.json');

  assert.match(manifest, /"source"\s*:\s*"sai\/change-overview\.md"/,
    'manifest should project sai/change-overview.md');
  assert.match(manifest, /"path"\s*:\s*"change-overview\.md"/,
    'manifest should project to the root-relative change-overview.md destination');
  assert.match(manifest, /"destination"\s*:\s*\{\s*"class"\s*:\s*"sai"\s*,\s*"path"\s*:\s*"change-overview\.md"/,
    'the sai/change-overview.md projection should target the sai root-relative change-overview.md destination');
  assert.doesNotMatch(manifest, /change-overview-instruction/,
    'the obsolete change-overview-instruction override projection should be retired');
  assert.doesNotMatch(manifest, /"sai-instructions"/,
    'the obsolete recursive sai-instructions projection should be retired');
  assert.match(manifest, /"destination"\s*:\s*\{\s*"class"\s*:\s*"sai"\s*,\s*"path"\s*:\s*"instructions\/change-overview\.md"/,
    'the former instructions/change-overview.md destination should be retired');
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

// ─── Step 5: Read-only Review change-overview action in the sai-explore loop ─

test('per-change menu still uses the native picker with four options', () => {
  const explore = artifact('sai/commands/explore/instructions.md');

  assert.match(explore, /Review change-overview/, 'the picker should offer Review change-overview');
  assert.match(explore, /Review sai-1's artifacts/, 'the picker should offer Review sai-1\'s artifacts');
  assert.match(explore, /Review sai-2's artifacts/, 'the picker should offer Review sai-2\'s artifacts');
  assert.match(explore, /Skip/, 'the picker should offer Skip');
  assert.match(explore, /four[\s-]?option/i, 'the picker should be a four-option native picker');
});

test('non-current overview produces an availability report, not a review', () => {
  const explore = artifact('sai/commands/explore/instructions.md');

  assert.match(explore, /overview\.state/, 'the currentness conjunction should read overview.state');
  assert.match(explore, /availability\/integrity|availability and integrity/i,
    'non-current overviews should produce an availability/integrity report');
  assert.match(explore, /no findings tally|no `Summary:`|no findings and no/i,
    'the availability report should carry no findings tally');
});

test('review output is a single findings block handed off without acceptance', () => {
  const explore = artifact('sai/commands/explore/instructions.md');

  const blockStart = explore.indexOf('When a review transaction surfaces findings');
  assert.ok(blockStart !== -1, 'the loop should define a findings-block paragraph for review transactions');
  const nextWhen = explore.indexOf('\n    - When', blockStart);
  const blockEnd = nextWhen === -1 ? blockStart + 1600 : nextWhen;
  const block = explore.slice(blockStart, blockEnd);

  assert.match(block, /Finding\s+H\d+/i,
    'the findings block should open with a severity-prefixed identifier heading');
  assert.match(block, /Finding\s+H1/i,
    'the findings block should carry the Finding H1 label');
  assert.match(block,
    /`?Severity`?[\s\S]{0,120}`?Artifact location`?[\s\S]{0,120}`?Issue`?[\s\S]{0,120}`?Recommended correction`?/,
    'the shared finding shape should list Severity, Artifact location, Issue, Recommended correction in order');
  assert.match(block, /Summary:\s*High=<count>\s*Medium=<count>\s*Low=<count>/,
    'the findings block should close with the base-form Summary tally');
  assert.match(block, /High[\s\S]{0,200}Medium[\s\S]{0,200}Low/,
    'findings should be ordered High then Medium then Low within a bounded window');
  assert.match(block, /ascending numeric identifier|ascending numeric/i,
    'deterministic order should break ties by ascending numeric identifier');
  assert.match(block, /every finding|all findings|each finding/i,
    'the single findings block should include every finding from the transaction');
  assert.match(block, /findings block[\s\S]{0,200}(?:is the handoff|paste|feedback gate)/i,
    'the findings block itself should be the handoff payload');
  assert.match(block, /never[\s\S]{0,80}(?:filters|applies|forwards|regenerates)/i,
    'the review loop should stay strictly read-only');
  assert.doesNotMatch(block, /present them for acceptance as a distinct step/i,
    'the loop should not present a distinct acceptance step');
  assert.doesNotMatch(block, /confirmation of the accepted set/i,
    'the loop should not confirm an accepted set before handoff');
  assert.doesNotMatch(block, /^change:/m,
    'the findings block should not carry a change: header line');
});

test('findings route to the design worker at the feedback gate without a handoff block', () => {
  const explore = artifact('sai/commands/explore/instructions.md');

  const blockStart = explore.indexOf('When a review transaction surfaces findings');
  assert.ok(blockStart !== -1, 'the loop should define a findings-block paragraph for review transactions');
  const nextWhen = explore.indexOf('\n    - When', blockStart);
  const blockEnd = nextWhen === -1 ? blockStart + 1600 : nextWhen;
  const block = explore.slice(blockStart, blockEnd);

  assert.doesNotMatch(block, /^## DesignCorrectionRequest/m,
    'the loop should not emit a ## DesignCorrectionRequest heading');
  assert.doesNotMatch(block, /^change:/m,
    'the findings block should not carry a change: header line');
  assert.match(block, /\/sai-2-design/,
    'the findings block should route through a re-invoked /sai-2-design');
  assert.match(block, /feedback gate/i, 'the findings should be pasted at the feedback gate');
  assert.match(block, /design-artifact findings[\s\S]{0,80}directly/,
    'design-artifact findings should be applied directly by the design worker');
  assert.match(block, /apply in place/i,
    'the spec-amendment path should be consent-gated and apply in place');
  assert.match(block, /\/sai-1-spec[\s\S]{0,200}(?:cannot consume|not offered)/i,
    'the spec-amendment path should not offer /sai-1-spec for design corrections');
});

test('completed Review change-overview participates in reviewed-sai-2 marking', () => {
  const explore = artifact('sai/commands/explore/instructions.md');

  assert.match(explore, /Review change-overview[\s\S]{0,4000}reviewed-sai-2/,
    'the Review change-overview action should participate in reviewed-sai-2 marking');
  assert.match(explore, /most recent completed review[\s\S]{0,400}reviewed-sai-2/,
    'the most recent completed review should decide the reviewed-sai-2 marking');
  assert.match(explore, /High[\s\S]{0,400}reviewed-sai-2/,
    'a High finding should clear the reviewed-sai-2 marking');
});

// ─── Step 6: Eleven-artifact archive classification and status panel ─

test('archive names eleven artifacts with change-overview in AUDIT and interfaces in EXEMPT', () => {
  const archive = artifact('sai/commands/archive/instructions.md');

  assert.match(archive, /eleven/, 'archive classification should name eleven artifacts');
  assert.doesNotMatch(archive, /ten[\s-]?(?:`?sai-workflow`?\s+)?artifact/i,
    'archive should drop the stale ten-artifact wording');
  assert.match(archive, /change-overview/, 'archive should classify change-overview among the eleven');
  assert.match(archive, /interfaces/, 'archive should classify interfaces');

  const auditIndex = archive.indexOf('AUDIT');
  assert.ok(auditIndex !== -1, 'archive should define an AUDIT group');
  const changeOverviewIndex = archive.indexOf('change-overview');
  assert.ok(changeOverviewIndex > auditIndex, 'change-overview should sit inside the AUDIT group');
});

test('backfilled changes skip change-overview alongside interfaces', () => {
  const archive = artifact('sai/commands/archive/instructions.md');

  assert.match(archive, /change-overview/, 'the backfill skip should treat change-overview as done');
  assert.match(archive, /backfill/, 'the skip should live on the backfill path');
  assert.match(archive, /interfaces/, 'the skip should name interfaces');
  assert.match(archive, /skip/i, 'the skip should be expressed as a skip');
});

test('status panel lists the 11 artifact ids in order and derives overview state', () => {
  const status = artifact('sai/commands/status/body.md');

  assert.match(status, /11\s+sai-workflow|eleven/i, 'the panel should reference the eleven-artifact schema');

  const interfacesIndex = status.indexOf('interfaces');
  assert.ok(interfacesIndex !== -1, 'the panel should list interfaces');
  const changeOverviewIndex = status.indexOf('change-overview');
  assert.ok(changeOverviewIndex !== -1, 'the panel should list change-overview');
  const implementationIndex = status.indexOf('implementation');
  assert.ok(implementationIndex !== -1, 'the panel should list implementation');
  assert.ok(interfacesIndex < changeOverviewIndex, 'change-overview should sit after interfaces');
  assert.ok(changeOverviewIndex < implementationIndex, 'change-overview should sit before implementation');

  assert.match(status, /overview\.state/, 'the overview line should derive from overview.state');
});

test('active closure is question-first and repeats the exact crystallize reminder', () => {
  const explore = artifact('sai/commands/explore/instructions.md');

  assert.match(explore, /When a genuine unresolved question remains and its answer could change the idea, end with that relevant question/);
  assert.match(explore, /When no genuine unresolved question remains, end with this concise reminder/);
  assert.match(explore, /Say `crystallize` when ready; crystallization generates the paste-ready prompt for `\/sai-1-spec`/);
  assert.match(explore, /Evaluate this rule again on every later successful qualifying turn/);
  assert.match(explore, /fallback reminder repeats even after readiness has already been emitted/);
  assert.match(explore, /does not suppress this rule/);
  assert.match(explore, /readiness signal.*at most once per stable idea/i);
  assert.doesNotMatch(explore, /manufactur(?:e|ed) a question/);
});

test('localized Change Overview generation preserves structural anchors, source artifacts, and its result envelope', () => {
  const instruction = artifact('sai/change-overview.md');

  assert.match(instruction, /overview_language/);
  assert.match(instruction, /English/);
  assert.match(instruction, /free-text prose/);
  for (const anchor of [
    'section headings',
    'Architecture Snapshot',
    'requirements',
    'scenarios',
    'paths',
    'commands',
    'state values',
    'result keys',
  ]) assert.match(instruction, new RegExp(anchor));
  assert.match(instruction, /source artifacts.*never modified|never modified.*source artifacts/i);
  assert.match(instruction, /exactly five mandatory fields|five mandatory fields/);
  assert.match(instruction, /change-overview\.md/);
});

test('closure stops at crystallization and discard and preserves terminal paths', () => {
  const explore = artifact('sai/commands/explore/instructions.md');
  const prereqs = artifact('sai/policies/prereqs-check.md');

  assert.match(explore, /Before a candidate idea exists, no Closure State is active/);
  assert.match(explore, /An explicit crystallization request transitions the state to `crystallized`/);
  assert.match(explore, /Do not append the pre-crystallization question-or-reminder closure to that crystallization response/);
  assert.match(explore, /An explicit discard transitions the state to `discarded`/);
  assert.match(explore, /subsequent successful responses about that discarded idea receive no pre-crystallization closure/);
  assert.match(explore, /Do not apply this successful-response closure to prerequisite halts, failures, cancellations/);
  assert.match(explore, /completed post-crystallization review-loop closes/);
  assert.match(explore, /preserve their existing remediation literals, terminal behavior, and review-loop silent-close allowance/);
  assert.match(prereqs, /openspec CLI not found\. Install it first: https:\/\/github\.com\/Fission-AI\/OpenSpec/);
  assert.match(prereqs, /OpenSpec not initialized in this project\. Run: openspec init/);
  assert.match(prereqs, /openspec\/config\.yaml does not declare `schema: sai-workflow`/);
  assert.match(explore, /full `Ready to Propose` block\(s\) are printed only when the user explicitly asks to crystallize/);
});
