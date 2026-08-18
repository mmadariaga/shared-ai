'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const { PassThrough } = require('stream');

const { main } = require('../bin/doctor.js');
const { installClaude, installOpencode } = require('../bin/install-flow.js');
const { loadInstallManifest } = require('../bin/install-manifest.js');

function fixture() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-doctor-retirement-'));
  fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
  const claudeBase = path.join(projectRoot, 'claude');
  const opencodeBase = path.join(projectRoot, 'opencode');
  installClaude(claudeBase);
  installOpencode(opencodeBase);
  return { projectRoot, claudeBase, opencodeBase };
}

function execOk() {
  return { status: 0, stdout: '1.4.1\n', stderr: '', error: null };
}

function output() {
  const out = new PassThrough();
  const chunks = [];
  out.on('data', chunk => chunks.push(chunk));
  return { out, text: () => Buffer.concat(chunks).toString() };
}

function retiredCopy(claudeBase, contents = 'user-owned retired copy\n') {
  const destination = path.join(claudeBase, 'sai', 'commands', 'sai-2-design-inline.md');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, contents);
  return destination;
}

function adrRetiredCopy(claudeBase, contents = 'user-owned retired ADR template copy\n') {
  const destination = path.join(claudeBase, 'sai', 'compat', '_templates', 'adr-index.md');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, contents);
  return destination;
}

test('doctor reports every former worker proxy destination without changing locally modified content', async () => {
  const { projectRoot, claudeBase, opencodeBase } = fixture();
  const destinations = ['claude', 'opencode'].flatMap(harness => [
    [harness, 'skills', 'sai-1-spec-proposal-worker', 'SKILL.md'],
    [harness, 'skills', 'sai-2-design-worker', 'SKILL.md'],
    [harness, 'skills', 'sai-3-implementation-worker', 'SKILL.md'],
    [harness, 'skills', 'sai-5-review-worker', 'SKILL.md'],
    [harness, 'skills', 'sai-6-security-worker', 'SKILL.md'],
    [harness, 'skills', 'sai-7-performance-worker', 'SKILL.md'],
    [harness, 'skills', 'sai-8-accessibility-worker', 'SKILL.md'],
  ]);
  try {
    const paths = destinations.map(([harness, ...parts]) => {
      const base = harness === 'claude' ? claudeBase : opencodeBase;
      const destination = path.join(base, ...parts);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, 'locally modified retired content\n');
      return destination;
    });
    const { report } = await runJson(projectRoot, claudeBase, opencodeBase);
    for (const [index, destination] of paths.entries()) {
      const warning = retirementWarning(report, destination, destinations[index][0]);
      assert.equal(warning.recognized, false);
      assert.equal(fs.readFileSync(destination, 'utf8'), 'locally modified retired content\n');
    }
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

async function runJson(projectRoot, claudeBase, opencodeBase = path.join(projectRoot, 'missing-opencode')) {
  const capture = output();
  const code = await main({
    argv: ['--json'],
    projectRoot,
    claudeBase,
    opencodeBase,
    execOpenspec: execOk,
    out: capture.out,
  });
  return { code, report: JSON.parse(capture.text()) };
}

function retirementWarning(report, destination, harness = 'claude') {
  const section = report[harness === 'claude' ? '[Claude Code]' : '[Opencode]'];
  const warnings = section && section['retired-file'];
  assert.ok(Array.isArray(warnings), 'doctor should expose retirement warnings');
  const warning = warnings.find(record => record.destination === destination || record.path === destination);
  assert.ok(warning, 'doctor should identify the retired destination');
  return warning;
}

test('doctor reports an unrecognized retired copy without changing it', async () => {
  const { projectRoot, claudeBase } = fixture();
  try {
    const destination = retiredCopy(claudeBase);
    const before = fs.readFileSync(destination, 'utf8');
    const { code, report } = await runJson(projectRoot, claudeBase);

    assert.equal(code, 0);
    const warning = retirementWarning(report, destination);
    assert.equal(warning.severity, 'warn');
    assert.equal(warning.recognized, false);
    assert.match(warning.recommendation, /manually/i);
    assert.equal(fs.readFileSync(destination, 'utf8'), before);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('doctor recognizes current historical bytes for all 14 former worker proxy destinations', async () => {
  const { projectRoot, claudeBase, opencodeBase } = fixture();
  const workers = ['spec', 'design', 'implementation', 'review', 'security', 'performance', 'accessibility'];
  const workerNames = {
    spec: 'sai-1-spec-proposal-worker',
    design: 'sai-2-design-worker',
    implementation: 'sai-3-implementation-worker',
    review: 'sai-5-review-worker',
    security: 'sai-6-security-worker',
    performance: 'sai-7-performance-worker',
    accessibility: 'sai-8-accessibility-worker',
  };
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const historicalHashes = new Map();
  try {
    for (const [harness, base] of [['claude', claudeBase], ['opencode', opencodeBase]]) {
      for (const worker of workers) {
        const workerName = workerNames[worker];
        const destination = path.join(base, 'skills', workerName, 'SKILL.md');
        const contents = `historical ${harness} ${worker} proxy\n`;
        const retirement = manifest.retirements.find(record => record.id ===
          `retired-${harness}-${workerName}-proxy-skill`);
        assert.ok(retirement, `${harness} ${worker} proxy retirement should exist`);
        historicalHashes.set(contents, retirement.managedHashes[0]);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, contents);
      }
    }
    const originalCreateHash = crypto.createHash;
    crypto.createHash = () => ({
      update: bytes => ({
        digest: () => historicalHashes.get(bytes.toString()) ||
          originalCreateHash('sha256').update(bytes).digest('hex'),
      }),
    });
    let report;
    try {
      const result = await runJson(projectRoot, claudeBase, opencodeBase);
      report = result.report;
    } finally {
      crypto.createHash = originalCreateHash;
    }
    for (const [harness, base] of [['claude', claudeBase], ['opencode', opencodeBase]]) {
      for (const worker of workers) {
        const workerName = workerNames[worker];
        const destination = path.join(base, 'skills', workerName, 'SKILL.md');
        assert.equal(retirementWarning(report, destination, harness).recognized, true,
          `${harness} ${worker} retirement should be recognized`);
      }
    }
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('doctor reports a recognized former ADR-template copy through retirement state', async () => {
  const { projectRoot, claudeBase } = fixture();
  try {
    const destination = path.join(claudeBase, 'sai', 'compat', '_templates', 'adr-index.md');
    const source = path.join(__dirname, '..', 'sai', 'commands', 'implement', 'adr-index.template.md');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);

    const { report } = await runJson(projectRoot, claudeBase);
    const warning = retirementWarning(report, destination);
    assert.equal(warning.recognized, true);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('doctor preserves an unrecognized former ADR-template copy and gives manual-cleanup guidance', async () => {
  const { projectRoot, claudeBase } = fixture();
  try {
    const destination = adrRetiredCopy(claudeBase);
    const before = fs.readFileSync(destination, 'utf8');
    const { report } = await runJson(projectRoot, claudeBase);
    const warning = retirementWarning(report, destination);

    assert.equal(warning.recognized, false);
    assert.match(warning.recommendation, /manually/i);
    assert.equal(fs.readFileSync(destination, 'utf8'), before);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('doctor does not classify an unrecognized retired copy as missing or generic unexpected', async () => {
  const { projectRoot, claudeBase } = fixture();
  try {
    const destination = retiredCopy(claudeBase);
    const { report } = await runJson(projectRoot, claudeBase);
    const section = report['[Claude Code]'];

    assert.equal((section.files || []).some(record => record.severity === 'error' && record.path === destination), false);
    assert.equal((section.unexpected || []).some(record => record.path === destination), false);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('human doctor output identifies retired-copy cleanup and remains successful', async () => {
  const { projectRoot, claudeBase } = fixture();
  try {
    retiredCopy(claudeBase);
    const capture = output();
    const code = await main({
      argv: [],
      projectRoot,
      claudeBase,
      opencodeBase: path.join(projectRoot, 'missing-opencode'),
      execOpenspec: execOk,
      out: capture.out,
    });

    assert.equal(code, 0);
    assert.match(capture.text(), /retirement/i);
    assert.match(capture.text(), /manually/i);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('doctor inventory parity: the manifest derives exactly nine worker bindings and nine managed agents per harness', async () => {
  const { projectRoot, claudeBase, opencodeBase } = fixture();
  const { expandInstallManifest } = require('../bin/install-manifest.js');
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const phases = ['spec', 'design', 'implementation', 'review', 'security', 'performance', 'accessibility'];
  const workers = [
    'sai-1-spec-proposal-worker',
    'sai-2-design-worker',
    'sai-3-implementation-worker',
    'sai-5-review-worker',
    'sai-6-security-worker',
    'sai-7-performance-worker',
    'sai-8-accessibility-worker',
    'sai-4-red-worker',
    'sai-4-green-worker',
  ];
  try {
    for (const [harness, base] of [['claude', claudeBase], ['opencode', opencodeBase]]) {
      const destinationRoot = {
        commands: path.join(base, 'commands'),
        sai: path.join(base, 'sai'),
        skills: path.join(base, 'skills'),
        agents: path.join(base, 'agents'),
        config: base,
        root: base,
      };
      const active = expandInstallManifest(manifest, { harness, repoRoot: path.join(__dirname, '..'), destinationRoot });
      const bindingNames = active
        .filter(projection => path.relative(destinationRoot.sai, projection.destinationPath)
          .split(path.sep).join('/').startsWith('orchestration/workers/bindings/'))
        .map(projection => path.basename(projection.destinationPath));
      assert.equal(bindingNames.length, 9, `${harness} should project exactly nine worker bindings`);
      const phaseBindingNames = bindingNames.filter(name => phases.includes(name.replace(/-worker\.md$/, '')));
      assert.deepEqual(phaseBindingNames.sort(), phases.map(phase => `${phase}-worker.md`).sort(),
        `${harness} phase worker binding names should match the canonical phase matrix`);
      const agentNames = active
        .filter(projection => projection.destinationPath.startsWith(destinationRoot.agents) &&
          workers.includes(path.basename(projection.destinationPath, '.md')))
        .map(projection => path.basename(projection.destinationPath, '.md'));
      assert.equal(agentNames.length, 9, `${harness} should project exactly nine managed agents`);
      assert.deepEqual(agentNames.sort(), [...workers].sort(),
        `${harness} managed agent names should match the canonical worker matrix`);
    }
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('doctor reports an unrecognized retired apply body copy without deleting it', async () => {
  const { projectRoot, claudeBase, opencodeBase } = fixture();
  const { loadInstallManifest } = require('../bin/install-manifest.js');
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  try {
    for (const destinationPath of ['commands/apply/body.md', 'commands/apply/instructions.md']) {
      const records = manifest.retirements.filter(record =>
        record.destination.class === 'sai' && record.destination.path === destinationPath);
      assert.equal(records.length, 1,
        `specs/apply-routed-card-set/spec.md: exactly one retirement record should cover ${destinationPath}`);
      assert.deepEqual(records[0].harnesses.sort(), ['claude', 'opencode'],
        `specs/apply-routed-card-set/spec.md: ${destinationPath} should be retired for both harnesses`);
      assert.ok(records[0].managedHashes.length > 0,
        `specs/apply-routed-card-set/spec.md: ${destinationPath} should carry managed hashes`);
    }
    assert.equal(fs.existsSync(path.join(claudeBase, 'sai', 'commands', 'apply', 'body.md')), false,
      'specs/apply-routed-card-set/spec.md: a fresh install must not project the retired apply body card');

    const destination = path.join(claudeBase, 'sai', 'commands', 'apply', 'body.md');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, 'user-owned apply body copy\n');
    const before = fs.readFileSync(destination, 'utf8');
    const { code, report } = await runJson(projectRoot, claudeBase, opencodeBase);

    assert.equal(code, 0);
    const warning = retirementWarning(report, destination);
    assert.equal(warning.severity, 'warn');
    assert.equal(warning.recognized, false);
    assert.match(warning.recommendation, /manually/i);
    assert.equal(fs.readFileSync(destination, 'utf8'), before,
      'specs/apply-routed-card-set/spec.md: the user-modified retired copy must survive doctor untouched');
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});
