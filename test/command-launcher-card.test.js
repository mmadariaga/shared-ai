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
  ['sai-4-apply.md', 'apply'],
  ['sai-5-review.md', 'review'],
  ['sai-6-security.md', 'security'],
  ['sai-7-performance.md', 'performance'],
  ['sai-8-accessibility.md', 'accessibility'],
  ['sai-archive.md', 'archive'],
  ['sai-backfill.md', 'backfill'],
  ['sai-commit.md', 'commit'],
  ['sai-explore.md', 'explore'],
  ['sai-pr.md', 'pr'],
  ['sai-status.md', 'status'],
  ['sai-worktree.md', 'worktree'],
];
const emptyLaunchers = new Set(['apply', 'archive', 'backfill', 'commit', 'pr', 'status', 'worktree']);
const movedDirectives = {
  spec: [
    'Fetch @sai/policies/glossary-format.md',
    'Fetch @skills/budget/SKILL.md and use it.',
    'Fetch @skills/safe-operations/SKILL.md and use it.',
    'Fetch @sai/orchestration/workers/bindings/spec-worker.md and use it.',
    'Fetch @sai/commands/spec/coordinator.md and follow those instructions exactly.',
  ],
  design: [
    'Fetch @sai/orchestration/workers/bindings/design-worker.md and use it.',
    'Fetch @sai/commands/design/coordinator.md and follow those instructions exactly.',
  ],
  implement: [
    'Fetch @sai/orchestration/workers/bindings/implementation-worker.md and use it.',
    'Fetch @sai/commands/implement/coordinator.md and follow those instructions exactly.',
  ],
  review: [
    'Fetch @sai/orchestration/workers/bindings/review-worker.md and use it.',
    'Fetch @sai/commands/review/coordinator.md and follow those instructions exactly.',
  ],
  security: [
    'Fetch @sai/orchestration/workers/bindings/security-worker.md and use it.',
    'Fetch @sai/commands/security/coordinator.md and follow those instructions exactly.',
  ],
  performance: [
    'Fetch @sai/orchestration/workers/bindings/performance-worker.md and use it.',
    'Fetch @sai/commands/performance/coordinator.md and follow those instructions exactly.',
  ],
  accessibility: [
    'Fetch @sai/orchestration/workers/bindings/accessibility-worker.md and use it.',
    'Fetch @sai/commands/accessibility/coordinator.md and follow those instructions exactly.',
  ],
  explore: ['Fetch @sai/orchestration/workers/bindings/design-worker.md and use it.'],
};

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function fetchLines(source) {
  return source
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('Fetch @'));
}

test('exactly 15 harness-neutral launcher cards exist and budget has none', () => {
  const actual = [];
  for (const [, folder] of commands) {
    const relative = `sai/commands/${folder}/launcher.md`;
    assert.equal(fs.existsSync(path.join(repoRoot, relative)), true, `${relative} should exist`);
    actual.push(relative);
  }
  assert.equal(actual.length, 15);
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai', 'commands', 'budget', 'launcher.md')), false);
});

test('launcher content is exact, ordered, and harness-neutral', () => {
  for (const [, folder] of commands) {
    const source = read(`sai/commands/${folder}/launcher.md`);
    assert.doesNotMatch(source, /claude|opencode/i, `${folder} launcher must be harness-neutral`);
    assert.doesNotMatch(source, /@sai\/adapters\//, `${folder} launcher must not fetch an adapter`);
    assert.doesNotMatch(source, /InvocationEnvelope|command_name|wrapper_echo_value|arguments_value/);
    if (emptyLaunchers.has(folder)) {
      assert.deepEqual(fetchLines(source), [], `${folder} launcher must remain near-empty`);
    } else {
      assert.deepEqual(fetchLines(source), movedDirectives[folder], `${folder} launcher directive order`);
    }
  }
});

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

const HARNESS_FETCH = {
  claude: 'Fetch @skills/fetch/SKILL.md',
  opencode: 'Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.',
};
const BOOT_ADAPTER = {
  claude: 'Fetch @sai/adapters/claude/boot.md and follow it.',
  opencode: 'Fetch @sai/adapters/opencode/boot.md and follow it.',
};

const OPENCODE_LABELS = {
  'sai-1-spec.md': '**Spec request argument:** $ARGUMENTS',
  'sai-2-design.md': '**Change-name argument and and optional flags:** $ARGUMENTS',
  'sai-3-implement.md': '**Change-name argument:** $ARGUMENTS',
  'sai-4-apply.md': '**Change-name argument and and optional flags:** $ARGUMENTS',
  'sai-5-review.md': '**Change-name and optional parent-branch argument:** $ARGUMENTS',
  'sai-6-security.md': '**Security arguments:** $ARGUMENTS',
  'sai-7-performance.md': '**Performance arguments:** $ARGUMENTS',
  'sai-8-accessibility.md': '**Change-name argument:** $ARGUMENTS',
  'sai-archive.md': '**Change-name argument and and optional flags:** $ARGUMENTS',
  'sai-status.md': '**Change-name argument and and optional flags:** $ARGUMENTS',
  'sai-worktree.md': '**Worktree arguments:** $ARGUMENTS',
  'sai-pr.md': '**Change-name argument:** $ARGUMENTS',
};

function launcherCallDirective(folder) {
  return `Fetch @sai/commands/${folder}/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.`;
}

test('final wrappers: first fetch is harness skill, second is boot adapter, launcher fetch appears exactly once', () => {
  for (const harness of ['claude', 'opencode']) {
    for (const [file, folder] of commands) {
      const lines = fetchLines(read(`commands/${harness}/${file}`));
      assert.equal(lines[0], HARNESS_FETCH[harness], `${harness}/${file} first fetch should be the harness fetch skill`);
      assert.equal(lines[1], BOOT_ADAPTER[harness], `${harness}/${file} second fetch should be the boot adapter`);
      const launcherCalls = lines.filter(line => line.includes(`/commands/${folder}/launcher.md`));
      assert.equal(launcherCalls.length, 1, `${harness}/${file} should fetch its launcher exactly once`);
      assert.equal(launcherCalls[0], launcherCallDirective(folder), `${harness}/${file} launcher fetch should match the canonical directive`);
    }
  }
});

test('final wrappers: InvocationEnvelope block follows launcher fetch with exactly three fields', () => {
  for (const harness of ['claude', 'opencode']) {
    for (const [file, folder] of commands) {
      const source = read(`commands/${harness}/${file}`);
      assert.match(source, /InvocationEnvelope:/, `${harness}/${file} should contain InvocationEnvelope:`);
      assert.match(source, new RegExp(`command_name:\\s*${folder}`), `${harness}/${file} should set command_name to ${folder}`);
      if (harness === 'claude') {
        assert.match(source, /wrapper_echo_value:\s*""/, `${harness}/${file} should use empty wrapper_echo_value`);
      } else {
        assert.match(source, /wrapper_echo_value:\s*\$ARGUMENTS/, `${harness}/${file} should use $ARGUMENTS wrapper_echo_value`);
      }
      assert.match(source, /arguments_value:\s*\$ARGUMENTS/, `${harness}/${file} should use $ARGUMENTS arguments_value`);
      const envelopeFields = source.match(/(?:command_name|wrapper_echo_value|arguments_value):/g) || [];
      assert.equal(envelopeFields.length, 3, `${harness}/${file} should have exactly three envelope fields`);
    }
  }
});

test('final wrappers: no ## Sai heading, User input, @commands/sai/, flat @sai/commands/<name>.md, isolation block, prerequisite section, or behavior-skill fetch', () => {
  for (const harness of ['claude', 'opencode']) {
    for (const [file, folder] of commands) {
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

test('final wrappers: sai-explore keeps idea-list-render and opencode keeps spec-worker; neither carries design-worker', () => {
  const claudeExplore = read('commands/claude/sai-explore.md');
  const opencodeExplore = read('commands/opencode/sai-explore.md');
  assert.match(claudeExplore, /Fetch @sai\/adapters\/claude\/idea-list-render\.md/, 'Claude explore should keep idea-list-render');
  assert.match(opencodeExplore, /Fetch @sai\/orchestration\/workers\/bindings\/spec-worker\.md/, 'opencode explore should keep spec-worker binding');
  assert.match(opencodeExplore, /Fetch @sai\/adapters\/opencode\/idea-list-render\.md/, 'opencode explore should keep idea-list-render');
  assert.doesNotMatch(claudeExplore, /bindings\/design-worker\.md/, 'Claude explore wrapper should not carry design-worker binding');
  assert.doesNotMatch(opencodeExplore, /bindings\/design-worker\.md/, 'opencode explore wrapper should not carry design-worker binding');
  const exploreLauncher = read('sai/commands/explore/launcher.md');
  assert.match(exploreLauncher, /Fetch @sai\/orchestration\/workers\/bindings\/design-worker\.md/, 'explore launcher should carry design-worker binding');
});

test('final wrappers: opencode label lines remain after envelope; Claude wrappers have no label line', () => {
  for (const [file, folder] of commands) {
    const opencodeSource = read(`commands/opencode/${file}`);
    const claudeSource = read(`commands/claude/${file}`);
    if (OPENCODE_LABELS[file]) {
      assert.ok(opencodeSource.includes(OPENCODE_LABELS[file]),
        `opencode/${file} should retain its label line: ${OPENCODE_LABELS[file]}`);
    }
    assert.doesNotMatch(claudeSource, /\*\*.*argument.*\*\*.*\$ARGUMENTS/, `claude/${file} should have no label line`);
  }
});

test('final wrappers: wrapper + launcher sorted Fetch set matches baseline', () => {
  const fixture = JSON.parse(read('fixtures/thin-command-wrappers-baseline.json'));
  for (const harness of ['claude', 'opencode']) {
    for (const [file, folder] of commands) {
      const wrapperFetch = fetchLines(read(`commands/${harness}/${file}`));
      const launcherFetch = fetchLines(read(`sai/commands/${folder}/launcher.md`));
      const launcherCall = launcherCallDirective(folder);
      const combined = wrapperFetch
        .filter(line => line !== launcherCall)
        .concat(launcherFetch)
        .sort();
      const baseline = [...fixture.wrappers[harness][file]].sort();
      assert.deepEqual(combined, baseline,
        `${harness}/${file} + launcher (minus launcher-call) sorted should match baseline sorted`);
    }
  }
});

test('final wrappers: every launcher has no envelope fields and remains harness-neutral', () => {
  for (const [, folder] of commands) {
    const source = read(`sai/commands/${folder}/launcher.md`);
    assert.doesNotMatch(source, /InvocationEnvelope|command_name|wrapper_echo_value|arguments_value/,
      `${folder} launcher should have no envelope fields`);
  }
});

test('final wrappers: source wrapper directories contain exactly 16 files including budget.md; no launcher.md under commands/', () => {
  for (const harness of ['claude', 'opencode']) {
    const dir = path.join(repoRoot, 'commands', harness);
    const files = fs.readdirSync(dir);
    assert.equal(files.length, 16, `${harness} wrapper directory should contain exactly 16 files`);
    assert.ok(files.includes('budget.md'), `${harness} should include budget.md`);
    for (const file of files) {
      assert.notEqual(file, 'launcher.md', `${harness} should not contain launcher.md`);
    }
  }
  for (const [, folder] of commands) {
    assert.equal(fs.existsSync(path.join(repoRoot, 'commands', 'claude', `${folder}`, 'launcher.md')), false,
      `commands/claude/${folder}/launcher.md should not exist`);
    assert.equal(fs.existsSync(path.join(repoRoot, 'commands', 'opencode', `${folder}`, 'launcher.md')), false,
      `commands/opencode/${folder}/launcher.md should not exist`);
  }
});

test('final wrappers: sai/install-manifest.json has no launcher.md entry', () => {
  const manifest = read('sai/install-manifest.json');
  assert.doesNotMatch(manifest, /launcher\.md/, 'install manifest should have no launcher.md entry');
});

test('Command Launcher glossary term and relationship remain canonical', () => {
  const glossary = read('GLOSSARY.md');
  assert.match(glossary, /\*\*Command Launcher\*\*: "The harness-neutral per-command card at `sai\/commands\/\{name\}\/launcher\.md`/);
  assert.match(glossary, /- A \*\*Command Launcher\*\* is loaded by one \/sai-\* wrapper after its \*\*Harness Boot Adapter\*\*/);
});
