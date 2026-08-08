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
} = require('../bin/install-flow.js');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');
const {
  enumerateClaude,
  buildDeletionSet,
  runDeletion,
} = require('../bin/uninstall-flow.js');

const repoRoot = path.join(__dirname, '..');

const MANAGED_WORKER_NAMES = [
  'sai-1-spec-proposal-worker',
  'sai-2-design-worker',
  'sai-3-implementation-worker',
  'sai-5-review-worker',
  'sai-6-security-worker',
  'sai-7-performance-worker',
  'sai-8-accessibility-worker',
];

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function stripTunableLines(text) {
  return text.split('\n').filter(line => !/^(model|effort|variant):/.test(line)).join('\n');
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
      'agents/claude/sai-3-implementation-worker.md',
    ],
    opencode: [
      'sai/orchestration/coordinator-contract.md',
      'sai/orchestration/worker-lifecycle.md',
      'sai/orchestration/workers/sai-3-implementation-worker.md',
      'sai/orchestration/workers/bindings/opencode/implementation-worker.md',
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
    const bindingSource = `sai/orchestration/workers/bindings/${harness}/implementation-worker.md`;
    const bindingProjection = projections.find(({ source }) => source === bindingSource);
    assert.ok(bindingProjection, `${harness} should project its harness-specific binding source`);
    assert.match(bindingProjection.destination.replace(/\\/g, '/'),
      /orchestration\/workers\/bindings\/implementation-worker\.md$/,
      `${harness} binding should project to the neutral relative path`);
    assert.doesNotMatch([...sources].join('\n'), /sai\/orchestration\/inline-invocation\.md/);
    if (harness === 'claude') {
      assert.equal(sources.has('sai/orchestration/workers/bindings/opencode/implementation-worker.md'), false);
    } else {
      assert.equal(sources.has('sai/orchestration/workers/bindings/claude/implementation-worker.md'), false);
      assert.equal(sources.has('agents/claude/sai-3-implementation-worker.md'), false);
    }
  }
});

test('a tuned Claude worker preserves its tunables across install and is removed by uninstall', () => {
  const base = tempDir('sai-step-3-claude-');
  try {
    installClaude(base);
    const workerPath = path.join(base, 'agents', 'sai-3-implementation-worker.md');
    const ownerPath = path.join(base, 'agents', '.sai-3-implementation-worker.owner.json');
    const sourceBytes = fs.readFileSync(workerPath);
    const tuned = fs.readFileSync(workerPath, 'utf8')
      .replace(/^model:.*$/m, 'model: tuned-model')
      .replace(/^effort:.*$/m, 'effort: tuned-effort');
    fs.writeFileSync(workerPath, tuned);

    let installError = null;
    try {
      installClaude(base);
    } catch (error) {
      installError = error;
    }
    assert.equal(installError, null, 're-install should not throw on a tuned destination');
    const after = fs.readFileSync(workerPath, 'utf8');
    assert.ok(after.includes('model: tuned-model') && after.includes('effort: tuned-effort'),
      'tuned values should survive a re-install');
    assert.equal(stripTunableLines(after), stripTunableLines(sourceBytes.toString('utf8')),
      'body and non-tunable frontmatter should match the source after a re-install');
    assert.equal(fs.existsSync(ownerPath), false, 'no owner sidecar should exist');

    runDeletion(enumerateClaude(base));
    assert.equal(fs.existsSync(workerPath), false,
      'a tuned body-matching worker should be deleted by uninstall');
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
     assert.deepEqual(parsed.permission, {
       bash: 'deny',
       external_directory: { '~/.config/opencode/sai/**': 'allow' },
     });
    assert.deepEqual(parsed.agent.custom, { mode: 'subagent', model: 'custom-model' });
    assert.deepEqual(parsed.agent.explore, { mode: 'subagent', model: 'user-explore' });
    assert.deepEqual(parsed.agent.executor, { mode: 'subagent', model: 'user-executor' });
    assert.deepEqual(parsed.agent.budget, { mode: 'subagent', model: 'user-budget' });
    const workerKeys = Object.keys(parsed.agent)
      .filter(key => key.startsWith('sai-') && key.endsWith('-worker'));
    assert.deepEqual(workerKeys, [],
      'specs/implementation-harness-bindings/spec.md: no agent.sai-*-worker key should be merged into the configuration');

    runDeletion(buildDeletionSet({
      claudeBase: path.join(base, 'missing-claude'),
      opencodeBase: base,
    }));
    assert.equal(fs.readFileSync(configPath, 'utf8'), installed,
      'uninstall should preserve the merged opencode configuration');
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('Step 3 overwrites incompatible Claude destinations with notice while preserving customized opencode workers', () => {
  const claudeBase = tempDir('sai-step-3-claude-collision-');
  const opencodeBase = tempDir('sai-step-3-opencode-collision-');
  const claudePath = path.join(claudeBase, 'agents', 'sai-3-implementation-worker.md');
  const opencodePath = path.join(opencodeBase, 'opencode.jsonc');
  const claudeSentinel = 'incompatible Claude worker\n';
  const opencodeSentinel = '{\n' +
    '  "permission": {\n' +
    '    "external_directory": {\n' +
    '      "~/.config/opencode/sai/**": "allow"\n' +
    '    }\n' +
    '  },\n' +
    '  "agent": {\n' +
    '    "explore": { "mode": "subagent", "model": "user-explore" },\n' +
    '    "executor": { "mode": "subagent", "model": "user-executor" },\n' +
    '    "budget": { "mode": "subagent", "model": "user-budget" },\n' +
    '    "sai-3-implementation-worker": { "mode": "subagent", "model": "user-model" }\n' +
    '  }\n' +
    '}\n';
  try {
    fs.mkdirSync(path.dirname(claudePath), { recursive: true });
    fs.writeFileSync(claudePath, claudeSentinel);
    const claudeNotices = [];
    const originalLog = console.log;
    try {
      console.log = message => claudeNotices.push(String(message));
      assert.doesNotThrow(() => installClaude(claudeBase),
        'installClaude should not throw on an incompatible Claude destination');
    } finally {
      console.log = originalLog;
    }
    assert.deepEqual(
      fs.readFileSync(claudePath),
      fs.readFileSync(path.join(repoRoot, 'agents', 'claude', 'sai-3-implementation-worker.md')),
      'the incompatible Claude worker should be overwritten with the managed source bytes');
    assert.ok(claudeNotices.some(message => message.includes(claudePath)),
      'stdout should announce the overwrite naming the file');

    fs.writeFileSync(opencodePath, opencodeSentinel);
    installOpencode(opencodeBase);
    assert.equal(fs.readFileSync(opencodePath, 'utf8'), opencodeSentinel,
      'the customized opencode configuration must be preserved byte-identical');
    const opencodeConfig = jsonc.parse(fs.readFileSync(opencodePath, 'utf8'));
    assert.deepEqual(opencodeConfig.agent['sai-3-implementation-worker'], {
      mode: 'subagent',
      model: 'user-model',
    }, 'no canonical prompt should be injected into the customized worker entry');
    const projectedAgentPath = path.join(opencodeBase, 'agents', 'sai-3-implementation-worker.md');
    assert.ok(fs.existsSync(projectedAgentPath),
      'the projected worker agent file should exist under agents/');

    const adr = fs.readFileSync(path.join(repoRoot, 'docs', 'adr', '0077-harness-specific-worker-bindings.md'), 'utf8');
    const boundaries = fs.readFileSync(path.join(repoRoot, 'docs', 'adr', '0088-implementation-harness-projection-boundaries.md'), 'utf8');
    const install = fs.readFileSync(path.join(repoRoot, 'INSTALL.opencode.md'), 'utf8');
    const documentation = [adr, boundaries, install].join('\n');
    assert.match(documentation, /sai-2-design-worker/);
    assert.match(documentation, /sai-3-implementation-worker/);
    assert.match(documentation, /tunable-seed/i);
    assert.match(documentation, /body[\s\S]{0,120}(?:non-tunable|frontmatter)|non-tunable[\s\S]{0,120}body/i);
    assert.match(documentation, /model.*variant.*mode.*permissions|configured.*runtime/i);
    assert.match(documentation, /no separate coordinator profile|no .*coordinator profile|never.*coordinator/i);
    assert.match(documentation, /Claude.*collision|collision.*Claude|non-opencode.*collision/i);
  } finally {
    fs.rmSync(claudeBase, { recursive: true, force: true });
    fs.rmSync(opencodeBase, { recursive: true, force: true });
  }
});

test('Step 3 ADR/INSTALL prose describes tunable-seed projections, body-identity uninstall, and helper-only merge', () => {
  const adr = fs.readFileSync(path.join(repoRoot, 'docs', 'adr', '0077-harness-specific-worker-bindings.md'), 'utf8');
  const boundaries = fs.readFileSync(path.join(repoRoot, 'docs', 'adr', '0088-implementation-harness-projection-boundaries.md'), 'utf8');
  const installGuide = fs.readFileSync(path.join(repoRoot, 'INSTALL.opencode.md'), 'utf8');
  const documentation = [adr, boundaries, installGuide].join('\n');
  for (const worker of MANAGED_WORKER_NAMES) {
    assert.match(documentation, new RegExp(worker),
      `specs/opencode-agent-preservation/spec.md: opencode documentation should describe the projected ${worker} agent file`);
  }
  assert.match(documentation, /tunable-seed/,
    'specs/opencode-agent-preservation/spec.md: opencode documentation should describe the tunable-seed lifecycle');
  assert.match(documentation, /body[\s\S]{0,120}(?:non-tunable|frontmatter)|non-tunable[\s\S]{0,120}body/i,
    'specs/opencode-agent-preservation/spec.md: opencode documentation should describe body-and-non-tunable identity');
  assert.doesNotMatch(documentation, /rename-or-remove|rename or remove/i,
    'specs/opencode-agent-preservation/spec.md: opencode documentation must not carry rename-or-remove remediation');
  assert.doesNotMatch(documentation, /\.owner\.json/,
    'specs/opencode-agent-preservation/spec.md: opencode documentation must not reference owner sidecars');
  assert.match(documentation, /uninstall/i);
  assert.match(documentation, /guard|identity/i,
    'specs/opencode-agent-preservation/spec.md: opencode documentation should describe guarded uninstall');
  assert.match(documentation, /explore|executor|budget/,
    'specs/opencode-agent-preservation/spec.md: opencode documentation should describe the helper-agent merge');
  assert.match(documentation, /permission/i,
    'specs/opencode-agent-preservation/spec.md: opencode documentation should describe the permission merge');
  assert.doesNotMatch(documentation, /customiz(?:ed|ation).{0,120}(?:preserv|retain)/i,
    'specs/opencode-agent-preservation/spec.md: opencode documentation must not claim customized worker definitions are preserved by name in the configuration');
});

test('Step 3 opencode manifest projects the seven managed worker agent files to the agents destination', () => {
  const projections = projectionSources('opencode');
  const bySource = new Map(projections.map(projection => [projection.source, projection]));
  for (const worker of MANAGED_WORKER_NAMES) {
    const source = `agents/opencode/${worker}.md`;
    const projection = bySource.get(source);
    assert.ok(projection, `opencode manifest should project ${source}`);
    assert.equal(path.basename(projection.destination), `${worker}.md`,
      `${source} should land at agents/${worker}.md`);
  }
});

test('Step 3 opencode agent files install with subagent frontmatter and the canonical contract body', () => {
  const base = tempDir('sai-step-3-opencode-agents-');
  try {
    installOpencode(base);
    for (const worker of MANAGED_WORKER_NAMES) {
      const agentPath = path.join(base, 'agents', `${worker}.md`);
      assert.ok(fs.existsSync(agentPath), `${worker}.md should be installed under agents/`);
      const content = fs.readFileSync(agentPath, 'utf8');
      assert.match(content, /^description:/m, `${worker} should declare a description`);
      assert.match(content, /^mode:\s*["']?subagent["']?$/m, `${worker} should declare subagent mode`);
      assert.match(content, /^model:/m, `${worker} should declare a model`);
      assert.match(content, /^permission:\s*$/m, `${worker} should declare a permission block`);
      assert.match(content, /^\s*task:/m, `${worker} should declare permission.task`);
      assert.ok(content.includes(`Fetch @sai/orchestration/workers/${worker}.md and follow it exactly.`),
        `${worker} body should fetch its worker contract`);
    }
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('Step 3 opencode uninstall removes managed unmodified worker files, preserves user edits, and leaves config untouched', () => {
  const base = tempDir('sai-step-3-opencode-uninstall-');
  try {
    installOpencode(base);
    const configPath = fs.existsSync(path.join(base, 'opencode.json'))
      ? path.join(base, 'opencode.json')
      : path.join(base, 'opencode.jsonc');
    const configBefore = fs.readFileSync(configPath, 'utf8');

    const editedPath = path.join(base, 'agents', 'sai-2-design-worker.md');
    assert.ok(fs.existsSync(editedPath), 'the managed worker agent file should exist after install');
    const edited = fs.readFileSync(editedPath, 'utf8') + '// user customization\n';
    fs.writeFileSync(editedPath, edited);

    runDeletion(buildDeletionSet({
      claudeBase: path.join(base, 'missing-claude'),
      opencodeBase: base,
    }));

    assert.equal(fs.readFileSync(editedPath, 'utf8'), edited,
      'specs/implementation-harness-bindings/spec.md: a user-edited worker agent file must be preserved by guarded uninstall');
    for (const worker of MANAGED_WORKER_NAMES) {
      if (worker === 'sai-2-design-worker') continue;
      assert.equal(fs.existsSync(path.join(base, 'agents', `${worker}.md`)), false,
        `specs/implementation-harness-bindings/spec.md: managed unmodified ${worker}.md should be removed by uninstall`);
    }
    assert.equal(fs.readFileSync(configPath, 'utf8'), configBefore,
      'specs/implementation-harness-bindings/spec.md: uninstall should leave the opencode configuration files untouched');
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});
