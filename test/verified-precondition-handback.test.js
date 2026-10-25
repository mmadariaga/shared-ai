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

const policyFetch = 'Fetch @sai/policies/verified-precondition-handback.md';
// The plan family (spec, design, plan) runs outside the shared orchestration, like the
// implement family, and loads none of the shared hand-back policy.
// The audit workers, the shared audit coordinator, and /sai-deep-review run outside it too.
const routedMinimalCards = ['commit', 'archive', 'backfill'].flatMap((name) =>
  ['coordinator.md', 'worker.md'].map((card) => `sai/commands/${name}/${card}`)
);
const utilityCards = ['explore', 'retire-docs', 'status', 'worktree']
  .map((name) => `sai/commands/${name}/body.md`);
const commandCards = [...routedMinimalCards, ...utilityCards];
const GOAL_DRIVEN_CARDS = new Set([
  'sai/commands/commit/coordinator.md',
  'sai/commands/archive/coordinator.md',
  'sai/commands/backfill/coordinator.md',
]);

function countLiteral(text, value) {
  return text.split(value).length - 1;
}

function nextNonBlankLine(lines, startIndex) {
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (lines[index].trim() !== '') return lines[index].trim();
  }
  return undefined;
}

function markdownFilesUnder(relativeDirectory) {
  const root = path.join(repoRoot, relativeDirectory);
  if (!fs.existsSync(root)) return [];
  const found = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const child = path.join(root, entry.name);
    if (entry.isDirectory()) {
      found.push(...markdownFilesUnder(path.relative(repoRoot, child)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      found.push(child);
    }
  }
  return found;
}

test('all command cards load the policy exactly once at their structural entry point', () => {
  assert.equal(commandCards.length, 10);

  for (const card of commandCards) {
    assert.ok(fs.existsSync(path.join(repoRoot, card)), `${card} must exist`);
    const content = read(card);
    assert.equal(countLiteral(content, policyFetch), 1, `${card} must fetch the policy exactly once`);
    const lines = content.split(/\r?\n/);

    // The goal-driven commit, archive, and backfill coordinators have no <TASK> wrapper: its fetch follows its H1 like a worker card.
    if ((card.endsWith('/coordinator.md') && !GOAL_DRIVEN_CARDS.has(card)) || card.endsWith('/body.md')) {
      const taskIndex = lines.findIndex((line) => line.trim() === '<TASK>');
      assert.notEqual(taskIndex, -1, `${card} must contain <TASK>`);
      assert.equal(nextNonBlankLine(lines, taskIndex), policyFetch, `${card} fetch must follow <TASK>`);
    } else {
      assert.match(lines[0], /^# /, `${card} must start with an H1`);
      assert.equal(nextNonBlankLine(lines, 0), policyFetch, `${card} fetch must follow its H1`);
    }
  }
});

test('excluded non-card surfaces do not fetch the policy directly', () => {
  const commandNonCards = markdownFilesUnder('sai/commands').filter((file) =>
    path.basename(file) === 'instructions.md' || path.basename(file).endsWith('.template.md')
  );
  const nonCanonicalPolicies = markdownFilesUnder('sai/policies').filter((file) => file !== policyPath);
  const projectSkills = [
    ...markdownFilesUnder('.claude/skills'),
    ...markdownFilesUnder('.opencode/skills'),
  ];
  const excluded = [
    ...commandNonCards,
    ...nonCanonicalPolicies,
    ...projectSkills,
  ];

  for (const file of excluded) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /Fetch @sai\/policies\/verified-precondition-handback\.md/,
      `${path.relative(repoRoot, file)} must not fetch the policy directly`);
  }
});

test('representative fixed STOP and contract-authored hand-back text remains unchanged', () => {
  assert.match(
    read('sai/commands/implement/coordinator.md'),
    /Cannot start \/sai-3-implement for \{name\}: missing \{list of the absent items\}\./
  );
  assert.match(
    read('sai/commands/design/steps/design.md'),
    /name the correction in `notes` so that the closing report can send the user to `\/sai-1-spec`\./
  );
});
