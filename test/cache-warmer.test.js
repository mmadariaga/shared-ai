'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { prepare, waitOnce, intervalMilliseconds } = require('../skills/universal/sai-cache-warmer/wait');
const { expandInstallManifest } = require('../bin/install-manifest');

const now = new Date(2026, 9, 24, 16, 0);

test('complete arguments resolve without questions and preserve the supplied interval', () => {
  const result = prepare({ arguments: '30 min 18:00' }, now);
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.state, { interval_ms: 1800000, closing_ms: new Date(2026, 9, 24, 18, 1).getTime() });
  assert.equal(intervalMilliseconds('1.5 hours'), 5400000);
  assert.equal(intervalMilliseconds('30'), 1800000);
});

test('partial and invalid arguments ask only for the affected field', () => {
  for (const text of ['30 min', '30 min nonsense', '30 min 25:00', '30 min 18:xx']) {
    const result = prepare({ arguments: text }, now);
    assert.deepEqual(result.fields, ['target'], text);
    assert.equal(intervalMilliseconds(result.values.interval), 1800000);
  }
  for (const text of ['18:00', '0 min 18:00', '-1 min 18:00', 'bad 18:00']) {
    const result = prepare({ arguments: text }, now);
    assert.deepEqual(result.fields, ['interval'], text);
    assert.equal(result.values.target, '18:00');
    assert.equal(prepare({ ...result.values, interval: '15 min' }, now).status, 'ready');
  }
  assert.deepEqual(prepare({}, now).fields, ['interval', 'target']);
  for (const interval of ['0', '-1', 'NaN', 'Infinity', '0.0000001 sec', '999999999999999999 h']) {
    assert.equal(intervalMilliseconds(interval), null);
  }
});

test('relative target presets resolve deterministically with a one-minute margin', () => {
  for (const hours of [1, 2, 3]) {
    const result = prepare({ interval: '5 min', target: `now + ${hours}h` }, now);
    assert.equal(result.state.closing_ms, now.getTime() + hours * 3600000 + 60000);
  }
});

test('relative targets retain seconds and milliseconds while another field is corrected', () => {
  const selectedAt = new Date(2026, 9, 24, 16, 0, 45, 123);
  for (const hours of [1, 2, 3]) {
    const expected = selectedAt.getTime() + hours * 3600000 + 60000;
    const complete = prepare({ interval: '5 min', target: `now + ${hours}h` }, selectedAt);
    assert.equal(complete.state.closing_ms, expected);
    assert.match(complete.closing_local, /:45\.123$/);
    const partial = prepare({ target: `now + ${hours}h` }, selectedAt);
    assert.deepEqual(partial.fields, ['interval']);
    const corrected = prepare({ ...partial.values, interval: '15 min' }, new Date(selectedAt.getTime() + 90000));
    assert.equal(corrected.state.closing_ms, expected);
  }
  const explicit = prepare({ interval: '5 min', target: '18:00' }, selectedAt);
  assert.equal(explicit.state.closing_ms, new Date(2026, 9, 24, 18, 1).getTime());
});

test('relative day-change confirmation preserves the exact selected instant', () => {
  const selectedAt = new Date(2026, 11, 31, 23, 30, 45, 987);
  const partial = prepare({ interval: 'invalid', target: 'now + 1h' }, selectedAt);
  const confirmation = prepare({ ...partial.values, interval: '5 min' }, new Date(2027, 0, 1, 1));
  assert.equal(confirmation.status, 'confirm_date');
  assert.equal(confirmation.proposed_date, '2027-01-01');
  assert.match(confirmation.target_local, /00:30:45\.987$/);
  const confirmed = prepare({ ...confirmation.values, date: confirmation.proposed_date }, new Date(2027, 0, 2));
  assert.equal(confirmed.state.closing_ms, selectedAt.getTime() + 3660000);
  const replaced = prepare({ ...partial.values, interval: '5 min', target: '2027-01-02 18:00' }, selectedAt);
  assert.equal(replaced.state.closing_ms, new Date(2027, 0, 2, 18, 1).getTime());
});

test('implicit day changes require confirmation, and confirmation fixes the date', () => {
  const late = new Date(2026, 11, 31, 23, 30);
  for (const target of ['18:00', 'now + 1h']) {
    const result = prepare({ interval: '45 min', target }, late);
    assert.equal(result.status, 'confirm_date');
    assert.equal(result.proposed_date, '2027-01-01');
    const confirmed = prepare({ ...result.values, date: result.proposed_date }, new Date(2027, 0, 2));
    assert.equal(confirmed.status, 'ready');
    assert.equal(new Date(confirmed.state.closing_ms).getDate(), 1);
  }
  assert.equal(prepare({ interval: '5 min', target: '2026-10-23 18:00' }, now).status, 'ready');
  for (const target of ['2026-02-30 18:00', '2026-13-01 18:00', '12:60']) {
    assert.deepEqual(prepare({ interval: '5 min', target }, now).fields, ['target']);
  }
  const badDate = prepare({ interval: '5 min', target: '18:00', date: '2026-02-30' }, now);
  assert.deepEqual(badDate.fields, ['target']);
  assert.equal(prepare({ ...badDate.values, target: '2026-10-24 18:00' }, now).status, 'ready');
});

test('one wait per call, final wait shortened, state unchanged, no wait after closure', async () => {
  let time = now.getTime();
  const state = { interval_ms: 60000, closing_ms: time + 90000 };
  const original = { ...state }, waits = [];
  const io = { now: () => time, wait: async ms => { waits.push(ms); time += ms; } };
  assert.deepEqual(await waitOnce(state, io), { status: 'continue', waited_ms: 60000 });
  assert.deepEqual(await waitOnce(state, io), { status: 'finished', waited_ms: 30000 });
  assert.deepEqual(await waitOnce(state, io), { status: 'finished', waited_ms: 0 });
  assert.deepEqual(waits, [60000, 30000]);
  assert.deepEqual(state, original);
  const past = prepare({ interval: '5 min', target: '2026-10-23 18:00' }, now);
  assert.equal((await waitOnce(past.state, io)).status, 'finished');
});

test('late wakes finish and failures propagate without retrying', async () => {
  let time = 1000, calls = 0;
  const state = { interval_ms: 500, closing_ms: 2000 };
  assert.equal((await waitOnce(state, { now: () => time, wait: async () => { calls++; time = 3000; } })).status, 'finished');
  assert.equal(calls, 1);
  await assert.rejects(waitOnce(state, { now: () => 1000, wait: async () => { throw new Error('cancelled'); } }), /cancelled/);
  for (const invalid of [{}, { interval_ms: 0, closing_ms: 2000 }, { interval_ms: 1, closing_ms: NaN }]) {
    await assert.rejects(waitOnce(invalid), /Invalid fixed/);
  }
});

test('CLI rejects invalid JSON and can finish without a real wait', () => {
  const script = path.resolve(__dirname, '../skills/universal/sai-cache-warmer/wait.js');
  const output = execFileSync(process.execPath, [script, 'wait'], {
    input: JSON.stringify({ interval_ms: 60000, closing_ms: 0 }), encoding: 'utf8',
  });
  assert.equal(JSON.parse(output).status, 'finished');
  assert.equal(spawnSync(process.execPath, [script, 'wait'], { input: 'bad' }).status, 1);
});

test('both harnesses install the skill, runner and required capabilities', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const manifest = require('../sai/install-manifest.json');
  for (const harness of ['claude', 'opencode']) {
    const destinationRoot = Object.fromEntries(['agents', 'commands', 'config', 'sai', 'skills', 'root']
      .map(key => [key, path.join(repoRoot, '.tmp', 'cache-warmer-projection', harness, key)]));
    const projections = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    for (const filename of ['SKILL.md', 'wait.js']) {
      assert.ok(projections.some(p => p.destinationPath === path.join(destinationRoot.skills, 'sai-cache-warmer', filename)));
    }
  }
  assert.equal(manifest.capabilities.assignments.commands['sai-cache-warmer'], 'cache-warmer-command');
});

test('instruction contract keeps continuation and recovery with the main agent until closure or cancellation', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const skill = fs.readFileSync(path.join(repoRoot, 'skills/universal/sai-cache-warmer/SKILL.md'), 'utf8');
  for (const text of ['disable-model-invocation: true', 'AskUserQuestion', 'question', 'Claude Code', 'OpenCode', 'run_in_background: true', 'background: true', 'No periodic status checks']) {
    assert.ok(skill.includes(text), text);
  }
  assert.match(skill, /Complete only when the fixed closing time is reached or the user cancels/);
  assert.match(skill, /main agent owns continuation and recovery/);
  assert.match(skill, /Use your judgment to recover from obstacles and adapt your approach/);
  assert.match(skill, /Preserve the original `state`, including its\s+fixed closing time, during recovery/);
  assert.match(skill, /Keep `wait\.js` as the preparation and wait mechanism/);
  assert.match(skill, /foreground execution\s+limit is not a prerequisite for launching a background wait/);
  assert.match(skill, /continue toward the same closing time\s+when control becomes available again/);
  assert.doesNotMatch(skill, /report the limitation and stop|launch no further wait|state\.interval_ms \+ 60000/);
  assert.doesNotMatch(skill, /retry (?:count|limit)|no-progress threshold|\d+ (?:attempts|retries)/i);
});
