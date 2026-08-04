'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { PassThrough } = require('stream');

const { main } = require('../bin/doctor.js');
const { installOpencode } = require('../bin/install-flow.js');

const MANAGED_NAMES = ['sai-2-design-worker', 'sai-3-implementation-worker', 'sai-5-review-worker', 'sai-6-security-worker'];

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

function emptyCopilot() {
  return {
    promptsBase: absentPath('sai-doctor-copilot-prompts'),
    skillsBase: absentPath('sai-doctor-copilot-skills'),
    agentsBase: absentPath('sai-doctor-copilot-agents'),
    saiBase: absentPath('sai-doctor-copilot-sai'),
  };
}

async function runDoctor(projectRoot, opencodeBase) {
  const captured = collectOutput();
  const code = await main({
    argv: ['--json'],
    projectRoot,
    claudeBase: absentPath('sai-doctor-claude'),
    opencodeBase,
    copilot: emptyCopilot(),
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
      'sai-2-design-worker': { mode: 'subagent', model: 'user-design-model', variant: 'low' },
      'sai-3-implementation-worker': { mode: 'subagent', model: 'user-implementation-model', permission: { edit: 'deny' } },
      'sai-5-review-worker': { mode: 'subagent', model: 'user-review-model' },
      'sai-6-security-worker': { mode: 'subagent', model: 'user-security-model' },
    } }));

    const { code, report } = await runDoctor(projectRoot, opencodeBase);
    assert.equal(code, 0);
    const records = managedRecords(report);
    assert.deepEqual(records.map(record => record.name).sort(), [
      'sai-2-design-worker',
      'sai-3-implementation-worker',
      'sai-5-review-worker',
      'sai-6-security-worker',
    ]);
    for (const record of records) assert.equal(record.severity, 'ok', `${record.name} should be ok`);
    assert.equal(records.some(record => record.severity === 'error' && /incompatible/i.test(record.message || '')), false);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('missing managed agent is reported while present customized agents remain ok', async () => {
  const projectRoot = makeProjectRoot();
  const opencodeBase = path.join(projectRoot, 'opencode');
  try {
    installOpencode(opencodeBase);
    writeConfig(opencodeBase, JSON.stringify({ agent: {
      'sai-2-design-worker': { mode: 'subagent', model: 'user-design-model' },
      'sai-5-review-worker': { mode: 'subagent', model: 'user-review-model' },
    } }));

    const { code, report } = await runDoctor(projectRoot, opencodeBase);
    assert.equal(code, 1);
    const records = managedRecords(report);
    assert.equal(records.find(record => record.name === 'sai-2-design-worker').severity, 'ok');
    const missing = records.find(record => record.name === 'sai-3-implementation-worker');
    assert.equal(missing.severity, 'error');
    assert.match(missing.message, /missing/i);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('malformed Opencode configurations keep managed-agent records in error', async () => {
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
      const records = managedRecords(report);
      assert.equal(records.length, MANAGED_NAMES.length);
      for (const record of records) assert.equal(record.severity, 'error', `${label}: ${record.name}`);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  }
});
