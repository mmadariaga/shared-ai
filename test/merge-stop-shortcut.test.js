'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const merge = require('../sai/tools/merge');
const machine = require('../sai-state/machines/merge-run.js');

const ROOT = path.join(__dirname, '..');
const TOOL = path.join(ROOT, 'sai/tools/merge.js');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const section = (text, from, to) => text.slice(text.indexOf(from), text.indexOf(to));
const lines = (...items) => items.map(item => `${item}\n`).join('');

function git(cwd, args, allowedFailure = false) {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (!allowedFailure) assert.equal(run.status, 0, run.stderr);
  return run;
}

function repository(t) {
  const parent = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-merge-shortcut-'));
  const cwd = path.join(parent, 'repo');
  fs.mkdirSync(cwd);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  git(cwd, ['init', '-b', 'main']);
  git(cwd, ['config', 'user.name', 'Test']);
  git(cwd, ['config', 'user.email', 'test@example.com']);
  git(cwd, ['config', 'core.autocrlf', 'false']);
  return { parent, cwd };
}

const write = (cwd, name, text) => fs.writeFileSync(path.join(cwd, name), text);
const commit = (cwd, subject, files) => {
  for (const [name, text] of Object.entries(files)) write(cwd, name, text);
  git(cwd, ['add', '-A']);
  git(cwd, ['commit', '-m', subject]);
};

function cli(cwd, args) {
  const run = spawnSync(process.execPath, [TOOL, ...args, '--json', '--cwd', cwd], { encoding: 'utf8' });
  return { status: run.status, payload: JSON.parse(run.stdout) };
}

// A rebase of `feature` onto `main` that stops on f.txt: main holds an evolved version of the
// replayed change, which `replayed` shapes.
function rebaseStop(t, { upstream, replayed, base = lines('a', 'b') }) {
  const { parent, cwd } = repository(t);
  commit(cwd, 'base', { 'f.txt': base });
  git(cwd, ['checkout', '-b', 'feature']);
  commit(cwd, 'feat: add x', { 'f.txt': replayed });
  git(cwd, ['checkout', 'main']);
  commit(cwd, 'feat: add x', { 'f.txt': upstream });
  git(cwd, ['checkout', 'feature']);
  assert.equal(git(cwd, ['rebase', 'main'], true).status, 1);
  return { parent, cwd };
}

const entry = (cwd, name = 'f.txt') => merge.conflicts(cwd).data.files.find(file => file.path === name);

test('I2: a replayed change whose added lines all exist on the other side shows a same-subject commit and contained lines', t => {
  const { cwd } = rebaseStop(t, { upstream: lines('a', 'X', 'Y', 'b'), replayed: lines('a', 'X', 'b') });
  const snapshot = merge.conflicts(cwd);
  const file = snapshot.data.files[0];
  assert.equal(snapshot.data.containment.operation, 'rebase');
  assert.deepEqual(file.stage_checkout_preserves_combined_content, { 2: true, 3: true });
  assert.equal(file.containment.incoming.length, 1);
  const [incoming] = file.containment.incoming;
  assert.equal(incoming.subject, 'feat: add x');
  assert.equal(incoming.same_subject.length, 1);
  assert.deepEqual(incoming.patch_id, [], 'the evolved upstream version is not the same patch');
  assert.equal(file.containment.upstream_touching.length, 1);
  assert.deepEqual([file.containment.lines.added, file.containment.lines.present_on_other_side, file.containment.lines.removed, file.containment.lines.still_on_other_side], [1, 1, 0, 0]);
  assert.deepEqual(file.containment.lines.missing, []);
});

test('E2: lines the replayed commit adds that the other side lacks are listed and contradict the shortcut', t => {
  const { cwd } = rebaseStop(t, { upstream: lines('a', 'X', 'b'), replayed: lines('a', 'Z', 'W', 'b') });
  const { lines: indicators } = entry(cwd).containment;
  assert.deepEqual([indicators.added, indicators.present_on_other_side], [2, 0]);
  assert.deepEqual(indicators.missing, ['Z', 'W']);
});

test('lines the replayed commit removes that the other side still holds are counted', t => {
  const { cwd } = rebaseStop(t, { base: lines('a', 'old', 'b'), upstream: lines('a', 'new', 'b'), replayed: lines('a', 'b') });
  const { lines: indicators } = entry(cwd).containment;
  assert.deepEqual([indicators.removed, indicators.still_on_other_side, indicators.still], [1, 0, []],
    'the other side no longer holds the removed line, so removal is already there');
  const kept = rebaseStop(t, { base: lines('a', 'old', 'b'), upstream: lines('a', 'old', 'edit', 'b'), replayed: lines('a', 'b') });
  assert.deepEqual([entry(kept.cwd).containment.lines.removed, entry(kept.cwd).containment.lines.still_on_other_side], [1, 1]);
});

test('a patch-id match and a range-diff pairing name the upstream commit that already holds the change', t => {
  const { parent, cwd } = repository(t);
  const spread = Array.from({ length: 12 }, (_, i) => `line ${i}`);
  commit(cwd, 'base', { 'f.txt': lines('a', 'b', 'c'), 'g.txt': lines(...spread) });
  git(cwd, ['checkout', '-b', 'feature']);
  commit(cwd, 'feat: shared', { 'f.txt': lines('A', 'b', 'c') });
  const shared = git(cwd, ['rev-parse', 'HEAD']).stdout.trim();
  commit(cwd, 'fix: source side', { 'f.txt': lines('A', 'S', 'c') });
  git(cwd, ['checkout', 'main']);
  commit(cwd, 'chore: unrelated', { 'g.txt': lines(...spread, 'extra') });
  git(cwd, ['cherry-pick', shared]);
  commit(cwd, 'fix: target side', { 'f.txt': lines('A', 'T', 'c') });
  assert.equal(git(cwd, ['merge', '--no-ff', '--no-commit', 'refs/heads/feature'], true).status, 1);
  const snapshot = merge.conflicts(cwd);
  assert.equal(snapshot.data.containment.operation, 'merge');
  const incoming = snapshot.data.files[0].containment.incoming;
  assert.deepEqual(incoming.map(item => item.subject).sort(), ['feat: shared', 'fix: source side']);
  const matched = incoming.find(item => item.subject === 'feat: shared');
  assert.equal(matched.patch_id.length, 1, 'the cherry-pick carries the same patch');
  assert.equal(matched.range_diff.status, '=');
  assert.deepEqual(incoming.find(item => item.subject === 'fix: source side').patch_id, []);
  assert.ok(parent);
});

test('I2: the record keeps the complete indicators and stdout carries a bounded summary', t => {
  const { parent, cwd } = rebaseStop(t, { upstream: lines('a', 'X', 'Y', 'b'), replayed: lines('a', 'X', 'b') });
  const record = path.join(parent, 'stop-1.json');
  const result = cli(cwd, ['conflicts', '--record', record]);
  assert.equal(result.status, 0);
  const full = JSON.parse(fs.readFileSync(record, 'utf8')).data.files[0].containment;
  assert.equal(full.incoming[0].same_subject.length, 1, 'the record lists the upstream commits');
  const summary = result.payload.data.files[0].containment;
  assert.deepEqual(summary.incoming, [{ sha: full.incoming[0].sha, subject: 'feat: add x', patch_id: false, same_subject: true, range_diff: '!' }]);
  assert.equal(summary.upstream_touching, 1);
  assert.deepEqual(summary.lines, { added: 1, present_on_other_side: 1, removed: 0, still_on_other_side: 0, missing: [] });
  assert.equal(result.payload.data.containment.operation, 'rebase');
  assert.equal(result.payload.data.files[0].before, undefined);
  assert.equal(result.payload.data.files[0].stage_checkout_preserves_combined_content[2], true, 'the safety check stays beside the indicators');
});

test('a file without all three stages carries commit evidence and no line indicators', t => {
  const { parent, cwd } = repository(t);
  commit(cwd, 'base', { 'f.txt': lines('a'), 'g.txt': lines('keep') });
  git(cwd, ['checkout', '-b', 'feature']);
  commit(cwd, 'feat: edit', { 'f.txt': lines('b') });
  git(cwd, ['checkout', 'main']);
  git(cwd, ['rm', '-q', 'f.txt']);
  git(cwd, ['commit', '-qm', 'chore: drop f']);
  assert.equal(git(cwd, ['merge', '--no-ff', '--no-commit', 'refs/heads/feature'], true).status, 1);
  const [file] = merge.conflicts(cwd).data.files;
  assert.equal(file.containment.lines, null);
  assert.equal(file.containment.incoming.length, 1);
  assert.ok(parent);
});

test('I3: --partial checks only the shortcut files of a mixed stop against the materialized stage', t => {
  const { cwd } = repository(t);
  commit(cwd, 'base', { 'f.txt': lines('a', 'b'), 'g.txt': lines('c', 'd') });
  git(cwd, ['checkout', '-b', 'feature']);
  commit(cwd, 'feat: add x', { 'f.txt': lines('a', 'X', 'b'), 'g.txt': lines('c', 'G1', 'd') });
  git(cwd, ['checkout', 'main']);
  commit(cwd, 'feat: add x', { 'f.txt': lines('a', 'X', 'Y', 'b'), 'g.txt': lines('c', 'G2', 'd') });
  git(cwd, ['checkout', 'feature']);
  assert.equal(git(cwd, ['rebase', 'main'], true).status, 1);
  const snapshot = merge.conflicts(cwd);
  assert.deepEqual(snapshot.data.files.map(file => file.path), ['f.txt', 'g.txt']);
  const payload = { selected_contextual_decisions: [], files: [{ path: 'f.txt', category: 'code', source: 'git-ours', regions: [], decisions: [] }] };
  const source = JSON.stringify({ status: 'completed', changed_files: [],
    summary: `Whole side for f.txt.\n\n## Complete resolution payload\n\`\`\`json\n${JSON.stringify(payload)}\n\`\`\`\n` });
  git(cwd, ['checkout', '--ours', '--', 'f.txt']);
  assert.equal(merge.checkResolution(cwd, snapshot, source, [], 'materialized').outcome, 'failure', 'a complete check still wants every file');
  assert.match(merge.checkResolution(cwd, snapshot, source, [], 'materialized').errors.join('\n'), /incomplete affected file inventory/);
  const partial = merge.checkResolution(cwd, snapshot, source, [], 'materialized', true);
  assert.equal(partial.outcome, 'success', partial.errors.join('\n'));
  assert.deepEqual(partial.checked_files, ['f.txt']);
  assert.equal(fs.readFileSync(path.join(cwd, 'f.txt'), 'utf8'), lines('a', 'X', 'Y', 'b'));
  git(cwd, ['checkout', '--theirs', '--', 'f.txt']);
  assert.equal(merge.checkResolution(cwd, snapshot, source, [], 'materialized', true).outcome, 'failure', 'a file that differs from the captured stage fails');
});

test('the resolution CLI accepts --partial', t => {
  const { parent, cwd } = rebaseStop(t, { upstream: lines('a', 'X', 'Y', 'b'), replayed: lines('a', 'X', 'b') });
  const record = path.join(parent, 'stop-1.json');
  const recordHash = cli(cwd, ['conflicts', '--record', record]).payload.record_hash;
  const payload = { selected_contextual_decisions: [], files: [{ path: 'f.txt', category: 'code', source: 'git-ours', regions: [], decisions: [] }] };
  const source = path.join(parent, 'source.json');
  const confirmed = path.join(parent, 'confirmed.json');
  fs.writeFileSync(source, JSON.stringify({ status: 'completed', changed_files: [],
    summary: `Whole side.\n\n## Complete resolution payload\n\`\`\`json\n${JSON.stringify(payload)}\n\`\`\`\n` }));
  fs.writeFileSync(confirmed, '[]');
  git(cwd, ['checkout', '--ours', '--', 'f.txt']);
  const result = cli(cwd, ['resolution', '--record', record, '--record-hash', recordHash, '--source', source, '--confirmed', confirmed, '--phase', 'materialized', '--partial']);
  assert.equal(result.status, 0, JSON.stringify(result.payload));
  assert.deepEqual(result.payload.checked_files, ['f.txt']);
});

test('I10: bundle --out writes the bundle to a record file and prints a summary with its hash', t => {
  const { parent, cwd } = rebaseStop(t, { upstream: lines('a', 'X', 'Y', 'b'), replayed: lines('a', 'X', 'b') });
  const record = path.join(parent, 'stop-1.json');
  const recordHash = cli(cwd, ['conflicts', '--record', record]).payload.record_hash;
  const args = ['bundle', '--record', record, '--record-hash', recordHash];
  const full = cli(cwd, args).payload;
  const out = path.join(parent, 'stop-1-bundle.json');
  const result = cli(cwd, [...args, '--out', out]);
  assert.equal(result.status, 0);
  assert.equal(result.payload.record, out);
  assert.equal(result.payload.record_hash, hash(fs.readFileSync(out)));
  assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')).data.files, full.data.files, 'the file holds the whole bundle');
  assert.deepEqual(result.payload.data.files, [{ path: 'f.txt', category: 'code', conflict_category: 'text', resolution: 'regions-or-whole-side', regions: 1 }]);
  assert.equal(cli(cwd, [...args, '--out', out]).status, 2, 'an existing file is never overwritten');
});

test('I3: merge-run@1 records the shortcut files as paths without duplicates', () => {
  const dir = '/tmp/claude-1000/sai/merge-1a2b';
  let result = machine.transition(machine.initialState, { kind: 'start', dir });
  for (const file of ['stop-1-shortcuts.md', 'stop-1-shortcuts.md', 'stop-2-shortcuts.md']) {
    result = machine.transition(result.state, { kind: 'record', ref: 'shortcut', path: `${dir}/${file}` });
  }
  assert.deepEqual(result.run.shortcuts, [`${dir}/stop-1-shortcuts.md`, `${dir}/stop-2-shortcuts.md`]);
});

test('I3, I5, I10: the coordinator card decides the shortcut once per stop and creates the worker lazily', () => {
  const card = read('sai/commands/merge/coordinator.md');
  const stop = card.slice(card.indexOf('## A conflict stop'), card.indexOf('## Final'));
  assert.match(stop, /\*\*Shortcut\.\*\*/);
  assert.match(stop, /stop-\{n\}-shortcuts\.md/);
  assert.match(stop, /`merge\.js resolution[^`]*--phase materialized --partial`/);
  assert.match(stop, /`record` \(`shortcut`\)/);
  assert.match(stop, /stage_checkout_preserves_combined_content/);
  assert.match(section(card, '## Resuming', '## Close'), /lists as a shortcut is not decided again/);
  assert.ok(stop.indexOf('**Shortcut.**') < stop.indexOf('**Strategy.**'), 'the shortcut precedes the worker');
  assert.match(card, /A run whose stops all take the shortcut and need no correction or renumbering plan creates no worker/);
  assert.match(card, /Create the worker when none exists, at the first step that needs judgment/);
});

test('I10: mechanics documents the indicators, the shortcut record formats, and the record-and-summary rule', () => {
  const mechanics = read('sai/commands/merge/mechanics.md');
  for (const text of ['Complete resolution payload', 'stop-{n}-confirmed.json', 'stop-{n}-shortcuts.md', '`--partial`', '`--out`',
    'patch_id', 'same_subject', 'range_diff', 'present_on_other_side']) {
    assert.ok(mechanics.includes(text), `mechanics documents ${text}`);
  }
  assert.match(mechanics, /output is large writes it to a record file[\s\S]*JSON summary/);
});
