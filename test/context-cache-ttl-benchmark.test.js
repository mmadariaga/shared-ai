'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { parameters, validateIdentity, conclusion, measure, renderSummary } = require('../skills/universal/sai-context-cache-ttl-benchmark/engine');
const { OpenCodeAdapter, opencodeUsage, claudeUsage, claudeLimitations } = require('../skills/universal/sai-context-cache-ttl-benchmark/adapters');
const { parseArgs } = require('../skills/universal/sai-context-cache-ttl-benchmark/cache_ttl');
const { expandInstallManifest } = require('../bin/install-manifest');

const model = { providerID: 'fixture-provider', id: 'fixture-model', variant: 'high' };
function identity(tool = 'opencode', mode = 'main') {
  return { tool, mode, session: mode === 'main' ? 'ses_parent' : 'ses_child', invoking_session: 'ses_parent', parent_session: mode === 'main' ? null : 'ses_parent', model, parent_model: model };
}
function simulation(options = {}) {
  let time = 100000, anchor = time, calls = 0;
  const gaps = [];
  const clock = { now: () => time, sleep: async ms => { time += ms; options.onSleep?.(); } };
  const adapter = {
    identify: async () => options.identity ?? identity(),
    snapshot: async () => ({ anchor_ms: anchor }),
    assertUnchanged: async () => { if (options.disturbed) throw new Error(options.disturbed); },
    probe: async (text, { before }) => {
      calls++; gaps.push((time - before.anchor_ms) / 1000);
      const created = time, elapsed = (time - before.anchor_ms) / 1000;
      time += 100; anchor = time;
      const read = options.read ? options.read(elapsed, calls) : elapsed < (options.ttl ?? 400) ? 3000 : 0;
      const row = options.identity?.tool === 'claude'
        ? claudeUsage({ type: 'assistant', message: { model: model.id, usage: { cache_read_input_tokens: read, input_tokens: 10 } } })
        : opencodeUsage({ id: `a${calls}`, type: 'assistant', model, tokens: { input: 10, cache: { read } }, time: { created, completed: time } });
      return { ...row, model: options.changedModel ?? model, id: `a${calls}`, created_ms: created, snapshot: { anchor_ms: anchor }, limitations: options.limitations ?? [] };
    },
  };
  return { adapter, clock, gaps, calls: () => calls };
}

test('preserves source parameters, validates values, and scales runtime to full ladder', () => {
  const p = parameters();
  assert.equal(p.base, 4); assert.equal(p.step, 5); assert.equal(p.cap, 90);
  assert.equal(p.gran, 30); assert.equal(p.warm, 3); assert.equal(p.repeats, 3);
  assert.equal(p['max-probes'], 90);
  assert.equal(p['max-runtime-min'], 4173);
  for (const bad of [{ step: 0 }, { cap: -1 }, { repeats: 1.5 }, { 'max-probes': 1.5 }, { 'miss-max': 2000 }, { 'time-prefix': 'false' }]) assert.throws(() => parameters(bad));
  assert.throws(() => parseArgs(['--tool', 'opencode', '--wat']), /Unknown|needs a value/);
});

for (const tool of ['opencode', 'claude']) for (const mode of ['main', 'subagent']) {
  test(`offline common algorithm and prepared usage: ${tool}/${mode} (not live hosting validation)`, async () => {
    const s = simulation({ identity: identity(tool, mode) });
    const r = await measure(s.adapter, { repeats: 2 }, { clock: s.clock });
    assert.equal(r.status, 'completed');
    assert.equal(r.tool, tool); assert.equal(r.mode, mode);
    assert.deepEqual(r.model, model);
    assert.equal(r.repetitions.length, 2);
    assert.ok(r.repetitions.every(rep => rep.ttl_bracket_targets_s[1] - rep.ttl_bracket_targets_s[0] <= 60));
    assert.ok(r.samples.some(s => s.phase === 'B-warm'));
    assert.ok(r.samples.some(s => s.phase === 'sanity'));
    assert.equal(r.probes, s.calls());
    assert.ok(r.samples.every(s => s.actual_gap_s >= s.target_gap_s));
    assert.match(renderSummary(r), /fixture-provider\/fixture-model; variant: high/);
  });
}

test('cap rung is actually probed, all-HIT is a lower bound, and repetition carry avoids the full ladder', async () => {
  const s = simulation({ ttl: Infinity });
  const r = await measure(s.adapter, { repeats: 2, cap: 20 }, { clock: s.clock });
  assert.deepEqual(r.samples.filter(s => s.rep === 1).map(s => s.target_gap_s), [240, 540, 840, 1140, 1200]);
  assert.equal(r.repetitions[1].start_from_s, 900);
  assert.equal(r.observation.kind, 'lower-bound');
  assert.equal(r.observation.lower_s, 1200);
  assert.deepEqual(r.ttl_estimates_s, []);
});

test('initial MISS descent, all-MISS and contradictory observations never invent an exact lifetime', async () => {
  const s = simulation({ ttl: 0 });
  const r = await measure(s.adapter, { repeats: 1 }, { clock: s.clock });
  assert.deepEqual(s.gaps, [240, 60, 30, 15]);
  assert.equal(r.observation.kind, 'upper-bound'); assert.equal(r.observation.upper_s, 15);
  assert.deepEqual(r.ttl_estimates_s, []);
  assert.equal(conclusion([{ phase: 'A', valid: true, hit: true, actual_gap_s: 90 }, { phase: 'A', valid: true, hit: false, actual_gap_s: 60 }]).kind, 'contradictory');
  assert.equal(conclusion([]).kind, 'uncertain');
});

test('gray-zone retry is bounded and warm requests count toward probe limits', async () => {
  const s = simulation({ read: () => 1000 });
  const r = await measure(s.adapter, { repeats: 1 }, { clock: s.clock });
  assert.equal(s.calls(), 2); assert.equal(r.stop_reason, 'ambiguous-usage');
  const b = simulation();
  const limited = await measure(b.adapter, { repeats: 1, 'max-probes': 3 }, { clock: b.clock });
  assert.equal(b.calls(), 3); assert.equal(limited.status, 'incomplete');
  assert.equal(limited.samples.at(-1).phase, 'B-warm');
});

test('E1/E2 reject ambiguous sessions, wrong parent, model and variant without requests', async () => {
  for (const id of [{ ...identity(), session: 'another' }, { ...identity('opencode', 'subagent'), parent_session: 'other' }, { ...identity('opencode', 'subagent'), parent_model: { ...model, variant: 'low' } }, { ...identity(), model: null }]) {
    assert.throws(() => validateIdentity(id));
    const s = simulation({ identity: id });
    await assert.rejects(measure(s.adapter, {}, { clock: s.clock }));
    assert.equal(s.calls(), 0);
  }
  assert.throws(() => new OpenCodeAdapter({ session: '', invokingSession: '', mode: 'main' }), /Explicit/);
});

test('E3 missing usage is not a cache MISS, on either tool', () => {
  assert.throws(() => opencodeUsage({ type: 'assistant', time: { completed: 1 } }), /unavailable/);
  assert.throws(() => claudeUsage({ type: 'assistant', message: { model: 'x', usage: {} } }), /unavailable/);
  assert.equal(claudeUsage({ type: 'assistant', message: { id: 'm', model: 'x', usage: { input_tokens: 4, cache_read_input_tokens: 9, cache_creation: { ephemeral_1h_input_tokens: 7, ephemeral_5m_input_tokens: 0 } } } }).cache_1h, 7);
  for (const mode of ['main', 'subagent']) assert.ok(claudeLimitations(mode).every(text => !/unavailable in this runner/.test(text)));
  assert.ok(claudeLimitations('subagent').some(text => /effort/.test(text)) && !claudeLimitations('main').some(text => /effort/.test(text)));
});

test('E4/E7 disturbance, model change and hidden-warming evidence invalidate affected samples', async () => {
  for (const disturbed of ['Additional interaction', 'Compaction', 'Cache-warming interference']) {
    const s = simulation({ disturbed });
    const r = await measure(s.adapter, { repeats: 1 }, { clock: s.clock });
    assert.equal(r.status, 'incomplete'); assert.equal(r.samples[0].valid, false);
    assert.equal(s.calls(), 0);
  }
  const changed = simulation({ changedModel: { ...model, variant: 'low' } });
  const r = await measure(changed.adapter, { repeats: 1 }, { clock: changed.clock });
  assert.equal(r.samples[0].valid, false); assert.equal(r.stop_reason, 'adapter-error');
});

test('E6 cancellation and duration limits stop submissions and retain partial evidence', async () => {
  const controller = new AbortController();
  const s = simulation({ onSleep: () => controller.abort() });
  const r = await measure(s.adapter, {}, { clock: s.clock, signal: controller.signal });
  assert.equal(r.stop_reason, 'cancelled'); assert.equal(s.calls(), 0);
  const d = simulation({ ttl: Infinity });
  const limited = await measure(d.adapter, { repeats: 1, 'max-runtime-min': 5 }, { clock: d.clock });
  assert.equal(limited.stop_reason, 'duration-limit');
  assert.equal(d.calls(), 1); assert.equal(limited.samples.length, 1);
  assert.equal(limited.status, 'incomplete');
});

function apiFixture(mode = 'main', disturbance = null) {
  let now = 1000, posted = false, text;
  const base = { id: 'msg_seed', type: 'assistant', model, finish: 'stop', content: [{ type: 'text', text: 'OK' }], tokens: { input: 10, cache: { read: 3000 } }, time: { created: 0, completed: 1000 } };
  const routes = [];
  const io = {
    now: () => now, sleep: async ms => { now += ms; }, readLog: () => posted && disturbance === 'warming' ? 'warming session ses_child ses_parent\n' : '',
    api: async (method, route, body) => {
      routes.push([method, route]);
      const target = identity('opencode', mode);
      if (method === 'post') { posted = true; text = body.text; return { data: { id: 'msg_probe', sessionID: target.session } }; }
      if (route.includes('/message?')) {
        const rows = [base];
        if (posted) rows.push({ id: 'msg_probe', type: 'user', text, time: { created: now } }, { ...base, id: 'msg_reply', time: { created: now, completed: now + 20 } });
        if (posted && disturbance === 'user') rows.push({ id: 'msg_foreign', type: 'user', text: 'hello', time: { created: now + 10 } });
        if (posted && disturbance === 'compaction') rows.push({ id: 'msg_compaction', type: 'compaction', time: { created: now - 1 } });
        return { data: rows, cursor: {} };
      }
      return { data: { id: route.endsWith('ses_child') ? 'ses_child' : 'ses_parent', ...(route.endsWith('ses_child') ? { parentID: 'ses_parent' } : {}), model: disturbance === 'variant' ? { ...model, variant: 'low' } : model } };
    },
  };
  return { adapter: new OpenCodeAdapter({ session: identity('opencode', mode).session, invokingSession: 'ses_parent', mode }, io), routes, setTime: t => { now = t; } };
}

for (const mode of ['main', 'subagent']) test(`opencode/${mode} concrete API fixture preserves session, category and correlates probe usage`, async () => {
  const f = apiFixture(mode), id = await f.adapter.identify(), before = await f.adapter.snapshot();
  await f.adapter.assertUnchanged(before, id);
  f.setTime(241000);
  const r = await f.adapter.probe('Respond exactly: OK.', { before, identity: id, deadline: 999999 });
  assert.equal(r.cache_read, 3000); assert.equal(r.id, 'msg_reply');
  const posts = f.routes.filter(r => r[0] === 'post');
  assert.deepEqual(posts, [['post', `/api/session/${id.session}/prompt`]]);
});

test('API fixture rejects warming, foreign input, compaction, variant switches, and absent monitoring', async () => {
  for (const disturbance of ['warming', 'user', 'compaction', 'variant']) {
    const f = apiFixture('main', disturbance);
    const id = identity(), before = await f.adapter.snapshot();
    await assert.rejects(f.adapter.probe('Respond exactly: OK.', { before, identity: id, deadline: 999999 }));
    assert.equal(f.routes.filter(r => r[0] === 'post').length, 1);
  }
  const f = apiFixture();
  f.adapter.readLog = () => { throw new Error('Log access denied'); };
  await assert.rejects(f.adapter.identify(), /Log access denied/);
  assert.equal(f.routes.filter(r => r[0] === 'post').length, 0);
});

test('warming between the completion anchor and first snapshot cannot be hidden in the log baseline', async () => {
  const f = apiFixture();
  f.adapter.readLog = () => 'timestamp=1970-01-01T00:00:02.000 warming session ses_parent';
  await assert.rejects(f.adapter.snapshot(), /since the completion anchor/);
  assert.equal(f.routes.filter(r => r[0] === 'post').length, 0);
  f.adapter.readLog = () => 'timestamp=1970-01-01T00:00:00.000 warming session ses_parent';
  assert.equal((await f.adapter.snapshot()).anchor_ms, 1000);
  f.adapter.readLog = () => 'warming session ses_parent';
  await assert.rejects(f.adapter.snapshot(), /no interpretable timestamp/);
});

test('CLI dry runs are offline and consent is required before live output', () => {
  const runner = path.resolve(__dirname, '../skills/universal/sai-context-cache-ttl-benchmark/cache_ttl.js');
  const args = ['--tool', 'opencode', '--mode', 'main', '--session', 'ses_exact', '--invoking-session', 'ses_exact', '--out', '/not-created'];
  const result = JSON.parse(execFileSync(process.execPath, [runner, ...args, '--dry-run'], { encoding: 'utf8' }));
  assert.equal(result.dry_run, true);
  assert.throws(() => execFileSync(process.execPath, [runner, ...args], { stdio: 'pipe' }), error => error.status === 2 && /consent/.test(error.stderr.toString()));
  assert.equal(parseArgs(args.filter((value, index) => index !== 2 && index !== 3).concat('--subagent')).mode, 'subagent');
  assert.throws(() => parseArgs([...args, '--mode', 'main', '--subagent']), /not both/);
});

test('Claude CLI reports unavailable with the reason when the invoking transcript is missing, and sends no request', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-benchmark-offline-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'projects', 'C--elsewhere'), { recursive: true });
  const runner = path.resolve(__dirname, '../skills/universal/sai-context-cache-ttl-benchmark/cache_ttl.js');
  for (const mode of ['main', 'subagent']) {
    const out = path.join(root, mode);
    const args = ['--tool', 'claude', '--mode', mode, '--session', mode === 'main' ? 'parent' : 'child', '--invoking-session', 'parent', '--projects', path.join(root, 'projects'), '--out', out, '--acknowledge-consumption'];
    assert.throws(() => execFileSync(process.execPath, [runner, ...args], { stdio: 'pipe' }), error => error.status === 1);
    const report = JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8'));
    assert.equal(report.status, 'unavailable'); assert.equal(report.probes, 0);
    assert.equal(report.mode, mode); assert.equal(report.model, null);
    assert.equal(report.results_valid, false);
    assert.match(report.limitations[0], /No transcript names the invoking Claude Code session/);
    assert.match(fs.readFileSync(path.join(out, 'summary.md'), 'utf8'), /unavailable/);
    assert.throws(() => execFileSync(process.execPath, [runner, ...args], { stdio: 'pipe' }), error => error.status === 2);
  }
});

test('both harnesses install all auxiliary resources, context-preserving wrappers and permissions', () => {
  const repoRoot = path.resolve(__dirname, '..'), manifest = require('../sai/install-manifest.json');
  for (const harness of ['claude', 'opencode']) {
    const base = path.join(os.tmpdir(), 'cache-benchmark-projection', harness);
    const destinationRoot = Object.fromEntries(['agents', 'commands', 'config', 'sai', 'skills', 'root'].map(k => [k, path.join(base, k)]));
    const projections = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    for (const resource of ['SKILL.md', 'measurement.md', 'cache_ttl.js', 'engine.js', 'adapters.js']) assert.ok(projections.some(p => p.destinationPath === path.join(base, 'skills/sai-context-cache-ttl-benchmark', resource)), `${harness}/${resource}`);
    const command = projections.find(p => p.destinationPath === path.join(base, 'commands/sai-context-cache-ttl-benchmark.md'));
    const text = command.sourceText ?? fs.readFileSync(command.sourcePath, 'utf8');
    assert.match(text, /retaining its context and model/);
    assert.doesNotMatch(text, /boot\.md|command-runner|^model:/m);
    if (harness === 'claude') assert.match(text, /cache_ttl\.js/);
  }
});
