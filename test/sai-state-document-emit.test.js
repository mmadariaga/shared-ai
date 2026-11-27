'use strict';

// Document emit: `sai-state emit <id> explore-slice@1 --document-file <path> ...`
// validates the change document set named by the repeatable `--document-file`
// flags (each optionally followed by its `--verdicts-file`) with
// `change-document.js`, and only then records the extracted change names as the
// explore slice inventory and stores each document's text, hash, and verdicts.
// Every case spawns the CLI as a real process.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { sessionFile } = require('../bin/sai-state.js');
const { RECEIVED_AT_PATTERN } = require('../sai/tools/worker-report-validator.js');
const { hashDocument, verifyDocumentFile, checkDocument } = require('../sai/tools/change-document.js');
const transfer = require('../sai/tools/transfer.js');

const REPO_ROOT = path.join(__dirname, '..');
const SAI_STATE_TOOL = path.join(REPO_ROOT, 'bin', 'sai-state.js');
const DOCUMENT_TOOL = path.join(REPO_ROOT, 'sai/tools/change-document.js');
const MACHINE = 'explore-slice@1';
const IDEA_MACHINE = 'explore-idea@1';
const ROUTE_SELECTOR = 'sai/commands/explore/steps/route-selector.md';
const DIRECT_BUILD_STEP = 'sai/commands/explore/steps/pipeline-direct-build.md';
const ORIGIN = 'https://github.com/team/repo/issues/11';

function runCli(argv, input) {
  const result = spawnSync(process.execPath, [SAI_STATE_TOOL, ...argv], { encoding: 'utf8', input: input || '' });
  return { stdout: result.stdout || '', stderr: result.stderr || '', exitCode: result.status };
}

function advanceIdea(id, steps) {
  for (let i = 0; i < steps; i++) {
    const result = runCli(['emit', id, IDEA_MACHINE, '-'], '{"intent":"next-step"}');
    assert.equal(result.exitCode, 0, result.stderr);
  }
}

// The document emit is accepted only at the `crystallize` stage of
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

/** One dispatchable change document; `implementation: null` omits the section. */
function doc(name, { goal = 'Adds a thing.', problem = 'Because it is needed.', depends = 'None', implementation = '- I1: add the module.', origin = null, extra = [] } = {}) {
  const lines = [`# Add ${name}`, '', '## Problem', problem, '', '## Goal', goal, '', '## Scope', '- The thing works.', '', '## Non-goals', 'None.', '', '## Edge cases', '- E1: empty input fails.', ''];
  if (implementation !== null) lines.push('## Implementation notes', implementation, '');
  lines.push('## Open questions', 'None.', '', '## Maturity', 'Ready to propose', '', '## Change', `- Change name: ${name}`, `- Depends on: ${depends}`);
  if (origin) lines.push(`- Backlog origin: ${origin}`);
  lines.push(...extra);
  return `${lines.join('\n')}\n`;
}

/** Write each document to its own transfer file and emit the set (or one amendment). */
function emitSet(id, docs, { machine = MACHINE, amend = null, verdicts = [], extraArgs = [] } = {}) {
  const { dir } = transfer.open('claude');
  try {
    const args = ['emit', id, machine];
    docs.forEach((text, index) => {
      const file = transfer.put(dir, `document-${index}.md`, Buffer.from(text)).path;
      args.push('--document-file', file);
      if (verdicts[index] !== undefined) args.push('--verdicts-file', transfer.put(dir, `verdicts-${index}.json`, JSON.stringify(verdicts[index])).path);
    });
    if (amend) args.push('--amend', amend);
    return runCli([...args, ...extraArgs]);
  } finally {
    transfer.close(dir);
  }
}

function amendEmit(id, name, text, options = {}) {
  return emitSet(id, [text], { ...options, amend: name });
}

function readSet(id) {
  const record = JSON.parse(fs.readFileSync(sessionFile(id), 'utf8'));
  const entry = record.stateByMachine && record.stateByMachine[MACHINE];
  if (!entry) return null;
  const state = entry.state || entry;
  return state.set;
}

function readStoredDocuments(id) {
  const record = JSON.parse(fs.readFileSync(sessionFile(id), 'utf8'));
  return record.blocks || null;
}

function readState(id) {
  const record = JSON.parse(fs.readFileSync(sessionFile(id), 'utf8'));
  return record.stateByMachine[MACHINE].state;
}

function staleNames(id) {
  return JSON.parse(fs.readFileSync(sessionFile(id), 'utf8')).staleBlocks || [];
}

function gotoFlags(id, target, reason) {
  return runCli(['emit', id, IDEA_MACHINE, '--set', 'intent=goto', '--set', `target=${target}`, '--set', `reason=${reason}`]);
}

function blockVerb(id, name) {
  return runCli(['block', id, name]);
}

function slice(id, intent) {
  const result = runCli(['emit', id, MACHINE, '-'], JSON.stringify({ intent }));
  assert.equal(result.exitCode, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('stored-file transport: both harnesses export exact Unicode bytes and retain old references across amendments', () => {
  const id = spawnSession('doc-private-export');
  const directories = [];
  try {
    const original = doc('private-change', { goal: 'Preserves café, 日本語 and 🐋.' });
    assert.equal(emitSet(id, [original]).exitCode, 0);
    for (const harness of ['claude', 'opencode']) {
      const result = runCli(['block', id, 'private-change', '--export', '--harness', harness]);
      if (harness === 'opencode' && process.platform === 'linux' && !fs.existsSync('/tmp/opencode')) {
        assert.equal(result.exitCode, 1);
        assert.match(JSON.parse(result.stdout).reason, /temporary root.*missing/);
        continue;
      }
      assert.equal(result.exitCode, 0, result.stderr);
      const reference = JSON.parse(result.stdout);
      directories.push(reference.transfer_dir);
      assert.equal(Object.keys(reference)[0], 'received_at');
      assert.equal(reference.text, undefined);
      assert.equal(reference.block_file, undefined);
      assert.equal(path.basename(reference.document_file), 'document.md');
      assert.equal(fs.readFileSync(reference.document_file, 'utf8'), original);
      assert.equal(reference.hash, hashDocument(original));
      assert.equal(verifyDocumentFile(reference.document_file, reference.hash), original);
      const verified = spawnSync(process.execPath, [DOCUMENT_TOOL, 'verify-file', '--document-file', reference.document_file, '--document-hash', reference.hash], { encoding: 'utf8' });
      assert.equal(verified.status, 0, verified.stderr);
      assert.equal(JSON.parse(verified.stdout).ok, true);
      const checked = spawnSync(process.execPath, [DOCUMENT_TOOL, 'check', '--document-file', reference.document_file], { encoding: 'utf8' });
      assert.equal(checked.status, 0, checked.stderr);
      assert.equal(JSON.parse(checked.stdout).dispatchable, true);
      if (process.platform !== 'win32') {
        assert.equal(fs.statSync(reference.transfer_dir).mode & 0o777, 0o700);
        assert.equal(fs.statSync(reference.document_file).mode & 0o777, 0o600);
      }
    }
    const old = JSON.parse(runCli(['block', id, 'private-change', '--export', '--harness', 'claude']).stdout);
    directories.push(old.transfer_dir);
    const amended = original.replace('Preserves café', 'Amends café');
    assert.equal(amendEmit(id, 'private-change', amended).exitCode, 0);
    const next = JSON.parse(runCli(['block', id, 'private-change', '--export', '--harness', 'claude']).stdout);
    directories.push(next.transfer_dir);
    assert.notEqual(old.document_file, next.document_file);
    assert.notEqual(old.hash, next.hash);
    assert.equal(verifyDocumentFile(old.document_file, old.hash), original);
    assert.equal(verifyDocumentFile(next.document_file, next.hash), amended);
    assert.throws(() => verifyDocumentFile(old.document_file, next.hash), /hash/);
    fs.writeFileSync(next.document_file, amended.replace('日本語', 'altered'));
    assert.throws(() => verifyDocumentFile(next.document_file, next.hash), /hash/);
    assert.throws(() => verifyDocumentFile(path.join(next.transfer_dir, 'missing.md'), next.hash), /ENOENT/);
    assert.throws(() => verifyDocumentFile(next.document_file), /hash/);
  } finally {
    directories.forEach((dir) => transfer.close(dir));
    cleanup(id);
  }
});

test('stored-file transport: export rejects missing entries, corrupt hashes and unspecified harnesses', () => {
  const id = spawnSession('doc-export-errors');
  try {
    assert.equal(runCli(['block', id, 'absent', '--export', '--harness', 'claude']).exitCode, 1);
    assert.equal(runCli(['block', id, 'absent', '--export']).exitCode, 2);
    assert.equal(runCli(['block', id, 'absent', '--export', '--harness', 'unknown']).exitCode, 2);
    assert.equal(emitSet(id, [doc('corrupt-change')]).exitCode, 0);
    const record = JSON.parse(fs.readFileSync(sessionFile(id), 'utf8'));
    record.blocks['corrupt-change'].hash = '0'.repeat(64);
    fs.writeFileSync(sessionFile(id), JSON.stringify(record));
    const result = runCli(['block', id, 'corrupt-change', '--export', '--harness', 'claude']);
    assert.equal(result.exitCode, 1);
    assert.equal(JSON.parse(result.stdout).error, 'BLOCK_EXPORT_FAILED');
    assert.equal(JSON.parse(result.stdout).document_file, undefined);
  } finally { cleanup(id); }
});

test('both harness routes and all consuming workers use document file/hash references', () => {
  const read = (name) => fs.readFileSync(path.join(REPO_ROOT, name), 'utf8');
  for (const name of ['sai/commands/explore/direct-build-worker.md', 'sai/commands/backfill/worker.md', 'sai/commands/spec/coordinator.md']) {
    assert.match(read(name), /--document-file/);
    assert.match(read(name), /--document-hash/);
    assert.match(read(name), /Change document \(Transport\)/);
  }
  for (const name of ['sai/commands/explore/steps/pipeline-direct-build.md', 'sai/commands/explore/steps/pipeline-plan-unattended.md']) {
    assert.match(read(name), /--export --harness <claude\|opencode>/);
    assert.match(read(name), /--document-file/);
    assert.doesNotMatch(read(name), /--block-file|--block-hash/);
  }
});

test('document emit: a valid single document records its name and returns the route-selector pointer', () => {
  const id = spawnSession('doc-single');
  try {
    const result = emitSet(id, [doc('one-change')]);
    assert.equal(result.exitCode, 0, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.equal(Object.keys(json)[0], 'received_at');
    assert.match(json.received_at, RECEIVED_AT_PATTERN);
    assert.equal(json.validation.ok, true);
    assert.equal(json.validation.profile, 'document');
    assert.equal(json.stage, 'waiting');
    assert.equal(json.next.follow, ROUTE_SELECTOR);
    assert.deepEqual(readSet(id), ['one-change']);
    const stored = readStoredDocuments(id)['one-change'];
    assert.equal(stored.text, doc('one-change'));
    assert.equal(stored.hash, hashDocument(doc('one-change')));
    assert.deepEqual(stored.verdicts, []);
  } finally {
    cleanup(id);
  }
});

test('document guard: a document emitted before the crystallize stage is rejected and records nothing', () => {
  for (const steps of [0, 1, 2]) {
    const id = spawnSession(`doc-guard-${steps}`, false);
    try {
      advanceIdea(id, steps);
      const result = emitSet(id, [doc('early-change')]);
      assert.equal(result.exitCode, 1);
      const json = JSON.parse(result.stdout);
      assert.equal(json.error, 'INVALID_EVENT');
      assert.equal(json.reason, 'STAGE_NOT_CRYSTALLIZE');
      assert.equal(json.stage, ['explore-change', 'review-edge-cases', 'implementation-details'][steps]);
      assert.match(result.stderr, /crystallize/);
      assert.equal(readSet(id), null);
      assert.equal(readStoredDocuments(id), null);
    } finally {
      cleanup(id);
    }
  }
});

test('document guard: the document is accepted once the exploration reaches crystallize, and an amendment is not stage-checked', () => {
  const id = spawnSession('doc-guard-open', false);
  try {
    advanceIdea(id, 3);
    assert.equal(emitSet(id, [doc('late-change')]).exitCode, 0);
    assert.deepEqual(readSet(id), ['late-change']);
    const lane = runCli(['emit', id, IDEA_MACHINE, '-'], '{"intent":"poc-lane-late"}');
    assert.equal(lane.exitCode, 0, lane.stderr);
    const amended = amendEmit(id, 'late-change', doc('late-change', { goal: 'Adds another thing.' }));
    assert.equal(amended.exitCode, 0, amended.stderr);
  } finally {
    cleanup(id);
  }
});

function seedEvent(listEdge, listImpl) {
  return JSON.stringify({
    sections: {
      'explore-change': { state: 'agreed', source: 'issue' },
      'review-edge-cases': { state: 'agreed', source: 'issue', list: listEdge },
      'implementation-details': { state: 'agreed', source: 'issue', list: listImpl },
    },
  });
}

test('document guard: a seeded issue reaches crystallize by goto and the document is then accepted', () => {
  const id = spawnSession('doc-seed-goto', false);
  try {
    const seeded = runCli(['emit', id, IDEA_MACHINE, '-'], seedEvent(['E1'], ['I1']));
    assert.equal(seeded.exitCode, 0, seeded.stderr);
    const moved = gotoFlags(id, 'crystallize', 'user-request');
    assert.equal(moved.exitCode, 0, moved.stderr);
    assert.equal(JSON.parse(moved.stdout).stage, 'crystallize');
    assert.equal(emitSet(id, [doc('seeded-change')]).exitCode, 0);
    assert.deepEqual(readSet(id), ['seeded-change']);
  } finally {
    cleanup(id);
  }
});

test('E10: staleness is tracked per slice: amending one of two stale slices keeps the lock, amending the second releases it', () => {
  const id = spawnSession('doc-stale-two');
  try {
    assert.equal(emitSet(id, [doc('slice-a'), doc('slice-b')]).exitCode, 0);
    assert.equal(gotoFlags(id, 'implementation-details', 'correction').exitCode, 0);
    assert.deepEqual(staleNames(id), ['slice-a', 'slice-b']);
    advanceIdea(id, 1);

    const first = amendEmit(id, 'slice-a', doc('slice-a', { goal: 'Adds the corrected thing.' }));
    assert.equal(first.exitCode, 0, first.stderr);
    assert.deepEqual(staleNames(id), ['slice-b']);
    assert.equal(slice(id, 'route-choice').rejected, 'BLOCKS_STALE', 'one stale slice still locks the route intents');

    const second = amendEmit(id, 'slice-b', doc('slice-b'));
    assert.equal(second.exitCode, 0, second.stderr);
    assert.deepEqual(staleNames(id), []);
    assert.equal(slice(id, 'route-choice').rejected, undefined);
  } finally {
    cleanup(id);
  }
});

test('E10: a rejected amendment of a stale slice clears nothing, and a re-registration clears every name', () => {
  const id = spawnSession('doc-stale-reject');
  try {
    const set = [doc('slice-a'), doc('slice-b')];
    assert.equal(emitSet(id, set).exitCode, 0);
    assert.equal(gotoFlags(id, 'implementation-details', 'correction').exitCode, 0);
    advanceIdea(id, 1);
    const unknown = amendEmit(id, 'slice-z', doc('slice-z'));
    assert.equal(JSON.parse(unknown.stdout).rejected, 'UNKNOWN_SLICE');
    assert.deepEqual(staleNames(id), ['slice-a', 'slice-b']);
    assert.equal(emitSet(id, set).exitCode, 0);
    assert.deepEqual(staleNames(id), []);
  } finally {
    cleanup(id);
  }
});

test('E10: a goto back from crystallize locks the route intents until the documents are re-registered or amended', () => {
  for (const unlock of ['reregister', 'amend']) {
    const id = spawnSession(`doc-stale-${unlock}`);
    try {
      assert.equal(emitSet(id, [doc('slice-a')]).exitCode, 0);
      const back = gotoFlags(id, 'implementation-details', 'correction');
      assert.equal(back.exitCode, 0, back.stderr);
      assert.deepEqual(staleNames(id), ['slice-a']);
      for (const intent of ['route-choice', 'direct-build', 'plan', 'resume-direct-build', 'auto-continue']) {
        assert.equal(slice(id, intent).rejected, 'BLOCKS_STALE', intent);
      }
      advanceIdea(id, 1);
      if (unlock === 'reregister') assert.equal(emitSet(id, [doc('slice-a')]).exitCode, 0);
      else assert.equal(amendEmit(id, 'slice-a', doc('slice-a')).exitCode, 0);
      assert.deepEqual(staleNames(id), []);
      assert.equal(slice(id, 'route-choice').rejected, undefined, 'the route selector works again');
    } finally {
      cleanup(id);
    }
  }
});

test('I6: re-registering the same documents keeps completed slices, parked cursors, and the publication answer', () => {
  const id = spawnSession('doc-reregister-keeps');
  try {
    const set = [doc('slice-a'), doc('slice-b')];
    assert.equal(emitSet(id, set).exitCode, 0);
    assert.equal(runCli(['emit', id, MACHINE, '-'], JSON.stringify({ intent: 'publication', value: 'yes' })).exitCode, 0);
    slice(id, 'route-choice');
    slice(id, 'direct-build');
    for (let i = 0; i < 3; i++) slice(id, 'complete');
    slice(id, 'route-choice');
    slice(id, 'direct-build');
    slice(id, 'fail');
    const before = readState(id);
    assert.deepEqual(before.done, ['slice-a']);
    assert.ok(before.parked['slice-b']);

    const same = emitSet(id, set);
    assert.equal(same.exitCode, 0, same.stderr);
    const kept = readState(id);
    assert.deepEqual(kept.done, ['slice-a']);
    assert.deepEqual(kept.parked, before.parked);
    assert.equal(kept.publication, 'yes');

    // A changed document loses its own cursor and keeps the others.
    const changed = emitSet(id, [doc('slice-a'), doc('slice-b', { goal: 'Adds the corrected thing.' })]);
    assert.equal(changed.exitCode, 0, changed.stderr);
    const after = readState(id);
    assert.deepEqual(after.done, ['slice-a']);
    assert.deepEqual(after.parked, {});
    assert.equal(after.publication, 'yes');

    const changedDone = emitSet(id, [doc('slice-a', { goal: 'Adds another thing.' }), doc('slice-b', { goal: 'Adds the corrected thing.' })]);
    assert.equal(changedDone.exitCode, 0, changedDone.stderr);
    assert.deepEqual(readState(id).done, []);
  } finally {
    cleanup(id);
  }
});

test('the amend response reports the amend kind: metadata for origin lines only, content otherwise', () => {
  const id = spawnSession('doc-amend-kind');
  try {
    assert.equal(emitSet(id, [doc('slice-a')]).exitCode, 0);
    const metadata = amendEmit(id, 'slice-a', doc('slice-a', { origin: ORIGIN }));
    assert.equal(metadata.exitCode, 0, metadata.stderr);
    assert.equal(JSON.parse(metadata.stdout).amend_kind, 'metadata');
    const content = amendEmit(id, 'slice-a', doc('slice-a', { origin: ORIGIN, goal: 'Adds another thing.' }));
    assert.equal(JSON.parse(content.stdout).amend_kind, 'content');
  } finally {
    cleanup(id);
  }
});

test('dependency set storage orders blockers and records the dependency order', () => {
  const id = spawnSession('doc-dependency-set');
  try {
    const result = emitSet(id, [doc('dependent', { depends: 'blocker', implementation: '- I2: add the dependent.' }), doc('blocker')]);
    assert.equal(result.exitCode, 0, result.stdout + result.stderr);
    assert.deepEqual(readSet(id), ['blocker', 'dependent']);
    assert.deepEqual(Object.keys(readStoredDocuments(id)).sort(), ['blocker', 'dependent']);
  } finally {
    cleanup(id);
  }
});

test('E7: a set with a repeated change name, a missing dependency, or a cycle is rejected as a whole and stores nothing', () => {
  const id = spawnSession('doc-set-rules');
  try {
    const cases = [
      { docs: [doc('same-name'), doc('same-name')], problem: 'DUPLICATE_CHANGE_NAME' },
      { docs: [doc('slice-a', { depends: 'absent-change' }), doc('slice-b')], problem: 'MISSING_DEPENDENCY' },
      { docs: [doc('slice-a', { depends: 'slice-b' }), doc('slice-b', { depends: 'slice-a' })], problem: 'DEPENDENCY_CYCLE' },
    ];
    for (const { docs, problem } of cases) {
      const result = emitSet(id, docs);
      assert.equal(result.exitCode, 1, problem);
      const json = JSON.parse(result.stdout);
      assert.equal(json.validation.ok, false);
      assert.equal(json.error, undefined, 'a validation failure is not a delivery failure');
      assert.ok(json.validation.violations.some((entry) => entry.problem === problem), problem);
      assert.equal(readSet(id), null);
      assert.equal(readStoredDocuments(id), null);
    }
  } finally {
    cleanup(id);
  }
});

test('document emit: a multi-slice set records every name in dependency order', () => {
  const id = spawnSession('doc-multi');
  try {
    const result = emitSet(id, [doc('skeleton-slice'), doc('backlog-slice', { depends: 'skeleton-slice', implementation: '- I2: add the backlog part.' })]);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.deepEqual(readSet(id), ['skeleton-slice', 'backlog-slice']);
  } finally {
    cleanup(id);
  }
});

test('document emit: the verdict projects no change name, and only the pending list of the run view carries them', () => {
  const id = spawnSession('doc-wire');
  try {
    const result = emitSet(id, [doc('secret-name')]);
    assert.equal(result.exitCode, 0, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.doesNotMatch(JSON.stringify(json.validation), /secret-name/);
    assert.deepEqual(json.run.pending, ['secret-name']);
    const { pending, ...rest } = json.run;
    assert.doesNotMatch(JSON.stringify(rest), /secret-name/);
    assert.equal(json.validation.names, undefined);
    assert.equal(json.validation.documents[0].name, undefined);
  } finally {
    cleanup(id);
  }
});

test('document emit: one invalid document fails the whole set, exits 1, and records nothing', () => {
  const id = spawnSession('doc-invalid');
  try {
    const bad = doc('bad-slice').replace('## Maturity\nReady to propose', '## Maturity\nScope agreed');
    const result = emitSet(id, [doc('good-slice'), bad]);
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.ok, false);
    assert.equal(json.error, undefined);
    assert.equal(json.stage, undefined, 'an invalid verdict never reaches the machine');
    assert.equal(json.validation.documents[1].index, 1);
    assert.ok(json.validation.documents[1].violations.some((v) => v.problem === 'MATURITY_NOT_READY'));
    assert.equal(readSet(id), null, 'no inventory may exist after an invalid verdict');
  } finally {
    cleanup(id);
  }
});

test('E9: a Ready to Propose block is rejected as a retired format and a file that is not one document is a delivery failure', () => {
  const id = spawnSession('doc-delivery');
  try {
    const retired = ['## Ready to Propose', '', '**Change name**: old-block', '**What**: Adds a thing.', '', '---', ''].join('\n');
    const result = emitSet(id, [retired]);
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.equal(json.error, 'INVALID_EVENT');
    assert.equal(json.reason, 'RETIRED_FORMAT');
    assert.match(json.detail, /retired/);
    assert.match(result.stderr, /retired/);

    for (const text of ['', '   \n', 'not a document at all\n', `${doc('one-doc')}\n${doc('two-doc')}`]) {
      const failed = emitSet(id, [text]);
      assert.equal(failed.exitCode, 1, JSON.stringify(text));
      const body = JSON.parse(failed.stdout);
      assert.equal(body.error, 'INVALID_EVENT');
      assert.equal(body.reason, 'EVENT_UNPARSEABLE');
      assert.match(failed.stderr, /no transition occurred/);
    }
    assert.equal(readSet(id), null);
  } finally {
    cleanup(id);
  }
});

test('document emit: unreadable files and unparseable verdicts are a delivery failure that changes nothing', () => {
  const id = spawnSession('doc-read-failed');
  const { dir } = transfer.open('claude');
  try {
    const file = transfer.put(dir, 'document.md', Buffer.from(doc('file-change'))).path;
    const missing = runCli(['emit', id, MACHINE, '--document-file', path.join(dir, 'missing.md')]);
    assert.equal(missing.exitCode, 1);
    assert.equal(JSON.parse(missing.stdout).reason, 'DOCUMENT_READ_FAILED');
    for (const invalid of ['{}', '{']) {
      const verdicts = transfer.put(dir, `verdicts-${invalid.length}.json`, Buffer.from(invalid)).path;
      const rejected = runCli(['emit', id, MACHINE, '--document-file', file, '--verdicts-file', verdicts]);
      assert.equal(rejected.exitCode, 1);
      assert.equal(JSON.parse(rejected.stdout).reason, 'DOCUMENT_READ_FAILED');
    }
    assert.equal(readSet(id), null);
  } finally { transfer.close(dir); cleanup(id); }
});

test('document emit: prose in another language passes and names are recorded', () => {
  const id = spawnSession('doc-language');
  try {
    const result = emitSet(id, [doc('cambio-uno', { goal: 'Añade una función nueva.', problem: 'Porque hace falta.' })]);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.deepEqual(readSet(id), ['cambio-uno']);
  } finally {
    cleanup(id);
  }
});

test('document emit: a later document emit replaces the inventory', () => {
  const id = spawnSession('doc-replace');
  try {
    assert.equal(emitSet(id, [doc('first-set')]).exitCode, 0);
    assert.equal(emitSet(id, [doc('second-a'), doc('second-b')]).exitCode, 0);
    assert.deepEqual(readSet(id), ['second-a', 'second-b']);
    assert.deepEqual(Object.keys(readStoredDocuments(id)), ['second-a', 'second-b']);
  } finally {
    cleanup(id);
  }
});

test('document emit: with an active slice it returns that slice\'s pointer, not the route selector', () => {
  const id = spawnSession('doc-active');
  try {
    assert.equal(emitSet(id, [doc('running-slice')]).exitCode, 0);
    slice(id, 'route-choice');
    slice(id, 'direct-build');
    const result = emitSet(id, [doc('new-slice')]);
    assert.equal(result.exitCode, 0, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.equal(json.next.follow, DIRECT_BUILD_STEP);
    assert.notEqual(json.next.follow, ROUTE_SELECTOR);
  } finally {
    cleanup(id);
  }
});

test('document emit: usage errors exit 2 (other machine, retired flags, orphan verdicts, combined flags)', () => {
  const id = spawnSession('doc-usage');
  try {
    const valid = doc('usage-change');
    assert.equal(emitSet(id, [valid], { machine: IDEA_MACHINE }).exitCode, 2);
    assert.equal(emitSet(id, [valid], { machine: 'design-steps@1' }).exitCode, 2);
    assert.equal(emitSet(id, [valid], { extraArgs: ['--progress'] }).exitCode, 2);
    assert.equal(runCli(['emit', id, MACHINE, '--ready-to-propose', '--input-file', 'x']).exitCode, 2);
    assert.equal(runCli(['emit', id, MACHINE, '--ready-to-propose', '--block-file', 'x', '--verdicts-file', 'y']).exitCode, 2);
    assert.match(runCli(['emit', id, MACHINE, '--block-file', 'x']).stderr, /retired/);
    assert.equal(runCli(['emit', id, MACHINE, '--verdicts-file', 'orphan.json']).exitCode, 2);
    assert.equal(runCli(['emit', id, MACHINE, '--document-file']).exitCode, 2);
    assert.equal(emitSet(id, [valid], { extraArgs: ['--set', 'a=b'] }).exitCode, 2);
    assert.equal(readSet(id), null);
  } finally {
    cleanup(id);
  }
});

test('document emit: a single change without implementation notes is recorded, and a slice of a set without one records nothing', () => {
  const id = spawnSession('doc-no-item');
  try {
    const single = emitSet(id, [doc('empty-details', { implementation: null })]);
    assert.equal(single.exitCode, 0, single.stdout);
    assert.equal(JSON.parse(single.stdout).validation.ok, true);
    assert.notEqual(readStoredDocuments(id), null);

    const other = spawnSession('doc-no-item-set');
    try {
      const result = emitSet(other, [doc('with-item'), doc('without-item', { implementation: null })]);
      assert.equal(result.exitCode, 1);
      assert.ok(JSON.parse(result.stdout).validation.documents[1].violations.some((v) => v.problem === 'NO_IMPLEMENTATION_ITEM'));
      assert.equal(readSet(other), null);
    } finally {
      cleanup(other);
    }
  } finally {
    cleanup(id);
  }
});

test('document emit: a flagged line without a verdict records nothing and is reported', () => {
  const id = spawnSession('doc-flagged');
  try {
    const text = doc('flagged-change', { problem: 'The change documents git commit behavior.' });
    const result = emitSet(id, [text]);
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.ok, false);
    assert.equal(json.validation.structural_ok, true);
    assert.ok(json.validation.judgment.pending.some((entry) => entry.clause === 'mutating-git'));
    assert.ok(json.validation.flagged.length > 0);
    assert.equal(readSet(id), null);
  } finally {
    cleanup(id);
  }
});

test('document emit: context verdicts record the set and store text, hash, and verdicts per change name', () => {
  const id = spawnSession('doc-verdicts');
  try {
    const text = doc('verdict-change', { problem: 'The change documents git commit behavior.' });
    const flagged = checkDocument(text).flagged;
    const verdicts = flagged.map((entry) => ({ ...entry, verdict: 'context', evidence: 'Subject matter, not a requested operation.' }));
    const result = emitSet(id, [text], { verdicts: [verdicts] });
    assert.equal(result.exitCode, 0, result.stdout);
    assert.deepEqual(readSet(id), ['verdict-change']);
    const stored = readStoredDocuments(id)['verdict-change'];
    assert.equal(stored.text, text);
    assert.equal(stored.hash, hashDocument(text));
    assert.deepEqual(stored.verdicts.map((entry) => entry.line), verdicts.map((entry) => entry.line));
  } finally {
    cleanup(id);
  }
});

test('document emit: a violation verdict records nothing and the verdict is shown', () => {
  const id = spawnSession('doc-violation');
  try {
    const text = doc('violation-change', { problem: 'The change documents git commit behavior.' });
    const verdicts = checkDocument(text).flagged.map((entry) => ({ ...entry, verdict: 'violation', evidence: 'Asks for a commit.' }));
    const result = emitSet(id, [text], { verdicts: [verdicts] });
    assert.equal(result.exitCode, 1);
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.ok, false);
    assert.ok(json.validation.judgment.violations.length > 0);
    assert.equal(readSet(id), null);
  } finally {
    cleanup(id);
  }
});

test('document emit: the inventory and the documents land in one write; the stored documents stay when a later emit is invalid', () => {
  const id = spawnSession('doc-one-write');
  try {
    assert.equal(emitSet(id, [doc('kept-change')]).exitCode, 0);
    const before = readStoredDocuments(id);
    const invalid = emitSet(id, [doc('new-change').replace('## Problem', '## Unknown')]);
    assert.equal(invalid.exitCode, 1);
    assert.deepEqual(readStoredDocuments(id), before);
    assert.deepEqual(readSet(id), ['kept-change']);
  } finally {
    cleanup(id);
  }
});

test('block verb: returns the stored text and hash of one recorded slice', () => {
  const id = spawnSession('doc-verb');
  try {
    const text = doc('verb-slice');
    assert.equal(emitSet(id, [text]).exitCode, 0);
    const result = blockVerb(id, 'verb-slice');
    assert.equal(result.exitCode, 0, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.equal(json.text, text);
    assert.equal(json.hash, hashDocument(text));
  } finally {
    cleanup(id);
  }
});

test('block verb: a missing session, store, or change name is BLOCK_NOT_FOUND with no text', () => {
  const id = spawnSession('doc-verb-missing');
  try {
    assert.equal(JSON.parse(blockVerb(id, 'absent').stdout).error, 'BLOCK_NOT_FOUND');
    assert.equal(emitSet(id, [doc('present-slice')]).exitCode, 0);
    const result = blockVerb(id, 'absent');
    assert.equal(result.exitCode, 1);
    assert.equal(JSON.parse(result.stdout).error, 'BLOCK_NOT_FOUND');
    assert.equal(JSON.parse(result.stdout).text, undefined);
  } finally {
    cleanup(id);
  }
});

test('amend: a pending slice is replaced and no other stored entry or inventory field changes', () => {
  const id = spawnSession('doc-amend-pending');
  try {
    assert.equal(emitSet(id, [doc('slice-a'), doc('slice-b')]).exitCode, 0);
    const before = readStoredDocuments(id);
    const stateBefore = readState(id);
    const amended = doc('slice-b', { goal: 'Adds the corrected thing.' });
    const result = amendEmit(id, 'slice-b', amended);
    assert.equal(result.exitCode, 0, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.equal(json.validation.ok, true);
    assert.equal(json.rejected, undefined);
    const after = readStoredDocuments(id);
    assert.deepEqual(after['slice-a'], before['slice-a']);
    assert.equal(after['slice-b'].text, amended);
    assert.equal(after['slice-b'].hash, hashDocument(amended));
    assert.notEqual(after['slice-b'].hash, before['slice-b'].hash);
    assert.deepEqual(Object.keys(after), ['slice-a', 'slice-b']);
    assert.deepEqual(readState(id), stateBefore);
    assert.equal(JSON.parse(blockVerb(id, 'slice-b').stdout).hash, after['slice-b'].hash);
  } finally {
    cleanup(id);
  }
});

test('amend: the amended document carries its own verdicts', () => {
  const id = spawnSession('doc-amend-verdicts');
  try {
    assert.equal(emitSet(id, [doc('slice-a')]).exitCode, 0);
    const amended = doc('slice-a', { problem: 'The change is about git commit messages.' });
    const verdicts = checkDocument(amended).flagged.map((entry) => ({ ...entry, verdict: 'context', evidence: 'Problem names the subject.' }));
    const result = amendEmit(id, 'slice-a', amended, { verdicts: [verdicts] });
    assert.equal(result.exitCode, 0, result.stderr);
    assert.deepEqual(readStoredDocuments(id)['slice-a'].verdicts.map((entry) => entry.line), verdicts.map((entry) => entry.line));
  } finally {
    cleanup(id);
  }
});

function parkSlice(id) {
  slice(id, 'route-choice');
  slice(id, 'direct-build');
  slice(id, 'complete');
  slice(id, 'fail');
}

test('amend: a stopped (parked) slice keeps its saved cursor on a metadata amendment', () => {
  const id = spawnSession('doc-amend-stopped');
  try {
    assert.equal(emitSet(id, [doc('slice-a')]).exitCode, 0);
    parkSlice(id);
    const parkedBefore = readState(id).parked;
    assert.deepEqual(Object.keys(parkedBefore), ['slice-a']);
    const amended = doc('slice-a', { origin: ORIGIN });
    const result = amendEmit(id, 'slice-a', amended);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).rejected, undefined);
    assert.equal(JSON.parse(result.stdout).amend_kind, 'metadata');
    assert.deepEqual(readState(id).parked, parkedBefore);
    assert.equal(readStoredDocuments(id)['slice-a'].text, amended);
    assert.equal(slice(id, 'resume-direct-build').stage, 'backfill', 'the corrected slice resumes at its saved step');
  } finally {
    cleanup(id);
  }
});

test('amend: a content amendment of a stopped slice drops its cursor and presents the route selector again', () => {
  const id = spawnSession('doc-amend-stopped-content');
  try {
    assert.equal(emitSet(id, [doc('slice-a')]).exitCode, 0);
    parkSlice(id);
    const amended = doc('slice-a', { goal: 'Adds the corrected thing.' });
    const result = amendEmit(id, 'slice-a', amended);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).amend_kind, 'content');
    assert.deepEqual(readState(id).parked, {});
    assert.equal(readState(id).blockEmissionTurnClosed, true);
    assert.equal(readStoredDocuments(id)['slice-a'].text, amended);
    assert.equal(slice(id, 'route-choice').rejected, undefined);
  } finally {
    cleanup(id);
  }
});

test('amend: a running slice is amended in place by a metadata amendment and returns to pending by a content one', () => {
  const id = spawnSession('doc-amend-running');
  try {
    assert.equal(emitSet(id, [doc('slice-a'), doc('slice-b')]).exitCode, 0);
    slice(id, 'route-choice');
    slice(id, 'direct-build');

    const metadata = amendEmit(id, 'slice-a', doc('slice-a', { origin: ORIGIN }));
    assert.equal(metadata.exitCode, 0, metadata.stderr);
    assert.equal(JSON.parse(metadata.stdout).rejected, undefined);
    assert.equal(readState(id).active, 'slice-a');
    assert.match(readStoredDocuments(id)['slice-a'].text, /Backlog origin/);

    const other = amendEmit(id, 'slice-b', doc('slice-b', { goal: 'Changed while another runs.' }));
    assert.equal(JSON.parse(other.stdout).rejected, undefined);
    assert.match(readStoredDocuments(id)['slice-b'].text, /Changed while another runs\./);
    assert.equal(readState(id).active, 'slice-a');

    const content = amendEmit(id, 'slice-a', doc('slice-a', { goal: 'Changed mid-run.' }));
    assert.equal(content.exitCode, 0, content.stderr);
    assert.equal(JSON.parse(content.stdout).rejected, undefined);
    assert.equal(readState(id).active, null);
    assert.equal(readState(id).stage, 'waiting');
    assert.equal(readState(id).blockEmissionTurnClosed, true);
    assert.match(readStoredDocuments(id)['slice-a'].text, /Changed mid-run\./);
  } finally {
    cleanup(id);
  }
});

test('amend: a completed slice is rejected and the stored document stays unchanged', () => {
  const id = spawnSession('doc-amend-completed');
  try {
    assert.equal(emitSet(id, [doc('slice-a'), doc('slice-b')]).exitCode, 0);
    slice(id, 'route-choice');
    slice(id, 'direct-build');
    for (let i = 0; i < 3; i++) slice(id, 'complete');
    assert.deepEqual(readState(id).done, ['slice-a']);
    const before = readStoredDocuments(id);
    const result = amendEmit(id, 'slice-a', doc('slice-a', { goal: 'Changed after completion.' }));
    assert.equal(JSON.parse(result.stdout).rejected, 'SLICE_COMPLETED');
    assert.deepEqual(readStoredDocuments(id), before);
    assert.deepEqual(readState(id).done, ['slice-a']);
  } finally {
    cleanup(id);
  }
});

test('amend: an unknown slice name is rejected and nothing is stored', () => {
  const id = spawnSession('doc-amend-unknown');
  try {
    assert.equal(emitSet(id, [doc('slice-a')]).exitCode, 0);
    const before = readStoredDocuments(id);
    const result = amendEmit(id, 'slice-z', doc('slice-z'));
    assert.equal(JSON.parse(result.stdout).rejected, 'UNKNOWN_SLICE');
    assert.deepEqual(readStoredDocuments(id), before);
  } finally {
    cleanup(id);
  }
});

test('amend: the amended document is validated with the dispatchable contract and invalid text replaces nothing', () => {
  const id = spawnSession('doc-amend-invalid');
  try {
    assert.equal(emitSet(id, [doc('slice-a')]).exitCode, 0);
    const before = readStoredDocuments(id);
    const result = amendEmit(id, 'slice-a', doc('slice-a').replace('## Scope', '## Unknown'));
    assert.equal(result.exitCode, 1);
    assert.equal(JSON.parse(result.stdout).validation.ok, false);
    assert.deepEqual(readStoredDocuments(id), before);
  } finally {
    cleanup(id);
  }
});

test('amend: exactly one document carrying the amended change name is required', () => {
  const id = spawnSession('doc-amend-name');
  try {
    assert.equal(emitSet(id, [doc('slice-a'), doc('slice-b')]).exitCode, 0);
    const before = readStoredDocuments(id);
    const mismatch = amendEmit(id, 'slice-a', doc('slice-b'));
    assert.equal(mismatch.exitCode, 1);
    assert.equal(JSON.parse(mismatch.stdout).reason, 'AMEND_NAME_MISMATCH');
    const two = emitSet(id, [doc('slice-a'), doc('slice-b')], { amend: 'slice-a' });
    assert.equal(two.exitCode, 1);
    assert.equal(JSON.parse(two.stdout).reason, 'AMEND_DOCUMENT_COUNT');
    assert.deepEqual(readStoredDocuments(id), before);
  } finally {
    cleanup(id);
  }
});

test('amend: a change of the amended slice that breaks the set is rejected without replacement', () => {
  const id = spawnSession('doc-amend-set');
  try {
    assert.equal(emitSet(id, [doc('dependent', { depends: 'blocker', implementation: '- I2: add the dependent.' }), doc('blocker')]).exitCode, 0);
    const before = readStoredDocuments(id);
    const missing = amendEmit(id, 'dependent', doc('dependent', { depends: 'absent-change', implementation: '- I2: add the dependent.' }));
    assert.equal(missing.exitCode, 1);
    assert.equal(JSON.parse(missing.stdout).reason, 'AMEND_DEPENDENCIES_INVALID');
    const cycle = amendEmit(id, 'blocker', doc('blocker', { depends: 'dependent' }));
    assert.equal(cycle.exitCode, 1);
    assert.deepEqual(readStoredDocuments(id), before);
  } finally {
    cleanup(id);
  }
});

test('amend: usage errors exit 2 (no name, other machine)', () => {
  const id = spawnSession('doc-amend-usage');
  try {
    assert.equal(emitSet(id, [doc('slice-a')], { extraArgs: ['--amend'] }).exitCode, 2);
    assert.equal(amendEmit(id, 'slice-a', doc('slice-a'), { machine: IDEA_MACHINE }).exitCode, 2);
  } finally {
    cleanup(id);
  }
});
