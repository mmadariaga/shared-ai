'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { installClaude, installOpencode } = require('../bin/install-flow.js');

const repoRoot = path.join(__dirname, '..');
const ACTIVE_STEP = 'sai/commands/implement/steps/artifact-analysis.md';
const COMPATIBILITY = 'sai/commands/implement/instructions.md';

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.equal(fs.existsSync(fullPath), true, `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

function cultureGate(source) {
  const start = source.indexOf('- **Culture check before any ask**:');
  assert.ok(start >= 0, 'the implementation source should declare the culture gate');
  const end = source.indexOf('\n- ', start + 1);
  return source.slice(start, end >= 0 ? end : source.length);
}

test('the active and apply-compatible implementation sources share the physical-index culture gate', () => {
  const active = cultureGate(artifact(ACTIVE_STEP));
  const compatibility = cultureGate(artifact(COMPATIBILITY));

  assert.equal(active, compatibility,
    'the routed step and apply compatibility source must keep the gate byte-identical');
  assert.match(active, /physical `0000-INDEX\.md` as the sole culture signal/);
  assert.match(active, /`docs\/adr\/0000-INDEX\.md` for `adr`/);
  assert.match(active, /`docs\/ddr\/0000-INDEX\.md` for `ddr`/);
  assert.match(active, /Do not infer culture from any other ADR\/DDR records/);
  assert.match(active, /other family's index/);
  assert.match(active, /files outside these recognized locations/);
});

test('the gate covers index-present, index-absent, existing-record, empty, and non-qualifying cases', () => {
  const gate = cultureGate(artifact(ACTIVE_STEP));

  assert.match(gate, /If the resolved-family index exists, create[\s\S]*directly without asking/,
    'an existing resolved-family index should enable direct creation');
  assert.match(gate, /If it is absent, ask the user a closed yes\/no[\s\S]*only upon explicit approval/,
    'a missing resolved-family index should require explicit approval');
  assert.match(gate, /missing index means no culture whether the resolved family has records or no records at all/,
    'existing or absent records without the index must not establish culture');
  assert.match(gate, /Never offer an ADR-vs-DDR choice in the ask/,
    'the approval question must not ask the user to choose a family');
  assert.match(gate, /If the decision does not meet all three criteria, create nothing and ask nothing/,
    'a non-qualifying decision must be a no-op');
});

test('family resolution precedes the culture gate and remains pinned to design.md', () => {
  const source = artifact(ACTIVE_STEP);
  const resolution = source.indexOf('- **Resolve the record family first**:');
  const culture = source.indexOf('- **Culture check before any ask**:');

  assert.ok(resolution >= 0 && culture > resolution,
    'the implementation step must resolve the family before checking culture');
  assert.match(source.slice(resolution, culture), /\*\*Record family\*\*: adr\|ddr/);
  assert.match(source.slice(resolution, culture), /ordered routing test/);
});

test('Claude Code and opencode projections preserve the same culture gate', () => {
  const projected = [];
  for (const [harness, install] of [['claude', installClaude], ['opencode', installOpencode]]) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), `sai-adr-culture-${harness}-`));
    try {
      install(base);
      for (const relativePath of [ACTIVE_STEP, COMPATIBILITY]) {
        const installedPath = path.join(base, ...relativePath.split('/'));
        assert.equal(fs.existsSync(installedPath), true,
          `${harness} should project ${relativePath}`);
        projected.push({ harness, relativePath, text: fs.readFileSync(installedPath, 'utf8') });
        assert.equal(fs.readFileSync(installedPath, 'utf8'), artifact(relativePath),
          `${harness} projection should match ${relativePath}`);
      }
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }

  assert.equal(cultureGate(projected[0].text), cultureGate(projected[2].text),
    'Claude Code and opencode active-step projections must agree');
  assert.equal(cultureGate(projected[1].text), cultureGate(projected[3].text),
    'Claude Code and opencode compatibility projections must agree');
});
