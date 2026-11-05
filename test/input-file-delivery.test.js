'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { extractInputFile, readInputFile, readInput, InputFileError } = require('../sai/tools/input-reader');

const REPO = path.join(__dirname, '..');
const tool = (...parts) => path.join(REPO, ...parts);
const PAYLOAD = '{"intent":"x","text":"café \\"quoted\\" {brace} 日本語"}\n';

function scratch() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sai-input-file-'));
}

function run(script, args, input) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', input: input ?? '', cwd: REPO });
}

test('extractInputFile splits the flag out in both spellings and rejects misuse', () => {
  assert.deepEqual(extractInputFile(['select', '--input-file', '/a/b.json']), { argv: ['select'], inputFile: '/a/b.json' });
  assert.deepEqual(extractInputFile(['--input-file=/a/b.json', 'resolve', 'reg']), { argv: ['resolve', 'reg'], inputFile: '/a/b.json' });
  assert.deepEqual(extractInputFile(['select']), { argv: ['select'], inputFile: null });
  assert.throws(() => extractInputFile(['--input-file']), InputFileError);
  assert.throws(() => extractInputFile(['--input-file', 'a', '--input-file', 'b']), /more than once/);
});

test('E3 the input file bytes arrive exactly, quotes, braces and non-ASCII included', () => {
  const dir = scratch();
  try {
    const file = path.join(dir, 'in.json');
    fs.writeFileSync(file, PAYLOAD);
    assert.equal(readInputFile(file), PAYLOAD);
    assert.equal(readInput(file), PAYLOAD);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('E4 a missing or empty input file is an error naming the path', () => {
  const dir = scratch();
  try {
    const missing = path.join(dir, 'missing.json');
    const empty = path.join(dir, 'empty.json');
    fs.writeFileSync(empty, '');
    assert.throws(() => readInputFile(missing), error => error instanceof InputFileError && error.message.includes(missing));
    assert.throws(() => readInputFile(empty), error => error instanceof InputFileError && error.message.includes(empty) && /empty/.test(error.message));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('E1 and E2 the validator reads the same payload from the input file and from stdin', () => {
  const dir = scratch();
  try {
    const file = path.join(dir, 'progress.json');
    const payload = JSON.stringify({ event: 'progress', step_ids: ['a'], changed_files: [] });
    fs.writeFileSync(file, payload);
    const validator = tool('sai', 'tools', 'worker-report-validator.js');
    const fromFile = run(validator, ['validate', '--kind', 'progress', '--json', '--input-file', file]);
    const fromStdin = run(validator, ['validate', '--kind', 'progress', '--json'], payload);
    assert.equal(fromFile.status, 0, fromFile.stderr);
    assert.equal(fromStdin.status, 0, fromStdin.stderr);
    const strip = text => { const { received_at, ...rest } = JSON.parse(text); return rest; };
    assert.deepEqual(strip(fromFile.stdout), strip(fromStdin.stdout));
    const missing = run(validator, ['validate', '--kind', 'progress', '--json', '--input-file', path.join(dir, 'nope.json')]);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /nope\.json/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('E1 tool-access, ready-to-propose, from-next-backlog-item and the cache warmer take the input file', () => {
  const dir = scratch();
  try {
    const access = path.join(dir, 'access.json');
    fs.writeFileSync(access, JSON.stringify({ ladder_discards: [] }));
    const notices = run(tool('sai', 'tools', 'tool-access.js'), ['notices', '--input-file', access]);
    assert.equal(notices.status, 0, notices.stderr);
    assert.deepEqual(JSON.parse(notices.stdout), { notices: [] });

    const block = path.join(dir, 'issue.md');
    fs.writeFileSync(block, 'Some issue text with "quotes" and {braces}\n');
    const converted = run(tool('sai', 'tools', 'ready-to-propose.js'), ['convert', '--input-file', block]);
    assert.ok([0, 1].includes(converted.status), converted.stderr);
    assert.equal(typeof JSON.parse(converted.stdout), 'object');
    const absent = run(tool('sai', 'tools', 'ready-to-propose.js'), ['convert', '--input-file', path.join(dir, 'gone.md')]);
    assert.equal(absent.status, 2);
    assert.match(absent.stderr, /gone\.md/);

    const selection = path.join(dir, 'selection.json');
    fs.writeFileSync(selection, '{"cancel":true}');
    const selected = run(tool('sai', 'tools', 'from-next-backlog-item.js'), ['select', '--input-file', selection]);
    assert.equal(selected.status, 0, selected.stderr);
    assert.deepEqual(JSON.parse(selected.stdout), { status: 'cancelled' });

    const state = path.join(dir, 'state.json');
    fs.writeFileSync(state, JSON.stringify({ interval_ms: 60000, closing_ms: 0 }));
    const waited = run(tool('skills', 'universal', 'sai-cache-warmer', 'wait.js'), ['wait', '--input-file', state]);
    assert.equal(waited.status, 0, waited.stderr);
    assert.equal(JSON.parse(waited.stdout).status, 'finished');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('E1 commit apply reads its message from the input file and changes nothing when it is missing', () => {
  const dir = scratch();
  try {
    const missing = run(tool('sai', 'tools', 'commit.js'), ['apply', '--json', '--cwd', dir, '--input-file', path.join(dir, 'msg.txt')]);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /msg\.txt/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('E1 sai-state emit takes the event from an input file and reports a missing file without a transition', () => {
  const dir = scratch();
  try {
    const state = tool('bin', 'sai-state.js');
    const missing = run(state, ['emit', '00000000-0000-4000-8000-000000000000', 'explore-idea@1', '--input-file', path.join(dir, 'event.json')]);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /event\.json/);
    assert.match(missing.stderr, /no transition occurred/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('E1 transfer put saves the input file bytes exactly and keeps stdin; merge takes --input-file', () => {
  const root = scratch();
  try {
    const { open, close } = require('../sai/tools/transfer');
    const { dir } = open('claude');
    try {
      const bytes = Buffer.from(`${PAYLOAD}é\n`, 'utf8');
      const source = path.join(dir, 'report.draft.json');
      fs.writeFileSync(source, bytes);
      const transfer = tool('sai', 'tools', 'transfer.js');
      const viaFile = JSON.parse(run(transfer, ['put', '--dir', dir, '--path', 'a.json', '--input-file', source]).stdout);
      assert.equal(viaFile.ok, true);
      assert.deepEqual(fs.readFileSync(viaFile.path), bytes);
      const viaStdin = JSON.parse(run(transfer, ['put', '--dir', dir, '--path', 'b.json'], bytes.toString('utf8')).stdout);
      assert.equal(viaStdin.sha256, viaFile.sha256);
      const missing = run(transfer, ['put', '--dir', dir, '--path', 'c.json', '--input-file', path.join(dir, 'gone.json')]);
      assert.equal(missing.status, 2);
      assert.match(missing.stdout, /gone\.json/);
      assert.equal(fs.existsSync(path.join(dir, 'c.json')), false);
    } finally { close(dir); }

    const merge = run(tool('sai', 'tools', 'merge.js'), ['valid', '--json', '--cwd', root, '--input-file', path.join(root, 'receipt.json')]);
    assert.equal(merge.status, 2);
    assert.match(merge.stdout, /receipt\.json/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
