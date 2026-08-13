// test/index-template-parity.test.js
//
// Index template parity: the ADR index template under
// sai/adr-index.template.md and the DDR index template under
// sai/ddr-index.template.md are project-agnostic section
// skeletons of the same shape, differing only in the decision-record family
// vocabulary (ADR/DDR, ADRs/DDRs, adr/ddr, docs/adr/ vs docs/ddr/).
// This suite pins, family-normalized on both sides:
//   - the top-level heading sequence: the H1 ("# ADR Index" vs "# DDR Index")
//     plus the five "## " headings in canonical order
//   - the "## Conventions" bullet sequence
//   - the pinned skeleton forms: the "<domain unit>" placeholder H2, the
//     entry-line form "- [NNNN — {Title}](./NNNN-slug.md)", the
//     correction-table header ("| ADR | Action | Over |" vs
//     "| DDR | Action | Over |"), and the supersede-note form
//     "— *Superseded by [NNNN](./NNNN-slug.md)*"
//
// Every dimension is asserted via assert.deepEqual with a first-divergence
// message that names the divergent pair and element, so a maintainer can
// identify the drifted side/line without re-reading either template.

'use strict';

const test = require('node:test').test;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

const pairName = 'adr-index ↔ ddr-index';

function readUtf8(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function normalizeFamily(value) {
  if (Array.isArray(value)) return value.map(normalizeFamily);
  if (typeof value !== 'string') return value;
  return value
    .replace(/DDRs/g, 'ADRs')
    .replace(/DDR/g, 'ADR')
    .replace(/docs\/ddr\//g, 'docs/adr/')
    .replace(/\bddr\b/g, 'adr');
}

function extractTopHeadings(content) {
  const headings = [];
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^#{1,2} /.test(trimmed)) headings.push(trimmed);
  }
  return headings;
}

function extractConventionsBullets(content) {
  const bullets = [];
  let inSection = false;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '## Conventions') {
      inSection = true;
      continue;
    }
    if (!inSection) continue;
    if (trimmed.startsWith('## ') || trimmed.startsWith('---')) break;
    if (trimmed.startsWith('- ')) bullets.push(trimmed);
  }
  return bullets;
}

function extractByDomainHeading(content) {
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## By ')) return trimmed;
  }
  return null;
}

function extractCorrectionHeader(content) {
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('| ') && trimmed.includes('Action') && trimmed.includes('Over')) {
      return trimmed;
    }
  }
  return null;
}

function extractEntryForm(content) {
  const match = content.match(/- \[NNNN — \{Title\}\]\(\.\/NNNN-slug\.md\)/);
  return match ? match[0] : null;
}

function extractSupersedeNote(content) {
  const match = content.match(/— \*Superseded by \[NNNN\]\(\.\/NNNN-slug\.md\)\*/);
  return match ? match[0] : null;
}

function formatValue(value) {
  return value === undefined ? 'undefined' : JSON.stringify(value);
}

function firstDivergenceMessage(dimension, actual, expected) {
  if (!Array.isArray(actual) || !Array.isArray(expected)) {
    if (actual !== expected) {
      return `${pairName} ${dimension}: divergence — one side has ${formatValue(actual)}, the other ${formatValue(expected)}`;
    }
    return `${pairName} ${dimension}: no divergence`;
  }
  const length = Math.max(actual.length, expected.length);
  for (let i = 0; i < length; i++) {
    if (actual[i] !== expected[i]) {
      return `${pairName} ${dimension}: first divergence at index ${i} — one side has ${formatValue(actual[i])}, the other ${formatValue(expected[i])}`;
    }
  }
  return `${pairName} ${dimension}: no divergence`;
}

function assertParity(dimension, actual, expected) {
  assert.deepEqual(actual, expected, firstDivergenceMessage(dimension, actual, expected));
}

test('adr-index and ddr-index template parity', () => {
  const adr = readUtf8('sai/adr-index.template.md');
  const ddr = readUtf8('sai/ddr-index.template.md');

  assertParity('top-level heading sequence', normalizeFamily(extractTopHeadings(adr)), normalizeFamily(extractTopHeadings(ddr)));
  assertParity('Conventions bullet sequence', normalizeFamily(extractConventionsBullets(adr)), normalizeFamily(extractConventionsBullets(ddr)));
  assertParity('pinned "By <domain unit>" H2', normalizeFamily(extractByDomainHeading(adr)), normalizeFamily(extractByDomainHeading(ddr)));
  assertParity('pinned correction-table header', normalizeFamily(extractCorrectionHeader(adr)), normalizeFamily(extractCorrectionHeader(ddr)));
  assertParity('pinned entry-line form', normalizeFamily(extractEntryForm(adr)), normalizeFamily(extractEntryForm(ddr)));
  assertParity('pinned supersede-note form', normalizeFamily(extractSupersedeNote(adr)), normalizeFamily(extractSupersedeNote(ddr)));
});
