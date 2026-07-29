'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const jsonc = require('jsonc-parser');
const {
  REQUIRED_PROJECTION_FIELDS,
} = require('../fixtures/implementation-harness-bindings-step-3.js');

const {
  installClaude,
  installOpencode,
  copyOpencodeConfig,
  OPENCODE_MANAGED_AGENTS,
} = require('../bin/install-flow.js');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');
const {
  enumerateClaude,
  buildDeletionSet,
  runDeletion,
} = require('../bin/uninstall-flow.js');

const repoRoot = path.join(__dirname, '..');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function projectionSources(harness) {
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = {
    commands: tempDir('sai-step-3-commands-'),
    sai: tempDir('sai-step-3-sai-'),
    skills: tempDir('sai-step-3-skills-'),
    agents: tempDir('sai-step-3-agents-'),
    config: tempDir('sai-step-3-config-'),
  };
  try {
    return expandInstallManifest(manifest, { harness, repoRoot, destinationRoot })
      .map(projection => ({
        source: path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/'),
        destination: projection.destinationPath,
        strategy: projection.strategy,
      }));
  } finally {
    for (const root of Object.values(destinationRoot)) fs.rmSync(root, { recursive: true, force: true });
  }
}

test('canonical manifest keeps implementation projections interface returns the required projection record', () => {
  const projection = projectionSources('claude').find(({ source }) =>
    source === 'agents/claude/sai-3-implementation-worker.md');
  assert.ok(projection, 'Claude worker projection should exist');
  for (const field of REQUIRED_PROJECTION_FIELDS) {
    assert.ok(projection[field], `${field} should be populated`);
  }
});

test('Claude implementation coordinator uses low effort', () => {
  const wrapper = fs.readFileSync(path.join(repoRoot, 'commands', 'claude', 'sai-3-implement.md'), 'utf8');
  assert.match(wrapper, /^model:\s*opus\s*$/m);
  assert.match(wrapper, /^effort:\s*low\s*$/m);
});

test('Step 3 manifest projects the shared lifecycle and one active harness binding', () => {
  const expected = {
    claude: [
      'sai/orchestration/coordinator-contract.md',
      'sai/orchestration/worker-lifecycle.md',
      'sai/orchestration/workers/sai-3-implementation-worker.md',
      'sai/orchestration/workers/bindings/claude/implementation-worker.md',
      'skills/claude/sai-3-implementation-worker/SKILL.md',
      'agents/claude/sai-3-implementation-worker.md',
    ],
    opencode: [
      'sai/orchestration/coordinator-contract.md',
      'sai/orchestration/worker-lifecycle.md',
      'sai/orchestration/workers/sai-3-implementation-worker.md',
      'sai/orchestration/workers/bindings/opencode/implementation-worker.md',
      'skills/opencode/sai-3-implementation-worker/SKILL.md',
    ],
    copilot: [
      'sai/compat/sai-3-implementation-core.md',
      'sai/compat/implement-invocation.md',
    ],
  };

  for (const [harness, requiredSources] of Object.entries(expected)) {
    const projections = projectionSources(harness);
    const sources = new Set(projections.map(projection => projection.source));
    for (const source of requiredSources) {
      assert.ok(sources.has(source), `${harness} should project ${source}`);
    }
    assert.equal(new Set(projections.map(projection => projection.destination)).size, projections.length,
      `${harness} destinations should be unique`);
    if (harness === 'claude') {
      assert.equal(sources.has('sai/orchestration/workers/bindings/opencode/implementation-worker.md'), false);
    } else if (harness === 'opencode') {
      assert.equal(sources.has('sai/orchestration/workers/bindings/claude/implementation-worker.md'), false);
      assert.equal(sources.has('agents/claude/sai-3-implementation-worker.md'), false);
    } else {
      assert.deepEqual(
        [...sources].filter(source => source.startsWith('sai/orchestration/')).sort(),
        ['sai/orchestration/inline-invocation.md']
      );
      assert.equal([...sources].some(source => source.includes('/bindings/')), false);
      assert.equal([...sources].some(source => source.includes('/workers/')), false);
    }
  }
});

test('uninstall and doctor expose ownership guards by reusing an exact-compatible unowned Claude worker', () => {
  const base = tempDir('sai-step-3-claude-');
  try {
    installClaude(base);
    const workerPath = path.join(base, 'agents', 'sai-3-implementation-worker.md');
    const ownerPath = path.join(base, 'agents', '.sai-3-implementation-worker.owner.json');
    const beforeBytes = fs.readFileSync(workerPath);
    fs.unlinkSync(ownerPath);

    installClaude(base);
    assert.deepEqual(fs.readFileSync(workerPath), beforeBytes, 'compatible worker bytes should be reused');
    assert.equal(fs.existsSync(ownerPath), false, 'reused worker should remain unowned');

    runDeletion(enumerateClaude(base));
    assert.equal(fs.existsSync(workerPath), true, 'unowned compatible worker should survive uninstall');
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('preserves commented JSONC and non-SAI settings through namespaced opencode install and uninstall', () => {
  const base = tempDir('sai-step-3-opencode-');
  const fixture = [
    '// preserve this comment',
    '{',
    '  "theme": "dark",',
    '  "permission": { "bash": "deny" },',
    '  "agent": {',
    '    "explore": { "mode": "subagent", "model": "user-explore" },',
    '    "executor": { "mode": "subagent", "model": "user-executor" },',
    '    "budget": { "mode": "subagent", "model": "user-budget" },',
    '    "custom": { "mode": "subagent", "model": "custom-model" }',
    '  }',
    '}',
    '',
  ].join('\n');
  const configPath = path.join(base, 'opencode.jsonc');
  try {
    fs.writeFileSync(configPath, fixture);
    copyOpencodeConfig(base);

    const installed = fs.readFileSync(configPath, 'utf8');
    const parsed = jsonc.parse(installed);
    assert.ok(installed.includes('// preserve this comment'), 'existing comment should survive');
    assert.equal(parsed.theme, 'dark');
    assert.deepEqual(parsed.permission, { bash: 'deny' });
    assert.deepEqual(parsed.agent.custom, { mode: 'subagent', model: 'custom-model' });
    assert.deepEqual(parsed.agent.explore, { mode: 'subagent', model: 'user-explore' });
    assert.deepEqual(parsed.agent.executor, { mode: 'subagent', model: 'user-executor' });
    assert.deepEqual(parsed.agent.budget, { mode: 'subagent', model: 'user-budget' });
    for (const [key, shape] of Object.entries(OPENCODE_MANAGED_AGENTS)) {
      assert.deepEqual(parsed.agent[key], shape, `managed ${key} should be namespaced`);
    }

    runDeletion(buildDeletionSet({
      claudeBase: path.join(base, 'missing-claude'),
      opencodeBase: base,
      copilot: {
        promptsBase: path.join(base, 'missing-prompts'),
        skillsBase: path.join(base, 'missing-skills'),
        agentsBase: path.join(base, 'missing-agents'),
        saiBase: path.join(base, 'missing-sai'),
      },
    }));
    assert.equal(fs.readFileSync(configPath, 'utf8'), installed,
      'uninstall should preserve the merged opencode configuration');
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('Step 3 stops on incompatible Claude and opencode destinations without overwrite', () => {
  const claudeBase = tempDir('sai-step-3-claude-collision-');
  const opencodeBase = tempDir('sai-step-3-opencode-collision-');
  const claudePath = path.join(claudeBase, 'agents', 'sai-3-implementation-worker.md');
  const opencodePath = path.join(opencodeBase, 'opencode.jsonc');
  const claudeSentinel = 'incompatible Claude worker\n';
   const opencodeSentinel = '{\n  "agent": {\n    "sai-3-implementation-worker": { "mode": "subagent", "model": "user-model" }\n  }\n}\n';
  try {
    fs.mkdirSync(path.dirname(claudePath), { recursive: true });
    fs.writeFileSync(claudePath, claudeSentinel);
    assert.throws(() => installClaude(claudeBase), /collision|rename|remove/i);
    assert.equal(fs.readFileSync(claudePath, 'utf8'), claudeSentinel);

    fs.writeFileSync(opencodePath, opencodeSentinel);
    assert.throws(() => installOpencode(opencodeBase), /collision|rename|remove/i);
    assert.equal(fs.readFileSync(opencodePath, 'utf8'), opencodeSentinel);
  } finally {
    fs.rmSync(claudeBase, { recursive: true, force: true });
    fs.rmSync(opencodeBase, { recursive: true, force: true });
  }
});
