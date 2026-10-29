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

const os = require('node:os');
const warmer = require('../skills/universal/sai-cache-warmer/wait');

function chainFixture(t) {
  const saiRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'warm-chain-'));
  t.after(() => fs.rmSync(saiRoot, { recursive: true, force: true }));
  const clock = { time: 0 };
  const io = { saiRoot, now: () => clock.time, wait: async ms => { clock.time += ms; } };
  return { saiRoot, clock, io };
}

test('warm opens a window of max minutes, and the returned state re-arms it unchanged', async t => {
  const { warmState, warmOnce } = warmer;
  const { io, clock } = chainFixture(t);
  assert.deepEqual(warmState({ interval: 4, max: 30 }, 1000), { interval_ms: 240000, closing_ms: 1000 + 1800000 });
  for (const bad of [{}, { interval: 0, max: 5 }, { interval: 5, max: 4 }, { interval: 'x', max: 5 }]) assert.throws(() => warmState(bad, 0), /Warming/);
  const first = await warmOnce({ interval: 4, max: 10 }, io);
  assert.match(first.state.chain, /^[0-9a-f]{16}$/);
  assert.deepEqual(first, { status: 'continue', waited_ms: 240000, state: { interval_ms: 240000, closing_ms: 600000, chain: first.state.chain, generation: 1, armed_ms: 0 } });
  const second = await warmOnce({ state: first.state }, io);
  assert.equal(second.status, 'continue');
  assert.deepEqual(second.state, first.state, 'a wake re-arms the state unchanged');
  const last = await warmOnce({ state: first.state }, io);
  assert.deepEqual([last.status, last.waited_ms], ['finished', 120000]);
  clock.time = 0;
  const stale = await warmOnce({ state: first.state, interval: 1 }, io);
  assert.deepEqual([stale.status, stale.waited_ms], ['finished', 0], 'the finished chain released its record, so a stale state is superseded');
  await assert.rejects(warmOnce({ state: first.state, interval: 0 }, io), /positive interval/);
});

test('E1 a real message supersedes the earlier wait of its chain, and only the newest generation stays live', async t => {
  const { warmOnce } = warmer;
  const { io, clock } = chainFixture(t);
  const chain = warmer.newChainId();
  const early = await warmOnce({ interval: 4, max: 30, chain }, io);
  assert.equal(early.state.generation, 1);
  // A real message arrives; the agent arms again with its chain id before the earlier wait wakes.
  clock.time = 60000;
  const newest = await warmOnce({ interval: 4, max: 30, chain }, io);
  assert.equal(newest.state.generation, 2);
  assert.equal(newest.status, 'continue');
  // The earlier wait wakes: it is superseded and finishes, whatever its window.
  const woken = await warmOnce({ state: early.state }, io);
  assert.deepEqual([woken.status, woken.waited_ms], ['finished', 0]);
  const live = await warmOnce({ state: newest.state }, io);
  assert.equal(live.status, 'continue');
});

test('E1 a wait superseded while it sleeps finishes at its wake', async t => {
  const { warmOnce } = warmer;
  const { io, saiRoot } = chainFixture(t);
  const chain = warmer.newChainId();
  const rearm = () => warmOnce({ interval: 4, max: 30, chain }, { ...io, wait: async () => {} });
  const result = await warmOnce({ interval: 4, max: 30, chain }, { ...io, wait: async () => { await rearm(); } });
  assert.equal(result.status, 'finished');
  assert.equal(JSON.parse(fs.readFileSync(path.join(saiRoot, `warm-chain-${chain}.json`), 'utf8')).generation, 2);
});

test('E2 each agent owns its own chain: one agent\'s arm never supersedes another agent\'s wait', async t => {
  const { warmOnce } = warmer;
  const { io } = chainFixture(t);
  const a = await warmOnce({ interval: 4, max: 30 }, io);
  const b = await warmOnce({ interval: 4, max: 30 }, io);
  assert.notEqual(a.state.chain, b.state.chain);
  assert.equal((await warmOnce({ state: a.state }, io)).status, 'continue');
  assert.equal((await warmOnce({ state: b.state }, io)).status, 'continue');
});

test('E3 a cutoff mark newer than the arm ends the chain at its next wake, and later arms follow the new timings', async t => {
  const { warmOnce } = warmer;
  const { io, saiRoot, clock } = chainFixture(t);
  const chain = warmer.newChainId();
  const before = await warmOnce({ interval: 4, max: 30, chain }, io);
  fs.writeFileSync(path.join(saiRoot, warmer.CUTOFF_FILE), JSON.stringify({ cutoff_ms: clock.time + 1 }));
  assert.equal((await warmOnce({ state: before.state }, io)).status, 'finished');
  clock.time += 10;
  const after = await warmOnce({ interval: 4, max: 30, chain }, io);
  assert.equal(after.status, 'continue', 'a chain armed after the mark stays live even when it reuses the chain id');
  assert.equal((await warmOnce({ state: after.state }, io)).status, 'continue');
});

test('the chain record is pruned when stale, released when its window closes, and refuses a path-like id', async t => {
  const { warmOnce } = warmer;
  const { io, saiRoot, clock } = chainFixture(t);
  const stale = path.join(saiRoot, 'warm-chain-0000000000000000.json');
  fs.writeFileSync(stale, '{"generation":1}');
  const old = new Date(Date.now() - 2 * 86400000);
  fs.utimesSync(stale, old, old);
  clock.time = Date.now();
  const fresh = await warmOnce({ interval: 1, max: 3 }, io);
  assert.equal(fs.existsSync(stale), false);
  const record = path.join(saiRoot, `warm-chain-${fresh.state.chain}.json`);
  assert.equal(fs.existsSync(record), true);
  assert.equal((await warmOnce({ state: fresh.state }, io)).status, 'continue');
  assert.equal((await warmOnce({ state: fresh.state }, io)).status, 'finished');
  assert.equal(fs.existsSync(record), false);
  await assert.rejects(warmOnce({ interval: 1, max: 2, chain: '../escape' }, io), /chain must be the id/);
});

test('the warm subcommand runs from the CLI and the user-invoked prepare and wait are unchanged', () => {
  const script = path.resolve(__dirname, '../skills/universal/sai-cache-warmer/wait.js');
  const done = JSON.parse(execFileSync(process.execPath, [script, 'warm'], { input: JSON.stringify({ state: { interval_ms: 60000, closing_ms: 0 } }), encoding: 'utf8' }));
  assert.deepEqual(done, { status: 'finished', waited_ms: 0, state: { interval_ms: 60000, closing_ms: 0 } });
  assert.equal(spawnSync(process.execPath, [script, 'warm'], { input: JSON.stringify({ interval: 5, max: 1 }) }).status, 1);
  assert.equal(spawnSync(process.execPath, [script, 'nonsense'], { input: '{}' }).status, 1);
});

test('the chain subcommand prints a fresh id without reading stdin', () => {
  const script = path.resolve(__dirname, '../skills/universal/sai-cache-warmer/wait.js');
  const run = () => JSON.parse(execFileSync(process.execPath, [script, 'chain'], { input: '', encoding: 'utf8' })).chain;
  const [first, second] = [run(), run()];
  assert.match(first, /^[0-9a-f]{16}$/);
  assert.notEqual(first, second);
});

test('the benchmark override writes the cutoff file that the warmer reads', () => {
  assert.equal(require('../skills/universal/sai-context-cache-ttl-benchmark/warming_override').CUTOFF_FILE, warmer.CUTOFF_FILE);
});

test('E6 the explore command allows the wait script on both harnesses', () => {
  const manifest = require('../sai/install-manifest.json');
  const wait = 'node {skills}/sai-cache-warmer/wait.js *';
  assert.ok(manifest.capabilities.profiles['explore-command'].shell.includes(wait));
  const { translate } = require('../bin/capabilities');
  for (const harness of ['claude', 'opencode']) {
    const grants = translate(manifest.capabilities, 'explore-command', harness);
    const locations = harness === 'claude' ? ['~/.claude', '.claude'] : ['~/.config/opencode', '.opencode'];
    for (const location of locations) {
      const resource = `node ${location}/skills/sai-cache-warmer/wait.js${harness === 'claude' ? ':*' : ' *'}`;
      if (harness === 'claude') assert.ok(grants.allowedTools.includes(`Bash(${resource})`), resource);
      else assert.ok(grants.permissions.some(rule => rule.action === 'shell' && rule.resource === resource && rule.effect === 'allow'), resource);
    }
  }
});

test('the policy defines the wake acknowledgement, the final response, and the chain', () => {
  const policy = fs.readFileSync(path.resolve(__dirname, '../sai/policies/cache-warming.md'), 'utf8');
  assert.match(policy, /exactly `ok`[\s\S]{0,200}never a result/);
  assert.match(policy, /spend no attempt on it/);
  assert.match(policy, /Arm after every response except your final response/);
  assert.match(policy, /arm nothing, so a finished session never wakes again/);
  assert.match(policy, /`needs_input`\) and an intermediate step report are not final/);
  assert.match(policy, /"chain": "<chain>"/);
  assert.match(policy, /Claude Code `Bash`[\s\S]*opencode shell/);
});

test('the policy defines the warming declaration, the warm-up order, and dispose only after warming: true', () => {
  const policy = fs.readFileSync(path.resolve(__dirname, '../sai/policies/cache-warming.md'), 'utf8');
  assert.match(policy, /## Warming declaration/);
  assert.match(policy, /`warming: true` or `warming: false`/);
  assert.match(policy, /beside that path in the message and never inside the report file/);
  assert.match(policy, /counts as `warming: false`/);
  assert.match(policy, /Dispose only a handle whose latest real message declared `warming: true`/);
  assert.match(policy, /no stop call, no shell removal, and no `dispose` message/);
  assert.match(policy, /\*\*Warm-up\.\*\*[\s\S]*Never send it to a `budget-executor` or to a worker/);
  assert.match(policy, /not an obstacle, spends no attempt, and is not retried/);
  assert.doesNotMatch(policy, /silent no-op/);
  assert.match(policy, /never in the `sai-state` store/);
});

test('helper contracts declare warming and the budget skills dispose only after warming: true', () => {
  const read = relative => fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8');
  assert.match(read('sai/policies/explore-agent.md'), /`ladder_discards`, `out_of_root_requests`, and `warming`/);
  assert.match(read('sai/policies/explore-agent.md'), /`warm-up` followed by a warming line/);
  assert.match(read('sai/policies/executor-agent.md'), /`warming: false`/);
  assert.match(read('sai/policies/budget-agent.md'), /`warming: false`/);
  for (const harness of ['claude', 'opencode']) {
    for (const helper of ['budget-explorer', 'budget-subagent']) {
      const skill = read(`skills/${harness}/${helper}/SKILL.md`);
      assert.match(skill, /`warm-up` order/, `${harness} ${helper} describes warm-up`);
      assert.match(skill, /declared `warming: true`/, `${harness} ${helper} disposes only after warming: true`);
    }
    assert.match(read(`skills/${harness}/budget-executor/SKILL.md`), /never arms[\s\S]*nothing to dispose/);
  }
});

test('worker bindings dispose only after a warming: true declaration, on both harnesses', () => {
  for (const harness of ['claude', 'opencode']) {
    const binding = fs.readFileSync(path.resolve(__dirname, `../sai/orchestration/workers/bindings/${harness}/standalone-worker-template.md`), 'utf8');
    assert.match(binding, /declares `warming: true\|false`/, harness);
    assert.match(binding, /only when the worker's latest message declared\s+`warming: true`; with any other value it disposes nothing/, harness);
  }
});

test('explore hand-off warming: the step file, its two loaders, and the stops are single-sourced', () => {
  const root = path.resolve(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const step = read('sai/commands/explore/steps/handoff-warming.md');
  assert.match(step, /--role agent/);
  assert.match(step, /`30 min \(Recommended\)`, `4 min`, `No`/);
  assert.match(step, /`4h \(Recommended\)`, `2h`, `1h`/);
  assert.match(step, /1 hour with a Claude subscription and 5 minutes with pay-per-token/);
  assert.match(step, /\/sai-context-cache-ttl-benchmark/);
  assert.match(step, /§ Stop your own wait/);
  assert.match(read('sai/policies/cache-warming.md'), /## Hand-off wait[\s\S]*only a wake re-arms/i);
  assert.match(read('sai/policies/cache-warming.md'), /add no `interval` and resolve no setting/);
  assert.match(read('sai/policies/cache-warming.md'), /Each re-arm launches a new background task, so replace the task id[\s\S]{0,120}chain stays the same/);
  assert.match(step, /Every wake re-arm launches a new background task: replace the task id in `handoff_wait`/);
  assert.match(step, /updates the task id in `handoff_wait`/);
  assert.match(step, /task id currently held in `handoff_wait`/);
  for (const loader of ['sai/commands/explore/steps/pipeline-plan-unattended.md', 'sai/commands/explore/steps/route-selector.md']) {
    assert.match(read(loader), /Fetch @sai\/commands\/explore\/steps\/handoff-warming\.md/, loader);
  }
  assert.match(read('sai/commands/explore/steps/slice.md'), /stop the hand-off wait first/);
  assert.match(read('sai/commands/explore/body.md'), /hand-off wait of an earlier invocation/);
});

test('the explore command may stop its own background task: TaskStop on Claude Code, no new opencode rule', () => {
  const manifest = require('../sai/install-manifest.json');
  const { translate } = require('../bin/capabilities');
  assert.equal(manifest.capabilities.profiles['explore-command'].stopTask, true);
  const claude = translate(manifest.capabilities, 'explore-command', 'claude');
  assert.ok(claude.nativeTools.includes('TaskStop'));
  assert.ok(claude.allowedTools.split(', ').includes('TaskStop'));
  const opencode = translate(manifest.capabilities, 'explore-command', 'opencode');
  assert.ok(!opencode.nativeActions.includes('TaskStop'));
  assert.ok(!translate(manifest.capabilities, 'coordinator', 'claude').nativeTools.includes('TaskStop'));
});
