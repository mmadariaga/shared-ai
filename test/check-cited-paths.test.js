'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { collectFromContent } = require('../sai/tools/check-cited-paths.js');

const cited = (md) => collectFromContent(md, 'proposal.md').map((c) => c.cited);

test('Local files field: inline paths', () => {
  assert.deepStrictEqual(cited('**Local files**: sai/tools/a.js, `bin/b.js` — note'), ['sai/tools/a.js', 'bin/b.js']);
});

test('Local files field: bullets below, ends at next field', () => {
  const md = '**Local files**:\n- sai/x.md\n- test/y.js\n\n**External URLs**: sai/not-checked.md\n';
  assert.deepStrictEqual(cited(md), ['sai/x.md', 'test/y.js']);
});

test('Local files field: None, empty, and placeholder comment are not paths', () => {
  assert.deepStrictEqual(cited('**Local files**: None'), []);
  assert.deepStrictEqual(cited('**Local files**:'), []);
  assert.deepStrictEqual(cited('**Local files**: <!-- list files -->'), []);
});

test('headings and Precise file locations still accepted', () => {
  assert.deepStrictEqual(cited('### Local files\n- sai/a.md\n'), ['sai/a.md']);
  assert.deepStrictEqual(cited('## Precise file locations\n- sai/b.md\n'), ['sai/b.md']);
});

const citedInterfaces = (md) => collectFromContent(md, 'interfaces.md').map((c) => c.cited);

test('Test assertions field: list items, marked and unmarked, are checked', () => {
  const md = [
    '## Step 1: Title',
    '',
    '**Interfaces**: sai/not-checked.md',
    '',
    '**Test assertions**:',
    '- [smoke-test] input → output (`openspec/changes/x/specs/a/spec.md`)',
    '- other input → other output (`openspec/changes/x/specs/b/spec.md`)',
    '',
    '## Step 2: Next',
    '',
    '**Interfaces**: sai/not-checked-either.md',
    '',
  ].join('\n');
  assert.deepStrictEqual(citedInterfaces(md), [
    'openspec/changes/x/specs/a/spec.md',
    'openspec/changes/x/specs/b/spec.md',
  ]);
});

test('Test assertions field: earlier prose form on the label line still works', () => {
  const md = '## Step 1: T\n\n**Test assertions**: a → b (`openspec/changes/x/specs/a/spec.md`)\n\n**Interfaces**: sai/not-checked.md\n';
  assert.deepStrictEqual(citedInterfaces(md), ['openspec/changes/x/specs/a/spec.md']);
});

test('Test assertions field: list ends at the next field line', () => {
  const md = '**Test assertions**:\n- a (`sai/in.md`)\n**Interfaces**: sai/out.md\n- b (`sai/out2.md`)\n';
  assert.deepStrictEqual(citedInterfaces(md), ['sai/in.md']);
});
