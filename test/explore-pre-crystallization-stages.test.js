'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function readArtifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.equal(fs.existsSync(fullPath), true, `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

const explore = () => readArtifact('sai/commands/explore/instructions.md');
const opencodeBinding = () => readArtifact('sai/adapters/opencode/idea-list-render.md');
const claudeBinding = () => readArtifact('sai/adapters/claude/idea-list-render.md');
const opencodePanel = () => readArtifact('sai/adapters/opencode/panel-render.md');
const claudePanel = () => readArtifact('sai/adapters/claude/panel-render.md');

test('the explore instructions render the four stage labels in order', () => {
  const source = explore();
  const labels = ['Explore change', 'Review edge cases', 'Implementation details', 'Crystallize'];
  let previous = -1;
  for (const label of labels) {
    const position = source.indexOf(label);
    assert.ok(position > previous, `${label} should appear after the preceding stage label`);
    previous = position;
  }
});

test('stage advancement fires only on the literal next-step token with intent recognition', () => {
  const source = explore();
  assert.match(source, /the literal token `next-step`/);
  assert.match(source, /Mere containment of the string `next-step` SHALL NOT fire the token/);
  assert.match(source, /dominant intent/);
});

test('phase-navigation questions fall through while substantive uncertainty remains genuine', () => {
  const source = explore();
  assert.match(source, /question whose dominant purpose is only to navigate[\s\S]{0,500}fall through to the stage-aware reminder/i);
  assert.match(source, /question that contains substantive uncertainty capable of changing the idea remains a genuine unresolved question/i);
});

test('the Ready to Propose block template orders Edge Cases, Implementation Details, Overview language', () => {
  const source = explore();
  const edgeCases = source.indexOf('**Edge Cases**');
  assert.ok(edgeCases >= 0, 'the template should carry **Edge Cases**');
  const implementationDetails = source.indexOf('**Implementation Details**', edgeCases);
  assert.ok(implementationDetails > edgeCases, '**Implementation Details** should follow **Edge Cases**');
  const overviewLanguage = source.indexOf('**Overview language**', implementationDetails);
  assert.ok(overviewLanguage > implementationDetails, '**Overview language** should follow **Implementation Details**');
});

test('gate 9 is opt-in, puts the do-not-create choice first, and has no Recommended marker', () => {
  const source = explore();
  const selectorStart = source.search(/(?:Gate 9|gate-9|overview[- ]language selector)/i);
  assert.ok(selectorStart >= 0, 'the opt-in overview-language selector should be specified');

  const selector = source.slice(selectorStart);
  assert.match(selector, /(?:None\s*(?:—|-)\s*do[- ]not[- ]create|do[- ]not[- ]create[\s\S]{0,120}None)/i);
  assert.doesNotMatch(source, /emitted first and carrying the `Recommended` marker/);
  assert.doesNotMatch(source, /emitted second, carrying no marker/);
});

test('Ready to Propose records the selected overview language or literal None', () => {
  const source = explore();
  const fields = source.match(/\*\*Overview language\*\*:\s*[^\n]*/g) || [];

  assert.ok(fields.length > 0, 'Ready to Propose should include an Overview language field');
  for (const field of fields) {
    assert.match(field, /(?:None|<[^>\n]*(?:selected|overview language|language)[^>\n]*>)/i);
  }
});

test('both bindings carry the idea-list marker in their pinned machine-readable field', () => {
  const opencode = opencodeBinding();
  const claude = claudeBinding();

  assert.match(opencode, /`priority` field, with value `sai-idea-list:<change-name>`/);
  assert.match(claude, /`description` field, with value `sai-idea-list:<change-name>`/);
});

test('both render bindings retain the shared idea-list surface policy', () => {
  const opencode = opencodeBinding();
  const claude = claudeBinding();

  const sharedFragments = [
    'sai-idea-list:<change-name>',
    'pending | in_progress | completed',
    'active review item',
    'coordinator session',
  ];
  for (const fragment of sharedFragments) {
    assert.ok(opencode.includes(fragment), `opencode binding should carry: ${fragment}`);
    assert.ok(claude.includes(fragment), `Claude binding should carry: ${fragment}`);
  }
});

test('the chat-start clear removes exactly entries bearing either marker prefix', () => {
  const exploreSource = explore();
  const opencode = opencodePanel();
  const claude = claudePanel();

  assert.match(exploreSource, /start clear removes entries bearing either marker prefix/);
  assert.match(exploreSource, /read covers the markers only and never derives list content/);
  for (const binding of [opencode, claude]) {
    assert.match(binding, /start clear/);
    assert.match(binding, /removes the entries bearing that surface's marker/);
    assert.match(binding, /read never derives list content/);
  }
});
