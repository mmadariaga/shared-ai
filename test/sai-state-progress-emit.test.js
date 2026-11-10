'use strict';

// Progress emit: `sai-state emit <id> <machineId> --progress -` validates a
// worker progress payload through the validator module and only then advances the step machine. Every case spawns the CLI as
// a real process.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { sessionFile } = require('../bin/sai-state.js');
const { RECEIVED_AT_PATTERN } = require('../sai/tools/worker-report-validator.js');

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
    assert.equal(runCli(['reset', id, 'spec-steps@1']).exitCode, 0);
    const result = progressEmit(id, 'spec-steps@1', progress(['spec-intake']));
    assert.equal(result.exitCode, 0, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.ok, true);
    assert.equal(json.validation.action, 'validate');
    assert.equal(json.validation.kind, 'progress');
    assert.deepEqual(json.validation.errors, []);
    assert.match(json.received_at, RECEIVED_AT_PATTERN);
    assert.equal(json.validation.validated_at, undefined);
    assert.equal(json.validation.received_at, undefined);
    assert.equal(typeof json.stage, 'string');
    assert.equal(typeof json.next.follow, 'string');

    // Same transition as the legacy two-call path on a fresh session.
    const legacyId = spawnSession('progress-valid-legacy');
    try {
      assert.equal(runCli(['reset', legacyId, 'spec-steps@1']).exitCode, 0);
      const legacy = runCli(['emit', legacyId, 'spec-steps@1', '-'], JSON.stringify({ step_ids: ['spec-intake'] }));
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
    assert.equal(runCli(['reset', id, 'spec-steps@1']).exitCode, 0);
    const before = readRecord(id);
    const result = progressEmit(id, 'spec-steps@1', JSON.stringify({ event: 'progress', changed_files: [] }));
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.deepEqual(Object.keys(json), ['received_at', 'validation']);
    assert.match(json.received_at, RECEIVED_AT_PATTERN);
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
    const result = progressEmit(id, 'spec-steps@1', 'not json');
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.ok, false);
    assert.match(json.validation.errors[0], /^invalid YAML on stdin/);
    assert.equal(json.error, undefined);
    assert.equal(json.reason, undefined);
  } finally {
    cleanup(id);
  }
});

const VALIDATOR_TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'worker-report-validator.js');

// The validate CLI response is the timeless verdict plus a leading `received_at`.
function stripReceivedAt(response) {
  assert.equal(Object.keys(response)[0], 'received_at');
  assert.match(response.received_at, RECEIVED_AT_PATTERN);
  const copy = Object.assign({}, response);
  delete copy.received_at;
  return copy;
}

test('progress emit: verdict parity with `validate --kind progress --json` for BOM-prefixed and whitespace-padded payloads', () => {
  const inputs = [
    `﻿${progress(['spec-intake'])}`,
    `  \n${progress(['spec-intake'])}\n  `,
  ];
  for (const input of inputs) {
    const id = spawnSession('progress-parity');
    try {
      const direct = runCli(['validate', '--kind', 'progress', '--json'], input, VALIDATOR_TOOL);
      const fused = progressEmit(id, 'spec-steps@1', input);
      const directVerdict = JSON.parse(direct.stdout);
      const fusedVerdict = JSON.parse(fused.stdout).validation;
      assert.equal(JSON.stringify(fusedVerdict), JSON.stringify(stripReceivedAt(directVerdict)));
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
    const result = progressEmit(id, 'spec-steps@1', progress(['x'], { event: 'step-done' }));
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.deepEqual(Object.keys(json), ['received_at', 'validation']);
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
    const result = progressEmit(id, 'spec-steps@1', progress([]));
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.ok, true);
    assert.match(json.received_at, RECEIVED_AT_PATTERN);
    assert.equal(json.validation.validated_at, undefined);
    assert.equal(json.validation.received_at, undefined);
    assert.ok(Array.isArray(json.warnings) && json.warnings.includes('SESSION_FILE_CORRUPT'));
  } finally {
    cleanup(id);
  }
});

test('progress emit (E4): valid payload with VERSION_MISMATCH keeps the verdict intact, exit 1', () => {
  const id = spawnSession('progress-version');
  try {
    const result = progressEmit(id, 'spec-steps@9', progress(['spec-intake']));
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.ok, true);
    assert.match(json.received_at, RECEIVED_AT_PATTERN);
    assert.equal(json.validation.validated_at, undefined);
    assert.equal(json.validation.received_at, undefined);
    assert.equal(json.error, 'VERSION_MISMATCH');
  } finally {
    cleanup(id);
  }
});

test('progress emit (E5): an invalid payload on a wrong machineId reports the verdict, not VERSION_MISMATCH', () => {
  const id = spawnSession('progress-validation-wins');
  try {
    const result = progressEmit(id, 'spec-steps@9', JSON.stringify({ event: 'progress' }));
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

test('progress emit (E6): a missing received_at clock exits 2 on every verb and a missing validator exits 2 on the progress emit, each naming the tried paths and never emitting', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-progress-novalidator-'));
  try {
    fs.mkdirSync(path.join(root, 'bin'));
    fs.copyFileSync(SAI_STATE_TOOL, path.join(root, 'bin', 'sai-state.js'));
    copyTree(path.join(REPO_ROOT, 'sai-state'), path.join(root, 'sai-state'));
    const tool = path.join(root, 'bin', 'sai-state.js');
    const id = spawnSession('progress-novalidator');
    try {
      assert.equal(runCli(['reset', id, 'spec-steps@1']).exitCode, 0);
      for (const argv of [['spawn', '--key', 'k'], ['reset', id, 'spec-steps@1'], ['close', id]]) {
        const r = runCli(argv, '', tool);
        assert.equal(r.exitCode, 2);
        assert.equal(r.stdout, '');
        assert.ok(r.stderr.includes(path.join(root, 'tools', 'received-at.js')));
        assert.ok(r.stderr.includes(path.join(root, 'sai', 'tools', 'received-at.js')));
      }
      // The clock present, the validator absent: only the progress emit stops.
      fs.mkdirSync(path.join(root, 'sai', 'tools'), { recursive: true });
      fs.copyFileSync(path.join(REPO_ROOT, 'sai', 'tools', 'received-at.js'), path.join(root, 'sai', 'tools', 'received-at.js'));
      const before = readRecord(id);
      const result = runCli(['emit', id, 'spec-steps@1', '--progress', '-'], progress(['spec-intake']), tool);
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
    for (const file of ['worker-report-validator.js', 'received-at.js', 'input-reader.js', 'temp-root.js', 'transfer.js']) {
      fs.copyFileSync(path.join(REPO_ROOT, 'sai', 'tools', file), path.join(sai, 'tools', file));
    }
    const tool = path.join(sai, 'bin', 'sai-state.js');
    const id = spawnSession('progress-installed');
    try {
      const result = runCli(['emit', id, 'spec-steps@1', '--progress', '-'], progress(['spec-intake']), tool);
      assert.equal(result.exitCode, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).validation.ok, true);
    } finally {
      cleanup(id);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('progress emit (E8): empty step_ids is valid and the pointer does not move', () => {
  const id = spawnSession('progress-empty');
  try {
    assert.equal(runCli(['reset', id, 'spec-steps@1']).exitCode, 0);
    const first = progressEmit(id, 'spec-steps@1', progress([]));
    const second = progressEmit(id, 'spec-steps@1', progress([]));
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
      { status: 'needs_input', summary: 's', changed_files: [], question: 'q', options: [] },
    ];
    for (const payload of payloads) {
      const result = progressEmit(id, 'spec-steps@1', JSON.stringify(payload));
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
    const ok = runCli(['emit', id, 'spec-steps@1', '-'], JSON.stringify({ step_ids: [] }));
    assert.equal(ok.exitCode, 0, ok.stderr);
    const okJson = JSON.parse(ok.stdout);
    assert.equal(okJson.validation, undefined);
    assert.equal(typeof okJson.stage, 'string');

    const unparseable = runCli(['emit', id, 'spec-steps@1', '-'], 'not json');
    assert.equal(unparseable.exitCode, 1);
    const badJson = JSON.parse(unparseable.stdout);
    assert.equal(badJson.error, 'INVALID_EVENT');
    assert.equal(badJson.reason, 'EVENT_UNPARSEABLE');
    assert.equal(badJson.validation, undefined);

    const usage = runCli(['emit', id, 'spec-steps@1'], '');
    assert.equal(usage.exitCode, 2);
  } finally {
    cleanup(id);
  }
});

test('every sai-state verb writes received_at as the first stdout key and no time on stderr', () => {
  const id = spawnSession('every-verb');
  try {
    const cases = [
      runCli(['spawn', '--key', `every-verb-b-${process.pid}-${Date.now()}`]),
      runCli(['reset', id, 'spec-steps@1']),
      runCli(['emit', id, 'spec-steps@1', '-'], JSON.stringify({ step_ids: ['spec-intake'] })),
      progressEmit(id, 'spec-steps@1', progress(['spec-intake'])),
      progressEmit(id, 'spec-steps@1', 'not json'),
      runCli(['reset', id, 'nope@1']),
      runCli(['emit', id, 'spec-steps@9', '-'], JSON.stringify({ step_ids: [] })),
      runCli(['close', id]),
    ];
    for (const result of cases) {
      const json = JSON.parse(result.stdout);
      assert.equal(Object.keys(json)[0], 'received_at', result.stdout);
      assert.match(json.received_at, RECEIVED_AT_PATTERN);
      assert.doesNotMatch(result.stderr, /received_at|\d{4}-\d{2}-\d{2}T/);
      assert.equal(json.validated_at, undefined);
    }
    cleanup(JSON.parse(cases[0].stdout).id);
  } finally {
    cleanup(id);
  }
});

// ─── Reference mode: the emit verifies and validates the worker's report itself ───

const transfer = require('../sai/tools/transfer');

function referenceFixture(t, content, name = 'progress-1.json') {
  const { dir } = transfer.open('claude');
  t.after(() => transfer.close(dir));
  const bytes = Buffer.from(typeof content === 'string' ? content : JSON.stringify(content));
  return { dir, reference: transfer.put(dir, name, bytes, { exclusive: true }) };
}

function referenceEmit(id, machineId, dir, reference, extra = []) {
  return runCli(['emit', id, machineId, '--progress', '--report-dir', dir, '--report-file', reference.path, '--report-hash', reference.sha256, ...extra]);
}

test('progress emit reference mode: a verified report advances the machine like the input forms do', t => {
  const { dir, reference } = referenceFixture(t, { event: 'progress', step_ids: ['spec-intake'], changed_files: [] });
  const id = spawnSession('progress-reference');
  const inputId = spawnSession('progress-reference-input');
  try {
    assert.equal(runCli(['reset', id, 'spec-steps@1']).exitCode, 0);
    assert.equal(runCli(['reset', inputId, 'spec-steps@1']).exitCode, 0);
    const result = referenceEmit(id, 'spec-steps@1', dir, reference);
    assert.equal(result.exitCode, 0, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.equal(Object.keys(json)[0], 'received_at');
    assert.equal(json.validation.ok, true);
    assert.equal(json.validation.outcome, 'accepted');
    assert.equal(json.validation.payload, undefined, 'the verdict carries no payload copy');
    const viaInput = progressEmit(inputId, 'spec-steps@1', progress(['spec-intake']));
    const inputJson = JSON.parse(viaInput.stdout);
    assert.equal(json.stage, inputJson.stage);
    assert.deepEqual(json.next, inputJson.next);
  } finally {
    cleanup(id);
    cleanup(inputId);
  }
});

test('progress emit reference mode (E4): a foreign directory, a wrong hash, and an altered file are refused and the machine does not advance', t => {
  const { dir, reference } = referenceFixture(t, { event: 'progress', step_ids: ['spec-intake'], changed_files: [] });
  const other = referenceFixture(t, { event: 'progress', step_ids: ['spec-intake'], changed_files: [] });
  const id = spawnSession('progress-reference-refused');
  try {
    assert.equal(runCli(['reset', id, 'spec-steps@1']).exitCode, 0);
    const before = readRecord(id);
    for (const [report, ref] of [
      [other.dir, reference],
      [dir, { ...reference, sha256: '0'.repeat(64) }],
      [dir, { path: path.join(os.tmpdir(), 'outside.json'), sha256: reference.sha256 }],
    ]) {
      const result = referenceEmit(id, 'spec-steps@1', report, ref);
      assert.equal(result.exitCode, 1, result.stdout);
      const json = JSON.parse(result.stdout);
      assert.deepEqual(Object.keys(json), ['received_at', 'validation']);
      assert.equal(json.validation.ok, false);
      assert.equal(json.validation.outcome, 'delivery-failed');
      assert.equal(readRecord(id), before);
    }
    fs.writeFileSync(reference.path, JSON.stringify({ event: 'progress', step_ids: ['design'], changed_files: [] }));
    const altered = referenceEmit(id, 'spec-steps@1', dir, reference);
    assert.equal(altered.exitCode, 1);
    assert.equal(JSON.parse(altered.stdout).validation.outcome, 'delivery-failed');
    assert.equal(readRecord(id), before, 'the bytes that changed after the hash never reach the machine');
  } finally {
    cleanup(id);
  }
});

test('progress emit reference mode: a report outside the progress shape is invalid, not delivered', t => {
  const id = spawnSession('progress-reference-invalid');
  try {
    assert.equal(runCli(['reset', id, 'spec-steps@1']).exitCode, 0);
    const before = readRecord(id);
    for (const content of [
      { event: 'progress', step_ids: ['spec-intake'], changed_files: [], status: 'completed' },
      { event: 'progress', changed_files: [] },
      { status: 'completed', summary: 's', changed_files: [] },
      'not: [valid',
    ]) {
      const { dir, reference } = referenceFixture(t, content);
      const result = referenceEmit(id, 'spec-steps@1', dir, reference);
      assert.equal(result.exitCode, 1, JSON.stringify(content));
      const json = JSON.parse(result.stdout);
      assert.equal(json.validation.ok, false);
      assert.equal(json.validation.outcome, 'report-invalid');
      assert.equal(readRecord(id), before);
    }
  } finally {
    cleanup(id);
  }
});

test('progress emit reference mode: the three reference flags come together and never beside the input forms', t => {
  const { dir, reference } = referenceFixture(t, { event: 'progress', step_ids: ['spec-intake'], changed_files: [] });
  const id = spawnSession('progress-reference-usage');
  try {
    assert.equal(runCli(['reset', id, 'spec-steps@1']).exitCode, 0);
    const before = readRecord(id);
    const partial = runCli(['emit', id, 'spec-steps@1', '--progress', '--report-dir', dir, '--report-file', reference.path]);
    assert.equal(partial.exitCode, 2);
    assert.match(partial.stderr, /all of --report-dir, --report-file, and --report-hash/);
    const withInput = referenceEmit(id, 'spec-steps@1', dir, reference, ['--input-file', reference.path]);
    assert.equal(withInput.exitCode, 2);
    const withStdin = runCli(['emit', id, 'spec-steps@1', '--progress', '--report-dir', dir, '--report-file', reference.path, '--report-hash', reference.sha256, '-'], progress(['spec-intake']));
    assert.equal(withStdin.exitCode, 2);
    assert.equal(readRecord(id), before);
  } finally {
    cleanup(id);
  }
});

test('progress emit: the input-file and stdin forms keep their behavior beside the reference mode', t => {
  const id = spawnSession('progress-input-kept');
  try {
    const { dir } = transfer.open('claude');
    t.after(() => transfer.close(dir));
    const file = path.join(dir, 'event.json');
    fs.writeFileSync(file, progress(['spec-intake']));
    assert.equal(runCli(['reset', id, 'spec-steps@1']).exitCode, 0);
    const viaFile = runCli(['emit', id, 'spec-steps@1', '--progress', '--input-file', file]);
    assert.equal(viaFile.exitCode, 0, viaFile.stderr);
    assert.equal(JSON.parse(viaFile.stdout).validation.ok, true);
    assert.equal(JSON.parse(viaFile.stdout).validation.outcome, undefined);
    assert.equal(progressEmit(id, 'spec-steps@1', progress([])).exitCode, 0);
  } finally {
    cleanup(id);
  }
});
