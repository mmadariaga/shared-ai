'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const DECLARED = {
  review: ['--parent-branch'],
  security: ['--full', '--path', '--parent-branch'],
  performance: ['--full', '--path', '--tier', '--runtime', '--parent-branch'],
  accessibility: ['--full', '--path', '--runtime', '--parent-branch'],
};

test('each review and audit command declares its options in its own options.md', () => {
  for (const [command, flags] of Object.entries(DECLARED)) {
    const options = read(`sai/commands/${command}/options.md`);
    const declared = [...options.matchAll(/^- `(--[a-z-]+)/gm)].map(match => match[1]);
    assert.deepEqual(declared, flags, `${command}/options.md declares exactly its options`);
    assert.match(read(`sai/commands/${command}/steps/common.md`), new RegExp(`Fetch @sai/commands/${command}/options\\.md`));
    assert.match(read(`sai/commands/${command}/coordinator.md`), new RegExp(`Fetch @sai/commands/${command}/options\\.md`));
    assert.match(read(`sai/commands/${command}/worker.md`), /second positional value/);
  }
});

test('the review command keeps reviewing the diff and retires the positional parent branch', () => {
  const options = read('sai/commands/review/options.md');
  assert.match(options, /unattended/);
  assert.doesNotMatch(read('sai/commands/review/worker.md'), /optional parent branch/);
  for (const command of Object.keys(DECLARED)) {
    assert.match(read(`sai/commands/${command}/options.md`), /second positional value is rejected/);
  }
});

test('/sai-review forwards to each segment only the options its command declares', () => {
  const coordinator = read('sai/commands/meta-review/coordinator.md');
  const bootstrap = read('sai/commands/meta-review/command-bootstrap.md');

  for (const command of Object.keys(DECLARED)) {
    assert.match(coordinator, new RegExp(`@sai/commands/${command}/options\\.md`));
    assert.match(coordinator, new RegExp(`command_name: ${command}, arguments_value: \\{name\\} \\{options-for-${command}\\}`));
  }
  assert.match(coordinator, /union of the options/);
  assert.match(coordinator, /composition keeps no list of its own/);
  assert.match(coordinator, /names that option/);
  assert.match(coordinator, /options are kept/);
  assert.match(coordinator, /`--fast-track` token/);
  assert.match(coordinator, /never receives `--full` or `--path`/);
  assert.match(coordinator, /had no effect/);
  assert.match(coordinator, /also with `--full` or `--path`/);
  assert.match(bootstrap, /`--full` or `--path` activates all three without the triage parse/);
  assert.match(bootstrap, /Error close below does\s+not apply/);
});

test('only --runtime lets a review or audit command ask mid-run', () => {
  assert.match(read('sai/commands/performance/steps/resolve-diagnostics.md'), /Without `--runtime`, resolve the gate as legitimately skipped without asking/);
  assert.match(read('sai/commands/accessibility/steps/resolve-runtime-audit.md'), /Without `--runtime`, resolve the gate as legitimately skipped without asking/);
  for (const command of ['review', 'security']) {
    assert.match(read(`sai/commands/${command}/options.md`), /asks nothing between change resolution and its close/);
  }
});

test('both harness wrappers announce the options', () => {
  const wrappers = { 'sai-review': ['--full', '--path', '--tier', '--runtime', '--parent-branch'], 'sai-5-review': ['--parent-branch'], 'sai-6-security': ['--parent-branch'], 'sai-7-performance': ['--parent-branch'], 'sai-8-accessibility': ['--parent-branch'] };
  for (const harness of ['claude', 'opencode']) {
    for (const [wrapper, flags] of Object.entries(wrappers)) {
      const text = read(`commands/${harness}/${wrapper}.md`);
      for (const flag of flags) assert.ok(text.includes(flag), `${harness}/${wrapper} announces ${flag}`);
    }
  }
});
