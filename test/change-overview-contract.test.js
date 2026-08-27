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

function exploreContract() {
  const exploreSources = [
    'sai/commands/explore/instructions.md',
    'sai/commands/explore/steps/common.md',
    'sai/commands/explore/steps/artifact-review-language-gate.md',
    'sai/commands/explore/steps/slicing-assessment.md',
    'sai/commands/explore/steps/crystallization-protocol.md',
    'sai/policies/ready-to-propose-format.md',
    'sai/commands/explore/steps/crystallization-language-gates.md',
    'sai/commands/explore/steps/review-loop.md',
    'sai/commands/explore/steps/pipeline-selector.md',
    'sai/commands/explore/steps/pipeline-auto-supervised.md',
    'sai/commands/explore/steps/pipeline-auto-fast.md',
    'sai/commands/explore/steps/idea-list.md',
  ];
  return exploreSources.map(relativePath => {
    const fullPath = path.join(repoRoot, relativePath);
    assert.equal(fs.existsSync(fullPath), true, `${relativePath} should exist`);
    return fs.readFileSync(fullPath, 'utf8');
  }).join('\n');
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

test('overview approval surface has exactly the nine top-level sections in order', () => {
  const template = artifact('openspec/schemas/sai-workflow/templates/change-overview.md');
  const headings = (template.match(/^## .+$/gm) || []).map(heading => heading.slice(3));

  assert.deepEqual(headings, [
    'Change Proposal',
    'Scope',
    'Capabilities',
    'Target Architecture',
    'Key Contracts',
    'File Manifest',
    'Review Scenarios',
    'Implementation Approach',
    'Approval Summary',
  ]);
});

test('overview approval surface excludes the forbidden legacy sections', () => {
  const template = artifact('openspec/schemas/sai-workflow/templates/change-overview.md');

  for (const heading of [
    'Target State',
    'Requirements',
    'Scenarios',
    'Interfaces',
    'Assertions',
    'File Changes',
    'Delivery Steps',
    'Traceability',
  ]) {
    assert.doesNotMatch(template, new RegExp(`^## ${heading}$`, 'm'),
      `change-overview.md should not contain ## ${heading}`);
  }
});

test('overview adapts architecture and centralizes the file manifest', () => {
  const template = artifact('openspec/schemas/sai-workflow/templates/change-overview.md');
  const architectureIndex = template.indexOf('## Target Architecture');
  const manifestIndex = template.indexOf('## File Manifest');
  const nextSectionIndex = template.indexOf('\n## ', architectureIndex + 1);
  const architecture = template.slice(architectureIndex, nextSectionIndex === -1 ? undefined : nextSectionIndex);

  assert.ok(architectureIndex >= 0, 'overview should contain ## Target Architecture');
  assert.ok(manifestIndex > architectureIndex, '## File Manifest should follow ## Target Architecture');
  assert.match(architecture, /^### Snapshot$/m,
    'architecture content should retain the fixed ### Snapshot subsection');
  assert.doesNotMatch(architecture, /^### File Manifest$/m,
    'the manifest should not be nested under ## Target Architecture');
  assert.match(template, /^## File Manifest$/m, 'overview should contain ## File Manifest');
});

test('overview generation keeps signatures beside surviving manifest entries and omits net-empty paths', () => {
  const instruction = artifact('sai/commands/design/change-overview.md');

  assert.match(instruction, /public signature/i,
    'generation contract should define public signature rendering');
  assert.match(instruction, /(?:beside|alongside|next to)[\s\S]{0,180}(?:manifest|file entry)/i,
    'public signatures should render beside their surviving manifest file entries');
  assert.match(instruction, /net[- ]empty[\s\S]{0,180}(?:omit|omitted|exclude|excluded|not render)/i,
    'signatures for net-empty paths should be omitted from the overview');
});

test('overview generation remains source-grounded and fails atomically on manifest contradiction', () => {
  const instruction = artifact('sai/commands/design/change-overview.md');

  assert.match(instruction, /condens/i, 'generation contract should define condensed content');
  assert.match(instruction, /source[- ]grounded/i,
    'condensed content should remain source-grounded');
  assert.match(instruction, /source artifacts.*never modified|never modified.*source artifacts/i,
    'source artifacts should remain unchanged');
  assert.match(instruction, /manifest contradiction/i,
    'generation contract should define manifest contradiction handling');
  assert.match(instruction, /no partial output|without partial output|partial output.*(?:fail|suppress|none)/i,
    'a manifest contradiction should not leave partial output');
});

test('localized overview preserves structural anchors while allowing editorial subsection translation', () => {
  const instruction = artifact('sai/commands/design/change-overview.md');

  assert.match(instruction, /overview_language/);
  assert.match(instruction, /English/);
  for (const heading of [
    'Change Proposal',
    'Scope',
    'Capabilities',
    'Target Architecture',
    'Key Contracts',
    'File Manifest',
    'Review Scenarios',
    'Implementation Approach',
    'Approval Summary',
  ]) assert.match(instruction, new RegExp(heading));
  assert.match(instruction, /### Snapshot/,
    'the fixed ### Snapshot heading should remain English');
  for (const anchor of ['paths', 'commands', 'state values', 'source artifact names']) {
    assert.match(instruction, new RegExp(anchor));
  }
  assert.match(instruction, /editorial.*(?:subsection|###).*translat|(?:subsection|###).*translat.*editorial/i,
    'generator-authored editorial subsection headings may be translated');
  assert.match(instruction, /## Capabilities[\s\S]{0,500}(?:editorial|###)[\s\S]{0,500}(?:translat|localiz)/i,
    'localized capability subsections should preserve structural anchors');
  assert.match(instruction, /## Target Architecture[\s\S]{0,500}(?:editorial|###)[\s\S]{0,500}(?:translat|localiz)/i,
    'localized architecture subsections should preserve structural anchors');
  assert.match(instruction, /result keys/);
  assert.match(instruction, /exactly five mandatory fields|five mandatory fields/);
  assert.match(instruction, /change-overview\.md/);
});

test('design target-state specification distinguishes the overview architecture adaptation', () => {
  const specification = artifact('openspec/specs/design-target-state/spec.md');

  assert.match(specification,
    /overview[\s\S]{0,240}renders an adapted ## Target Architecture[\s\S]{0,240}rather than[\s\S]{0,120}## Target State/i);
  assert.match(specification, /Target State subsections remain exact in design\.md only/);
  assert.match(specification,
    /Target State remains authoritative in design\.md but is not projected into the overview/);
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
  const instruction = artifact('sai/commands/design/steps/interfaces.md');

  assert.match(instruction, /None — no step contracts/,
    'the design instruction should define the exact None — no step contracts sentinel');
});

test('Target State present in design surfaces, absent from interfaces template', () => {
  const instruction = artifact('sai/commands/design/steps/design.md');
  const designTemplate = artifact('openspec/schemas/sai-workflow/templates/design.md');
  const interfacesTemplate = artifact('openspec/schemas/sai-workflow/templates/interfaces.md');

  for (const heading of ['## Target State', '### Architecture Snapshot', '### File Manifest']) {
    assert.match(instruction, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `design instruction should contain ${heading}`);
  }

  const firstTopLevel = designTemplate.search(/^## /m);
  assert.ok(firstTopLevel !== -1, 'design template should have a top-level heading');
  assert.match(designTemplate.slice(firstTopLevel), /^## Target State/,
    'design template should begin with ## Target State');

  assert.doesNotMatch(interfacesTemplate, /## Target State/);
});

test('shared instruction is the generation contract', () => {
  const instruction = artifact('sai/commands/design/change-overview.md');
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');

  assert.match(instruction, /write scope/i, 'generation contract should declare its single-file write scope');
  assert.match(instruction, /writes ONLY/i, 'generation contract should limit writes to exactly one artifact');
  assert.match(instruction, /single-file/i, 'generation contract should name the single-file write scope');

  assert.match(instruction, /organized by capability/i, 'generation contract should organize by capability');
  assert.match(instruction, /capability and behavior/i, 'generation contract should organize capability and behavior');
  assert.match(instruction, /validat/i, 'generation contract should contain a validation contract');

  assert.match(instruction, /failure_details/, 'result envelope should carry failure_details');
  assert.doesNotMatch(instruction, /contradiction_details/, 'retired contradiction_details must not be in the shared contract');
  assert.match(instruction, /exactly five mandatory fields|five mandatory fields/,
    'result envelope should remain closed at five mandatory fields');
  assert.match(instruction, /non-empty English (?:failure_details|diagnostic) on every failure/,
    'every failed result should require non-empty English failure_details');
  for (const field of ['status', 'changed_files', 'validation', 'failure_details', 'failure_kind']) {
    assert.match(instruction, new RegExp('`' + field + '`'), `envelope should enumerate ${field}`);
  }
  assert.match(instruction, /validation[\s\S]{0,220}not-performed/,
    'parent-authored contract violations should use validation: not-performed');
  assert.match(instruction, /blocking-contradiction[\s\S]{0,160}validation-failed[\s\S]{0,160}generation-error[\s\S]{0,160}dispatch-failed/,
    'failure_kind should enumerate the full closed vocabulary');
  assert.match(instruction, /both conflicting source locations and the one-line disagreement/,
    'blocking contradictions should retain source-located detail');
  assert.match(instruction, /status:\s*success[\s\S]{0,220}validation:\s*passed[\s\S]{0,180}failure_details:\s*["']{2}[\s\S]{0,120}failure_kind:\s*none/,
    'success should use the exact five-field values');
  assert.match(instruction, /status:\s*failed[\s\S]{0,220}failure_details:\s*"[^"]+"[\s\S]{0,120}failure_kind:\s*(?:blocking-contradiction|validation-failed|generation-error)/,
    'generator failures should use non-empty details and a closed failure kind');
  assert.match(instruction, /changed_files:\s*\[openspec\/changes\/\{change-name\}\/change-overview\.md\]/,
    'successful and generator-run failure results should report the overview path');
  assert.match(instruction, /failure_kind/, 'result envelope should carry failure_kind');
  assert.match(instruction, /success\s*\|\s*failed/, 'result envelope should use the success | failed status vocabulary');

  assert.match(schema, /closed five-field|five-field|failure kind/i,
    'schema instruction should preserve the closed generator envelope contract');
  assert.doesNotMatch(schema, /contradiction_details/, 'schema instruction must not enumerate the retired field');
});

test('overview generator envelope is exactly five fields and excludes recovery metadata', () => {
  const instruction = artifact('sai/commands/design/change-overview.md');
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');
  const fields = ['status', 'changed_files', 'validation', 'failure_details', 'failure_kind'];

  for (const source of [instruction]) {
    const failureDetailsIndex = source.indexOf('failure_details');
    assert.ok(failureDetailsIndex >= 0, 'the generator envelope should declare failure_details');
    const envelope = source.slice(Math.max(0, failureDetailsIndex - 2500), failureDetailsIndex + 2500);
    for (const field of fields) {
      assert.match(envelope, new RegExp('`?' + field + '`?'), `generator envelope should include ${field}`);
    }
    assert.doesNotMatch(envelope, /failure_class|unrecoverable|attempts_spent|stopping_reason|recovery_attempt/i,
      'recovery metadata must not enter the nested generator envelope');
  }
});

test('valid generator failures propagate failure_kind while malformed envelopes remain parent-owned contract violations', () => {
  const routing = artifact('openspec/specs/change-overview-generation-routing/spec.md');
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(routing, /valid[	 ]+failed[	 ]+generator[	 ]+result[	\n ]+propagat(?:es|e)[\s\S]{0,260}failure_kind[\s\S]{0,260}failure_class/i,
    'a valid failed generator result should preserve failure_kind as outer failure_class');
  assert.match(routing, /failure_kind[\s\S]{0,220}(?:unchanged|without reclassification)[\s\S]{0,220}failure_class/i,
    'failure_kind should propagate unchanged to the outer classification');
  assert.match(routing, /(?:empty|malformed|unknown field|missing field)[\s\S]{0,420}envelope-contract-violation/i,
    'invalid nested results should be classified as envelope-contract-violation');
  assert.match(routing, /envelope-contract-violation[\s\S]{0,260}validation:\s*not-performed/i,
    'parent-owned contract violations should retain validation: not-performed');
  assert.match(routing, /(?:offending value|missing field|name the offending|quote that value)[\s\S]{0,260}(?:diagnostic|failure_details|details)/i,
    'contract violations should name the offending value or missing field');
  assert.match(routing, /(?:potentially affected|affected)[\s\S]{0,240}change-overview\.md/i,
    'contract violations should preserve the potentially affected overview path');
  assert.match(worker, /malformed or empty envelopes?[\s\S]{0,320}envelope-contract-violation/i,
    'the design worker should separate malformed nested envelopes from generator failures');
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

test('design worker persists diagnostics for generator and parent-owned failure routes', () => {
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(worker, /overview\.failure_kind/, 'design worker should persist overview.failure_kind');
  assert.match(worker, /overview\.failure_details/, 'design worker should persist overview.failure_details');
  assert.match(worker, /clear(?:s|ing)?[\s\S]{0,220}both diagnostic keys/i,
    'new generation attempts should clear both diagnostic keys');
  assert.match(worker, /first materialization[\s\S]{0,600}(?:persist|failure_details)/i,
    'failed first materialization should persist its diagnostic');
  assert.match(worker, /regeneration[\s\S]{0,260}stale/i,
    'regeneration failures should map to stale');
  assert.match(worker, /dispatch-failed/, 'dispatch failures should use dispatch-failed');
  assert.match(worker, /process loss[\s\S]{0,220}generation-error/i,
    'process loss should use generation-error');
  assert.match(worker, /malformed or empty envelopes?[\s\S]{0,320}envelope-contract-violation/i,
    'malformed and empty envelopes should use envelope-contract-violation');
  assert.match(worker, /validation:\s*not-performed[\s\S]{0,320}failure_kind:\s*dispatch-failed/i,
    'dispatch failures should carry not-performed validation and dispatch-failed kind');
  assert.match(worker, /status:\s*failed[\s\S]{0,260}validation:\s*not-performed[\s\S]{0,260}failure_kind:\s*envelope-contract-violation/i,
    'malformed-envelope routes should carry the parent envelope-contract-violation shape');
  assert.match(worker, /changed_files:\s*\[\s*\]/,
    'unacknowledged dispatch failures should report no affected files');
  assert.match(worker, /changed_files:\s*\[openspec\/changes\/\{change-name\}\/change-overview\.md\]/,
    'dispatched uncertain outcomes should report the potentially affected overview path');
  assert.match(worker, /quote that value before reclassification/i,
    'malformed envelopes should preserve an offending failure_kind value in diagnostics');
  assert.match(worker, /\.openspec\.yaml[\s\S]{0,180}changed_files|changed_files[\s\S]{0,180}\.openspec\.yaml/i,
    'durable metadata writes should enter the changed-file union');
  assert.match(worker, /successful materialization or reconciliation[\s\S]{0,180}clears both diagnostic keys/i,
    'successful retries should clear prior diagnostics');
  for (const state of ['overview.state: materializing', 'overview.state: current', 'overview.state: failed', 'overview.state: stale']) {
    assert.match(worker, new RegExp(state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `worker should map ${state}`);
  }
  assert.match(worker, /failure_details[\s\S]{0,220}(?:user|surface|present)/i,
    'the design worker should surface the diagnostic at the failure boundary');
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

test('installation projects the shared change-overview instruction through the recursive commands projection', () => {
  const manifest = artifact('sai/install-manifest.json');

  assert.doesNotMatch(manifest, /"source"\s*:\s*"sai\/change-overview\.md"/,
    'the dedicated root projection for the change-overview instruction should be gone');
  assert.match(manifest, /"source"\s*:\s*"sai\/commands"/,
    'the recursive sai-commands projection should carry the command-owned instruction');
  assert.match(manifest, /"destination"\s*:\s*\{\s*"class"\s*:\s*"sai"\s*,\s*"path"\s*:\s*"change-overview\.md"\s*\}[\s\S]*?"managedHashes"/,
    'the former sai root change-overview.md destination should carry a retirement record');
  assert.doesNotMatch(manifest, /change-overview-instruction/,
    'the obsolete change-overview-instruction override projection should be retired');
  assert.doesNotMatch(manifest, /"sai-instructions"/,
    'the obsolete recursive sai-instructions projection should be retired');
  assert.match(manifest, /"destination"\s*:\s*\{\s*"class"\s*:\s*"sai"\s*,\s*"path"\s*:\s*"instructions\/change-overview\.md"/,
    'the former instructions/change-overview.md destination should be retired');
});

// ─── overview-generator-contract-transport — transport & schema-instruction assertions ──

test('overview dispatch transports the contract by Fetch and names both harness bindings', () => {
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(worker, /Fetch @sai\/commands\/design\/change-overview\.md/,
    'worker.md should instruct the subagent to Fetch @sai/commands/design/change-overview.md');
  assert.match(worker, /follow it exactly/i,
    'worker.md should instruct the subagent to follow the fetched contract exactly');
  assert.match(worker, /Agent\(subagent_type: budget-subagent\)/,
    'worker.md should name the Claude Code budget-subagent binding');
  assert.match(worker, /task\(subagent_type: budget\)/,
    'worker.md should name the opencode budget binding');
});

test('overview dispatch prompt stays minimal', () => {
  const worker = artifact('sai/commands/design/worker.md');

  // The prompt carries the change name, overview_language, and the Fetch directive.
  const dispatchIndex = worker.indexOf('First materialization');
  assert.ok(dispatchIndex >= 0, 'worker.md should carry the First materialization bullet');
  const dispatchBlock = worker.slice(dispatchIndex, dispatchIndex + 3000);

  assert.match(dispatchBlock, /change name/i,
    'the dispatch prompt should carry the resolved change name');
  assert.match(dispatchBlock, /overview_language/,
    'the dispatch prompt should carry the overview_language value');
  assert.match(dispatchBlock, /Fetch @sai\/commands\/design\/change-overview\.md/,
    'the dispatch prompt should carry the Fetch directive');

  // The prompt does not enumerate the nine required sections or the forbidden sections.
  // Section names are Proper-Noun titles (e.g. `## Requirements`); case-sensitive
  // matching detects the actual titles and excludes generic prose nouns such as
  // "content requirements", which the case-insensitive flag would false-match after "enumerate".
  for (const section of [
    'Change Proposal', 'Scope', 'Capabilities', 'Target Architecture',
    'Key Contracts', 'File Manifest', 'Review Scenarios',
    'Implementation Approach', 'Approval Summary',
  ]) {
    assert.doesNotMatch(dispatchBlock, new RegExp('enumerate.*' + section),
      `the dispatch prompt must not enumerate the ${section} section`);
  }
  for (const forbidden of [
    'Target State', 'Requirements', 'Scenarios', 'Interfaces',
    'Assertions', 'File Changes', 'Delivery Steps', 'Traceability',
  ]) {
    assert.doesNotMatch(dispatchBlock, new RegExp('enumerate.*' + forbidden),
      `the dispatch prompt must not enumerate the forbidden ${forbidden} section`);
  }
});

test('overview contract-load failure route is parent-authored generation-error', () => {
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(worker, /contract-load failure|cannot load the shared contract|cannot load the shared generation contract/i,
    'worker.md should describe the contract-load failure route');
  assert.match(worker, /generation-error/,
    'contract-load failure should be classified as generation-error');
  assert.match(worker, /validation: not-performed/,
    'the parent-authored route should use validation: not-performed');
  assert.match(worker, /status: failed/,
    'the parent-authored route should use status: failed');
  assert.match(worker, /changed_files: \[openspec\/changes\/\{change-name\}\/change-overview\.md\]/,
    'the parent-authored route should report the overview path');

  // The subagent does not self-classify or produce a five-field envelope.
  assert.match(worker, /does not self-classify|does not improvise/i,
    'the subagent should not self-classify or improvise on contract-load failure');

  // The parent does not use dispatch-failed for this route.
  const loadFailureIndex = worker.search(/contract-load failure|cannot load the shared/i);
  assert.ok(loadFailureIndex >= 0, 'worker.md should name the contract-load failure route');
  const loadFailureBlock = worker.slice(loadFailureIndex, loadFailureIndex + 400);
  assert.doesNotMatch(loadFailureBlock, /failure_kind: dispatch-failed/,
    'the contract-load failure route must not use failure_kind: dispatch-failed');
});

test('overview first materialization and regeneration share the same transport', () => {
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(worker, /first materialization and regeneration use the same transport/i,
    'worker.md should state that first materialization and regeneration share the same transport');
  assert.match(worker, /first materialization and regeneration use the same transport, binding, Fetch, and minimal prompt shape/i,
    'worker.md should state that both paths use the same prompt transport and shape');
});

test('opted-in Continue preserves the fetched single-file generator contract and English diagnostics', () => {
  const worker = artifact('sai/commands/design/worker.md');
  const instruction = artifact('sai/commands/design/change-overview.md');

  assert.match(worker, /Fetch @sai\/commands\/design\/change-overview\.md/,
    'the generation continuation must still fetch the shared overview contract');
  assert.match(worker, /follow it exactly/i,
    'the generation continuation must follow the fetched contract exactly');
  assert.match(instruction, /English (?:failure_details|diagnostic)/i,
    'generator diagnostics must remain non-empty English');
  assert.match(instruction, /writes ONLY/i,
    'the generator must retain its write restriction');
  assert.match(instruction, /single-file/i,
    'the generator must retain its single-file scope');
  for (const field of ['status', 'changed_files', 'validation', 'failure_details', 'failure_kind']) {
    assert.match(instruction, new RegExp('`' + field + '`'),
      `the opted-in generator contract must retain ${field}`);
  }
});

test('schema change-overview instruction is a non-empty informative reference only', () => {
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');
  const overviewInstruction = schema.slice(
    schema.indexOf('id: change-overview'),
    schema.indexOf('id: implementation'),
  );

  // Non-empty and names the command-owned contract path.
  assert.ok(overviewInstruction.trim().length > 0,
    'the change-overview instruction must be non-empty');
  assert.match(overviewInstruction, /sai\/commands\/design\/change-overview\.md/,
    'the instruction should name the command-owned contract path');

  // Does not name the retired root path as the live contract.
  assert.doesNotMatch(overviewInstruction, /sai\/change-overview\.md/,
    'the instruction must not name the retired sai/change-overview.md path as the live contract');

  // Does not enumerate any of the eight forbidden top-level sections as required content.
  for (const forbidden of [
    'Target State', 'Requirements', 'Scenarios', 'Interfaces',
    'Assertions', 'File Changes', 'Delivery Steps', 'Traceability',
  ]) {
    assert.doesNotMatch(overviewInstruction, new RegExp(forbidden),
      `the instruction must not enumerate ${forbidden} as required content`);
  }

  // Does not restate the five-field generator envelope, the failure_kind vocabulary,
  // the parent-versus-generator split, or the outer classification mapping.
  for (const field of ['status', 'changed_files', 'validation', 'failure_details', 'failure_kind']) {
    assert.doesNotMatch(overviewInstruction, new RegExp('`' + field + '`'),
      `the instruction must not restate the ${field} envelope field`);
  }
  assert.doesNotMatch(overviewInstruction, /envelope-contract-violation/i,
    'the instruction must not restate the outer classification mapping');
  assert.doesNotMatch(overviewInstruction, /parent-versus-generator|parent-vs-generator/i,
    'the instruction must not restate the parent-versus-generator split');
});

test('schema and worker transport coverage is not satisfied by template-only section checks', () => {
  // The overview template carries the nine-section shape, but that shape does not
  // substitute for transport or schema-instruction coverage. This test asserts the
  // two production surfaces independently carry the coverage.
  const worker = artifact('sai/commands/design/worker.md');
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');

  assert.match(worker, /Fetch @sai\/commands\/design\/change-overview\.md/,
    'worker.md should carry the Fetch transport independently of the template');
  assert.match(schema, /sai\/commands\/design\/change-overview\.md/,
    'schema.yaml should name the command-owned contract path independently of the template');
});

// ─── Step 4: Continue-triggered overview generation in the design coordinator ─

test('Continue triggers worker-owned generation only when --overview-lang is present', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(coordinator, /Continue/, 'the gate-closed next action should be Continue');
  assert.match(coordinator, /generation[\s-]?(?:pass|trigger|terminal)/i,
    'Continue should trigger the worker-owned generation pass');
  assert.match(coordinator, /same[\s-]?worker/i, 'generation should run via a same-worker continuation');
  assert.match(
    coordinator,
    /(?:only|when|if)[\s\S]{0,220}`?--overview-lang`?[\s\S]{0,220}(?:present|provided|supplied)[\s\S]{0,500}(?:generation|generator)/i,
    'Continue generation should be conditional on an explicitly present overview-language flag',
  );
  assert.match(
    coordinator,
    /(?:(?:absent|without|missing)[\s\S]{0,260}`?--overview-lang`?|`?--overview-lang`?[\s\S]{0,260}(?:absent|without|missing))[\s\S]{0,500}(?:no|skip|does not|without)[\s\S]{0,160}(?:generation|generator)/i,
    'an absent overview-language flag should suppress generation',
  );
});

test('failed first materialization suppresses the success terminal', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(coordinator, /`?--overview-lang`?/, 'materialization failure applies to the opted-in path');
  assert.match(coordinator, /failed/i, 'coordinator should map a failed first materialization');
  assert.match(coordinator, /completion sentence/i, 'coordinator should reference the design completion sentence');
  assert.match(coordinator, /suppress|do\s*not\s*emit|does\s*not\s*emit/i,
    'coordinator should suppress the design completion sentence on a failed materialization');
});

test('unopted Continue materializes nothing while permitting an existing stale overview', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(coordinator, /materializ/i, 'coordinator should reference materialization');
  assert.match(
    coordinator,
    /(?:(?:absent|without|missing)[\s\S]{0,260}`?--overview-lang`?|`?--overview-lang`?[\s\S]{0,260}(?:absent|without|missing))[\s\S]{0,500}(?:without\s+materialization|no\s+overview|unmaterialized|no generation)/i,
    'an unopted path should end without materializing an overview',
  );
  assert.match(
    worker,
    /(?:(?:absent|without|missing)[\s\S]{0,320}`?--overview-lang`?|`?--overview-lang`?[\s\S]{0,320}(?:absent|without|missing))[\s\S]{0,420}(?:stale|permitted|allowed|leave)[\s\S]{0,180}(?:overview|state)/i,
    'an unopted path should permit an existing stale overview rather than regenerating it',
  );
});

test('generation terminal changed_files are forwarded without re-derivation', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(coordinator, /`?--overview-lang`?/, 'changed_files forwarding applies to opted-in generation');
  assert.match(coordinator, /changed_files/, 'coordinator should forward the generation terminal changed_files');
  assert.match(coordinator, /forward/i, 'coordinator should forward changed_files unchanged');
});

// ─── Step 5: Read-only Review change-overview action in the sai-explore loop ─

test('per-change menu is a native picker with four options and an active exit token', () => {
  const explore = exploreContract();
  const labels = [
    "Review sai-1's artifacts",
    "Review sai-2's artifacts",
    'Review change-overview',
    'Skip',
  ];

  let cursor = -1;
  for (const label of labels) {
    const position = explore.indexOf(label);
    assert.ok(position > cursor, `${label} should appear after the previous option`);
    cursor = position;
  }

  assert.match(explore, /native picker/i);
  assert.match(explore, /four-option|exactly four/i);
  assert.match(explore, /active per-change exit window/i);
  assert.match(explore, /free-text field[\s\S]{0,240}`exit`/i);
  assert.equal(explore.includes(['Exit', 'review', 'loop'].join(' ')), false);
  assert.doesNotMatch(explore, /(?:five|5)[\s-]?option/i);
});

test('non-current overview produces an availability report, not a review', () => {
  const explore = exploreContract();

  assert.match(explore, /overview\.state/, 'the currentness conjunction should read overview.state');
  assert.match(explore, /availability\/integrity|availability and integrity/i,
    'non-current overviews should produce an availability/integrity report');
  assert.match(explore, /no findings tally|no `Summary:`|no findings and no/i,
    'the availability report should carry no findings tally');
});

test('non-current overview reporting names persisted diagnostics without reviewing them', () => {
  const explore = exploreContract();

  assert.match(explore, /persisted `?overview\.failure_kind`?/i,
    'availability reports should name the persisted failure kind');
  assert.match(explore, /exact persisted `?overview\.failure_details`?/i,
    'availability reports should name the exact persisted failure details');
  assert.match(explore, /materializing[\s\S]{0,260}interrupted before failure classification/i,
    'materializing without diagnostics should be reported as interrupted before classification');
  assert.match(explore, /stale[\s\S]{0,260}no generation failure diagnostic is recorded/i,
    'stale without diagnostics must not be reported as an interruption');
  assert.match(explore, /failure_details[\s\S]{0,160}even if `?overview\.failure_kind`? is absent/i,
    'failure details must be reportable even when its classification key is absent');
  assert.match(explore, /availability[\s\S]{0,260}no findings[\s\S]{0,260}(?:Summary|tally)/i,
    'non-current reports must remain read-only availability reports');
  assert.match(explore, /failure record[\s\S]{0,180}never (?:as )?a current overview/i,
    'failure records must remain diagnostic state');
  assert.match(explore, /does not mark or clear review evidence[\s\S]{0,120}never write/i,
    'availability reports must not mutate review evidence or artifacts');
});

test('review output is a single findings block handed off without acceptance', () => {
  const explore = exploreContract();

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
  const explore = exploreContract();

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
  const explore = exploreContract();

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

test('archive synchronizes delta specs without presenting a sync choice', () => {
  const archive = artifact('sai/commands/archive/instructions.md');

  assert.match(archive, /When delta specs exist, always select the sync path/,
    'delta specs should always take the synchronization path');
  assert.match(archive, /do not present a synchronization choice/,
    'archive should not ask whether to synchronize specs');
  assert.match(archive, /already synchronized, select the archive\s+path directly/,
    'already-synced specs should proceed directly to archive');
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
  const explore = exploreContract();

  assert.match(explore, /When a genuine unresolved question remains and its answer could change the idea, end with that relevant question/);
  assert.match(explore, /When no genuine unresolved question remains(?:, including when the only apparent question is phase navigation)?, end with this concise reminder/);
  assert.match(explore, /Say `crystallize` when ready; crystallization generates the paste-ready prompt for `\/sai-1-spec`/);
  assert.match(explore, /Evaluate this rule again on every later successful qualifying turn/);
  assert.match(explore, /fallback reminder repeats even after readiness has already been emitted/);
  assert.match(explore, /does not suppress this rule/);
  assert.match(explore, /readiness signal.*at most once per stable idea/i);
  assert.doesNotMatch(explore, /manufactur(?:e|ed) a question/);
});

test('localized Change Overview generation preserves structural anchors, source artifacts, and its result envelope', () => {
  const instruction = artifact('sai/commands/design/change-overview.md');

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
  const explore = exploreContract();
  const prereqs = artifact('sai/policies/prereqs-check.md');

  assert.match(explore, /Before a candidate idea exists, no Closure State is active/);
  assert.match(explore, /An explicit crystallization request transitions the state to `crystallized`/);
  assert.match(explore, /Do not append the pre-crystallization question-or-reminder closure to that crystallization response/);
  assert.match(explore, /An explicit discard transitions the state to `discarded`/);
  assert.match(explore, /subsequent successful responses about that discarded idea receive no pre-crystallization closure/);
  assert.match(explore, /Do not apply this successful-response closure to prerequisite halts, failures, cancellations/);
  assert.match(explore, /completed post-crystallization review-loop closes/);
  assert.doesNotMatch(explore, /review-loop silent-close allowance/, 'the silent-close allowance is retired by the explicit-exit contract');
  assert.match(explore, /review-loop[\s\S]{0,160}(?:close|closing)[\s\S]{0,160}(?:acknowledg|confirm)|(?:acknowledg|confirm)[\s\S]{0,160}(?:close|closing)[\s\S]{0,160}review-loop/i,
    'the review-loop close should be an explicit acknowledgment');
  assert.match(prereqs, /openspec CLI not found\. Install it first: https:\/\/github\.com\/Fission-AI\/OpenSpec/);
  assert.match(prereqs, /OpenSpec not initialized in this project\. Run: openspec init/);
  assert.match(prereqs, /openspec\/config\.yaml does not declare `schema: sai-workflow`/);
  assert.match(explore, /full `Ready to Propose` block\(s\) are printed only when the user explicitly asks to crystallize/);
});

// ─── Step 3: spec-design-review-progress-step (overview progress evidence) ──

test('Step 3: successful overview materialization or regeneration emits a progress event carrying the overview step id with both changed files', () => {
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(
    worker,
    /generator success[\s\S]{0,240}(?:emit|progress)|(?:emit|progress)[\s\S]{0,240}generator success/i,
    'generator success should emit the overview progress event'
  );
  assert.match(
    worker,
    /overview\.state[\s\S]{0,160}current[\s\S]{0,240}(?:emit|progress)|(?:emit|progress)[\s\S]{0,240}overview\.state[\s\S]{0,160}current/i,
    'the overview progress event should follow overview.state current'
  );
  assert.match(
    worker,
    /(?:emit|reports?)[\s\S]{0,120}progress[\s\S]{0,160}\[?["'`]?overview["'`]?\]?|step_?ids?:[\s\S]{0,120}\[?["'`]?overview["'`]?\]?/i,
    'the progress event should carry the overview step id'
  );
  assert.match(
    worker,
    /progress[\s\S]{0,400}change-overview\.md[\s\S]{0,400}\.openspec\.yaml|progress[\s\S]{0,400}\.openspec\.yaml[\s\S]{0,400}change-overview\.md/i,
    'the overview progress event should report change-overview.md and .openspec.yaml in changed_files'
  );
});

test('Step 3: any overview generation failure emits no overview progress event and preserves existing diagnostics', () => {
  const worker = artifact('sai/commands/design/worker.md');

  for (const failure of ['dispatch', 'process loss', 'malformed', 'empty envelope', 'validation', 'contradiction', 'generation']) {
    assert.match(worker, new RegExp(failure.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      `the worker should cover the ${failure} failure route`);
  }
  assert.match(
    worker,
    /(?:dispatch|process loss|malformed|empty envelope|validation|contradiction|generation fail)[\s\S]{0,400}(?:no|without|never)[\s\S]{0,160}`?overview`?[\s\S]{0,160}(?:progress event|step_?ids?)/i,
    'every failure route should emit no overview progress event'
  );
  assert.match(
    worker,
    /(?:existing|prior|current)[\s\S]{0,160}(?:non-?empty)[\s\S]{0,240}(?:failure_classification|failure_kind|failure_details|diagnostic)[\s\S]{0,200}(?:intact|remain|stays?|unchanged|preserv)/i,
    'existing non-empty failure classification and details should remain intact'
  );
});

// ─── Step 1: Explicit review-loop exit and closure contract (explore) ─

test('per-change picker declares four labels in fixed order as a harness-native menu', () => {
  const explore = exploreContract();
  const labels = [
    "Review sai-1's artifacts",
    "Review sai-2's artifacts",
    'Review change-overview',
    'Skip',
  ];

  let cursor = -1;
  for (const label of labels) {
    const position = explore.indexOf(label);
    assert.ok(position > cursor, `the picker should list ${label} after the previous option`);
    cursor = position;
  }
  assert.match(explore, /harness[- ]native|native picker/i);
  assert.match(explore, /question text[\s\S]{0,240}literal `exit` token/i);
  assert.match(explore, /free-text field[\s\S]{0,240}exit/i);
  assert.equal(explore.includes(['Exit', 'review', 'loop'].join(' ')), false);
});

test('every review and non-completing transaction re-presents the same four-option picker; only Skip advances and active exit terminates', () => {
  const explore = exploreContract();

  assert.match(explore, /every review[\s\S]{0,240}re-present/i);
  assert.match(explore, /non-completing[\s\S]{0,240}re-present|re-present[\s\S]{0,240}non-completing/i);
  assert.match(explore, /same[\s\S]{0,180}four-option picker/i);
  assert.match(explore, /only `Skip`[\s\S]{0,220}(?:advance|advances)/i);
  assert.match(explore, /active-loop `exit` token[\s\S]{0,300}(?:terminate|terminates)/i);
  assert.doesNotMatch(explore, /(?:five|5)[\s-]?option/i);
});

test('correction handoff permits exactly one findings encoding', () => {
  const explore = exploreContract();

  assert.match(explore, /exactly one[\s\S]{0,160}(?:findings block|encoding|encode)/i);
  assert.match(explore, /(?:encoding|encode)[\s\S]{0,180}once|once[\s\S]{0,180}(?:encoding|encode)/i);
  assert.doesNotMatch(explore, /more than one (?:findings block|encoding)/i);
});

test('picker re-entry is excluded from the single-encoding prohibition and from acceptance semantics', () => {
  const explore = exploreContract();

  assert.match(explore, /(?:re-?entering the picker|picker re-?entry)/i,
    'the handoff contract should name picker re-entry explicitly');
  assert.match(explore,
    /(?:re-?entering the picker|picker re-?entry)[\s\S]{0,240}(?:prohibition|prohibited|does not count|not (?:covered|an encoding)|allowed|excluded)|(?:prohibition|prohibited)[\s\S]{0,240}(?:re-?entering the picker|picker re-?entry)/i,
    'picker re-entry should be excluded from the single-encoding prohibition');
  assert.match(explore,
    /(?:re-?entering the picker|picker re-?entry)[\s\S]{0,240}(?:acceptance|not (?:an?|a) acceptance)|acceptance[\s\S]{0,240}(?:re-?entering the picker|picker re-?entry)/i,
    'picker re-entry should be excluded from acceptance semantics');
});

test('set exhaustion and the active exit token both emit a minimal close acknowledgment with no next-command prompt, including zero reviews', () => {
  const explore = exploreContract();

  assert.match(explore, /(?:exhaust(?:ion|ed)|no (?:more|further) changes|no changes remain)[\s\S]{0,260}(?:acknowledg|confirm)/i);
  assert.match(explore, /active-loop `exit` token[\s\S]{0,420}(?:same minimal close acknowledgment|acknowledg|confirm)/i);
  assert.match(explore, /no next[- ]command (?:prompt|suggestion)/i);
  assert.match(explore, /zero reviews|no reviews (?:occurred|were (?:performed|made))|without (?:any|a single) review/i);
});

test('the active exit token resolves the active review item to pending exactly as Skip does, without marking or clearing evidence', () => {
  const explore = exploreContract();

  assert.match(explore, /active-loop `exit` token[\s\S]{0,360}`?pending`?/i);
  assert.match(explore, /Skip[\s\S]{0,260}`?pending`?/i);
  assert.match(explore, /(?:same as|exactly as|identical to)[\s\S]{0,180}Skip/i);
  assert.match(explore, /(?:active-loop `exit` token|Skip)[\s\S]{0,360}(?:does not mark|without marking|does not clear|without clearing)/i);
});

test('contract coverage names both close paths including zero-review exit with identical closure across harnesses', () => {
  const explore = exploreContract();

  assert.match(explore, /active-loop `exit` token/);
  assert.match(explore, /both[\s\S]{0,180}(?:close paths?|closing paths?|exit paths?)/i);
  assert.match(explore, /zero reviews|no reviews/i);
  assert.match(explore, /Claude Code[\s\S]{0,240}opencode|opencode[\s\S]{0,240}Claude Code/i);
  assert.match(explore, /identical[\s\S]{0,140}(?:behavior|closure|close)|(?:behavior|closure|close)[\s\S]{0,140}identical/i);
});

// ─── extract-review-engine Step 1: Review engine extraction and manual navigation ─

test('review engine is defined once and takes exactly a change name and an artifact-set designator', () => {
  const explore = exploreContract();

  const engineDefs = explore.match(/Review Engine\(changeName,\s*artifactSetDesignator\)/g) || [];
  assert.equal(engineDefs.length, 1,
    'the Review Engine(changeName, artifactSetDesignator) invocation contract should appear exactly once');
  assert.match(explore, /(?:exactly (?:the|a) (?:authoritative )?change name|the authoritative change name)/i,
    'the engine should accept exactly the authoritative change name');
  assert.match(explore, /sai-1[\s\S]{0,80}sai-2[\s\S]{0,80}change[- ]overview[\s\S]{0,120}(?:artifact[- ]set designator|designator)/i,
    'the artifact-set designator should be one of sai-1, sai-2, or change-overview');
  assert.match(explore, /(?:without|independent of|does not (?:require|depend on))[\s\S]{0,180}(?:picker|navigation state|tracked set)/i,
    'the engine should depend on no picker, tracked set, or navigation state');
});

test('review engine resolves only the exact change directory and checks children only after existence', () => {
  const explore = exploreContract();

  const dirIndex = explore.indexOf('openspec/changes/{change-name}/');
  assert.ok(dirIndex !== -1, 'the engine should resolve the exact openspec/changes/{change-name}/ directory');
  const existenceIndex = explore.search(/directory (?:does not exist|is missing)|missing (?:change )?directory/);
  assert.ok(existenceIndex > dirIndex, 'the engine should check directory existence only after resolution');
  const childIndex = explore.indexOf('specs/**/*.md', existenceIndex);
  assert.ok(childIndex > existenceIndex, 'the engine should check child artifact paths only after the directory exists');
  assert.match(explore, /without repository[- ]wide change discovery|no repository[- ]wide change discovery/i,
    'resolution should run no repository-wide change discovery');
  assert.match(explore, /(?:without presenting|not present|does not present)[\s\S]{0,160}(?:child|artifact path)[\s\S]{0,80}(?:independently checked|as independently)/i,
    'a missing directory should not present child paths as independently checked');
});

test('review engine rereads every available requested artifact from disk each transaction', () => {
  const explore = exploreContract();

  assert.match(explore, /re[- ]?read/i, 'the engine should reread requested artifacts from disk');
  assert.match(explore, /re[- ]?read[\s\S]{0,200}(?:every (?:currently )?available|each (?:currently )?available)/i,
    'the engine should reread every available requested artifact');
  assert.match(explore, /(?:fresh|freshly)[\s\S]{0,120}(?:read|disk)|read[\s\S]{0,120}(?:from disk)/i,
    'findings should derive only from fresh disk reads');
  assert.match(explore, /(?:prior findings?|cached|stale absence|stale existence)[\s\S]{0,200}(?:invalid evidence|not reuse|does not reuse|never reuse)/i,
    'prior or cached evidence should be invalid for the current transaction');
  assert.match(explore, /(?:not|never|without)[\s\S]{0,80}(?:conclude|assume)[\s\S]{0,120}(?:unchanged|no change)/i,
    'the engine should not conclude contents are unchanged without rereading');
});

test('review engine cites the shared finding contract without redefining it', () => {
  const explore = exploreContract();

  assert.match(explore, /artifact[- ]review[- ]contract|artifact-review-contract\.md/i,
    'the engine should cite the shared artifact review finding contract');
  assert.match(explore, /cite[\s\S]{0,80}(?:by reference|shared)|(?:by reference|shared)[\s\S]{0,80}cite/i,
    'the engine should cite the shared contract by reference');
  assert.match(explore, /(?:does not|shall not|without) (?:redefine|restate)[\s\S]{0,140}(?:severity|finding shape|identifier|summary[- ]line|criteria)/i,
    'the engine should not redefine the contract details inline');
});

test('review engine emits deterministic base-form review output and performs no writes', () => {
  const explore = exploreContract();

  assert.match(explore, /base[- ]?form[\s\S]{0,200}(?:summary tally|tally)/i,
    'the engine should close completed reviews with the contract base-form summary tally');
  assert.match(explore, /deterministic order/i, 'the engine should emit findings in deterministic order');
  assert.match(explore, /High[\s\S]{0,200}Medium[\s\S]{0,200}Low[\s\S]{0,200}ascending numeric/i,
    'findings should order by severity and then ascending numeric identifier');
  assert.match(explore, /(?:no writes|writes? nothing|never writes?|strictly read[- ]only)/i,
    'the engine should perform no writes');
  assert.match(explore, /(?:does not|never|without)[\s\S]{0,80}(?:write|writing)[\s\S]{0,80}overview\.state/i,
    'the engine should never write overview.state');
});

test('navigation shell owns the fixed four-option picker and invokes the engine for every review selection', () => {
  const explore = exploreContract();

  assert.match(explore, /(?:shell|navigation|manual path)[\s\S]{0,200}(?:owned by|owns?|ownership)/i,
    'the picker and navigation should remain owned by the manual path');
  assert.match(explore, /four[\s-]?option/i, 'the picker should be the fixed four-option menu');
  const labels = [
    "Review sai-1's artifacts",
    "Review sai-2's artifacts",
    'Review change-overview',
    'Skip',
  ];
  let cursor = -1;
  for (const label of labels) {
    const position = explore.indexOf(label);
    assert.ok(position > cursor, `the shell should list ${label} in fixed order`);
    cursor = position;
  }
  assert.match(explore, /active-loop `exit` token/i,
    'the shell should use the active exit token instead of an extra picker option');
  assert.doesNotMatch(explore, /Exit review loop/);
  assert.match(explore, /(?:every|each|all)[\s\S]{0,160}(?:review )?(?:selection|review action)[\s\S]{0,200}(?:invoke|invokes?|calls?)/i,
    'every review selection should invoke the engine');
  assert.match(explore, /(?:no review work|performs? no review work|does not (?:resolve|check|re[- ]?read|form findings?))/i,
    'the navigation shell should perform no review work itself');
});

test('navigation re-enters the same picker after every non-closing turn and keeps the single-block handoff and close', () => {
  const explore = exploreContract();

  assert.match(explore, /non-?closing[\s\S]{0,200}(?:re[- ]?enter|re[- ]?present)|(?:re[- ]?enter|re[- ]?present)[\s\S]{0,200}non-?closing/i,
    'every non-closing turn should re-enter the same picker');
  assert.match(explore, /(?:only closing action|the only closing)[\s\S]{0,160}(?:picker|re[- ]?present)|(?:picker|re[- ]?present)[\s\S]{0,160}(?:only closing action|the only closing)/i,
    're-presenting the picker should be the only closing action');
  assert.match(explore, /print[- ]for[- ]paste|single[\s-]?block (?:handoff|hand-off)/i,
    'the shell should keep the single-block print-for-paste handoff');
  assert.match(explore, /exactly one findings block|one findings block per/i,
    'the handoff should remain exactly one findings block');
  assert.match(explore, /minimal close (?:acknowledgment|acknowledgement)|Loop closed/i,
    'loop termination should emit a minimal close acknowledgment');
});

// ─── RED slice: single-source design artifact contract pointers ─────────────

const DESIGN_ARTIFACT_POINTERS = [
  { id: 'design', anchor: '### Generate design.md' },
  { id: 'tasks', anchor: '### Generate tasks.md' },
  { id: 'interfaces', anchor: '### Generate interfaces.md' },
];

const DESIGN_INSTRUCTION_FORBIDDEN_SUBSTRINGS = [
  'ADR/DDR',
  'Record family',
  'Provenance',
  'Verify-first',
  'Architecture Snapshot',
  'File Manifest',
  'None — no step contracts',
  'Endpoint Map',
  '**Routing**',
  '**Files Affected**',
  '**Testing Strategy**',
];

const PRE_CHANGE_DESIGN_GRAPH = Object.freeze({
  design: { generates: 'design.md', requires: ['proposal', 'specs'] },
  tasks: { generates: 'tasks.md', requires: ['specs', 'design'] },
  interfaces: { generates: 'interfaces.md', requires: ['tasks'] },
  apply: { requires: ['tasks', 'implementation'], tracks: ['implementation.md'] },
});

function escapeSchemaContractRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function schemaIdHeader(line) {
  return line.match(/^(\s*)(?:-\s*)?id:\s*([A-Za-z0-9_-]+)\s*(?:#.*)?$/);
}

function schemaEntryForContract(schema, id) {
  const lines = schema.split(/\r?\n/);
  const start = lines.findIndex(line => {
    const match = schemaIdHeader(line);
    return match && match[2] === id;
  });
  assert.ok(start >= 0, `schema.yaml should contain the ${id} artifact entry`);

  const header = schemaIdHeader(lines[start]);
  const headerIndent = header[1].length;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = schemaIdHeader(lines[index]);
    if (match && match[1].length <= headerIndent) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function schemaLiteralBlockForContract(section, field) {
  const lines = section.split(/\r?\n/);
  const markerPattern = new RegExp(`^(\\s*)${field}:\\s*\\|[+-]?\\s*$`);
  const markerIndex = lines.findIndex(line => markerPattern.test(line));
  assert.ok(markerIndex >= 0, `${field} should be a literal block`);

  const markerIndent = lines[markerIndex].match(/^\s*/)[0].length;
  let end = lines.length;
  for (let index = markerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && line.match(/^\s*/)[0].length <= markerIndent) {
      end = index;
      break;
    }
  }

  const body = lines.slice(markerIndex + 1, end);
  const nonEmpty = body.filter(line => line.trim());
  assert.ok(nonEmpty.length > 0, `${field} literal block should not be empty`);
  const contentIndent = Math.min(...nonEmpty.map(line => line.match(/^\s*/)[0].length));
  return body.map(line => line.trim() ? line.slice(contentIndent) : '').join('\n').trim();
}

function schemaFieldForContract(section, field) {
  const lines = section.split(/\r?\n/);
  const fieldPattern = new RegExp(`^([ \\t]*)${field}:[ \\t]*(.*)$`);
  const fieldIndex = lines.findIndex(line => fieldPattern.test(line));
  assert.ok(fieldIndex >= 0, `schema section should contain ${field}`);
  const match = lines[fieldIndex].match(fieldPattern);
  if (/^\|[+-]?\s*$/.test(match[2].trim())) {
    return schemaLiteralBlockForContract(section, field);
  }
  if (match[2].trim() === '') {
    const fieldIndent = match[1].length;
    const items = [];
    for (let index = fieldIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line.trim()) continue;
      const indent = line.match(/^[ \\t]*/)[0].length;
      if (indent < fieldIndent || (indent === fieldIndent && !line.trim().startsWith('-'))) break;
      if (line.trim().startsWith('-')) items.push(line.trim().slice(1).trim());
    }
    if (items.length > 0) return `[${items.join(', ')}]`;
  }
  return match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}

function schemaTopLevelSectionForContract(schema, name) {
  const lines = schema.split(/\r?\n/);
  const headerPattern = new RegExp(`^(\\s*)${name}:\\s*$`);
  const start = lines.findIndex(line => headerPattern.test(line));
  assert.ok(start >= 0, `schema.yaml should contain the ${name} section`);

  const headerIndent = lines[start].match(/^\s*/)[0].length;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && line.match(/^\s*/)[0].length <= headerIndent) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function schemaListForContract(value) {
  const normalized = value.trim();
  const content = normalized.startsWith('[')
    ? normalized.slice(1, normalized.lastIndexOf(']'))
    : normalized;
  if (!content.trim()) return [];
  return content.split(',').map(item => item.trim().replace(/^-\s*/, '').replace(/^(['"])(.*)\1$/, '$2'));
}

test('design artifact schema instructions are non-empty command-owned pointers with no duplicated contract detail', () => {
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');

  for (const { id, anchor } of DESIGN_ARTIFACT_POINTERS) {
    const entry = schemaEntryForContract(schema, id);
    const instruction = schemaLiteralBlockForContract(entry, 'instruction');

    assert.ok(instruction.trim().length > 0, `${id} instruction should be non-empty`);
    assert.match(instruction, /sai\/commands\/design\/instructions\.md/,
      `${id} instruction should point to the shared design instruction`);
    assert.match(instruction, new RegExp(escapeSchemaContractRegExp(anchor)),
      `${id} instruction should name its generation anchor`);
    for (const forbidden of DESIGN_INSTRUCTION_FORBIDDEN_SUBSTRINGS) {
      assert.doesNotMatch(instruction, new RegExp(escapeSchemaContractRegExp(forbidden)),
        `${id} instruction should not duplicate ${forbidden}`);
    }
  }
});

test('design artifact schema preserves the fixed pre-change graph baseline and does not advertise Endpoint Map', () => {
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');
  const design = schemaEntryForContract(schema, 'design');
  const description = schemaFieldForContract(design, 'description');
  assert.doesNotMatch(description, /Endpoint Map/,
    'the design description should not advertise Endpoint Map');

  for (const id of ['design', 'tasks', 'interfaces']) {
    const entry = schemaEntryForContract(schema, id);
    const expected = PRE_CHANGE_DESIGN_GRAPH[id];
    assert.equal(schemaFieldForContract(entry, 'generates'), expected.generates,
      `${id} should preserve its pre-change generated artifact`);
    assert.deepEqual(schemaListForContract(schemaFieldForContract(entry, 'requires')), expected.requires,
      `${id} should preserve its pre-change requirements`);
  }

  const apply = schemaTopLevelSectionForContract(schema, 'apply');
  assert.deepEqual(schemaListForContract(schemaFieldForContract(apply, 'requires')),
    PRE_CHANGE_DESIGN_GRAPH.apply.requires,
    'apply should preserve its pre-change requirements');
  assert.deepEqual(schemaListForContract(schemaFieldForContract(apply, 'tracks')),
    PRE_CHANGE_DESIGN_GRAPH.apply.tracks,
    'apply should preserve tracking of implementation.md');
});

// ─── RED slice: single-source design artifact skeleton oracle ───────────────

const DESIGN_SKELETON_TEMPLATES = [
  {
    id: 'design',
    path: 'openspec/schemas/sai-workflow/templates/design.md',
    anchor: '### Generate design.md',
  },
  {
    id: 'tasks',
    path: 'openspec/schemas/sai-workflow/templates/tasks.md',
    anchor: '### Generate tasks.md',
  },
  {
    id: 'interfaces',
    path: 'openspec/schemas/sai-workflow/templates/interfaces.md',
    anchor: '### Generate interfaces.md',
  },
];

const DESIGN_SKELETON_AUTHORITY = 'sai/commands/design/instructions.md';
const DESIGN_SKELETON_FORBIDDEN = [
  'Endpoint Map',
  'None — no step contracts',
  'Hard to reverse',
  'Surprising without context',
  'Real trade-off',
  'domain invariant',
  'ordered routing test',
];

const DESIGN_TOP_LEVEL_SKELETON = [
  '## Target State',
  '## Context',
  '## Goals / Non-Goals',
  '## Decisions',
  '## Risks / Trade-offs',
  '## Migration Plan',
  '## Open Questions',
  '## Deferred',
  '## Manual Verification',
];

const TASKS_SKELETON_MARKERS = [
  '**Routing**',
  '**Files Affected**',
  '**What Will Be Done**',
  '**Testing Strategy**',
  '**Existing Tests Broken**',
  '## Required Documentation',
  '### Local files',
  '### Spec files',
  '### External URLs',
  '## Implementation Context',
];

function countSkeletonLiteral(source, value) {
  return source.split(value).length - 1;
}

function assertSkeletonOrder(source, markers, label) {
  let cursor = -1;
  for (const marker of markers) {
    const position = source.indexOf(marker);
    assert.ok(position > cursor,
      `${label} should contain ${marker} after the preceding skeleton marker`);
    cursor = position;
  }
}

test('RED skeleton oracle pins the single-source design artifact contracts', () => {
  const templates = Object.fromEntries(
    DESIGN_SKELETON_TEMPLATES.map(({ id, path: templatePath }) => [id, artifact(templatePath)]),
  );
  const design = templates.design;
  const tasks = templates.tasks;
  const interfaces = templates.interfaces;

  assertSkeletonOrder(design, DESIGN_TOP_LEVEL_SKELETON, 'design.md');

  const targetStateStart = design.indexOf('## Target State');
  const nextTopLevel = design.indexOf('\n## ', targetStateStart + '## Target State'.length);
  const targetState = design.slice(targetStateStart, nextTopLevel === -1 ? undefined : nextTopLevel);
  assertSkeletonOrder(targetState, [
    '### Architecture Snapshot',
    '### File Manifest',
  ], 'design.md ## Target State');
  assert.doesNotMatch(design, /^## Endpoint Map\s*$/m,
    'design.md must not contain an ## Endpoint Map section');

  assert.match(design, /^\*\*Provenance\*\*:\s*(?:<!--.*-->)?\s*$/m,
    'design.md must contain a **Provenance**: marker with an optional inline placeholder');
  assert.match(design, /^\*\*Record family\*\*:\s*(?:<!--.*-->)?\s*$/m,
    'design.md must contain a **Record family**: marker with an optional inline placeholder');

  assertSkeletonOrder(tasks, TASKS_SKELETON_MARKERS, 'tasks.md');

  assert.match(interfaces, /^\*\*Interfaces\*\*/m,
    'interfaces.md must contain the **Interfaces** marker');
  assert.match(interfaces, /^\*\*Test assertions\*\*/m,
    'interfaces.md must contain the **Test assertions** marker');
  assert.match(interfaces, /^## Step (?:N|\d+)(?:\b|\s|:|—|-)/m,
    'interfaces.md must contain a ## Step N heading');

  for (const { id, anchor } of DESIGN_SKELETON_TEMPLATES) {
    const template = templates[id];
    assert.equal(countSkeletonLiteral(template, DESIGN_SKELETON_AUTHORITY), 1,
      `${id}.md must have exactly one shared design-instruction authority path`);
    assert.equal(countSkeletonLiteral(template, anchor), 1,
      `${id}.md must have exactly one ${anchor} generation anchor`);

    for (const forbidden of DESIGN_SKELETON_FORBIDDEN) {
      assert.equal(template.includes(forbidden), false,
        `${id}.md must not retain the forbidden ${forbidden} substring`);
    }
  }

  assert.doesNotMatch(design, /^\s*\|\s*Method\s*\|/m,
    'design.md must not retain an endpoint Method table header');
  assert.doesNotMatch(design, /^\s*\|\s*Path\s*\|/m,
    'design.md must not retain an endpoint Path table header');
});

// ─── Step 5: split architecture snapshot by boundary ───────────────────────

const ARCHITECTURE_BOUNDARY_HEADINGS = [
  '#### External Surfaces',
  '#### Internal Public Surfaces',
];
const ARCHITECTURE_SECTION_HEADINGS = [
  '### Architecture Snapshot',
  '### File Manifest',
];
const WHOLE_INVENTORY_EMPTY_SENTINEL = 'None — no planned public surfaces';
const FILE_MANIFEST_EMPTY_SENTINEL = 'None';

function escapeArchitectureLiteral(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertExternalFirstBoundaryHeadings(source, label) {
  let cursor = source.indexOf('### Architecture Snapshot');
  if (cursor === -1) cursor = source.indexOf('### Snapshot');
  assert.ok(cursor >= 0, `${label} should declare its architecture snapshot heading`);

  const nextSiblingOffset = source.slice(cursor + 4).search(/\n### (?!#)/);
  const nextSibling = nextSiblingOffset === -1 ? -1 : cursor + 4 + nextSiblingOffset;
  const architecture = source.slice(cursor, nextSibling === -1 ? undefined : nextSibling);
  for (const heading of ARCHITECTURE_BOUNDARY_HEADINGS) {
    const position = architecture.indexOf(heading);
    assert.ok(position >= 0,
      `${label} should contain ${heading} after its architecture snapshot heading`);
    assert.ok(position > 0,
      `${label} should nest ${heading} below its architecture snapshot heading`);
    cursor = position;
  }
}

function assertArchitectureEmptinessContract(source, label) {
  const wholeInventory = escapeArchitectureLiteral(WHOLE_INVENTORY_EMPTY_SENTINEL);
  assert.match(source, new RegExp(`(?:whole|entire|shared)[\\s\\-]*inventory[\\s\\S]{0,260}${wholeInventory}|${wholeInventory}[\\s\\S]{0,260}(?:whole|entire|shared)[\\s\\-]*inventory`, 'i'),
    `${label} should define a shared whole-inventory empty form`);
  assert.match(source, /(?:External|external)[\s\S]{0,260}None|None[\s\S]{0,260}(?:External|external)/,
    `${label} should define an external block-specific empty form`);
  assert.match(source, /(?:Internal|internal)[\s\S]{0,260}None|None[\s\S]{0,260}(?:Internal|internal)/,
    `${label} should define an internal block-specific empty form`);
  if (label === 'live design instructions') {
    assert.match(source, new RegExp(`File Manifest[\\s\\S]{0,320}${escapeArchitectureLiteral(FILE_MANIFEST_EMPTY_SENTINEL)}`, 'i'),
      `${label} should keep File Manifest emptiness independently representable`);
    assert.match(source, /(?:independent|separate|own|regardless)[\s\S]{0,180}(?:File Manifest|manifest)|(?:File Manifest|manifest)[\s\S]{0,180}(?:independent|separate|own|regardless)/i,
      `${label} should keep File Manifest None independent of architecture emptiness`);
  }
}

test('Step 5: live design instructions and the overview contract use external-first nested boundary headings', () => {
  for (const [label, relativePath] of [
    ['live design step', 'sai/commands/design/steps/design.md'],
    ['overview contract', 'sai/commands/design/change-overview.md'],
  ]) {
    assertExternalFirstBoundaryHeadings(artifact(relativePath), label);
  }
});

test('Step 5: live design and overview contracts distinguish shared, block-specific, and File Manifest empty forms', () => {
  for (const [label, relativePath] of [
    ['live design step', 'sai/commands/design/steps/design.md'],
    ['overview contract', 'sai/commands/design/change-overview.md'],
  ]) {
    assertArchitectureEmptinessContract(artifact(relativePath), label);
  }
  assert.equal(FILE_MANIFEST_EMPTY_SENTINEL, 'None', 'File Manifest should retain its plain None sentinel literal');
  assert.match(WHOLE_INVENTORY_EMPTY_SENTINEL, /^None\s+[—-]\s+no planned public surfaces$/,
    'the shared whole-inventory sentinel should remain a fixed English literal');
});

test('Step 5: overview generation omits a source-only whole-inventory sentinel but retains one empty boundary block', () => {
  const overview = artifact('sai/commands/design/change-overview.md');

  assert.match(overview,
    new RegExp(`source Architecture Snapshot[\\s\\S]{0,320}${escapeArchitectureLiteral(WHOLE_INVENTORY_EMPTY_SENTINEL)}[\\s\\S]{0,260}(?:omit|suppress|not render)`, 'i'),
    'the overview contract should omit the source-only whole-inventory sentinel');
  assert.match(overview,
    /exactly one boundary is empty[\s\S]{0,320}retain the source-grounded block-specific sentinel[\s\S]{0,320}never replace it with the shared whole-inventory sentence/i,
    'the overview contract should retain a block-specific sentinel when one boundary block is empty');
});

test('Step 5: overview structural boundary headings remain English regardless of overview_language', () => {
  const overview = artifact('sai/commands/design/change-overview.md');

  assert.match(overview, /overview_language/);
  assert.match(overview,
    /(?:nested|boundary|structural)[\s\S]{0,220}heading(?:s| labels?)[\s\S]{0,260}(?:always|remain|stay)[\s\S]{0,120}English|(?:always|remain|stay)[\s\S]{0,120}English[\s\S]{0,260}(?:nested|boundary|structural)[\s\S]{0,220}heading/i,
    'nested boundary headings should remain English');
  assert.match(overview,
    /(?:regardless|independent|irrespective|does not depend)[\s\S]{0,180}overview_language|overview_language[\s\S]{0,180}(?:regardless|independent|irrespective|does not change)/i,
    'overview_language should not translate structural boundary headings');
});

test('Step 5: unclear boundary classification falls back to external and File Manifest is a direct inventory', () => {
  const instructions = artifact('sai/commands/design/steps/design.md');
  assert.match(instructions,
    /unclear[\s\S]{0,220}external|external[\s\S]{0,220}unclear/i,
    'live design instructions should route unclear boundary classification to external');
  assert.match(instructions,
    /(?:direct(?:ly)?|explicit(?:ly)?)[\s\S]{0,240}(?:inventory|File Manifest|source artifacts?|files?|paths?)|(?:inventory|File Manifest|source artifacts?|files?|paths?)[\s\S]{0,240}(?:direct(?:ly)?|explicit(?:ly)?)/i,
    'live design instructions should require a direct source inventory');
});

test('Step 5: design templates keep exactly two Target State siblings, retain their order, and have no nested boundary headings', () => {
  const design = artifact('openspec/schemas/sai-workflow/templates/design.md');
  const targetStateStart = design.indexOf('## Target State');
  const nextTopLevel = design.indexOf('\n## ', targetStateStart + '## Target State'.length);
  const targetState = design.slice(targetStateStart, nextTopLevel === -1 ? undefined : nextTopLevel);
  const headings = (targetState.match(/^### (?!#).+$/gm) || []);

  assert.deepEqual(headings, ARCHITECTURE_SECTION_HEADINGS,
    'design.md should keep exactly the Architecture Snapshot and File Manifest siblings');
  assertSkeletonOrder(targetState, ARCHITECTURE_SECTION_HEADINGS, 'design.md ## Target State');
  assert.doesNotMatch(targetState, /^#### (?:External Surfaces|Internal Public Surfaces)\s*$/m,
    'design.md templates must not embed boundary headings in the Target State skeleton');
  assert.doesNotMatch(design, /^## Endpoint Map\s*$/m,
    'design.md templates must not contain an Endpoint Map section');
});

test('Step 5: schema keeps the pre-change design graph and does not advertise Endpoint Map', () => {
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');
  assert.doesNotMatch(schema, /Endpoint Map/,
    'schema.yaml must not advertise Endpoint Map');

  for (const id of ['design', 'tasks', 'interfaces']) {
    const entry = schemaEntryForContract(schema, id);
    const expected = PRE_CHANGE_DESIGN_GRAPH[id];
    assert.equal(schemaFieldForContract(entry, 'generates'), expected.generates,
      `${id} should preserve its pre-change generated artifact`);
    assert.deepEqual(schemaListForContract(schemaFieldForContract(entry, 'requires')), expected.requires,
      `${id} should preserve its pre-change requirements`);
  }
});
