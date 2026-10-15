'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { resolveTempRoot, candidateRoot, TempRootError } = require('../sai/tools/temp-root');

function sandbox() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sai-temp-root-test-'));
}

test('opencode on Linux resolves to /tmp/opencode, every other pair to os.tmpdir()', () => {
  const tmpdir = () => '/somewhere/tmp';
  assert.equal(candidateRoot('opencode', { platform: 'linux', tmpdir }), '/tmp/opencode');
  assert.equal(candidateRoot('opencode', { platform: 'darwin', tmpdir }), '/somewhere/tmp');
  assert.equal(candidateRoot('opencode', { platform: 'win32', tmpdir }), '/somewhere/tmp');
  assert.equal(candidateRoot('claude', { platform: 'linux', tmpdir }), '/somewhere/tmp');
  assert.equal(candidateRoot('claude', { platform: 'win32', tmpdir }), '/somewhere/tmp');
});

test('an unknown harness is rejected', () => {
  assert.throws(() => candidateRoot('vscode', {}), /Expected harness: claude or opencode/);
});

test('an existing directory root resolves unchanged', () => {
  const root = sandbox();
  try {
    assert.equal(resolveTempRoot('claude', { platform: 'linux', tmpdir: () => root }), root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a missing root is a concrete blocker and is never created', () => {
  const parent = sandbox();
  const root = path.join(parent, 'missing');
  try {
    assert.throws(
      () => resolveTempRoot('claude', { platform: 'linux', tmpdir: () => root }),
      error => error instanceof TempRootError && error.code === 'TEMP_ROOT_MISSING' && error.message.includes(root) && /does not create or repair/.test(error.message),
    );
    assert.equal(fs.existsSync(root), false);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('a symbolic-link root and a file root are rejected', { skip: process.platform === 'win32' }, () => {
  const parent = sandbox();
  try {
    const real = path.join(parent, 'real');
    fs.mkdirSync(real);
    const link = path.join(parent, 'link');
    fs.symlinkSync(real, link);
    assert.throws(() => resolveTempRoot('claude', { platform: 'linux', tmpdir: () => link }), /not a symbolic link/);
    const file = path.join(parent, 'file');
    fs.writeFileSync(file, '');
    assert.throws(() => resolveTempRoot('claude', { platform: 'linux', tmpdir: () => file }), /not a symbolic link/);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('the opencode Linux root is checked on the injected filesystem and never created', () => {
  const calls = [];
  const io = {
    lstatSync(target) {
      calls.push(target);
      const error = new Error('missing');
      error.code = 'ENOENT';
      throw error;
    },
  };
  assert.throws(() => resolveTempRoot('opencode', { platform: 'linux', io }), error => error.code === 'TEMP_ROOT_MISSING' && error.message.includes('/tmp/opencode'));
  assert.deepEqual(calls, ['/tmp/opencode']);
});
