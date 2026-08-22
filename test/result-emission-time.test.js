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

// ─── worker-core: emitted_on is in every closed payload ─────────────────────

test('worker-core carries emitted_on immediately after the discriminator of every closed payload', () => {
  const core = artifact('sai/orchestration/worker-core.md');

  const blocks = [
    ['completed', /status:\s*completed\s*\n\s*emitted_on:\s*string/],
    ['needs_input', /status:\s*needs_input\s*\n\s*emitted_on:\s*string/],
    ['failed|cancelled', /status:\s*failed\|cancelled\s*\n\s*emitted_on:\s*string/],
    ['classified failed', /status:\s*failed\s*\n\s*emitted_on:\s*string[\s\S]{0,200}failure_class:/],
    ['notice', /event:\s*notice\s*\n\s*emitted_on:\s*string/],
    ['progress', /event:\s*progress\s*\n\s*emitted_on:\s*string/]
  ];

  for (const [name, pattern] of blocks) {
    assert.match(core, pattern,
      `the ${name} payload should carry emitted_on directly after its discriminator`);
  }
});

test('worker-core fixes emitted_on as a mandatory offset-bearing ISO-8601 instant', () => {
  const core = artifact('sai/orchestration/worker-core.md');

  assert.match(core, /ISO-8601 instant/,
    'emitted_on should be specified as an ISO-8601 instant');
  assert.match(core, /YYYY-MM-DDTHH:MM:SS±HH:MM/,
    'the exact wire form should be stated');
  assert.match(core, /local wall-clock time followed by the session's\s*\n?numeric UTC offset/i,
    'the value should be local time plus a numeric offset');
  assert.match(core, /never the `Z` designator/i,
    'the Z designator should be excluded');
  assert.match(core, /malformed/i,
    'a missing or offset-less value should be called malformed');
  assert.match(core, /never (?:conditional|omitted)/i,
    'emitted_on should be unconditional, unlike resolved_change_name');
});

test('worker-core requires a real clock read and accepts the DST sorting trade', () => {
  const core = artifact('sai/orchestration/worker-core.md');

  assert.match(core, /SHALL NOT estimate,\s+infer,[\s\S]{0,120}carry forward a time it did not read/i,
    'the worker should not invent the value');
  assert.match(core, /daylight-saving transition/i,
    'the DST caveat should be recorded');
  assert.match(core, /remain correct instants/i,
    'DST-crossing values should still be correct instants');
  assert.match(core, /as comparable as a UTC\s*\n?one/i,
    'an offset-bearing value should be stated as fully comparable');
});

test('worker-core makes emitted_on worker-authored and forbids coordinator rewriting', () => {
  const core = artifact('sai/orchestration/worker-core.md');

  assert.match(core, /## Result Emission Time/,
    'worker-core should define the field in its own section');
  assert.match(core, /worker-authored/i,
    'the field should be worker-authored');
  assert.match(core, /SHALL NOT[\s\S]{0,80}reuse, back-date, forward-date, or copy a value from an earlier result/i,
    'reuse and back-dating should be forbidden');
  assert.match(core, /non-decreasing/i,
    'values should be non-decreasing across one run');
  assert.match(core, /verbatim[\s\S]{0,160}(?:invent|re-derive|reformat)/i,
    'the coordinator should forward the value verbatim without re-deriving it');
  assert.match(core, /replacement worker authors its own/i,
    'a replacement worker should author its own values');
});

test('worker-core names emitted_on as the sole source of the Milestone Stamp', () => {
  const core = artifact('sai/orchestration/worker-core.md');

  assert.match(core, /emitted_on` is the sole source of the Milestone Stamp/i,
    'the stamp should be sourced from the payload value');
  assert.match(core, /never reads a clock/i,
    'the coordinator should read no clock');
  assert.match(core, /todo-structure\.md/,
    'the stamp rendering should stay owned by the todo-structure policy');
  assert.match(core, /never renders, attaches, or formats a stamp/i,
    'the worker should still not render or attach stamps');
});

// ─── the stamp derives from emitted_on end to end ───────────────────────────

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

test('DDR 0141 records the closure-only, emitted_on-sourced stamp and ADR 0144 the dropped grant', () => {
  const ddr = artifact('docs/ddr/0141-milestone-stamp-is-closure-only-and-derived-from-emitted-on.md');
  const adr = artifact('docs/adr/0144-planning-coordinators-drop-the-scoped-date-shell-entry.md');
  const supersededAdr = artifact('docs/adr/0117a-planning-coordinators-scoped-shell-entry.md');
  const supersededBinding = artifact('docs/adr/0118a-per-harness-wall-clock-commands-in-bindings.md');

  assert.match(ddr, /## Status\s*\n\s*Accepted/);
  assert.match(ddr, /closure-only/i);
  assert.match(ddr, /emitted_on/);
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

// ─── command-runner: the coordinator validates the field ────────────────────

test('the command runner validates emitted_on on every closed payload', () => {
  const runner = artifact('sai/orchestration/command-runner.md');

  assert.match(runner, /offset-bearing ISO-8601 `emitted_on`/,
    'terminal-result validation should include emitted_on');
  assert.match(runner, /YYYY-MM-DDTHH:MM:SS±HH:MM/,
    'the runner should pin the same wire form as worker-core');
  assert.match(runner, /resolves no zone|no conversion/i,
    'the coordinator should do no timezone work');
  assert.match(runner, /\{event: "notice", emitted_on: string, message: string, changed_files: string\[\]\}/,
    'the notice shape should carry emitted_on after the discriminator');
  assert.match(runner, /\{event: "progress", emitted_on: string, step_ids: string\[\], changed_files: string\[\]\}/,
    'the progress shape should carry emitted_on after the discriminator');
  assert.match(runner, /malformed payload/i,
    'a missing or non-UTC value should be handled as a malformed payload');
  assert.match(runner, /verbatim/i,
    'the coordinator should forward the value verbatim');
  assert.match(runner, /Milestone Stamp/,
    'the runner should keep the Milestone Stamp separate from emitted_on');
});

// ─── every routed surface restating the progress shape agrees ───────────────

test('every routed surface restating the progress shape carries emitted_on after the discriminator', () => {
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

  const inlineShape = /\{event:\s*"?progress"?,\s*(\w+)/g;

  for (const relativePath of surfaces) {
    const text = artifact(relativePath);
    for (const match of text.matchAll(inlineShape)) {
      assert.equal(match[1], 'emitted_on',
        `${relativePath} restates the progress shape with "${match[1]}" before emitted_on`);
    }
  }
});

// ─── glossary ───────────────────────────────────────────────────────────────

test('the glossary names Result Emission Time and separates it from the Milestone Stamp', () => {
  const glossary = artifact('GLOSSARY.md');

  assert.match(glossary, /\*\*Result Emission Time\*\*/,
    'the glossary should define Result Emission Time');
  assert.match(glossary, /\*\*Progress Event\*\*[\s\S]{0,320}emitted_on/,
    'the Progress Event definition should list emitted_on');
  assert.match(glossary, /Milestone Stamp vs Result Emission Time/,
    'the glossary should carry the disambiguation between the two time surfaces');
});

// ─── decision record ────────────────────────────────────────────────────────

test('DDR 0140 records the emitted_on decision', () => {
  const ddr = artifact('docs/ddr/0140-closed-worker-payloads-carry-result-emission-time.md');

  assert.match(ddr, /## Status\s*\n\s*Accepted/);
  assert.match(ddr, /emitted_on/);
  assert.match(ddr, /## Alternatives Considered/);
  assert.match(ddr, /## Consequences/);
  assert.match(ddr, /## Provenance/);
});
