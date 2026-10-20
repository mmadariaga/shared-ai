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
const {
  matrixWorkerRoster,
  __test: { validateClaudeWorkerBindings, validateOpencodeWorkerBindings },
} = require('../bin/install-flow.js');
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
  security: 'sai-5-security-worker',
  performance: 'sai-6-performance-worker',
  accessibility: 'sai-7-accessibility-worker',
  commit: 'sai-commit-worker',
  archive: 'sai-archive-worker',
  backfill: 'sai-backfill-worker',
  merge: 'sai-merge-worker',
};

const IMPLEMENT_WORKER_NAME = {
  'sai-3-red-worker': 'sai/commands/implement/red-worker.md',
  'sai-3-green-worker': 'sai/commands/implement/green-worker.md',
};

const WORKER_ROSTER = [
  ...Object.values(WORKER_NAME),
  'sai-direct-build-worker',
  ...Object.keys(IMPLEMENT_WORKER_NAME),
  'sai-4-review-worker',
];

const PHASE_CONTRACT_PATH = Object.freeze(Object.fromEntries(
  PHASE_ORDER.map(phase => [phase, `sai/commands/${phase}/worker.md`]),
));

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

function canonicalWorkerFetch(phase) {
  return `Fetch @${PHASE_CONTRACT_PATH[phase]} and follow it exactly.`;
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
    workerContract: PHASE_CONTRACT_PATH[phase],
    bindingStem: phase,
    claudeAgent: { name: workerName, model: 'claude-model', keyword: `claude-${phase}` },
    opencodeAgent: { name: workerName, model: 'opencode-model', keyword: `opencode-${phase}` },
  };
  return base;
}

function roleMatrixEntry(phase, workerName, workerContract) {
  return {
    phase,
    workerName,
    workerContract,
    bindingStem: phase,
    claudeAgent: { name: workerName, model: 'claude-model', keyword: `claude-${phase}` },
    opencodeAgent: { name: workerName, model: 'opencode-model', keyword: `opencode-${phase}` },
  };
}

function fullMatrixEntries() {
  return [
    ...PHASE_ORDER.map(phase => matrixEntry(phase)),
    roleMatrixEntry('direct-build', 'sai-direct-build-worker', 'sai/commands/explore/direct-build-worker.md'),
    roleMatrixEntry('red', 'sai-3-red-worker', 'sai/commands/implement/red-worker.md'),
    roleMatrixEntry('green', 'sai-3-green-worker', 'sai/commands/implement/green-worker.md'),
    roleMatrixEntry('review', 'sai-4-review-worker', 'sai/commands/review/worker.md'),
  ];
}

function defineMatrixOrNull(entries) {
  try {
    return defineWorkerMatrix(entries);
  } catch {
    return null;
  }
}

function isMatrixBindingDestination(projection, destinationRoot) {
  return path.relative(destinationRoot.sai, projection.destinationPath)
    .split(path.sep).join('/')
    .startsWith('orchestration/workers/bindings');
}

test('matrix expansion yields exactly thirteen worker bindings and thirteen managed agents per harness with no retired per-phase sources', () => {
  const manifest = loadInstallManifest(REPO_ROOT);
  for (const harness of ['claude', 'opencode']) {
    const destinationRoot = destinationRoots(path.join(os.tmpdir(), `sai-matrix-active-${harness}-`));
    const active = expandInstallManifest(manifest, { harness, repoRoot: REPO_ROOT, destinationRoot });

    const isMatrixBinding = projection =>
      isMatrixBindingDestination(projection, destinationRoot);
    const isMatrixAgent = projection =>
      projection.destinationPath.startsWith(destinationRoot.agents) &&
      WORKER_ROSTER.includes(path.basename(projection.destinationPath, '.md'));
    const bindingProjections = active.filter(isMatrixBinding);
    assert.equal(bindingProjections.length, 13,
      `${harness} should project exactly thirteen active worker bindings`);
    const phaseBindingNames = bindingProjections
      .map(projection => path.basename(projection.destinationPath))
      .filter(name => PHASE_ORDER.includes(name.replace(/-worker\.md$/, '')));
    assert.deepEqual(
      phaseBindingNames.sort(),
      PHASE_ORDER.map(workerBindingName).sort(),
      `${harness} phase bindings should cover exactly the canonical phases`
    );
    const implementBindingNames = bindingProjections
      .map(projection => path.basename(projection.destinationPath))
      .filter(name => ['red', 'green'].includes(name.replace(/-worker\.md$/, '')));
    assert.equal(implementBindingNames.length, 2,
      `${harness} should project exactly two implement-role bindings beside the phase bindings`);
    const directBuildBindingNames = bindingProjections
      .map(projection => path.basename(projection.destinationPath))
      .filter(name => ['direct-build'].includes(name.replace(/-worker\.md$/, '')));
    assert.equal(directBuildBindingNames.length, 1,
      `${harness} should project exactly one direct-build role binding beside the phase bindings`);
    const reviewBindingNames = bindingProjections
      .map(projection => path.basename(projection.destinationPath))
      .filter(name => ['review'].includes(name.replace(/-worker\.md$/, '')));
    assert.equal(reviewBindingNames.length, 1,
      `${harness} should project exactly one review role binding beside the phase bindings`);
    assert.equal(new Set(implementBindingNames).size, implementBindingNames.length,
      `${harness} implement bindings should carry distinct destination identities`);
    assert.equal(bindingProjections.some(projection =>
      path.basename(projection.destinationPath) === 'idea-list-render.md'), false,
    `${harness} must not project an idea-list-render binding from the matrix`);
    const allBindingNames = active
      .filter(projection => isMatrixBindingDestination(projection, destinationRoot))
      .map(projection => path.basename(projection.destinationPath));
    assert.equal(allBindingNames.length, 13,
      `${harness} should keep only the thirteen routed worker bindings in the matrix destination`);
    const ideaList = active.find(projection =>
      relSource(projection) === `sai/adapters/${harness}/idea-list-render.md`);
    assert.ok(ideaList, `${harness} should project the adapter idea-list render source outside the matrix`);
    assert.equal(
      normalizeDestination(ideaList.destinationPath, destinationRoot),
      `sai/adapters/${harness}/idea-list-render.md`
    );

    const agentProjections = active.filter(isMatrixAgent);
    assert.equal(agentProjections.length, 13,
      `${harness} should project exactly thirteen active managed agents`);
    assert.deepEqual(
      agentProjections.map(projection => path.basename(projection.destinationPath, '.md')).sort(),
      [...WORKER_ROSTER].sort(),
      `${harness} managed agents should be exactly the thirteen worker identities`
    );
    assert.equal(agentProjections.some(projection =>
      ['budget', 'executor', 'explore'].includes(path.basename(projection.destinationPath, '.md'))), false,
    `${harness} must not project support agents from the matrix`);
    const allAgentNames = active
      .filter(projection => projection.destinationPath.startsWith(destinationRoot.agents))
      .map(projection => path.basename(projection.destinationPath, '.md'));
    if (harness === 'claude') {
      assert.equal(['budget', 'executor', 'explore'].every(name => allAgentNames.includes(name)), false,
        'claude must keep its thirteen matrix agents only');
    } else {
      assert.equal(['budget-explorer', 'budget-executor', 'budget-subagent'].every(name => allAgentNames.includes(name)), true,
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
        (claudeText.match(new RegExp(`${canonicalWorkerFetch(phase).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')) || []).length,
        1,
        `claude ${phase} binding should carry exactly one canonical worker Fetch`
      );
      assert.equal(
        (opencodeText.match(new RegExp(`${canonicalWorkerFetch(phase).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')) || []).length,
        1,
        `opencode ${phase} binding should carry exactly one canonical worker Fetch`
      );
      assert.match(claudeText, /Agent\s*\(/,
        `claude ${phase} binding should preserve the Agent dispatch primitive`);
      assert.match(opencodeText, /task\s*\(/,
        `opencode ${phase} binding should preserve the task dispatch primitive`);
    }
    for (const [base, harness] of [[claudeBase, 'claude'], [opencodeBase, 'opencode']]) {
      const bindingsDir = path.join(base, 'sai', 'orchestration', 'workers', 'bindings');
      for (const [workerName, contract] of Object.entries(IMPLEMENT_WORKER_NAME)) {
        const matching = fs.readdirSync(bindingsDir)
          .filter(name => name.endsWith('-worker.md'))
          .filter(name => fs.readFileSync(path.join(bindingsDir, name), 'utf8')
            .includes(`Fetch @${contract} and follow it exactly.`));
        assert.equal(matching.length, 1,
          `${harness} should install exactly one implement binding for ${workerName}`);
        assert.match(fs.readFileSync(path.join(bindingsDir, matching[0]), 'utf8'),
          harness === 'claude' ? /Agent\s*\(/ : /task\s*\(/,
          `${harness} ${workerName} binding should preserve its harness dispatch primitive`);
      }
      const redFile = fs.readdirSync(bindingsDir)
        .find(name => fs.readFileSync(path.join(bindingsDir, name), 'utf8')
          .includes('Fetch @sai/commands/implement/red-worker.md and follow it exactly.'));
      const greenFile = fs.readdirSync(bindingsDir)
        .find(name => fs.readFileSync(path.join(bindingsDir, name), 'utf8')
          .includes('Fetch @sai/commands/implement/green-worker.md and follow it exactly.'));
      assert.ok(redFile && greenFile, `${harness} should install both RED and GREEN bindings`);
      assert.notEqual(redFile, greenFile,
        `${harness} RED and GREEN bindings must not share a destination file`);
    }
  } finally {
    fs.rmSync(claudeBase, { recursive: true, force: true });
    fs.rmSync(opencodeBase, { recursive: true, force: true });
  }
});

test('generated worker agents expose exactly one frontmatter block and one canonical worker Fetch', () => {
  const workerAgents = [
    ...Object.entries(WORKER_NAME),
    ['red', 'sai-3-red-worker'],
    ['green', 'sai-3-green-worker'],
  ];
  for (const [harness, install] of [['claude', installClaude], ['opencode', installOpencode]]) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), `sai-matrix-agents-${harness}-`));
    try {
      install(base);
      for (const [phase, workerName] of workerAgents) {
        const agentPath = path.join(base, 'agents', `${workerName}.md`);
        assert.equal(fs.existsSync(agentPath), true, `${harness} should install ${workerName} agent`);
        const text = fs.readFileSync(agentPath, 'utf8').replaceAll('\r\n', '\n');
        const bootstrap = harness === 'claude'
          ? 'Fetch @skills/fetch/SKILL.md'
          : 'Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.';
        const body = text.slice(text.indexOf('\n---\n') + '\n---\n'.length).trim();
        assert.equal(body.split('\n')[0], bootstrap,
          `${harness} ${workerName} agent should bootstrap fetch resolution before its worker contract`);
        assert.equal((text.match(/^---\r?\n/gm) || []).length, 2,
          `${harness} ${workerName} agent should contain exactly one frontmatter block`);
        assert.equal(
          (text.match(/^Fetch @sai\/commands\/[^\s`]+\.md and follow it exactly\.$/gm) || []).length,
          1,
          `${harness} ${workerName} agent should contain exactly one canonical worker Fetch`
        );
        assert.ok(text.includes(workerContractFor(workerName)),
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

function workerContractFor(workerName) {
  if (IMPLEMENT_WORKER_NAME[workerName]) return `Fetch @${IMPLEMENT_WORKER_NAME[workerName]} and follow it exactly.`;
  const phase = Object.entries(WORKER_NAME).find(([, name]) => name === workerName)[0];
  return `Fetch @${PHASE_CONTRACT_PATH[phase]} and follow it exactly.`;
}

test('design-only options stay out of every other binding in both harnesses', () => {
  for (const [harness, install] of [['claude', installClaude], ['opencode', installOpencode]]) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), `sai-matrix-design-${harness}-`));
    try {
      install(base);
      const bindingsDir = path.join(base, 'sai', 'orchestration', 'workers', 'bindings');
      for (const phase of PHASE_ORDER) {
        const text = fs.readFileSync(path.join(bindingsDir, workerBindingName(phase)), 'utf8');
        if (phase !== 'design') {
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
  const matrix = defineMatrixOrNull(fullMatrixEntries());
  assert.ok(matrix, 'the canonical entry set should validate');
  assert.equal(matrix.entries.length, 13,
    'the canonical entry set should carry thirteen entries');

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
    claudeStandaloneBinding: '{{phase}}/{{workerName}}',
    opencodeStandaloneBinding: '{{phase}}/{{workerName}}',
    claudeAgent: '{{phase}}/{{workerName}}',
    opencodeAgent: '{{phase}}/{{workerName}}',
  };
  const matrixForTemplates = defineMatrixOrNull(fullMatrixEntries());
  assert.ok(matrixForTemplates, 'the canonical entry set should validate before template checks');
  assert.throws(
    () => materializeWorkerMatrix(matrixForTemplates, { ...templates, opencodeBinding: undefined }),
    error => {
      const message = String(error && error.message || error);
      return message.includes('opencodeBinding');
    },
    'a missing harness template should be rejected naming the template'
  );
});

test('the canonical manifest declares the thirteen-entry matrix with the direct-build implementer followed by the RED, GREEN, and review workers', () => {
  const manifest = loadInstallManifest(REPO_ROOT);
  const entries = manifest['worker-matrix'].entries;
  assert.ok(Array.isArray(entries), 'the manifest should carry a worker-matrix entry list');
  assert.equal(entries.length, 13,
    'the canonical manifest should declare thirteen matrix entries');
  assert.deepEqual(entries.slice(0, PHASE_ORDER.length).map(entry => entry.phase), [...PHASE_ORDER],
    'the canonical phase identities should precede the role entries unchanged');
  assert.deepEqual(entries.slice(0, PHASE_ORDER.length).map(entry => entry.workerName), [...WORKER_NAMES],
    'the canonical worker identities should be unchanged');
  const roleEntries = entries.slice(PHASE_ORDER.length);
  assert.deepEqual(roleEntries.map(entry => entry.workerName),
    ['sai-direct-build-worker', 'sai-3-red-worker', 'sai-3-green-worker', 'sai-4-review-worker'],
    'the direct-build implementer should precede the RED, GREEN, and review workers');
  assert.deepEqual(roleEntries.map(entry => entry.phase), ['direct-build', 'red', 'green', 'review'],
    'each role entry should declare its own phase');
  assert.deepEqual(roleEntries.map(entry => entry.workerContract), [
    'sai/commands/explore/direct-build-worker.md',
    'sai/commands/implement/red-worker.md',
    'sai/commands/implement/green-worker.md',
    'sai/commands/review/worker.md',
  ], 'each role entry should pin its own contract');
  assert.equal(new Set(roleEntries.map(entry => entry.bindingStem)).size, roleEntries.length,
    'the role entries should carry unique binding stems');
  assert.equal(new Set(entries.map(entry => entry.workerName)).size, entries.length,
    'every manifest worker identity should be unique');
});

test('the harness binding validators require the thirteen-worker managed roster', () => {
  assert.deepEqual([...matrixWorkerRoster('claude')].sort(), [...WORKER_ROSTER].sort(),
    'the Claude roster derived from the canonical manifest should contain exactly the thirteen managed workers');
  assert.doesNotThrow(() => validateClaudeWorkerBindings(),
    'validateClaudeWorkerBindings should accept the thirteen-worker Claude roster');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-fourteen-roster-'));
  try {
    installOpencode(tmpDir);
    const roster = validateOpencodeWorkerBindings(
      path.join(tmpDir, 'sai', 'orchestration', 'workers', 'bindings'));
    const names = (Array.isArray(roster) ? roster : Object.keys(roster || {}))
      .map(entry => (typeof entry === 'string' ? entry : entry && entry.name))
      .sort();
    assert.deepEqual(names, [...WORKER_ROSTER].sort(),
      'the opencode binding roster should contain exactly the thirteen managed workers');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('install, doctor, and uninstall derive the thirteen-worker roster and retired destinations without projection-ID collisions', async () => {
  const manifest = loadInstallManifest(REPO_ROOT);
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-matrix-fourteen-parity-'));
  const claudeBase = path.join(projectRoot, 'claude');
  const opencodeBase = path.join(projectRoot, 'opencode');
  fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
  installClaude(claudeBase);
  installOpencode(opencodeBase);
  try {
    for (const [harness, base] of [['claude', claudeBase], ['opencode', opencodeBase]]) {
      const roots = destinationRoots(base);
      const active = expandInstallManifest(manifest, { harness, repoRoot: REPO_ROOT, destinationRoot: roots });
      const retired = expandRetirementManifest(manifest, { harness, repoRoot: REPO_ROOT, destinationRoot: roots });
      const retiredIds = retired.map(record => record.id);
      assert.equal(new Set(retiredIds).size, retiredIds.length,
        `${harness} retirement expansion should carry no projection-ID collision`);
      for (const projection of active) {
        assert.doesNotMatch(JSON.stringify([projection.id, projection.sourcePath, projection.destinationPath, projection.strategy]), /\{\{/,
          `${harness} should leave no unresolved matrix token in projection metadata`);
      }
      const bindings = active.filter(projection => isMatrixBindingDestination(projection, roots));
       assert.equal(bindings.length, 13, `${harness} should install thirteen worker bindings`);
      const agents = active.filter(projection =>
        projection.destinationPath.startsWith(roots.agents) &&
        WORKER_ROSTER.includes(path.basename(projection.destinationPath, '.md')));
       assert.equal(agents.length, 13, `${harness} should install thirteen managed agents`);
      const matrixDestinations = [...bindings, ...agents].map(projection => projection.destinationPath);
      assert.equal(new Set(matrixDestinations).size, matrixDestinations.length,
        `${harness} matrix projections should carry distinct destinations with no projection collision`);
      const activeNormalized = new Set(active.map(projection => normalizeDestination(projection.destinationPath, roots)));
      const retiredNormalized = new Set(retired.map(record => normalizeDestination(record.destinationPath, roots)));
      for (const destination of activeNormalized) {
        assert.equal(retiredNormalized.has(destination), false,
          `${harness} destination ${destination} must not be simultaneously active and retired`);
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
    assert.equal(code, 0, 'doctor should run cleanly on the thirteen-worker fixture');
    for (const [harness, base] of [['claude', claudeBase], ['opencode', opencodeBase]]) {
      const entries = harness === 'claude' ? enumerateClaude(base) : enumerateOpencode(base);
      const basenames = entries
        .filter(entry => entry.assetType === 'claude-managed-agent')
        .map(entry => path.basename(entry.dest, '.md'));
      assert.ok(WORKER_ROSTER.every(name => basenames.includes(name)),
        `${harness} uninstall should enumerate all thirteen managed workers`);
    }
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});
