'use strict';

// Runtime side of the call-note convention: both tools accept --note, ignore it,
// tolerate its absence, and reject malformed use as a usage error (exit 2).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TRANSFER = path.join(__dirname, '..', 'sai', 'tools', 'transfer.js');
const SAI_STATE = path.join(__dirname, '..', 'bin', 'sai-state.js');
const { sessionFile } = require(SAI_STATE);

function run(tool, args, input) {
  const result = spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8', input: input || '' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

const parsed = result => JSON.parse(result.stdout);
const withoutClock = ({ received_at: _ignored, ...rest }) => rest;

function transferDir() {
  const result = run(TRANSFER, ['open', '--note', 'open the test directory', '--harness', 'claude']);
  if (result.status !== 0) return null;
  return parsed(result).dir;
}

test('transfer.js: a noted call answers exactly as the same call without the note, and absence is tolerated', t => {
  const dir = transferDir();
  if (!dir) return t.skip('the Claude Code SAI temp root is not available here');
  try {
    const plain = run(TRANSFER, ['put', '--dir', dir, '--path', 'a.txt'], 'same bytes');
    const noted = run(TRANSFER, ['put', '--note', 'save the test file', '--dir', dir, '--path', 'b.txt'], 'same bytes');
    assert.equal(plain.status, 0, plain.stderr);
    assert.equal(noted.status, 0, noted.stderr);
    assert.equal(parsed(noted).sha256, parsed(plain).sha256);
    assert.deepEqual(Object.keys(parsed(noted)).sort(), Object.keys(parsed(plain)).sort());
    assert.doesNotMatch(noted.stdout, /save the test file/);
    for (const name of fs.readdirSync(dir)) {
      const file = path.join(dir, name);
      if (fs.statSync(file).isFile()) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /save the test file/, name);
    }
    assert.deepEqual(parsed(run(TRANSFER, ['live', '--note', 'check liveness', '--dir', dir])), parsed(run(TRANSFER, ['live', '--dir', dir])));
  } finally {
    run(TRANSFER, ['close', '--dir', dir]);
  }
});

test('transfer.js: a malformed note is a usage error', t => {
  const dir = transferDir();
  if (!dir) return t.skip('the Claude Code SAI temp root is not available here');
  try {
    for (const args of [
      ['live', '--note'],
      ['live', '--note', '--dir', dir],
      ['live', '--note', 'a', '--note', 'b', '--dir', dir],
      ['live', '--note', 'check', 'the', 'worker', '--dir', dir],
    ]) {
      const result = run(TRANSFER, args);
      assert.equal(result.status, 2, args.join(' '));
      assert.equal(parsed(result).ok, false, args.join(' '));
    }
  } finally {
    run(TRANSFER, ['close', '--dir', dir]);
  }
});

function session(label) {
  const key = `tool-call-notes-${label}-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const spawned = run(SAI_STATE, ['spawn', '--note', 'open the test session', '--key', key]);
  assert.equal(spawned.status, 0, spawned.stderr);
  return parsed(spawned).id;
}

test('sai-state: noted verbs answer and store exactly as the same calls without the note', () => {
  const plain = session('plain');
  const noted = session('noted');
  try {
    const event = JSON.stringify({ recordedList: ['demo'] });
    const a = run(SAI_STATE, ['emit', plain, 'explore-slice@1', '-'], event);
    const b = run(SAI_STATE, ['emit', '--note', 'record the inventory', noted, 'explore-slice@1', '-'], event);
    assert.equal(b.status, a.status, b.stderr);
    assert.deepEqual(withoutClock(parsed(b)), withoutClock(parsed(a)));
    const c = run(SAI_STATE, ['emit', plain, 'explore-slice@1', '--set', 'intent=publication']);
    const d = run(SAI_STATE, ['emit', '--note', 'read the publication answer', noted, 'explore-slice@1', '--set', 'intent=publication']);
    assert.deepEqual(withoutClock(parsed(d)), withoutClock(parsed(c)));
    const e = run(SAI_STATE, ['reset', plain, 'review-steps@1']);
    const f = run(SAI_STATE, ['reset', '--note', 'reset the review steps', noted, 'review-steps@1']);
    assert.deepEqual(withoutClock(parsed(f)), withoutClock(parsed(e)));
    const stored = id => JSON.parse(fs.readFileSync(sessionFile(id), 'utf8')).stateByMachine;
    assert.deepEqual(stored(noted), stored(plain));
    assert.doesNotMatch(fs.readFileSync(sessionFile(noted), 'utf8'), /record the inventory|reset the review steps/);
  } finally {
    run(SAI_STATE, ['close', plain]);
    assert.equal(run(SAI_STATE, ['close', '--note', 'close the test session', noted]).status, 0);
  }
});

test('sai-state: a malformed note and extra positionals are usage errors on every verb', () => {
  const id = session('malformed');
  try {
    for (const args of [
      ['emit', '--note'],
      ['emit', '--note', '--set', id, 'explore-slice@1'],
      ['emit', '--note=--set', id, 'explore-slice@1', '--set', 'intent=publication'],
      ['emit', '--note', 'a', '--note', 'b', id, 'explore-slice@1', '--set', 'intent=publication'],
      ['spawn', '--note', 'open', 'the', 'session', '--key', 'tool-call-notes-unused'],
      ['reset', '--note', 'reset', 'the', id, 'review-steps@1'],
      ['block', '--note', 'read', 'the', id, 'demo'],
      ['close', '--note', 'close', 'the', id],
    ]) {
      assert.equal(run(SAI_STATE, args).status, 2, args.join(' '));
    }
    assert.ok(fs.existsSync(sessionFile(id)), 'a rejected close leaves the session in place');
  } finally {
    run(SAI_STATE, ['close', id]);
  }
});
