'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const tool = path.resolve(__dirname, '../sai/tools/scenario-coverage.js');

const requirement = (name, scenarios) => `### Requirement: ${name}\nThe system SHALL behave.\n\n` +
  scenarios.map(([title, body = 'works']) => `#### Scenario: ${title}\n- **WHEN** invoked\n- **THEN** ${body}\n`).join('\n');
const delta = (section, name, scenarios) => `## ${section} Requirements\n\n${requirement(name, scenarios)}`;

function repo(t, { main = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-scenario-coverage-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
    return result.stdout;
  };
  const write = (relative, content) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  };
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'commit.gpgsign', 'false');
  write('README.md', 'base\n');
  if (main) write('openspec/specs/cap/spec.md', main);
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  git('checkout', '-q', '-b', 'feature');
  const run = (...args) => {
    const result = spawnSync(process.execPath, [tool, ...args, '--cwd', root], { encoding: 'utf8' });
    return { ...result, report: result.stdout ? JSON.parse(result.stdout) : null };
  };
  // The input file lives outside the repository, as the SAI temp root does, so it is never a changed file.
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-scenario-coverage-input-'));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const input = (name, content) => {
    const file = path.join(scratch, name);
    fs.writeFileSync(file, content);
    return file;
  };
  const step = (titles) => run('step', '--input-file', input('titles.json', JSON.stringify(titles)));
  return { root, git, write, run, step, input };
}

test('E1: step mode matches a title in a file committed after the change base', (t) => {
  const f = repo(t);
  f.write('test/login.test.js', "test('User can log in with a valid password', () => {});\n");
  f.git('add', '-A');
  f.git('commit', '-q', '-m', 'RED');
  const result = f.step(['User can log in with a valid password']);
  assert.equal(result.status, 0);
  assert.equal(result.report.verdict, 'clean');
  assert.equal(result.report.parent_branch, 'main');
  assert.match(result.report.change_base, /^[0-9a-f]{40}$/);
  assert.deepEqual(result.report.missing, []);
  assert.deepEqual(result.report.ambiguous, []);
});

test('E1: a title with no match is missing and exits 1', (t) => {
  const f = repo(t);
  f.write('test/login.test.js', "test('something else', () => {});\n");
  f.git('add', '-A');
  f.git('commit', '-q', '-m', 'RED');
  const result = f.step(['User can log in']);
  assert.equal(result.status, 1);
  assert.equal(result.report.verdict, 'missing');
  assert.deepEqual(result.report.missing, [{ title: 'User can log in' }]);
});

test('normalized match ignores case and whitespace runs and treats punctuation as a word separator', (t) => {
  const f = repo(t);
  f.write('test/a.test.js', "it('USER   can log-in, safely!', () => {});\n");
  assert.equal(f.step(['User can log in safely']).report.verdict, 'clean');
  assert.equal(f.step(['User can login safely']).report.verdict, 'missing');
  assert.equal(f.step(['User cannot log in']).report.verdict, 'missing');
});

test('E2: a title matches on word boundaries, never inside another word', (t) => {
  const f = repo(t);
  f.write('test/a.test.js', "it('invalid input is rejected', () => {});\n");
  const result = f.step(['valid input']);
  assert.equal(result.status, 1);
  assert.deepEqual(result.report.missing, [{ title: 'valid input' }]);
  assert.equal(f.step(['invalid input']).report.verdict, 'clean');
  assert.equal(f.step(['input is rejected']).report.verdict, 'clean');
  assert.equal(f.step(['valid input is rejected']).report.verdict, 'missing');
});

test('E2: a hyphenated or punctuated form in a file still matches the title', (t) => {
  const f = repo(t);
  f.write('test/a.test.js', "it('valid-input passes', () => {});\n");
  assert.equal(f.step(['valid input']).report.verdict, 'clean');
});

test('E5: titles that differ only in punctuation share one normalized title and are ambiguous', (t) => {
  const f = repo(t);
  f.write('a.test.js', 'valid input\n');
  const result = f.step(['valid-input', 'valid input']);
  assert.equal(result.status, 1);
  assert.equal(result.report.ambiguous.length, 1);
  assert.equal(result.report.ambiguous[0].title, 'valid input');
  assert.deepEqual(result.report.missing, []);
});

function releaseRepo(t) {
  const f = repo(t);
  f.git('checkout', '-q', '-b', 'release');
  f.write('release-only.test.js', 'Release only title\n');
  f.git('add', '-A');
  f.git('commit', '-q', '-m', 'release work');
  f.git('checkout', '-q', '-b', 'change');
  f.write('change.test.js', 'Change title\n');
  f.git('add', '-A');
  f.git('commit', '-q', '-m', 'change work');
  return f;
}

test('E1: --parent-branch takes the change base from that branch, so a release file is not a change file', (t) => {
  const f = releaseRepo(t);
  const titles = ['Release only title', 'Change title'];
  const byDefault = f.step(titles);
  assert.equal(byDefault.report.parent_branch, 'main');
  assert.equal(byDefault.report.verdict, 'clean');
  const result = f.run('step', '--input-file', f.input('release-titles.json', JSON.stringify(titles)), '--parent-branch', 'release');
  assert.equal(result.status, 1);
  assert.equal(result.report.parent_branch, 'release');
  assert.equal(result.report.change_base, f.git('rev-parse', 'release').trim());
  assert.deepEqual(result.report.missing, [{ title: 'Release only title' }]);
});

test('E1: --parent-branch applies to change mode too', (t) => {
  const f = releaseRepo(t);
  f.write('openspec/changes/c/specs/cap/spec.md', delta('ADDED', 'Fresh', [['Release only title'], ['Change title']]));
  assert.equal(f.run('change', 'c').report.verdict, 'clean');
  const result = f.run('change', 'c', '--parent-branch', 'release');
  assert.equal(result.status, 1);
  assert.equal(result.report.parent_branch, 'release');
  assert.deepEqual(result.report.missing.map((entry) => entry.title), ['Release only title']);
});

test('E1: a --parent-branch that does not resolve exits 2 and names it', (t) => {
  const f = repo(t);
  f.write('openspec/changes/c/specs/cap/spec.md', delta('ADDED', 'Fresh', [['A title']]));
  const input = f.input('titles.json', JSON.stringify(['A title']));
  for (const args of [['step', '--input-file', input, '--parent-branch', 'no-such-branch'], ['change', 'c', '--parent-branch', 'no-such-branch']]) {
    const result = f.run(...args);
    assert.equal(result.status, 2, args.join(' '));
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /no-such-branch/);
  }
  const missingValue = f.run('step', '--input-file', input, '--parent-branch');
  assert.equal(missingValue.status, 2);
  assert.match(missingValue.stderr, /--parent-branch/);
});

test('E5: staged and untracked files count, while base commit, ignored, openspec, deleted, and binary files do not', (t) => {
  const f = repo(t);
  f.git('checkout', '-q', 'main');
  f.write('base-only.test.js', 'Base only title\n');
  f.write('.gitignore', 'ignored.test.js\n');
  f.git('add', '-A');
  f.git('commit', '-q', '-m', 'base-side');
  f.git('checkout', '-q', 'feature');
  f.git('merge', '-q', '--no-edit', 'main');
  f.write('staged.test.js', 'Staged title\n');
  f.git('add', 'staged.test.js');
  f.write('untracked.test.js', 'Untracked title\n');
  f.write('ignored.test.js', 'Ignored title\n');
  f.write('openspec/changes/x/specs/cap/spec.md', 'Spec only title\n');
  fs.writeFileSync(path.join(f.root, 'binary.bin'), Buffer.concat([Buffer.from('Binary title'), Buffer.from([0])]));
  f.write('gone.test.js', 'Gone title\n');
  f.git('add', 'binary.bin', 'gone.test.js');
  fs.rmSync(path.join(f.root, 'gone.test.js'));
  const titles = ['Staged title', 'Untracked title', 'Ignored title', 'Spec only title', 'Binary title', 'Gone title', 'Base only title'];
  const result = f.step(titles);
  assert.deepEqual(result.report.missing.map((entry) => entry.title), ['Ignored title', 'Spec only title', 'Binary title', 'Gone title', 'Base only title']);
});

test('E6: titles that share a normalized title are ambiguous and match no test', (t) => {
  const f = repo(t);
  f.write('a.test.js', 'Same title here\n');
  const result = f.step(['Same title here', 'same TITLE, here', 'Other one']);
  assert.equal(result.status, 1);
  assert.deepEqual(result.report.missing, [{ title: 'Other one' }]);
  assert.equal(result.report.ambiguous.length, 1);
  assert.equal(result.report.ambiguous[0].title, 'same title here');
  assert.deepEqual(result.report.ambiguous[0].scenarios.map((entry) => entry.title), ['Same title here', 'same TITLE, here']);
});

test('a step with no titles is n/a and a title of only punctuation is missing', (t) => {
  const f = repo(t);
  f.write('a.test.js', 'anything\n');
  const none = f.step([]);
  assert.equal(none.status, 0);
  assert.equal(none.report.verdict, 'n/a');
  assert.equal(f.step(['!!!']).report.verdict, 'missing');
});

test('the parent branch is the default branch of origin/HEAD without its prefix', (t) => {
  const f = repo(t);
  f.git('branch', 'trunk', 'main');
  f.git('update-ref', 'refs/remotes/origin/trunk', 'main');
  f.git('symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/trunk');
  f.write('a.test.js', 'Some title\n');
  assert.equal(f.step(['Some title']).report.parent_branch, 'trunk');
});

test('E3, E4: change mode checks ADDED scenarios and new or differing MODIFIED scenarios only', (t) => {
  const main = requirement('Existing', [['Unchanged one'], ['Changed body'], ['Removed later']]);
  const f = repo(t, { main });
  f.write('openspec/changes/c/specs/cap/spec.md', [
    delta('ADDED', 'Fresh', [['Brand new scenario']]),
    delta('MODIFIED', 'Existing', [['Unchanged one'], ['Changed body', 'differently'], ['Renamed scenario title']]),
    '## REMOVED Requirements\n\n### Requirement: Gone\n\n#### Scenario: Under removed requirement\n- **THEN** nothing\n',
  ].join('\n'));
  f.write('openspec/changes/c/specs/fresh-cap/spec.md', delta('ADDED', 'New cap', [['Capability without main spec']]));
  const result = f.run('change', 'c');
  assert.equal(result.status, 1);
  assert.deepEqual(result.report.missing.map((entry) => [entry.capability, entry.section, entry.title]), [
    ['cap', 'ADDED', 'Brand new scenario'],
    ['cap', 'MODIFIED', 'Changed body'],
    ['cap', 'MODIFIED', 'Renamed scenario title'],
    ['fresh-cap', 'ADDED', 'Capability without main spec'],
  ]);
  assert.equal(result.report.missing[0].requirement, 'Fresh');
});

test('change mode is clean when every checked scenario has a test in the change', (t) => {
  const f = repo(t);
  f.write('openspec/changes/c/specs/cap/spec.md', delta('ADDED', 'Fresh', [['First scenario'], ['Second scenario']]));
  f.write('test/a.test.js', "test('First scenario', () => {});\n// Second scenario\n");
  const result = f.run('change', 'c');
  assert.equal(result.status, 0);
  assert.equal(result.report.verdict, 'clean');
  assert.deepEqual(result.report.missing, []);
});

test('E6: change mode reports scenarios of different requirements that share a title', (t) => {
  const f = repo(t);
  f.write('openspec/changes/c/specs/cap/spec.md', delta('ADDED', 'One', [['Shared title']]) + '\n' + requirement('Two', [['shared title!']]));
  f.write('test/a.test.js', 'Shared title\n');
  const result = f.run('change', 'c');
  assert.equal(result.status, 1);
  assert.equal(result.report.ambiguous.length, 1);
  assert.deepEqual(result.report.missing, []);
});

test('E7: skip_specs gives an explicit n/a', (t) => {
  const f = repo(t);
  f.write('openspec/changes/c/.openspec.yaml', 'schema: sai-workflow\nskip_specs: true\n');
  const result = f.run('change', 'c');
  assert.equal(result.status, 0);
  assert.equal(result.report.verdict, 'n/a');
  assert.deepEqual(result.report.missing, []);
  assert.equal(result.report.reason, 'skip_specs');
});

test('E9: a tool failure exits 2 with a message and prints no verdict', (t) => {
  const f = repo(t);
  for (const args of [['unknown'], [], ['step'], ['change'], ['change', 'absent-change'], ['step', '--input-file', path.join(os.tmpdir(), 'sai-scenario-coverage-absent.json')]]) {
    const result = f.run(...args);
    assert.equal(result.status, 2, args.join(' '));
    assert.equal(result.stdout, '');
    assert.ok(result.stderr.length > 0);
  }
  assert.equal(f.run('step', '--input-file', f.input('bad.json', '{"not": "a list"}')).status, 2);
  assert.equal(f.run('step', '--input-file', f.input('worse.json', 'not json')).status, 2);
});

test('E9: a directory that is not a git repository is a tool error', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-scenario-coverage-nogit-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const input = path.join(root, 'titles.json');
  fs.writeFileSync(input, '["A title"]');
  const result = spawnSync(process.execPath, [tool, 'step', '--input-file', input, '--cwd', root], { encoding: 'utf8', env: { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(root) } });
  assert.equal(result.status, 2);
});
