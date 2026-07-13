'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'bin', 'install-flow.js'), 'utf8');

test('Claude summary lines are present in install-flow.js', () => {
  assert.ok(source.includes('Claude commands installed to:'), 'Claude commands summary');
  assert.ok(source.includes('Claude SAI commands/instructions installed to:'), 'Claude SAI summary');
  assert.ok(source.includes('Claude skills installed to:'), 'Claude skills summary');
});

test('Opencode summary lines are present in install-flow.js', () => {
  assert.ok(source.includes('Opencode commands installed to:'), 'Opencode commands summary');
  assert.ok(source.includes('Opencode SAI commands/instructions installed to:'), 'Opencode SAI summary');
  assert.ok(source.includes('Opencode skills installed to:'), 'Opencode skills summary');
});

test('Summary lines appear after install functions and before reminder', () => {
  const claudeIdx = source.indexOf('Claude commands installed to:');
  const opencodeIdx = source.indexOf('Opencode commands installed to:');
  const reminderIdx = source.indexOf("Reminder: run 'npx github:mmadariaga/shared-ai setup'");
  assert.ok(claudeIdx > -1 && claudeIdx < reminderIdx, 'Claude summary before reminder');
  assert.ok(opencodeIdx > -1 && opencodeIdx < reminderIdx, 'Opencode summary before reminder');
});
