'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { loadInstallManifest, matrixRenderFor } = require('../bin/install-manifest.js');

const repoRoot = path.join(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const LEGACY = /command-runner|worker-core|bounded-recovery|stop-options|unattended-runtime-recovery/;
const CARD = 'sai/commands/explore/direct-build-coordinator.md';
const PIPELINE = 'sai/commands/explore/steps/pipeline-direct-build.md';

test('the Direct Build card is a goal-driven card on the shared obstacle policy', () => {
  const card = read(CARD);
  for (const heading of ['## Goal', '## Start', '## Run state', '## The run', '## Resume', '## Obstacles', '## Close']) {
    assert.ok(card.includes(heading), `the card has ${heading}`);
  }
  assert.ok(card.includes('Fetch `@sai/policies/obstacle-escalation.md`'));
  assert.match(card, /Obstacles, their budget of 3 attempts, force majeure, and escalation follow `@sai\/policies\/obstacle-escalation\.md`/);
  assert.ok(card.includes('Fetch `@sai/orchestration/workers/bindings/direct-build-worker.md` and use it.'));
  assert.ok(card.includes('Fetch `@sai/orchestration/workers/bindings/backfill-worker.md` and use it'));
  assert.ok(card.includes('Fetch `@sai/orchestration/workers/bindings/archive-worker.md` and use it.'));
  assert.doesNotMatch(card, LEGACY);
  assert.doesNotMatch(card, /Bounded Recovery|Cause Locus|diagnosis_rounds|replacement_reconstruction_fields/);
});

test('E8: the card keeps the user-visible Direct Build contract', () => {
  const card = read(CARD);
  assert.match(card, /pre-authorized exactly two local commits/);
  assert.match(card, /Never push/);
  for (const step of ['1. **Implement**', '2. **Functional fix loop**', '2b. **Suite gate**', '3. **Sibling backfill preparation**',
    '4. **Spec review**', '5. **ADR/DDR pass**', '6. **Backfill execution**', '7. **Archive preparation**',
    '8. **Archive execution and pre-authorized commit**']) {
    assert.ok(card.includes(step), `the card keeps ${step}`);
  }
  assert.match(card, /--direct-build-prepare/);
  assert.match(card, /--direct-build-execute/);
  assert.match(card, /## Resume\n\nOn `\{intent: resume-direct-build\}`/);
  assert.match(card, /The `--no-specs` POC profile is dispatched by the POC lane/);
});

test('E9: a missing or unexportable block stops before dispatch and offers the same recovery choices', () => {
  const card = read(CARD);
  assert.match(card, /`BLOCK_NOT_FOUND` or `BLOCK_EXPORT_FAILED` at an export \(dispatch nothing; the options offer retrying the export and re-emitting the block with `--amend`/);
  for (const file of [PIPELINE, 'sai/commands/explore/steps/pipeline-plan-unattended.md']) {
    const source = read(file);
    assert.match(source, /BLOCK_NOT_FOUND/);
    assert.match(source, /escalate per `@sai\/policies\/obstacle-escalation\.md`/);
    assert.match(source, /retrying the export and re-emitting the block \(`--amend` for one pending or stopped slice\)/);
  }
});

test('I4: the pipeline step keeps the export, the card fetch, its arguments, and what is explore\'s own', () => {
  const pipeline = read(PIPELINE);
  assert.match(pipeline, /Fetch `@sai\/commands\/explore\/direct-build-coordinator\.md` and follow it exactly/);
  assert.match(pipeline, /sai-state block <id> <change-name> --export --harness <claude\|opencode>/);
  assert.match(pipeline, /--block-file <absolute path returned by export>\n {2}--block-hash <sha256 returned by export>/);
  assert.match(pipeline, /Direct Build `--no-specs` profile \(POC\)/);
  assert.match(pipeline, /Successful slice completion transition/);
  assert.doesNotMatch(pipeline, LEGACY);
  assert.doesNotMatch(pipeline, /Fetch `@sai\/orchestration\/workers\/bindings\/(?:backfill|archive)-worker\.md/);
  assert.ok(pipeline.length < read(CARD).length, 'the supervision moved into the card');
});

test('I9: every explore stop point references the obstacle policy', () => {
  for (const file of [PIPELINE, CARD, 'sai/commands/explore/steps/pipeline-plan-unattended.md', 'sai/commands/explore/steps/route-selector.md']) {
    const source = read(file);
    assert.ok(source.includes('@sai/policies/obstacle-escalation.md'), `${file} references the obstacle policy`);
    assert.doesNotMatch(source, /stop-options|bounded-recovery|unattended-runtime-recovery/, `${file} drops the legacy recovery policies`);
  }
  for (const policy of ['stop-options', 'bounded-recovery', 'unattended-runtime-recovery']) {
    assert.equal(fs.existsSync(path.join(repoRoot, `sai/policies/${policy}.md`)), false, `${policy}.md is deleted: nothing references it any more`);
  }
});

test('I8: the direct-build, backfill, and archive workers no longer load worker-core', () => {
  for (const file of ['sai/commands/explore/direct-build-worker.md', 'sai/commands/backfill/worker.md', 'sai/commands/archive/worker.md']) {
    const source = read(file);
    assert.doesNotMatch(source, /worker-core/, `${file} does not load worker-core`);
    assert.ok(source.includes('Fetch `@sai/policies/public-chat.md` and follow it exactly.'));
    assert.match(source, /event: ready\nchanged_files: \[\]/, `${file} carries its own ready handshake`);
  }
  const transport = read('sai/policies/worker-report-transport.md');
  assert.match(transport, /## Direct Build role fields/);
  assert.match(transport, /failure_class: blocking-contradiction\|validation-failed\|generation-error\|dispatch-failed\|envelope-contract-violation\|unclassified-worker-fault/);
  assert.doesNotMatch(transport, /worker-core|unattended-runtime-recovery/);
});

test('I8: sai-direct-build-worker renders from the standalone template on both harnesses', () => {
  const matrix = read('bin/worker-matrix.js');
  assert.doesNotMatch(matrix, /STANDALONE_PHASES|claudeBinding|opencodeBinding/, 'every binding renders from the standalone template, with no routed branch');
  const manifest = loadInstallManifest(repoRoot);
  for (const harness of ['claude', 'opencode']) {
    const binding = matrixRenderFor(manifest, harness, repoRoot)
      .find(item => item.kind === 'binding' && item.phase === 'direct-build');
    assert.ok(binding, `${harness} direct-build binding`);
    assert.match(binding.text, /Create the worker with the ready prompt alone/);
    assert.doesNotMatch(binding.text, /command-runner|replacement_reconstruction_fields|continue_after_|panel-render/);
    assert.match(binding.text, /Fetch `@sai\/commands\/explore\/direct-build-worker\.md` and follow it exactly/);
    assert.match(binding.text, harness === 'claude' ? /SendMessage\(to: "<captured agent ID>"/ : /subagent\(agent: "[^"]+", description: "[^"]+", sessionID: "<captured sessionID>"/);
  }
});

test('E12: standalone archive and backfill keep their gates after leaving worker-core', () => {
  const archive = read('sai/commands/archive/worker.md');
  const backfill = read('sai/commands/backfill/worker.md');
  assert.match(archive, /--direct-build-prepare/);
  assert.match(archive, /--direct-build-execute/);
  assert.match(archive, /status: needs_input[\s\S]*resolved_change_name: string\nquestion: string/);
  assert.match(backfill, /status: needs_input\nsummary: string\nchanged_files: string\[\]\nquestion: string/);
  assert.match(backfill, /Once the user confirms the derived change name, every report also carries\n`resolved_change_name`/);
  assert.match(read('sai/commands/archive/coordinator.md'), /exactly `Archive done\.`/);
  assert.match(read('sai/commands/backfill/coordinator.md'), /Backfill complete in openspec\/changes\/\{name\}\//);
});

test('M1: the archive and direct-build workers keep the question-content rule of needs_input', () => {
  for (const file of ['sai/commands/archive/worker.md', 'sai/commands/explore/direct-build-worker.md', 'sai/commands/backfill/worker.md']) {
    const source = read(file);
    assert.ok(source.includes('@sai/policies/question-context.md'), `${file} names the question-content policy`);
  }
  for (const file of ['sai/commands/archive/worker.md', 'sai/commands/explore/direct-build-worker.md']) {
    assert.match(read(file), /Every `needs_input` question is shaped per `@sai\/policies\/question-context\.md`\nat its source; presentation belongs to the coordinator/, `${file} states the rule`);
  }
});

test('the no-specs route replaces the backfill worker with the compose tool and the generated orders', () => {
  const card = read(CARD);
  const step = number => card.slice(card.indexOf(`\n${number}. **`), card.indexOf('\n', card.indexOf(`\n${number}. **`) + 1));
  // Step 3 chooses the route with the tool, and only the worker route dispatches the backfill worker.
  assert.match(step(3), /`backfill-no-specs\.js`/);
  assert.match(step(3), /`eligible: true` only for a block that declares `\*\*Specs\*\*: none — <reason>` while `openspec\/changes\/\{name\}\/specs\/` holds no file/);
  assert.match(card, /no backfill worker is created or bound, no backfill window opens, and no prepare dispatch happens/);
  assert.match(card, /On the worker route, the backfill window opens/);
  // Step 4 validates the generated drafts without scenario preservation and without a correction round.
  assert.match(card, /with no scenario-preservation check, no review round, and no correction request/);
  assert.match(card, /the `Backfill` route item converges here/);
  // Step 6 sends no order on the no-specs route and generates the worker order with the tool.
  assert.match(step(6), /on the no-specs route there is no backfill worker, so no order goes out and nothing is written here/);
  assert.match(step(6), /order --input-file <path>/);
  assert.match(step(6), /sai\/commands\/backfill\/worker\.md` § Direct Build \(unattended\) execution continuation defines/);
  assert.match(step(6), /References that do not match the worker's latest prepared set produce no order, and that failure is an obstacle of `step-6`/);
  // Steps 7 and 8 carry the drafts to the archive worker, which writes them.
  assert.match(card, /--drafts` marker line and the draft section printed by `node <tool-path> order --target archive/);
  assert.match(card, /both draft destinations are among the order's target paths for the `order_snapshot`/);
  assert.match(card, /a changed fingerprint or a failed materialization stops before archive and commit/);
});

test('the format of the worker-route execute order has one definition, in the backfill worker', () => {
  const card = read(CARD);
  assert.doesNotMatch(card, /change_name: <name>|fingerprint: <accepted validation fingerprint>/);
  assert.match(read('sai/commands/backfill/worker.md'), /generates the order with `validate-backfill-drafts\.js order`/);
});

test('the route projection completes Backfill at draft acceptance on the no-specs route', () => {
  assert.match(read(PIPELINE), /on the no-specs route, which creates no backfill worker, when the coordinator accepts the generated drafts at Step 4/);
  assert.match(read('AGENTS.md'), /`\/sai-direct-build` follows the same card and gains the no-specs route/);
});
