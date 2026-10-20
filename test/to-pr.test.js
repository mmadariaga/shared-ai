'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');
const tool = require('../sai/tools/to-pr');
const { resolveTempRoot } = require('../sai/tools/temp-root');
const registry = require('../skills/universal/to-pr/providers/registry.json');

function fixture(provider, existing = false) {
  const host = provider === 'github' ? 'github.com' : 'gitlab.example.com';
  const url = `https://${host}/team/repo`;
  const state = { head: 'a'.repeat(40), remoteHead: 'a'.repeat(40), rows: [], mutations: [], calls: [], labels: ['bug', 'enhancement', 'performance', 'wontfix'] };
  const row = (title = 'feat: old content', description = 'Old description') => provider === 'github'
    ? { number: 7, html_url: `${url}/pull/7`, title, body: description, updated_at: 'version', head: { ref: 'feature', repo: { id: 9 } }, base: { ref: 'main' } }
    : { iid: 7, web_url: `${url}/-/merge_requests/7`, title, description, updated_at: 'version', source_project_id: 9, target_project_id: 9, source_branch: 'feature', target_branch: 'main' };
  if (existing) state.rows = [row()];
  const io = { registry, run(command, args, input) {
    state.calls.push({ command, args, input });
    if (command === 'git') {
      if (args[0] === 'symbolic-ref') return 'feature\n';
      if (args[0] === 'rev-parse') return state.head;
      if (args[0] === 'status') return ' M pending.txt\n';
      if (args[0] === 'remote') return args.length === 1 ? 'origin\n' : `${url}.git\n`;
      if (args[0] === 'ls-remote') return state.remoteHead ? `${state.remoteHead}\trefs/heads/feature\n` : '';
      if (args[0] === 'push') { state.mutations.push({ command, args }); state.remoteHead = state.head; return ''; }
      if (args[0] === 'log') return `${state.head}\nfeat: add feature`;
      if (args[0] === 'diff') return 'committed diff';
      throw new Error('Unexpected Git operation');
    }
    if (command === 'glab' && args[0] === 'repo') return JSON.stringify({ id: 9, web_url: url, path_with_namespace: 'team/repo', default_branch: 'main', visibility: 'private', archived: false });
    assert.equal(command, provider === 'github' ? 'gh' : 'glab');
    const endpoint = args[1], method = args[args.indexOf('--method') + 1];
    if (endpoint === 'repos/team/repo') return JSON.stringify({ id: 9, html_url: url, default_branch: 'main', private: false, archived: false });
    if (method === 'GET' && endpoint === 'user') return JSON.stringify(provider === 'github' ? { login: 'octo' } : { id: 5, username: 'octo' });
    if (method === 'GET' && /\/labels\?/.test(endpoint)) return JSON.stringify(Number(/&page=(\d+)/.exec(endpoint)[1]) === 1 ? state.labels.slice(0, 100).map(name => ({ name })) : state.labels.slice(100, 200).map(name => ({ name })));
    if (method === 'GET') return JSON.stringify(state.rows);
    const body = JSON.parse(input);
    state.mutations.push({ command, method, endpoint, body });
    if (provider === 'github' && /\/issues\/\d+$/.test(endpoint)) {
      // Second call after creation: the assignee and labels of the created pull request.
      if (state.labelCallFails) throw new Error('Labelling refused');
      Object.assign(state.rows[0], { assignees: (body.assignees || []).map(login => ({ login })), labels: (body.labels || []).map(name => ({ name })) });
      return '{}';
    }
    state.rows = [row(body.title, body.body ?? body.description)];
    if (provider === 'gitlab' && !state.dropLabels) Object.assign(state.rows[0], { assignees: (body.assignee_ids || []).map(() => ({ id: 5, username: 'octo' })), labels: body.labels ? body.labels.split(',') : [] });
    if (state.loseResponse) throw new Error('Lost response');
    return JSON.stringify(state.rows[0]);
  } };
  return { state, io, request: { provider, repository: provider === 'github' ? 'team/repo' : url, base: 'main', remote: 'origin', title: 'feat: add feature', description: '## Summary\nCommitted feature' } };
}
function temporaryDirectory(t, prefix) {
  const directory = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), prefix));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}
function receipt(t) {
  const directory = temporaryDirectory(t, 'to-pr-test-');
  return path.join(directory, 'receipt.json');
}

// E9 / I10: GitHub/GitLab regressions below cover create/update, independent
// questions/approval tokens, forbidden mutations, recovery and optional context.
// All provider calls are mocked; these are not live Azure publication tests.
for (const provider of ['github', 'gitlab']) {
  for (const existing of [false, true]) test(`${provider} ${existing ? 'update' : 'create'} publishes exact content and reads it back`, t => {
    const { request, io, state } = fixture(provider, existing);
    const ready = tool.query(request, io);
    assert.equal(Boolean(ready.proposal.existing), existing);
    const result = tool.publish({ ...request, approved: true, confirmation: ready.confirmation, receipt: receipt(t) }, io);
    assert.equal(result.status, 'complete');
    // GitHub sets the assignee on the created pull request with a second call on its issue.
    assert.equal(state.mutations.length, provider === 'github' && !existing ? 2 : 1);
    assert.deepEqual(Object.keys(state.mutations[0].body).sort(), existing
      ? (provider === 'github' ? ['body', 'title'] : ['description', 'title'])
      : (provider === 'github' ? ['base', 'body', 'head', 'title'] : ['assignee_ids', 'description', 'source_branch', 'target_branch', 'title']));
  });
  test(`${provider} approvals are independent, declines mutate nothing and changed content invalidates approval`, t => {
    const { request, io, state } = fixture(provider);
    const ready = tool.query(request, io);
    assert.throws(() => tool.publish({ ...request, confirmation: ready.confirmation }, io), /approval/);
    assert.throws(() => tool.publish({ ...request, approved: true, confirmation: ready.confirmation, description: 'Changed' }, io), /approval/);
    state.remoteHead = null;
    assert.throws(() => tool.publish({ ...request, approved: true, confirmation: ready.confirmation, receipt: receipt(t) }, io), /push approval/);
    assert.throws(() => tool.push({ ...request, approved: true, confirmation: ready.confirmation }, io), /push approval/);
    assert.equal(state.mutations.length, 0);
    const pushReady = tool.pushQuery(request, io);
    assert.throws(() => tool.push({ ...request, confirmation: pushReady.confirmation }, io), /push approval/);
    assert.equal(tool.push({ ...request, approved: true, confirmation: pushReady.confirmation }, io).status, 'complete');
    assert.equal(state.mutations[0].command, 'git');
    assert.ok(!state.mutations[0].args.some(arg => /force/.test(arg)));
    assert.equal(tool.publish({ ...request, approved: true, confirmation: ready.confirmation, receipt: receipt(t) }, io).status, 'complete');
  });
  test(`${provider} uncertain creation uses read-only recovery and never creates duplicates`, t => {
    const { request, io, state } = fixture(provider);
    const ready = tool.query(request, io), file = receipt(t);
    state.loseResponse = true;
    assert.equal(tool.publish({ ...request, approved: true, confirmation: ready.confirmation, receipt: file }, io).status, 'uncertain');
    assert.equal(tool.recover({ receipt: file }, io).status, 'complete');
    assert.equal(state.mutations.length, 1);
    assert.equal(tool.query(request, io).status, 'no_changes');
    assert.throws(() => tool.publish({ ...request, approved: true, confirmation: ready.confirmation, receipt: receipt(t) }, io), /approval/);
    assert.equal(state.mutations.length, 1);
  });
  test(`${provider} stale baseline, moved HEAD, duplicate matches and tool errors block`, () => {
    const { request, io, state } = fixture(provider, true);
    const ready = tool.query(request, io);
    state.rows[0].title = 'feat: concurrent change';
    assert.throws(() => tool.publish({ ...request, approved: true, confirmation: ready.confirmation }, io), /approval/);
    state.head = 'b'.repeat(40);
    assert.throws(() => tool.publish({ ...request, approved: true, confirmation: ready.confirmation }, io), /approval/);
    state.rows.push({ ...state.rows[0], number: 8, iid: 8 });
    assert.throws(() => tool.query(request, io), /Multiple/);
    assert.throws(() => tool.query(request, { registry, run() { throw new Error('Authentication missing'); } }), /Authentication/);
    assert.equal(state.mutations.length, 0);
  });
  test(`${provider} collection is committed Git only and OpenSpec is optional`, t => {
    const { io } = fixture(provider);
    const directory = temporaryDirectory(t, 'to-pr-context-');
    io.cwd = directory;
    const absent = tool.collect({ base: 'main', change: 'optional' }, io);
    assert.deepEqual(absent.context, {});
    assert.match(absent.pending, /pending.txt/);
    assert.equal(absent.diff, 'committed diff');
    fs.mkdirSync(path.join(directory, 'openspec/changes/optional'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'openspec/changes/optional/proposal.md'), 'Optional purpose');
    assert.equal(tool.collect({ base: 'main', change: 'optional' }, io).context.proposal, 'Optional purpose');
  });
}

test('resolution uses backlog precedence, asks on ambiguity and supports explicit self-hosted GitLab', () => {
  const { io } = fixture('gitlab');
  assert.equal(tool.resolve({ explicit: {}, config: {}, remotes: [] }, registry, io).status, 'needs_input');
  assert.equal(tool.resolve({ explicit: {}, config: {}, remotes: ['git@gitlab.example.com:team/repo.git'] }, registry, io).status, 'needs_input');
  assert.equal(tool.resolve({ explicit: { provider: 'unknown' }, config: {}, remotes: [] }, registry, io).status, 'unsupported');
  assert.equal(tool.resolve({ explicit: { provider: 'gitlab', repository: 'https://gitlab.example.com/team/repo' }, config: {}, remotes: [] }, registry, io).repository, 'https://gitlab.example.com/team/repo');
});

test('I1 / I10: registry metadata selects hosts, adapter and instructions without a provider enumeration', t => {
  const { io, request, state } = fixture('github');
  const entry = { id: 'test-provider', hosts: ['test.example'], capabilities: ['publish'], instructions: 'providers/test-provider.md', adapter: 'to-pr-github.js' };
  io.registry = { providers: [entry] };
  const resolved = tool.resolve({ remotes: ['https://test.example/team/repo.git'] }, io.registry, io);
  assert.deepEqual(resolved, { status: 'resolved', provider: entry.id, repository: 'team/repo', project: undefined, instructions: entry.instructions, adapter: entry.adapter });
  request.provider = entry.id;
  const ready = tool.query(request, io);
  assert.equal(ready.proposal.provider, entry.id);
  assert.throws(() => tool.publish({ ...request, confirmation: ready.confirmation }, io), /approval/);
  assert.equal(state.mutations.length, 0);
  const file = receipt(t);
  assert.equal(tool.publish({ ...request, approved: true, confirmation: ready.confirmation, receipt: file }, io).status, 'complete');
  assert.equal(tool.recover({ receipt: file }, io).status, 'complete');
  assert.equal(state.mutations.length, 2, 'Recovery must not publish');
  assert.equal(tool.query(request, io).status, 'no_changes');
});

test('I1 / I10: unsafe references and unregistered adapters block before provider or Git operations', () => {
  const { request, io, state } = fixture('github');
  for (const overrides of [
    { adapter: '../to-pr-github.js' },
    { adapter: 'to-backlog-github.js' },
    { instructions: '../github.md' },
    { instructions: 'providers/../../github.md' },
  ]) {
    const selected = { providers: [{ ...registry.providers[0], ...overrides }] };
    assert.throws(() => tool.resolve({ explicit: { provider: 'github', repository: 'team/repo' } }, selected, io), /Invalid/);
    assert.throws(() => tool.query(request, { ...io, registry: selected }), /Invalid/);
  }
  for (const provider of ['unknown', 'unregistered-provider']) {
    assert.equal(tool.resolve({ explicit: { provider } }, registry, io).status, 'unsupported');
    assert.throws(() => tool.query({ ...request, provider }, io), /Unsupported/);
  }
  assert.equal(state.calls.length, 0);
  assert.equal(state.mutations.length, 0);
  assert.deepEqual(registry.providers.map(entry => entry.id), ['github', 'gitlab', 'azuredevops'], 'Azure extends the same provider registry');
});

test('E9 / I1 / I10: destination precedence and unknown-host questions are unchanged', () => {
  const { io, state } = fixture('gitlab');
  const configured = { provider: 'gitlab', repository: 'https://gitlab.example.com/team/repo' };
  const explicit = tool.resolve({ explicit: { repository: 'https://github.com/other/repo' }, config: configured, remotes: ['https://gitlab.com/team/repo'] }, registry, io);
  assert.equal(explicit.provider, 'github');
  assert.equal(explicit.repository, 'other/repo');
  assert.equal(explicit.instructions, 'providers/github.md');
  const configuredResult = tool.resolve({ config: configured, remotes: ['https://github.com/other/repo'] }, registry, io);
  assert.equal(configuredResult.provider, 'gitlab');
  assert.equal(configuredResult.repository, configured.repository);
  assert.equal(tool.resolve({ remotes: ['https://gitlab.com/team/repo'] }, registry, io).provider, 'gitlab');
  const calls = state.calls.length;
  const unknown = tool.resolve({ explicit: { repository: 'https://unknown.example/team/repo' } }, registry, io);
  assert.deepEqual(unknown, { status: 'needs_input', reason: 'provider-ambiguous', unknownHosts: ['unknown.example'] });
  assert.equal(state.calls.length, calls, 'Unknown-host clarification runs no commands');
  assert.equal(state.mutations.length, 0);
});

test('I1 / I10: CLI operations honor the supplied registry rather than a fixed adapter list', t => {
  const directory = temporaryDirectory(t, 'to-pr-registry-');
  const file = path.join(directory, 'registry.json');
  fs.writeFileSync(file, JSON.stringify({ providers: [] }));
  const result = spawnSync(process.execPath, ['sai/tools/to-pr.js', 'destination', file], {
    encoding: 'utf8', input: JSON.stringify({ provider: 'github', repository: 'team/repo' }),
  });
  assert.equal(result.status, 2);
  assert.deepEqual(JSON.parse(result.stdout), { status: 'blocked', message: 'Unsupported provider' });
});

test('temporary preparation returns a private receipt path under the SAI temp root and rejects an unknown harness', t => {
  assert.throws(() => tool.prepare({ harness: 'unknown' }), /Expected harness/);
  const result = tool.prepare({ harness: 'claude' });
  const directory = path.dirname(result.receipt);
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  assert.equal(result.status, 'ready');
  assert.ok(path.isAbsolute(result.receipt));
  assert.equal(path.dirname(directory), fs.realpathSync(resolveTempRoot('claude')));
  assert.match(path.basename(directory), /^to-pr-/);
  if (process.platform !== 'win32') assert.equal(fs.statSync(directory).mode & 0o777, 0o700);
});

test('missing required OpenCode temporary root gives a concrete blocker without repairing or replacing it', () => {
  const reads = [];
  assert.throws(() => tool.prepare({ harness: 'opencode' }, {
    platform: 'linux',
    uid: 1000,
    io: {
      lstatSync(file) { reads.push(file); throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); },
      mkdirSync() { assert.fail('Must not create the shared root'); },
      mkdtempSync() { assert.fail('Must not create a replacement temporary directory'); },
      chmodSync() { assert.fail('Must not repair the shared root'); },
    },
  }), /Required harness temporary root \/tmp\/opencode is missing/);
  assert.deepEqual(reads, ['/tmp/opencode']);
});

for (const provider of ['github', 'gitlab']) test(`${provider} rejects repository, symlink and unsafe receipts before publication or recovery`, t => {
  const { request, io, state } = fixture(provider);
  const ready = tool.query(request, io);
  const directory = temporaryDirectory(t, 'to-pr-receipt-boundary-');
  const valid = path.join(directory, 'valid.json');
  fs.writeFileSync(valid, '{}', { mode: 0o600 });
  const linkedFile = path.join(directory, 'linked-file.json');
  fs.symlinkSync(valid, linkedFile);
  const alias = path.join(directory, 'alias');
  const privateDirectory = path.join(directory, 'private');
  fs.mkdirSync(privateDirectory, { mode: 0o700 });
  fs.symlinkSync(privateDirectory, alias, 'dir');
  const paths = [
    [path.resolve('to-pr-rejected-receipt.json'), /outside the repository/],
    [linkedFile, /regular, unlinked private file/],
    [path.join(alias, 'receipt.json'), /symbolic links/],
  ];
  if (process.platform !== 'win32') {
    const unsafeDirectory = path.join(directory, 'unsafe');
    fs.mkdirSync(unsafeDirectory);
    fs.chmodSync(unsafeDirectory, 0o755);
    const unsafeFile = path.join(directory, 'unsafe-file.json');
    fs.writeFileSync(unsafeFile, '{}');
    fs.chmodSync(unsafeFile, 0o644);
    paths.push([path.join(unsafeDirectory, 'receipt.json'), /private and owned/], [unsafeFile, /private and owned/]);
  }
  for (const [file, error] of paths) {
    assert.throws(() => tool.publish({ ...request, approved: true, confirmation: ready.confirmation, receipt: file }, io), error);
    const calls = state.calls.length;
    assert.throws(() => tool.recover({ receipt: file }, io), error);
    assert.equal(state.calls.length, calls, 'Recovery must validate the file before trusting content or contacting the provider');
  }
  assert.equal(state.mutations.length, 0);
  assert.equal(fs.existsSync(path.resolve('to-pr-rejected-receipt.json')), false);
  assert.equal(fs.existsSync(path.join(privateDirectory, 'receipt.json')), false);
  assert.equal(fs.readFileSync(valid, 'utf8'), '{}');
});

test('blocked CLI recovery retains the supplied prepared receipt path', t => {
  const result = { receipt: receipt(t) };
  const run = spawnSync(process.execPath, ['sai/tools/to-pr.js', 'recover', 'skills/universal/to-pr/providers/registry.json'], {
    encoding: 'utf8', input: JSON.stringify({ receipt: result.receipt }),
  });
  assert.equal(run.status, 2);
  const payload = JSON.parse(run.stdout);
  assert.equal(payload.status, 'blocked');
  assert.equal(payload.receipt, result.receipt);
});

test('I2 / I10: skill presents full content before one combined approval, covers push and publication and discloses providers conditionally', () => {
  const text = fs.readFileSync('skills/universal/to-pr/SKILL.md', 'utf8');
  assert.ok(text.indexOf('Show the complete proposed title') < text.indexOf('Then ask:'));
  assert.ok(text.indexOf('Run `push-query`') < text.indexOf('Then ask:'));
  assert.match(text, /load\s+only the returned/);
  assert.match(text, /returned `instructions` reference/);
  assert.doesNotMatch(text, /providers\/(?:github|gitlab|azuredevops)\.md/);
  assert.match(text, /disable-model-invocation: true/);
  assert.ok(text.replace(/\s+/g, ' ').includes('Push this commit to this remote branch without force and publish the title and description above?'));
  assert.match(text, /"Approve PR message and push branch", "Edit", "Cancel"/);
  assert.match(text, /"Approve PR message", "Edit", "Cancel"/);
  assert.match(text, /`PR` on GitHub and Azure Repos and `MR` on GitLab/);
  assert.match(text, /Cancel runs none of the operations in that question and keeps the draft/);
  assert.match(text, /a completed push is never repeated/);
  assert.match(text, /never combined or interchangeable/);
  assert.doesNotMatch(text, /Independently authorize any push/);
  assert.doesNotMatch(text, /Offer approve or decline/);
  assert.match(text, /Any content, destination, baseline or HEAD change/);
  assert.match(text, /every entry of the `query` result's `warnings` verbatim before approval/);
  assert.match(text, /Claude Code.*AskUserQuestion/);
  assert.match(text, /OpenCode[\s\S]*question/);
});

for (const provider of ['github', 'gitlab']) {
  test(`${provider} combined approval pushes then publishes with separate non-interchangeable tokens`, t => {
    const { request, io, state } = fixture(provider);
    state.remoteHead = null;
    const ready = tool.query(request, io), pushReady = tool.pushQuery(request, io);
    assert.equal(pushReady.status, 'ready');
    assert.notEqual(ready.confirmation, pushReady.confirmation);
    assert.throws(() => tool.push({ ...request, approved: true, confirmation: ready.confirmation }, io), /push approval/);
    assert.throws(() => tool.publish({ ...request, approved: true, confirmation: pushReady.confirmation, receipt: receipt(t) }, io), /approval/);
    assert.equal(state.mutations.length, 0);
    assert.equal(tool.push({ ...request, approved: true, confirmation: pushReady.confirmation }, io).status, 'complete');
    assert.equal(tool.publish({ ...request, approved: true, confirmation: ready.confirmation, receipt: receipt(t) }, io).status, 'complete');
    assert.equal(state.mutations[0].command, 'git');
    assert.ok(!state.mutations[0].args.some(arg => /force/.test(arg)));
    assert.equal(state.mutations.length, provider === 'github' ? 3 : 2);
  });
  test(`${provider} publication-only approval needs no push when the remote branch holds the commit`, t => {
    const { request, io, state } = fixture(provider);
    const ready = tool.query(request, io);
    assert.equal(tool.pushQuery(request, io).status, 'no_changes');
    assert.equal(tool.publish({ ...request, approved: true, confirmation: ready.confirmation, receipt: receipt(t) }, io).status, 'complete');
    assert.ok(state.mutations.every(mutation => mutation.command !== 'git'));
  });
  test(`${provider} failed push skips publication and leaves the remote history untouched`, t => {
    const { request, io, state } = fixture(provider);
    state.remoteHead = null;
    const ready = tool.query(request, io), pushReady = tool.pushQuery(request, io), run = io.run;
    io.run = (command, args, input) => {
      if (command === 'git' && args[0] === 'push') throw new Error('Push rejected');
      return run(command, args, input);
    };
    assert.throws(() => tool.push({ ...request, approved: true, confirmation: pushReady.confirmation }, io), /Push rejected/);
    assert.throws(() => tool.publish({ ...request, approved: true, confirmation: ready.confirmation, receipt: receipt(t) }, io), /push approval/);
    assert.equal(state.mutations.length, 0);
    assert.equal(state.remoteHead, null);
  });
  test(`${provider} unverified push is reported and publication stays blocked`, t => {
    const { request, io, state } = fixture(provider);
    state.remoteHead = null;
    const ready = tool.query(request, io), pushReady = tool.pushQuery(request, io), run = io.run;
    io.run = (command, args, input) => {
      if (command === 'git' && args[0] === 'push') { state.mutations.push({ command, args }); return ''; }
      return run(command, args, input);
    };
    assert.throws(() => tool.push({ ...request, approved: true, confirmation: pushReady.confirmation }, io), /could not be verified/);
    assert.throws(() => tool.publish({ ...request, approved: true, confirmation: ready.confirmation, receipt: receipt(t) }, io), /push approval/);
    assert.equal(state.mutations.length, 1);
  });
  test(`${provider} failed publication after a verified push keeps the pushed branch and recovers read-only`, t => {
    const { request, io, state } = fixture(provider);
    state.remoteHead = null;
    const ready = tool.query(request, io), pushReady = tool.pushQuery(request, io), file = receipt(t);
    assert.equal(tool.push({ ...request, approved: true, confirmation: pushReady.confirmation }, io).status, 'complete');
    state.loseResponse = true;
    assert.equal(tool.publish({ ...request, approved: true, confirmation: ready.confirmation, receipt: file }, io).status, 'uncertain');
    assert.equal(state.remoteHead, state.head);
    assert.equal(tool.pushQuery(request, io).status, 'no_changes');
    const mutations = state.mutations.length;
    assert.equal(tool.recover({ receipt: file }, io).status, 'complete');
    assert.equal(state.mutations.length, mutations);
  });
}

test('E9 / I2 / I10: both harnesses retain thin explicit-invocation wrappers and bounded tool access', () => {
  const manifest = require('../sai/install-manifest.json');
  const { translate } = require('../bin/capabilities');
  for (const harness of ['claude', 'opencode']) {
    const wrapper = fs.readFileSync(`commands/${harness}/to-pr.md`, 'utf8');
    assert.match(wrapper, /Follow that skill in the current conversation/);
    assert.doesNotMatch(wrapper, /providers\//);
    assert.equal(manifest.capabilities.assignments.commands['to-pr'], 'to-pr-command');
    const profile = translate(manifest.capabilities, 'to-pr-command', harness).profile;
    assert.equal(profile.question, true);
    assert.deepEqual(profile.shell, ['node {sai}/tools/to-pr.js *']);
    assert.ok(profile.skills.includes('to-pr'));
    assert.ok(profile.skills.includes('safe-operations'));
  }
});

test('E9 / I1 / I2 / I10: both harnesses install to-pr and retire managed sai-pr copies while preserving modified and user documents', t => {
  const flow = require('../bin/install-flow');
  const capabilities = require('../bin/capabilities');
  // Pin to the last revision that still shipped sai-pr, so the test survives later commits.
  const retired = execFileSync('git', ['log', '-1', '--diff-filter=D', '--format=%H', '--', 'commands/claude/sai-pr.md'], { encoding: 'utf8' }).trim();
  const old = JSON.parse(execFileSync('git', ['show', `${retired}^:sai/install-manifest.json`], { encoding: 'utf8' }));
  for (const harness of ['claude', 'opencode']) {
    const directory = temporaryDirectory(t, 'to-pr-install-');
    fs.mkdirSync(path.join(directory, 'commands'), { recursive: true });
    const original = execFileSync('git', ['show', `${retired}^:commands/${harness}/sai-pr.md`], { encoding: 'utf8' });
    const file = path.join(directory, 'commands/sai-pr.md');
    fs.writeFileSync(file, capabilities.projectSource(original, old.capabilities, 'commands', 'sai-pr', harness));
    fs.writeFileSync(path.join(directory, 'pr.md'), 'User document');
    if (harness === 'claude') flow.installClaude(directory); else flow.installOpencode(directory);
    assert.equal(fs.existsSync(file), false);
    for (const relative of ['skills/to-pr/SKILL.md', 'skills/to-pr/providers/registry.json', 'skills/to-pr/providers/github.md', 'skills/to-pr/providers/gitlab.md', 'skills/to-pr/description-format.md', 'sai/tools/to-pr.js', 'sai/tools/to-pr-github.js', 'sai/tools/to-pr-gitlab.js']) assert.ok(fs.existsSync(path.join(directory, relative)), relative);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, 'skills/to-pr/providers/registry.json'), 'utf8')), registry);
    assert.equal(fs.readFileSync(path.join(directory, 'sai/tools/to-pr.js'), 'utf8'), fs.readFileSync('sai/tools/to-pr.js', 'utf8'));
    assert.match(fs.readFileSync(path.join(directory, 'skills/to-pr/SKILL.md'), 'utf8'), /returned `instructions` reference/);
    assert.equal(fs.readFileSync(path.join(directory, 'pr.md'), 'utf8'), 'User document');
    fs.writeFileSync(file, 'User override');
    flow.cleanupRetiredProjections(harness, { base: directory });
    assert.equal(fs.readFileSync(file, 'utf8'), 'User override');
  }
});

// Closing references (E1-E6, I1-I3): the tool owns the closing block at the end of the description.
const { encode } = require('../sai/tools/backlog-slice-identity');
const START = '<!-- sai-closing-refs:start -->', END = '<!-- sai-closing-refs:end -->';
const block = (...lines) => `${START}\n${lines.join('\n')}\n${END}`;
const githubIssue = number => `https://github.com/team/repo/issues/${number}`;
const gitlabIssue = number => `https://gitlab.example.com/team/repo/-/issues/${number}`;
// `children` maps the branch issue to its child numbers; `states` marks closed issues; `fail` breaks the provider read.
function closingFixture(provider, { log = '', source = 'feature', children = [], states = {}, fail = false, description } = {}) {
  const made = fixture(provider, description !== undefined);
  // Closing tests must not inherit this checkout's configured backlog provider.
  made.io.cwd = os.tmpdir();
  const parent = 10, issue = provider === 'github' ? githubIssue : gitlabIssue;
  if (description !== undefined) made.state.rows = [{ ...made.state.rows[0], title: 'feat: add feature', ...(provider === 'github' ? { body: description } : { description }) }];
  if (description !== undefined) {
    if (provider === 'github') made.state.rows[0].head.ref = source;
    else made.state.rows[0].source_branch = source;
  }
  const base = made.io.run;
  made.io.run = (command, args, input) => {
    if (command === 'git' && args[0] === 'log') return log;
    if (command === 'git' && args[0] === 'symbolic-ref') return `${source}\n`;
    if (command === 'gh' && args[1] === 'graphql') {
      if (fail) throw new Error('GitHub unavailable');
      const { query, variables } = JSON.parse(input);
      if (query.includes('__type(')) return JSON.stringify({ data: { __type: { fields: [{ name: 'subIssues' }] } } });
      if (query.includes('subIssues(')) return JSON.stringify({ data: { repository: { issue: { subIssues: { nodes: children.map(number => ({ url: issue(number) })), pageInfo: { hasNextPage: false } } } } } });
      return JSON.stringify({ data: { repository: { nameWithOwner: 'team/repo', isArchived: false, issueOrPullRequest: { __typename: 'Issue', number: variables.number, url: issue(variables.number), title: 'Issue', body: '', state: states[variables.number] || 'OPEN' } } } });
    }
    if (command === 'glab' && args[0] === 'repo') return JSON.stringify({ ...JSON.parse(base(command, args, input)), issues_enabled: true });
    if (command === 'glab' && args[0] === 'api' && /issues\/\d+$/.test(args[1])) {
      if (fail) throw new Error('GitLab unavailable');
      const number = Number(args[1].split('/').pop());
      const body = number === parent ? encode({ version: 1, platform: 'gitlab', role: 'parent', parent: issue(parent), slices: children.map(child => ({ change_name: `slice-${child}`, issue: issue(child), depends_on: [] })) }) : '';
      return JSON.stringify({ id: number, project_id: 9, iid: number, web_url: issue(number), issue_type: 'issue', title: 'Issue', description: body, state: states[number] === 'CLOSED' ? 'closed' : 'opened' });
    }
    return base(command, args, input);
  };
  return made;
}
const queried = (provider, options) => {
  const { request, io, state } = closingFixture(provider, options);
  return { ...tool.query({ ...request, description: options?.draft ?? request.description }, io), request, state };
};

for (const provider of ['github', 'gitlab']) {
  const other = provider === 'github' ? 'other/repo' : 'group/sub/project';
  const foreign = provider === 'github' ? 'https://gitlab.com/g/p/-/issues/3' : 'https://github.com/g/p/issues/3';
  const sameUrl = provider === 'github' ? githubIssue(7) : gitlabIssue(7);
  test(`${provider} parent and three children produce four stable closing references`, () => {
    const options = { source: 'feat/10_closing', children: [11, 12, 13], log: 'Closes team/repo#11\nCloses team/repo#12\nCloses team/repo#13' };
    const first = queried(provider, options).proposal.description;
    assert.equal(first, `## Summary\nCommitted feature\n\n${block('Closes #11', 'Closes #12', 'Closes #13', 'Closes #10')}`);
    assert.equal(queried(provider, { ...options, draft: first, description: first }).status, 'no_changes');
  });
  test(`${provider} manually written child closing references count toward parent coverage`, () => {
    const draft = 'Summary\nCloses #13';
    const options = { source: 'feat/10_closing', children: [11, 12, 13], log: 'Closes #11\nCloses #12', draft };
    const first = queried(provider, options).proposal.description;
    assert.equal(first, `${draft}\n\n${block('Closes #11', 'Closes #12', 'Closes #10')}`);
    assert.equal(queried(provider, { ...options, draft: first, description: first }).status, 'no_changes');
  });
  test(`${provider} a same-numbered issue in another repository does not cover a child`, () => {
    const result = queried(provider, { source: 'feat/10_closing', children: [11, 12, 13], log: `Closes #11\nCloses #12\nCloses ${other}#13\nRefs: #13` });
    assert.doesNotMatch(result.proposal.description, /Closes #10\b/);
    assert.match(result.proposal.description, new RegExp(`Closes ${other}#13`));
  });
  test(`${provider} E1 / E2 / I1: closing set is the keyword issues of the commits, normalized to the destination`, () => {
    const log = `${'b'.repeat(40)}\nfeat: add\nCloses #5\nFixes: ${other}#6\nresolved ${sameUrl}\nRefs: #8\nCloses #5\nCloses ${foreign}\n`;
    const result = queried(provider, { log });
    assert.equal(result.proposal.description, `## Summary\nCommitted feature\n\n${block('Closes #5', `Closes ${other}#6`, 'Closes #7')}`);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /another host/);
  });
  test(`${provider} E1: an empty closing set publishes the description without a block`, () => {
    const result = queried(provider, { log: `${'b'.repeat(40)}\nfeat: add\nRefs: #8\n` });
    assert.equal(result.proposal.description, '## Summary\nCommitted feature');
    assert.equal(result.warnings, undefined);
  });
  test(`${provider} E3: a hand-written closing line stays and the block omits that issue`, () => {
    const draft = '## Summary\nCloses #5\nDone';
    const result = queried(provider, { log: 'Closes #5\nCloses #6\n', draft });
    assert.equal(result.proposal.description, `${draft}\n\n${block('Closes #6')}`);
    assert.equal(queried(provider, { log: 'Closes #5\n', draft }).proposal.description, draft);
  });
  test(`${provider} E4: an update replaces the previous block and keeps the other text`, () => {
    const draft = `Intro\n\n## Notes\nKeep this\n\n${block('Closes #99')}`;
    const result = queried(provider, { log: 'Closes #5\n', draft, description: draft });
    assert.equal(result.proposal.description, `Intro\n\n## Notes\nKeep this\n\n${block('Closes #5')}`);
    assert.equal(result.status, 'ready');
    const same = queried(provider, { log: 'Closes #99\n', draft, description: draft });
    assert.equal(same.status, 'no_changes');
    assert.equal(queried(provider, { log: '', draft, description: draft }).proposal.description, 'Intro\n\n## Notes\nKeep this');
  });
  test(`${provider} E5 / I2: the branch issue closes only when every child is covered or already closed`, () => {
    const source = 'feat/10_closing';
    const done = queried(provider, { source, children: [11, 12, 13], states: { 13: 'CLOSED' }, log: 'Closes #11\nFixes #12\n' });
    assert.equal(done.proposal.description, `## Summary\nCommitted feature\n\n${block('Closes #11', 'Closes #12', 'Closes #10')}`);
    const pending = queried(provider, { source, children: [11, 12, 13], log: 'Closes #11\nFixes #12\n' });
    assert.equal(pending.proposal.description, `## Summary\nCommitted feature\n\n${block('Closes #11', 'Closes #12')}`);
    const leaf = queried(provider, { source, children: [], log: 'Closes #11\n' });
    assert.doesNotMatch(leaf.proposal.description, /#10/);
    const explicit = queried(provider, { source, children: [11, 12], log: 'Closes #10\n' });
    assert.equal(explicit.proposal.description, `## Summary\nCommitted feature\n\n${block('Closes #10')}`);
    assert.equal(queried(provider, { source: 'feat/abc_closing', children: [11], log: 'Closes #11\n' }).proposal.description.includes('#10'), false);
  });
  test(`${provider} E6: a failed provider read leaves the parent out and warns before approval`, () => {
    const result = queried(provider, { source: 'feat/10_closing', fail: true, log: 'Closes #11\n' });
    assert.equal(result.proposal.description, `## Summary\nCommitted feature\n\n${block('Closes #11')}`);
    assert.match(result.warnings[0], /#10.*not evaluated/);
  });
}
test('I3: publication writes the block into the created request exactly as approved', t => {
  const { request, io, state } = closingFixture('github', { log: 'Closes #5\n' });
  const ready = tool.query(request, io);
  const result = tool.publish({ ...request, approved: true, confirmation: ready.confirmation, receipt: receipt(t) }, io);
  assert.equal(result.status, 'complete');
  assert.equal(state.mutations[0].body.body, `## Summary\nCommitted feature\n\n${block('Closes #5')}`);
});

// Assignee and labels on creation (E1-E10, I1-I6): the current user plus existing type/area labels.
const labelCalls = state => state.calls.filter(call => call.command !== 'git' && (call.args[1] === 'user' || /\/labels\?/.test(call.args[1])));
for (const provider of ['github', 'gitlab']) {
  test(`${provider} labelling: creation reads the user and every label page, keeps only listed labels and applies them`, t => {
    const { request, io, state } = fixture(provider);
    state.labels = Array.from({ length: 120 }, (_, index) => `label-${index}`).concat(['bug', 'performance']);
    const ready = tool.query({ ...request, labels: ['bug', 'bug', 'performance', 'invented', 'label-3'] }, io);
    assert.equal(ready.available_labels.length, 122, 'E6: every page is read');
    assert.deepEqual(ready.proposal.labels, ['bug', 'performance', 'label-3'], 'E5: exact names only, no duplicates');
    assert.equal(ready.proposal.assignee.login, 'octo');
    assert.match(ready.warnings.join('\n'), /dropped: invented/);
    assert.notEqual(tool.query({ ...request, labels: ['bug'] }, io).confirmation, ready.confirmation, 'I2: labels enter the digest');
    const chosen = { ...request, labels: ['bug', 'performance', 'label-3'] };
    const result = tool.publish({ ...chosen, approved: true, confirmation: tool.query(chosen, io).confirmation, receipt: receipt(t) }, io);
    assert.equal(result.status, 'complete');
    assert.equal(result.warnings, undefined);
    assert.deepEqual([...result.request.labels].sort(), ['bug', 'label-3', 'performance']);
    assert.deepEqual(result.request.assignees, ['octo'], 'I4: the actual assignee and labels are reported');
    if (provider === 'github') {
      assert.deepEqual(state.mutations.map(item => `${item.method} ${item.endpoint}`), ['POST repos/team/repo/pulls', 'PATCH repos/team/repo/issues/7']);
      assert.deepEqual(state.mutations[1].body, { assignees: ['octo'], labels: ['bug', 'performance', 'label-3'] });
    } else {
      assert.equal(state.mutations.length, 1);
      assert.deepEqual([state.mutations[0].body.assignee_ids, state.mutations[0].body.labels], [[5], 'bug,performance,label-3']);
    }
  });
  test(`${provider} labelling: a request without a matching label publishes with the assignee only`, t => {
    const { request, io, state } = fixture(provider);
    state.labels = [];
    const chosen = { ...request, labels: ['bug'] };
    const ready = tool.query(chosen, io);
    assert.deepEqual(ready.proposal.labels, []);
    assert.equal(tool.publish({ ...chosen, approved: true, confirmation: ready.confirmation, receipt: receipt(t) }, io).status, 'complete');
    assert.ok(!state.mutations.some(item => item.body.labels));
  });
  test(`${provider} labelling: unreadable user or labels warn and never stop publication`, t => {
    const { request, io, state } = fixture(provider);
    const run = io.run;
    io.run = (command, args, input) => {
      if (command !== 'git' && (args[1] === 'user' || /\/labels\?/.test(args[1]))) throw new Error('Forbidden');
      return run(command, args, input);
    };
    const chosen = { ...request, labels: ['bug'] };
    const ready = tool.query(chosen, io);
    assert.equal(ready.warnings.length, 3, 'E3: user, labels and the dropped request are named');
    assert.equal(ready.proposal.assignee, undefined);
    assert.deepEqual(ready.proposal.labels, []);
    assert.equal(tool.publish({ ...chosen, approved: true, confirmation: ready.confirmation, receipt: receipt(t) }, io).status, 'complete');
    assert.equal(state.mutations.length, 1);
  });
  test(`${provider} labelling: an update reads and sends no assignee or labels`, t => {
    const { request, io, state } = fixture(provider, true);
    const chosen = { ...request, labels: ['bug'] };
    const ready = tool.query(chosen, io);
    assert.equal(labelCalls(state).length, 0, 'E8: nothing is read');
    assert.equal(ready.proposal.assignee, undefined);
    assert.equal(ready.proposal.labels, undefined);
    assert.equal(ready.proposal.existing.labels, undefined);
    assert.equal(tool.publish({ ...chosen, approved: true, confirmation: ready.confirmation, receipt: receipt(t) }, io).status, 'complete');
    assert.deepEqual(Object.keys(state.mutations[0].body).sort(), provider === 'github' ? ['body', 'title'] : ['description', 'title']);
  });
  test(`${provider} labelling: an assignee or label the provider silently drops is reported as a difference`, t => {
    const { request, io, state } = fixture(provider);
    const run = io.run;
    // The provider accepts the creation but keeps neither the assignee nor the labels.
    io.run = (command, args, input) => {
      const out = run(command, args, input);
      if (command !== 'git' && args[0] === 'api' && args[args.indexOf('--method') + 1] !== 'GET') Object.assign(state.rows[0], { assignees: [], labels: [] });
      return out;
    };
    const chosen = { ...request, labels: ['bug'] };
    const ready = tool.query(chosen, io);
    const result = tool.publish({ ...chosen, approved: true, confirmation: ready.confirmation, receipt: receipt(t) }, io);
    assert.equal(result.status, 'complete', 'E10: the request counts as published');
    assert.equal(result.warnings.length, 2);
    assert.match(result.warnings.join('\n'), /missing the approved assignee: octo/);
    assert.match(result.warnings.join('\n'), /missing the approved labels: bug/);
  });
}
test('labelling: a failed second GitHub call keeps the created request and warns with its URL', t => {
  const { request, io, state } = fixture('github');
  state.labelCallFails = true;
  const chosen = { ...request, labels: ['bug'] };
  const ready = tool.query(chosen, io);
  const result = tool.publish({ ...chosen, approved: true, confirmation: ready.confirmation, receipt: receipt(t) }, io);
  assert.equal(result.status, 'complete', 'E1: never uncertain');
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /https:\/\/github\.com\/team\/repo\/pull\/7 was created.*assignee and labels could not be applied: Labelling refused/);
  assert.equal(state.mutations.length, 2, 'no retry and no deletion');
});
test('labelling: recovery of an uncertain creation reports the actual assignee and labels without applying any', t => {
  const { request, io, state } = fixture('gitlab');
  const chosen = { ...request, labels: ['bug'] };
  const ready = tool.query(chosen, io), file = receipt(t);
  state.loseResponse = true;
  assert.equal(tool.publish({ ...chosen, approved: true, confirmation: ready.confirmation, receipt: file }, io).status, 'uncertain');
  const recovered = tool.recover({ receipt: file }, io);
  assert.equal(recovered.status, 'complete');
  assert.deepEqual(recovered.request.labels, ['bug']);
  assert.deepEqual(recovered.request.assignees, ['octo']);
  assert.equal(state.mutations.length, 1);
});

// E10: a user or label read that fails when publish re-queries never rejects an approved creation.
for (const provider of ['github', 'gitlab']) {
  test(`${provider} labelling: a read failing at publication still publishes exactly the approved assignee and labels`, t => {
    const { request, io, state } = fixture(provider);
    const chosen = { ...request, labels: ['bug', 'performance'] };
    const ready = tool.query(chosen, io);
    const run = io.run;
    io.run = (command, args, input) => {
      if (command !== 'git' && (args[1] === 'user' || /\/labels\?/.test(args[1]))) throw new Error('Rate limited');
      return run(command, args, input);
    };
    const approved = { ...chosen, assignee: ready.proposal.assignee, approved: true, confirmation: ready.confirmation };
    // Without the approved values echoed back, or with different ones, the digest still rejects.
    assert.throws(() => tool.publish({ ...chosen, approved: true, confirmation: ready.confirmation, receipt: receipt(t) }, io), /approval/);
    assert.throws(() => tool.publish({ ...approved, labels: ['bug', 'wontfix'], receipt: receipt(t) }, io), /approval/);
    assert.throws(() => tool.publish({ ...approved, assignee: { ...ready.proposal.assignee, login: 'someone-else' }, receipt: receipt(t) }, io), /approval/);
    assert.equal(state.mutations.length, 0);
    const result = tool.publish({ ...approved, receipt: receipt(t) }, io);
    assert.equal(result.status, 'complete', 'the request counts as published');
    assert.match(result.warnings.join('\n'), /could not be re-read at publication/);
    assert.deepEqual([...result.request.labels].sort(), ['bug', 'performance']);
    assert.deepEqual(result.request.assignees, ['octo']);
    const created = state.mutations.find(item => item.endpoint.endsWith(provider === 'github' ? '/issues/7' : '/merge_requests'));
    assert.deepEqual(provider === 'github' ? created.body : [created.body.assignee_ids, created.body.labels], provider === 'github' ? { assignees: ['octo'], labels: ['bug', 'performance'] } : [[5], 'bug,performance']);
  });
}

// pr.* settings and the deprecated .to-pr.json (E1-E5, E12).
function settingsProject(t, files) {
  const directory = temporaryDirectory(t, 'to-pr-settings-');
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(directory, name)), { recursive: true });
    fs.writeFileSync(path.join(directory, name), text);
  }
  return directory;
}
const SETTINGS = '.sai/settings.jsonc';
const selfHosted = ['https://git.example.com/team/repo.git'];

test('E3: pr.provider resolves a self-hosted remote without asking and names the setting', t => {
  const { io } = fixture('gitlab');
  const cwd = settingsProject(t, { [SETTINGS]: '{"pr":{"provider":"gitlab"}}' });
  assert.equal(tool.resolve({ explicit: {}, config: {}, remotes: selfHosted }, registry, io).reason, 'provider-ambiguous');
  const result = tool.resolve({ explicit: {}, remotes: selfHosted }, registry, { ...io, cwd });
  assert.deepEqual([result.status, result.provider, result.notices], ['resolved', 'gitlab', ['Project setting pr.provider: gitlab']]);
  assert.equal(result.warnings, undefined);
});

test('E5: backlog.* never chooses the pull request destination', t => {
  const { io } = fixture('gitlab');
  const cwd = settingsProject(t, { [SETTINGS]: '{"backlog":{"provider":"gitlab","repository":"g/r"}}' });
  const result = tool.resolve({ explicit: {}, remotes: selfHosted }, registry, { ...io, cwd });
  assert.deepEqual([result.status, result.reason, result.notices], ['needs_input', 'provider-ambiguous', undefined]);
});

test('E1: pr.* wins over .to-pr.json, which is reported as deprecated', t => {
  const { io } = fixture('gitlab');
  const cwd = settingsProject(t, { [SETTINGS]: '{"pr":{"provider":"gitlab"}}', '.to-pr.json': '{"provider":"github","repository":"o/r"}' });
  const result = tool.resolve({ explicit: {}, remotes: selfHosted }, registry, { ...io, cwd });
  assert.equal(result.provider, 'gitlab');
  assert.match(result.warnings.join('\n'), /\.to-pr\.json is deprecated and ignored because pr\.\* in \.sai\/settings\.jsonc is set/);
});

test('E2: only .to-pr.json is used and reported as deprecated', t => {
  const { io } = fixture('github');
  const cwd = settingsProject(t, { '.to-pr.json': '{"provider":"github","repository":"team/repo"}' });
  const result = tool.resolve({ explicit: {}, remotes: [] }, registry, { ...io, cwd });
  assert.deepEqual([result.status, result.provider, result.repository], ['resolved', 'github', 'team/repo']);
  assert.match(result.warnings.join('\n'), /\.to-pr\.json is deprecated; move its keys to pr\.\* in \.sai\/settings\.jsonc/);
  assert.equal(result.notices, undefined);
  const typed = settingsProject(t, { '.to-pr.json': '{"type":"bug"}' });
  assert.throws(() => tool.resolve({ explicit: {}, remotes: [] }, registry, { ...io, cwd: typed }), /invocation-scoped/);
});

test('E4: an explicit provider or repository wins over pr.* with a notice', t => {
  const { io } = fixture('github');
  const cwd = settingsProject(t, { [SETTINGS]: '{"pr":{"provider":"gitlab","repository":"https://gitlab.example.com/team/repo"}}' });
  const result = tool.resolve({ explicit: { provider: 'github', repository: 'team/repo' }, remotes: [] }, registry, { ...io, cwd });
  assert.deepEqual([result.provider, result.repository], ['github', 'team/repo']);
  assert.deepEqual(result.notices, [
    'Project setting pr.provider: gitlab is overridden by the explicit provider github',
    'Project setting pr.repository: https://gitlab.example.com/team/repo is overridden by the explicit repository team/repo',
  ]);
  const address = tool.resolve({ explicit: { repository: 'https://github.com/other/repo' }, remotes: [] }, registry, { ...io, cwd });
  assert.equal(address.provider, 'github');
  assert.match(address.notices.join('\n'), /pr\.provider: gitlab is overridden by the explicit repository address, which selects github/);
});

test('E12: an invalid pr.provider is dropped with a warning and resolution continues', t => {
  const { io } = fixture('gitlab');
  const cwd = settingsProject(t, { [SETTINGS]: '{"pr":{"provider":"jira"}}' });
  const result = tool.resolve({ explicit: {}, remotes: selfHosted }, registry, { ...io, cwd });
  assert.equal(result.reason, 'provider-ambiguous');
  assert.match(result.warnings.join('\n'), /Setting pr\.provider .*must be one of github, gitlab, azuredevops/);
});

test('the resolve CLI reads pr.* from the project root, not the subdirectory', t => {
  const top = temporaryDirectory(t, 'to-pr-cli-root-');
  const run = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8' });
  run(top, 'init', '-q');
  run(top, 'commit', '-q', '--allow-empty', '-m', 'init');
  run(top, 'remote', 'add', 'origin', 'https://github.com/team/repo.git');
  fs.mkdirSync(path.join(top, '.sai'));
  fs.writeFileSync(path.join(top, SETTINGS), '{"pr":{"provider":"github","repository":"other/repo"}}');
  fs.mkdirSync(path.join(top, 'sub'));
  const result = spawnSync(process.execPath, [path.join(__dirname, '../sai/tools/to-pr.js'), 'resolve', path.join(__dirname, '../skills/universal/to-pr/providers/registry.json')], {
    cwd: path.join(top, 'sub'), input: '{}', encoding: 'utf8',
  });
  const output = JSON.parse(result.stdout);
  assert.deepEqual([output.status, output.provider, output.repository], ['resolved', 'github', 'other/repo']);
  assert.deepEqual(output.notices, ['Project setting pr.provider: github', 'Project setting pr.repository: other/repo']);
});
