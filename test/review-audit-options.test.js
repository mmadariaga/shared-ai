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
  accessibility: ['--full', '--path', '--runtime', '--url', '--parent-branch'],
};

test('each review and audit command declares its options in its own options.md', () => {
  for (const [command, flags] of Object.entries(DECLARED)) {
    const options = read(`sai/commands/${command}/options.md`);
    const declared = [...options.matchAll(/^- `(--[a-z-]+)/gm)].map(match => match[1]);
    assert.deepEqual(declared, flags, `${command}/options.md declares exactly its options`);
    if (command === 'review') {
      assert.match(read('sai/commands/review/coordinator.md'), /Fetch @sai\/commands\/review\/options\.md/);
      continue;
    }
    // The audits share one coordinator, which validates the options of the audit it is given.
    const coordinator = read('sai/commands/audit/coordinator.md');
    assert.match(coordinator, /Fetch @sai\/commands\/\{audit\}\/options\.md/);
    assert.match(coordinator, /a second positional value/);
    assert.match(coordinator, /The parent branch is passed as --parent-branch <branch>\./);
    assert.match(read(`sai/commands/${command}/steps/common.md`), new RegExp(`Fetch @sai/commands/${command}/options\\.md`));
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

test('/sai-deep-review forwards to each segment only the options its command declares', () => {
  const coordinator = read('sai/commands/deep-review/coordinator.md');
  const bootstrap = read('sai/commands/deep-review/command-bootstrap.md');

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
  assert.match(coordinator, /even with `--full` or `--path`/);
  assert.match(bootstrap, /`--full` or `--path` activates all three without the triage parse/);
  assert.match(bootstrap, /Error close below does\s+not apply/);
});

test('no audit asks mid-run: --runtime is the whole authorization and the URL is an input', () => {
  for (const file of ['sai/commands/performance/steps/resolve-diagnostics.md', 'sai/commands/accessibility/steps/resolve-runtime-audit.md']) {
    const step = read(file);
    assert.match(step, /`--runtime` is the whole authorization: ask no question, and never wait for an answer/);
    assert.doesNotMatch(step, /needs_input|authorize-or-skip|server-confirmation|Run diagnostics|Skip diagnostics/);
  }
  for (const command of ['review', 'security', 'performance', 'accessibility']) {
    assert.match(read(`sai/commands/${command}/options.md`), /asks nothing between change resolution and its close/);
  }
  assert.match(read('sai/commands/accessibility/options.md'), /`--url <url>` — the dev-server URL the scanners take\. It is an input, not an authorization/);
  const coordinator = read('sai/commands/audit/coordinator.md');
  assert.match(coordinator, /`--runtime` is the whole authorization/);
  assert.match(coordinator, /`--runtime` without `--url`, ask the user for the dev-server URL/);
});

test('both harness wrappers announce the options', () => {
  const wrappers = { 'sai-deep-review': ['--full', '--path', '--tier', '--runtime', '--parent-branch'], 'sai-4-review': ['--parent-branch'], 'sai-5-security': DECLARED.security, 'sai-6-performance': DECLARED.performance, 'sai-7-accessibility': DECLARED.accessibility };
  for (const harness of ['claude', 'opencode']) {
    for (const [wrapper, flags] of Object.entries(wrappers)) {
      const text = read(`commands/${harness}/${wrapper}.md`);
      for (const flag of flags) assert.ok(text.includes(flag), `${harness}/${wrapper} announces ${flag}`);
    }
  }
});
