// test/report-template-parity.test.js
//
// Report template parity: the per-pair template scaffolds under
// openspec/schemas/sai-workflow/templates/ and the report contracts under
// sai/commands/{accessibility,performance,review,security}/...report.template.md
// must stay in sync. This suite pins three
// dimensions per pair:
//   - top-level "## " heading sequence
//   - header metadata bolded field-label sequence (before the first heading)
//   - review pair only: bolded field labels under "## Mutation Analysis (Pass 11)"
//
// Asserted-vs-allowed divergence boundary:
//   PINNED   - the three lists above (headings, header labels, review
//              Mutation Analysis labels). Any drift on either side fails the
//              per-pair test.
//   ALLOWED  - placeholder syntax ("<!-- -->" on scaffolds vs "{...}" on
//              contracts), code-fence wrapping (contracts wrap their payload
//              in a ```markdown fence), and fill-in guidance depth. Do NOT
//              extend the assertions into these dimensions.
//
// All four pairs are asserted via assert.deepEqual with a message that names
// the divergent pair and the first divergent index/value, so a maintainer can
// identify the drifted heading/field without re-reading either template.

'use strict';

const test = require('node:test').test;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function readUtf8(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function findFenceRange(content) {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const opener = lines[i].match(/^(\s*)```markdown\s*$/);
    if (!opener) continue;
    for (let j = i + 1; j < lines.length; j++) {
      const closer = lines[j].match(/^(\s*)```\s*$/);
      if (closer && closer[1] === opener[1]) {
        return { start: i, end: j };
      }
    }
    return null;
  }
  return null;
}

function extractBody(content) {
  const range = findFenceRange(content);
  if (!range) return content;
  const lines = content.split(/\r?\n/);
  return lines.slice(range.start + 1, range.end).join('\n');
}

function extractTopHeadings(content) {
  const headings = [];
  for (const line of extractBody(content).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) headings.push(trimmed.slice(3).trim());
  }
  return headings;
}

function extractHeaderLabels(content) {
  const labels = [];
  for (const line of extractBody(content).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) break;
    const match = trimmed.match(/^(?:-\s+)?\*\*(.+?)\*\*:/);
    if (match) labels.push(match[1].trim());
  }
  return labels;
}

function extractMutationBoldLabels(content) {
  const labels = [];
  let inSection = false;
  for (const line of extractBody(content).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## Mutation Analysis (Pass 11)')) {
      inSection = true;
      continue;
    }
    if (!inSection) continue;
    if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) break;
    const match = trimmed.match(/^(?:-\s+)?\*\*(.+?)\*\*:/);
    if (match) labels.push(match[1].trim());
  }
  return labels;
}

function formatValue(value) {
  return value === undefined ? 'undefined' : JSON.stringify(value);
}

function firstDivergenceMessage(pairName, dimension, actual, expected) {
  const length = Math.max(actual.length, expected.length);
  for (let i = 0; i < length; i++) {
    if (actual[i] !== expected[i]) {
      return `${pairName} ${dimension}: first divergence at index ${i} — one side has ${formatValue(actual[i])}, the other ${formatValue(expected[i])}`;
    }
  }
  return `${pairName} ${dimension}: no divergence`;
}

function assertParity(pairName, dimension, actual, expected) {
  assert.deepEqual(
    actual,
    expected,
    firstDivergenceMessage(pairName, dimension, actual, expected)
  );
}

test('review pair parity', () => {
  const scaffold = readUtf8('openspec/schemas/sai-workflow/templates/review.md');
  const contract = readUtf8('sai/commands/review/review-report.template.md');
  assertParity('review pair', 'headings', extractTopHeadings(scaffold), extractTopHeadings(contract));
  assertParity('review pair', 'header labels', extractHeaderLabels(scaffold), extractHeaderLabels(contract));
  assertParity('review pair', 'Mutation Analysis labels', extractMutationBoldLabels(scaffold), extractMutationBoldLabels(contract));
});

test('security pair parity', () => {
  const scaffold = readUtf8('openspec/schemas/sai-workflow/templates/security.md');
  const contract = readUtf8('sai/commands/security/security-report.template.md');
  assertParity('security pair', 'headings', extractTopHeadings(scaffold), extractTopHeadings(contract));
  assertParity('security pair', 'header labels', extractHeaderLabels(scaffold), extractHeaderLabels(contract));
});

test('performance pair parity', () => {
  const scaffold = readUtf8('openspec/schemas/sai-workflow/templates/performance.md');
  const contract = readUtf8('sai/commands/performance/performance-report.template.md');
  assertParity('performance pair', 'headings', extractTopHeadings(scaffold), extractTopHeadings(contract));
  assertParity('performance pair', 'header labels', extractHeaderLabels(scaffold), extractHeaderLabels(contract));
});

test('accessibility pair parity', () => {
  const scaffold = readUtf8('openspec/schemas/sai-workflow/templates/accessibility.md');
  const contract = readUtf8('sai/commands/accessibility/accessibility-report.template.md');
  assertParity('accessibility pair', 'headings', extractTopHeadings(scaffold), extractTopHeadings(contract));
  assertParity('accessibility pair', 'header labels', extractHeaderLabels(scaffold), extractHeaderLabels(contract));
});
