'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { PassThrough } = require('stream');

const { main, opencodeVersionRecords, opencodeConfigDepthRecords } = require('../bin/doctor.js');
const { installClaude, installOpencode } = require('../bin/install-flow.js');

function exec(stdout, extra = {}) {
  return () => ({ status: 0, stdout, stderr: '', error: null, ...extra });
}

test('opencode version below 2.2.0 is an error naming the installed and the minimum version', () => {
  for (const installed of ['2.1.9', '2.0.21', '1.9.9', '0.99.99']) {
    const [record] = opencodeVersionRecords(exec(`${installed}\n`));
    assert.equal(record.severity, 'error', installed);
    assert.match(record.message, new RegExp(installed.replace(/\./g, '\\.')));
    assert.match(record.message, /2\.2\.0/);
  }
});

test('opencode version at or above 2.2.0 is ok, comparing each part numerically', () => {
  for (const installed of ['2.2.0', '2.2.5', '2.10.0', '3.0.0']) {
    const [record] = opencodeVersionRecords(exec(`${installed}\n`));
    assert.equal(record.severity, 'ok', installed);
  }
});

test('the first X.Y.Z of the version output is the installed version', () => {
  const [record] = opencodeVersionRecords(exec('opencode v2.2.5 (build 1.0.0)\n'));
  assert.equal(record.severity, 'ok');
  assert.match(record.message, /2\.2\.5/);
});

test('an absent opencode binary is a warning that the version is unverified', () => {
  const missing = Object.assign(new Error('spawn opencode ENOENT'), { code: 'ENOENT' });
  for (const run of [
    () => ({ status: null, stdout: '', stderr: '', error: missing }),
    () => { throw missing; },
    () => ({ status: 127, stdout: '', stderr: 'not found', error: null }),
  ]) {
    const [record] = opencodeVersionRecords(run);
    assert.equal(record.severity, 'warn');
    assert.match(record.message, /unverified/);
  }
});

test('unparseable version output is a warning, not an error', () => {
  for (const out of ['', 'opencode dev build\n', '2.2\n']) {
    const [record] = opencodeVersionRecords(exec(out));
    assert.equal(record.severity, 'warn');
    assert.match(record.message, /unverified/);
  }
});

function tempConfigDir(config) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-doctor-depth-'));
  fs.writeFileSync(path.join(dir, 'opencode.json'), JSON.stringify(config));
  return dir;
}

test('the depth check requires experimental.subagent_depth even when a top-level subagent_depth is present', () => {
  const cases = [
    [{ subagent_depth: 2 }, 'top-level only'],
    [{ subagent_depth: 2, experimental: {} }, 'empty experimental'],
    [{ subagent_depth: 2, experimental: { subagent_depth: 1 } }, 'experimental below 2'],
    [{ subagent_depth: 2, experimental: 'nope' }, 'experimental not an object'],
    [{}, 'neither key'],
  ];
  for (const [config, label] of cases) {
    const dir = tempConfigDir(config);
    try {
      const [record] = opencodeConfigDepthRecords(dir);
      assert.equal(record.severity, 'error', label);
      assert.match(record.message, /experimental/, label);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('the depth check passes on experimental.subagent_depth >= 2 and ignores an invalid top-level key', () => {
  for (const config of [
    { experimental: { subagent_depth: 2 } },
    { experimental: { subagent_depth: 3 }, subagent_depth: 0 },
    { experimental: { subagent_depth: 2 }, subagent_depth: 'x' },
  ]) {
    const dir = tempConfigDir(config);
    try {
      const [record] = opencodeConfigDepthRecords(dir);
      assert.equal(record.severity, 'ok', JSON.stringify(config));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

async function runDoctor({ claudeBase, opencodeBase, execOpencode }) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-doctor-version-project-'));
  fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
  const out = new PassThrough();
  const chunks = [];
  out.on('data', chunk => chunks.push(chunk));
  try {
    const code = await main({
      argv: ['--json', '--offline'],
      projectRoot,
      claudeBase,
      opencodeBase,
      execOpenspec: exec('1.4.1\n'),
      execOpencode,
      out,
    });
    return { code, report: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
}

function absent(prefix) {
  return path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

function flatten(section) {
  const records = [];
  const visit = value => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') {
      if (typeof value.severity === 'string') records.push(value);
      Object.values(value).forEach(visit);
    }
  };
  visit(section);
  return records;
}

test('a Claude Code-only check never invokes the opencode binary', async () => {
  const claudeBase = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-doctor-version-claude-'));
  try {
    installClaude(claudeBase);
    let calls = 0;
    const { report } = await runDoctor({
      claudeBase,
      opencodeBase: absent('sai-doctor-version-opencode'),
      execOpencode: () => { calls += 1; return { status: 0, stdout: '1.0.0\n' }; },
    });
    assert.equal(calls, 0);
    assert.equal(flatten(report['[Opencode]']).some(r => r.name === 'opencode version'), false);
  } finally {
    fs.rmSync(claudeBase, { recursive: true, force: true });
  }
});

test('doctor reports the opencode version check only for an installed opencode harness', async () => {
  const opencodeBase = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-doctor-version-opencode-'));
  try {
    installOpencode(opencodeBase);
    const old = await runDoctor({ claudeBase: absent('sai-doctor-version-claude'), opencodeBase, execOpencode: exec('2.1.0\n') });
    const oldRecord = flatten(old.report['[Opencode]']).find(r => r.name === 'opencode version');
    assert.equal(oldRecord.severity, 'error');
    assert.equal(old.code, 1);

    const good = await runDoctor({ claudeBase: absent('sai-doctor-version-claude'), opencodeBase, execOpencode: exec('2.2.5\n') });
    const goodRecord = flatten(good.report['[Opencode]']).find(r => r.name === 'opencode version');
    assert.equal(goodRecord.severity, 'ok');
  } finally {
    fs.rmSync(opencodeBase, { recursive: true, force: true });
  }
});
