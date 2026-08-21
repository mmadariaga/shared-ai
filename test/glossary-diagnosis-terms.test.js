'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const GLOSSARY_PATH = 'GLOSSARY.md';
const DIAGNOSIS_TERMS = [
  'Diagnosis Round',
  'Routing Diagnosis',
  'Diagnosis Key',
  'Duplicate Diagnosis',
  'Unresolved Cause',
  'Continuation/Transport Loss',
  'Known-False Report Recovery'
];

function glossary() {
  const fullPath = path.join(repoRoot, GLOSSARY_PATH);
  assert.equal(fs.existsSync(fullPath), true, `${GLOSSARY_PATH} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

function escaped(term) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function definitionFor(term) {
  const line = glossary().split(/\r?\n/).find((candidate) => (
    new RegExp(`^\\s*(?:#{1,6}\\s*|[-*]\\s*)?\\*\\*${escaped(term)}\\*\\*\\s*:`, 'i').test(candidate)
  ));

  assert.ok(line, `GLOSSARY.md should define **${term}**`);

  const match = line.match(new RegExp(
    `^\\s*(?:#{1,6}\\s*|[-*]\\s*)?\\*\\*${escaped(term)}\\*\\*\\s*:\\s*(.+?)\\s*$`,
    'i'
  ));
  assert.ok(match, `**${term}** should have a glossary definition`);
  assert.match(match[1], /\S/, `**${term}** should have non-empty definition text`);
  return match[1];
}

test('GLOSSARY.md defines the diagnosis and recovery terms', () => {
  for (const term of DIAGNOSIS_TERMS) {
    definitionFor(term);
  }
});

test('Known-False Report Recovery is locus-aware and not GREEN-only', () => {
  const definition = definitionFor('Known-False Report Recovery');

  assert.match(
    definition,
    /\blocus\b/i,
    'Known-False Report Recovery should define the locus that produced the report'
  );
  assert.match(
    definition,
    /\b(?:RED|transport|continuation|verification|diagnosis)\b/i,
    'Known-False Report Recovery should cover a non-GREEN diagnosis or transport locus'
  );
  assert.doesNotMatch(
    definition,
    /(?:\b(?:only|solely|exclusively|just)\b[^.\n]*\bGREEN\b|\bGREEN\b[^.\n]*\b(?:only|solely|exclusively|just)\b)/i,
    'Known-False Report Recovery must not be defined as GREEN-only'
  );
});

test('Diagnosis Round names Review Engine recovery feedback without aliasing review_rounds', () => {
  const definition = definitionFor('Diagnosis Round');

  assert.match(
    definition,
    /\bReview Engine\b/i,
    'Diagnosis Round should name Review Engine'
  );
  assert.match(
    definition,
    /\b(?:recovery|correction)\b[\s\S]*\bfeedback\b|\bfeedback\b[\s\S]*\b(?:recovery|correction)\b/i,
    'Diagnosis Round should describe recovery or correction feedback'
  );
  assert.match(
    definition,
    /\bnot\b[^.\n]*\bSupervised Review Round\b/i,
    'Diagnosis Round should distinguish itself from a Supervised Review Round'
  );
  assert.doesNotMatch(
    definition,
    /\breview_rounds\b/i,
    'Diagnosis Round must not alias review_rounds'
  );
});
