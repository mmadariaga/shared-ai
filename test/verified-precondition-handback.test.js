'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const policyPath = path.join(repoRoot, 'sai', 'policies', 'verified-precondition-handback.md');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('canonical policy requires current evidence and confirmed writer ownership', () => {
  assert.ok(fs.existsSync(policyPath), 'the canonical verified-precondition policy must exist');
  const policy = fs.readFileSync(policyPath, 'utf8');

  assert.match(policy, /concrete project-relative file/i);
  assert.match(policy, /concrete[\s\S]{0,120}key/i);
  assert.match(policy, /current invocation/i);
  assert.match(policy, /destination command[\s\S]{0,240}(?:card|instruction|worker contract)/i);
  assert.match(policy, /explicit[\s\S]{0,160}write responsibility/i);
  assert.match(policy, /(?:reads?|checks?|gates?|forwards?)[\s\S]{0,220}(?:does not|do not|shall not)[\s\S]{0,120}(?:writer|write responsibility)/i);
  assert.match(policy, /relay[\s\S]{0,220}independent/i);
});

test('canonical policy escalates incomplete evidence without changing written contracts', () => {
  const policy = fs.readFileSync(policyPath, 'utf8');

  assert.match(policy, /missing[\s\S]{0,100}file[\s\S]{0,180}unsatisfiable/i);
  assert.match(policy, /unread[\s\S]{0,180}key/i);
  assert.match(policy, /unconfirmed[\s\S]{0,180}writer/i);
  assert.match(policy, /verification evidence is incomplete/i);
  assert.match(policy, /@sai\/policies\/question-context\.md/);
  assert.match(policy, /fixed STOP/i);
  assert.match(policy, /contract-authored hand-back/i);
  assert.match(policy, /approval gate/i);
  assert.match(policy, /lifecycle/i);
  assert.match(policy, /successful path/i);
});

test('glossary defines only the canonical hand-back term and rejected aliases', () => {
  const glossary = read('GLOSSARY.md');
  assert.match(glossary, /\*\*Verified Precondition Hand-back\*\*:\s*"[^"]+"/);
  assert.match(glossary, /\*Avoid\*:\s*unverified hand-back, precondition redirect, backwards hand-off/);
  assert.doesNotMatch(glossary, /\*\*Unverified Hand-back\*\*:/);
  assert.doesNotMatch(glossary, /\*\*Precondition Redirect\*\*:/);
});
