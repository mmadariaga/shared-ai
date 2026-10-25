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

// ─── the stamp derives from received_at end to end ─────────────────────────

test('the three planning wrappers carry no shell grant now that stamps need no clock', () => {
  for (const relativePath of [
    'commands/claude/sai-1-spec.md',
    'commands/claude/sai-2-design.md',
    'commands/claude/sai-3-implement.md'
  ]) {
    const wrapper = require('./helpers/capability-source').readProjected(relativePath);
    const line = wrapper.match(/^allowed-tools:\s*(.+)$/m);
    assert.ok(line, `${relativePath} should declare allowed-tools`);
    assert.equal(line[1].trim(), require('./helpers/capability-source').commandTools(path.basename(relativePath, '.md')),
      `${relativePath} should carry the routed coordinator list with panel tools plus the closed scoped grant (validator plus guard plus store, both roots, plus the mixed reset)`);
  }
});

test('no production surface asks a coordinator to acquire a wall-clock time', () => {
  for (const relativePath of [
    'sai/policies/todo-structure.md',
    'sai/commands/spec/coordinator.md',
    'sai/commands/design/coordinator.md',
    'sai/commands/implement/coordinator.md'
  ]) {
    const text = artifact(relativePath);
    assert.doesNotMatch(text, /date \+%H:%M|Get-Date/,
      `${relativePath} should name no per-harness wall-clock command`);
  }
});

test('DDR 0141 records the closure-only, time-sourced stamp and ADR 0144 the dropped grant', () => {
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

// ─── every routed surface restating the progress shape agrees ───────────────

test('every routed surface restating the progress shape is timeless with no time field', () => {
  const surfaces = [
    'sai/commands/spec/coordinator.md',
    'sai/commands/design/coordinator.md',
    'sai/commands/implement/coordinator.md',
    'sai/commands/review/coordinator.md',
    'sai/commands/audit/coordinator.md',
    'sai/commands/deep-review/coordinator.md',
    'sai/commands/implement/red-worker.md',
    'sai/commands/implement/green-worker.md'
  ];

  for (const relativePath of surfaces) {
    const text = artifact(relativePath);
    // timeless progress shape carries step_ids without a time field
    if (/event:\s*"?progress"?/.test(text)) {
      assert.doesNotMatch(text, /progress.", (?:validated|received)_at|progress, (?:validated|received)_at/,
        `${relativePath} should not carry a time in the payload shape`);
    }
  }
});

// ─── glossary ───────────────────────────────────────────────────────────────

test('the glossary names Received At and separates it from the Milestone Stamp', () => {
  const glossary = artifact('GLOSSARY.md');

  assert.match(glossary, /\*\*Received At\*\*/,
    'the glossary should define Received At');
  assert.match(glossary, /\*\*Progress Event\*\*[\s\S]{0,320}no time field/,
    'the Progress Event definition should be timeless');
  assert.match(glossary, /Milestone Stamp vs Received At/,
    'the glossary should carry the disambiguation between the two time surfaces');
});

// ─── decision record ────────────────────────────────────────────────────────

test('DDR 0140 records the validated_at decision and DDR 0162 amends it with received_at', () => {
  const ddr = artifact('docs/ddr/0140-closed-worker-payloads-carry-result-emission-time.md');

  assert.match(ddr, /## Status\s*\n\s*Accepted/);
  assert.match(ddr, /validated_at/);
  assert.match(ddr, /## Alternatives Considered/);
  assert.match(ddr, /## Consequences/);
  assert.match(ddr, /## Provenance/);
  const amend = artifact('docs/ddr/0162-received-at-is-the-cli-response-clock.md');
  assert.match(amend, /## Status\s*\n\s*Accepted/);
  assert.match(amend, /received_at/);
  assert.match(artifact('docs/ddr/0000-INDEX.md'), /0162-received-at-is-the-cli-response-clock/);
});
