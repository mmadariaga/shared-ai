'use strict';

// Block emit: `sai-state emit <id> explore-slice@1 --ready-to-propose -`
// validates the Ready to Propose block set read from stdin with the detector's
// strict profile and only then records the extracted change names as the
// explore slice inventory. Every case spawns the CLI as a real process.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { sessionFile } = require('../bin/sai-state.js');
const { RECEIVED_AT_PATTERN } = require('../sai/tools/worker-report-validator.js');

const REPO_ROOT = path.join(__dirname, '..');
const SAI_STATE_TOOL = path.join(REPO_ROOT, 'bin', 'sai-state.js');
const MACHINE = 'explore-slice@1';
const ROUTE_SELECTOR = 'sai/commands/explore/steps/route-selector.md';
const DIRECT_BUILD_STEP = 'sai/commands/explore/steps/pipeline-direct-build.md';

function runCli(argv, input) {
  const result = spawnSync(process.execPath, [SAI_STATE_TOOL, ...argv], { encoding: 'utf8', input: input || '' });
  return { stdout: result.stdout || '', stderr: result.stderr || '', exitCode: result.status };
}

function spawnSession(key) {
  const result = runCli(['spawn', '--key', `${key}-${process.pid}-${Date.now()}`]);
  assert.equal(result.exitCode, 0, result.stderr);
  return JSON.parse(result.stdout).id;
}

function cleanup(id) {
  try { fs.rmSync(sessionFile(id), { force: true }); } catch { /* best-effort */ }
}

function blockEmit(id, input, machineId = MACHINE, options = []) {
  return runCli(['emit', id, machineId, '--ready-to-propose', ...options, '-'], input);
}

function readSet(id) {
  const record = JSON.parse(fs.readFileSync(sessionFile(id), 'utf8'));
  const entry = record.stateByMachine && record.stateByMachine[MACHINE];
  if (!entry) return null;
  const state = entry.state || entry;
  return state.set;
}

function block(name, overrides = {}) {
  const fields = {
    'Change name': ` ${name}`,
    What: ' Adds a thing.',
    Why: ' Because it is needed.',
    'Capabilities in scope': '\n- thing: does a thing',
    'Research Leads': '\n- None',
    'Decisions & Rationale': '\n- None',
    'Alternatives Considered': '\n- None',
    'Trade-offs Accepted': '\n- None',
    'Model / Re-framings': '\n- None',
    'Key constraints': '\n- No format change.',
    Terms: '\n- None',
    'Edge Cases': '\n- E1: empty input fails.',
    'Implementation Details': '\n- I1: add the module.',
    'Out of scope Implementation Details': '\n- None',
    'Overview language': ' None',
    ...overrides,
  };
  const lines = ['## Ready to Propose', ''];
  for (const [label, value] of Object.entries(fields)) {
    if (value !== null) lines.push(`**${label}**:${value}`);
  }
  lines.push('', '---', '');
  return lines.join('\n');
}

test('block emit: a valid single block records its name and returns the route-selector pointer', () => {
  const id = spawnSession('rtp-single');
  try {
    const result = blockEmit(id, block('one-change'));
    assert.equal(result.exitCode, 0, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.equal(Object.keys(json)[0], 'received_at');
    assert.match(json.received_at, RECEIVED_AT_PATTERN);
    assert.equal(json.validation.ok, true);
    assert.equal(json.validation.profile, 'strict');
    assert.equal(json.stage, 'waiting');
    assert.equal(json.next.follow, ROUTE_SELECTOR);
    assert.deepEqual(readSet(id), ['one-change']);
  } finally {
    cleanup(id);
  }
});

test('block emit: a multi-slice set records every name in display order, with header text between blocks ignored', () => {
  const id = spawnSession('rtp-multi');
  try {
    const text = [
      'Walking Skeleton first, then backlog.',
      '',
      '### Slice 1',
      block('skeleton-slice'),
      '### Slice 2',
      block('backlog-slice'),
    ].join('\n');
    const result = blockEmit(id, text);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.deepEqual(readSet(id), ['skeleton-slice', 'backlog-slice']);
  } finally {
    cleanup(id);
  }
});

test('block emit: change names never appear on the wire', () => {
  const id = spawnSession('rtp-wire');
  try {
    const result = blockEmit(id, block('secret-name'));
    assert.equal(result.exitCode, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /secret-name/);
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.names, undefined);
    assert.equal(json.validation.blocks[0].name, undefined);
  } finally {
    cleanup(id);
  }
});

test('block emit: one invalid block fails the whole set, exits 1, and records nothing (E1, E2)', () => {
  const id = spawnSession('rtp-invalid');
  try {
    const text = `${block('good-slice')}\n${block('bad-slice', { Terms: null })}`;
    const result = blockEmit(id, text);
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.ok, false);
    assert.equal(json.error, undefined, 'a validation failure is not a delivery failure');
    assert.equal(json.stage, undefined, 'an invalid verdict never reaches the machine');
    assert.equal(json.validation.blocks[1].index, 1);
    assert.ok(json.validation.blocks[1].violations.some((v) => v.problem === 'MISSING_SECTION'));
    assert.equal(readSet(id), null, 'no inventory may exist after an invalid verdict');
  } finally {
    cleanup(id);
  }
});

test('block emit: duplicate names in the set fail validation', () => {
  const id = spawnSession('rtp-duplicate');
  try {
    const result = blockEmit(id, `${block('same-name')}\n${block('same-name')}`);
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.ok(json.validation.violations.some((v) => v.problem === 'DUPLICATE_CHANGE_NAME'));
  } finally {
    cleanup(id);
  }
});

test('block emit: empty, heading-less, or cut-off stdin is a delivery failure (E3)', () => {
  const id = spawnSession('rtp-delivery');
  try {
    const full = block('cut-change');
    const cut = full.slice(0, full.indexOf('**Terms**'));
    for (const input of ['', '   \n', 'not a block at all', cut]) {
      const result = blockEmit(id, input);
      assert.equal(result.exitCode, 1, JSON.stringify(input));
      const json = JSON.parse(result.stdout);
      assert.equal(json.error, 'INVALID_EVENT');
      assert.equal(json.reason, 'EVENT_UNPARSEABLE');
      assert.equal(json.validation.ok, false);
      assert.match(result.stderr, /no transition occurred/);
    }
    assert.equal(readSet(id), null);
  } finally {
    cleanup(id);
  }
});

test('block emit: prose in another language passes and names are recorded', () => {
  const id = spawnSession('rtp-language');
  try {
    const text = block('cambio-uno', { What: ' Añade una función nueva.', Why: ' Porque hace falta.' });
    const result = blockEmit(id, text);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.deepEqual(readSet(id), ['cambio-uno']);
  } finally {
    cleanup(id);
  }
});

test('block emit: a later block emit replaces the inventory (E7)', () => {
  const id = spawnSession('rtp-replace');
  try {
    assert.equal(blockEmit(id, block('first-set')).exitCode, 0);
    assert.equal(blockEmit(id, `${block('second-a')}\n${block('second-b')}`).exitCode, 0);
    assert.deepEqual(readSet(id), ['second-a', 'second-b']);
  } finally {
    cleanup(id);
  }
});

test('block emit: with an active slice it returns that slice\'s pointer, not the route selector (E6)', () => {
  const id = spawnSession('rtp-active');
  try {
    assert.equal(blockEmit(id, block('running-slice')).exitCode, 0);
    assert.equal(runCli(['emit', id, MACHINE, '-'], '{"intent":"route-choice"}').exitCode, 0);
    const started = runCli(['emit', id, MACHINE, '-'], '{"intent":"direct-build"}');
    assert.equal(started.exitCode, 0, started.stderr);
    const result = blockEmit(id, block('new-slice'));
    assert.equal(result.exitCode, 0, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.equal(json.next.follow, DIRECT_BUILD_STEP);
    assert.notEqual(json.next.follow, ROUTE_SELECTOR);
  } finally {
    cleanup(id);
  }
});

test('block emit: usage errors exit 2 (other machine, missing marker, combined flags)', () => {
  const id = spawnSession('rtp-usage');
  try {
    const valid = block('usage-change');
    assert.equal(blockEmit(id, valid, 'explore-idea@1').exitCode, 2);
    assert.equal(blockEmit(id, valid, 'design-standalone@1').exitCode, 2);
    assert.equal(runCli(['emit', id, MACHINE, '--ready-to-propose'], valid).exitCode, 2);
    assert.equal(runCli(['emit', id, MACHINE, '--ready-to-propose', '-', 'extra'], valid).exitCode, 2);
    assert.equal(blockEmit(id, valid, MACHINE, ['--progress']).exitCode, 2);
    assert.equal(blockEmit(id, valid, MACHINE, ['--with-overview', 'true']).exitCode, 2);
    assert.equal(readSet(id), null);
  } finally {
    cleanup(id);
  }
});
