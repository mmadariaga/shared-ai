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

test('the Ready to Propose block template orders Edge Cases, Implementation Details, Overview language', () => {
  const source = explore();
  const edgeCases = source.indexOf('**Edge Cases**');
  assert.ok(edgeCases >= 0, 'the template should carry **Edge Cases**');
  const implementationDetails = source.indexOf('**Implementation Details**', edgeCases);
  assert.ok(implementationDetails > edgeCases, '**Implementation Details** should follow **Edge Cases**');
  const overviewLanguage = source.indexOf('**Overview language**', implementationDetails);
  assert.ok(overviewLanguage > implementationDetails, '**Overview language** should follow **Implementation Details**');
});

test('gate 9 offers the ambient language first with the Recommended marker and English second', () => {
  const source = explore();
  assert.match(source, /emitted first and carrying the `Recommended` marker/);
  assert.match(source, /emitted second, carrying no marker/);
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
