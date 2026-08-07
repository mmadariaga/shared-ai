'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

const flow = require('../bin/install-flow.js');

function sidecarPath(destinationPath) {
  return path.join(path.dirname(destinationPath), `.${path.basename(destinationPath, '.md')}.owner.json`);
}

function hex64() {
  return crypto.createHash('sha256').update(String(Math.random())).digest('hex');
}

function writeFixture(dir, options = {}) {
  const sourcePath = path.join(dir, 'source.md');
  const destinationPath = path.join(dir, 'installed', 'wrapper.md');
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.writeFileSync(sourcePath, '---\ndescription: Source command\nmodel: source-model\n---\n\nSource body.\n');
  fs.writeFileSync(destinationPath, '---\ndescription: Dest command\nmodel: tuned-model\n---\n\nDest body.\n');
  if (options.sidecar) {
    fs.writeFileSync(sidecarPath(destinationPath), options.sidecar);
  }
  if (options.dotfile) {
    fs.writeFileSync(path.join(path.dirname(destinationPath), options.dotfile.name), options.dotfile.content);
  }
  return { sourcePath, destinationPath };
}

function tunableSeedProjection(sourcePath, destinationPath) {
  return { strategy: 'tunable-seed', harness: 'claude', sourcePath, destinationPath };
}

test('matching sidecar is deleted on install', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-sidecar-match-'));
  try {
    const { sourcePath, destinationPath } = writeFixture(dir, {
      sidecar: JSON.stringify({ managedHash: hex64() }),
    });
    const sidecar = sidecarPath(destinationPath);
    assert.doesNotThrow(() => flow.installProjection(tunableSeedProjection(sourcePath, destinationPath), dir));
    assert.equal(fs.existsSync(sidecar), false,
      'a matching owner sidecar should be unlinked on install');
    assert.ok(fs.existsSync(destinationPath), 'the destination should remain installed');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('sidecar with extra keys is left alone', () => {
  assert.equal(typeof flow.deleteSidecarUnderShapeGuard, 'function',
    'deleteSidecarUnderShapeGuard should be exported');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-sidecar-extra-'));
  try {
    const { sourcePath, destinationPath } = writeFixture(dir, {
      sidecar: JSON.stringify({ managedHash: hex64(), extra: true }),
    });
    const sidecar = sidecarPath(destinationPath);
    assert.equal(flow.deleteSidecarUnderShapeGuard(destinationPath), false,
      'a sidecar with extra keys must not be unlinked');
    flow.installProjection(tunableSeedProjection(sourcePath, destinationPath), dir);
    assert.equal(fs.existsSync(sidecar), true,
      'a sidecar with extra keys should survive the install');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('non-sidecar dotfile is left alone while a matching sidecar is removed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-sidecar-dotfile-'));
  try {
    const { sourcePath, destinationPath } = writeFixture(dir, {
      sidecar: JSON.stringify({ managedHash: hex64() }),
      dotfile: { name: '.wrapper.notes.json', content: 'keep me' },
    });
    const sidecar = sidecarPath(destinationPath);
    const dotfile = path.join(path.dirname(destinationPath), '.wrapper.notes.json');
    flow.installProjection(tunableSeedProjection(sourcePath, destinationPath), dir);
    assert.equal(fs.existsSync(sidecar), false,
      'a matching owner sidecar should be unlinked on install');
    assert.equal(fs.readFileSync(dotfile, 'utf8'), 'keep me',
      'a non-sidecar dotfile should be preserved');
    assert.ok(fs.existsSync(destinationPath), 'the destination should remain installed');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('malformed sidecar is left alone', () => {
  assert.equal(typeof flow.deleteSidecarUnderShapeGuard, 'function',
    'deleteSidecarUnderShapeGuard should be exported');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-sidecar-malformed-'));
  try {
    const { sourcePath, destinationPath } = writeFixture(dir, {
      sidecar: '{"managedHash": ',
    });
    const sidecar = sidecarPath(destinationPath);
    assert.doesNotThrow(() => flow.deleteSidecarUnderShapeGuard(destinationPath),
      'a malformed sidecar must not throw');
    assert.equal(flow.deleteSidecarUnderShapeGuard(destinationPath), false,
      'a malformed sidecar must not be unlinked');
    flow.installProjection(tunableSeedProjection(sourcePath, destinationPath), dir);
    assert.equal(fs.existsSync(sidecar), true,
      'a malformed sidecar should survive the install');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function walkFiles(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walkFiles(full));
    else if (entry.isFile()) result.push(full);
  }
  return result;
}

test('the migration module is gone', () => {
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'bin', 'managed-worker-migration.js')), false,
    'bin/managed-worker-migration.js must not exist');
  const forbidden = [
    "require('.." + "/bin/managed-worker-migration.js')",
    "require('./managed" + "-worker-migration.js')",
    "require('../.." + "/bin/managed-worker-migration.js')",
  ];
  for (const file of [...walkFiles(path.join(__dirname, '..', 'bin')), ...walkFiles(path.join(__dirname, '..', 'test'))]) {
    const source = fs.readFileSync(file, 'utf8');
    for (const literal of forbidden) {
      assert.equal(source.includes(literal), false, `${path.relative(path.join(__dirname, '..'), file)} must not require the migration module`);
    }
  }
});

test('the legacy migration call site is gone', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'bin', 'install-flow.js'), 'utf8');
  assert.doesNotMatch(source, /migrateLegacyClaudeWorkers/);
});

test('install-flow no longer references the sidecar machinery — partial, completed in Step 3', { skip: 'pending Step 3 owner-constant removal' }, () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'bin', 'install-flow.js'), 'utf8');
  for (const identifier of ['OWNER_BY_CLAUDE_AGENT', 'CLAUDE_SPEC_WORKER_OWNER', 'CLAUDE_DESIGN_WORKER_OWNER', 'CLAUDE_IMPLEMENTATION_WORKER_OWNER', 'CLAUDE_REVIEW_WORKER_OWNER']) {
    assert.doesNotMatch(source, new RegExp(identifier));
  }
  const { MANAGED_WORKERS } = require('../bin/install-flow.js');
  for (const entry of Object.values(MANAGED_WORKERS)) {
    assert.equal(Object.hasOwn(entry.claude, 'owner'), false, 'MANAGED_WORKERS claude entries must not carry an owner field');
  }
});
