'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { compute, main } = require('../sai/tools/risk-signals');

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
