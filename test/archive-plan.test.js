'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TOOL = path.join(__dirname, '..', 'sai', 'tools', 'archive-plan.js');
const { parseMetadata, parseDelta, emptiesCapability, closingLineOf } = require(TOOL);

const HAS_OPENSPEC = !spawnSync('openspec', ['--version'], { encoding: 'utf8' }).error;
const fixture = (name, body) => test(name, { skip: HAS_OPENSPEC ? false : 'the openspec binary is absent' }, body);

const PURPOSE = 'Purpose text that is long enough for the OpenSpec validator to accept the section.';
const mainSpec = (title, requirements, extra = '') => `# ${title} Specification

## Purpose
${PURPOSE}

## Requirements

${requirements}${extra}`;
const REQ_OLD = `### Requirement: Old thing
The system SHALL do the old thing.

#### Scenario: Old works
- **WHEN** the old trigger happens
- **THEN** the old result follows
`;
const MAIN_ALPHA = mainSpec('alpha', REQ_OLD);
const DELTA_ADD = `## ADDED Requirements

### Requirement: New thing
The system SHALL do the new thing.

#### Scenario: New works
- **WHEN** the new trigger happens
- **THEN** the new result follows
`;
const DELTA_REMOVE_ALL = `## REMOVED Requirements

### Requirement: Old thing
**Reason**: no longer needed
**Migration**: none
`;
const PROPOSAL = '# Proposal\n\n## Why\nBecause the change needs a reason that is long enough to validate.\n\n## What Changes\n- something\n';
const META = 'schema: spec-driven\ncreated: 2026-01-01\n';

function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}

function put(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** A temporary git project holding the given files, committed. `change` adds the standard change files. */
function project(t, { files = {}, ignore = null, change = 'demo', delta = DELTA_ADD, capability = 'alpha', meta = META, main = MAIN_ALPHA, extra = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-archive-plan-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, ['init', '-q']);
  git(root, ['config', 'user.email', 'test@example.com']);
  git(root, ['config', 'user.name', 'Test']);
  if (main !== null) put(root, `openspec/specs/${capability}/spec.md`, main);
  if (change) {
    if (delta !== null) put(root, `openspec/changes/${change}/specs/${capability}/spec.md`, delta);
    if (meta !== null) put(root, `openspec/changes/${change}/.openspec.yaml`, meta);
    put(root, `openspec/changes/${change}/proposal.md`, PROPOSAL);
    put(root, `openspec/changes/${change}/design.md`, '## Context\nx\n');
    put(root, `openspec/changes/${change}/tasks.md`, '- [x] 1.1 done\n');
  }
  for (const [relative, content] of Object.entries({ ...files, ...extra })) put(root, relative, content);
  if (ignore) put(root, '.gitignore', ignore);
  git(root, ['add', '-A']);
  git(root, ['commit', '-q', '-m', 'init']);
  return root;
}

/** A file outside the project, so it never shows up as a change of the repository. */
function outside(t, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-archive-input-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'paths.txt');
  fs.writeFileSync(file, content);
  return file;
}

function plan(root, name = 'demo', args = []) {
  const result = spawnSync(process.execPath, [TOOL, 'plan', name, '--json', '--cwd', root, ...args], { encoding: 'utf8' });
  return { status: result.status, json: JSON.parse(result.stdout), stderr: result.stderr };
}

function archive(root, name = 'demo') {
  const result = spawnSync('openspec', ['archive', name, '--yes', '--json'], { cwd: root, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** After the CLI ran: the staging allowlist of the plan stages everything git sees, and only what the plan owns. */
function assertPlanMatchesGit(root, result) {
  const planJson = result.json;
  assert.equal(planJson.ok, true);
  const add = spawnSync('git', ['add', '-A', '--', ...planJson.owned_staging_paths], { cwd: root, encoding: 'utf8' });
  assert.equal(add.status, 0, `git add of the owned paths failed: ${add.stderr}`);
  const status = git(root, ['status', '--porcelain', '-uall']).split('\n').filter(Boolean);
  const loose = status.filter((line) => line.startsWith('??') || line[1] !== ' ');
  assert.deepEqual(loose, [], 'every change git sees is owned by the plan');
  const owned = new Set([...planJson.owned_staging_paths, ...planJson.already_staged_deletions]);
  for (const name of git(root, ['diff', '--cached', '--name-only', '--no-renames']).split('\n').filter(Boolean)) {
    assert.ok(owned.has(name), `staged path ${name} is owned by the plan`);
  }
  for (const target of planJson.omitted_ignored_paths) {
    assert.equal(spawnSync('git', ['check-ignore', '--quiet', '--', target], { cwd: root }).status, 0, `${target} is ignored`);
  }
}

test('the tool prints one JSON object and uses exit 2 for usage errors', () => {
  const usage = spawnSync(process.execPath, [TOOL, 'plan'], { encoding: 'utf8' });
  assert.equal(usage.status, 2);
  assert.equal(JSON.parse(usage.stdout).ok, false);
  assert.equal(spawnSync(process.execPath, [TOOL, 'nope'], { encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync(process.execPath, [TOOL, 'plan', 'demo', '--bogus'], { encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync(process.execPath, [TOOL, '--help'], { encoding: 'utf8' }).status, 0);
});

test('I4: the metadata reader accepts the SAI shapes and refuses every other shape', () => {
  const parsed = parseMetadata('# note\nschema: sai-workflow\ncreated: 2026-01-01\nbackfilled: true\napproval:\n  specs:\n    approved_at: 2026-01-01T10:00:00Z\n    notes: ""\nexplore_origin: [a, "b"]\nbacklog_origin: https://github.com/o/r/issues/5 # c\nretire_capabilities: yes\n');
  assert.equal(parsed.backfilled, true);
  assert.equal(parsed.approval.specs.notes, '');
  assert.deepEqual(parsed.explore_origin, ['a', 'b']);
  assert.equal(parsed.backlog_origin, 'https://github.com/o/r/issues/5');
  assert.equal(parsed.retire_capabilities, 'yes');
  for (const bad of ['a: [x\n', '- x\n', 'a: &x 1\n', 'a: 1\na: 2\n', '\ta: 1\n', ' a: 1\n', 'a: b: c\n', 'a: |\n  x\n', '---\na: 1\n']) {
    assert.throws(() => parseMetadata(bad), undefined, JSON.stringify(bad));
  }
});

test('the delta reader names requirements per section and retirement needs an emptied requirement set', () => {
  const delta = parseDelta(`## ADDED Requirements\n### Requirement: A\n\n## REMOVED Requirements\n### Requirement: B\n- \`### Requirement: C\`\n\n## RENAMED Requirements\n- FROM: \`### Requirement: D\`\n- TO: \`### Requirement: E\`\n\n\`\`\`\n### Requirement: fenced\n\`\`\`\n`);
  assert.deepEqual(delta.added, ['A']);
  assert.deepEqual(delta.removed, ['B', 'C']);
  assert.deepEqual(delta.renamed, [{ from: 'D', to: 'E' }]);
  assert.equal(emptiesCapability(['B', 'C'], delta), false, 'an ADDED requirement keeps the capability');
  assert.equal(emptiesCapability(['B', 'C'], { added: [], modified: [], removed: ['B', 'C'], renamed: [] }), true);
  assert.equal(emptiesCapability(['B', 'C'], { added: [], modified: [], removed: ['B'], renamed: [] }), false);
  assert.equal(emptiesCapability([], { added: [], modified: [], removed: [], renamed: [] }), false);
});

test('the closing line comes from the shape of the origin URL, with no API call', () => {
  assert.equal(closingLineOf('https://github.com/owner/repo/issues/12').line, 'Closes owner/repo#12');
  assert.equal(closingLineOf('https://gitlab.com/group/sub/project/-/issues/7').line, 'Closes group/sub/project#7');
  assert.equal(closingLineOf('https://gitlab.com/group/project/-/work_items/8').line, 'Closes group/project#8');
  assert.equal(closingLineOf('https://dev.azure.com/org/proj/_workitems/edit/3').line, null);
  assert.equal(closingLineOf('https://dev.azure.com/org/proj/_workitems/edit/3').warning, null);
  assert.equal(closingLineOf('not a url').line, null);
  assert.ok(closingLineOf('not a url').warning);
});

fixture('E1: a normal archive gets the destination, the specs, the commit paths, and the omitted paths git and the CLI produce', (t) => {
  const root = project(t, { ignore: 'ignored.log\n' });
  put(root, 'src/app.js', 'one\n');
  git(root, ['add', '-A']);
  git(root, ['commit', '-q', '-m', 'app']);
  put(root, 'src/app.js', 'two\n');
  put(root, 'src/new.js', 'new\n');
  put(root, 'ignored.log', 'x\n');
  const paths = outside(t, 'src/app.js\nsrc/new.js\nignored.log\n');
  const result = plan(root, 'demo', ['--implementer-paths-file', paths]);
  assert.equal(result.status, 0);
  const archived = `openspec/changes/archive/${today()}-demo`;
  assert.equal(result.json.archive_destination, archived);
  assert.deepEqual(result.json.affected_main_specs, ['openspec/specs/alpha/spec.md']);
  assert.deepEqual(result.json.omitted_ignored_paths, ['ignored.log']);
  assert.ok(result.json.owned_staging_paths.includes('src/app.js'));
  assert.ok(result.json.owned_staging_paths.includes('src/new.js'));
  assert.ok(result.json.owned_staging_paths.includes(`${archived}/specs/alpha/spec.md`));
  assert.ok(result.json.owned_staging_paths.includes('openspec/changes/demo/tasks.md'), 'the tracked originals are removed by the move');
  assert.deepEqual(result.json.retired_capabilities, []);
  assert.deepEqual(result.json.delta_sync, [{ capability: 'alpha', status: 'update', main_spec: 'openspec/specs/alpha/spec.md' }]);
  assert.match(result.json.plan_fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(plan(root, 'demo', ['--implementer-paths-file', paths]).json.plan_fingerprint, result.json.plan_fingerprint);
  const cli = archive(root);
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).archive.archivedAs, `${today()}-demo`);
  assertPlanMatchesGit(root, result);
});

fixture('a capability that has no main spec is an addition and its main spec is created', (t) => {
  const root = project(t, { capability: 'beta', main: null });
  const result = plan(root);
  assert.equal(result.status, 0);
  assert.deepEqual(result.json.delta_sync, [{ capability: 'beta', status: 'add', main_spec: 'openspec/specs/beta/spec.md' }]);
  assert.ok(result.json.report_lines.includes('[ADD] beta'));
  assert.equal(archive(root).status, 0);
  assertPlanMatchesGit(root, result);
});

fixture('a nested capability id keeps its path', (t) => {
  const root = project(t, { capability: 'area/gamma', main: mainSpec('gamma', REQ_OLD) });
  const result = plan(root);
  assert.deepEqual(result.json.affected_main_specs, ['openspec/specs/area/gamma/spec.md']);
  assert.equal(archive(root).status, 0);
  assertPlanMatchesGit(root, result);
});

fixture('a date-prefixed change name keeps its prefix', (t) => {
  const root = project(t, { change: '2026-01-02-dated' });
  const result = plan(root, '2026-01-02-dated');
  assert.equal(result.json.archive_destination, 'openspec/changes/archive/2026-01-02-dated');
  assert.equal(archive(root, '2026-01-02-dated').status, 0);
  assertPlanMatchesGit(root, result);
});

fixture('E2: an existing destination refuses the plan before any order, as the CLI refuses it', (t) => {
  const root = project(t);
  put(root, `openspec/changes/archive/${today()}-demo/old.md`, 'x\n');
  git(root, ['add', '-A', '-f']);
  git(root, ['commit', '-q', '-m', 'old archive']);
  const result = plan(root);
  assert.equal(result.status, 1);
  assert.equal(result.json.ok, false);
  assert.equal(result.json.reason, 'collision');
  const cli = archive(root);
  assert.notEqual(cli.status, 0);
  assert.match(cli.stdout + cli.stderr, /archive_target_exists|already exists/);
  assert.equal(git(root, ['status', '--porcelain']), '', 'neither the plan nor the failed CLI wrote anything');
});

fixture('E3: a capability-emptying delta without the key plans the declaration, and the CLI then retires the spec', (t) => {
  const root = project(t, { delta: DELTA_REMOVE_ALL });
  const result = plan(root);
  assert.equal(result.status, 0);
  assert.deepEqual(result.json.retired_capabilities, ['alpha']);
  assert.equal(result.json.retirement.declaration, 'write');
  assert.equal(result.json.retirement.write, true);
  assert.deepEqual(result.json.commit_body_lines, ['Retired capability: alpha']);
  assert.ok(result.json.report_lines.includes('[sai-archive] retiring capability: alpha'));
  assert.equal(archive(root).status === 0, false, 'the CLI refuses the emptying delta until the declaration is written');
  fs.appendFileSync(path.join(root, 'openspec/changes/demo/.openspec.yaml'), 'retire_capabilities: true\n');
  const declared = plan(root);
  assert.equal(declared.json.retirement.declaration, 'present');
  assert.equal(declared.json.plan_fingerprint !== result.json.plan_fingerprint, true);
  const cli = archive(root);
  assert.equal(cli.status, 0, cli.stdout + cli.stderr);
  assert.equal(fs.existsSync(path.join(root, 'openspec/specs/alpha/spec.md')), false);
  assertPlanMatchesGit(root, declared);
});

fixture('E3: retire_capabilities: false vetoes the retirement and the plan is refused with nothing written', (t) => {
  const root = project(t, { delta: DELTA_REMOVE_ALL, meta: `${META}retire_capabilities: false\n` });
  const result = plan(root);
  assert.equal(result.status, 1);
  assert.equal(result.json.reason, 'retire-veto');
  assert.match(result.json.summary, /remove the `retire_capabilities: false` entry/);
  assert.notEqual(archive(root).status, 0);
});

fixture('E3: a retirement without .openspec.yaml is refused', (t) => {
  const root = project(t, { delta: DELTA_REMOVE_ALL, meta: null });
  const result = plan(root);
  assert.equal(result.status, 1);
  assert.equal(result.json.reason, 'retire-metadata');
  assert.equal(fs.existsSync(path.join(root, 'openspec/changes/demo/.openspec.yaml')), false, 'archive never creates it');
});

fixture('E3: a retirement whose metadata has no schema key is refused', (t) => {
  const root = project(t, { delta: DELTA_REMOVE_ALL, meta: 'created: 2026-01-01\n' });
  assert.equal(plan(root).json.reason, 'retire-metadata');
});

fixture('E4: a section below the requirements is unaccounted content, as the CLI judges it', (t) => {
  const root = project(t, { delta: DELTA_REMOVE_ALL, meta: `${META}retire_capabilities: true\n`, main: mainSpec('alpha', REQ_OLD, '\n## Notes\nKeep these notes.\n') });
  const result = plan(root);
  assert.equal(result.status, 1);
  assert.equal(result.json.reason, 'retire-unaccounted-content');
  assert.match(result.json.summary, /alpha \("## Notes"\)/);
  assert.notEqual(archive(root).status, 0);
  assert.equal(fs.existsSync(path.join(root, 'openspec/specs/alpha/spec.md')), true);
});

fixture('E4: a section above the requirements is unaccounted content too', (t) => {
  const main = `# alpha Specification\n\n## Purpose\n${PURPOSE}\n\n## Notes\nKeep these notes.\n\n## Requirements\n\n${REQ_OLD}`;
  const root = project(t, { delta: DELTA_REMOVE_ALL, meta: `${META}retire_capabilities: true\n`, main });
  const result = plan(root);
  assert.equal(result.json.reason, 'retire-unaccounted-content');
  assert.notEqual(archive(root).status, 0);
});

fixture('E5: a MODIFIED requirement that drops a scenario is refused before the CLI, as the CLI refuses it', (t) => {
  const dropped = `## MODIFIED Requirements

### Requirement: Old thing
The system SHALL do the old thing differently.

#### Scenario: A different scenario
- **WHEN** something else happens
- **THEN** another result follows
`;
  const root = project(t, { delta: dropped });
  const result = plan(root);
  assert.equal(result.status, 1);
  assert.equal(result.json.reason, 'scenario-dropped');
  assert.match(result.json.summary, /alpha \/ Old thing \/ Old works/);
  const cli = archive(root);
  assert.notEqual(cli.status, 0);
  assert.match(cli.stdout + cli.stderr, /scenario/i);
});

fixture('E6: a missing CORE artifact refuses the plan with the literal, unless the change is backfilled or skips specs', (t) => {
  const missing = project(t);
  fs.rmSync(path.join(missing, 'openspec/changes/demo/tasks.md'));
  fs.rmSync(path.join(missing, 'openspec/changes/demo/design.md'));
  const result = plan(missing);
  assert.equal(result.status, 1);
  assert.equal(result.json.reason, 'core-missing');
  assert.equal(result.json.summary, 'Missing CORE artifact(s): design, tasks. Archive blocked.');

  const backfilled = project(t, { meta: `${META}backfilled: true\nprior_intent: true\n` });
  fs.rmSync(path.join(backfilled, 'openspec/changes/demo/tasks.md'));
  fs.rmSync(path.join(backfilled, 'openspec/changes/demo/design.md'));
  const ok = plan(backfilled);
  assert.equal(ok.status, 0);
  assert.deepEqual(ok.json.core.skipped, ['design', 'tasks']);
  assert.equal(ok.json.audit.missing.includes('change-overview'), false, 'a backfilled change skips the overview');

  const skip = project(t, { delta: null, meta: `${META}skip_specs: true\n` });
  const skipped = plan(skip);
  assert.equal(skipped.status, 0);
  assert.deepEqual(skipped.json.delta_sync, []);
  assert.deepEqual(skipped.json.core.skipped, ['specs']);
  assert.equal(archive(skip).status, 0);
  assertPlanMatchesGit(skip, skipped);

  const noSpecs = project(t, { delta: null });
  assert.equal(plan(noSpecs).json.summary, 'Missing CORE artifact(s): specs. Archive blocked.');
});

fixture('the AUDIT line names every artifact that is absent, and the overview counts only when current', (t) => {
  const root = project(t, { meta: `${META}overview:\n  state: current\n`, extra: { 'openspec/changes/demo/review.md': '# r\n', 'openspec/changes/demo/change-overview.md': '# o\n' } });
  const result = plan(root);
  assert.equal(result.json.audit.line, '[sai-archive] informational: missing AUDIT artifact(s): security, performance, accessibility');
  fs.writeFileSync(path.join(root, 'openspec/changes/demo/.openspec.yaml'), `${META}overview:\n  state: stale\n`);
  assert.match(plan(root).json.audit.line, /accessibility, change-overview$/);
});

fixture('E7: an implementer deletion that is already staged is not added again and stays in the commit', (t) => {
  const root = project(t, { files: { 'src/gone.js': 'gone\n', 'src/edited.js': 'one\n' } });
  git(root, ['rm', '-q', 'src/gone.js']);
  put(root, 'src/edited.js', 'two\n');
  const paths = outside(t, 'src/gone.js\nsrc/edited.js\n');
  const result = plan(root, 'demo', ['--implementer-paths-file', paths]);
  assert.equal(result.status, 0);
  assert.deepEqual(result.json.already_staged_deletions, ['src/gone.js']);
  assert.equal(result.json.owned_staging_paths.includes('src/gone.js'), false);
  assert.ok(result.json.covering_paths.includes('src/gone.js'));
  assert.equal(archive(root).status, 0);
  assertPlanMatchesGit(root, result);
  assert.match(git(root, ['diff', '--cached', '--name-status', '--no-renames']), /^D\tsrc\/gone\.js$/m);
});

fixture('the implementer paths may travel as repeatable arguments, with the same result as a file', (t) => {
  const root = project(t, { files: { 'src/a.js': 'a\n' } });
  put(root, 'src/a.js', 'changed\n');
  const byFile = plan(root, 'demo', ['--implementer-paths-file', outside(t, 'src/a.js\n')]).json;
  const byArgument = plan(root, 'demo', ['--implementer-path', 'src/a.js']).json;
  assert.equal(byArgument.plan_fingerprint, byFile.plan_fingerprint);
  assert.equal(plan(root, 'demo', ['--implementer-path', '../outside']).status, 2);
  assert.equal(plan(root, 'demo', ['--implementer-path']).status, 2);
});

fixture('an implementer deletion that is not staged is owned and staged deletion-aware', (t) => {
  const root = project(t, { files: { 'src/gone.js': 'gone\n' } });
  fs.rmSync(path.join(root, 'src/gone.js'));
  const paths = outside(t, 'src/gone.js\nsrc/never-existed.js\n');
  const result = plan(root, 'demo', ['--implementer-paths-file', paths]);
  assert.ok(result.json.owned_staging_paths.includes('src/gone.js'));
  assert.deepEqual(result.json.omitted_absent_paths, ['src/never-existed.js']);
  assert.equal(archive(root).status, 0);
  assertPlanMatchesGit(root, result);
});

fixture('E8: on the no-specs route the commit paths are the archived copies, proposal.md included and ignored files omitted', (t) => {
  const root = project(t, {
    change: null,
    main: null,
    ignore: 'openspec/changes/archive/**\n!openspec/changes/archive/**/\n!openspec/changes/archive/**/proposal.md\n',
  });
  const drafts = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-archive-drafts-'));
  t.after(() => fs.rmSync(drafts, { recursive: true, force: true }));
  const draftMeta = 'schema: spec-driven\ncreated: 2026-01-01\nbackfilled: true\nskip_specs: true\nbacklog_origin: https://github.com/owner/repo/issues/520\n';
  fs.writeFileSync(path.join(drafts, '.openspec.yaml'), draftMeta);
  fs.writeFileSync(path.join(drafts, 'proposal.md'), PROPOSAL);
  put(root, 'src/feature.js', 'feature\n');
  const paths = outside(t, 'src/feature.js\n');
  const result = plan(root, 'demo', ['--drafts-dir', drafts, '--implementer-paths-file', paths]);
  assert.equal(result.status, 0, JSON.stringify(result.json));
  const archived = `openspec/changes/archive/${today()}-demo`;
  assert.deepEqual(result.json.owned_staging_paths, [`${archived}/proposal.md`, 'src/feature.js']);
  assert.deepEqual(result.json.omitted_ignored_paths, [`${archived}/.openspec.yaml`]);
  assert.equal(result.json.owned_staging_paths.some((target) => target.startsWith('openspec/changes/demo/')), false, 'the pre-move destinations are not used');
  assert.equal(result.json.closing_line, 'Closes owner/repo#520');
  assert.ok(result.json.covering_paths.includes('openspec/changes/demo'), 'the draft destinations are covered by the moved directory');
  // The archive worker materializes the drafts, then the CLI archives.
  put(root, 'openspec/changes/demo/.openspec.yaml', draftMeta);
  put(root, 'openspec/changes/demo/proposal.md', PROPOSAL);
  const cli = archive(root);
  assert.equal(cli.status, 0, cli.stdout + cli.stderr);
  assertPlanMatchesGit(root, result);
});

fixture('E9: a retire_capabilities value that is not a boolean is refused with its reason', (t) => {
  const root = project(t, { delta: DELTA_REMOVE_ALL, meta: `${META}retire_capabilities: "yes"\n` });
  const result = plan(root);
  assert.equal(result.status, 1);
  assert.equal(result.json.reason, 'retire-unhonoured');
  assert.match(result.json.summary, /"yes", which is not a boolean/);
  assert.match(result.json.summary, /never guesses which boolean/);
  const unquoted = project(t, { delta: DELTA_REMOVE_ALL, meta: `${META}retire_capabilities: yes\n` });
  assert.equal(plan(unquoted).json.reason, 'retire-unhonoured');
  const empty = project(t, { delta: DELTA_REMOVE_ALL, meta: `${META}retire_capabilities:\n` });
  assert.equal(plan(empty).json.reason, 'retire-unhonoured');
});

fixture('E10: a .openspec.yaml the tool cannot read is refused with a read reason', (t) => {
  for (const meta of [`${META}broken: [x\n`, `${META}- item\n`, `${META}\tkey: 1\n`, `${META}key: |\n  block\n`]) {
    const root = project(t, { meta });
    const result = plan(root);
    assert.equal(result.status, 1, meta);
    assert.equal(result.json.reason, 'metadata-unreadable');
    assert.match(result.json.summary, /cannot be read/);
  }
});

fixture('E11: the plan carries the retirement body lines and the issue closing line for the message', (t) => {
  const root = project(t, { delta: DELTA_REMOVE_ALL, meta: `${META}retire_capabilities: true\nbacklog_origin: https://github.com/owner/repo/issues/42\n` });
  const result = plan(root);
  assert.equal(result.json.closing_line, 'Closes owner/repo#42');
  assert.deepEqual(result.json.commit_body_lines, ['Retired capability: alpha']);
  assert.equal(result.json.commit_count, 1);
  const none = plan(project(t));
  assert.equal(none.json.closing_line, null);
  assert.deepEqual(none.json.warnings, []);
  const invalid = plan(project(t, { meta: `${META}backlog_origin: https://example.com/not-an-issue\n` }));
  assert.equal(invalid.json.closing_line, null);
  assert.ok(invalid.json.warnings.some((line) => /backlog_origin/.test(line)));
  const azure = plan(project(t, { meta: `${META}backlog_origin: https://dev.azure.com/org/proj/_workitems/edit/3\n` }));
  assert.equal(azure.json.closing_line, null);
  assert.deepEqual(azure.json.warnings, []);
});

fixture('E12: the plan changes when the working tree it describes changes, and not otherwise', (t) => {
  const root = project(t, { files: { 'src/a.js': 'a\n' } });
  const first = plan(root, 'demo', ['--implementer-paths-file', outside(t, 'src/a.js\n')]).json;
  assert.equal(plan(root, 'demo', ['--implementer-paths-file', outside(t, 'src/a.js\n')]).json.plan_fingerprint, first.plan_fingerprint);
  put(root, 'src/b.js', 'b\n');
  assert.notEqual(plan(root, 'demo', ['--implementer-paths-file', outside(t, 'src/a.js\nsrc/b.js\n')]).json.plan_fingerprint, first.plan_fingerprint);
});

fixture('E13: a validation the tool does not predict fails in the CLI after a clean plan', (t) => {
  const noScenario = `## ADDED Requirements

### Requirement: Weak thing
The system SHALL do the weak thing.
`;
  const root = project(t, { delta: noScenario });
  assert.equal(plan(root).status, 0);
  const cli = archive(root);
  assert.notEqual(cli.status, 0);
  assert.match(cli.stdout + cli.stderr, /archive_validation_failed/);
  assert.equal(fs.existsSync(path.join(root, 'openspec/changes/demo/proposal.md')), true, 'nothing moved');
});

fixture('the plan reads the repository only: nothing is written, staged, or moved', (t) => {
  const root = project(t, { delta: DELTA_REMOVE_ALL });
  const before = git(root, ['status', '--porcelain', '--ignored']);
  plan(root);
  assert.equal(git(root, ['status', '--porcelain', '--ignored']), before);
  assert.equal(git(root, ['diff', '--cached', '--name-only']), '');
});

fixture('an unknown change is refused and an invalid name is a usage error', (t) => {
  const root = project(t, { change: null });
  assert.equal(plan(root, 'missing').json.reason, 'change-not-found');
  assert.equal(plan(root, 'Bad Name').status, 2);
  assert.equal(plan(root, 'archive').status, 2);
});

test('I1: the sai-tools projection installs the tool for both harnesses and the cards point to it', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'sai', 'install-manifest.json'), 'utf8'));
  const projection = manifest.projections.find((entry) => entry.id === 'sai-tools');
  assert.ok(projection, 'the sai-tools projection exists');
  assert.deepEqual(projection.harnesses, ['claude', 'opencode']);
  const read = (relative) => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  for (const card of ['sai/commands/archive/coordinator.md', 'sai/commands/archive/instructions.md', 'sai/commands/archive/worker.md', 'sai/commands/explore/direct-build-coordinator.md', 'AGENTS.md', 'docs/commands/sai-archive.md']) {
    assert.match(read(card), /archive-plan\.js/, `${card} names the tool`);
  }
});
