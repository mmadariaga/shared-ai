'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { compute, validate, main } = require('../sai/tools/risk-signals');

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
function write(cwd, file, text) {
  fs.mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
  fs.writeFileSync(path.join(cwd, file), text);
}
function repository(t, files = { 'src/keep.js': 'module.exports = 1;\n' }) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-signals-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  git(cwd, 'init', '-b', 'main');
  git(cwd, 'config', 'user.name', 'Test');
  git(cwd, 'config', 'user.email', 'test@example.invalid');
  for (const [file, text] of Object.entries(files)) write(cwd, file, text);
  git(cwd, 'add', '.');
  git(cwd, 'commit', '-m', 'base');
  git(cwd, 'checkout', '-b', 'feature');
  return cwd;
}
function commit(cwd, changes, removals = []) {
  for (const [file, text] of Object.entries(changes)) write(cwd, file, text);
  for (const file of removals) fs.rmSync(path.join(cwd, file));
  git(cwd, 'add', '-A');
  git(cwd, 'commit', '-m', 'change');
}

test('an empty diff has the lowest floors, the merge-base, and a stable fingerprint', (t) => {
  const cwd = repository(t);
  const first = compute({ parent: 'main' }, cwd);
  assert.equal(first.merge_base, git(cwd, 'rev-parse', 'main'));
  assert.deepEqual(first.floors, { security: 'low', reversibility: 'low', blast_radius: 'low', critical_sections: null });
  assert.deepEqual(first.signals, []);
  assert.equal(compute({ parent: 'main' }, cwd).fingerprint, first.fingerprint);
});

test('migrations, infrastructure, dependency manifests, and deletions raise reversibility', (t) => {
  const cwd = repository(t, { 'src/keep.js': 'a\n', 'src/old.js': 'b\n' });
  commit(cwd, { 'db/migrations/001_users.sql': 'create table users(id int);\n' });
  assert.equal(compute({ parent: 'main' }, cwd).floors.reversibility, 'high');

  const infra = repository(t);
  commit(infra, { '.github/workflows/ci.yml': 'name: ci\n' });
  assert.equal(compute({ parent: 'main' }, infra).floors.reversibility, 'medium');

  const manifestRepo = repository(t);
  commit(manifestRepo, { 'package.json': '{}\n' });
  assert.equal(compute({ parent: 'main' }, manifestRepo).floors.reversibility, 'medium');

  const removal = repository(t, { 'src/keep.js': 'a\n', 'src/old.js': 'b\n' });
  commit(removal, {}, ['src/old.js']);
  const result = compute({ parent: 'main' }, removal);
  assert.equal(result.floors.reversibility, 'medium');
  assert.equal(result.stats.deleted_files, 1);
});

test('a rename is not a deletion', (t) => {
  const cwd = repository(t, { 'src/keep.js': 'line one\nline two\nline three\nline four\n' });
  git(cwd, 'mv', 'src/keep.js', 'src/kept.js');
  git(cwd, 'commit', '-am', 'rename');
  assert.equal(compute({ parent: 'main' }, cwd).stats.deleted_files, 0);
});

test('sensitive and exposed paths and user-input lines raise security with path:line evidence', (t) => {
  const cwd = repository(t);
  commit(cwd, { 'src/auth/login.js': 'x\n' });
  assert.equal(compute({ parent: 'main' }, cwd).floors.security, 'high');

  const input = repository(t);
  commit(input, { 'src/util.js': 'const a = 1;\nconst name = req.body.name;\n' });
  const result = compute({ parent: 'main' }, input);
  assert.equal(result.floors.security, 'medium');
  assert.deepEqual(result.signals.find(item => item.signal === 'user-input'), { rating: 'security', level: 'medium', signal: 'user-input', path: 'src/util.js', line: 2 });

  const tests = repository(t);
  commit(tests, { 'test/auth.test.js': 'const x = req.body;\n' });
  assert.equal(compute({ parent: 'main' }, tests).floors.security, 'low');
});

test('diff size raises the blast radius and openspec artifacts stay out of the fingerprint', (t) => {
  const cwd = repository(t);
  const many = {};
  for (let index = 0; index < 15; index += 1) many[`src/file${index}.js`] = `${index}\n`;
  commit(cwd, many);
  const sized = compute({ parent: 'main' }, cwd);
  assert.equal(sized.floors.blast_radius, 'medium');
  commit(cwd, { 'openspec/changes/x/review.md': 'notes\n' });
  const after = compute({ parent: 'main' }, cwd);
  assert.equal(after.fingerprint, sized.fingerprint);
  assert.equal(after.stats.changed_files, 15);
});

test('a project without a CodeGraph index completes with diff-size signals only', (t) => {
  const cwd = repository(t);
  commit(cwd, { 'src/a.js': 'a\n' });
  const result = compute({ parent: 'main' }, cwd);
  assert.deepEqual(result.codegraph, { indexed: false, files_probed: 0, max_dependents: 0 });
  assert.equal(result.floors.blast_radius, 'low');
});

test('an invalid parent is reported as blocked', (t) => {
  const cwd = repository(t);
  const written = [];
  const original = process.stdout.write;
  process.stdout.write = chunk => { written.push(String(chunk)); return true; };
  try {
    assert.equal(main(['compute', '--parent', '--upload-pack=x', '--cwd', cwd]), 2);
    assert.equal(main(['compute', '--parent', 'nope', '--cwd', cwd]), 2);
  } finally { process.stdout.write = original; }
  assert.deepEqual(written.map(line => JSON.parse(line).status), ['blocked', 'blocked']);
});

function block(result, levels = { security: 'low', reversibility: 'low', critical_sections: 'low', blast_radius: 'low' }) {
  return [
    '<!-- sai-inherent-risk:start -->',
    '## Inherent Risk',
    '',
    `Merge-base: \`${result.merge_base}\` | Code fingerprint: \`${result.fingerprint}\``,
    '',
    '| Rating | Level | Justification |',
    '|--------|-------|---------------|',
    `| Security | ${levels.security} | src/a.js:1 |`,
    `| Reversibility | ${levels.reversibility} | src/a.js:1 |`,
    `| Critical sections | ${levels.critical_sections} | src/a.js:1 |`,
    `| Blast radius | ${levels.blast_radius} | src/a.js:1 |`,
    '<!-- sai-inherent-risk:end -->',
  ].join('\n');
}
const report = text => `# Code Review - x\n\n**Reviewed:** \`main\` a..b\n\n${text}\n\n## Security Surface Triage\n\n- **Surface touched:** No\n`;

test('a stored block that matches the code and respects the floors is fresh and carries its text', (t) => {
  const cwd = repository(t);
  commit(cwd, { 'src/a.js': 'a\n' });
  const stored = block(compute({ parent: 'main' }, cwd));
  assert.deepEqual(validate({ parent: 'main', text: report(stored) }, cwd), { status: 'ok', state: 'fresh', block: stored });
  commit(cwd, { 'openspec/changes/x/review.md': report(stored) });
  assert.equal(validate({ parent: 'main', text: report(stored) }, cwd).state, 'fresh');
});

test('a block is stale when the code changes', (t) => {
  const cwd = repository(t);
  commit(cwd, { 'src/a.js': 'a\n' });
  const text = report(block(compute({ parent: 'main' }, cwd)));
  assert.equal(validate({ parent: 'main', text }, cwd).state, 'fresh');
  commit(cwd, { 'src/b.js': 'b\n' });
  assert.equal(validate({ parent: 'main', text }, cwd).state, 'stale');
});

test('a block stays stale after the parent moves and is merged in', (t) => {
  const cwd = repository(t);
  commit(cwd, { 'src/a.js': 'a\n' });
  const text = report(block(compute({ parent: 'main' }, cwd)));
  git(cwd, 'checkout', 'main');
  commit(cwd, { 'src/c.js': 'c\n' });
  git(cwd, 'checkout', 'feature');
  git(cwd, 'merge', '--no-edit', 'main');
  assert.equal(validate({ parent: 'main', text }, cwd).state, 'stale');
});

test('a missing, malformed, or below-floor block is absent', (t) => {
  const cwd = repository(t);
  commit(cwd, { 'db/migrations/001.sql': 'create table a(id int);\n' });
  const current = compute({ parent: 'main' }, cwd);
  assert.equal(current.floors.reversibility, 'high');
  const high = { security: 'low', reversibility: 'high', critical_sections: 'low', blast_radius: 'low' };
  assert.equal(validate({ parent: 'main', text: report(block(current, high)) }, cwd).state, 'fresh');
  assert.equal(validate({ parent: 'main', text: report(block(current)) }, cwd).state, 'absent');

  const stored = block(current, high);
  const broken = [
    null,
    report(''),
    report(stored.replace('<!-- sai-inherent-risk:end -->', '')),
    report(stored.replace('<!-- sai-inherent-risk:start -->', '')),
    report(`${stored}\n${stored}`),
    report(stored.replace(/Code fingerprint: `[0-9a-f]+`/, 'Code fingerprint: ``')),
    report(stored.replace('| Security | low |', '| Security | severe |')),
    report(stored.replace(/\| Blast radius .*\n/, '')),
    report(stored.replace('Merge-base: ', 'Base: ')),
  ];
  for (const text of broken) assert.equal(validate({ parent: 'main', text }, cwd).state, 'absent');
});

test('validate reads the report file and reports a missing file as absent', (t) => {
  const cwd = repository(t);
  commit(cwd, { 'src/a.js': 'a\n' });
  write(cwd, 'review.md', report(block(compute({ parent: 'main' }, cwd))));
  const written = [];
  const original = process.stdout.write;
  process.stdout.write = chunk => { written.push(String(chunk)); return true; };
  try {
    assert.equal(main(['validate', '--parent', 'main', '--file', 'review.md', '--cwd', cwd]), 0);
    assert.equal(main(['validate', '--parent', 'main', '--file', 'missing.md', '--cwd', cwd]), 0);
    assert.equal(main(['validate', '--parent', 'main', '--cwd', cwd]), 2);
  } finally { process.stdout.write = original; }
  assert.deepEqual(written.map(line => JSON.parse(line)).map(item => item.state ?? item.status), ['fresh', 'absent', 'blocked']);
});
