'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const exists = relativePath => fs.existsSync(path.join(repoRoot, relativePath));
const AUDITS = ['security', 'performance', 'accessibility'];

test('the deep-review coordinator loads only the cross-cutting policies and none of the shared orchestration', () => {
  const coordinator = read('sai/commands/deep-review/coordinator.md');
  const head = coordinator.slice(0, coordinator.indexOf('## Goal'));
  const fetched = [...head.matchAll(/^Fetch @(\S+)/gm)].map(match => match[1]);
  assert.deepEqual(fetched, [
    'sai/policies/public-chat.md',
    'sai/policies/remember.md',
    'skills/safe-operations/SKILL.md',
    'sai/policies/tool-resolution.md',
    'sai/policies/finding-state.md',
  ]);
  for (const forbidden of ['command-runner', 'worker-core', 'bounded-recovery', 'stop-options', 'unattended-runtime-recovery', 'no-commit-guard', 'bounded-dispatch-retry', 'composition', 'findings-selection']) {
    assert.doesNotMatch(coordinator, new RegExp(forbidden), `the deep-review coordinator must not mention ${forbidden}`);
  }
});

test('the deep-review coordinator runs the segments in the shape of /sai-build, in order', () => {
  const coordinator = read('sai/commands/deep-review/coordinator.md');
  const review = coordinator.indexOf('Fetch @sai/commands/review/coordinator.md');
  const triage = coordinator.indexOf('## Triage');
  const url = coordinator.indexOf('**Accessibility URL.**');
  const batch = coordinator.indexOf('**Parallel cycles.**');
  const assessment = coordinator.indexOf('### Assessment pass');
  const fix = coordinator.indexOf('### Fix segment');
  assert.ok(review !== -1 && review < triage && triage < url && url < batch && batch < assessment && assessment < fix);
  assert.match(coordinator, /[Ff]ollow `sai\/commands\/implement\/coordinator\.md` exactly as segment 5/);
  assert.match(coordinator, /Composition reports/);
  assert.match(coordinator, /Fetch @sai\/commands\/audit\/coordinator\.md/);
  assert.match(coordinator, /several `Agent` calls in one turn on Claude Code, several `task` calls on opencode/);
  assert.match(coordinator, /in the fixed order security, performance, accessibility/);
  assert.match(coordinator, /Only the `\/sai-3-implement` fix segment changes code/);
  assert.doesNotMatch(coordinator, /^\|.*\|$/m, 'no table rows');
});

test('E10: triage values other than exactly Yes or No keep the audit out, and a missing review closes with the error', () => {
  const coordinator = read('sai/commands/deep-review/coordinator.md');
  assert.match(coordinator, /A value of exactly `Yes` activates the matching audit\. A value of exactly `No` leaves it inactive\. Any other value is illegible/);
  assert.match(coordinator, /Warnings\*\*: one line for each triage value that was illegible/);
  assert.match(coordinator, /When `review\.md` is missing, or none of the three values is legible, run no audit, no Assessment pass, and no fix segment/);
  assert.match(coordinator, /With `--full` or `--path`, no triage runs: all three audits are activated/);
});

test('E11: a failed audit or an exhausted budget does not close the run and its findings stay out of the assessment', () => {
  const coordinator = read('sai/commands/deep-review/coordinator.md');
  assert.match(coordinator, /does not close the run and does not escalate\. Record that audit as `failed`/);
  assert.match(coordinator, /The other audits finish/);
  assert.match(coordinator, /A failed audit's findings never enter the Assessment pass/);
  assert.match(coordinator, /When nothing answers it and the answer would change the report, put it to the user through the native picker/);
  assert.match(coordinator, /Only that audit's cycle waits for the answer: keep driving the other cycles meanwhile/);
  assert.match(coordinator, /A question whose answer would not change the report is answered with your best reading and kept as an assumption/);
  assert.doesNotMatch(coordinator, /never put to the user/);
});

test('E12 and E13: the assessment marks or leaves each unmarked fixable finding, and the startable check comes first', () => {
  const coordinator = read('sai/commands/deep-review/coordinator.md');
  assert.match(coordinator, /Judge each fixable finding that carries no ` \(EXCLUDED: …\)` mark on its own: leave it to fix or exclude it/);
  assert.match(coordinator, /Never mark a Question\. Questions stay open for the user/);
  assert.match(coordinator, /Start the fix segment only when that count is above zero/);
  assert.match(coordinator, /Cannot start \/sai-3-implement for \{name\}: missing \{list of the absent items\}\./);
  assert.ok(coordinator.indexOf('**Startable check.**') < coordinator.indexOf('### Assessment pass'));
  assert.match(coordinator, /The assessment keeps no memory/);
});

test('E14: a rerun regenerates the review and the activated audit reports; only the fix segment resumes', () => {
  const coordinator = read('sai/commands/deep-review/coordinator.md');
  const reentry = coordinator.slice(coordinator.indexOf('## Re-entry'));
  assert.match(reentry, /regenerates `review\.md` and the activated audit reports and runs the Assessment pass again/);
  assert.match(reentry, /Only the fix segment resumes, through the Resuming rule of `\/sai-3-implement`/);
});

test('E18: reports are committed one at a time with only their own path, and sai-state calls run one after another', () => {
  const coordinator = read('sai/commands/deep-review/coordinator.md');
  assert.match(coordinator, /issue every `sai-state` call and every commit one at a time/);
  assert.match(coordinator, /commit each verified report alone, with only its own path/);
  assert.match(coordinator, /commit that report alone under the Commit rule of `sai\/commands\/review\/coordinator\.md` § Close/);
  assert.match(coordinator, /Never force-add with `-f`, never push/);
  assert.match(coordinator, /key `\{audit\}-\{name\}`/);
});

test('the accessibility URL is asked once, before the audit batch, and the audit cycles skip their own URL question', () => {
  const coordinator = read('sai/commands/deep-review/coordinator.md');
  assert.match(coordinator, /ask the user for the dev-server URL now, before any audit worker exists/);
  assert.match(coordinator, /only a worker question that nothing answers and whose answer would change a report can reach the user, and it pauses only its own audit/);
  assert.match(coordinator, /which this command has already done/);
});

test('E16: the retired surfaces are gone while the shared surfaces another loader uses stay', () => {
  for (const retired of [
    'sai/orchestration/composition.md', 'sai/orchestration/command-runner.md', 'sai/orchestration/worker-core.md',
    'sai/policies/stop-options.md', 'sai/policies/bounded-recovery.md', 'sai/policies/unattended-runtime-recovery.md',
    'sai/commands/deep-review/command-bootstrap.md',
    'sai/commands/deep-review/findings-selection.md',
    ...AUDITS.flatMap(audit => [`sai/commands/${audit}/coordinator.md`, `sai/commands/${audit}/command-bootstrap.md`, `sai-state/machines/${audit}-standalone.js`]),
  ]) {
    assert.equal(exists(retired), false, `${retired} must be retired`);
  }
  for (const kept of [
    'sai/policies/no-commit-guard.md', 'sai/policies/bounded-dispatch-retry.md', 'sai/policies/obstacle-escalation.md',
    'sai/commands/audit/coordinator.md',
    ...AUDITS.flatMap(audit => [`sai/commands/${audit}/options.md`, `sai/commands/${audit}/worker.md`, `sai-state/machines/${audit}-steps.js`]),
  ]) {
    assert.equal(exists(kept), true, `${kept} must stay`);
  }
  const registry = read('sai-state/registry.js');
  for (const audit of AUDITS) {
    assert.doesNotMatch(registry, new RegExp(`${audit}-standalone`));
    assert.match(registry, new RegExp(`${audit}-steps@1`));
  }
});

test('the install manifest retires each removed file and no longer projects composition.md', () => {
  const manifest = JSON.parse(read('sai/install-manifest.json'));
  const projected = JSON.stringify(manifest.projections || manifest);
  assert.doesNotMatch(projected.replace(/"retirements".*/s, ''), /sai\/orchestration\/composition\.md/);
  const retired = manifest.retirements.filter(entry => /^retired-deep-review-unattended-/.test(entry.id));
  assert.deepEqual(retired.map(entry => entry.destination.path).sort(), [
    'commands/accessibility/command-bootstrap.md',
    'commands/accessibility/coordinator.md',
    'commands/deep-review/command-bootstrap.md',
    'commands/deep-review/findings-selection.md',
    'commands/performance/command-bootstrap.md',
    'commands/performance/coordinator.md',
    'commands/security/command-bootstrap.md',
    'commands/security/coordinator.md',
    'orchestration/composition.md',
    'sai-state/machines/accessibility-standalone.js',
    'sai-state/machines/performance-standalone.js',
    'sai-state/machines/security-standalone.js',
  ]);
  for (const entry of retired) {
    assert.ok(entry.managedHashes.length > 0 && entry.managedHashes.every(hash => /^[0-9a-f]{64}$/.test(hash)), entry.id);
    assert.deepEqual(entry.harnesses, ['claude', 'opencode']);
    assert.equal(entry.destination.class, 'sai');
  }
});

test('the ADR records the retirement and supersedes ADR 0187, and the docs describe the unattended command', () => {
  const adr = read('docs/adr/0200-audits-and-deep-review-leave-the-shared-orchestration.md');
  assert.match(adr, /<!-- adr-index: supersedes 0187;/);
  assert.match(adr, /ADR 0107b stays in force unchanged/);
  assert.match(read('docs/adr/0000-INDEX.md'), /0200-audits-and-deep-review-leave-the-shared-orchestration\.md/);
  const page = read('docs/commands/sai-deep-review.md');
  assert.match(page, /Assessment pass/);
  assert.match(page, /Deep review done\./);
  assert.doesNotMatch(page, /findings round|selection round/);
  const agents = read('AGENTS.md');
  assert.doesNotMatch(agents, /sai\/orchestration\/composition\.md`\s*\|/);
  assert.doesNotMatch(agents, /Transitional state/);
  for (const audit of AUDITS) {
    assert.match(read(`docs/commands/${{ security: 'sai-5-security', performance: 'sai-6-performance', accessibility: 'sai-7-accessibility' }[audit]}.md`), /\/sai-deep-review/);
  }
});
