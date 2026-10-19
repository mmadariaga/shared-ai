'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const manifest = require('../sai/install-manifest.json');
const { derivePanelCells, countTaskProgress } = require('../sai/tools/status.js');
const fileManifest = require('../sai/tools/file-manifest.js');

const read = relative => fs.readFileSync(path.join(repoRoot, relative), 'utf8');
const exists = relative => fs.existsSync(path.join(repoRoot, relative));

function walk(directory) {
  return fs.readdirSync(path.join(repoRoot, directory), { withFileTypes: true }).flatMap(entry => {
    const relative = path.posix.join(directory, entry.name);
    return entry.isDirectory() ? walk(relative) : [relative];
  });
}

test('the legacy cards, machines, tool, wrappers, pages, and plan template are gone', () => {
  for (const retired of [
    'sai/commands/meta-build', 'sai/commands/apply', 'sai/commands/meta-review',
    'sai/commands/implement-new', 'sai/commands/review-new', 'sai/commands/build-new',
    'sai/commands/implement/worker.md', 'sai/commands/implement/steps/plan-generation.md',
    'sai/commands/implement/implementation-plan.template.md', 'sai/commands/review/command-bootstrap.md',
    'sai/commands/deep-review/direct-build-close.md', 'sai/commands/deep-review/review-fix-worker.md',
    'sai-state/machines/apply-standalone.js', 'sai-state/machines/implement-standalone.js',
    'sai-state/machines/review-standalone.js', 'sai-state/machines/red-new-steps.js',
    'sai/tools/apply-step.js', 'openspec/schemas/sai-workflow/templates/implementation.md',
  ]) {
    assert.equal(exists(retired), false, `${retired} must be absent`);
  }
  for (const harness of ['claude', 'opencode']) {
    for (const wrapper of ['sai-4-apply', 'sai-5-review', 'sai-review', 'sai-build-new', 'sai-3-implement-new', 'sai-4-review-new']) {
      assert.equal(exists(`commands/${harness}/${wrapper}.md`), false, `${harness}/${wrapper}.md must be absent`);
    }
    for (const wrapper of ['sai-build', 'sai-3-implement', 'sai-4-review', 'sai-deep-review']) {
      assert.ok(exists(`commands/${harness}/${wrapper}.md`), `${harness}/${wrapper}.md must exist`);
    }
  }
  for (const page of ['sai-4-apply', 'sai-5-review', 'sai-review', 'sai-build-new', 'sai-3-implement-new', 'sai-4-review-new']) {
    assert.equal(exists(`docs/commands/${page}.md`), false, `docs/commands/${page}.md must be absent`);
  }
  for (const page of ['sai-build', 'sai-3-implement', 'sai-4-review', 'sai-deep-review']) {
    assert.ok(exists(`docs/commands/${page}.md`), `docs/commands/${page}.md must exist`);
  }
});

test('the files shared with surviving commands stay in the promoted directories', () => {
  for (const kept of [
    'sai/commands/review/review-report.template.md', 'sai/commands/review/options.md',
    'sai/commands/implement/coordinator.md', 'sai/commands/implement/red-worker.md',
    'sai/commands/implement/green-worker.md', 'sai/commands/implement/worker-common.md',
    'sai/commands/review/coordinator.md', 'sai/commands/review/worker.md',
    'sai/commands/build/coordinator.md', 'sai/commands/deep-review/coordinator.md',
    'sai/commands/deep-review/command-bootstrap.md', 'sai/commands/deep-review/findings-selection.md',
    'sai-state/machines/implement-run.js', 'sai-state/machines/red-steps.js',
    'sai-state/machines/green-steps.js', 'sai-state/machines/review-steps.js',
  ]) {
    assert.ok(exists(kept), `${kept} must exist`);
  }
});

test('no file, worker, machine, or session key keeps the -new suffix', () => {
  const sources = [
    ...walk('sai'), ...walk('sai-state'), ...walk('commands'), ...walk('docs/commands'), ...walk('bin'),
  ];
  for (const file of sources) {
    assert.doesNotMatch(path.posix.basename(file), /-new\b/, `${file} keeps the -new suffix`);
    if (!/\.(?:md|js|json)$/.test(file) || file === 'sai/install-manifest.json'
      || file === 'bin/orchestration-source-audit.js') continue;
    const text = read(file);
    assert.doesNotMatch(text, /sai-(?:red|green|review)-new-worker|(?:red|green|review)-new-steps|implement-new-run|\bimplement-new\b|\breview-new\b|\bbuild-new\b/,
      `${file} keeps a -new identity`);
  }
  assert.match(read('sai/commands/implement/coordinator.md'), /key: `implement-\{name\}`/);
  assert.match(read('sai/commands/review/coordinator.md'), /key: `review-\{name\}`/);
});

test('the manifest retires every removed or renamed wrapper and agent for both harnesses with hash evidence', () => {
  const expected = [];
  for (const wrapper of ['sai-4-apply', 'sai-5-review', 'sai-review', 'sai-build-new', 'sai-3-implement-new', 'sai-4-review-new']) {
    expected.push({ cls: 'commands', path: `${wrapper}.md` });
  }
  for (const worker of [
    'sai-3-implementation-worker', 'sai-4-red-worker', 'sai-4-green-worker', 'sai-5-review-worker',
    'sai-review-fix-worker', 'sai-red-new-worker', 'sai-green-new-worker', 'sai-review-new-worker',
  ]) {
    expected.push({ cls: 'agents', path: `${worker}.md` });
  }
  for (const harness of ['claude', 'opencode']) {
    for (const { cls, path: retiredPath } of expected) {
      const record = manifest.retirements.find(candidate => candidate.destination.class === cls
        && candidate.destination.path === retiredPath && candidate.harnesses.includes(harness));
      assert.ok(record, `${harness} must retire ${cls}/${retiredPath}`);
      assert.ok(record.managedHashes.length > 0 && record.managedHashes.every(hash => /^[0-9a-f]{64}$/.test(hash)),
        `${record.id} needs lowercase SHA-256 managed hashes`);
    }
  }
  const active = new Set(manifest.projections.map(projection => `${projection.destination.class}/${projection.destination.path}`));
  assert.equal(active.has('commands/sai-build.md') || manifest['worker-matrix'].entries.length > 0, true);
  assert.deepEqual(manifest['worker-matrix'].entries.map(entry => entry.workerName).slice(-4),
    ['sai-direct-build-worker', 'sai-3-red-worker', 'sai-3-green-worker', 'sai-4-review-worker']);
});

test('the sai-workflow schema no longer carries implementation.md', () => {
  const schema = read('openspec/schemas/sai-workflow/schema.yaml');
  assert.doesNotMatch(schema, /id: implementation\b/);
  assert.doesNotMatch(schema, /implementation\.md/);
  assert.match(schema, /^apply:\n\s+requires: \[tasks\]\n\s+tracks: tasks\.md/m);
  for (const audit of ['review', 'security', 'performance', 'accessibility']) {
    const entry = schema.slice(schema.indexOf(`  - id: ${audit}\n`)).split(/\n  - id: |\napply:/)[0];
    assert.match(entry, /requires: \[\]/, `${audit} no longer requires implementation`);
  }
  assert.match(schema, /^description: .*interfaces → review → audits$/m);
});

test('sai-status routes by the checked tasks of tasks.md and never reads implementation.md', () => {
  const statuses = Object.fromEntries(['proposal', 'specs', 'design', 'tasks', 'interfaces', 'change-overview']
    .map(name => [name, { present: true }]));
  Object.assign(statuses, Object.fromEntries(['review', 'security', 'performance', 'accessibility']
    .map(name => [name, { present: false }])));
  const yaml = { approval_specs_approved_at: '2024-01-01', overview_state: 'current' };
  const flags = { review: false, security: false, performance: false, accessibility: false };
  assert.equal(derivePanelCells(statuses, yaml, flags, '1/3').next, '/sai-3-implement');
  assert.equal(derivePanelCells(statuses, yaml, flags, '3/3').next, '/sai-4-review');
  const status = read('sai/tools/status.js');
  assert.doesNotMatch(status, /implementation/);
});

test('sai-archive and file-manifest no longer depend on implementation.md or apply-step.js', () => {
  assert.doesNotMatch(read('sai/commands/archive/instructions.md'), /implementation/);
  assert.doesNotMatch(read('sai/tools/file-manifest.js'), /apply-step/);
  assert.deepEqual(fileManifest.parseDeclaration('M x/a.md — note'), { token: 'M', path: 'x/a.md' });
  assert.equal(fileManifest.declarationsOverlap(
    { directory: 'g', family: 'a*.sql' }, { directory: 'g', family: 'ab*.sql' }), true);
});

test('the deep review reviews, audits, selects, and fixes through the implement segment', () => {
  const coordinator = read('sai/commands/deep-review/coordinator.md');
  const bootstrap = read('sai/commands/deep-review/command-bootstrap.md');
  assert.match(coordinator, /Fetch `@sai\/commands\/review\/coordinator\.md`\s+and follow it exactly as the review segment/);
  assert.match(coordinator, /Fetch @sai\/commands\/implement\/coordinator\.md and follow it\s+exactly as the fix segment/);
  assert.match(coordinator, /Fetch @sai\/commands\/deep-review\/findings-selection\.md/);
  assert.match(coordinator, /commits `review\.md` once through the review segment, then once per fix\s+step/);
  assert.match(coordinator, /even with `--full` or `--path`/);
  assert.match(coordinator, /`no-changes`/);
  assert.match(coordinator, /Cannot start \/sai-3-implement for \{name\}: missing \{list of the absent items\}\./);
  assert.match(coordinator, /start no fix segment, write no mark, make no commit/);
  assert.match(coordinator, /` \(EXCLUDED: not selected in the \/sai-deep-review round\)`/);
  assert.match(coordinator, /Never\s+mark a Question, answered or not/);
  assert.match(coordinator, /Composition reports/);
  assert.match(coordinator, /@sai\/commands\/review\/options\.md/);
  assert.doesNotMatch(coordinator, /direct-build-close|review-fix-worker|sai-5-review-worker/);
  assert.match(bootstrap, /position 4 — fix segment/);
  assert.match(read('sai/commands/implement/coordinator.md'), /\*\*Composition reports\.\*\*/);
  assert.match(read('sai/commands/review/coordinator.md'), /Inside `\/sai-build` and `\/sai-deep-review` the line of that command replaces this one/);
  const finding = read('sai/policies/finding-state.md');
  assert.doesNotMatch(finding, /does not honor the mark/);
  assert.match(finding, /skips it, standalone or inside `\/sai-build` or `\/sai-deep-review`/);
});

test('Direct Build inlines its terminal suite gate and cites no apply command', () => {
  const direct = read('sai/commands/explore/steps/pipeline-direct-build.md');
  assert.doesNotMatch(direct, /\/sai-4-apply|apply\/steps/);
  assert.match(direct, /stop the route at the terminal suite gate: the command and the failure are reported, nothing after the gate is run or marked/);
  assert.match(direct, /a retry runs the suite gate afresh/);
});

test('no surviving prose names a retired command and the numbered audits are continuous', () => {
  const scanned = [
    'AGENTS.md', 'README.md', 'GLOSSARY.md',
    ...walk('sai').filter(file => file.endsWith('.md') && file !== 'sai/install-manifest.json'),
    ...walk('docs').filter(file => /^docs\/[^/]+\.md$/.test(file) || file.startsWith('docs/commands/')),
    ...walk('commands'), ...walk('skills/universal'),
  ];
  for (const file of scanned) {
    assert.doesNotMatch(read(file), /\/sai-5-review|\/sai-4-apply|\/sai-review\b/, `${file} names a retired command`);
  }
  for (const wrapper of ['sai-5-security', 'sai-6-performance', 'sai-7-accessibility']) {
    assert.ok(exists(`commands/claude/${wrapper}.md`), `${wrapper} closes the numbering gap`);
  }
  assert.equal(exists('commands/claude/sai-6-security.md'), false);
});

test('archived changes and ADR/DDR records stay unedited by the renaming', () => {
  const index = read('docs/adr/0000-INDEX.md');
  assert.match(index, /0195-review-new-is-a-review-only-command-of-the-new-family\.md/);
  assert.match(index, /0198-build-new-selects-and-fixes-findings-after-its-review\.md/);
  assert.ok(exists('docs/adr/0195-review-new-is-a-review-only-command-of-the-new-family.md'));
});

test('tasks.md is the progress tracker: design writes a checkbox per step and status routes on it', () => {
  const card = read('sai/commands/design/steps/tasks.md');
  assert.doesNotMatch(card, /Do NOT use checkbox markers|not a progress tracker/);
  assert.match(card, /`tasks\.md` is the progress tracker of the change/);
  assert.match(card, /exactly one unchecked checkbox line, `- \[ \] Step N: <title>`/);
  assert.match(card, /## Step N: <title>\n\n    - \[ \] Step N: <title>\n\n    \*\*Routing\*\*/);
  const template = read('openspec/schemas/sai-workflow/templates/tasks.md');
  assert.match(template, /^## Step 1: <!-- Title -->\n\n- \[ \] Step 1: <!-- Title -->\n/);

  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-tasks-'));
  try {
    const file = path.join(dir, 'tasks.md');
    const body = box => `## Step 1: First\n\n- [${box}] Step 1: First\n\n**Routing**: category=backend\n\n`
      + `**Files Affected**:\n- A src/a.js\n\n## Step 2: Second\n\n- [${box}] Step 2: Second\n\n**Files Affected**:\n- A src/b.js\n`;
    fs.writeFileSync(file, body(' '));
    assert.equal(countTaskProgress(file), '0/2');
    fs.writeFileSync(file, body('x'));
    assert.equal(countTaskProgress(file), '2/2');
    const statuses = Object.fromEntries(['proposal', 'specs', 'design', 'tasks', 'interfaces', 'change-overview']
      .map(name => [name, { present: true }]));
    Object.assign(statuses, Object.fromEntries(['review', 'security', 'performance', 'accessibility']
      .map(name => [name, { present: false }])));
    const yaml = { approval_specs_approved_at: '2024-01-01', overview_state: 'current' };
    const flags = { review: false, security: false, performance: false, accessibility: false };
    assert.equal(derivePanelCells(statuses, yaml, flags, countTaskProgress(file)).next, '/sai-4-review');
    fs.writeFileSync(file, body(' '));
    assert.equal(derivePanelCells(statuses, yaml, flags, countTaskProgress(file)).next, '/sai-3-implement');
    // the checkbox line never reaches the File Manifest fold
    const { extractEntries } = fileManifest;
    if (typeof extractEntries === 'function') {
      assert.deepEqual(extractEntries(body('x')).entries.map(entry => entry.path), ['src/a.js', 'src/b.js']);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('no surviving prose cites the deleted apply cards', () => {
  assert.doesNotMatch(read('sai/orchestration/worker-core.md'), /commands\/apply\//);
  const guard = read('sai/policies/no-commit-guard.md');
  assert.doesNotMatch(guard, /commands\/apply\/|bounded exception|apply commit gate|apply's RED/);
  assert.match(guard, /Pre-existing staged content loses its staged state on remediation; the\s+content stays intact\. The HEAD guard performs the mixed reset, and its next\s+window requires a fresh snapshot\./);
});
