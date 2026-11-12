'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { BenchmarkError, loadCorpus } = require('../benchmark/corpus');
const { findPrice, priceFromTable } = require('../sai/tools/model-prices');
const { summarizeRun } = require('../benchmark/cost');
const { measureClaude, measureOpencode } = require('../benchmark/measure');
const { buildReports } = require('../benchmark/report');
const { runBenchmark } = require('../benchmark/runner');
const { DockerBackend } = require('../benchmark/docker-backend');
const { outputFor, SimulatedBackend } = require('./helpers/benchmark-simulated-backend');

const repoRoot = path.join(__dirname, '..');
const fixture = path.join(__dirname, 'fixtures', 'benchmark-corpus');
const workers = { claude: ['sai-3-red-worker', 'sai-3-green-worker'], opencode: ['sai-3-red-worker', 'sai-3-green-worker'] };
const provenance = { runnerCommit: 'abc123', saiCommit: 'abc123' };
const corpus = () => loadCorpus(fixture, { workers });

/** The round of each launch: the n-th run of a configuration is its round n. */
function roundCounter() {
  const seen = {};
  return (run) => {
    seen[run.configuration.id] = (seen[run.configuration.id] ?? 0) + 1;
    return seen[run.configuration.id];
  };
}

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sai-benchmark-cost-'));

function row(model, fields = {}) {
  return {
    model, requests: 1, requestsWithoutUsage: 0, input: 0, output: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheWrite: 0, recordedCost: null, toolCalls: 0, ...fields,
  };
}

const PRICES = {
  date: '2026-11-01',
  models: {
    haiku: { inputPerMTok: 1, outputPerMTok: 5, cacheReadPerMTok: 0.1, cacheWrite5mPerMTok: 1.25, cacheWrite1hPerMTok: 2 },
    'claude-haiku-4-5-special': { inputPerMTok: 9, outputPerMTok: 9 },
    'vendor/small': { inputPerMTok: 0.2, outputPerMTok: 0.8 },
  },
};

test('the price of a Claude Code model comes from token counts, the dated table, and the cache lifetimes', () => {
  const measured = [row('claude-haiku-4-5-20251001', { input: 1_000_000, output: 200_000, cacheRead: 3_000_000, cacheWrite5m: 400_000, cacheWrite1h: 100_000, toolCalls: 7 })];
  const { usage } = summarizeRun(measured, 'claude', PRICES);
  // 1 + 200k * 5/M + 3M * 0.1/M + 400k * 1.25/M + 100k * 2/M
  assert.ok(Math.abs(usage.cost - (1 + 1 + 0.3 + 0.5 + 0.2)) < 1e-9);
  assert.deepEqual([usage.input, usage.output, usage.cacheRead, usage.cacheWrite, usage.toolCalls], [1_000_000, 200_000, 3_000_000, 500_000, 7]);
  assert.deepEqual(usage.unpricedModels, []);
});

test('a cache write that the request did not split by lifetime pays the 5-minute price', () => {
  const { usage } = summarizeRun([row('haiku', { cacheWrite: 1_000_000 })], 'claude', PRICES);
  assert.equal(usage.cost, 1.25);
  assert.equal(usage.cacheWrite, 1_000_000);
});

test('price lookup: an exact key, else the longest key whose words are a run of the model, and an ambiguity is no price', () => {
  assert.equal(findPrice(PRICES, 'vendor/small').inputPerMTok, 0.2);
  assert.equal(findPrice(PRICES, 'claude-haiku-4-5-20251001').inputPerMTok, 1);
  assert.equal(findPrice(PRICES, 'claude-haiku-4-5-special-2').inputPerMTok, 9);
  assert.equal(findPrice(PRICES, 'claude-sonnet-4-5'), null);
  assert.equal(findPrice(PRICES, null), null);
  const ambiguous = { date: '2026-11-01', models: { 'a-b': { inputPerMTok: 1, outputPerMTok: 1 }, 'b-c': { inputPerMTok: 2, outputPerMTok: 2 } } };
  assert.equal(findPrice(ambiguous, 'a-b-c'), null);
});

test('the shared price module: the benchmark imports its helpers, and priceFromTable pays each token type its own price', () => {
  assert.equal(require('../benchmark/cost').findPrice, undefined, 'the helpers are no longer defined by the benchmark');
  const entry = { inputPerMTok: 1, outputPerMTok: 5, cacheReadPerMTok: 0.1, cacheWrite5mPerMTok: 1.25, cacheWrite1hPerMTok: 2 };
  const tokens = { input: 1_000_000, output: 1_000_000, cacheRead: 1_000_000, cacheWrite5m: 1_000_000, cacheWrite1h: 1_000_000, cacheWrite: 1_000_000 };
  assert.equal(priceFromTable(tokens, entry), 1 + 5 + 0.1 + 1.25 + 2 + 1.25);
  assert.equal(priceFromTable({ input: 10 }, null), null);
  assert.equal(priceFromTable({ input: 10, cacheRead: 5 }, { inputPerMTok: 1, outputPerMTok: 1 }), null, 'a token type with no price is no cost');
  assert.equal(priceFromTable({ input: 0, cacheRead: 0 }, { inputPerMTok: 1, outputPerMTok: 1 }), 0);
});

test('the installable default price table is dated, has the benchmark corpus shape, and prices the recorded Claude Code model ids', () => {
  const { PRICES: defaults } = require('../sai/tools/model-prices');
  assert.match(defaults.date, /^\d{4}-\d{2}-\d{2}$/);
  for (const [model, price] of Object.entries(defaults.models)) {
    for (const key of ['inputPerMTok', 'outputPerMTok', 'cacheReadPerMTok', 'cacheWrite5mPerMTok', 'cacheWrite1hPerMTok']) {
      assert.ok(typeof price[key] === 'number' && price[key] > 0, `${model}: ${key}`);
    }
    assert.ok(price.cacheReadPerMTok < price.inputPerMTok && price.inputPerMTok < price.cacheWrite5mPerMTok && price.cacheWrite5mPerMTok < price.cacheWrite1hPerMTok, `${model}: price order`);
  }
  assert.equal(findPrice(defaults, 'claude-sonnet-5-5').inputPerMTok, 2);
  assert.equal(findPrice(defaults, 'claude-opus-5-5-20261101').cacheReadPerMTok, 0.2);
  assert.equal(findPrice(defaults, 'claude-haiku-4-5-20251001').outputPerMTok, 5);
  assert.equal(findPrice(defaults, 'claude-haiku-5-5'), null, 'a model whose price depends on the prompt length has no single entry');
});

test('E8: a model without a price, or without the price of a token type it used, has a cost of null and never zero', () => {
  const unknown = summarizeRun([row('claude-sonnet-4-5', { input: 10, output: 10 })], 'claude', PRICES).usage;
  assert.equal(unknown.cost, null);
  assert.deepEqual(unknown.unpricedModels, ['claude-sonnet-4-5']);
  assert.equal(unknown.models[0].cost, null);
  assert.equal(unknown.input, 10);

  const noCachePrice = summarizeRun([row('vendor/small', { input: 10, cacheRead: 5 })], 'claude', PRICES).usage;
  assert.equal(noCachePrice.cost, null);

  const mixed = summarizeRun([row('haiku', { input: 1_000_000 }), row('claude-sonnet-4-5', { input: 5 })], 'claude', PRICES).usage;
  assert.equal(mixed.cost, null);
  assert.equal(mixed.models[0].cost, 1);
});

test('opencode uses the cost it recorded, falls back to the table, and folds reasoning into output', () => {
  const recorded = summarizeRun([row('vendor/small', { input: 10, output: 10, cacheRead: 99, recordedCost: 0.75 })], 'opencode', PRICES).usage;
  assert.equal(recorded.cost, 0.75);
  const table = summarizeRun([row('vendor/small', { input: 1_000_000, output: 1_000_000, recordedCost: null })], 'opencode', PRICES).usage;
  assert.ok(Math.abs(table.cost - 1) < 1e-9);
});

test('a harness data failure leaves the figures absent without changing anything else', () => {
  assert.deepEqual(summarizeRun({ error: 'the claude data copied from the container could not be read' }, 'claude', PRICES), { usage: null, usageNote: 'the claude data copied from the container could not be read' });
  assert.equal(summarizeRun([], 'claude', PRICES).usage, null);
  assert.equal(summarizeRun(undefined, 'claude', PRICES).usageNote, 'no usage was measured');
});

test('the price table accepts optional cache prices and rejects a malformed one', () => {
  const dir = tempDir();
  fs.cpSync(fixture, dir, { recursive: true });
  const file = path.join(dir, 'benchmark.json');
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  config.prices.models.haiku = { inputPerMTok: 1, outputPerMTok: 5, cacheReadPerMTok: 0.1, cacheWrite5mPerMTok: 1.25, cacheWrite1hPerMTok: 2 };
  fs.writeFileSync(file, JSON.stringify(config));
  assert.equal(loadCorpus(dir, { workers }).configurations.length, 2);

  config.prices.models.haiku.cacheReadPerMTok = '0.1';
  fs.writeFileSync(file, JSON.stringify(config));
  assert.throws(() => loadCorpus(dir, { workers }), (error) => error instanceof BenchmarkError && /prices: haiku: cacheReadPerMTok must be a number of at least 0/.test(error.message));
});

// ---------------------------------------------------------------------------
// Readers: transcripts and database of a run
// ---------------------------------------------------------------------------

const SESSION = '11111111-1111-4111-8111-111111111111';

function assistant(uuid, parent, second, id, model, usage, content = []) {
  return { type: 'assistant', uuid, parentUuid: parent, timestamp: new Date(Date.UTC(2026, 10, 1, 0, 0, second)).toISOString(), message: { id, model, usage, content } };
}

function userRow(uuid, second, content) {
  return { type: 'user', uuid, timestamp: new Date(Date.UTC(2026, 10, 1, 0, 0, second)).toISOString(), message: { content } };
}

const toolUse = (id, name) => ({ type: 'tool_use', id, name, input: {} });
const toolResult = (id) => ({ type: 'tool_result', tool_use_id: id, content: 'ok' });
const usage = (input, output, read, write5m, write1h) => ({ input_tokens: input, output_tokens: output, cache_read_input_tokens: read, cache_creation: { ephemeral_5m_input_tokens: write5m, ephemeral_1h_input_tokens: write1h } });

function writeTranscripts() {
  const dataDir = tempDir();
  const folder = path.join(dataDir, 'projects', '-work');
  fs.mkdirSync(path.join(folder, SESSION, 'subagents'), { recursive: true });
  const lines = (rows) => `${rows.map((entry) => JSON.stringify(entry)).join('\n')}\n`;
  fs.writeFileSync(path.join(folder, `${SESSION}.jsonl`), lines([
    userRow('u1', 0, 'start'),
    // One response written on two lines: the line with the most output counts once.
    assistant('a1', 'u1', 1, 'msg_1', 'claude-opus-4-5', usage(10, 1, 100, 20, 0), [toolUse('t1', 'Read')]),
    assistant('a1b', 'u1', 2, 'msg_1', 'claude-opus-4-5', usage(10, 8, 100, 20, 0), [toolUse('t2', 'Agent')]),
    userRow('u2', 3, [toolResult('t1'), toolResult('t2')]),
    assistant('a2', 'u2', 4, 'msg_2', 'claude-opus-4-5', usage(5, 5, 50, 0, 30)),
  ]));
  fs.writeFileSync(path.join(folder, SESSION, 'subagents', 'agent-a0000000000000001.meta.json'), JSON.stringify({ agentType: 'sai-3-red-worker', toolUseId: 't2' }));
  fs.writeFileSync(path.join(folder, SESSION, 'subagents', 'agent-a0000000000000001.jsonl'), lines([
    userRow('s1', 5, 'task'),
    assistant('b1', 's1', 6, 'msg_3', 'claude-haiku-4-5-20251001', { input_tokens: 7, output_tokens: 3, cache_read_input_tokens: 0, cache_creation_input_tokens: 40 }, [toolUse('t3', 'Bash')]),
    userRow('s2', 7, [toolResult('t3')]),
  ]));
  return dataDir;
}

test('E-measure: Claude Code transcripts give per-model tokens, cache lifetimes, and tool calls across the subagents', () => {
  const rows = measureClaude(writeTranscripts());
  assert.deepEqual(rows.map((entry) => entry.model), ['claude-haiku-4-5-20251001', 'claude-opus-4-5']);
  const [haiku, opus] = rows;
  assert.deepEqual({ requests: haiku.requests, input: haiku.input, output: haiku.output, cacheWrite: haiku.cacheWrite, cacheWrite5m: haiku.cacheWrite5m, toolCalls: haiku.toolCalls }, { requests: 1, input: 7, output: 3, cacheWrite: 40, cacheWrite5m: 0, toolCalls: 1 });
  assert.deepEqual({ requests: opus.requests, input: opus.input, output: opus.output, cacheRead: opus.cacheRead, cacheWrite5m: opus.cacheWrite5m, cacheWrite1h: opus.cacheWrite1h, toolCalls: opus.toolCalls }, { requests: 2, input: 15, output: 13, cacheRead: 150, cacheWrite5m: 20, cacheWrite1h: 30, toolCalls: 2 });
});

test('a measurement carries no session, path, or project identity', () => {
  const text = JSON.stringify(measureClaude(writeTranscripts()));
  assert.ok(!text.includes(SESSION));
  assert.ok(!text.includes('agent-a0000000000000001'));
  assert.ok(!/projects|\/work|sai-benchmark/.test(text));
});

test('a data folder without transcripts is unreadable', () => {
  assert.throws(() => measureClaude(tempDir()));
});

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  DatabaseSync = null;
}
const sqliteTest = DatabaseSync ? test : test.skip;

sqliteTest('E-measure: the opencode database gives per-model tokens, recorded cost, and tool calls across child sessions', () => {
  const dataDir = tempDir();
  fs.mkdirSync(path.join(dataDir, 'opencode'), { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'opencode', 'opencode.db'));
  db.exec('CREATE TABLE session_v2 (id TEXT, parent_id TEXT, agent TEXT, title TEXT, directory TEXT, time_created INTEGER);');
  db.exec('CREATE TABLE session_message (id TEXT, session_id TEXT, type TEXT, seq INTEGER, time_created INTEGER, data TEXT);');
  const insert = db.prepare('INSERT INTO session_message (id, session_id, type, seq, time_created, data) VALUES (?, ?, ?, ?, ?, ?)');
  const message = (id, session, seq, data) => insert.run(id, session, 'assistant', seq, seq, JSON.stringify(data));
  const tool = { type: 'tool', name: 'bash', state: { status: 'completed' } };
  message('m1', 'ses_root', 1, { model: { id: 'small', providerID: 'vendor' }, tokens: { input: 100, output: 10, reasoning: 5, cache: { read: 1000, write: 50 } }, cost: 0.25, content: [tool, tool, { type: 'text' }] });
  message('m2', 'ses_child', 2, { model: { id: 'small', providerID: 'vendor' }, tokens: { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } }, cost: 0.5, content: [tool] });
  message('m3', 'ses_child', 3, { model: { id: 'large', providerID: 'vendor' }, tokens: { input: 2, output: 2, reasoning: 0, cache: { read: 0, write: 0 } }, content: [] });
  message('m4', 'ses_child', 4, { model: { id: 'large' }, content: [] });
  db.close();

  const rows = measureOpencode(dataDir);
  const [large, small] = rows;
  assert.deepEqual({ model: large.model, requests: large.requests, requestsWithoutUsage: large.requestsWithoutUsage, input: large.input, recordedCost: large.recordedCost }, { model: 'large', requests: 2, requestsWithoutUsage: 1, input: 2, recordedCost: null });
  assert.deepEqual({ requests: small.requests, input: small.input, output: small.output, cacheRead: small.cacheRead, cacheWrite: small.cacheWrite, recordedCost: small.recordedCost, toolCalls: small.toolCalls }, { requests: 2, input: 101, output: 16, cacheRead: 1000, cacheWrite: 50, recordedCost: 0.75, toolCalls: 3 });
});

// ---------------------------------------------------------------------------
// Run result and report
// ---------------------------------------------------------------------------

const claudeRows = [row('claude-haiku-4-5-20251001', { requests: 4, input: 1_000_000, output: 100_000, cacheRead: 2_000_000, cacheWrite5m: 200_000, cacheWrite1h: 0, toolCalls: 30 })];
const unpricedRows = [row('claude-sonnet-4-5', { requests: 2, input: 5_000, output: 500, cacheRead: 1_000, toolCalls: 4 })];
const opencodeRows = [row('vendor/small', { requests: 3, input: 2_000, output: 400, cacheRead: 10, cacheWrite: 5, recordedCost: 0.125, toolCalls: 9 })];

function usageCorpus() {
  const loaded = corpus();
  loaded.prices = {
    date: '2026-11-01',
    models: {
      haiku: { inputPerMTok: 1, outputPerMTok: 5, cacheReadPerMTok: 0.1, cacheWrite5mPerMTok: 1.25, cacheWrite1hPerMTok: 2 },
      'vendor/small': { inputPerMTok: 0.2, outputPerMTok: 0.8 },
    },
  };
  return loaded;
}

test('each run result and report carries tokens, tool calls, and cost per run, per model, and per configuration', async () => {
  const outDir = path.join(tempDir(), 'out');
  const roundOf = roundCounter();
  const backend = new SimulatedBackend((run) => {
    const claude = run.configuration.harness === 'claude';
    const usageForRun = claude ? (roundOf(run) === 1 ? claudeRows : unpricedRows) : opencodeRows;
    return { output: outputFor(run.configuration.harness, 'Implement done.'), wallMs: 1000, suite: { passed: 1, total: 1 }, usage: usageForRun };
  });
  await runBenchmark({ corpus: usageCorpus(), outDir, backend, provenance });

  const saved = JSON.parse(fs.readFileSync(path.join(outDir, 'runs', 'round-01-claude-plan-haiku.json'), 'utf8'));
  assert.equal(saved.usage.toolCalls, 30);
  assert.equal(saved.usage.input, 1_000_000);
  assert.equal(saved.usage.cacheWrite, 200_000);
  assert.ok(Math.abs(saved.usage.cost - (1 + 0.5 + 0.2 + 0.25)) < 1e-9);

  const reports = buildReports(outDir, { regenerate: 'regen' });
  const claude = reports['report-claude-plan-haiku.md'];
  assert.match(claude, /- Tokens: 1,005,000 input, 100,500 output, 2,001,000 cache read, 200,000 cache write in total; 1,653,250 per run/);
  assert.match(claude, /- Tool calls: 34 in total, 17 per run/);
  assert.match(claude, /- Cost: \$1\.9500 in total, \$1\.9500 per priced run \(estimated from token counts and the price table; price table of 2026-11-01; 1 runs have a model with no price and are left out\)/);
  assert.match(claude, /\| claude-sonnet-4-5 \| 2 \| 5,000 \| 500 \| 1,000 \| 0 \| 4 \| no price \|/);
  assert.match(claude, /\| claude-haiku-4-5-20251001 \| 4 \| 1,000,000 \| 100,000 \| 2,000,000 \| 200,000 \| 30 \| \$1\.9500 \|/);
  assert.match(claude, /\| round-01-claude-plan-haiku \| 1 \| greeting \| accepted \| 1\/1 \| 1\.0 \| 0 \| 1,000,000 \| 100,000 \| 2,000,000 \| 200,000 \| 30 \| \$1\.9500 \|/);
  assert.match(claude, /\| round-02-claude-plan-haiku \| 2 \| greeting \| accepted \| 1\/1 \| 1\.0 \| 0 \| 5,000 \| 500 \| 1,000 \| 0 \| 4 \| no price \|/);

  const opencode = reports['report-opencode-plan-small.md'];
  assert.match(opencode, /- Cost: \$0\.2500 in total, \$0\.1250 per priced run \(as the harness recorded it; the price table prices a model that recorded none; price table of 2026-11-01\)/);
  assert.match(opencode, /\| vendor\/small \| 6 \| 4,000 \| 800 \| 20 \| 10 \| 18 \| \$0\.2500 \|/);
});

test('a configuration whose models have no price reports no price, with tokens and time as usual', async () => {
  const outDir = path.join(tempDir(), 'out');
  const backend = new SimulatedBackend((run) => ({ output: outputFor(run.configuration.harness, 'Implement done.'), wallMs: 2000, suite: { passed: 1, total: 1 }, usage: unpricedRows }));
  await runBenchmark({ corpus: usageCorpus(), outDir, backend, provenance });
  const claude = buildReports(outDir, { regenerate: 'regen' })['report-claude-plan-haiku.md'];
  assert.match(claude, /- Cost: no price/);
  assert.match(claude, /- Wall time: 4\.0 s in total, 2\.0 s per run/);
  assert.match(claude, /- Tokens: 10,000 input/);
  assert.ok(!/\$0\.0000/.test(claude));
});

test('runs without measured usage keep their classification and are listed apart in the figures', async () => {
  const outDir = path.join(tempDir(), 'out');
  const roundOf = roundCounter();
  const backend = new SimulatedBackend((run) => ({
    output: outputFor(run.configuration.harness, 'Implement done.'),
    wallMs: 1000,
    suite: { passed: 1, total: 1 },
    usage: roundOf(run) === 1 ? { error: 'the claude data copied from the container could not be read' } : claudeRows,
  }));
  await runBenchmark({ corpus: usageCorpus(), outDir, backend, provenance });
  const saved = JSON.parse(fs.readFileSync(path.join(outDir, 'runs', 'round-01-claude-plan-haiku.json'), 'utf8'));
  assert.equal(saved.outcome, 'accepted');
  assert.equal(saved.usage, null);
  assert.equal(saved.usageNote, 'the claude data copied from the container could not be read');
  const claude = buildReports(outDir, { regenerate: 'regen' })['report-claude-plan-haiku.md'];
  assert.match(claude, /Accepted: 2 of 2 judged runs/);
  assert.match(claude, /- Runs without usage data: 1 \(excluded from the figures above\)/);
  assert.match(claude, /\| round-01-claude-plan-haiku \| 1 \| greeting \| accepted \| 1\/1 \| 1\.0 \| 0 \| - \| - \| - \| - \| - \| - \|/);
});

test('a configuration with no measured usage says so', async () => {
  const outDir = path.join(tempDir(), 'out');
  await runBenchmark({ corpus: usageCorpus(), outDir, backend: new SimulatedBackend(), provenance });
  const claude = buildReports(outDir, { regenerate: 'regen' })['report-claude-plan-haiku.md'];
  assert.match(claude, /- Tokens, tool calls, and cost: not measured \(2 runs without usage data\)/);
  assert.ok(!claude.includes('## Usage by model'));
});

// ---------------------------------------------------------------------------
// Docker backend: the harness data leaves the container when the run ends
// ---------------------------------------------------------------------------

function fakeDocker({ agentsTimeout = false, harnessData = null } = {}) {
  const calls = [];
  const exec = async (command, args) => {
    calls.push(args);
    const joined = args.join(' ');
    if (args[0] === 'exec' && (args.includes('claude') || args.includes('opencode')) && (args.includes('-p') || args.includes('run'))) {
      return { code: 0, stdout: outputFor(args.includes('claude') ? 'claude' : 'opencode', 'Implement done.'), stderr: '', timedOut: agentsTimeout, wallMs: 1500 };
    }
    if (args[0] === 'exec' && joined.includes('SUITE_RESULT')) return { code: 0, stdout: 'SUITE_RESULT {"passed":1,"total":1}\n', stderr: '', timedOut: false, wallMs: 10 };
    if (args[0] === 'cp' && args[1].includes('/home/dev/')) {
      if (!harnessData) return { code: 1, stdout: '', stderr: 'Error: No such container:path', timedOut: false, wallMs: 1 };
      fs.cpSync(harnessData, args[2], { recursive: true });
    }
    return { code: 0, stdout: '', stderr: '', timedOut: false, wallMs: 1 };
  };
  return { calls, exec };
}

async function dockerRun(options, harnessIndex = 0) {
  const { calls, exec } = fakeDocker(options);
  const backend = new DockerBackend({ checkoutDir: repoRoot, environment: { ANTHROPIC_API_KEY: 'x', OPENCODE_API_KEY: 'x' }, exec });
  const loaded = corpus();
  const raw = await backend.run({ corpus: loaded, configuration: loaded.configurations[harnessIndex], brief: loaded.briefs[0], route: 'plan', timeLimitMs: 1000 });
  return { calls, raw };
}

test('I6: the Claude Code data is copied out of the container before it is removed and measured', async () => {
  const dataDir = writeTranscripts();
  const { calls, raw } = await dockerRun({ harnessData: path.join(dataDir, 'projects') });
  const flat = calls.map((args) => args.join(' '));
  const copy = flat.findIndex((line) => /^cp sai-benchmark-\w+:\/home\/dev\/\.claude\/projects\/\. /.test(line));
  assert.ok(copy > flat.findIndex((line) => line.includes('claude -p')), 'the copy follows the launch');
  assert.ok(copy < flat.findIndex((line) => line.includes('acceptance')), 'the copy precedes the suite');
  assert.match(flat.at(-1), /^rm -f sai-benchmark-/);
  assert.deepEqual(raw.usage.map((entry) => entry.model), ['claude-haiku-4-5-20251001', 'claude-opus-4-5']);
  assert.deepEqual(raw.suite, { passed: 1, total: 1 });
});

test('I6: a timed-out run still reports the usage it spent', async () => {
  const dataDir = writeTranscripts();
  const { raw } = await dockerRun({ agentsTimeout: true, harnessData: path.join(dataDir, 'projects') });
  assert.equal(raw.timedOut, true);
  assert.equal(raw.usage.length, 2);
});

test('I6: harness data that cannot be copied or read leaves the usage unmeasured with a fixed message', async () => {
  const missing = await dockerRun({});
  assert.deepEqual(missing.raw.usage, { error: 'the claude data copied from the container could not be read' });
  assert.deepEqual(missing.raw.suite, { passed: 1, total: 1 });

  const empty = await dockerRun({ harnessData: tempDir() });
  assert.deepEqual(empty.raw.usage, { error: 'the claude data copied from the container could not be read' });
  assert.ok(!JSON.stringify(empty.raw.usage).includes(os.tmpdir()));
});

sqliteTest('I6: the opencode data directory is copied out and measured', async () => {
  const dataDir = tempDir();
  fs.mkdirSync(path.join(dataDir, 'opencode'), { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'opencode', 'opencode.db'));
  db.exec('CREATE TABLE session_v2 (id TEXT, parent_id TEXT, agent TEXT, title TEXT, directory TEXT, time_created INTEGER);');
  db.exec('CREATE TABLE session_message (id TEXT, session_id TEXT, type TEXT, seq INTEGER, time_created INTEGER, data TEXT);');
  db.prepare('INSERT INTO session_message (id, session_id, type, seq, time_created, data) VALUES (?, ?, ?, ?, ?, ?)')
    .run('m1', 'ses_root', 'assistant', 1, 1, JSON.stringify({ model: { id: 'small' }, tokens: { input: 3, output: 2, reasoning: 0, cache: { read: 0, write: 0 } }, cost: 0.5, content: [] }));
  db.close();
  const { calls, raw } = await dockerRun({ harnessData: path.join(dataDir, 'opencode') }, 1);
  assert.ok(calls.some((args) => args[0] === 'cp' && args[1].endsWith(':/home/dev/.local/share/opencode/.')));
  assert.deepEqual(raw.usage.map((entry) => [entry.model, entry.input, entry.recordedCost]), [['small', 3, 0.5]]);
});
