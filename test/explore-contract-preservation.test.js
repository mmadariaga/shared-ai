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
  // Allow duplicates (per E2: some lines appear twice in pipeline-auto-fast.md)
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
    'pipeline-auto-fast.md',
    'pipeline-auto-supervised.md',
    'pipeline-selector.md',
    'review-loop.md',
    'slicing-assessment.md'
  ];

  for (const expectedFile of expectedFiles) {
    const exists = stepsFiles.includes(expectedFile);
    assert.ok(exists, `Expected step file not found: ${expectedFile}`);
  }
});
