'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { installProjection } = require('../bin/install-flow.js');
const { installClaude, installOpencode } = require('../bin/install-flow.js');
const { main: doctorMain } = require('../bin/doctor.js');

const WORKER_NAMES = [
  'sai-1-spec-proposal-worker',
  'sai-2-design-worker',
  'sai-3-implementation-worker',
  'sai-5-review-worker',
  'sai-6-security-worker',
  'sai-7-performance-worker',
  'sai-8-accessibility-worker',
];

function makeProjectRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-doctor-install-diagnostics-'));
  fs.mkdirSync(path.join(dir, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
  return dir;
}

function absentPath(prefix) {
  return path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

function collectOutput() {
  const { PassThrough } = require('stream');
  const out = new PassThrough();
  const chunks = [];
  out.on('data', chunk => chunks.push(chunk));
  return { out, read: () => Buffer.concat(chunks).toString('utf8') };
}

async function runDoctor(projectRoot, claudeBase, opencodeBase) {
  const captured = collectOutput();
  const code = await doctorMain({
    argv: ['--json'],
    projectRoot,
    claudeBase,
    opencodeBase,
    execOpenspec: () => ({ status: 0, stdout: '1.4.1\n', stderr: '', error: null }),
    out: captured.out,
  });
  return { code, report: JSON.parse(captured.read()) };
}

function findRecords(report, section) {
  const records = [];
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const child of value) visit(child);
      return;
    }
    if (typeof value.name === 'string' && typeof value.severity === 'string') {
      records.push(value);
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(report[section]);
  return records;
}

function captureOutput(fn) {
  const lines = [];
  const originalLog = console.log;
  const originalWrite = process.stdout.write;
  console.log = message => lines.push(String(message));
  process.stdout.write = (chunk, ...args) => {
    lines.push(String(chunk));
    return true;
  };
  try {
    fn();
  } finally {
    console.log = originalLog;
    process.stdout.write = originalWrite;
  }
  return lines;
}

function writeFixture(dir, sourceText, destText) {
  const sourcePath = path.join(dir, 'source.md');
  const destinationPath = path.join(dir, 'installed', 'wrapper.md');
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.writeFileSync(sourcePath, sourceText);
  fs.writeFileSync(destinationPath, destText);
  return { sourcePath, destinationPath };
}

test('divergent body produces a notice, not a throw', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-notice-'));
  try {
    const { sourcePath, destinationPath } = writeFixture(dir,
      '---\ndescription: Source command\nmodel: source-model\n---\n\nSource body.\n',
      '---\ndescription: Dest command\nmodel: tuned-model\n---\n\nDest body.\n');
    const projection = { strategy: 'tunable-seed', harness: 'claude', sourcePath, destinationPath };
    const printed = captureOutput(() => {
      assert.doesNotThrow(() => installProjection(projection, dir),
        'a divergent tunable-seed install should return normally');
    });
    assert.ok(printed.some(line => line.includes(destinationPath)),
      'a stdout notice should name the destination path when the body diverges');
    assert.ok(fs.readFileSync(destinationPath, 'utf8').includes('model: tuned-model'),
      'destination tunables should survive a divergent update');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('identical body produces no notice', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-quiet-'));
  try {
    const { sourcePath, destinationPath } = writeFixture(dir,
      '---\ndescription: Same\nmodel: source-model\n---\n\nbody\n',
      '---\ndescription: Same\nmodel: tuned-model\n---\n\nbody\n');
    const projection = { strategy: 'tunable-seed', harness: 'claude', sourcePath, destinationPath };
    const printed = captureOutput(() => installProjection(projection, dir));
    assert.ok(!printed.some(line => line.includes(destinationPath)),
      'no stdout notice should be printed when only tunables differ');
    const dest = fs.readFileSync(destinationPath, 'utf8');
    assert.ok(dest.includes('model: tuned-model'), 'the tunable pass should still apply');
    assert.ok(dest.includes('description: Same'), 'the body should match the source');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor accepts a destination whose only change is a tunable', async () => {
  const projectRoot = makeProjectRoot();
  const claudeBase = path.join(projectRoot, 'claude');
  const opencodeBase = path.join(projectRoot, 'opencode');
  try {
    installClaude(claudeBase);
    installOpencode(opencodeBase);
    const agentPath = path.join(opencodeBase, 'agents', 'sai-2-design-worker.md');
    const tuned = fs.readFileSync(agentPath, 'utf8')
      .replace(/^model:.*$/m, 'model: user-tuned-model')
      .replace(/^variant:.*$/m, 'variant: low');
    fs.writeFileSync(agentPath, tuned);

    const { code, report } = await runDoctor(projectRoot, claudeBase, opencodeBase);
    assert.equal(code, 0);
    const record = findRecords(report, '[Opencode]')
      .find(entry => entry.name === 'sai-2-design-worker');
    assert.ok(record, 'doctor should enumerate the tuned design worker');
    assert.equal(record.severity, 'ok',
      'a destination whose only change is a tunable should be accepted');
    assert.doesNotMatch(record.message || '', /\bmodel\b|\bvariant\b|\beffort\b/i,
      'the record message must not name the tunable key');
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('doctor flags a destination whose body changed without rename-or-remove remediation', async () => {
  const projectRoot = makeProjectRoot();
  const claudeBase = path.join(projectRoot, 'claude');
  const opencodeBase = path.join(projectRoot, 'opencode');
  try {
    installClaude(claudeBase);
    installOpencode(opencodeBase);
    const agentPath = path.join(opencodeBase, 'agents', 'sai-2-design-worker.md');
    fs.writeFileSync(agentPath, 'user-customized incompatible bytes\n');

    const { code, report } = await runDoctor(projectRoot, claudeBase, opencodeBase);
    assert.equal(code, 1);
    const record = findRecords(report, '[Opencode]')
      .find(entry => entry.name === 'sai-2-design-worker');
    assert.ok(record, 'doctor should enumerate the divergent design worker');
    assert.equal(record.severity, 'error');
    assert.ok((record.message || '').includes(agentPath) || record.message.includes('sai-2-design-worker.md'),
      'the error message should name the conflicting file');
    assert.doesNotMatch(record.message || '', /rename|remove/i,
      'the message must not carry rename-or-remove remediation wording');
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('doctor flags a missing destination with re-install remediation', async () => {
  const projectRoot = makeProjectRoot();
  const claudeBase = path.join(projectRoot, 'claude');
  const opencodeBase = path.join(projectRoot, 'opencode');
  try {
    installClaude(claudeBase);
    installOpencode(opencodeBase);
    const agentPath = path.join(opencodeBase, 'agents', 'sai-6-security-worker.md');
    assert.ok(fs.existsSync(agentPath), 'the projected worker should exist after install');
    fs.unlinkSync(agentPath);

    const { code, report } = await runDoctor(projectRoot, claudeBase, opencodeBase);
    assert.equal(code, 1);
    const record = findRecords(report, '[Opencode]')
      .find(entry => entry.name === 'sai-6-security-worker');
    assert.ok(record, 'doctor should enumerate the missing security worker');
    assert.equal(record.severity, 'error');
    assert.match(record.message || '', /re-?install/i,
      'a missing destination should carry re-install remediation');
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('doctor JSON output contains no sidecar records', async () => {
  const projectRoot = makeProjectRoot();
  const claudeBase = path.join(projectRoot, 'claude');
  const opencodeBase = path.join(projectRoot, 'opencode');
  try {
    installClaude(claudeBase);
    installOpencode(opencodeBase);
    const { code, report } = await runDoctor(projectRoot, claudeBase, opencodeBase);
    assert.equal(code, 0);
    const records = [
      ...findRecords(report, '[Claude Code]'),
      ...findRecords(report, '[Opencode]'),
    ];
    assert.ok(records.every(record => !/^\.sai-.*\.owner\.json$/.test(record.name)),
      'no record name may match a sidecar filename pattern');
    assert.ok(records.every(record => !(record.message || '').includes('.owner.json')),
      'no record message may reference an owner sidecar');
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('doctor reports every managed agent projection for both harnesses', async () => {
  const projectRoot = makeProjectRoot();
  const claudeBase = path.join(projectRoot, 'claude');
  const opencodeBase = path.join(projectRoot, 'opencode');
  try {
    installClaude(claudeBase);
    installOpencode(opencodeBase);
    const { code, report } = await runDoctor(projectRoot, claudeBase, opencodeBase);
    assert.equal(code, 0);
    for (const section of ['[Claude Code]', '[Opencode]']) {
      const names = findRecords(report, section)
        .map(record => record.name)
        .filter(name => WORKER_NAMES.includes(name));
      assert.deepEqual(names.sort(), [...WORKER_NAMES].sort(),
        `doctor should report all 7 managed agent projections in ${section}`);
    }
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});
