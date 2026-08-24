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
  ['sai-build.md', 'meta-build'],
  ['sai-commit.md', 'commit'],
  ['sai-explore.md', 'explore'],
  ['sai-merge.md', 'merge'],
  ['sai-pr.md', 'pr'],
  ['sai-review.md', 'meta-review'],
  ['sai-status.md', 'status'],
  ['sai-worktree.md', 'worktree'],
];
const emptyBootstraps = new Set(['apply', 'pr', 'status', 'worktree']);
const loadFreeBootstraps = new Set([...emptyBootstraps, 'meta-review']);
function activeWrapperCommands(harness) {
  const directory = path.join(repoRoot, 'commands', harness);
  const foldersByFile = new Map(commands);
  return fs.readdirSync(directory)
    .filter(file => /^sai-.*\.md$/.test(file))
    .sort()
    .map(file => [file, foldersByFile.get(file)]);
}

const wrapperCommands = activeWrapperCommands('claude');
const movedDirectives = {
  spec: [
    'Fetch @skills/safe-operations/SKILL.md and use it.',
    'Fetch @sai/orchestration/workers/bindings/spec-worker.md and use it.',
  ],
  design: [
    'Fetch @sai/orchestration/workers/bindings/design-worker.md and use it.',
  ],
  implement: [
    'Fetch @sai/orchestration/workers/bindings/implementation-worker.md and use it.',
  ],
  'meta-build': [
    'Fetch @sai/orchestration/workers/bindings/implementation-worker.md and use it.',
  ],
  review: [
    'Fetch @sai/orchestration/workers/bindings/review-worker.md and use it.',
  ],
  security: [
    'Fetch @sai/orchestration/workers/bindings/security-worker.md and use it.',
  ],
  performance: [
    'Fetch @sai/orchestration/workers/bindings/performance-worker.md and use it.',
  ],
  accessibility: [
    'Fetch @sai/orchestration/workers/bindings/accessibility-worker.md and use it.',
  ],
  commit: [
    'Fetch @sai/orchestration/workers/bindings/commit-worker.md and use it.',
  ],
  archive: [
    'Fetch @sai/orchestration/workers/bindings/archive-worker.md and use it.',
  ],
  backfill: [
    'Fetch @sai/orchestration/workers/bindings/backfill-worker.md and use it.',
  ],
  merge: [
    'Fetch @sai/orchestration/workers/bindings/merge-worker.md and use it.',
  ],
  explore: [
    'Fetch @sai/orchestration/workers/bindings/spec-worker.md and use it.',
    'Fetch @sai/orchestration/workers/bindings/design-worker.md and use it.',
  ],
  'meta-review': [],
};

function read(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

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

test('exactly 18 harness-neutral command bootstraps exist and budget has none', () => {
  const actual = [];
  for (const [, folder] of commands) {
    const relative = `sai/commands/${folder}/command-bootstrap.md`;
    assert.equal(fs.existsSync(path.join(repoRoot, relative)), true, `${relative} should exist`);
    actual.push(relative);
  }
  assert.equal(actual.length, 18);
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai', 'commands', 'budget', 'command-bootstrap.md')), false);
});

test('command bootstrap content is exact, ordered, and harness-neutral', () => {
  for (const [, folder] of commands) {
    const relative = `sai/commands/${folder}/command-bootstrap.md`;
    assert.equal(fs.existsSync(path.join(repoRoot, relative)), true, `${relative} should exist`);
    const source = read(`sai/commands/${folder}/command-bootstrap.md`);
    assert.doesNotMatch(source, /claude|opencode/i, `${folder} launcher must be harness-neutral`);
    assert.doesNotMatch(source, /@sai\/adapters\//, `${folder} launcher must not fetch an adapter`);
    assert.doesNotMatch(source, /InvocationEnvelope|command_name|wrapper_echo_value|arguments_value/);
    if (emptyBootstraps.has(folder)) {
      assert.deepEqual(fetchLines(source), [], `${folder} command bootstrap must remain load-free`);
      assert.match(source, /intentionally empty of command-specific loads; it is not missing/);
      assert.match(source, /Execution continues with the card selected by the harness boot adapter/);
    } else if (loadFreeBootstraps.has(folder)) {
      assert.deepEqual(fetchLines(source), [], `${folder} command bootstrap must remain load-free`);
      assert.match(source, /segment list/);
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

test('wrapper census covers every active wrapper in both harnesses', () => {
  const expectedFiles = commands.map(([file]) => file).sort();
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

const HARNESS_FETCH = {
  claude: 'Fetch @skills/fetch/SKILL.md',
  opencode: 'Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.',
};
const BOOT_ADAPTER = {
  claude: 'Fetch @sai/adapters/claude/boot.md and follow it.',
  opencode: 'Fetch @sai/adapters/opencode/boot.md and follow it.',
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

function bootstrapCallDirective(folder) {
  return `Fetch @sai/commands/${folder}/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.`;
}

test('final wrappers: first fetch is harness skill, second is boot adapter, launcher fetch appears exactly once', () => {
  for (const harness of ['claude', 'opencode']) {
    for (const [file, folder] of wrapperCommands) {
      const lines = fetchLines(read(`commands/${harness}/${file}`));
      assert.equal(lines[0], HARNESS_FETCH[harness], `${harness}/${file} first fetch should be the harness fetch skill`);
      assert.equal(lines[1], BOOT_ADAPTER[harness], `${harness}/${file} second fetch should be the boot adapter`);
      const bootstrapCalls = lines.filter(line => line.includes(`/commands/${folder}/command-bootstrap.md`));
      assert.equal(bootstrapCalls.length, 1, `${harness}/${file} should fetch its command bootstrap exactly once`);
      assert.equal(bootstrapCalls[0], bootstrapCallDirective(folder), `${harness}/${file} command bootstrap fetch should match the canonical directive`);
    }
  }
});

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
          .trim()
          .split(/\r?\n/)
          .map(line => line.trim());
        assert.deepEqual(envelopeLines, [
          `command_name: ${folder}`,
          'arguments_value: $ARGUMENTS',
        ], `${harness}/${file} should have exactly the ordered two-key envelope with no trailing content`);

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

test('final wrappers: both sai-explore wrappers keep idea-list-render while launcher owns both workers', () => {
  const claudeExplore = read('commands/claude/sai-explore.md');
  const opencodeExplore = read('commands/opencode/sai-explore.md');
  assert.match(claudeExplore, /Fetch @sai\/adapters\/claude\/idea-list-render\.md/, 'Claude explore should keep idea-list-render');
  assert.match(opencodeExplore, /Fetch @sai\/adapters\/opencode\/idea-list-render\.md/, 'opencode explore should keep idea-list-render');
  const exploreBootstrap = read('sai/commands/explore/command-bootstrap.md');
  assert.match(exploreBootstrap, /Fetch @sai\/orchestration\/workers\/bindings\/spec-worker\.md/);
  assert.match(exploreBootstrap, /Fetch @sai\/orchestration\/workers\/bindings\/design-worker\.md/, 'explore command bootstrap should carry design-worker binding');
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

test('final wrappers: wrapper + launcher sorted Fetch set matches baseline', () => {
  const fixture = JSON.parse(read('fixtures/thin-command-wrappers-baseline.json'));
  for (const harness of ['claude', 'opencode']) {
    for (const [file, folder] of wrapperCommands) {
      const wrapperFetch = fetchLines(read(`commands/${harness}/${file}`));
      const bootstrapFetch = fetchLines(read(`sai/commands/${folder}/command-bootstrap.md`));
      const bootstrapCall = bootstrapCallDirective(folder);
      const combined = wrapperFetch
        .filter(line => line !== bootstrapCall)
        .concat(bootstrapFetch)
        .sort();
      const baseline = [...fixture.wrappers[harness][file]].sort();
      assert.deepEqual(combined, baseline,
        `${harness}/${file} + command bootstrap (minus bootstrap-call) sorted should match baseline sorted`);
    }
  }
});

test('final wrappers: every launcher has no envelope fields and remains harness-neutral', () => {
  for (const [, folder] of wrapperCommands) {
    const source = read(`sai/commands/${folder}/command-bootstrap.md`);
    assert.doesNotMatch(source, /InvocationEnvelope|command_name|wrapper_echo_value|arguments_value/,
      `${folder} launcher should have no envelope fields`);
  }
});

test('final wrappers: source wrapper directories contain exactly 19 files including budget.md; no command bootstrap card under commands/', () => {
  for (const harness of ['claude', 'opencode']) {
    const dir = path.join(repoRoot, 'commands', harness);
    const files = fs.readdirSync(dir);
    assert.equal(files.length, 19, `${harness} wrapper directory should contain exactly 19 files`);
    assert.ok(files.includes('budget.md'), `${harness} should include budget.md`);
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
  const manifest = read('sai/install-manifest.json');
  assert.doesNotMatch(manifest, /command-bootstrap\.md/, 'install manifest should have no command-bootstrap.md entry');
});

test('Command Bootstrap glossary term and relationship remain canonical', () => {
  const glossary = read('GLOSSARY.md');
  assert.match(glossary, /\*\*Command Bootstrap\*\*: "The harness-neutral per-command card at `sai\/commands\/\{name\}\/command-bootstrap\.md`/);
  assert.match(glossary, /- A \*\*Command Bootstrap\*\* is loaded by one \/sai-\* wrapper after its \*\*Harness Boot Adapter\*\*/);
});
