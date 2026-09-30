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
