'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const commands = [
  ['sai-1-spec.md', 'spec'],
  ['sai-2-design.md', 'design'],
  ['sai-3-implement.md', 'implement'],
  ['sai-4-review.md', 'review'],
  ['sai-5-security.md', 'security'],
  ['sai-6-performance.md', 'performance'],
  ['sai-7-accessibility.md', 'accessibility'],
  ['sai-archive.md', 'archive'],
  ['sai-backfill.md', 'backfill'],
  ['sai-build.md', 'build'],
  ['sai-commit.md', 'commit'],
  ['sai-deep-review.md', 'deep-review'],
  ['sai-explore.md', 'explore'],
  ['sai-merge.md', 'merge'],
  ['sai-plan.md', 'plan'],
  ['sai-retire-docs.md', 'retire-docs'],
  ['sai-status.md', 'status'],
  ['sai-worktree.md', 'worktree'],
];
// Every command runs outside the shared orchestration: the wrappers fetch the
// harness skill and the command's card directly, with no boot adapter and no
// command bootstrap. Most commands load a `coordinator.md`; the four utility
// commands (explore, retire-docs, status, worktree) load their `body.md`. The
// three audits share one coordinator, `sai/commands/audit/coordinator.md`.
const AUDIT_WRAPPERS = new Set(['sai-5-security.md', 'sai-6-performance.md', 'sai-7-accessibility.md']);
const DIRECT_COORDINATOR = new Set([
  'sai-1-spec.md', 'sai-2-design.md', 'sai-plan.md', 'sai-3-implement.md', 'sai-4-review.md', 'sai-build.md',
  'sai-deep-review.md', 'sai-merge.md', 'sai-commit.md', 'sai-archive.md', 'sai-backfill.md', ...AUDIT_WRAPPERS,
]);
const BODY_WRAPPERS = new Set(['sai-explore.md', 'sai-retire-docs.md', 'sai-status.md', 'sai-worktree.md']);
function activeWrapperCommands(harness) {
  const directory = path.join(repoRoot, 'commands', harness);
  const foldersByFile = new Map(commands);
  return fs.readdirSync(directory)
    .filter(file => /^sai-.*\.md$/.test(file))
    .sort()
    .map(file => [file, foldersByFile.get(file)]);
}

const CONTEXT_PRESERVING = new Set(['sai-context-cache-ttl-benchmark.md']);
const wrapperCommands = activeWrapperCommands('claude').filter(([file]) => !CONTEXT_PRESERVING.has(file));

function read(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

// Scan scope only: immutable history is excluded from the wrapper_echo_value
// surface scan.
const IMMUTABLE_HISTORY = [
  /^docs\/(?:adr|ddr)\//,
  /^openspec\/changes\//,
  /^openspec\/specs\/_archived\//,
];

function activeSurfaceFiles(root) {
  const files = [];
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      const relativePath = path.relative(root, fullPath).split(path.sep).join('/');
      if (IMMUTABLE_HISTORY.some(pattern => pattern.test(relativePath))) continue;
      if (entry.isDirectory()) {
        // Stryker's root sandbox contains generated copies, not active contracts.
        if (relativePath === '.stryker-tmp') continue;
        if (['.git', 'node_modules', '.tmp', 'test', 'fixtures'].includes(entry.name)) continue;
        visit(fullPath);
      } else if (entry.isFile() && /\.(?:md|js|cjs|mjs|json|jsonc|ya?ml|sh|ps1|cmd|bat|txt)$/.test(entry.name)) {
        files.push({ relativePath, contents: fs.readFileSync(fullPath, 'utf8') });
      }
    }
  };
  visit(root);
  return files;
}

function activeWrapperEchoReferences(root) {
  return activeSurfaceFiles(root).flatMap(({ relativePath, contents }) => contents
    .split(/\r?\n/)
    .map((line, index) => line.includes('wrapper_echo_value')
      ? { file: relativePath, line: index + 1 }
      : null)
    .filter(Boolean));
}

function fetchLines(source) {
  return source
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('Fetch @'));
}

test('baseline fixture captures the pre-change directive inventory', () => {
  const fixture = JSON.parse(read('fixtures/thin-command-wrappers-baseline.json'));
  assert.deepEqual(fixture.command_files, commands.map(([file]) => file));
  for (const harness of ['claude', 'opencode']) {
    for (const [file] of commands) {
      assert.ok(Array.isArray(fixture.wrappers[harness][file]),
        `${harness}/${file} should have a baseline entry`);
      assert.ok(fixture.wrappers[harness][file].length > 0,
        `${harness}/${file} baseline should be non-empty`);
    }
  }
});

test('wrapper census covers every active wrapper in both harnesses', () => {
  const expectedFiles = [...commands.map(([file]) => file), ...CONTEXT_PRESERVING].sort();
  const claudeWrappers = activeWrapperCommands('claude');
  const opencodeWrappers = activeWrapperCommands('opencode');

  assert.deepEqual(claudeWrappers.map(([file]) => file), expectedFiles,
    'Claude wrapper census should match the active command inventory');
  assert.deepEqual(opencodeWrappers.map(([file]) => file), expectedFiles,
    'opencode wrapper census should match the active command inventory');
});

test('active contract prose rejects wrapper_echo_value while excluding immutable ADR/DDR and archived change records', () => {
  const fixture = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'sai-wrapper-echo-active-surface-'));
  try {
    fs.writeFileSync(path.join(fixture, 'README.md'), 'wrapper_echo_value: ""\n');
    for (const relativePath of [
      'docs/adr/0001-immutable.md',
      'docs/ddr/0001-immutable.md',
      'openspec/changes/archive/legacy/proposal.md',
      'openspec/specs/_archived/legacy/spec.md',
    ]) {
      const fullPath = path.join(fixture, relativePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, 'wrapper_echo_value: ""\n');
    }
    assert.deepEqual(activeWrapperEchoReferences(fixture), [
      { file: 'README.md', line: 1 },
    ]);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }

  assert.deepEqual(activeWrapperEchoReferences(repoRoot), [],
    'active production and contract surfaces must not define wrapper_echo_value');
});

test('mutation-test sandbox exclusion preserves detection in real active contract paths', t => {
  // Model the generated directory without touching the user's mutation sandboxes.
  const root = path.join(repoRoot, 'virtual-active-contract-scan');
  const directory = name => ({ name, isDirectory: () => true });
  const file = name => ({ name, isDirectory: () => false, isFile: () => true });
  const tree = new Map([
    ['', [directory('.stryker-tmp'), directory('sai'), directory('bin'), file('.stryker-tmp-contract.md')]],
    ['sai', [file('active.md'), directory('.stryker-tmp')]],
    ['sai/.stryker-tmp', [file('active.md')]],
    ['bin', [file('active.js')]],
  ]);
  t.mock.method(fs, 'readdirSync', fullPath => {
    const relativePath = path.relative(root, fullPath).split(path.sep).join('/');
    assert.notEqual(relativePath.split('/')[0], '.stryker-tmp',
      'the generated root sandbox must not be traversed');
    assert.ok(tree.has(relativePath), `unexpected scan directory: ${relativePath}`);
    return tree.get(relativePath);
  });
  t.mock.method(fs, 'readFileSync', fullPath => {
    assert.ok(path.relative(root, fullPath).split(path.sep)[0] !== '.stryker-tmp',
      'generated sandbox contents must not be read');
    return 'wrapper_echo_value: ""\n';
  });
  assert.deepEqual(activeWrapperEchoReferences(root), [
    { file: 'sai/active.md', line: 1 },
    { file: 'sai/.stryker-tmp/active.md', line: 1 },
    { file: 'bin/active.js', line: 1 },
    { file: '.stryker-tmp-contract.md', line: 1 },
  ]);
});

const HARNESS_FETCH = {
  claude: 'Fetch @skills/fetch/SKILL.md',
  opencode: 'Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.',
};

const OPENCODE_LABEL_PREFIXES = [
  '**Spec request argument:**',
  '**Change-name argument and and optional flags:**',
  '**Change-name argument:**',
  '**Change-name and optional parent-branch argument:**',
  '**Security arguments:**',
  '**Performance arguments:**',
  '**Worktree arguments:**',
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('final wrappers: InvocationEnvelope block follows launcher fetch with exactly command_name and arguments_value', () => {
  for (const harness of ['claude', 'opencode']) {
    for (const [file, folder] of wrapperCommands) {
      const source = read(`commands/${harness}/${file}`);
      assert.match(source, /InvocationEnvelope:/, `${harness}/${file} should contain InvocationEnvelope:`);
      assert.match(source, new RegExp(`command_name:\\s*${folder}`), `${harness}/${file} should set command_name to ${folder}`);
       assert.doesNotMatch(source, /wrapper_echo_value/,
         `${harness}/${file} must not construct or forward wrapper_echo_value`);
       assert.match(source, /arguments_value:\s*\$ARGUMENTS/, `${harness}/${file} should use $ARGUMENTS arguments_value`);
        const envelopeStart = source.indexOf('InvocationEnvelope:') + 'InvocationEnvelope:'.length;
         const envelopeLines = source
           .slice(envelopeStart)
           .split('<!-- User customizations below this line -->')[0]
          .trim()
          .split(/\r?\n/)
          .map(line => line.trim());
        assert.deepEqual(envelopeLines, [
          `command_name: ${folder}`,
          'arguments_value: $ARGUMENTS',
        ], `${harness}/${file} should have exactly the ordered two-key envelope before the customization section`);

        const argumentLines = source
          .split(/\r?\n/)
          .filter(line => line.includes('$ARGUMENTS'))
          .map(line => line.trim());
        assert.deepEqual(argumentLines, ['arguments_value: $ARGUMENTS'],
          `${harness}/${file} should use $ARGUMENTS only on arguments_value`);
        assert.doesNotMatch(source, /^\s*\*\*[^*\r\n]*(?:argument|arguments)[^*\r\n]*\*\*\s*\$ARGUMENTS\s*$/im,
          `${harness}/${file} should reject labelled argument lines`);
    }
  }
});

test('change and status pickers use only arguments_value and preserve the empty-input picker path', () => {
  const changePicker = read('sai/policies/change-picker.md');
  const statusPicker = read('sai/policies/status-picker.md');
  for (const [name, source] of [['change', changePicker], ['status', statusPicker]]) {
    assert.match(source, /arguments_value/, `${name} picker should consume arguments_value`);
    assert.doesNotMatch(source, /wrapper_echo_value/,
      `${name} picker must not construct or forward wrapper_echo_value`);
    assert.match(source, /empty[\s\S]{0,240}(?:picker|0\/1\/N|zero[/-]one[/-]multiple)|(?:picker|0\/1\/N|zero[/-]one[/-]multiple)[\s\S]{0,240}empty/i,
      `${name} picker should retain the empty-input picker path`);
  }
});

const DIRECT_COORDINATOR_COORDINATOR = {
  'sai-1-spec.md': 'Fetch @sai/commands/spec/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.',
  'sai-2-design.md': 'Fetch @sai/commands/design/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.',
  'sai-plan.md': 'Fetch @sai/commands/plan/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.',
  'sai-3-implement.md': 'Fetch @sai/commands/implement/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.',
  'sai-4-review.md': 'Fetch @sai/commands/review/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.',
  'sai-build.md': 'Fetch @sai/commands/build/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.',
  'sai-deep-review.md': 'Fetch @sai/commands/deep-review/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.',
  'sai-merge.md': 'Fetch @sai/commands/merge/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.',
  'sai-commit.md': 'Fetch @sai/commands/commit/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.',
  'sai-archive.md': 'Fetch @sai/commands/archive/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.',
  'sai-backfill.md': 'Fetch @sai/commands/backfill/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.',
  'sai-5-security.md': 'Fetch @sai/commands/audit/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.',
  'sai-6-performance.md': 'Fetch @sai/commands/audit/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.',
  'sai-7-accessibility.md': 'Fetch @sai/commands/audit/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.',
};
const CLEAN_START = 'This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.';

test('the direct-coordinator wrappers fetch the harness skill and their coordinator directly, with no boot adapter or bootstrap', () => {
  for (const harness of ['claude', 'opencode']) {
    for (const [file, folder] of wrapperCommands.filter(([name]) => DIRECT_COORDINATOR.has(name))) {
      const source = read(`commands/${harness}/${file}`);
      assert.deepEqual(fetchLines(source), [HARNESS_FETCH[harness], DIRECT_COORDINATOR_COORDINATOR[file]],
        `${harness}/${file} should fetch only the harness skill and its coordinator`);
      const baseline = JSON.parse(read('fixtures/thin-command-wrappers-baseline.json'));
      assert.deepEqual(baseline.wrappers[harness][file], fetchLines(source),
        `${harness}/${file} should match its baseline entry`);
      assert.ok(source.split(/\r?\n/).includes(CLEAN_START), `${harness}/${file} should carry the session-clean preamble`);
      assert.doesNotMatch(source, /@sai\/adapters\/|command-bootstrap\.md/, `${harness}/${file} must not load a boot adapter or bootstrap`);
      assert.equal(fs.existsSync(path.join(repoRoot, 'sai', 'commands', folder, 'command-bootstrap.md')), false,
        `${folder} has no command bootstrap`);
      if (AUDIT_WRAPPERS.has(file)) {
        assert.equal(fs.existsSync(path.join(repoRoot, 'sai', 'commands', folder, 'coordinator.md')), false,
          `${folder} keeps no coordinator of its own: the three audits share sai/commands/audit/coordinator.md`);
      }
      assert.equal(fs.existsSync(path.join(repoRoot, 'sai', 'commands', AUDIT_WRAPPERS.has(file) ? 'audit' : folder, 'coordinator.md')), true,
        `${folder} has its coordinator card`);
    }
  }
});

test('no command has a command bootstrap, and no wrapper or card loads the boot adapter or command runner', () => {
  for (const [, folder] of commands) {
    assert.equal(fs.existsSync(path.join(repoRoot, 'sai', 'commands', folder, 'command-bootstrap.md')), false,
      `${folder} has no command bootstrap`);
  }
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai', 'commands', 'budget', 'command-bootstrap.md')), false);
  for (const harness of ['claude', 'opencode']) {
    assert.equal(fs.existsSync(path.join(repoRoot, 'sai', 'adapters', harness, 'boot.md')), false, `${harness} has no boot adapter`);
  }
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai', 'orchestration', 'command-runner.md')), false);
});

test('the utility wrappers fetch the harness skill and their body card directly, with no boot adapter or bootstrap', () => {
  const fixture = JSON.parse(read('fixtures/thin-command-wrappers-baseline.json'));
  for (const harness of ['claude', 'opencode']) {
    for (const [file, folder] of wrapperCommands.filter(([name]) => BODY_WRAPPERS.has(name))) {
      const source = read(`commands/${harness}/${file}`);
      const expected = [HARNESS_FETCH[harness]];
      if (folder === 'explore') expected.push(`Fetch @sai/adapters/${harness}/idea-list-render.md and use it.`);
      expected.push(`Fetch @sai/commands/${folder}/body.md and follow it exactly, forwarding the InvocationEnvelope block below.`);
      assert.deepEqual(fetchLines(source), expected, `${harness}/${file} should fetch only the harness skill, its renderer, and its body card`);
      assert.deepEqual(fixture.wrappers[harness][file], fetchLines(source), `${harness}/${file} should match its baseline entry`);
      assert.ok(source.split(/\r?\n/).includes(CLEAN_START), `${harness}/${file} should carry the session-clean preamble`);
      assert.match(source, /^Required capability profile: \{\{capabilityProfile\}\}\.$/m, `${harness}/${file} should declare its capability profile`);
      assert.doesNotMatch(source, /@sai\/adapters\/(?:claude|opencode)\/boot\.md|command-bootstrap\.md/, `${harness}/${file} must not load a boot adapter or bootstrap`);
      assert.equal(fs.existsSync(path.join(repoRoot, 'sai', 'commands', folder, 'body.md')), true, `${folder} has its body card`);
    }
  }
});

test('the utility body cards check the capability profile and load public chat and the obstacle policy themselves', () => {
  for (const folder of ['explore', 'retire-docs', 'status', 'worktree']) {
    const card = read(`sai/commands/${folder}/body.md`);
    assert.match(card, /Fetch @sai\/policies\/public-chat\.md and follow it exactly\./, `${folder} loads public chat`);
    assert.match(card, /First step: Fetch @sai\/policies\/tool-access\.md and check the wrapper's required capability profile\./, `${folder} checks its capability profile`);
    assert.match(card, /Fetch @sai\/policies\/obstacle-escalation\.md and close the stop with its § Escalate to the user\./, `${folder} closes unplanned stops through the obstacle policy`);
    assert.match(card, /Fetch @sai\/policies\/verified-precondition-handback\.md/, `${folder} keeps the precondition hand-back policy`);
    assert.doesNotMatch(card, /boot-provided|command-runner|stop-options|boot adapter/i, `${folder} names no retired entry surface`);
  }
});

test('final wrappers: no ## Sai heading, User input, @commands/sai/, flat @sai/commands/<name>.md, isolation block, prerequisite section, or behavior-skill fetch', () => {
  for (const harness of ['claude', 'opencode']) {
    for (const [file, folder] of wrapperCommands) {
      const source = read(`commands/${harness}/${file}`);
      assert.doesNotMatch(source, /^## Sai/m, `${harness}/${file} should have no ## Sai heading`);
      assert.doesNotMatch(source, /User input:\s*\$ARGUMENTS/, `${harness}/${file} should have no User input line`);
      assert.doesNotMatch(source, /@commands\/sai\//, `${harness}/${file} should have no @commands/sai/ path`);
      assert.doesNotMatch(source, new RegExp(`@sai/commands/${folder}\\.md`), `${harness}/${file} should have no flat @sai/commands/${folder}.md path`);
      assert.doesNotMatch(source, /# Isolation Mode/, `${harness}/${file} should have no isolation block`);
      assert.doesNotMatch(source, /## Prerequisite|prereqs\.md/, `${harness}/${file} should have no prerequisite section`);
      assert.doesNotMatch(source, /Fetch @skills\/sai-/, `${harness}/${file} should have no behavior-skill fetch`);
    }
  }
});

test('final wrappers: both sai-explore wrappers keep idea-list-render while the Plan route follows the plan coordinator', () => {
  const claudeExplore = read('commands/claude/sai-explore.md');
  const opencodeExplore = read('commands/opencode/sai-explore.md');
  assert.match(claudeExplore, /Fetch @sai\/adapters\/claude\/idea-list-render\.md/, 'Claude explore should keep idea-list-render');
  assert.match(opencodeExplore, /Fetch @sai\/adapters\/opencode\/idea-list-render\.md/, 'opencode explore should keep idea-list-render');
  const planRoute = read('sai/commands/explore/steps/pipeline-plan-unattended.md');
  assert.match(planRoute, /Fetch @sai\/commands\/plan\/coordinator\.md and follow it exactly/);
  assert.doesNotMatch(planRoute, /bindings\/(?:spec|design)-worker\.md/, 'the Plan route dispatches no worker itself');
});

test('final wrappers: all known labelled argument lines are absent after the envelope in both harnesses', () => {
  const trailingLabel = /^\s*\*\*[^*\r\n]*(?:argument|arguments)[^*\r\n]*\*\*\s*\$ARGUMENTS\s*$/m;
  for (const harness of ['claude', 'opencode']) {
    for (const [file] of wrapperCommands) {
      const source = read(`commands/${harness}/${file}`);
      for (const prefix of OPENCODE_LABEL_PREFIXES) {
        assert.doesNotMatch(
          source,
          new RegExp(`^\\s*${escapeRegExp(prefix)}\\s*\\$ARGUMENTS\\s*$`, 'm'),
          `${harness}/${file} should not retain the labelled argument prefix: ${prefix}`,
        );
      }
      assert.doesNotMatch(source, trailingLabel,
        `${harness}/${file} should not retain a trailing labelled argument line`);
    }
  }
});

test('final wrappers: source wrapper directories contain 19 sai files plus all three backlog commands and to-pr, and no budget wrapper', () => {
  for (const harness of ['claude', 'opencode']) {
    const dir = path.join(repoRoot, 'commands', harness);
    const files = fs.readdirSync(dir);
    assert.equal(files.filter(file => file.startsWith('sai-')).length, 19, `${harness} should retain exactly 19 sai wrappers`);
    assert.equal(files.length, 23, `${harness} wrapper directory should contain 23 files`);
    assert.ok(files.includes('to-backlog.md'), `${harness} should include conversation capture`);
    assert.ok(files.includes('from-backlog.md'), `${harness} should include conversation import`);
    assert.ok(files.includes('from-next-backlog-item.md'), `${harness} should include next-item selection and import`);
    assert.equal(files.includes('budget.md'), false, `${harness} should not include budget.md`);
    for (const file of files) {
      assert.notEqual(file, 'command-bootstrap.md', `${harness} should not contain command-bootstrap.md`);
    }
  }
  for (const [, folder] of commands) {
    assert.equal(fs.existsSync(path.join(repoRoot, 'commands', 'claude', `${folder}`, 'command-bootstrap.md')), false,
      `commands/claude/${folder}/command-bootstrap.md should not exist`);
    assert.equal(fs.existsSync(path.join(repoRoot, 'commands', 'opencode', `${folder}`, 'command-bootstrap.md')), false,
      `commands/opencode/${folder}/command-bootstrap.md should not exist`);
  }
});

test('final wrappers: sai/install-manifest.json has no command-bootstrap.md entry', () => {
  const manifest = JSON.stringify(JSON.parse(read('sai/install-manifest.json')).projections);
  assert.doesNotMatch(manifest, /command-bootstrap\.md/, 'install manifest should have no command-bootstrap.md entry');
});

test('the glossary marks the boot-layer terms retired', () => {
  const glossary = read('GLOSSARY.md');
  for (const term of ['Boot Request', 'Command Bootstrap', 'Harness Boot Adapter', 'Orchestration Core', 'Phase Policy']) {
    assert.match(glossary, new RegExp(`\\*\\*${term}\\*\\*: "Retired`), `${term} should read as retired`);
  }
  assert.doesNotMatch(glossary, /- A \*\*Command Bootstrap\*\* is loaded by one \/sai-\* wrapper/);
});


test('wrapper and generic-agent frontmatter values stay valid plain YAML scalars', () => {
  const files = [
    ...commands.flatMap(([file]) => [`commands/claude/${file}`, `commands/opencode/${file}`]),
    'agents/claude/budget-executor.md',
    'agents/claude/budget-explorer.md',
    'agents/claude/budget-subagent.md',
    'agents/opencode/budget-subagent.md',
    'agents/opencode/budget-executor.md',
    'agents/opencode/budget-explorer.md',
  ];
  for (const relativePath of files) {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8').replaceAll('\r\n', '\n');
    const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(frontmatter, `${relativePath} should open with a YAML frontmatter block`);
    for (const line of frontmatter[1].split('\n')) {
      const value = line.match(/^[\w-]+:\s(.*)$/);
      if (!value || /^["']/.test(value[1])) continue;
      assert.doesNotMatch(value[1], /:\s|\s#/,
        `${relativePath}: an unquoted value containing ": " or " #" breaks YAML parsing — ${line}`);
    }
  }
});

test('opencode wrappers carry no argument-hint, which opencode commands do not support', () => {
  for (const [file] of commands) {
    const source = fs.readFileSync(path.join(repoRoot, 'commands', 'opencode', file), 'utf8');
    assert.doesNotMatch(source, /^argument-hint:/m, `commands/opencode/${file} should carry no argument-hint`);
  }
});

test('worker-matrix agent descriptions stay valid plain YAML scalars and name their dispatching coordinator', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'sai', 'install-manifest.json'), 'utf8'));
  const entries = [];
  (function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === 'object') {
      if (node.workerName && node.claudeAgent) entries.push(node);
      Object.values(node).forEach(walk);
    }
  })(manifest);
  assert.ok(entries.length > 0, 'the worker matrix should list workers');
  for (const entry of entries) {
    for (const agent of [entry.claudeAgent, entry.opencodeAgent]) {
      assert.doesNotMatch(agent.description, /:\s|\s#/,
        `${entry.workerName}: an unquoted description containing ": " or " #" breaks YAML parsing`);
      assert.match(agent.description, /dispatched only by (?:its|their) coordinators?\./,
        `${entry.workerName}: the description should say only its coordinator dispatches it`);
    }
    assert.equal(entry.claudeAgent.description, entry.opencodeAgent.description,
      `${entry.workerName}: both harnesses should carry the same description`);
  }
});
