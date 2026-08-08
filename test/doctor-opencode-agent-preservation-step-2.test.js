'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { PassThrough } = require('stream');

const { main } = require('../bin/doctor.js');
const { installOpencode } = require('../bin/install-flow.js');

const MANAGED_NAMES = [
  'sai-1-spec-proposal-worker',
  'sai-2-design-worker',
  'sai-3-implementation-worker',
  'sai-5-review-worker',
  'sai-6-security-worker',
  'sai-7-performance-worker',
  'sai-8-accessibility-worker',
];

function makeProjectRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-doctor-opencode-agents-'));
  fs.mkdirSync(path.join(dir, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
  return dir;
}

function absentPath(prefix) {
  return path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

function collectOutput() {
  const out = new PassThrough();
  const chunks = [];
  out.on('data', chunk => chunks.push(chunk));
  return { out, read: () => Buffer.concat(chunks).toString('utf8') };
}

async function runDoctor(projectRoot, opencodeBase) {
  const captured = collectOutput();
  const code = await main({
    argv: ['--json'],
    projectRoot,
    claudeBase: absentPath('sai-doctor-claude'),
    opencodeBase,
    execOpenspec: () => ({ status: 0, stdout: '1.4.1\n', stderr: '', error: null }),
    out: captured.out,
  });
  return { code, report: JSON.parse(captured.read()) };
}

function managedRecords(report) {
  const section = report['[Opencode]'];
  assert.ok(section, 'Opencode section should exist');
  const records = [];
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (!Array.isArray(value) && MANAGED_NAMES.includes(value.name)) records.push(value);
    for (const child of Object.values(value)) visit(child);
  };
  visit(section);
  return records;
}

function writeConfig(opencodeBase, content) {
  fs.mkdirSync(opencodeBase, { recursive: true });
  for (const filename of ['opencode.json', 'opencode.jsonc']) {
    const configPath = path.join(opencodeBase, filename);
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
  }
  if (content !== null) fs.writeFileSync(path.join(opencodeBase, 'opencode.jsonc'), content);
}

test('customized managed agents are accepted by name presence', async () => {
  const projectRoot = makeProjectRoot();
  const opencodeBase = path.join(projectRoot, 'opencode');
  try {
    installOpencode(opencodeBase);
    writeConfig(opencodeBase, JSON.stringify({ agent: {
      'sai-1-spec-proposal-worker': { mode: 'subagent', model: 'user-spec-model' },
      'sai-2-design-worker': { mode: 'subagent', model: 'user-design-model', variant: 'low' },
      'sai-3-implementation-worker': { mode: 'subagent', model: 'user-implementation-model', permission: { edit: 'deny' } },
      'sai-5-review-worker': { mode: 'subagent', model: 'user-review-model' },
      'sai-6-security-worker': { mode: 'subagent', model: 'user-security-model' },
      'sai-7-performance-worker': { mode: 'subagent', model: 'user-performance-model' },
      'sai-8-accessibility-worker': { mode: 'subagent', model: 'user-accessibility-model' },
    } }));

    const { code, report } = await runDoctor(projectRoot, opencodeBase);
    assert.equal(code, 0);
    const records = managedRecords(report);
    assert.deepEqual(records.map(record => record.name).sort(), [
      'sai-1-spec-proposal-worker',
      'sai-2-design-worker',
      'sai-3-implementation-worker',
      'sai-5-review-worker',
      'sai-6-security-worker',
      'sai-7-performance-worker',
      'sai-8-accessibility-worker',
    ]);
    for (const record of records) {
      assert.equal(record.severity, 'ok', `${record.name} should be ok`);
      assert.equal(/^\d+$/.test(String(record.name)), false, 'doctor should enumerate worker names, not numeric indexes');
    }
    assert.equal(records.some(record => record.severity === 'error' && /incompatible/i.test(record.message || '')), false);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('doctor and installer expose the same file-based worker roster', async () => {
  const projectRoot = makeProjectRoot();
  const opencodeBase = path.join(projectRoot, 'opencode');
  try {
    installOpencode(opencodeBase);
    for (const workerName of MANAGED_NAMES) {
      assert.ok(fs.existsSync(path.join(opencodeBase, 'agents', `${workerName}.md`)),
        `${workerName}.md should be projected under agents/ after install`);
    }
    const { code, report } = await runDoctor(projectRoot, opencodeBase);
    assert.equal(code, 0);

    const doctor = Object.fromEntries(
      managedRecords(report).map(record => [record.name, record]),
    );
    assert.deepEqual(Object.keys(doctor).sort(), [...MANAGED_NAMES].sort());
    for (const workerName of MANAGED_NAMES) {
      assert.equal(doctor[workerName].severity, 'ok',
        `${workerName} should be exact-compatible`);
    }
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('doctor flags a customized projected worker file while intact workers remain ok', async () => {
  const projectRoot = makeProjectRoot();
  const opencodeBase = path.join(projectRoot, 'opencode');
  try {
    installOpencode(opencodeBase);
    const workerPath = path.join(opencodeBase, 'agents', 'sai-2-design-worker.md');
    fs.writeFileSync(workerPath, 'user-customized worker body\n');

    const { code, report } = await runDoctor(projectRoot, opencodeBase);
    assert.equal(code, 1);
    const records = managedRecords(report);
    const customized = records.find(record => record.name === 'sai-2-design-worker');
    assert.ok(customized, 'design worker should be enumerated by name');
    assert.equal(customized.severity, 'error');
    assert.match(customized.message || '', /incompatible/i);
    for (const record of records) {
      if (record.name === 'sai-2-design-worker') continue;
      assert.equal(record.severity, 'ok', `${record.name} should remain ok`);
    }
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('missing projected worker file is reported while intact workers remain ok', async () => {
  const projectRoot = makeProjectRoot();
  const opencodeBase = path.join(projectRoot, 'opencode');
  try {
    installOpencode(opencodeBase);
    const workerPath = path.join(opencodeBase, 'agents', 'sai-3-implementation-worker.md');
    assert.ok(fs.existsSync(workerPath), 'the projected worker file should exist after install');
    fs.unlinkSync(workerPath);

    const { code, report } = await runDoctor(projectRoot, opencodeBase);
    assert.equal(code, 1);
    const records = managedRecords(report);
    const missing = records.find(record => record.name === 'sai-3-implementation-worker');
    assert.ok(missing, 'implementation worker should be enumerated by name');
    assert.equal(missing.severity, 'error');
    assert.match(missing.message || '', /missing/i);
    assert.match(missing.message || '', /re-?install/i,
      'a missing projected file should carry re-install remediation');
    for (const record of records) {
      if (record.name === 'sai-3-implementation-worker') continue;
      assert.equal(record.severity, 'ok', `${record.name} should remain ok`);
    }
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('doctor validation is independent of the opencode configuration agent map', async () => {
  const cases = [
    ['absent', null],
    ['unparsable', '{{ not valid jsonc'],
    ['non-object root', '[]'],
    ['malformed agent map', JSON.stringify({ agent: ['not', 'an', 'object'] })],
  ];

  for (const [label, content] of cases) {
    const projectRoot = makeProjectRoot();
    const opencodeBase = path.join(projectRoot, 'opencode');
    try {
      installOpencode(opencodeBase);
      writeConfig(opencodeBase, content);
      const { code, report } = await runDoctor(projectRoot, opencodeBase);
      assert.equal(code, 0, `${label}: intact projected files should keep doctor green`);
      const records = managedRecords(report);
      assert.equal(records.length, MANAGED_NAMES.length);
      for (const record of records) {
        assert.equal(record.severity, 'ok', `${label}: ${record.name}`);
      }
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  }
});

// --- Step 3: projected-file compatibility records ---

test('Step 3 doctor accepts seven exact-compatible projected worker agent files', async () => {
  const projectRoot = makeProjectRoot();
  const opencodeBase = path.join(projectRoot, 'opencode');
  try {
    installOpencode(opencodeBase);
    const { code, report } = await runDoctor(projectRoot, opencodeBase);
    assert.equal(code, 0);
    const records = managedRecords(report);
    assert.deepEqual(records.map(record => record.name).sort(), [...MANAGED_NAMES].sort());
    for (const record of records) {
      assert.equal(record.severity, 'ok',
        `specs/opencode-agent-preservation/spec.md: ${record.name} should be exact-compatible`);
    }
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('Step 3 doctor flags a missing projected worker agent file with re-install remediation', async () => {
  const projectRoot = makeProjectRoot();
  const opencodeBase = path.join(projectRoot, 'opencode');
  try {
    installOpencode(opencodeBase);
    const workerPath = path.join(opencodeBase, 'agents', 'sai-3-implementation-worker.md');
    assert.ok(fs.existsSync(workerPath),
      'the projected worker agent file should exist after install before the missing-file probe');
    fs.unlinkSync(workerPath);

    const { code, report } = await runDoctor(projectRoot, opencodeBase);
    assert.equal(code, 1);
    const record = managedRecords(report).find(entry => entry.name === 'sai-3-implementation-worker');
    assert.ok(record, 'implementation worker should be enumerated by name');
    assert.equal(record.severity, 'error');
    assert.match(record.message || '', /missing/i);
    assert.match(record.message || '', /re-?install/i,
      'specs/opencode-agent-preservation/spec.md: a missing projected file should carry re-install remediation');
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('Step 3 doctor flags an incompatible projected worker agent file', async () => {
  const projectRoot = makeProjectRoot();
  const opencodeBase = path.join(projectRoot, 'opencode');
  try {
    installOpencode(opencodeBase);
    const workerPath = path.join(opencodeBase, 'agents', 'sai-2-design-worker.md');
    fs.mkdirSync(path.dirname(workerPath), { recursive: true });
    fs.writeFileSync(workerPath, 'user-customized incompatible bytes\n');

    const { code, report } = await runDoctor(projectRoot, opencodeBase);
    assert.equal(code, 1);
    const record = managedRecords(report).find(entry => entry.name === 'sai-2-design-worker');
    assert.ok(record, 'design worker should be enumerated by name');
    assert.equal(record.severity, 'error');
    assert.match(record.message || '', /incompatible/i);
    assert.doesNotMatch(record.message || '', /rename|remove/i,
      'specs/opencode-agent-preservation/spec.md: an incompatible projected file must not carry rename-or-remove remediation');
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});
