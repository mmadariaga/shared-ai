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

const WAIT = path.resolve(__dirname, '../skills/universal/sai-cache-warmer/wait.js');
const ON = { interval: 4, max: 30 };
const REMINDER = 'If you are the main session, check for an unhandled user response or actionable authorized work. Handle it before ending the turn; otherwise preserve the current wait or completed state, and when nothing is left to handle reply with exactly `➡️ Warming context cache up.`. If you are a subagent, follow your existing warming protocol: reply to a wake with exactly `warming context cache up`, and to `dispose` and every wake after it with exactly `cache warming stopped`.';
const armResult = launch => ({ launch, reminder: REMINDER });

function chainFixture(t, timings = ON) {
  const saiRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'warm-chain-'));
  t.after(() => fs.rmSync(saiRoot, { recursive: true, force: true }));
  const clock = { time: 0 };
  const setting = { value: timings };
  const resolved = [];
  const io = { saiRoot, now: () => clock.time, wait: async ms => { clock.time += ms; }, resolve: identity => { resolved.push(identity); return setting.value; } };
  const begin = (input = { agent: 'sai-3-red-worker', harness: 'claude' }, extra = {}) =>
    warmer.beginOnce(input, { ...io, cwd: saiRoot, agentFolders: [], ...extra });
  return { saiRoot, clock, io, setting, resolved, begin };
}

const recordOf = (saiRoot, chain) => JSON.parse(fs.readFileSync(path.join(saiRoot, `warm-chain-${chain}.json`), 'utf8'));

test('continuation reminder accompanies both arm decisions and every normal warm outcome, outside persisted state', async t => {
  const { begin, io, saiRoot, setting } = chainFixture(t, { interval: 1, max: 2 });
  const started = begin();
  assert.equal(Object.hasOwn(started, 'reminder'), false, 'begin is unchanged');
  assert.deepEqual(warmer.armCheck(started.chain, io), armResult(true));
  const first = await warmer.warmOnce({ chain: started.chain }, io);
  const final = await warmer.warmOnce({ state: first.state }, io);
  setting.value = 'off';
  const offArm = await warmer.warmOnce({ chain: started.chain }, io);
  const offWake = await warmer.warmOnce({ state: first.state }, io);
  assert.deepEqual(warmer.armCheck(started.chain, io), armResult(false));
  assert.deepEqual([first.status, final.status, offArm.status, offWake.status], ['continue', 'finished', 'finished', 'finished']);
  for (const result of [first, final, offArm, offWake]) {
    assert.equal(result.reminder, REMINDER);
    assert.equal(Object.hasOwn(result.state, 'reminder'), false);
    const decoded = JSON.parse(Buffer.from(warmer.stateToken(result.state), 'base64url').toString('utf8'));
    assert.deepEqual(decoded, result.state, 'the token still encodes only the state');
    assert.ok(!JSON.stringify(recordOf(saiRoot, started.chain)).includes('reminder'));
  }
});

test('CLI arm and warm JSON transports carry the same reminder without changing the state token', t => {
  const saiRoot = require('../sai/tools/temp-root').resolveTempRoot('claude');
  const began = warmer.beginOnce({ role: 'agent', provider: 'reminder-test', harness: 'claude', session: warmer.newChainId(), interval: '0.001s', max: '0.001s' }, { saiRoot });
  const file = path.join(saiRoot, `warm-chain-${began.chain}.json`);
  const inputFile = path.join(saiRoot, `reminder-${began.chain}.json`);
  t.after(() => { for (const target of [file, inputFile]) fs.rmSync(target, { force: true }); });
  const run = args => JSON.parse(execFileSync(process.execPath, [WAIT, ...args], { encoding: 'utf8' }));
  assert.deepEqual(run(['arm', '--chain', began.chain]), armResult(true));
  const armed = run(['warm', '--chain', began.chain]);
  fs.writeFileSync(inputFile, JSON.stringify({ state: armed.state }));
  for (const result of [armed, run(['warm', '--state', armed.state_token]), run(['warm', '--input-file', inputFile])]) {
    assert.equal(result.status, 'finished');
    assert.equal(result.reminder, REMINDER);
    if (result.state_token) assert.deepEqual(JSON.parse(Buffer.from(result.state_token, 'base64url').toString('utf8')), result.state);
    assert.equal(Object.hasOwn(result.state, 'reminder'), false);
  }
});

test('E1–E7 behavioral scenarios are instruction checks, not evidence of model compliance', () => {
  const policy = fs.readFileSync(path.resolve(__dirname, '../sai/policies/cache-warming.md'), 'utf8');
  const handoff = fs.readFileSync(path.resolve(__dirname, '../sai/commands/explore/steps/handoff-warming.md'), 'utf8');
  const scenarios = [
    ['E1 response and notification together', /including when a user response arrives with a warming notification/],
    ['E2 authorized work remains', /Handle that response or continue that work[\s\S]*reminder grants no permission and confirms no decision/],
    ['E3 waiting for input or running work', /preserve that wait: invent no response, repeat no already-answered question, and duplicate no running work/],
    ['E4 command completed before a later notification', /a notification never reopens them or repeats completed actions/],
    ['E5 subagent wakes and termination', /A subagent wake performs no work\.[\s\S]*repeat of the last result[\s\S]*answer every wake with the stop literal and arm nothing again/],
    ['E6 finished wait with unfinished command', /`finished` ends that wait, not necessarily the command's work/],
    ['E7 human action still required', /A wake never supplies the required action, such as `next-slice`/],
  ];
  for (const [scenario, instruction] of scenarios) assert.match(policy, instruction, scenario);
  assert.match(handoff, /notification does not supply `next-slice`/);
  assert.match(handoff, /real message other than `next-slice` re-arms nothing/);
  assert.match(handoff, /tool ends the wait at the deadline/);
});

test('warmState opens a window of max minutes and refuses unusable timings', () => {
  assert.deepEqual(warmer.warmState({ interval: 4, max: 30 }, 1000), { interval_ms: 240000, closing_ms: 1000 + 1800000 });
  for (const bad of [{}, { interval: 0, max: 5 }, { interval: 5, max: 4 }, { interval: 'x', max: 5 }]) assert.throws(() => warmer.warmState(bad, 0), /Warming/);
});

test('E1 begin returns off with no chain and no record when the setting is off', t => {
  const { begin, saiRoot } = chainFixture(t, 'off');
  assert.deepEqual(begin(), { chain: null, warming: 'off' });
  assert.deepEqual(fs.readdirSync(saiRoot), []);
});

test('begin resolves a subagent from its agent file, a model on Claude Code and provider/model on opencode', t => {
  const { begin, resolved, saiRoot } = chainFixture(t);
  const folder = path.join(saiRoot, 'agents');
  fs.mkdirSync(folder);
  fs.writeFileSync(path.join(folder, 'sai-3-red-worker.md'), '---\nname: sai-3-red-worker\nmodel: "claude-haiku-5"\neffort: low\n---\nBody\nmodel: ignored\n');
  fs.writeFileSync(path.join(folder, 'budget-explorer.md'), '---\nmodel: deepseek/deepseek-v4\nvariant: high\n---\n');
  const first = begin(undefined, { agentFolders: [folder] });
  assert.match(first.chain, /^[0-9a-f]{16}$/);
  assert.deepEqual(first.warming, ON);
  assert.deepEqual(resolved.at(-1), { provider: 'anthropic', model: 'claude-haiku-5', role: 'subagent', harness: 'claude', cwd: saiRoot });
  begin({ agent: 'budget-explorer', harness: 'opencode' }, { agentFolders: [folder] });
  assert.deepEqual(resolved.at(-1), { provider: 'deepseek', model: 'deepseek-v4', role: 'subagent', harness: 'opencode', cwd: saiRoot });
  begin({ agent: 'unlisted', harness: 'claude' }, { agentFolders: [folder] });
  assert.deepEqual(resolved.at(-1), { provider: 'anthropic', role: 'subagent', harness: 'claude', cwd: saiRoot }, 'a Claude Code agent without a file resolves by provider');
  assert.throws(() => begin({ agent: 'unlisted', harness: 'opencode' }, { agentFolders: [folder] }), /<provider>\/<model>/);
  assert.throws(() => begin({ agent: '../escape', harness: 'claude' }), warmer.UsageError);
  assert.equal(warmer.frontmatterModel('---\nmodel: sonnet\n---\n'), 'sonnet');
  assert.equal(warmer.frontmatterModel('no frontmatter\nmodel: x'), undefined);
  assert.notEqual(begin().chain, begin().chain, 'each subagent begin opens its own chain');
});

test('each begin writes the chain record with the identity that arms and wakes resolve from', t => {
  const { begin, saiRoot } = chainFixture(t);
  const { chain } = begin();
  assert.deepEqual(recordOf(saiRoot, chain).identity, { provider: 'anthropic', role: 'subagent', harness: 'claude', cwd: saiRoot });
  assert.equal(recordOf(saiRoot, chain).generation, 0);
});

test('E2 a missing Linux harness root fails begin in the foreground, naming the path, without creating it', t => {
  const { io } = chainFixture(t);
  const tempRoot = require('../sai/tools/temp-root');
  const missing = '/tmp/sai-warm-test-missing-root';
  assert.equal(fs.existsSync(missing), false);
  const resolveRoot = () => tempRoot.resolveTempRoot('claude', { platform: 'linux', uid: 424242, io: { ...fs, lstatSync: target => (target === '/tmp/claude-424242' ? (() => { const error = new Error('missing'); error.code = 'ENOENT'; throw error; })() : fs.lstatSync(target)) } });
  assert.throws(resolveRoot, /\/tmp\/claude-424242 is missing/);
  const rest = { ...io };
  delete rest.saiRoot;
  assert.throws(() => warmer.beginOnce({ agent: 'x', harness: 'claude' }, { ...rest, cwd: os.tmpdir(), agentFolders: [], get saiRoot() { return resolveRoot(); } }), /\/tmp\/claude-424242 is missing/);
});

test('begin for the main session keys the chain on the harness session id, so a later invocation continues it', t => {
  const { begin, saiRoot, resolved } = chainFixture(t);
  const main = { role: 'agent', provider: 'anthropic', model: 'claude-opus-5-5', harness: 'claude' };
  const first = begin({ ...main, session: 'session-1' });
  assert.equal(first.chain, warmer.sessionChainId('claude', 'session-1'));
  assert.deepEqual(resolved.at(-1), { provider: 'anthropic', model: 'claude-opus-5-5', role: 'agent', harness: 'claude', cwd: saiRoot });
  assert.equal(begin({ ...main, session: 'session-1' }).chain, first.chain);
  assert.notEqual(begin({ ...main, session: 'session-2' }).chain, first.chain);
  assert.notEqual(warmer.sessionChainId('opencode', 'session-1'), first.chain, 'the harness is part of the key');
  assert.throws(() => begin({ role: 'agent', harness: 'claude' }), warmer.UsageError, 'the main session names its provider');
  assert.throws(() => begin({ agent: 'x', provider: 'anthropic', harness: 'claude' }), warmer.UsageError);
  assert.throws(() => begin({ agent: 'x', harness: 'bogus' }), warmer.UsageError);
});

test('begin for the main session may carry timings the user chose, which replace the setting', t => {
  const { begin, setting, io, saiRoot } = chainFixture(t, 'off');
  const main = { role: 'agent', provider: 'anthropic', harness: 'claude', session: 's' };
  const kept = warmer.beginOnce({ ...main, interval: 30, max: 240 }, { ...io, cwd: saiRoot, resolve: undefined, agentFolders: [] });
  assert.deepEqual(kept.warming, { interval: 30, max: 240 });
  assert.deepEqual(recordOf(saiRoot, kept.chain).identity.fixed, { interval: 30, max: 240 });
  for (const bad of [{ interval: 30 }, { max: 30 }, { interval: 40, max: 30 }, { interval: 0, max: 30 }]) {
    assert.throws(() => begin({ ...main, ...bad }), warmer.UsageError, JSON.stringify(bad));
  }
  assert.equal(setting.value, 'off');
});

test('E2 begin accepts every interval and duration form the hand-off picker offers, unitless values in minutes, and rejects 1h30', t => {
  const { setting, io, saiRoot } = chainFixture(t, 'off');
  const main = { role: 'agent', provider: 'anthropic', harness: 'claude', session: 'forms' };
  const timingsOf = (interval, max) => warmer.beginOnce({ ...main, interval, max }, { ...io, cwd: saiRoot, resolve: undefined, agentFolders: [] }).warming;
  assert.deepEqual(timingsOf('30 min', '4h'), { interval: 30, max: 240 });
  assert.deepEqual(timingsOf('4 min', '2h'), { interval: 4, max: 120 });
  assert.deepEqual(timingsOf('4 min', '1h'), { interval: 4, max: 60 });
  assert.deepEqual(timingsOf('20', '20 min'), { interval: 20, max: 20 });
  assert.deepEqual(timingsOf('20 min', '4h'), { interval: 20, max: 240 });
  for (const [interval, max] of [['1h30', '4h'], ['30 min', '1h30'], ['No', '4h'], ['0', '4h'], ['5h', '4h']]) {
    assert.throws(() => timingsOf(interval, max), warmer.UsageError, `${interval} / ${max}`);
  }
  const argv = warmer.beginInputFromArgv(['--role', 'agent', '--provider', 'anthropic', '--interval', '30 min', '--max', '4h', '--fixed-deadline', '--harness', 'claude']);
  assert.deepEqual([argv.interval, argv.max], ['30 min', '4h']);
  assert.equal(setting.value, 'off');
});

test('E3 a main-session begin without a harness session id fails naming the variable and arms nothing, and a subagent begin is unchanged', t => {
  const { begin, io, saiRoot } = chainFixture(t);
  const main = { role: 'agent', provider: 'anthropic', harness: 'claude' };
  const empty = { ...io, cwd: saiRoot, agentFolders: [], env: {} };
  assert.throws(() => warmer.beginOnce(main, empty), error => error instanceof warmer.UsageError && /CLAUDE_CODE_SESSION_ID/.test(error.message));
  assert.throws(() => warmer.beginOnce({ ...main, harness: 'opencode' }, empty), error => error instanceof warmer.UsageError && /OPENCODE_SESSION_ID/.test(error.message));
  assert.throws(() => warmer.beginOnce({ ...main, interval: '30 min', max: '4h', fixedDeadline: true }, empty), warmer.UsageError, 'the hand-off begin included');
  assert.deepEqual(fs.readdirSync(saiRoot), [], 'no chain record was written');
  const fromEnv = warmer.beginOnce(main, { ...empty, env: { CLAUDE_CODE_SESSION_ID: 'from-env' } });
  assert.equal(fromEnv.chain, warmer.sessionChainId('claude', 'from-env'));
  assert.match(begin().chain, /^[0-9a-f]{16}$/, 'a subagent begin needs no session id');
});

test('E4 the two context-preserving wrappers carry no preamble on either harness, and AGENTS.md states the exemption', () => {
  const root = path.resolve(__dirname, '..');
  const clean = 'This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.';
  for (const harness of ['claude', 'opencode']) {
    for (const file of ['sai-cache-warmer.md', 'sai-context-cache-ttl-benchmark.md']) {
      assert.ok(!fs.readFileSync(path.join(root, 'commands', harness, file), 'utf8').split(/\r?\n/).includes(clean), `${harness}/${file}`);
    }
  }
  const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  assert.match(agents, /### Isolation Mode[\s\S]*\*\*Exemption\.\*\* `sai-cache-warmer` and `sai-context-cache-ttl-benchmark` keep their wrappers without the preamble on both harnesses/);
});

test('I3 begin with a fixed deadline stores it in the record, needs the user\'s timings, and a plain begin drops it', t => {
  const { begin, saiRoot, clock } = chainFixture(t, 'off');
  const main = { role: 'agent', provider: 'anthropic', harness: 'claude', session: 'chat' };
  const timings = { interval: 30, max: 240 };
  const io = { ...chainFixture(t, 'off').io, saiRoot };
  const fixed = warmer.beginOnce({ ...main, ...timings, fixedDeadline: true }, { ...io, now: () => clock.time, cwd: saiRoot, resolve: undefined, agentFolders: [] });
  assert.deepEqual(fixed.warming, timings);
  assert.equal(recordOf(saiRoot, fixed.chain).deadline_ms, clock.time + 240 * 60000);
  assert.throws(() => begin({ ...main, fixedDeadline: true }), warmer.UsageError, 'a fixed deadline needs the user\'s interval and max');
  assert.throws(() => begin({ agent: 'x', harness: 'claude', fixedDeadline: true }), warmer.UsageError, 'a subagent has no fixed deadline');
  clock.time += 60000;
  const plain = warmer.beginOnce({ ...main, ...timings }, { ...io, now: () => clock.time, cwd: saiRoot, resolve: undefined, agentFolders: [] });
  assert.equal(plain.chain, fixed.chain);
  assert.equal(recordOf(saiRoot, plain.chain).deadline_ms, undefined, 'a begin without the switch rewrites the record with no deadline');
  assert.deepEqual(warmer.beginInputFromArgv(['--role', 'agent', '--provider', 'anthropic', '--interval', '30', '--max', '240', '--fixed-deadline', '--harness', 'claude']),
    { role: 'agent', provider: 'anthropic', interval: '30', max: '240', fixedDeadline: true, harness: 'claude' });
  assert.throws(() => warmer.beginInputFromArgv(['--fixed-deadline', 'yes']), warmer.UsageError);
  assert.throws(() => warmer.inputFromArgv(['--chain', 'abc', '--fixed-deadline']), warmer.UsageError, 'warm takes no fixed-deadline switch');
});

test('E9 a fixed deadline holds: a later arm supersedes the earlier wait without moving the end, and the wait finishes at the deadline', async t => {
  const { io, saiRoot } = chainFixture(t, 'off');
  const main = { role: 'agent', provider: 'anthropic', harness: 'claude', session: 'away', interval: 4, max: 10, fixedDeadline: true };
  const { chain } = warmer.beginOnce(main, { ...io, cwd: saiRoot, resolve: undefined, agentFolders: [] });
  const wired = { ...io, resolve: undefined };
  const first = await warmer.warmOnce({ chain }, wired);
  assert.deepEqual([first.status, first.waited_ms, first.state.closing_ms], ['continue', 240000, 600000]);
  const again = await warmer.warmOnce({ chain }, wired);
  assert.equal(again.state.closing_ms, 600000, 'an arm after a real message does not move the deadline');
  assert.equal(again.state.generation, 2);
  const stale = await warmer.warmOnce({ state: first.state }, wired);
  assert.deepEqual([stale.status, stale.waited_ms], ['finished', 0], 'the earlier wait is superseded');
  const last = await warmer.warmOnce({ state: again.state }, wired);
  assert.deepEqual([last.status, last.waited_ms], ['finished', 120000], 'the last wait is shortened to the deadline');
  const late = await warmer.warmOnce({ chain }, wired);
  assert.deepEqual([late.status, late.waited_ms], ['finished', 0], 'an arm after the deadline arms nothing');
  assert.equal(recordOf(saiRoot, chain).generation, 2, 'the arm after the deadline opens no new generation');
});

test('warm opens a window of max minutes, and the returned state re-arms it with the same window', async t => {
  const { io, clock, begin, saiRoot } = chainFixture(t, { interval: 4, max: 10 });
  const { chain } = begin();
  const first = await warmer.warmOnce({ chain }, io);
  assert.deepEqual({ ...first.state, token: undefined }, { interval_ms: 240000, closing_ms: 600000, chain, generation: 1, armed_ms: 0, max_ms: 600000, token: undefined });
  assert.deepEqual([first.status, first.waited_ms], ['continue', 240000]);
  assert.match(first.state.token, /^[0-9a-f]{16}$/, 'the arm takes an owner token');
  assert.equal(recordOf(saiRoot, chain).owner, null, 'the wait clears its lease as it ends');
  const second = await warmer.warmOnce({ state: first.state }, io);
  assert.equal(second.status, 'continue');
  assert.deepEqual(second.state, first.state, 'a wake re-arms the state unchanged');
  const last = await warmer.warmOnce({ state: first.state }, io);
  assert.deepEqual([last.status, last.waited_ms], ['finished', 120000]);
  const later = await warmer.warmOnce({ chain }, io);
  assert.equal(later.status, 'continue', 'a real message after the window closed arms the same chain again');
  assert.equal(later.state.generation, 2);
  assert.equal(later.state.closing_ms, clock.time + 600000 - 240000, 'the new arm opens a new window');
  const old = await warmer.warmOnce({ state: first.state }, io);
  assert.deepEqual([old.status, old.waited_ms], ['finished', 0], 'a wait of the closed window is superseded by the new arm');
});

test('E3 warm without a chain and without a state is a usage error, in the argv and the JSON forms', async t => {
  const { io } = chainFixture(t);
  await assert.rejects(warmer.warmOnce({}, io), warmer.UsageError);
  await assert.rejects(warmer.warmOnce({ interval: 4, max: 30 }, io), warmer.UsageError);
  await assert.rejects(warmer.warmOnce({ chain: '0123456789abcdef' }, io), /run begin first/);
  assert.throws(() => warmer.inputFromArgv([]), warmer.UsageError);
  for (const bad of [['--interval', '4', '--max', '60', '--chain', 'abc'], ['--interval', '4'], ['--max'], ['--bogus', '1'], ['--chain', 'a', '--state', 'b']]) {
    assert.throws(() => warmer.inputFromArgv(bad), warmer.UsageError, bad.join(' '));
  }
  assert.equal(spawnSync(process.execPath, [WAIT, 'warm', '--interval', '4', '--max', '30'], { encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync(process.execPath, [WAIT, 'warm', '--interval', '4', '--max', '30', '--chain', '0123456789abcdef'], { encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync(process.execPath, [WAIT, 'warm'], { input: '', encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync(process.execPath, [WAIT, 'warm'], { input: JSON.stringify({ interval: 5, max: 1 }), encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync(process.execPath, [WAIT, 'warm'], { input: JSON.stringify({}), encoding: 'utf8' }).status, 2);
});

test('E4 timings are resolved again at every arm and wake: a new interval applies from that wait, off finishes the chain', async t => {
  const { io, setting, begin, saiRoot } = chainFixture(t, { interval: 4, max: 30 });
  const { chain } = begin();
  const armed = await warmer.warmOnce({ chain }, io);
  assert.equal(armed.waited_ms, 240000);
  setting.value = { interval: 2, max: 30 };
  const woken = await warmer.warmOnce({ state: armed.state }, io);
  assert.equal(woken.waited_ms, 120000);
  assert.equal(woken.state.interval_ms, 120000);
  assert.equal(woken.state.closing_ms, armed.state.closing_ms, 'the window stays where it was set');
  setting.value = 'off';
  const off = await warmer.warmOnce({ state: woken.state }, io);
  assert.deepEqual([off.status, off.waited_ms], ['finished', 0]);
  assert.equal(recordOf(saiRoot, chain).generation, 1, 'a chain whose setting turned off keeps its record');
  setting.value = { interval: 4, max: 30 };
  assert.equal((await warmer.warmOnce({ chain }, io)).state.generation, 2, 'it arms again when the setting is back on');
  setting.value = { interval: 4, max: 30 };
  const { chain: second } = begin();
  setting.value = 'off';
  const none = await warmer.warmOnce({ chain: second }, io);
  assert.deepEqual([none.status, none.waited_ms], ['finished', 0], 'an arm with the setting off waits for nothing');
});

test('E5 a real message supersedes the earlier wait of its chain, and only the newest generation stays live', async t => {
  const { io, clock, begin } = chainFixture(t);
  const { chain } = begin();
  const early = await warmer.warmOnce({ chain }, io);
  assert.equal(early.state.generation, 1);
  clock.time = 60000;
  const newest = await warmer.warmOnce({ chain }, io);
  assert.equal(newest.state.generation, 2);
  assert.equal(newest.status, 'continue');
  const woken = await warmer.warmOnce({ state: early.state }, io);
  assert.deepEqual([woken.status, woken.waited_ms], ['finished', 0]);
  assert.equal((await warmer.warmOnce({ state: newest.state }, io)).status, 'continue');
});

test('E4 a wait superseded while it sleeps finishes within one chunk', async t => {
  const { io, saiRoot, begin, clock } = chainFixture(t);
  const { chain } = begin();
  const rearm = () => warmer.warmOnce({ chain }, { ...io, wait: async ms => { clock.time += ms; } });
  const result = await warmer.warmOnce({ chain }, { ...io, wait: async () => { await rearm(); } });
  assert.equal(result.status, 'finished');
  assert.equal(result.waited_ms, warmer.TICK_MS, 'it retires after one chunk, not after its whole interval');
  assert.equal(recordOf(saiRoot, chain).generation, 2);
});

test('each agent owns its own chain: one agent\'s arm never supersedes another agent\'s wait', async t => {
  const { io, begin } = chainFixture(t);
  const a = await warmer.warmOnce({ chain: begin().chain }, io);
  const b = await warmer.warmOnce({ chain: begin().chain }, io);
  assert.notEqual(a.state.chain, b.state.chain);
  assert.equal((await warmer.warmOnce({ state: a.state }, io)).status, 'continue');
  assert.equal((await warmer.warmOnce({ state: b.state }, io)).status, 'continue');
});

/** A chain record holding the lease a live wait would hold, so the arm check can be tested without an in-flight wait. */
function leasedChain(t, lease = {}, timings = ON) {
  const fixture = chainFixture(t, timings);
  const { chain } = fixture.begin();
  const file = path.join(fixture.saiRoot, `warm-chain-${chain}.json`);
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, JSON.stringify({
    ...record, generation: 1, interval_ms: 240000, max_ms: 1800000, closing_ms: 600000,
    owner: { token: 'a'.repeat(16), renewed_ms: 0, armed_ms: 0, ...lease },
  }));
  return { ...fixture, chain, file };
}

test('E2 the arm check launches a wait when the chain has no live one, and after a wait ended', async t => {
  const { begin, io, saiRoot } = chainFixture(t);
  const { chain } = begin();
  assert.deepEqual(warmer.armCheck(chain, io), armResult(true));
  const armed = await warmer.warmOnce({ chain }, io);
  assert.equal(armed.status, 'continue');
  assert.equal(recordOf(saiRoot, chain).owner, null, 'the ended wait cleared its lease');
  assert.deepEqual(warmer.armCheck(chain, io), armResult(true), 'a wait that already ended is not reused');
  assert.throws(() => warmer.armCheck('0123456789abcdef', io), /run begin first/);
  assert.throws(() => warmer.armCheck('../escape', io), /chain must be the id/);
});

test('E1 a live wait with the same timings is reused: the check extends its window and launches nothing', t => {
  const { chain, io, clock, saiRoot, file } = leasedChain(t);
  clock.time = 5000;
  assert.deepEqual(warmer.armCheck(chain, io), armResult(false));
  const record = recordOf(saiRoot, chain);
  assert.equal(record.closing_ms, 5000 + 1800000, 'the window is extended to now plus max');
  assert.equal(record.owner.token, 'a'.repeat(16), 'reuse keeps the live owner');
  assert.equal(fs.existsSync(`${file}.lock`), false, 'no lock outlives the check');
});

test('E1 a reused wait picks up the window the check extended instead of finishing at the old one', async t => {
  const { io, clock, begin } = chainFixture(t, { interval: 4, max: 4 });
  const { chain } = begin();
  let calls = 0;
  const wait = async ms => {
    clock.time += ms;
    calls += 1;
    if (calls === 2) assert.deepEqual(warmer.armCheck(chain, io), armResult(false), 'the check reuses the live wait');
  };
  const result = await warmer.warmOnce({ chain }, { ...io, wait });
  assert.deepEqual([result.status, result.waited_ms], ['continue', 240000], 'the extended window keeps it alive');
  assert.equal(result.state.closing_ms, 246000, 'the wait re-reads the window the check wrote');
});

test('E2 E5 a lease that stopped renewing counts as dead, so the check launches a new wait', t => {
  const { chain, io, clock } = leasedChain(t);
  clock.time = warmer.LEASE_STALE_MS;
  assert.deepEqual(warmer.armCheck(chain, io), armResult(false), 'the staleness bound is still live');
  clock.time = warmer.LEASE_STALE_MS + 1;
  assert.deepEqual(warmer.armCheck(chain, io), armResult(true));
});

test('E3 a changed interval or max makes the live wait invalid, so the check launches a new one', t => {
  for (const timings of [{ interval: 2, max: 30 }, { interval: 4, max: 20 }]) {
    const { chain, io, clock } = leasedChain(t, {}, timings);
    clock.time = 5000;
    assert.deepEqual(warmer.armCheck(chain, io), armResult(true), JSON.stringify(timings));
  }
});

test('E8 the arm check launches nothing when the warming setting is off', t => {
  const { chain, io, clock, setting } = leasedChain(t);
  setting.value = 'off';
  clock.time = 5000;
  assert.deepEqual(warmer.armCheck(chain, io), armResult(false));
});

test('E9 a cutoff mark newer than the live wait makes the check launch a new wait', t => {
  const { chain, io, clock, saiRoot } = leasedChain(t);
  clock.time = 5000;
  fs.writeFileSync(path.join(saiRoot, warmer.CUTOFF_FILE), JSON.stringify({ cutoff_ms: 6000 }));
  assert.deepEqual(warmer.armCheck(chain, io), armResult(true));
});

test('E7 the arm check reuses a live fixed-deadline wait, never moves the deadline, and launches nothing after it', async t => {
  const { io, clock, saiRoot } = chainFixture(t, 'off');
  const main = { role: 'agent', provider: 'anthropic', harness: 'claude', session: 'check-deadline', interval: 4, max: 10, fixedDeadline: true };
  const began = warmer.beginOnce(main, { ...io, cwd: saiRoot, resolve: undefined, agentFolders: [] });
  const check = { ...io, resolve: undefined };
  assert.deepEqual(warmer.armCheck(began.chain, check), armResult(true));
  assert.equal((await warmer.warmOnce({ chain: began.chain }, check)).status, 'continue');
  const file = path.join(saiRoot, `warm-chain-${began.chain}.json`);
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, JSON.stringify({
    ...record, interval_ms: 240000, max_ms: 600000, closing_ms: 600000,
    owner: { token: 'b'.repeat(16), renewed_ms: 240000, armed_ms: 0 },
  }));
  clock.time = 245000;
  assert.deepEqual(warmer.armCheck(began.chain, check), armResult(false));
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).closing_ms, 600000, 'the check never moves the deadline');
  clock.time = 600000;
  assert.deepEqual(warmer.armCheck(began.chain, check), armResult(false), 'after the deadline nothing is launched');
  assert.deepEqual(await warmer.warmOnce({ chain: began.chain }, check), { status: 'finished', waited_ms: 0, state: { chain: began.chain }, reminder: REMINDER });
});

test('I1 a new owner starts its interval only after the previous lease was released or went stale', async t => {
  const { chain, io, clock, saiRoot } = leasedChain(t);
  const result = await warmer.warmOnce({ chain }, io);
  assert.deepEqual([result.status, result.waited_ms], ['continue', 240000]);
  assert.equal(clock.time, warmer.LEASE_STALE_MS + 240000, 'the stale lease is waited out before the interval');
  assert.equal(recordOf(saiRoot, chain).generation, 2);
});

test('E5 two concurrent arms leave exactly one owner, and the other wait finishes', async t => {
  const { chain, io, begin, saiRoot } = chainFixture(t);
  const started = begin();
  const results = await Promise.all([warmer.warmOnce({ chain: started.chain }, io), warmer.warmOnce({ chain: started.chain }, io)]);
  assert.deepEqual(results.map(result => result.status).sort(), ['continue', 'finished']);
  const [loser, winner] = results;
  assert.deepEqual([loser.state.generation, winner.state.generation], [1, 2], 'both acquisitions counted, and the later one owns the chain');
  assert.notEqual(loser.state.token, winner.state.token);
  assert.equal(recordOf(saiRoot, started.chain).generation, 2);
  assert.equal(recordOf(saiRoot, started.chain).owner, null, 'the winner cleared its lease when its interval ended');
});

test('M1 an ordinary repeated begin keeps the live wait, and a fixed-deadline begin replaces it', t => {
  const { io, clock, saiRoot } = chainFixture(t, 'off');
  const main = { role: 'agent', provider: 'anthropic', harness: 'claude', session: 'rebegin', interval: 4, max: 10 };
  const began = warmer.beginOnce(main, { ...io, cwd: saiRoot, resolve: undefined, agentFolders: [] });
  const check = { ...io, resolve: undefined };
  const file = path.join(saiRoot, `warm-chain-${began.chain}.json`);
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, JSON.stringify({
    ...record, generation: 1, interval_ms: 240000, max_ms: 600000, closing_ms: 600000,
    owner: { token: 'c'.repeat(16), renewed_ms: 0, armed_ms: 0 },
  }));
  clock.time = 5000;
  assert.equal(warmer.beginOnce(main, { ...io, cwd: saiRoot, resolve: undefined, agentFolders: [] }).chain, began.chain);
  assert.equal(recordOf(saiRoot, began.chain).owner.token, 'c'.repeat(16), 'an ordinary begin keeps the live lease');
  assert.deepEqual(warmer.armCheck(began.chain, check), armResult(false), 'the next invocation reuses the live wait');
  assert.equal(recordOf(saiRoot, began.chain).closing_ms, 5000 + 600000, 'and extends its window');
  const fixed = warmer.beginOnce({ ...main, interval: 4, max: 10, fixedDeadline: true }, { ...io, cwd: saiRoot, resolve: undefined, agentFolders: [] });
  assert.equal(fixed.chain, began.chain);
  assert.equal(recordOf(saiRoot, fixed.chain).owner, undefined, 'a fixed-deadline begin clears the lease');
  assert.deepEqual(warmer.armCheck(fixed.chain, check), armResult(true), 'the hand-off wait gets its own background task');
});

test('I3 a stale chain lock is removed, and a check reads the record under the lock', t => {
  const { chain, io, clock, file } = leasedChain(t);
  fs.writeFileSync(`${file}.lock`, '');
  const old = new Date(Date.now() - 60000);
  fs.utimesSync(`${file}.lock`, old, old);
  clock.time = 5000;
  assert.deepEqual(warmer.armCheck(chain, io), armResult(false));
  assert.equal(fs.existsSync(`${file}.lock`), false);
});

test('E4 one wait per chain stays alive: the check reuses the live wait and a replacement retires it', async t => {
  const { begin, io, clock, saiRoot } = chainFixture(t, { interval: 1, max: 3 });
  const { chain } = begin();
  const read = () => recordOf(saiRoot, chain);
  // Hold overlapping waits at explicit barriers; advance the injected clock instead of sleeping or polling.
  const firstWaiting = Promise.withResolvers();
  const firstTick = Promise.withResolvers();
  const replacementWaiting = Promise.withResolvers();
  const replacementTick = Promise.withResolvers();
  let firstSettled = false;
  let replacementSettled = false;
  const first = warmer.warmOnce({ chain }, { ...io, wait: async ms => {
    firstWaiting.resolve(ms);
    await firstTick.promise;
    clock.time += ms;
  } }).then(result => { firstSettled = true; return result; });
  assert.equal(await firstWaiting.promise, warmer.TICK_MS);
  const firstOwner = read().owner.token;
  const closing = read().closing_ms;
  clock.time += 1000;
  assert.deepEqual(warmer.armCheck(chain, io), armResult(false));
  assert.equal(read().closing_ms, closing + 1000, 'the check extended the live window');
  assert.equal(read().owner.token, firstOwner, 'reuse keeps the same owner');
  assert.equal(read().generation, 1, 'reuse starts no replacement');
  assert.equal(firstSettled, false, 'the reused wait is still pending');

  const replacement = warmer.warmOnce({ chain }, { ...io, wait: async ms => {
    replacementWaiting.resolve(ms);
    await replacementTick.promise;
    clock.time += ms;
  } }).then(result => { replacementSettled = true; return result; });
  assert.equal(await replacementWaiting.promise, warmer.TICK_MS);
  const owner = read().owner.token;
  assert.notEqual(owner, firstOwner);
  assert.equal(read().generation, 2, 'the replacement acquired the chain');
  assert.equal(firstSettled, false, 'the previous wait has not observed replacement yet');

  firstTick.resolve();
  const retired = await first;
  assert.equal(retired.status, 'finished', 'the replaced wait retires with finished');
  assert.equal(retired.waited_ms, warmer.TICK_MS, 'retirement takes one simulated tick');
  assert.equal(read().owner.token, owner, 'retirement does not clear the replacement lease');
  assert.equal(replacementSettled, false, 'only the replacement wait remains pending');
  replacementTick.resolve();
  const continued = await replacement;
  assert.equal(continued.status, 'continue', 'the replacement completes its own interval');
  assert.equal(continued.waited_ms, 60000, 'the interval advances without a real-time wait');
  assert.equal(continued.state.token, owner);
  assert.equal(read().owner, null, 'the completed replacement releases its lease');
});

test('E11 a cutoff mark newer than the arm ends the chain at its next wake, and later arms stay live', async t => {
  const { io, saiRoot, clock, begin } = chainFixture(t);
  const { chain } = begin();
  const before = await warmer.warmOnce({ chain }, io);
  fs.writeFileSync(path.join(saiRoot, warmer.CUTOFF_FILE), JSON.stringify({ cutoff_ms: clock.time + 1 }));
  assert.equal((await warmer.warmOnce({ state: before.state }, io)).status, 'finished');
  clock.time += 10;
  const after = await warmer.warmOnce({ chain }, io);
  assert.equal(after.status, 'continue', 'a chain armed after the mark stays live even when it reuses the chain id');
  assert.equal((await warmer.warmOnce({ state: after.state }, io)).status, 'continue');
});

test('I4 and E10 every arm and wake refreshes the record, so the age prune never reaches a live chain', async t => {
  const { io, saiRoot, begin, clock } = chainFixture(t, { interval: 1, max: 10 });
  clock.time = Date.now();
  const { chain } = begin();
  const record = path.join(saiRoot, `warm-chain-${chain}.json`);
  const old = new Date(Date.now() - 2 * 86400000);
  const age = () => fs.utimesSync(record, old, old);
  age();
  const armed = await warmer.warmOnce({ chain }, io);
  assert.ok(fs.statSync(record).mtimeMs > Date.now() - 60000, 'an arm refreshes the modification time');
  age();
  await warmer.warmOnce({ state: armed.state }, io);
  assert.ok(fs.statSync(record).mtimeMs > Date.now() - 60000, 'a wake refreshes the modification time');
  age();
  const other = begin();
  assert.equal(fs.existsSync(record), false, 'a record that no arm or wake touched is pruned by a later begin');
  assert.equal((await warmer.warmOnce({ chain: other.chain }, io)).status, 'continue');
});

test('the chain record is pruned when stale, kept when its window closes, and refuses a path-like id', async t => {
  const { io, saiRoot, clock, begin } = chainFixture(t, { interval: 1, max: 3 });
  const stale = path.join(saiRoot, 'warm-chain-0000000000000000.json');
  fs.writeFileSync(stale, '{"generation":1}');
  const old = new Date(Date.now() - 2 * 86400000);
  fs.utimesSync(stale, old, old);
  clock.time = Date.now();
  const { chain } = begin();
  assert.equal(fs.existsSync(stale), false);
  const record = path.join(saiRoot, `warm-chain-${chain}.json`);
  assert.equal(fs.existsSync(record), true);
  const fresh = await warmer.warmOnce({ chain }, io);
  assert.equal((await warmer.warmOnce({ state: fresh.state }, io)).status, 'continue');
  assert.equal((await warmer.warmOnce({ state: fresh.state }, io)).status, 'finished');
  assert.equal(fs.existsSync(record), true, 'the age prune, not the window, removes a record');
  await assert.rejects(warmer.warmOnce({ chain: '../escape' }, io), /chain must be the id/);
});

test('E17 a main-session chain keeps its record when its window closes, so generations keep counting', async t => {
  const { io, begin, saiRoot } = chainFixture(t, { interval: 1, max: 1 });
  const main = { role: 'agent', provider: 'anthropic', harness: 'claude', session: 'chat' };
  const { chain } = begin(main);
  const first = await warmer.warmOnce({ chain }, io);
  assert.equal((await warmer.warmOnce({ state: first.state }, io)).status, 'finished');
  assert.equal(recordOf(saiRoot, chain).generation, 1);
  assert.equal(begin(main).chain, chain);
  assert.equal((await warmer.warmOnce({ chain }, io)).state.generation, 2);
});

test('M1 a subagent chain whose window closed arms again at its next real message with the same chain', async t => {
  const { io, begin, clock, saiRoot } = chainFixture(t, { interval: 1, max: 2 });
  const { chain } = begin();
  const armed = await warmer.warmOnce({ chain }, io);
  assert.equal((await warmer.warmOnce({ state: armed.state }, io)).status, 'finished');
  assert.equal(fs.existsSync(path.join(saiRoot, `warm-chain-${chain}.json`)), true, 'the record outlives the window');
  clock.time += 3600000;
  const again = await warmer.warmOnce({ chain }, io);
  assert.equal(again.status, 'continue');
  assert.equal(again.state.generation, 2);
  assert.equal((await warmer.warmOnce({ state: again.state }, io)).status, 'finished');
  const third = await warmer.warmOnce({ chain }, io);
  assert.equal(third.state.generation, 3, 'every real message re-arms with the same chain');
});

test('E6 an agent nobody disposes stops arming once max minutes passed since its last real message', async t => {
  const { io, begin } = chainFixture(t, { interval: 4, max: 10 });
  const { chain } = begin();
  let state = (await warmer.warmOnce({ chain }, io)).state;
  const statuses = [];
  for (let wake = 0; wake < 5; wake += 1) {
    const result = await warmer.warmOnce({ state }, io);
    statuses.push(result.status);
    if (result.status === 'finished') break;
    state = result.state;
  }
  assert.deepEqual(statuses, ['continue', 'finished']);
});

test('E12 a state or call from an earlier installed version is refused, leaving the task unchanged', async t => {
  const { io } = chainFixture(t);
  await assert.rejects(warmer.warmOnce({ state: { interval_ms: 60000, closing_ms: 0 } }, io), warmer.UsageError);
  assert.equal(spawnSync(process.execPath, [WAIT, 'chain'], { input: '', encoding: 'utf8' }).status, 1, 'the retired chain subcommand is no longer known');
});

test('the CLI prints begin output, warm output, and the state token without JSON input', t => {
  const script = [WAIT];
  const off = spawnSync(process.execPath, [...script, 'begin', '--agent', 'budget-explorer', '--harness', 'claude'], { encoding: 'utf8', cwd: os.tmpdir() });
  assert.equal(off.status, 0);
  assert.deepEqual(JSON.parse(off.stdout), { chain: null, warming: 'off' });
  assert.equal(spawnSync(process.execPath, [...script, 'begin', '--harness', 'claude'], { encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync(process.execPath, [...script, 'begin', '--agent', 'budget-explorer', '--harness', 'bogus'], { encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync(process.execPath, [...script, 'warm', '--chain', '0123456789abcdef'], { encoding: 'utf8' }).status, 2, 'a chain without a record is refused');
});

test('the warm argv form arms and re-arms without JSON, a file, or stdin', () => {
  const { inputFromArgv, stateToken } = warmer;
  assert.deepEqual(inputFromArgv(['--chain', 'abc']), { chain: 'abc' });
  const state = { interval_ms: 1000, closing_ms: 9000, chain: 'abc', generation: 1, armed_ms: 5 };
  const token = stateToken(state);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(inputFromArgv(['--state', token]), { state });
  assert.throws(() => inputFromArgv(['--state', '!!']), warmer.UsageError);
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


test('the policy keeps the reduced rule set: switch, begin, arm after every response, wake, dispose, diagnostic', () => {
  const policy = fs.readFileSync(path.resolve(__dirname, '../sai/policies/cache-warming.md'), 'utf8');
  assert.match(policy, /`Warming: on, agent \{agent\}\. Fetch @sai\/policies\/cache-warming\.md and follow it as a subagent\.`/);
  assert.match(policy, /`budget-executor` never does: it never arms/);
  assert.match(policy, /ready-only dispatch[\s\S]{0,120}no switch/);
  assert.match(policy, /A dispatcher that cannot dispose[\s\S]{0,160}never arm/);
  assert.match(policy, /begin --agent <agent> --harness <claude\|opencode>/);
  assert.match(policy, /begin --role agent --provider <provider> \[--model <model>\] --harness <claude\|opencode>/);
  assert.match(policy, /Arm after every response: a result, a question, and a step report all keep the wait armed until the agent is disposed/);
  assert.match(policy, /arm --chain <chain>/, 'the foreground arm check is stated');
  assert.match(policy, /when `launch` is `true`, launch one wait in the background/, 'the check decides, not the model');
  assert.match(policy, /When `launch` is `false`, launch nothing/);
  assert.match(policy, /warm --chain <chain>/);
  assert.match(policy, /warm --state <state_token>/);
  assert.match(policy, /Wake acknowledgement\.\*\* A subagent message that is the wake literal, the stop literal, or the legacy alias `ok`[\s\S]{0,700}not a real message/);
  assert.match(policy, /Claude Code `Bash` with `run_in_background: true`[\s\S]*opencode shell with `background: true`/);
  assert.match(policy, /`max` minutes have passed since your last real message, whether or not anyone disposed you/);
  assert.match(policy, /answer every wake with the stop literal and arm nothing again/, 'after a dispose every wake replies with the stop literal');
  assert.match(policy, /replies to a `continue` wake with that message instead of the wake literal/, 'an unconfirmed result is repeated on a wake');
  assert.match(policy, /Once the dispatcher sends the worker a real message, the worker's wakes reply with the wake literal again/);
  assert.match(policy, /A subagent wake performs no work\./, 'subagents retain their no-work wake protocol');
  assert.match(policy, /## Warming diagnostic[\s\S]*It gates no stop and no dispatch/);
  assert.match(policy, /except, on opencode, the one of each worker's last real message, which decides whether a `none` listing still needs the `dispose` message/);
  assert.match(policy, /`budget-subagent` receives it only on a continuation/);
  assert.match(policy, /A main-session `begin` without a session id exits non-zero with a message that names the variable and arms nothing/);
  assert.match(policy, /supersedes nothing: an earlier wait of its chain keeps re-arming at each wake until its window closes or the agent is disposed/);
  assert.match(policy, /## Dispose[\s\S]*`@sai\/policies\/worker-lifecycle\.md` owns the dispose points[\s\S]*No `dispose` message is sent first/);
  assert.match(policy, /The main session is never disposed[\s\S]*continues the same chain/);
  assert.match(policy, /beside that path in the message and never inside the report file/);
  assert.match(policy, /never in the `sai-state` store/);
  for (const retired of [/final response/i, /Warm-up/, /`warm-up`/, /--interval \{interval\}/, /node "<wait-path>" chain/]) assert.doesNotMatch(policy, retired);
});

test('the lifecycle policy disposes unconditionally, names the Claude Code stop and the opencode dispose-shells tool', () => {
  const lifecycle = fs.readFileSync(path.resolve(__dirname, '../sai/policies/worker-lifecycle.md'), 'utf8');
  assert.match(lifecycle, /unconditional action that ends a worker or helper[\s\S]*whatever the warming setting/);
  assert.match(lifecycle, /spends no attempt and triggers no retry/);
  assert.match(lifecycle, /TaskStop\(task_id: "<captured agent ID>"\)/);
  assert.match(lifecycle, /node <tool-path> --session <sessionID> \[--session <sessionID> \.\.\.\] --cwd <project-root>[\s\S]*`dispose-shells\.js`/);
  assert.match(lifecycle, /`removed`, `none`, `failed`, or `unavailable`|"removed" \| "none" \| "failed" \| "unavailable"/);
  assert.match(lifecycle, /- `removed`: send none\./);
  assert.match(lifecycle, /- `none`: send `dispose` only when the `warming:` line of the worker's last real message was `true`/);
  assert.match(lifecycle, /- `failed` or `unavailable`: print a one-line notice, then send `dispose` whatever the `warming:` value was/);
  assert.match(lifecycle, /a worker that never sent the line[\s\S]{0,120}receives none/);
  assert.match(lifecycle, /`removed` is a complete dispose and prints no notice/);
  assert.match(lifecycle, /No `session\.interrupt` call exists/);
  assert.doesNotMatch(lifecycle, /api\/session\/:sessionID\/interrupt/);
  assert.match(lifecycle, /answer each later wake of a wait you armed with the stop literal alone/);
});

test('E14 E16 the lifecycle policy batches the stops and closes of a point and re-issues a cancelled call alone', () => {
  const lifecycle = fs.readFileSync(path.resolve(__dirname, '../sai/policies/worker-lifecycle.md'), 'utf8');
  assert.match(lifecycle, /## Same-turn batch/);
  assert.match(lifecycle, /`transfer\.js close`, `temp-root\.js remove`/);
  assert.match(lifecycle, /`No task found` counts as a result/);
  assert.match(lifecycle, /re-issues that call alone in the next turn[\s\S]*A cancellation is not an obstacle attempt/);
  assert.match(lifecycle, /envelope `\{"status", "results"/);
  const direct = fs.readFileSync(path.resolve(__dirname, '../sai/commands/explore/direct-build-coordinator.md'), 'utf8');
  assert.match(direct, /dispose every worker and helper still alive under `worker-lifecycle\.md` in one same-turn batch/);
});

test('helper contracts and budget skills send the switch only to agents their coordinator disposes, and never to the executor', () => {
  const read = relative => fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8');
  assert.match(read('sai/policies/explore-agent.md'), /`ladder_discards`, `out_of_root_requests`, and `warming`/);
  assert.doesNotMatch(read('sai/policies/explore-agent.md'), /warm-up/);
  assert.match(read('sai/policies/explore-agent.md'), /`begin`, the foreground arm check, and the background `warm`/);
  assert.match(read('sai/policies/executor-agent.md'), /`warming: false`/);
  assert.match(read('sai/policies/budget-agent.md'), /`warming: true` or `warming: false`/);
  for (const harness of ['claude', 'opencode']) {
    const explorer = read(`skills/${harness}/budget-explorer/SKILL.md`);
    assert.match(explorer, /end with the warming switch of `@sai\/policies\/cache-warming\.md`/, `${harness} explorer sends the switch`);
    assert.match(explorer, /whatever its `warming` diagnostic/, `${harness} explorer disposes whatever the diagnostic`);
    const subagent = read(`skills/${harness}/budget-subagent/SKILL.md`);
    assert.match(subagent, /A one-shot task message carries no warming switch/, `${harness} subagent one-shot`);
    assert.match(subagent, /Fetch `@sai\/policies\/worker-lifecycle\.md`/, `${harness} subagent fetches the lifecycle policy`);
    for (const helper of [explorer, subagent]) {
      assert.match(helper, /Fetch `@sai\/policies\/worker-lifecycle\.md`/);
      assert.doesNotMatch(helper, /`warm-up`/);
    }
    assert.match(read(`skills/${harness}/budget-executor/SKILL.md`), /never arms[\s\S]*never sent the warming switch[\s\S]*still disposes it after its report/);
  }
});

test('worker bindings send the switch and dispose whatever the warming diagnostic, on both harnesses', () => {
  for (const harness of ['claude', 'opencode']) {
    const binding = fs.readFileSync(path.resolve(__dirname, `../sai/orchestration/workers/bindings/${harness}/standalone-worker-template.md`), 'utf8');
    assert.match(binding, /End every task message and continuation to it with the switch/, harness);
    assert.match(binding, /diagnostic line `warming: true\|false`/, harness);
    assert.match(binding, /disposes the worker whatever the warming setting/, harness);
    assert.match(binding, /The `warming` diagnostic gates no dispose/, harness);
    assert.doesNotMatch(binding, /disposes nothing|Resolve its\s+timings/, harness);
  }
});

test('coordinator cards end each worker message with the switch and resolve no timings', () => {
  for (const card of ['implement/coordinator', 'review/coordinator', 'plan/cycle', 'audit/coordinator', 'explore/direct-build-coordinator']) {
    const text = fs.readFileSync(path.resolve(__dirname, `../sai/commands/${card}.md`), 'utf8');
    assert.match(text, /with the warming switch the policy defines/, card);
    assert.doesNotMatch(text, /resolve (?:each|the) worker's timings|warming line the policy defines/i, card);
  }
});

test('explore hand-off warming: the step file, its two loaders, and the stops are single-sourced', () => {
  const root = path.resolve(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const step = read('sai/commands/explore/steps/handoff-warming.md');
  assert.match(step, /--role agent/);
  assert.match(step, /`30 min \(Recommended\)`, `4 min`, `No`/);
  assert.match(step, /`4h \(Recommended\)`, `2h`, `1h`/);
  assert.match(step, /A compound such as `1h30` is not accepted/);
  assert.match(step, /`30 min`, `4 min`, `4h`, `2h`, and `1h` and free text such as `20`, `20 min`/);
  assert.match(step, /1 hour with a Claude subscription and 5 minutes with pay-per-token/);
  assert.match(step, /\/sai-context-cache-ttl-benchmark/);
  assert.match(step, /§ Stop your own wait/);
  assert.match(step, /Run `begin` in the foreground as `cache-warming\.md` § Begin states for the main session[\s\S]*--interval <interval> --max <max> --fixed-deadline/);
  assert.doesNotMatch(step, /Only a wake re-arms|moves the deadline/, 'the step file describes no variant of its own');
  assert.match(step, /Run `wait\.js arm --chain <chain>` in the foreground, and launch `wait\.js warm --chain <chain>` in the background only when it prints `launch: true`/);
  assert.match(read('sai/policies/cache-warming.md'), /## Hand-off wait[\s\S]*--interval <interval> --max <max> --fixed-deadline[\s\S]*no arm or wake moves it/);
  assert.match(read('sai/policies/cache-warming.md'), /The timings stay as passed to `begin`/);
  assert.match(read('sai/policies/cache-warming.md'), /Each re-arm launches a new background task, so replace the task id[\s\S]{0,120}chain stays the same/);
  assert.match(step, /Every wake re-arm launches a new background task: replace the task id in `handoff_wait`/);
  assert.match(step, /updates the task id in `handoff_wait`/);
  assert.match(step, /task id currently held in `handoff_wait`/);
  for (const loader of ['sai/commands/explore/steps/pipeline-plan-unattended.md', 'sai/commands/explore/steps/route-selector.md']) {
    assert.match(read(loader), /Fetch `@sai\/commands\/explore\/steps\/handoff-warming\.md`/, loader);
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


test('I1 close writes closed_ms once, is idempotent, and reports absent for a chain with no record', t => {
  const { begin, io, saiRoot, clock } = chainFixture(t);
  const { chain } = begin();
  clock.time = 7000;
  assert.deepEqual(warmer.closeChain(chain, io), { status: 'closed' });
  assert.equal(recordOf(saiRoot, chain).closed_ms, 7000);
  clock.time = 9000;
  assert.deepEqual(warmer.closeChain(chain, io), { status: 'already-closed' });
  assert.equal(recordOf(saiRoot, chain).closed_ms, 7000, 'the first close keeps its instant');
  assert.equal(fs.existsSync(path.join(saiRoot, `warm-chain-${chain}.json.lock`)), false, 'no lock outlives the close');
  assert.deepEqual(warmer.closeChain('0123456789abcdef', io), { status: 'absent' });
  assert.throws(() => warmer.closeChain('../escape', io), warmer.UsageError);
});

test('I3 E7 close refuses the chain of a main session and leaves it warming', async t => {
  const { begin, io, saiRoot } = chainFixture(t);
  const main = begin({ role: 'agent', provider: 'p', harness: 'claude', session: 'chat-1' });
  const before = fs.readFileSync(path.join(saiRoot, `warm-chain-${main.chain}.json`), 'utf8');
  assert.deepEqual(warmer.closeChain(main.chain, io), { status: 'refused' });
  assert.equal(fs.readFileSync(path.join(saiRoot, `warm-chain-${main.chain}.json`), 'utf8'), before, 'the record is untouched');
  assert.deepEqual(warmer.armCheck(main.chain, io), armResult(true));
  assert.equal((await warmer.warmOnce({ chain: main.chain }, io)).status, 'continue');
});

test('E4 I2 a closed chain ends warming: arm launches nothing and both warm forms finish, with a live lease and an open window', async t => {
  const open = leasedChain(t);
  open.clock.time = 5000;
  assert.deepEqual(warmer.armCheck(open.chain, open.io), armResult(false), 'the live lease is reused before the close');
  assert.deepEqual(warmer.closeChain(open.chain, open.io), { status: 'closed' });
  assert.deepEqual(warmer.armCheck(open.chain, open.io), armResult(false), 'a live lease and an open window no longer reuse or launch');
  const fresh = open.begin();
  const state = { chain: fresh.chain, generation: 1, token: 'b'.repeat(16), interval_ms: 240000, max_ms: 1800000, closing_ms: 600000, armed_ms: 0 };
  warmer.closeChain(fresh.chain, open.io);
  const forbidden = { ...open.io, wait: async () => { throw new Error('a closed chain never waits'); } };
  assert.deepEqual((await warmer.warmOnce({ chain: fresh.chain }, forbidden)).status, 'finished');
  assert.deepEqual((await warmer.warmOnce({ state }, forbidden)).status, 'finished');
  assert.equal(recordOf(open.saiRoot, fresh.chain).owner, undefined, 'a refused arm takes no ownership');
});

test('E4 I2 a wait already in flight finishes at its next renewal once its chain is closed', async t => {
  const { io, clock, begin, saiRoot } = chainFixture(t);
  const { chain } = begin();
  let chunks = 0;
  const wait = async ms => {
    clock.time += ms;
    chunks += 1;
    if (chunks === 2) assert.deepEqual(warmer.closeChain(chain, io), { status: 'closed' });
  };
  const result = await warmer.warmOnce({ chain }, { ...io, wait });
  assert.equal(result.status, 'finished');
  assert.equal(result.waited_ms, 2 * warmer.TICK_MS, 'it stopped within one chunk of the close');
  assert.equal(chunks, 2);
  assert.equal(recordOf(saiRoot, chain).owner, null, 'the retired wait released its lease');
  assert.ok(recordOf(saiRoot, chain).closed_ms !== undefined, 'releasing the lease keeps the closed marker');
  assert.deepEqual(warmer.armCheck(chain, io), armResult(false));
});

test('I1 the CLI closes a chain, reports its status as JSON, and exits 2 without the chain', t => {
  const saiRoot = require('../sai/tools/temp-root').resolveTempRoot('claude');
  const began = warmer.beginOnce({ agent: 'budget-explorer', harness: 'claude' }, { saiRoot, resolve: () => ON, agentFolders: [] });
  const file = path.join(saiRoot, `warm-chain-${began.chain}.json`);
  t.after(() => fs.rmSync(file, { force: true }));
  const run = args => spawnSync(process.execPath, [WAIT, ...args], { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(run(['close', '--chain', began.chain]).stdout), { status: 'closed' });
  assert.deepEqual(JSON.parse(run(['close', '--chain', began.chain]).stdout), { status: 'already-closed' });
  assert.equal(run(['close']).status, 2);
  assert.equal(run(['close', '--chain', '../x']).status, 2);
});

test('I4 the --state decoder is the inverse of the token encoder and rejects what is not a state', () => {
  const state = { chain: '0123456789abcdef', generation: 3 };
  assert.deepEqual(warmer.decodeStateToken(warmer.stateToken(state)), state);
  for (const token of ['!!', '', Buffer.from('7').toString('base64url'), Buffer.from('[1]').toString('base64url')]) {
    assert.equal(warmer.decodeStateToken(token), null, token);
  }
});

test('the benchmark override writes the cutoff file that the warmer reads', () => {
  assert.equal(require('../skills/universal/sai-context-cache-ttl-benchmark/warming_override').CUTOFF_FILE, warmer.CUTOFF_FILE);
});

test('cache-warming.md is the single source of the three reply literals, their recognition, and the legacy alias', () => {
  const policy = fs.readFileSync(path.resolve(__dirname, '../sai/policies/cache-warming.md'), 'utf8');
  assert.match(policy, /\*\*Wake literal\*\*: the subagent reply `warming context cache up` to a `continue` or `finished` wake/);
  assert.match(policy, /\*\*Stop literal\*\*: the subagent reply `cache warming stopped` to the `dispose` message, to every wake after it, and to a wake that is not the JSON `wait\.js` prints/);
  assert.match(policy, /\*\*Main-session literal\*\*: the main-session reply `➡️ Warming context cache up\.`/);
  assert.match(policy, /\*\*Normalized recognition\*\*: comparison that ignores letter case, surrounding whitespace, and one trailing period/);
  assert.match(policy, /\*\*Legacy alias\*\*: a bare `ok`/);
  assert.match(policy, /A `finished` wake keeps the wake literal/);
  assert.match(policy, /print the main-session literal as the only text of the turn[\s\S]{0,120}print no literal/);
  assert.match(policy, /The stop literal never decides whether an agent has ended: only the stop call does/);
  assert.match(policy, /Any other text, such as a translation, a paraphrase, or a literal with words added, is not an acknowledgement/);
  assert.match(policy, /fixed English protocol text under `@sai\/policies\/public-chat\.md` § Protocol preservation[\s\S]{0,300}plain text without the `➡️` prefix/);
  assert.match(policy, /`budget-executor`, which never arms, and the user-invoked `\/sai-cache-warmer` and `\/sai-context-cache-ttl-benchmark` commands keep their own replies/);
  assert.match(policy, /Recognition is an instruction rule for the dispatcher; no tool parses the literals/);
  const lifecycle = fs.readFileSync(path.resolve(__dirname, '../sai/policies/worker-lifecycle.md'), 'utf8');
  const transport = fs.readFileSync(path.resolve(__dirname, '../sai/policies/worker-report-transport.md'), 'utf8');
  for (const text of [lifecycle, transport]) {
    assert.doesNotMatch(text, /`ok`/, 'the other policies name the literals through cache-warming.md and spell no bare ok');
    for (const literal of ['warming context cache up', 'cache warming stopped']) assert.doesNotMatch(text, new RegExp(literal));
  }
});

test('CONTINUATION_REMINDER names the reply literals of the main session and of a subagent', () => {
  const source = fs.readFileSync(WAIT, 'utf8');
  const reminder = source.match(/const CONTINUATION_REMINDER = '([^\n]*)';/)[1];
  assert.equal(reminder, REMINDER);
  assert.match(reminder, /reply with exactly `➡️ Warming context cache up\.`/);
  assert.match(reminder, /reply to a wake with exactly `warming context cache up`/);
  assert.match(reminder, /`dispose` and every wake after it with exactly `cache warming stopped`/);
});
