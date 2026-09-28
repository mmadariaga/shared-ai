'use strict';

// Progress emit: `sai-state emit <id> <machineId> --progress [--with-overview
// true|false] -` validates a worker progress payload through the validator
// module and only then advances the step machine. Every case spawns the CLI as
// a real process.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { sessionFile } = require('../bin/sai-state.js');
const { VALIDATED_AT_PATTERN } = require('../sai/tools/worker-report-validator.js');

const REPO_ROOT = path.join(__dirname, '..');
const SAI_STATE_TOOL = path.join(REPO_ROOT, 'bin', 'sai-state.js');

function runCli(argv, input, tool = SAI_STATE_TOOL) {
  const result = spawnSync(process.execPath, [tool, ...argv], { encoding: 'utf8', input: input || '' });
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

function progress(stepIds, extra = {}) {
  return JSON.stringify(Object.assign({ event: 'progress', step_ids: stepIds, changed_files: [] }, extra));
}

function progressEmit(id, machineId, input, options = []) {
  return runCli(['emit', id, machineId, '--progress', ...options, '-'], input);
}

function readRecord(id) {
  return fs.readFileSync(sessionFile(id), 'utf8');
}

test('progress emit: valid payload returns the verdict plus the ordinary emit fields and advances the machine', () => {
  const id = spawnSession('progress-valid');
  try {
    assert.equal(runCli(['reset', id, 'spec-standalone@1']).exitCode, 0);
    const result = progressEmit(id, 'spec-standalone@1', progress(['prereqs-and-change']));
    assert.equal(result.exitCode, 0, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.ok, true);
    assert.equal(json.validation.action, 'validate');
    assert.equal(json.validation.kind, 'progress');
    assert.deepEqual(json.validation.errors, []);
    assert.match(json.validation.validated_at, VALIDATED_AT_PATTERN);
    assert.equal(typeof json.stage, 'string');
    assert.equal(typeof json.next.follow, 'string');

    // Same transition as the legacy two-call path on a fresh session.
    const legacyId = spawnSession('progress-valid-legacy');
    try {
      assert.equal(runCli(['reset', legacyId, 'spec-standalone@1']).exitCode, 0);
      const legacy = runCli(['emit', legacyId, 'spec-standalone@1', '-'], JSON.stringify({ step_ids: ['prereqs-and-change'] }));
      assert.equal(legacy.exitCode, 0, legacy.stderr);
      const legacyJson = JSON.parse(legacy.stdout);
      assert.equal(json.stage, legacyJson.stage);
      assert.deepEqual(json.next, legacyJson.next);
    } finally {
      cleanup(legacyId);
    }
  } finally {
    cleanup(id);
  }
});

test('progress emit (E1): shape-invalid payload returns validation.ok false, exit 1, and leaves the store untouched', () => {
  const id = spawnSession('progress-invalid');
  try {
    assert.equal(runCli(['reset', id, 'spec-standalone@1']).exitCode, 0);
    const before = readRecord(id);
    const result = progressEmit(id, 'spec-standalone@1', JSON.stringify({ event: 'progress', changed_files: [] }));
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.deepEqual(Object.keys(json), ['validation']);
    assert.equal(json.validation.ok, false);
    assert.ok(json.validation.errors.includes('step_ids is missing'));
    assert.equal(json.validation.validated_at, undefined);
    assert.equal(readRecord(id), before, 'an invalid payload never reaches the machine');
  } finally {
    cleanup(id);
  }
});

test('progress emit (E2): non-JSON stdin follows the validator semantics, not the emit parse failure', () => {
  const id = spawnSession('progress-nonjson');
  try {
    const result = progressEmit(id, 'spec-standalone@1', 'not json');
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.ok, false);
    assert.match(json.validation.errors[0], /^invalid JSON on stdin/);
    assert.equal(json.error, undefined);
    assert.equal(json.reason, undefined);
  } finally {
    cleanup(id);
  }
});

const VALIDATOR_TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'worker-report-validator.js');

function stableVerdict(verdict) {
  const copy = Object.assign({}, verdict);
  if (copy.validated_at !== undefined) {
    assert.match(copy.validated_at, VALIDATED_AT_PATTERN);
    copy.validated_at = '<stamp>';
  }
  return copy;
}

test('progress emit: verdict parity with `validate --kind progress --json` for BOM-prefixed and whitespace-padded payloads', () => {
  const inputs = [
    `﻿${progress(['prereqs-and-change'])}`,
    `  \n${progress(['prereqs-and-change'])}\n  `,
  ];
  for (const input of inputs) {
    const id = spawnSession('progress-parity');
    try {
      const direct = runCli(['validate', '--kind', 'progress', '--json'], input, VALIDATOR_TOOL);
      const fused = progressEmit(id, 'spec-standalone@1', input);
      const directVerdict = JSON.parse(direct.stdout);
      const fusedVerdict = JSON.parse(fused.stdout).validation;
      assert.deepEqual(stableVerdict(fusedVerdict), stableVerdict(directVerdict));
      assert.equal(fused.exitCode, direct.exitCode);
    } finally {
      cleanup(id);
    }
  }
});

test('progress emit (E3): validation runs before any session read, so a corrupt store cannot alter an invalid verdict', () => {
  const id = spawnSession('progress-order');
  try {
    fs.writeFileSync(sessionFile(id), '{not valid json');
    const result = progressEmit(id, 'spec-standalone@1', progress(['x'], { event: 'notice' }));
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.deepEqual(Object.keys(json), ['validation']);
    assert.equal(json.validation.ok, false);
    assert.equal(json.warnings, undefined, 'no session read happened');
    assert.equal(fs.readFileSync(sessionFile(id), 'utf8'), '{not valid json');
  } finally {
    cleanup(id);
  }
});

test('progress emit (E4): valid payload with SESSION_FILE_CORRUPT keeps the verdict intact and carries the warning', () => {
  const id = spawnSession('progress-corrupt');
  try {
    fs.writeFileSync(sessionFile(id), '{not valid json');
    const result = progressEmit(id, 'spec-standalone@1', progress([]));
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.ok, true);
    assert.match(json.validation.validated_at, VALIDATED_AT_PATTERN);
    assert.ok(Array.isArray(json.warnings) && json.warnings.includes('SESSION_FILE_CORRUPT'));
  } finally {
    cleanup(id);
  }
});

test('progress emit (E4): valid payload with VERSION_MISMATCH keeps the verdict intact, exit 1', () => {
  const id = spawnSession('progress-version');
  try {
    const result = progressEmit(id, 'spec-standalone@9', progress(['prereqs-and-change']));
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.ok, true);
    assert.match(json.validation.validated_at, VALIDATED_AT_PATTERN);
    assert.equal(json.error, 'VERSION_MISMATCH');
  } finally {
    cleanup(id);
  }
});

test('progress emit (E5): an invalid payload on a wrong machineId reports the verdict, not VERSION_MISMATCH', () => {
  const id = spawnSession('progress-validation-wins');
  try {
    const result = progressEmit(id, 'spec-standalone@9', JSON.stringify({ event: 'progress' }));
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.ok, false);
    assert.equal(json.error, undefined);
  } finally {
    cleanup(id);
  }
});

function copyTree(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

test('progress emit (E6): a missing validator module exits 2 naming the tried paths and never emits', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-progress-novalidator-'));
  try {
    fs.mkdirSync(path.join(root, 'bin'));
    fs.copyFileSync(SAI_STATE_TOOL, path.join(root, 'bin', 'sai-state.js'));
    copyTree(path.join(REPO_ROOT, 'sai-state'), path.join(root, 'sai-state'));
    const tool = path.join(root, 'bin', 'sai-state.js');
    const id = spawnSession('progress-novalidator');
    try {
      assert.equal(runCli(['reset', id, 'spec-standalone@1'], '', tool).exitCode, 0);
      const before = readRecord(id);
      const result = runCli(['emit', id, 'spec-standalone@1', '--progress', '-'], progress(['prereqs-and-change']), tool);
      assert.equal(result.exitCode, 2);
      assert.equal(result.stdout, '');
      assert.ok(result.stderr.includes(path.join(root, 'tools', 'worker-report-validator.js')));
      assert.ok(result.stderr.includes(path.join(root, 'sai', 'tools', 'worker-report-validator.js')));
      assert.equal(readRecord(id), before);
    } finally {
      cleanup(id);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('progress emit: the installed layout sai/{bin,sai-state,tools} resolves the validator', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-progress-installed-'));
  try {
    const sai = path.join(root, 'sai');
    fs.mkdirSync(path.join(sai, 'bin'), { recursive: true });
    fs.mkdirSync(path.join(sai, 'tools'), { recursive: true });
    fs.copyFileSync(SAI_STATE_TOOL, path.join(sai, 'bin', 'sai-state.js'));
    copyTree(path.join(REPO_ROOT, 'sai-state'), path.join(sai, 'sai-state'));
    fs.copyFileSync(
      path.join(REPO_ROOT, 'sai', 'tools', 'worker-report-validator.js'),
      path.join(sai, 'tools', 'worker-report-validator.js')
    );
    const tool = path.join(sai, 'bin', 'sai-state.js');
    const id = spawnSession('progress-installed');
    try {
      const result = runCli(['emit', id, 'spec-standalone@1', '--progress', '-'], progress(['prereqs-and-change']), tool);
      assert.equal(result.exitCode, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).validation.ok, true);
    } finally {
      cleanup(id);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('progress emit (E7): --with-overview seeds the design variant on the first emit after reset, even with empty step_ids', () => {
  const optedId = spawnSession('progress-overview-true');
  const baseId = spawnSession('progress-overview-false');
  try {
    assert.equal(runCli(['reset', optedId, 'design-standalone@1']).exitCode, 0);
    assert.equal(runCli(['reset', baseId, 'design-standalone@1']).exitCode, 0);
    const opted = progressEmit(optedId, 'design-standalone@1', progress([]), ['--with-overview', 'true']);
    const base = progressEmit(baseId, 'design-standalone@1', progress([]), ['--with-overview', 'false']);
    assert.equal(opted.exitCode, 0, opted.stderr);
    assert.equal(base.exitCode, 0, base.stderr);
    const optedState = JSON.parse(readRecord(optedId)).stateByMachine['design-standalone@1'].state;
    const baseState = JSON.parse(readRecord(baseId)).stateByMachine['design-standalone@1'].state;
    assert.equal(optedState.withOverview, true);
    assert.equal(baseState.withOverview, false);
  } finally {
    cleanup(optedId);
    cleanup(baseId);
  }
});

test('progress emit (E7): --with-overview on any machine other than design-standalone@1 is a usage error', () => {
  const id = spawnSession('progress-overview-usage');
  try {
    const result = progressEmit(id, 'spec-standalone@1', progress([]), ['--with-overview', 'true']);
    assert.equal(result.exitCode, 2);
    assert.equal(result.stdout, '');
    const badValue = progressEmit(id, 'design-standalone@1', progress([]), ['--with-overview', 'maybe']);
    assert.equal(badValue.exitCode, 2);
  } finally {
    cleanup(id);
  }
});

test('progress emit (E8): empty step_ids is valid and the pointer does not move', () => {
  const id = spawnSession('progress-empty');
  try {
    assert.equal(runCli(['reset', id, 'spec-standalone@1']).exitCode, 0);
    const first = progressEmit(id, 'spec-standalone@1', progress([]));
    const second = progressEmit(id, 'spec-standalone@1', progress([]));
    assert.equal(first.exitCode, 0, first.stderr);
    assert.equal(second.exitCode, 0, second.stderr);
    const a = JSON.parse(first.stdout);
    const b = JSON.parse(second.stdout);
    assert.equal(a.validation.ok, true);
    assert.equal(a.stage, b.stage);
    assert.deepEqual(a.next, b.next);
  } finally {
    cleanup(id);
  }
});

test('progress emit (E10): non-progress payload kinds return validation.ok false', () => {
  const id = spawnSession('progress-kinds');
  try {
    const payloads = [
      { status: 'completed', summary: 's', changed_files: [], resolved_change_name: 'c' },
      { event: 'notice', message: 'm', changed_files: [] },
      { status: 'needs_input', summary: 's', changed_files: [], question: 'q', options: [] },
      { event: 'conflict_detected', summary: 's', changed_files: [], affected_files: [], continuation_state: 'language-selection' },
    ];
    for (const payload of payloads) {
      const result = progressEmit(id, 'spec-standalone@1', JSON.stringify(payload));
      assert.equal(result.exitCode, 1);
      assert.equal(JSON.parse(result.stdout).validation.ok, false);
    }
  } finally {
    cleanup(id);
  }
});

test('progress emit (E11): emit without --progress keeps its shape and exit codes', () => {
  const id = spawnSession('progress-legacy');
  try {
    const ok = runCli(['emit', id, 'spec-standalone@1', '-'], JSON.stringify({ step_ids: [] }));
    assert.equal(ok.exitCode, 0, ok.stderr);
    const okJson = JSON.parse(ok.stdout);
    assert.equal(okJson.validation, undefined);
    assert.equal(typeof okJson.stage, 'string');

    const unparseable = runCli(['emit', id, 'spec-standalone@1', '-'], 'not json');
    assert.equal(unparseable.exitCode, 1);
    const badJson = JSON.parse(unparseable.stdout);
    assert.equal(badJson.error, 'INVALID_EVENT');
    assert.equal(badJson.reason, 'EVENT_UNPARSEABLE');
    assert.equal(badJson.validation, undefined);

    const usage = runCli(['emit', id, 'spec-standalone@1'], '');
    assert.equal(usage.exitCode, 2);
  } finally {
    cleanup(id);
  }
});
