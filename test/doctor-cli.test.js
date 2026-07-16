'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { PassThrough } = require('stream');
const { spawnSync } = require('child_process');

const { main } = require('../bin/doctor.js');

function execOk() {
  return { status: 0, stdout: '1.4.1\n', stderr: '', error: null };
}

function execFail() {
  return { status: 1, stdout: '', stderr: '', error: null };
}

function collectOut() {
  const ps = new PassThrough();
  const chunks = [];
  ps.on('data', (c) => chunks.push(c));
  const end = () => Buffer.concat(chunks).toString();
  return { stream: ps, end };
}

function makeGoodFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-doctor-'));
  fs.mkdirSync(path.join(dir, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
  return dir;
}

// 1. Good fixture → JSON with ok severities, exit 0
test('main --json with healthy fixture produces three ok records and exits 0', async () => {
  const projectRoot = makeGoodFixture();
  try {
    const { stream: out, end } = collectOut();
    const code = await main({ argv: ['--json'], projectRoot, execOpenspec: execOk, out });
    assert.equal(code, 0);
    const raw = end();
    const parsed = JSON.parse(raw);
    const health = parsed['[Project health]'];
    assert.ok(Array.isArray(health), 'Project health should be an array');
    assert.equal(health.length, 3);
    for (const record of health) {
      assert.equal(record.severity, 'ok');
    }
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

// 2. Good fixture + failing openspec binary → error severity for binary, exit 1
test('main --json with failing openspec binary produces error for openspec binary and exits 1', async () => {
  const projectRoot = makeGoodFixture();
  try {
    const { stream: out, end } = collectOut();
    const code = await main({ argv: ['--json'], projectRoot, execOpenspec: execFail, out });
    assert.equal(code, 1);
    const raw = end();
    const parsed = JSON.parse(raw);
    const health = parsed['[Project health]'];
    const binaryRecord = health.find(r => r.id === 'openspec binary');
    assert.ok(binaryRecord, 'should have a record for openspec binary');
    assert.equal(binaryRecord.severity, 'error');
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

// 3. No openspec/ dir → error severity for directory, exit 1
test('main --json with missing openspec dir produces error for openspec directory and exits 1', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-doctor-'));
  try {
    const { stream: out, end } = collectOut();
    const code = await main({ argv: ['--json'], projectRoot: tmpDir, execOpenspec: execOk, out });
    assert.equal(code, 1);
    const raw = end();
    const parsed = JSON.parse(raw);
    const health = parsed['[Project health]'];
    const dirRecord = health.find(r => r.id === 'openspec directory');
    assert.ok(dirRecord, 'should have a record for openspec directory');
    assert.equal(dirRecord.severity, 'error');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// 4. config.yaml lacks schema: sai-workflow → error for workflow schema
test('main --json with config missing sai-workflow schema produces error for workflow schema', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-doctor-'));
  const configDir = path.join(tmpDir, 'openspec');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, 'config.yaml'), 'schema: other-schema\n');
  try {
    const { stream: out, end } = collectOut();
    const code = await main({ argv: ['--json'], projectRoot: tmpDir, execOpenspec: execOk, out });
    const raw = end();
    const parsed = JSON.parse(raw);
    const health = parsed['[Project health]'];
    const schemaRecord = health.find(r => r.id === 'workflow schema');
    assert.ok(schemaRecord, 'should have a record for workflow schema');
    assert.equal(schemaRecord.severity, 'error');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// 5. --help includes doctor
test('install.js --help lists doctor subcommand', () => {
  const result = spawnSync('node', [path.join(__dirname, '..', 'bin', 'install.js'), '--help']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.toString().includes('doctor'), '--help should list doctor');
});

// 6. Unknown subcommand exits 1 and lists all four
test('install.js bogus exits non-zero and prints available subcommands', () => {
  const result = spawnSync('node', [path.join(__dirname, '..', 'bin', 'install.js'), 'bogus']);
  assert.equal(result.status, 1);
  const stderr = result.stderr.toString();
  assert.ok(stderr.includes('install'), 'stderr should list install');
  assert.ok(stderr.includes('setup'), 'stderr should list setup');
  assert.ok(stderr.includes('uninstall'), 'stderr should list uninstall');
  assert.ok(stderr.includes('doctor'), 'stderr should list doctor');
});
