'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const GLOSSARY_PATH = 'GLOSSARY.md';

function glossary() {
  const fullPath = path.join(repoRoot, GLOSSARY_PATH);
  assert.equal(fs.existsSync(fullPath), true, `${GLOSSARY_PATH} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

function progressPlanDefinition() {
  const match = glossary().match(/\*\*Progress Plan\*\*: "[^"]*"/);
  assert.notEqual(match, null, 'GLOSSARY.md should contain a **Progress Plan** definition');
  return match[0];
}

function progressPlanRelationshipLines() {
  return glossary().match(/^-\s.*\*\*Progress Plan\*\*.*$/gm) || [];
}

test('GLOSSARY.md Progress Plan definition is declared by the phase adapter, never transported through dispatch', () => {
  const definition = progressPlanDefinition();

  assert.doesNotMatch(definition, /transported through dispatch/i);
  assert.match(definition, /declared by a \*\*Phase Adapter\*\*/i);
  assert.match(definition, /active adapter segment|invocation-scoped state/i);
  assert.match(definition, /never carried in the dispatch envelope/i);
});

test('GLOSSARY.md Progress Plan relationship lines carry no numeric restatement of the render threshold', () => {
  const lines = progressPlanRelationshipLines();

  assert.ok(lines.length > 0, 'GLOSSARY.md should contain **Progress Plan** relationship lines');
  for (const line of lines) {
    assert.doesNotMatch(
      line,
      /(?:fewer|less|more) than three|three or (?:more|fewer|less)|at least three|under three|below three|no more than three|three steps?/i,
      `Progress Plan relationship line should not restate the render threshold numerically: ${line}`
    );
  }
});
