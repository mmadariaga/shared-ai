'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const stepsDir = path.join(__dirname, '..', 'sai', 'commands', 'explore', 'steps');

test('contract preservation: all reachable step files exist and are mentioned', () => {
  const stepsFiles = fs.readdirSync(stepsDir)
    .filter(file => file.endsWith('.md'))
    .sort();

  // E3: All fifteen files should exist, including the follow-loaded stage, slice, POC lane, and route selector steps
  assert.equal(stepsFiles.length, 15,
    `Expected 15 step files, found ${stepsFiles.length}: ${stepsFiles.join(', ')}`);

  // Verify the specific expected files exist
  const expectedFiles = [
    'artifact-review-language-gate.md',
    'common.md',
    'crystallization-language-gates.md',
    'crystallization-protocol.md',
    'idea-list.md',
    'implementation-details.md',
    'pipeline-direct-build.md',
    'pipeline-plan-unattended.md',
    'pipeline-selector.md',
    'poc-lane.md',
    'review-edge-cases.md',
    'review-loop.md',
    'route-selector.md',
    'slice.md',
    'slicing-assessment.md'
  ];

  for (const expectedFile of expectedFiles) {
    const exists = stepsFiles.includes(expectedFile);
    assert.ok(exists, `Expected step file not found: ${expectedFile}`);
  }
});

test('contract preservation: route names stay English while route guidance is localized', () => {
  const selector = fs.readFileSync(path.join(stepsDir, 'route-selector.md'), 'utf8');
  const languageGate = fs.readFileSync(
    path.join(stepsDir, 'crystallization-language-gates.md'),
    'utf8',
  );

  assert.match(selector, /\*\*Plan - Unattended\*\*/);
  assert.match(selector, /\*\*Direct Build - Unattended\*\*/);
  assert.match(selector, /\*\*Manual\*\*/);
  assert.match(selector, /The route explanation renders in the user's language[\s\S]{0,180}fixed route names remain exactly `Plan - Unattended`, `Direct Build - Unattended`, and `Manual`/i);
  assert.match(languageGate, /post-block route guide, later-turn clarification, and post-Manual handoff prose follow the selected crystallization language[\s\S]{0,220}route names remain the fixed English literals `Plan - Unattended`, `Direct Build - Unattended`, and `Manual`/i);
});
