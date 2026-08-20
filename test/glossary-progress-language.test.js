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

test('GLOSSARY.md narrows review terminology to external findings, manual navigation, and supervised Review Engine rounds', () => {
  const source = glossary();

  const phaseReviewPass = source.match(/\*\*Phase Review Pass\*\*:[\s\S]{0,420}/i)?.[0] || '';
  const referenceSet = source.match(/\*\*Review Reference Set\*\*:[\s\S]{0,420}/i)?.[0] || '';
  const artifactReview = source.match(/\*\*Artifact Review\*\*:[\s\S]{0,420}/i)?.[0] || '';

  assert.notEqual(phaseReviewPass, '', 'Phase Review Pass should retain a glossary definition');
  assert.notEqual(referenceSet, '', 'Review Reference Set should retain a glossary definition');
  assert.notEqual(artifactReview, '', 'Artifact Review should retain a glossary definition');

  assert.match(phaseReviewPass, /(?:manual|supervis(?:ed|ion)|Review Engine|round)/i,
    'Phase Review Pass should be narrowed to a manual or supervised round surface');
  assert.match(referenceSet, /(?:bounded|selected|artifact|external|Review Engine)/i,
    'Review Reference Set should name its bounded artifact/evidence context');
  assert.match(artifactReview, /(?:external|finding|five[- ]field|Summary|manual|Review Engine)/i,
    'Artifact Review should describe the current external/manual/supervised review surface');

  assert.match(phaseReviewPass, /Retired term|No live/i,
    'Phase Review Pass should be explicitly retired rather than treated as a live worker surface');
  for (const definition of [referenceSet, artifactReview]) {
    assert.doesNotMatch(definition, /automatic (?:isolated )?reviewer|dispatch(?:es|ing)? a reviewer/i,
      'retired automatic reviewer dispatch semantics must not remain in a narrowed definition');
  }
});
