'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PassThrough } = require('stream');

const {
  loadInstallManifest,
  expandInstallManifest,
  expandRetirementManifest,
} = require('../bin/install-manifest.js');
const { installClaude, installOpencode } = require('../bin/install-flow.js');
const { enumerateClaude, enumerateOpencode } = require('../bin/uninstall-flow.js');
const { main } = require('../bin/doctor.js');
const {
  PHASE_ORDER,
  defineWorkerMatrix,
  materializeWorkerMatrix,
} = require('../bin/worker-matrix.js');

const REPO_ROOT = path.join(__dirname, '..');

const WORKER_NAME = {
  spec: 'sai-1-spec-proposal-worker',
  design: 'sai-2-design-worker',
  implementation: 'sai-3-implementation-worker',
  review: 'sai-5-review-worker',
  security: 'sai-6-security-worker',
  performance: 'sai-7-performance-worker',
  accessibility: 'sai-8-accessibility-worker',
};

const WORKER_NAMES = Object.values(WORKER_NAME);

function destinationRoots(prefix) {
  return {
    commands: path.join(prefix, 'commands'),
    sai: path.join(prefix, 'sai'),
    skills: path.join(prefix, 'skills'),
    agents: path.join(prefix, 'agents'),
    config: prefix,
    root: prefix,
  };
}

function relSource(projection) {
  return path.relative(REPO_ROOT, projection.sourcePath).split(path.sep).join('/');
}

function isRetiredPerPhaseSource(source, harness) {
  if (source.startsWith(`sai/orchestration/workers/bindings/${harness}/`)) return true;
  return new RegExp(`^agents/${harness}/sai-\\d-.*-worker\\.md$`).test(source);
}

function canonicalWorkerFetch(workerName) {
  return `Fetch @sai/orchestration/workers/${workerName}.md and follow it exactly.`;
}

function normalizeDestination(destination, destinationRoot) {
  const root = Object.entries(destinationRoot)
    .sort((left, right) => right[1].length - left[1].length)
    .find(([, candidate]) => {
      const relative = path.relative(candidate, destination);
      return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
    });
  assert.ok(root, `destination should be under an install root: ${destination}`);
  return `${root[0]}/${path.relative(root[1], destination).split(path.sep).join('/')}`;
}

function isExcludedInventoryDestination(normalized) {
  if (normalized === 'sai/orchestration/workers/bindings/idea-list-render.md') return true;
  return /^agents\/(?:budget|executor|explore)\.md$/.test(normalized);
}

function workerBindingName(phase) {
  return `${phase}-worker.md`;
}

function matrixEntry(phase) {
  const workerName = WORKER_NAME[phase];
  const base = {
    phase,
    workerName,
    workerContract: `sai/orchestration/workers/${workerName}.md`,
    bindingStem: phase,
    dispatchPrimitive: 'task',
    initialDispatch: `dispatch ${workerName}`,
    continuationLiteral: `continue ${workerName}`,
    replacementFields: ['model'],
    helperPermissions: ['read'],
    progressDeclaration: `${phase} milestones`,
    claudeAgent: { name: workerName, model: 'claude-model', keyword: `claude-${phase}` },
    opencodeAgent: { name: workerName, model: 'opencode-model', keyword: `opencode-${phase}` },
  };
  if (phase === 'design') {
    base.overviewGeneration = true;
    base.noticeContinuation = true;
  }
  return base;
}

function fullMatrixEntries() {
  return PHASE_ORDER.map(phase => matrixEntry(phase));
}

test('matrix expansion yields exactly seven worker bindings and seven managed agents per harness with no retired per-phase sources', () => {
  const manifest = loadInstallManifest(REPO_ROOT);
  for (const harness of ['claude', 'opencode']) {
    const destinationRoot = destinationRoots(path.join(os.tmpdir(), `sai-matrix-active-${harness}-`));
    const active = expandInstallManifest(manifest, { harness, repoRoot: REPO_ROOT, destinationRoot });

    const isMatrixBinding = projection =>
      path.relative(destinationRoot.sai, projection.destinationPath)
        .split(path.sep).join('/')
        .startsWith('orchestration/workers/bindings') &&
      PHASE_ORDER.includes(path.basename(projection.destinationPath, '-worker.md'));
    const isMatrixAgent = projection =>
      projection.destinationPath.startsWith(destinationRoot.agents) &&
      WORKER_NAMES.includes(path.basename(projection.destinationPath, '.md'));
    const bindingProjections = active.filter(isMatrixBinding);
    assert.equal(bindingProjections.length, 7,
      `${harness} should project exactly seven active worker bindings`);
    assert.deepEqual(
      bindingProjections.map(projection => path.basename(projection.destinationPath)).sort(),
      PHASE_ORDER.map(workerBindingName).sort(),
      `${harness} worker bindings should cover exactly the seven canonical phases`
    );
    assert.equal(bindingProjections.some(projection =>
      path.basename(projection.destinationPath) === 'idea-list-render.md'), false,
    `${harness} must not project an idea-list-render binding from the matrix`);
    const allBindingNames = active
      .filter(projection => path.relative(destinationRoot.sai, projection.destinationPath)
        .split(path.sep).join('/').startsWith('orchestration/workers/bindings'))
      .map(projection => path.basename(projection.destinationPath));
    assert.equal(allBindingNames.includes('idea-list-render.md'), true,
      `${harness} should keep the regular idea-list-render binding beside the matrix bindings`);

    const agentProjections = active.filter(isMatrixAgent);
    assert.equal(agentProjections.length, 7,
      `${harness} should project exactly seven active managed agents`);
    assert.deepEqual(
      agentProjections.map(projection => path.basename(projection.destinationPath, '.md')).sort(),
      [...WORKER_NAMES].sort(),
      `${harness} managed agents should be exactly the seven worker identities`
    );
    assert.equal(agentProjections.some(projection =>
      ['budget', 'executor', 'explore'].includes(path.basename(projection.destinationPath, '.md'))), false,
    `${harness} must not project support agents from the matrix`);
    const allAgentNames = active
      .filter(projection => projection.destinationPath.startsWith(destinationRoot.agents))
      .map(projection => path.basename(projection.destinationPath, '.md'));
    if (harness === 'claude') {
      assert.equal(['budget', 'executor', 'explore'].every(name => allAgentNames.includes(name)), false,
        'claude must keep its seven matrix agents only');
    } else {
      assert.equal(['budget', 'executor', 'explore'].every(name => allAgentNames.includes(name)), true,
        'opencode should keep its three support agents beside the matrix agents');
    }

    for (const projection of [...bindingProjections, ...agentProjections]) {
      assert.equal(isRetiredPerPhaseSource(relSource(projection), harness), false,
        `${harness} worker projection must not source from a retired per-phase tree: ${relSource(projection)}`);
    }
    for (const projection of active) {
      assert.doesNotMatch(JSON.stringify([projection.id, projection.sourcePath, projection.destinationPath, projection.strategy]), /\{\{/,
        `${harness} should leave no unresolved matrix token in projection metadata`);
    }
  }
});

test('worker bindings land at identical neutral destinations and preserve the harness dispatch and canonical Fetch', () => {
  const claudeBase = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-matrix-neutral-claude-'));
  const opencodeBase = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-matrix-neutral-opencode-'));
  try {
    installClaude(claudeBase);
    installOpencode(opencodeBase);
    for (const phase of PHASE_ORDER) {
      const relative = path.join('sai', 'orchestration', 'workers', 'bindings', workerBindingName(phase));
      assert.equal(fs.existsSync(path.join(claudeBase, relative)), true,
        `claude should install ${relative}`);
      assert.equal(fs.existsSync(path.join(opencodeBase, relative)), true,
        `opencode should install ${relative}`);
      const claudeText = fs.readFileSync(path.join(claudeBase, relative), 'utf8');
      const opencodeText = fs.readFileSync(path.join(opencodeBase, relative), 'utf8');
      assert.equal(
        (claudeText.match(new RegExp(`${canonicalWorkerFetch(WORKER_NAME[phase]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')) || []).length,
        1,
        `claude ${phase} binding should carry exactly one canonical worker Fetch`
      );
      assert.equal(
        (opencodeText.match(new RegExp(`${canonicalWorkerFetch(WORKER_NAME[phase]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')) || []).length,
        1,
        `opencode ${phase} binding should carry exactly one canonical worker Fetch`
      );
      assert.match(claudeText, /Agent\s*\(/,
        `claude ${phase} binding should preserve the Agent dispatch primitive`);
      assert.match(opencodeText, /task\s*\(/,
        `opencode ${phase} binding should preserve the task dispatch primitive`);
    }
  } finally {
    fs.rmSync(claudeBase, { recursive: true, force: true });
    fs.rmSync(opencodeBase, { recursive: true, force: true });
  }
});

test('generated worker agents expose exactly one frontmatter block and one canonical worker Fetch', () => {
  for (const [harness, install] of [['claude', installClaude], ['opencode', installOpencode]]) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), `sai-matrix-agents-${harness}-`));
    try {
      install(base);
      for (const workerName of WORKER_NAMES) {
        const agentPath = path.join(base, 'agents', `${workerName}.md`);
        assert.equal(fs.existsSync(agentPath), true, `${harness} should install ${workerName} agent`);
        const text = fs.readFileSync(agentPath, 'utf8').replaceAll('\r\n', '\n');
        assert.equal((text.match(/^---\r?\n/gm) || []).length, 2,
          `${harness} ${workerName} agent should contain exactly one frontmatter block`);
        assert.equal(
          (text.match(/^Fetch @sai\/orchestration\/workers\/[^\s`]+\.md and follow it exactly\.$/gm) || []).length,
          1,
          `${harness} ${workerName} agent should contain exactly one canonical worker Fetch`
        );
        assert.ok(text.includes(canonicalWorkerFetch(workerName)),
          `${harness} ${workerName} agent should target its own worker contract`);
        assert.match(text, /^model:/m,
          `${harness} ${workerName} agent should retain its model tunable`);
        if (harness === 'claude') {
          assert.match(text, /^effort:/m,
            `claude ${workerName} agent should retain its effort tunable`);
        } else {
          assert.match(text, /^mode:/m,
            `opencode ${workerName} agent should retain its subagent mode`);
        }
      }
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }
});

test('design-only options are isolated to the design binding in both harnesses', () => {
  for (const [harness, install] of [['claude', installClaude], ['opencode', installOpencode]]) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), `sai-matrix-design-${harness}-`));
    try {
      install(base);
      const bindingsDir = path.join(base, 'sai', 'orchestration', 'workers', 'bindings');
      for (const phase of PHASE_ORDER) {
        const text = fs.readFileSync(path.join(bindingsDir, workerBindingName(phase)), 'utf8');
        if (phase === 'design') {
          assert.match(text, /overview/i, `${harness} design binding should carry the overview-generation option`);
          assert.match(text, /continue_after_notice/i, `${harness} design binding should carry the notice continuation option`);
        } else {
          assert.doesNotMatch(text, /overview/i,
            `${harness} ${phase} binding must not carry the design-only overview option`);
          assert.doesNotMatch(text, /continue_after_notice/i,
            `${harness} ${phase} binding must not carry the design-only notice continuation option`);
        }
      }
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }
});

function execOk() {
  return { status: 0, stdout: '1.4.1\n', stderr: '', error: null };
}

function collectOut() {
  const stream = new PassThrough();
  const chunks = [];
  stream.on('data', chunk => chunks.push(chunk));
  return { stream, text: () => Buffer.concat(chunks).toString() };
}

test('install, doctor, and uninstall enumerate the same matrix-derived inventories', async () => {
  const manifest = loadInstallManifest(REPO_ROOT);
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-matrix-parity-'));
  const claudeBase = path.join(projectRoot, 'claude');
  const opencodeBase = path.join(projectRoot, 'opencode');
  const claudeRoots = destinationRoots(claudeBase);
  const opencodeRoots = destinationRoots(opencodeBase);
  fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
  installClaude(claudeBase);
  installOpencode(opencodeBase);
  try {
    for (const [harness, base, roots] of [['claude', claudeBase, claudeRoots], ['opencode', opencodeBase, opencodeRoots]]) {
      const active = expandInstallManifest(manifest, { harness, repoRoot: REPO_ROOT, destinationRoot: roots });
      const retired = expandRetirementManifest(manifest, { harness, repoRoot: REPO_ROOT, destinationRoot: roots });
      const activeNormalized = new Set(active.map(projection => normalizeDestination(projection.destinationPath, roots)));
      const retiredNormalized = new Set(retired.map(record => normalizeDestination(record.destinationPath, roots)));
      for (const destination of activeNormalized) {
        assert.equal(retiredNormalized.has(destination), false,
          `${harness} destination ${destination} must not be simultaneously active and retired`);
      }
      const entries = harness === 'claude' ? enumerateClaude(base) : enumerateOpencode(base);
      const uninstallActive = entries
        .filter(entry => entry.assetType !== 'retired-managed-file')
        .map(entry => normalizeDestination(entry.dest, roots))
        .filter(destination => !isExcludedInventoryDestination(destination))
        .sort();
      const uninstallRetired = entries
        .filter(entry => entry.assetType === 'retired-managed-file')
        .map(entry => normalizeDestination(entry.dest, roots))
        .filter(destination => !isExcludedInventoryDestination(destination))
        .sort();
      assert.deepEqual(uninstallActive, [...activeNormalized].filter(destination => !isExcludedInventoryDestination(destination)).sort(),
        `${harness} uninstall active inventory should match the manifest expansion`);
      assert.deepEqual(uninstallRetired, [...retiredNormalized].filter(destination => !isExcludedInventoryDestination(destination)).sort(),
        `${harness} uninstall retired inventory should match the retirement expansion`);
    }

    for (const [harness, base] of [['claude', claudeBase], ['opencode', opencodeBase]]) {
      const roots = harness === 'claude' ? claudeRoots : opencodeRoots;
      const retired = expandRetirementManifest(manifest, { harness, repoRoot: REPO_ROOT, destinationRoot: roots });
      for (const record of retired) {
        fs.mkdirSync(path.dirname(record.destinationPath), { recursive: true });
        fs.writeFileSync(record.destinationPath, `parity retired bytes ${record.id}\n`);
      }
    }
    const capture = collectOut();
    const code = await main({
      argv: ['--json'],
      projectRoot,
      claudeBase,
      opencodeBase,
      execOpenspec: execOk,
      out: capture.stream,
    });
    assert.equal(code, 0, 'doctor should run cleanly on the parity fixture');
    const report = JSON.parse(capture.text());
    for (const [harness, base] of [['claude', claudeBase], ['opencode', opencodeBase]]) {
      const roots = harness === 'claude' ? claudeRoots : opencodeRoots;
      const section = report[harness === 'claude' ? '[Claude Code]' : '[Opencode]'];
      assert.ok(section, `${harness} doctor section should exist`);
      const warnings = section['retired-file'];
      assert.ok(Array.isArray(warnings), `${harness} doctor should expose retirement warnings`);
      const doctorRetired = new Set(warnings.map(warning => normalizeDestination(warning.destination || warning.path, roots))
        .filter(destination => !isExcludedInventoryDestination(destination)));
      const retired = expandRetirementManifest(manifest, { harness, repoRoot: REPO_ROOT, destinationRoot: roots });
      const expectedRetired = new Set(retired.map(record => normalizeDestination(record.destinationPath, roots))
        .filter(destination => !isExcludedInventoryDestination(destination)));
      assert.deepEqual([...doctorRetired].sort(), [...expectedRetired].sort(),
        `${harness} doctor retired-file inventory should match the retirement expansion`);
    }
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('missing, duplicated, or misassigned matrix entries fail at manifest expansion naming the harness and phase', () => {
  const manifest = loadInstallManifest(REPO_ROOT);
  const destinationRoot = destinationRoots(path.join(os.tmpdir(), 'sai-matrix-error-'));
  const cloneManifest = () => JSON.parse(JSON.stringify(manifest));
  const expand = tampered => expandInstallManifest(tampered, {
    harness: 'claude',
    repoRoot: REPO_ROOT,
    destinationRoot,
  });

  assert.doesNotThrow(() => expand(manifest), 'the real manifest expansion must throw nothing');
  assert.equal(defineWorkerMatrix(fullMatrixEntries()).entries.length, 7,
    'the canonical entry set should validate');

  const duplicated = cloneManifest();
  duplicated['worker-matrix'].entries[1] = JSON.parse(JSON.stringify(duplicated['worker-matrix'].entries[0]));
  assert.throws(
    () => expand(duplicated),
    error => {
      const message = String(error && error.message || error);
      return /duplicate/i.test(message) && message.includes('spec');
    },
    'a duplicated phase should be rejected by manifest expansion naming the phase'
  );

  const missingField = cloneManifest();
  delete missingField['worker-matrix'].entries[0].bindingStem;
  assert.throws(
    () => expand(missingField),
    error => {
      const message = String(error && error.message || error);
      return /missing/i.test(message) && message.includes('claude') && message.includes('spec');
    },
    'a missing phase parameter should be rejected by manifest expansion naming the harness and phase'
  );

  const misassigned = cloneManifest();
  misassigned['worker-matrix'].entries[0].workerName = WORKER_NAME.design;
  assert.throws(
    () => expand(misassigned),
    error => {
      const message = String(error && error.message || error);
      return message.includes('claude') && message.includes('spec') && /misassigned/i.test(message);
    },
    'a misassigned phase parameter should be rejected by manifest expansion naming the harness and phase'
  );

  for (const harness of ['claude', 'opencode']) {
    const harnessMisassigned = cloneManifest();
    harnessMisassigned['worker-matrix'].entries[0].workerName = WORKER_NAME.design;
    assert.throws(
      () => expandInstallManifest(harnessMisassigned, {
        harness,
        repoRoot: REPO_ROOT,
        destinationRoot,
      }),
      error => String(error && error.message || error).includes(harness),
      `a misassigned worker identity should be rejected naming ${harness}`
    );
  }

  const templates = {
    claudeBinding: '{{phase}}/{{workerName}}',
    opencodeBinding: '{{phase}}/{{workerName}}',
    claudeAgent: '{{phase}}/{{workerName}}',
    opencodeAgent: '{{phase}}/{{workerName}}',
  };
  assert.throws(
    () => materializeWorkerMatrix(defineWorkerMatrix(fullMatrixEntries()), { ...templates, opencodeBinding: undefined }),
    error => {
      const message = String(error && error.message || error);
      return message.includes('opencodeBinding');
    },
    'a missing harness template should be rejected naming the template'
  );
});
