'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const nucleusFile = path.join(__dirname, '..', 'sai', 'commands', 'explore', 'instructions.md');
const stepsDir = path.join(__dirname, '..', 'sai', 'commands', 'explore', 'steps');
const commitHash = 'b4fb5e30';

// Lines that are deliberately different between pre-split and split versions
// These are keyed by distinctive prefixes to catch any new changes
const allowedDifferences = [
  // Items 3, 4, 11 were reformatted into file headers in step files
  '3. **Language gate for artifact reviews',
  '4. **Slicing assessment',
  '11. **Idea Progress List (sai-explore only)',
  // §5/§6 became items 5/6 in Emission gate section (original has §5/§6)
  'Before printing any `Ready to Propose` block, judge whether the idea is solid at the same qualitative threshold used in §5/§6',
  // Auto terminal navigation now hands off to the build composition
  'Map the selected terminal deterministically. On the opted-in generation',
  'A successful Auto run emits no next-step handoff',
  '**Phase-aware autonomy audit compatibility**: The active terminal report',
  // Overview-language gate moved from crystallization emission to supervised Auto activation
  'Do not emit a `Ready to Propose` block while the review is unresolved',
  'The full `Ready to Propose` block(s) are printed only when the user explicitly asks',
  '**Crystallize stage (stage 4).**',
  '5. **Crystallization protocol (single change)**:',
  '**Overview language**:',
  '6. **Crystallization protocol (sliced feature)**:',
  '- **Slice-0 "done" (SOLID-scoped)**:',
  '7. **Inline proposal refusal**:',
  '**Overview-language gate (gate 9, sai-explore only).**',
  '1. **Tracked target**:',
  '2. **Question presentation**:',
  '3. **Selected value semantics**:',
  '4. **Translated surface**:',
  '**Fast-track**: when `--fast-track` is absent',
  '- `overview_language`: the selected language token for the active supervised',
  '- **Auto** — Unattended alternative to Manual mode. Same steps, same order.',
  '- **Deterministic selection inheritance**: On a **Direct Build - Unattended** selection',
  '1. **No file writes**: Explore has no direct write tool',
  '10. **Supervised sai-1/sai-2 pipeline (crystallization-close selector, sai-explore only)**:',
  'Selecting **Auto** delegates supervised `sai-1` + `sai-2` execution to this session',
  'The question text and every option label — with each option\'s one-line description — render',
  '3. Recompute `pending_slices` only from `last_crystallization_set` minus `completed_changes`',
  'Selectors never select or infer an `Overview language`',
  '9. **Post-crystallization review loop (sai-explore only)**:',
  // CodeGraph detection now scopes Glob to the project-root .codegraph directory.
  '- **Index present**: run a read-only `Glob` for `.codegraph/*`',
  '3. **Translated surface**:',
  'Autonomy is scoped to supervised spec execution. This autonomy is scoped to selector-dispatched supervision only (the **Auto** option).',
  // The selector rename and its delegated-write exception update the active
  // split contract while the pre-split contract remains the preservation baseline.
  '1. **No file writes',
  '3. **Translated surface',
  '9. **Post-crystallization review loop',
  '10. **Supervised sai-1/sai-2 pipeline',
  '- `active_change`',
  '- `review_rounds`',
  '- `diagnosis_rounds',
  '- **Explore item-10 bounded Diagnosis Round',
  '**Crystallization-close selector',
  '- **Auto** —',
  '- **Direct Build - Unattended** —',
  '- **Manual** —',
  'Selecting **Auto**',
  'The routed design worker',
  'The question text and every option label',
  'A free-text answer',
  '**Deterministic selection**: On an **Auto** selection',
  '**Phase-aware dispatch**: Before the first dispatch of an **Auto** run',
  'Autonomy is scoped to supervised spec execution',
  '**Resolved worker failure/cancellation — bounded diagnosis**',
  'If the Diagnosis Round yields',
  '**Failed/cancelled and other diagnosis-eligible Auto outcome guidance**',
  '**In-session supervised review rounds (spec phase)',
  'If the spec-proposal worker itself',
  '**In-session supervised review rounds (design phase)',
  'For any diagnosis-eligible design-phase Auto ending',
  'If the design worker returns',
  'The supervised pipeline never dispatches',
  'The design-worker diagnosis-eligible retry ending',
  '**Direct Build - Unattended supervision contract**',
  '**Direct Build (unattended) supervision contract**',
  '**Auto (fast implementation) supervision contract**',
  '**Build (unattended) supervision contract**',
  '- **Auto (fast implementation)**',
  '- **Build - Unattended**',
  '- **Build (unattended)**',
  '- **Deterministic selection inheritance**',
  '- **Run state** (conversation-only, never persisted)',
  '1. **Implement** — capture `base_sha`',
  '3. **Sibling backfill preparation**',
  '5. **ADR/DDR pass**',
  '6. **Backfill execution**',
  '7. **Archive preparation**',
  '8. **Archive execution and pre-authorized commit**',
  '3. Recompute `pending_slices`',
  '- For an `Auto` or `Auto (fast implementation)` continuation choice',
  '- For an `Auto` or `(fast implementation)` continuation choice',
  '- For an `Auto` or `Direct Build - Unattended` continuation choice',
  '- For a `Plan - Unattended` or `Direct Build - Unattended` continuation choice',
  '- For a `Plan (unattended)` or `Direct Build (unattended)` continuation choice',
  '- For an **Auto** or **Direct Build - Unattended** continuation choice',
  '- For a **Plan - Unattended** or **Direct Build - Unattended** continuation choice',
  '- For a **Plan (unattended)** or **Direct Build (unattended)** continuation choice',
  '**Implementation details stage (stage 3).',
  '- **Pre-dispatch compatibility refusal',
  'pipeline-auto-fast.md',
  'pipeline-auto-supervised.md',
  'sai-autofast-implement-worker',
  '--autofast',
  // The archive CLI sync+move change updated the Failures reporting text.
  '- **Failures** (E3): every segment applies `@sai/policies/bounded-recovery.md`',
];

function readPreSplitContract() {
  try {
    const output = execFileSync('git', ['show', `${commitHash}:sai/commands/explore/instructions.md`], {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..')
    });
    return output;
  } catch (err) {
    throw new Error(`Failed to read pre-split contract: ${err.message}`);
  }
}

function readCurrentFiles() {
  let content = '';

  // Read nucleus
  content += fs.readFileSync(nucleusFile, 'utf8');
  content += '\n';

  // Read all step files in alphabetical order
  const stepFiles = fs.readdirSync(stepsDir)
    .filter(file => file.endsWith('.md'))
    .sort();

  for (const file of stepFiles) {
    content += fs.readFileSync(path.join(stepsDir, file), 'utf8');
    content += '\n';
  }

  // Read extracted format policies
  const policiesDir = path.join(__dirname, '..', 'sai', 'policies');
  const readyToProposePolicyFile = path.join(policiesDir, 'ready-to-propose-format.md');
  if (fs.existsSync(readyToProposePolicyFile)) {
    content += fs.readFileSync(readyToProposePolicyFile, 'utf8');
    content += '\n';
  }

  return content;
}

function normalizeForComparison(line) {
  return line.trim();
}

function isAllowedDifference(line) {
  const normalized = normalizeForComparison(line);

  if (normalized.length === 0) {
    return true; // Empty lines are always OK
  }

  for (const prefix of allowedDifferences) {
    if (normalized.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

test('contract preservation: all pre-split lines appear in split files', () => {
  const preSplitContent = readPreSplitContract();
  const currentContent = readCurrentFiles();

  const preSplitLines = preSplitContent.split('\n');
  const currentLines = currentContent.split('\n');

  // Build a set of normalized lines from current files for fast lookup
  // Allow duplicates (per E2: some lines appear twice in pipeline-direct-build.md)
  const currentLineNormalized = new Set();
  const currentLineNormalizedMulti = new Map(); // Track count for duplicates

  for (const line of currentLines) {
    const normalized = normalizeForComparison(line);
    if (normalized.length > 0) {
      currentLineNormalized.add(normalized);
      const count = currentLineNormalizedMulti.get(normalized) || 0;
      currentLineNormalizedMulti.set(normalized, count + 1);
    }
  }

  // Check each non-empty line from pre-split contract
  const missingLines = [];

  for (const line of preSplitLines) {
    const normalized = normalizeForComparison(line);

    // Skip empty lines
    if (normalized.length === 0) {
      continue;
    }

    // Check if this line is an allowed difference
    if (isAllowedDifference(normalized)) {
      continue;
    }

    // Check if line exists in current files
    if (!currentLineNormalized.has(normalized)) {
      missingLines.push(line);
    }
  }

  // Format error message if there are missing lines
  let errorMessage = '';
  if (missingLines.length > 0) {
    errorMessage = 'The following lines from the pre-split contract are missing:\n';
    for (const line of missingLines) {
      const truncated = line.length > 80 ? line.substring(0, 77) + '...' : line;
      errorMessage += `  ${truncated}\n`;
    }
  }

  assert.equal(missingLines.length, 0, errorMessage);
});

test('contract preservation: all reachable step files exist and are mentioned', () => {
  const stepsFiles = fs.readdirSync(stepsDir)
    .filter(file => file.endsWith('.md'))
    .sort();

  // E3: All ten files should exist
  assert.equal(stepsFiles.length, 10,
    `Expected 10 step files, found ${stepsFiles.length}: ${stepsFiles.join(', ')}`);

  // Verify the specific expected files exist
  const expectedFiles = [
    'artifact-review-language-gate.md',
    'common.md',
    'crystallization-language-gates.md',
    'crystallization-protocol.md',
    'idea-list.md',
    'pipeline-direct-build.md',
    'pipeline-plan-unattended.md',
    'pipeline-selector.md',
    'review-loop.md',
    'slicing-assessment.md'
  ];

  for (const expectedFile of expectedFiles) {
    const exists = stepsFiles.includes(expectedFile);
    assert.ok(exists, `Expected step file not found: ${expectedFile}`);
  }
});

test('contract preservation: selector uses fixed English titles with localized descriptions', () => {
  const selector = fs.readFileSync(path.join(stepsDir, 'pipeline-selector.md'), 'utf8');
  const languageGate = fs.readFileSync(
    path.join(stepsDir, 'crystallization-language-gates.md'),
    'utf8',
  );
  const questionContext = fs.readFileSync(
    path.join(__dirname, '..', 'sai', 'policies', 'question-context.md'),
    'utf8',
  );

  assert.match(selector, /\*\*Plan - Unattended\*\*/);
  assert.match(selector, /\*\*Direct Build - Unattended\*\*/);
  assert.match(selector, /\*\*Manual\*\*/);
  assert.match(selector, /question text and each option description[\s\S]{0,160}fixed option titles remain exactly `Plan - Unattended`, `Direct Build - Unattended`, and `Manual`/i);
  assert.match(languageGate, /question text and all three option descriptions render in the user's language[\s\S]{0,140}option titles remain the fixed English literals `Plan - Unattended`, `Direct Build - Unattended`, and `Manual`/i);
  assert.match(questionContext, /Crystallization-close selector[\s\S]{0,120}`Plan - Unattended`[\s\S]{0,80}`Direct Build - Unattended`[\s\S]{0,40}`Manual`/i);
});
