'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

// ─── worker-core: payloads are timeless, validator emits validated_at ───────

test('worker-core keeps closed payloads timeless with no time field', () => {
  const core = artifact('sai/orchestration/worker-core.md');

  const blocks = [
    ['completed', /status:\s*completed\s*\n\s*summary:\s*string/],
    ['needs_input', /status:\s*needs_input\s*\n\s*summary:\s*string/],
    ['failed|cancelled', /status:\s*failed\|cancelled\s*\n\s*summary:\s*string/],
    ['classified failed', /status:\s*failed\s*\n\s*summary:\s*string[\s\S]{0,200}failure_class:/],
    ['notice', /event:\s*notice\s*\n\s*message:\s*string/],
    ['progress', /event:\s*progress\s*\n\s*step_ids:\s*string\[\]/]
  ];

  for (const [name, pattern] of blocks) {
    assert.match(core, pattern,
      `the ${name} payload should be timeless without a time field`);
  }
});

test('worker-core fixes validated_at as validator-observed ISO-8601 sidecar', () => {
  const core = artifact('sai/orchestration/worker-core.md');

  assert.match(core, /validator-observed/i,
    'validated_at should be validator-observed');
  assert.match(core, /YYYY-MM-DDTHH:MM:SS±HH:MM/,
    'the exact wire form should be stated');
  assert.match(core, /local wall-clock time/i,
    'the value should be local time plus a numeric offset');
  assert.match(core, /never the `Z` designator/i,
    'the Z designator should be excluded');
  assert.match(core, /no time field/i,
    'payloads should be described as timeless');
  assert.match(core, /unknown.*ignored|ignored.*unknown/i,
    'unknown fields should be ignored');
});

test('worker-core owns the clock in the validator with reception-time semantics', () => {
  const core = artifact('sai/orchestration/worker-core.md');

  assert.match(core, /reception time substitutes emission time|transport delta/i,
    'reception-time semantics should be recorded');
  assert.match(core, /Time is observation, not claim|observation, not claim/i,
    'time-as-observation should be recorded');
  assert.match(core, /never reads a clock|never.*clock/i,
    'the worker should never read a clock');
});

test('worker-core makes validated_at validator-owned and forbids coordinator rewriting', () => {
  const core = artifact('sai/orchestration/worker-core.md');

  assert.match(core, /## Validator-Observed Time/,
    'worker-core should define the sidecar in its own section');
  assert.match(core, /validator.*own|owns the only clock/i,
    'the clock should be validator-owned');
  assert.match(core, /verbatim[\s\S]{0,160}(?:invent|re-derive|reformat)/i,
    'the coordinator should forward the verdict verbatim without re-deriving it');
  assert.match(core, /never[\s\S]{0,40}reconstruct/i,
    'reconstruction should not carry observation time');
});

test('worker-core names validated_at as the sole source of the Milestone Stamp', () => {
  const core = artifact('sai/orchestration/worker-core.md');

  assert.match(core, /validated_at` is the sole source of the Milestone Stamp/i,
    'the stamp should be sourced from the verdict value');
  assert.match(core, /never reads a clock/i,
    'the coordinator should read no clock');
  assert.match(core, /todo-structure\.md/,
    'the stamp rendering should stay owned by the todo-structure policy');
  assert.match(core, /never renders, attaches, or formats a stamp/i,
    'the worker should still not render or attach stamps');
});

// ─── the stamp derives from validated_at end to end ─────────────────────────

test('the three planning wrappers carry no shell grant now that stamps need no clock', () => {
  for (const relativePath of [
    'commands/claude/sai-1-spec.md',
    'commands/claude/sai-2-design.md',
    'commands/claude/sai-3-implement.md'
  ]) {
    const wrapper = artifact(relativePath);
    const line = wrapper.match(/^allowed-tools:\s*(.+)$/m);
    assert.ok(line, `${relativePath} should declare allowed-tools`);
    assert.equal(line[1].trim(), 'Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList',
      `${relativePath} should carry the routed coordinator list with panel tools and no Bash entry`);
  }
});

test('no production surface asks a coordinator to acquire a wall-clock time', () => {
  for (const relativePath of [
    'sai/policies/todo-structure.md',
    'sai/orchestration/command-runner.md',
    'sai/orchestration/worker-core.md',
    'sai/commands/spec/coordinator.md',
    'sai/commands/design/coordinator.md',
    'sai/commands/implement/coordinator.md'
  ]) {
    const text = artifact(relativePath);
    assert.doesNotMatch(text, /date \+%H:%M|Get-Date/,
      `${relativePath} should name no per-harness wall-clock command`);
  }
});

test('DDR 0141 records the closure-only, validated_at-sourced stamp and ADR 0144 the dropped grant', () => {
  const ddr = artifact('docs/ddr/0141-milestone-stamp-is-closure-only-and-derived-from-emitted-on.md');
  const adr = artifact('docs/adr/0144-planning-coordinators-drop-the-scoped-date-shell-entry.md');
  const supersededAdr = artifact('docs/adr/0117a-planning-coordinators-scoped-shell-entry.md');
  const supersededBinding = artifact('docs/adr/0118a-per-harness-wall-clock-commands-in-bindings.md');

  assert.match(ddr, /## Status\s*\n\s*Accepted/);
  assert.match(ddr, /closure-only/i);
  assert.match(ddr, /validated_at/);
  assert.match(adr, /## Status\s*\n\s*Accepted/);
  assert.match(supersededAdr, /## Status\s*\n\s*Superseded by \[ADR 0144\]/,
    'ADR 0117 should be marked superseded');
  assert.match(supersededBinding, /## Status\s*\n\s*Superseded by \[DDR 0141\]/,
    'ADR 0118 should be marked superseded');
});

test('both decision indexes carry the new records', () => {
  const ddrIndex = artifact('docs/ddr/0000-INDEX.md');
  const adrIndex = artifact('docs/adr/0000-INDEX.md');

  assert.match(ddrIndex, /0140-closed-worker-payloads-carry-result-emission-time/,
    'DDR 0140 should be indexed');
  assert.match(ddrIndex, /0141-milestone-stamp-is-closure-only-and-derived-from-emitted-on/,
    'DDR 0141 should be indexed');
  assert.match(adrIndex, /0144-planning-coordinators-drop-the-scoped-date-shell-entry/,
    'ADR 0144 should be indexed');
  assert.match(adrIndex, /\*Superseded by \[0144\]/,
    'ADR 0117 should appear in the superseded list');
});

// ─── command-runner: the coordinator consumes the validator verdict ─────────

test('the command runner consumes validated_at on every closed payload', () => {
  const runner = artifact('sai/orchestration/command-runner.md');

  assert.match(runner, /validated_at/,
    'terminal-result validation should include validated_at');
  assert.match(runner, /YYYY-MM-DDTHH:MM:SS±HH:MM/,
    'the runner should pin the same wire form as worker-core');
  assert.match(runner, /resolves no zone|no conversion/i,
    'the coordinator should do no timezone work');
  assert.match(runner, /\{event: "notice", message: string, changed_files: string\[\]\}/,
    'the notice shape should be timeless');
  assert.match(runner, /\{event: "progress", step_ids: string\[\], changed_files: string\[\]\}/,
    'the progress shape should be timeless');
  assert.match(runner, /malformed payload/i,
    'a missing required field should be handled as a malformed payload');
  assert.match(runner, /verbatim/i,
    'the coordinator should forward the verdict verbatim');
  assert.match(runner, /Milestone Stamp/,
    'the runner should keep the Milestone Stamp separate from validated_at');
  assert.match(runner, /prompt[\s\S]{0,80}terminal[\s\S]{0,40}progress|terminal[\s\S]{0,40}progress[\s\S]{0,80}prompt/i,
    'the coordinator should surface validated_at in its prompt for terminal and progress');
});

// ─── every routed surface restating the progress shape agrees ───────────────

test('every routed surface restating the progress shape is timeless with no time field', () => {
  const surfaces = [
    'sai/orchestration/command-runner.md',
    'sai/commands/spec/coordinator.md',
    'sai/commands/design/coordinator.md',
    'sai/commands/implement/coordinator.md',
    'sai/commands/review/coordinator.md',
    'sai/commands/security/coordinator.md',
    'sai/commands/performance/coordinator.md',
    'sai/commands/accessibility/coordinator.md',
    'sai/commands/apply/coordinator.md',
    'sai/commands/apply/runner.md',
    'sai/commands/apply/red-worker.md',
    'sai/commands/apply/green-worker.md'
  ];

  for (const relativePath of surfaces) {
    const text = artifact(relativePath);
    // timeless progress shape carries step_ids without a time field
    if (/event:\s*"?progress"?/.test(text)) {
      assert.doesNotMatch(text, /progress.", validated_at|progress, validated_at/,
        `${relativePath} should not carry validated_at in the payload shape`);
    }
  }
});

// ─── glossary ───────────────────────────────────────────────────────────────

test('the glossary names Validated At and separates it from the Milestone Stamp', () => {
  const glossary = artifact('GLOSSARY.md');

  assert.match(glossary, /\*\*Validated At\*\*/,
    'the glossary should define Validated At');
  assert.match(glossary, /\*\*Progress Event\*\*[\s\S]{0,320}no time field/,
    'the Progress Event definition should be timeless');
  assert.match(glossary, /Milestone Stamp vs Validated At/,
    'the glossary should carry the disambiguation between the two time surfaces');
});

// ─── decision record ────────────────────────────────────────────────────────

test('DDR 0140 records the validated_at decision', () => {
  const ddr = artifact('docs/ddr/0140-closed-worker-payloads-carry-result-emission-time.md');

  assert.match(ddr, /## Status\s*\n\s*Accepted/);
  assert.match(ddr, /validated_at/);
  assert.match(ddr, /## Alternatives Considered/);
  assert.match(ddr, /## Consequences/);
  assert.match(ddr, /## Provenance/);
});
