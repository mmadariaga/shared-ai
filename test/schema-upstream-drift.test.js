'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const schemaPath = path.join(repoRoot, 'openspec/schemas/sai-workflow/schema.yaml');
// Verbatim copy of `schemas/spec-driven/schema.yaml` from @fission-ai/openspec 1.15.0
// (`npm pack @fission-ai/openspec@1.15.0`). It is a test fixture: it is never installed.
const snapshotPath = path.join(__dirname, 'fixtures/spec-driven-1.15.0.schema.yaml');

const ARTIFACTS = ['proposal', 'specs'];
const BEGIN = '<!-- sai-additions:begin -->';
const END = '<!-- sai-additions:end -->';

/** The `instruction: |` block scalar of one artifact entry, dedented. */
function instructionOf(yaml, id) {
  const lines = yaml.split(/\r?\n/);
  const start = lines.findIndex(line => line === `  - id: ${id}`);
  assert.ok(start >= 0, `schema should contain the ${id} artifact entry`);
  const marker = lines.findIndex((line, index) => index > start && line === '    instruction: |');
  assert.ok(marker >= 0, `${id} should carry a literal instruction block`);
  let end = marker + 1;
  while (end < lines.length && (lines[end] === '' || lines[end].startsWith('      '))) end += 1;
  return lines.slice(marker + 1, end).map(line => line.slice(6)).join('\n').trim();
}

/** The instruction without its delimited SAI additions: the part that must match upstream. */
function upstreamPart(instruction) {
  const lines = instruction.split('\n');
  const kept = [];
  let inside = false;
  let blocks = 0;
  for (const line of lines) {
    if (line.trim() === BEGIN) {
      assert.equal(inside, false, 'SAI additions blocks must not nest');
      inside = true;
      blocks += 1;
    } else if (line.trim() === END) {
      assert.equal(inside, true, 'SAI additions end marker has no begin marker');
      inside = false;
    } else if (!inside) {
      kept.push(line);
    }
  }
  assert.equal(inside, false, 'SAI additions block is not closed');
  assert.equal(blocks, 1, 'the instruction carries exactly one SAI additions block');
  return kept.join('\n').trim();
}

/** Blank-line separated sections of an instruction. */
function sections(text) {
  return text.split(/\n{2,}/);
}

/** Null when the texts match; otherwise the first diverging section, named. */
function firstDivergence(id, actual, expected) {
  const left = sections(actual);
  const right = sections(expected);
  const count = Math.max(left.length, right.length);
  for (let index = 0; index < count; index += 1) {
    if (left[index] !== right[index]) {
      const shown = (left[index] ?? right[index]).split('\n')[0].trim().slice(0, 70);
      return `${id} instruction diverges from spec-driven 1.15.0 at section ${index + 1} ("${shown}")`;
    }
  }
  return null;
}

const schema = fs.readFileSync(schemaPath, 'utf8');
const snapshot = fs.readFileSync(snapshotPath, 'utf8');

test('the copied proposal and specs instructions match the spec-driven 1.15.0 snapshot', () => {
  for (const id of ARTIFACTS) {
    const divergence = firstDivergence(id, upstreamPart(instructionOf(schema, id)), instructionOf(snapshot, id));
    assert.equal(divergence, null, divergence ?? '');
  }
});

test('the drift check fails and names the diverging section when the copied text differs', () => {
  const upstream = instructionOf(snapshot, 'specs');
  const copied = upstream.replace('Delta operations (use ## headers):', 'Delta operations (use ### headers):');
  assert.notEqual(copied, upstream);
  const divergence = firstDivergence('specs', copied, upstream);
  assert.match(divergence, /^specs instruction diverges from spec-driven 1\.15\.0 at section \d+ \("Delta operations/);
});

test('an edit inside the delimited SAI additions keeps the drift check passing', () => {
  const instruction = instructionOf(schema, 'proposal');
  const edited = instruction.replace(END, `- An extra SAI-only rule.\n${END}`);
  assert.notEqual(edited, instruction);
  assert.equal(firstDivergence('proposal', upstreamPart(edited), instructionOf(snapshot, 'proposal')), null);
});

test('each copied instruction carries one SAI additions block', () => {
  for (const id of ARTIFACTS) {
    const instruction = instructionOf(schema, id);
    assert.ok(instruction.includes('skip_specs'), `${id} additions state the skip_specs rule`);
    assert.ok(instruction.indexOf(BEGIN) > instruction.length / 2, `${id} additions follow the upstream text`);
    upstreamPart(instruction);
  }
});

// The reference CLI is 1.13.0 and the prerequisite check stays presence-only, so the copied
// 1.15.0 text may cite only subcommands and options that 1.13.0 already has.
const CLI_1_13_0 = {
  subcommands: new Set(['list', 'show', 'validate', 'instructions']),
  options: new Set(['--specs', '--type', '--json', '--no-scenarios', '--store', '--strict']),
};

test('the copied text cites only openspec commands and options that exist in CLI 1.13.0', () => {
  let cited = 0;
  for (const id of ARTIFACTS) {
    const text = upstreamPart(instructionOf(schema, id)).replace(/\n\s+/g, ' ');
    for (const match of text.matchAll(/`openspec ([a-z-]+)([^`]*)`/g)) {
      cited += 1;
      assert.ok(CLI_1_13_0.subcommands.has(match[1]), `${id} cites openspec ${match[1]}, absent from CLI 1.13.0`);
      for (const option of match[2].matchAll(/(?:^|\s)(--[a-z-]+)/g)) {
        assert.ok(CLI_1_13_0.options.has(option[1]), `${id} cites ${option[1]}, absent from CLI 1.13.0`);
      }
    }
  }
  assert.ok(cited > 0, 'the copied text cites openspec commands');
});
