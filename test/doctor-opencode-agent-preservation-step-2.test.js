'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const childProcess = require('child_process');
const { PassThrough } = require('stream');
const jsonc = require('jsonc-parser');

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

function diagnosticRecords(report) {
  const section = report['[Opencode]'];
  assert.ok(section, 'Opencode section should exist');
  const records = [];
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (!Array.isArray(value) && typeof value.severity === 'string') records.push(value);
    for (const child of Object.values(value)) visit(child);
  };
  visit(section);
  return records;
}

function expectedPrompt(workerName) {
  return `Fetch @sai/orchestration/workers/${workerName}.md and follow it exactly.`;
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

test('doctor and installer expose the same prompt-bearing worker census', async () => {
  const projectRoot = makeProjectRoot();
  const opencodeBase = path.join(projectRoot, 'opencode');
  try {
    installOpencode(opencodeBase);
    const configName = fs.existsSync(path.join(opencodeBase, 'opencode.json'))
      ? 'opencode.json'
      : 'opencode.jsonc';
    const installed = jsonc.parse(fs.readFileSync(path.join(opencodeBase, configName), 'utf8'));
    const { code, report } = await runDoctor(projectRoot, opencodeBase);
    assert.equal(code, 0);

    const doctor = Object.fromEntries(
      managedRecords(report).map(record => [record.name, record]),
    );
    const installerNames = Object.keys(installed.agent).filter(name => MANAGED_NAMES.includes(name));
    assert.deepEqual(Object.keys(doctor).sort(), installerNames.sort());
    for (const workerName of MANAGED_NAMES) {
      assert.equal(installed.agent[workerName].prompt, expectedPrompt(workerName));
      assert.equal(doctor[workerName].prompt, expectedPrompt(workerName),
        `${workerName} should expose its canonical expected prompt`);
    }
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('doctor accepts a customized installed prompt while retaining canonical expected metadata', async () => {
  const projectRoot = makeProjectRoot();
  const opencodeBase = path.join(projectRoot, 'opencode');
  const customPrompt = 'User-owned prompt must remain unchanged';
  try {
    writeConfig(opencodeBase, JSON.stringify({ agent: {
      'sai-2-design-worker': { mode: 'subagent', model: 'user-design', prompt: customPrompt },
    } }));
    installOpencode(opencodeBase);
    const configPath = path.join(opencodeBase, 'opencode.jsonc');
    const beforeDoctor = jsonc.parse(fs.readFileSync(configPath, 'utf8'));
    assert.equal(beforeDoctor.agent['sai-2-design-worker'].prompt, customPrompt);

    const { code, report } = await runDoctor(projectRoot, opencodeBase);
    assert.equal(code, 0);
    const record = managedRecords(report).find(item => item.name === 'sai-2-design-worker');
    assert.equal(record.severity, 'ok');
    assert.equal(record.prompt, expectedPrompt('sai-2-design-worker'));
    const afterDoctor = jsonc.parse(fs.readFileSync(configPath, 'utf8'));
    assert.equal(afterDoctor.agent['sai-2-design-worker'].prompt, customPrompt);
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
    assert.ok(missing, 'implementation worker should be enumerated by name');
    assert.equal(missing.severity, 'error');
    assert.match(missing.message, /missing/i);
    const missingSpec = records.find(record => record.name === 'sai-1-spec-proposal-worker');
    assert.ok(missingSpec, 'spec worker should be enumerated by name');
    assert.equal(missingSpec.severity, 'error');
    assert.match(missingSpec.message, /missing/i);
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

test('doctor converts malformed census bindings into actionable error diagnostics', () => {
  const scratchRoot = path.join(__dirname, '..', '.tmp', 'retire-inline-harness-model', 'doctor-malformed-bindings');
  const script = `
    'use strict';
    const fs = require('fs');
    const path = require('path');
    const { PassThrough } = require('stream');
    const bindingsDir = path.join(process.cwd(), 'sai', 'orchestration', 'workers', 'bindings', 'opencode');
    const originalReaddirSync = fs.readdirSync;
    fs.readdirSync = (target, ...args) => typeof target === 'string' && path.resolve(target) === path.resolve(bindingsDir)
      ? []
      : originalReaddirSync(target, ...args);
    const { main } = require(${JSON.stringify(path.join(__dirname, '..', 'bin', 'doctor.js'))});
    const projectRoot = ${JSON.stringify(scratchRoot)};
    const opencodeBase = path.join(projectRoot, 'opencode');
    fs.rmSync(projectRoot, { recursive: true, force: true });
    fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
    fs.mkdirSync(opencodeBase, { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), 'schema: sai-workflow\\n');
     fs.writeFileSync(path.join(opencodeBase, 'opencode.jsonc'), JSON.stringify({ agent: {
      'sai-1-spec-proposal-worker': { mode: 'subagent', model: 'user-spec' },
      'sai-2-design-worker': { mode: 'subagent', model: 'user-design' },
      'sai-3-implementation-worker': { mode: 'subagent', model: 'user-implementation' },
      'sai-5-review-worker': { mode: 'subagent', model: 'user-review' },
      'sai-6-security-worker': { mode: 'subagent', model: 'user-security' },
      'sai-7-performance-worker': { mode: 'subagent', model: 'user-performance' },
      'sai-8-accessibility-worker': { mode: 'subagent', model: 'user-accessibility' },
    } }));
    const out = new PassThrough();
    const chunks = [];
    out.on('data', chunk => chunks.push(chunk));
    const visit = (value, records) => {
      if (!value || typeof value !== 'object') return;
      if (!Array.isArray(value) && typeof value.severity === 'string') records.push(value);
      for (const child of Object.values(value)) visit(child, records);
    };
    (async () => {
      const code = await main({
        argv: ['--json'],
         projectRoot,
         claudeBase: path.join(projectRoot, 'claude-missing'),
         opencodeBase,
         execOpenspec: () => ({ status: 0, stdout: '1.4.1\\n', stderr: '', error: null }),
        out,
      });
      const report = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const records = [];
      visit(report['[Opencode]'], records);
      process.stdout.write(JSON.stringify({ code, hasActionableError: records.some(record => record.severity === 'error' && /census|derive/i.test(String(record.name || '') + ' ' + String(record.message || ''))) }));
    })().catch(error => {
      process.stdout.write(JSON.stringify({ error: error.message }));
      process.exitCode = 1;
    });
  `;
  const result = childProcess.spawnSync(process.execPath, ['-e', script], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}\ndoctor diagnostic probe should run`);
  const observation = JSON.parse(result.stdout);
  assert.equal(observation.error, undefined, 'doctor should not throw while generating diagnostics');
  assert.equal(observation.code, 1, 'derivation failures should make doctor fail');
  assert.equal(observation.hasActionableError, true,
    'doctor should report an actionable census/binding diagnostic instead of throwing');
});

test('malformed census input fails before Opencode mutation and preserves unrelated diagnostics', () => {
  const projectRoot = makeProjectRoot();
  const opencodeBase = path.join(projectRoot, 'opencode');
  const configPaths = ['opencode.json', 'opencode.jsonc'].map(name => path.join(opencodeBase, name));
  try {
    installOpencode(opencodeBase);
    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    }
    const script = `
      'use strict';
      const fs = require('fs');
      const path = require('path');
      const { PassThrough } = require('stream');
      const bindingsDir = path.join(process.cwd(), 'sai', 'orchestration', 'workers', 'bindings', 'opencode');
      const originalReaddirSync = fs.readdirSync;
      fs.readdirSync = (target, ...args) => typeof target === 'string' && path.resolve(target) === path.resolve(bindingsDir)
        ? []
        : originalReaddirSync(target, ...args);
      const { main } = require(${JSON.stringify(path.join(__dirname, '..', 'bin', 'doctor.js'))});
      const out = new PassThrough();
      const chunks = [];
      out.on('data', chunk => chunks.push(chunk));
      (async () => {
        const code = await main({
          argv: ['--json'],
           projectRoot: ${JSON.stringify(projectRoot)},
           claudeBase: ${JSON.stringify(path.join(projectRoot, 'claude-missing'))},
           opencodeBase: ${JSON.stringify(opencodeBase)},
           execOpenspec: () => ({ status: 0, stdout: '1.4.1\\n', stderr: '', error: null }),
          out,
        });
        process.stdout.write(JSON.stringify({ code, report: JSON.parse(Buffer.concat(chunks).toString('utf8')) }));
      })().catch(error => {
        process.stdout.write(JSON.stringify({ error: error.message }));
        process.exitCode = 1;
      });
    `;
    const result = childProcess.spawnSync(process.execPath, ['-e', script], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    const observation = JSON.parse(result.stdout);
     assert.equal(observation.error, undefined);
     assert.equal(observation.code, 1);
     assert.ok(observation.report['[Claude Code]'], 'Claude diagnostics should still load');
     assert.equal(observation.report['[GitHub Copilot]'], undefined, 'retired Copilot diagnostics should be absent');
     assert.equal(fs.existsSync(configPaths[0]), false, 'doctor must not create opencode.json');
    assert.equal(fs.existsSync(configPaths[1]), false, 'doctor must not create opencode.jsonc');
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});
