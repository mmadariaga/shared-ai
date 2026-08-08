// test/sai-agents-index-document.test.js
//
// Orientation index document contract: the SAI_AGENTS.md orientation index and
// its install-manifest projection. This suite pins:
//   - exactly one manifest projection installing the orientation index
//     (id sai-agents-index, source sai/SAI_AGENTS.md, destination SAI_AGENTS.md)
//   - exactly one level-2 heading per SAI documentation surface, in canonical
//     order: GLOSSARY.md, SAI_LEARNINGS.md, ADR index, DDR index
//   - exactly four **Format**: pointers, each resolvable from a simulated
//     harness root where SAI_AGENTS.md sits next to the installed sai/ tree
//   - harness neutrality: no supported harness token and no @ fetch syntax

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const repoRoot = path.join(__dirname, '..');

test('install-manifest.json declares exactly one sai-agents-index projection', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'sai', 'install-manifest.json'), 'utf8')
  );
  const indexProjections = manifest.projections.filter(
    (projection) => projection.id === 'sai-agents-index'
  );

  assert.equal(indexProjections.length, 1, 'expected exactly one sai-agents-index projection');
  assert.equal(indexProjections[0].source, 'sai/SAI_AGENTS.md');
  assert.equal(indexProjections[0].destination.path, 'SAI_AGENTS.md');
});

test('SAI_AGENTS.md has exactly one entry per SAI documentation surface', () => {
  const index = fs.readFileSync(path.join(repoRoot, 'sai', 'SAI_AGENTS.md'), 'utf8');
  const headings = [...index.matchAll(/^## (.+)$/gm)].map((match) => match[1].trim());

  assert.deepEqual(headings, ['GLOSSARY.md', 'SAI_LEARNINGS.md', 'ADR index', 'DDR index']);
});

test('every format pointer in SAI_AGENTS.md resolves in the simulated install layout', () => {
  const index = fs.readFileSync(path.join(repoRoot, 'sai', 'SAI_AGENTS.md'), 'utf8');
  const pointers = [...index.matchAll(/\*\*Format\*\*:\s*([^\n]+)/g)].map((match) =>
    match[1].trim()
  );

  assert.equal(pointers.length, 4, 'expected exactly four **Format**: pointers');

  const layout = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-agents-'));
  try {
    fs.cpSync(path.join(repoRoot, 'sai'), path.join(layout, 'sai'), { recursive: true });
    fs.writeFileSync(path.join(layout, 'SAI_AGENTS.md'), index);
    for (const pointer of pointers) {
      assert.ok(
        fs.existsSync(path.join(layout, pointer)),
        `format pointer does not resolve in simulated install layout: ${pointer}`
      );
    }
  } finally {
    fs.rmSync(layout, { recursive: true, force: true });
  }
});

test('SAI_AGENTS.md names no harness and uses no @ fetch syntax', () => {
  const index = fs.readFileSync(path.join(repoRoot, 'sai', 'SAI_AGENTS.md'), 'utf8');

  assert.doesNotMatch(index, /\bclaude\b/i, 'orientation index must not name a harness');
  assert.doesNotMatch(index, /\bopencode\b/i, 'orientation index must not name a harness');
  assert.doesNotMatch(index, /@/, 'orientation index must not use @ fetch syntax');
});
