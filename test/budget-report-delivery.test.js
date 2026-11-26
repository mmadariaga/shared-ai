'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const transfer = require('../sai/tools/transfer');
const { translate, resolveProfile } = require('../bin/capabilities');
const manifest = require('../sai/install-manifest.json');

const repoRoot = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(repoRoot, file), 'utf8');
const registry = manifest.capabilities;
const TRANSPORT = 'sai/policies/worker-report-transport.md';
const AGENTS = ['explorer', 'subagent', 'executor'];
const HARNESSES = ['claude', 'opencode'];

function budgetSection() {
  const text = read(TRANSPORT);
  const start = text.indexOf('## Budget agents');
  assert.ok(start >= 0, 'the transport policy has a Budget agents section');
  const end = text.indexOf('\n## ', start + 3);
  return text.slice(start, end < 0 ? undefined : end);
}

test('the transport policy defines one delivery mode for the three budget agents, with an agent side and a dispatcher side', () => {
  const section = budgetSection();
  assert.match(section, /`budget-explorer`, `budget-subagent`, and `budget-executor` deliver every result as a saved report file/);
  assert.match(section, /There is no inline-text mode/);
  assert.match(section, /no `--command` row, no validator, and no `outcome`/);
  assert.match(section, /### Agent side/);
  assert.match(section, /### Dispatcher side/);
  const policy = read(TRANSPORT);
  assert.doesNotMatch(policy, /`budget-\*` helper/, 'the budget-helper exclusion is gone');
  assert.match(policy, /The three budget agents[\s\S]{0,200}§ Budget agents, with no schema and no validator/);
});

test('E1, E3, E4: the final message holds the reference and the warming line; a missing line or a failed save gets one line', () => {
  const agent = budgetSection().split('### Dispatcher side')[0];
  assert.match(agent, /A task without `--report-dir` gets no work: reply with one line that names the missing line/);
  assert.match(agent, /put --dir <report-dir> --path <unique-name>\.md --exclusive --input-file <draft>/);
  assert.match(agent, /`\{path, sha256\}` that `put` printed and then the `warming: true\|false` line, and nothing else/);
  assert.match(agent, /no wording that points at earlier text, such as "the report above"/);
  assert.match(agent, /so the final message follows your last tool call/);
  assert.match(agent, /When `put` fails twice, reply with one line that names the failure and the path of the draft/);
  assert.match(agent, /A dispatch with no task \(a ready probe\) needs neither line/);
});

test('E2, E5-E10: the dispatcher opens, tags, accepts, recovers, and closes the report directory', () => {
  const dispatcher = budgetSection().split('### Dispatcher side')[1];
  assert.match(dispatcher, /`transfer\.js open --harness <claude\|opencode>`/);
  assert.match(dispatcher, /first line `--report-dir <dir>` of every task message to a budget agent, continuations included/);
  assert.match(dispatcher, /adds `--harness claude` as the second line, for all three agents/);
  assert.match(dispatcher, /Parallel helpers share the directory, and each saves under its own name/);
  assert.match(dispatcher, /A worker that dispatches helpers uses the helper directory its coordinator gives it, or creates and closes its own/);
  assert.match(dispatcher, /main session in budget mode outside an SAI command creates the directory at its first budget dispatch and reuses it while that agent stays alive/);
  assert.match(dispatcher, /accept --dir <report-dir> --path <path> --sha256 <sha256>[\s\S]{0,40}before you read the report/);
  assert.match(dispatcher, /`already: true` marks a reference you already accepted/);
  assert.match(dispatcher, /text after the reference other than the `warming:` line/);
  assert.match(dispatcher, /run the scan on the helper directory and accept any saved report it lists\. Only when it lists none, ask that agent once/);
  assert.match(dispatcher, /run the watch of § Undelivered reports on the helper directory/);
  assert.match(dispatcher, /when you dispose the agent for a main session in budget mode/);
  assert.match(dispatcher, /research directory of `\/sai-plan`[\s\S]{0,120}closed by the agent that created it, at the end of its run/);
});

test('the budget reports are not added to the validator, and transfer.js gains no sub-command for the budget agents', () => {
  const validator = read('sai/tools/worker-report-validator.js');
  assert.doesNotMatch(validator, /\bbudget\b\s*:/);
  const usage = spawnSync(process.execPath, [path.join(repoRoot, 'sai/tools/transfer.js'), '--help'], { encoding: 'utf8' });
  const commands = [...JSON.parse(usage.stdout).usage.matchAll(/node sai\/tools\/transfer\.js (\S+)/g)].map(match => match[1]);
  assert.deepEqual(commands, ['open', 'put', 'verify', 'materialize', 'accept', 'receive', 'status', 'watch', 'retire-handle', 'live', 'close']);
});

test('the three agent policies deliver through the transport and no longer describe a text reply', () => {
  for (const file of ['sai/policies/explore-agent.md', 'sai/policies/executor-agent.md', 'sai/policies/budget-agent.md']) {
    const text = read(file);
    assert.match(text, /Fetch `@sai\/policies\/worker-report-transport\.md` and follow its § Budget agents, agent side/, file);
    assert.doesNotMatch(text, /answered in text|reply with the response in text|inline/i, file);
  }
  assert.match(read('sai/policies/executor-agent.md'), /the final message is its `\{path, sha256\}` and the line `warming: false`/);
  assert.match(read('sai/policies/budget-agent.md'), /`warming: true` or `warming: false` beside the reference/);
});

test('the six budget skills carry the dispatcher rule, and only the Claude Code ones name the harness line', () => {
  for (const harness of HARNESSES) {
    for (const agent of AGENTS) {
      const skill = read(`skills/${harness}/budget-${agent}/SKILL.md`);
      const label = `${harness}/${agent}`;
      assert.match(skill, /Every spawn prompt opens with the line `--report-dir <dir>`/, label);
      assert.match(skill, /there is no text reply/, label);
      assert.match(skill, /Fetch `@sai\/policies\/worker-report-transport\.md`/, label);
      assert.match(skill, /§ Budget agents, dispatcher side/, label);
      assert.equal(/`--harness claude` as the second line/.test(skill), harness === 'claude', label);
    }
  }
  assert.doesNotMatch(read('skills/claude/budget-explorer/SKILL.md'), /without the line it replies in text/);
  assert.doesNotMatch(read('skills/opencode/budget-explorer/SKILL.md'), /without the line it replies in text/);
});

test('the executor writes natively only inside the SAI temp root; the explorer keeps its put; the subagent is unchanged', () => {
  assert.equal(registry.profiles.executor.write, 'temp');
  assert.equal(registry.profiles['task'].write, true);
  assert.deepEqual(registry.profiles.research.shell.filter(rule => /transfer\.js/.test(rule)), ['node {sai}/tools/transfer.js put *']);
  const claude = translate(registry, 'executor', 'claude');
  const tools = claude.tools.split(', ');
  const allowed = claude.allowedTools.split(', ');
  assert.ok(tools.includes('Write') && !tools.includes('Edit'));
  assert.ok(!allowed.includes('Write') && !allowed.includes('Edit'));
  assert.ok(allowed.some(entry => /^Edit\(.*\/sai\/\*\*\)$/.test(entry)), 'one write rule scoped to the SAI temp root');
  const edits = translate(registry, 'executor', 'opencode').permissions.filter(rule => rule.action === 'edit' && rule.effect === 'allow');
  assert.equal(edits.length, 1);
  assert.ok(edits[0].resource.endsWith('/sai/*'));
});

test('every profile that dispatches a budget agent allows transfer.js open, accept, watch, and close', () => {
  const needs = ['open', 'accept', 'watch', 'close'];
  const checked = [];
  for (const name of Object.keys(registry.profiles)) {
    const profile = resolveProfile(registry, name);
    if (!(profile.delegate || []).some(target => ['explorer', 'executor', 'budget'].includes(target))) continue;
    const shell = profile.shell || [];
    for (const sub of needs) {
      const covered = shell.includes('*') || shell.includes('node {sai}/*') || shell.includes('node {sai}/tools/transfer.js *')
        || shell.includes(`node {sai}/tools/transfer.js ${sub} *`);
      assert.ok(covered, `${name} allows transfer.js ${sub}`);
    }
    checked.push(name);
  }
  assert.ok(checked.includes('implement-command') && checked.includes('explore-command') && checked.includes('worker-research'));
});

test('a saved report whose message was lost is found by the ledger scan, accepted once, and then reads as already accepted', t => {
  const { dir } = transfer.open('claude');
  t.after(() => transfer.close(dir));
  const draft = transfer.put(dir, 'explorer-1.draft.md', Buffer.from('files: []\nwarming: false\n'), { exclusive: true });
  assert.ok(draft.path.endsWith('explorer-1.draft.md'));
  const reference = transfer.put(dir, 'explorer-1.md', Buffer.from('files: []\nwarming: false\n'), { exclusive: true });
  assert.throws(() => transfer.put(dir, 'explorer-1.md', Buffer.from('other'), { exclusive: true }), /exist/i, 'a name is never overwritten');

  const paths = emptyPaths();
  t.after(() => fs.rmSync(path.dirname(paths), { recursive: true, force: true }));
  const scan = () => spawnSync(process.execPath, [path.join(repoRoot, 'sai/tools/transfer.js'), 'watch', '--dir', dir,
    '--input-file', paths, '--settle', '0s', '--max', '1s'], { encoding: 'utf8' });
  const found = JSON.parse(scan().stdout);
  assert.deepEqual(found.reports.map(entry => entry.path), [reference.path], 'the draft is never a report');

  const first = transfer.accept(dir, reference);
  assert.equal(first.already, false);
  assert.equal(first.recorded, true);
  assert.equal(transfer.accept(dir, reference).already, true, 'a repeated reference is a cache-warming repeat');
  assert.deepEqual(JSON.parse(scan().stdout).reports, [], 'nothing unledgered is left');
});

function emptyPaths() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-delivery-'));
  const file = path.join(folder, 'paths.json');
  fs.writeFileSync(file, '[]');
  return file;
}
