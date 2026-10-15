'use strict';

// Block emit: `sai-state emit <id> explore-slice@1 --ready-to-propose -`
// validates the Ready to Propose block set read from stdin with the detector's
// dispatchable profile (plus the judgment verdicts after the verdicts marker)
// and only then records the extracted change names as the explore slice
// inventory and stores each block's text, hash, and verdicts. Every case
// spawns the CLI as a real process.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { sessionFile } = require('../bin/sai-state.js');
const { RECEIVED_AT_PATTERN } = require('../sai/tools/worker-report-validator.js');

const { hashBlock, VERDICTS_MARKER } = require('../sai/tools/ready-to-propose.js');

const REPO_ROOT = path.join(__dirname, '..');
const SAI_STATE_TOOL = path.join(REPO_ROOT, 'bin', 'sai-state.js');
const MACHINE = 'explore-slice@1';
const ROUTE_SELECTOR = 'sai/commands/explore/steps/route-selector.md';
const DIRECT_BUILD_STEP = 'sai/commands/explore/steps/pipeline-direct-build.md';

function runCli(argv, input) {
  const result = spawnSync(process.execPath, [SAI_STATE_TOOL, ...argv], { encoding: 'utf8', input: input || '' });
  return { stdout: result.stdout || '', stderr: result.stderr || '', exitCode: result.status };
}

const IDEA_MACHINE = 'explore-idea@1';

function advanceIdea(id, steps) {
  for (let i = 0; i < steps; i++) {
    const result = runCli(['emit', id, IDEA_MACHINE, '-'], '{"intent":"next-step"}');
    assert.equal(result.exitCode, 0, result.stderr);
  }
}

// The block emit is accepted only at the `crystallize` stage of
// `explore-idea@1`, so a session advances there unless a case passes `false`.
function spawnSession(key, atCrystallize = true) {
  const result = runCli(['spawn', '--key', `${key}-${process.pid}-${Date.now()}`]);
  assert.equal(result.exitCode, 0, result.stderr);
  const id = JSON.parse(result.stdout).id;
  if (atCrystallize) advanceIdea(id, 3);
  return id;
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

function readStoredBlocks(id) {
  const record = JSON.parse(fs.readFileSync(sessionFile(id), 'utf8'));
  return record.blocks || null;
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
    assert.equal(json.validation.profile, 'dispatchable');
    assert.equal(json.stage, 'waiting');
    assert.equal(json.next.follow, ROUTE_SELECTOR);
    assert.deepEqual(readSet(id), ['one-change']);
  } finally {
    cleanup(id);
  }
});

test('block guard: a block emitted before the crystallize stage is rejected and records nothing', () => {
  for (const steps of [0, 1, 2]) {
    const id = spawnSession(`rtp-guard-${steps}`, false);
    try {
      advanceIdea(id, steps);
      const result = blockEmit(id, block('early-change'));
      assert.equal(result.exitCode, 1);
      const json = JSON.parse(result.stdout);
      assert.equal(json.error, 'INVALID_EVENT');
      assert.equal(json.reason, 'STAGE_NOT_CRYSTALLIZE');
      assert.equal(json.stage, ['explore-change', 'review-edge-cases', 'implementation-details'][steps]);
      assert.match(result.stderr, /crystallize/);
      assert.equal(readSet(id), null);
      assert.equal(readStoredBlocks(id), null);
    } finally {
      cleanup(id);
    }
  }
});

test('block guard: the block is accepted once the exploration reaches crystallize, and an amendment is not stage-checked', () => {
  const id = spawnSession('rtp-guard-open', false);
  try {
    advanceIdea(id, 3);
    assert.equal(blockEmit(id, block('late-change')).exitCode, 0);
    assert.deepEqual(readSet(id), ['late-change']);
    // The idea leaves crystallize through the late POC entry; the amend stays outside the guard.
    const lane = runCli(['emit', id, IDEA_MACHINE, '-'], '{"intent":"poc-lane-late"}');
    assert.equal(lane.exitCode, 0, lane.stderr);
    const amended = blockEmit(id, block('late-change', { What: ' Adds another thing.' }), MACHINE, ['--amend', 'late-change']);
    assert.equal(amended.exitCode, 0, amended.stderr);
  } finally {
    cleanup(id);
  }
});

test('dependency set storage orders blockers, hashes internal edges and rejects invalid amendments without replacement', () => {
  const id = spawnSession('dependency-set');
  try {
    const dependent = block('dependent').replace('**What**:', '**Depends on**: blocker\n**What**:');
    const blocker = block('blocker');
    assert.equal(blockEmit(id, dependent + '\n' + blocker).exitCode, 0);
    assert.deepEqual(readSet(id), ['blocker', 'dependent']);
    const before = readStoredBlocks(id);
    assert.match(before.dependent.text, /\*\*Depends on\*\*: blocker/);
    assert.equal(before.dependent.hash, hashBlock(before.dependent.text));
    for (const value of ['missing', 'dependent', 'blocker, blocker']) {
      const amended = dependent.replace('**Depends on**: blocker', `**Depends on**: ${value}`);
      assert.equal(blockEmit(id, amended, MACHINE, ['--amend', 'dependent']).exitCode, 1);
      assert.deepEqual(readStoredBlocks(id), before);
    }
    const cycle = blocker.replace('**What**:', '**Depends on**: dependent\n**What**:');
    assert.equal(blockEmit(id, cycle, MACHINE, ['--amend', 'blocker']).exitCode, 1);
    assert.deepEqual(readStoredBlocks(id), before);
    assert.equal(blockEmit(id, dependent.replace('Adds a thing.', 'Adds a revised thing.'), MACHINE, ['--amend', 'dependent']).exitCode, 0);
    assert.notEqual(readStoredBlocks(id).dependent.hash, before.dependent.hash);
  } finally { cleanup(id); }
});

test('complete dependency sets fail before emission when references are missing or cyclic', () => {
  const id = spawnSession('invalid-dependency-set');
  try {
    const one = block('one').replace('**What**:', '**Depends on**: two\n**What**:');
    const two = block('two').replace('**What**:', '**Depends on**: one\n**What**:');
    for (const text of [one, one + '\n' + two]) {
      const result = blockEmit(id, text);
      assert.equal(result.exitCode, 1);
      assert.equal(JSON.parse(result.stdout).validation.ok, false);
      assert.equal(readStoredBlocks(id), null);
      assert.equal(readSet(id), null);
    }
  } finally { cleanup(id); }
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

test('block emit: a block with no in-scope implementation item records nothing (E1)', () => {
  const id = spawnSession('rtp-no-item');
  try {
    const result = blockEmit(id, block('empty-details', { 'Implementation Details': '\n- None' }));
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.ok, false);
    assert.ok(json.validation.blocks[0].violations.some((v) => v.problem === 'NO_IMPLEMENTATION_ITEM'));
    assert.equal(json.stage, undefined);
    assert.equal(readSet(id), null);
    assert.equal(readStoredBlocks(id), null);
  } finally {
    cleanup(id);
  }
});

test('block emit: a flagged line without a verdict records nothing and is reported', () => {
  const id = spawnSession('rtp-pending');
  try {
    const result = blockEmit(id, block('git-subject', { Why: ' The change is about git commit messages.' }));
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.ok, false);
    assert.equal(json.validation.structural_ok, true);
    assert.deepEqual(json.validation.flagged.map((f) => f.clause), ['mutating-git']);
    assert.equal(json.validation.judgment.pending.length, 1);
    assert.equal(readSet(id), null);
    assert.equal(readStoredBlocks(id), null);
  } finally {
    cleanup(id);
  }
});

test('block emit: context verdicts record the set and store text, hash, and verdicts per change name (E3)', () => {
  const id = spawnSession('rtp-context');
  try {
    const text = block('git-subject', { Why: ' The change is about git commit messages.' });
    const flaggedLine = text.split('\n').findIndex((line) => line.startsWith('**Why**')) + 1;
    const verdicts = [{ clause: 'mutating-git', line: flaggedLine, evidence: 'Why names the subject of the change.', verdict: 'context' }];
    const result = blockEmit(id, `${text}\n${VERDICTS_MARKER}\n${JSON.stringify(verdicts)}\n`);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.deepEqual(readSet(id), ['git-subject']);
    const stored = readStoredBlocks(id);
    assert.deepEqual(Object.keys(stored), ['git-subject']);
    const blockText = text.split('\n').slice(0, text.split('\n').indexOf('---') + 1).join('\n');
    assert.equal(stored['git-subject'].text, blockText);
    assert.equal(stored['git-subject'].hash, hashBlock(blockText));
    assert.deepEqual(stored['git-subject'].verdicts, verdicts);
  } finally {
    cleanup(id);
  }
});

test('block emit: a violation verdict records nothing and the verdict is shown (E4)', () => {
  const id = spawnSession('rtp-violation');
  try {
    const text = block('bad-ask', { 'Implementation Details': '\n- I1: run git commit after the edit.' });
    const flaggedLine = text.split('\n').findIndex((line) => line.startsWith('- I1')) + 1;
    const verdicts = [{ clause: 'mutating-git', line: flaggedLine, evidence: 'I1 asks for a commit.', verdict: 'violation' }];
    const result = blockEmit(id, `${text}\n${VERDICTS_MARKER}\n${JSON.stringify(verdicts)}`);
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.judgment.violations.length, 1);
    assert.equal(json.validation.judgment.violations[0].line, flaggedLine);
    assert.equal(readSet(id), null);
    assert.equal(readStoredBlocks(id), null);
  } finally {
    cleanup(id);
  }
});

test('block emit: a later successful emit replaces the stored blocks', () => {
  const id = spawnSession('rtp-store-replace');
  try {
    assert.equal(blockEmit(id, block('first-set')).exitCode, 0);
    assert.deepEqual(Object.keys(readStoredBlocks(id)), ['first-set']);
    assert.equal(blockEmit(id, `${block('second-a')}\n${block('second-b')}`).exitCode, 0);
    assert.deepEqual(Object.keys(readStoredBlocks(id)), ['second-a', 'second-b']);
    assert.deepEqual(readStoredBlocks(id)['second-a'].verdicts, []);
  } finally {
    cleanup(id);
  }
});

test('block emit: blocks that cannot be stored are reported with BLOCKS_NOT_STORED, never silently dropped', { skip: process.platform === 'win32' || (typeof process.getuid === 'function' && process.getuid() === 0) }, () => {
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-blocks-'));
  const env = Object.assign({}, process.env, { TMPDIR: tmp, TEMP: tmp, TMP: tmp });
  const run = (argv, input) => spawnSync(process.execPath, [SAI_STATE_TOOL, ...argv], { encoding: 'utf8', input: input || '', env });
  const stateDir = path.join(tmp, 'sai-state');
  try {
    const spawned = run(['spawn', '--key', `rtp-unwritable-${process.pid}-${Date.now()}`]);
    assert.equal(spawned.status, 0, spawned.stderr);
    const id = JSON.parse(spawned.stdout).id;
    fs.chmodSync(stateDir, 0o500);
    const result = run(['emit', id, MACHINE, '--ready-to-propose', '-'], block('unstored-change'));
    assert.equal(result.status, 0, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.ok(json.warnings.includes('BLOCKS_NOT_STORED'));
    assert.equal(json.validation.ok, true);
  } finally {
    try { fs.chmodSync(stateDir, 0o700); } catch { /* best-effort */ }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Stored block dispatch: `sai-state block` and the single-slice amendment
// ---------------------------------------------------------------------------

function blockVerb(id, name) {
  return runCli(['block', id, name]);
}

function amendEmit(id, name, input) {
  return runCli(['emit', id, MACHINE, '--ready-to-propose', '--amend', name, '-'], input);
}

function readState(id) {
  const record = JSON.parse(fs.readFileSync(sessionFile(id), 'utf8'));
  return record.stateByMachine[MACHINE].state;
}

function blockTextOf(text) {
  return text.split('\n').slice(0, text.split('\n').indexOf('---') + 1).join('\n');
}

test('block verb: returns the stored text and hash of one recorded slice', () => {
  const id = spawnSession('rtp-block-verb');
  try {
    const text = `${block('slice-a')}\n${block('slice-b', { What: ' Adds another thing.' })}`;
    assert.equal(blockEmit(id, text).exitCode, 0);
    const result = blockVerb(id, 'slice-b');
    assert.equal(result.exitCode, 0, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.match(json.received_at, RECEIVED_AT_PATTERN);
    assert.equal(Object.keys(json)[0], 'received_at');
    assert.equal(json.text, readStoredBlocks(id)['slice-b'].text);
    assert.equal(json.hash, hashBlock(json.text));
    assert.match(json.text, /Adds another thing\./);
  } finally {
    cleanup(id);
  }
});

test('block verb: a missing session, store, or change name is BLOCK_NOT_FOUND with no text', () => {
  const id = spawnSession('rtp-block-missing');
  try {
    const empty = blockVerb(id, 'slice-a');
    assert.equal(empty.exitCode, 1);
    assert.equal(JSON.parse(empty.stdout).error, 'BLOCK_NOT_FOUND');
    assert.equal(blockEmit(id, block('slice-a')).exitCode, 0);
    const unknown = blockVerb(id, 'other');
    assert.equal(unknown.exitCode, 1);
    const json = JSON.parse(unknown.stdout);
    assert.equal(json.error, 'BLOCK_NOT_FOUND');
    assert.equal(json.text, undefined);
    assert.equal(blockVerb(id, '__proto__').exitCode, 1);
    assert.equal(runCli(['block', id]).exitCode, 2);
  } finally {
    cleanup(id);
  }
});

test('block verb: after the session closes the block is gone', () => {
  const id = spawnSession('rtp-block-closed');
  assert.equal(blockEmit(id, block('slice-a')).exitCode, 0);
  assert.equal(runCli(['close', id]).exitCode, 0);
  const result = blockVerb(id, 'slice-a');
  assert.equal(result.exitCode, 1);
  cleanup(id);
});

test('amend: a pending slice is replaced and no other stored entry or inventory field changes (E5)', () => {
  const id = spawnSession('rtp-amend-pending');
  try {
    const set = `${block('slice-a')}\n${block('slice-b')}`;
    assert.equal(blockEmit(id, set).exitCode, 0);
    const before = readStoredBlocks(id);
    const stateBefore = readState(id);
    const amended = block('slice-b', { What: ' Adds the corrected thing.' });
    const result = amendEmit(id, 'slice-b', amended);
    assert.equal(result.exitCode, 0, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.ok, true);
    assert.equal(json.rejected, undefined);
    const after = readStoredBlocks(id);
    assert.deepEqual(after['slice-a'], before['slice-a']);
    assert.equal(after['slice-b'].text, blockTextOf(amended));
    assert.equal(after['slice-b'].hash, hashBlock(blockTextOf(amended)));
    assert.notEqual(after['slice-b'].hash, before['slice-b'].hash);
    assert.deepEqual(Object.keys(after), ['slice-a', 'slice-b']);
    assert.deepEqual(readState(id), stateBefore);
    assert.equal(JSON.parse(blockVerb(id, 'slice-b').stdout).hash, after['slice-b'].hash);
  } finally {
    cleanup(id);
  }
});

test('amend: the amended block carries its own verdicts', () => {
  const id = spawnSession('rtp-amend-verdicts');
  try {
    assert.equal(blockEmit(id, block('slice-a')).exitCode, 0);
    const amended = block('slice-a', { Why: ' The change is about git commit messages.' });
    const line = amended.split('\n').findIndex((l) => l.startsWith('**Why**')) + 1;
    const verdicts = [{ clause: 'mutating-git', line, evidence: 'Why names the subject.', verdict: 'context' }];
    const result = amendEmit(id, 'slice-a', `${amended}\n${VERDICTS_MARKER}\n${JSON.stringify(verdicts)}`);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.deepEqual(readStoredBlocks(id)['slice-a'].verdicts, verdicts);
  } finally {
    cleanup(id);
  }
});

test('amend: a stopped (parked) slice is accepted and keeps its saved cursor', () => {
  const id = spawnSession('rtp-amend-stopped');
  try {
    assert.equal(blockEmit(id, block('slice-a')).exitCode, 0);
    assert.equal(runCli(['emit', id, MACHINE, '-'], '{"intent":"route-choice"}').exitCode, 0);
    assert.equal(runCli(['emit', id, MACHINE, '-'], '{"intent":"direct-build"}').exitCode, 0);
    assert.equal(runCli(['emit', id, MACHINE, '-'], '{"intent":"complete"}').exitCode, 0);
    assert.equal(runCli(['emit', id, MACHINE, '-'], '{"intent":"fail"}').exitCode, 0);
    const parkedBefore = readState(id).parked;
    assert.deepEqual(Object.keys(parkedBefore), ['slice-a']);
    const amended = block('slice-a', { What: ' Adds the corrected thing.' });
    const result = amendEmit(id, 'slice-a', amended);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).rejected, undefined);
    assert.deepEqual(readState(id).parked, parkedBefore);
    assert.equal(readStoredBlocks(id)['slice-a'].text, blockTextOf(amended));
  } finally {
    cleanup(id);
  }
});

test('amend: a running slice is rejected and its stored block stays unchanged (E5)', () => {
  const id = spawnSession('rtp-amend-running');
  try {
    assert.equal(blockEmit(id, `${block('slice-a')}\n${block('slice-b')}`).exitCode, 0);
    assert.equal(runCli(['emit', id, MACHINE, '-'], '{"intent":"route-choice"}').exitCode, 0);
    assert.equal(runCli(['emit', id, MACHINE, '-'], '{"intent":"direct-build"}').exitCode, 0);
    const before = readStoredBlocks(id);
    const result = amendEmit(id, 'slice-a', block('slice-a', { What: ' Changed mid-run.' }));
    assert.equal(JSON.parse(result.stdout).rejected, 'SLICE_RUNNING');
    assert.deepEqual(readStoredBlocks(id), before);
    // A different, pending slice is still amendable while one runs.
    const other = amendEmit(id, 'slice-b', block('slice-b', { What: ' Changed while another runs.' }));
    assert.equal(JSON.parse(other.stdout).rejected, undefined);
    assert.match(readStoredBlocks(id)['slice-b'].text, /Changed while another runs\./);
  } finally {
    cleanup(id);
  }
});

test('amend: a completed slice is rejected and the stored block stays unchanged (E5)', () => {
  const id = spawnSession('rtp-amend-completed');
  try {
    assert.equal(blockEmit(id, `${block('slice-a')}\n${block('slice-b')}`).exitCode, 0);
    assert.equal(runCli(['emit', id, MACHINE, '-'], '{"intent":"route-choice"}').exitCode, 0);
    assert.equal(runCli(['emit', id, MACHINE, '-'], '{"intent":"direct-build"}').exitCode, 0);
    for (let i = 0; i < 3; i++) assert.equal(runCli(['emit', id, MACHINE, '-'], '{"intent":"complete"}').exitCode, 0);
    assert.deepEqual(readState(id).done, ['slice-a']);
    const before = readStoredBlocks(id);
    const result = amendEmit(id, 'slice-a', block('slice-a', { What: ' Changed after completion.' }));
    assert.equal(JSON.parse(result.stdout).rejected, 'SLICE_COMPLETED');
    assert.deepEqual(readStoredBlocks(id), before);
    assert.deepEqual(readState(id).done, ['slice-a']);
  } finally {
    cleanup(id);
  }
});

test('amend: an unknown slice name is rejected and nothing is stored', () => {
  const id = spawnSession('rtp-amend-unknown');
  try {
    assert.equal(blockEmit(id, block('slice-a')).exitCode, 0);
    const before = readStoredBlocks(id);
    const result = amendEmit(id, 'slice-z', block('slice-z'));
    assert.equal(JSON.parse(result.stdout).rejected, 'UNKNOWN_SLICE');
    assert.deepEqual(readStoredBlocks(id), before);
  } finally {
    cleanup(id);
  }
});

test('amend: the block is validated with the dispatchable contract and invalid text replaces nothing', () => {
  const id = spawnSession('rtp-amend-invalid');
  try {
    assert.equal(blockEmit(id, block('slice-a')).exitCode, 0);
    const before = readStoredBlocks(id);
    const noItem = amendEmit(id, 'slice-a', block('slice-a', { 'Implementation Details': '\n- None' }));
    assert.equal(noItem.exitCode, 1);
    assert.equal(JSON.parse(noItem.stdout).validation.ok, false);
    const unjudged = amendEmit(id, 'slice-a', block('slice-a', { Why: ' About git push.' }));
    assert.equal(unjudged.exitCode, 1);
    assert.equal(JSON.parse(unjudged.stdout).validation.judgment.pending.length, 1);
    const cutOff = amendEmit(id, 'slice-a', block('slice-a').replace(/\n---\n$/, '\n'));
    assert.equal(cutOff.exitCode, 1);
    assert.equal(JSON.parse(cutOff.stdout).reason, 'EVENT_UNPARSEABLE');
    assert.deepEqual(readStoredBlocks(id), before);
  } finally {
    cleanup(id);
  }
});

test('amend: exactly one block carrying the amended change name is required', () => {
  const id = spawnSession('rtp-amend-scope');
  try {
    assert.equal(blockEmit(id, `${block('slice-a')}\n${block('slice-b')}`).exitCode, 0);
    const before = readStoredBlocks(id);
    const two = amendEmit(id, 'slice-a', `${block('slice-a')}\n${block('slice-b')}`);
    assert.equal(two.exitCode, 1);
    assert.equal(JSON.parse(two.stdout).reason, 'AMEND_BLOCK_COUNT');
    const renamed = amendEmit(id, 'slice-a', block('slice-b', { What: ' Wrong slice.' }));
    assert.equal(renamed.exitCode, 1);
    assert.equal(JSON.parse(renamed.stdout).reason, 'AMEND_NAME_MISMATCH');
    assert.deepEqual(readStoredBlocks(id), before);
  } finally {
    cleanup(id);
  }
});

test('amend: usage errors exit 2 (no name, other machine)', () => {
  const id = spawnSession('rtp-amend-usage');
  try {
    assert.equal(blockEmit(id, block('slice-a')).exitCode, 0);
    assert.equal(runCli(['emit', id, MACHINE, '--ready-to-propose', '--amend', '-'], block('slice-a')).exitCode, 2);
    assert.equal(runCli(['emit', id, 'explore-idea@1', '--ready-to-propose', '--amend', 'slice-a', '-'], block('slice-a')).exitCode, 2);
  } finally {
    cleanup(id);
  }
});
