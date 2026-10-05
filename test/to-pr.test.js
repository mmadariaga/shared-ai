'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');
const tool = require('../sai/tools/to-pr');
const registry = require('../skills/universal/to-pr/providers/registry.json');

function fixture(provider, existing = false) {
  const host = provider === 'github' ? 'github.com' : 'gitlab.example.com';
  const url = `https://${host}/team/repo`;
  const state = { head: 'a'.repeat(40), remoteHead: 'a'.repeat(40), rows: [], mutations: [], calls: [] };
  const row = (title = 'feat: old content', description = 'Old description') => provider === 'github'
    ? { number: 7, html_url: `${url}/pull/7`, title, body: description, updated_at: 'version', head: { ref: 'feature', repo: { id: 9 } }, base: { ref: 'main' } }
    : { iid: 7, web_url: `${url}/-/merge_requests/7`, title, description, updated_at: 'version', source_project_id: 9, target_project_id: 9, source_branch: 'feature', target_branch: 'main' };
  if (existing) state.rows = [row()];
  const io = { run(command, args, input) {
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
    if (method === 'GET') return JSON.stringify(state.rows);
    const body = JSON.parse(input);
    state.mutations.push({ command, method, endpoint, body });
    state.rows = [row(body.title, body.body ?? body.description)];
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

for (const provider of ['github', 'gitlab']) {
  for (const existing of [false, true]) test(`${provider} ${existing ? 'update' : 'create'} publishes exact content and reads it back`, t => {
    const { request, io, state } = fixture(provider, existing);
    const ready = tool.query(request, io);
    assert.equal(Boolean(ready.proposal.existing), existing);
    const result = tool.publish({ ...request, approved: true, confirmation: ready.confirmation, receipt: receipt(t) }, io);
    assert.equal(result.status, 'complete');
    assert.equal(state.mutations.length, 1);
    assert.deepEqual(Object.keys(state.mutations[0].body).sort(), existing
      ? (provider === 'github' ? ['body', 'title'] : ['description', 'title'])
      : (provider === 'github' ? ['base', 'body', 'head', 'title'] : ['description', 'source_branch', 'target_branch', 'title']));
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
    assert.throws(() => tool.query(request, { run() { throw new Error('Authentication missing'); } }), /Authentication/);
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

test('temporary preparation returns a private local receipt path and rejects an unknown harness', t => {
  assert.throws(() => tool.prepare({ harness: 'unknown' }), /Expected harness/);
  const result = tool.prepare({ harness: 'claude' });
  const directory = path.dirname(result.receipt);
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  assert.equal(result.status, 'ready');
  assert.ok(path.isAbsolute(result.receipt));
  if (process.platform !== 'win32') assert.equal(fs.statSync(directory).mode & 0o777, 0o700);
});

test('missing required OpenCode temporary root gives a concrete blocker without repairing or replacing it', () => {
  const reads = [];
  assert.throws(() => tool.prepare({ harness: 'opencode' }, {
    platform: 'linux',
    filesystem: {
      lstatSync(file) { reads.push(file); throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); },
      mkdtempSync() { assert.fail('Must not create a replacement temporary directory'); },
      chmodSync() { assert.fail('Must not repair the shared root'); },
    },
  }), /Required existing temporary root \/tmp\/opencode is missing; restore the permitted temporary location/);
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

test('skill presents full content before approval, separates push approval and discloses providers conditionally', () => {
  const text = fs.readFileSync('skills/universal/to-pr/SKILL.md', 'utf8');
  assert.ok(text.indexOf('Show the complete proposed title') < text.indexOf('Then ask:'));
  assert.match(text, /load\s+only the returned/);
  assert.match(text, /Decline stops publication/);
  assert.match(text, /Any content, destination or baseline change/);
  assert.match(text, /Claude Code.*AskUserQuestion/);
  assert.match(text, /OpenCode[\s\S]*question/);
});

test('both harnesses install to-pr and retire managed sai-pr copies while preserving modified and user documents', t => {
  const flow = require('../bin/install-flow');
  const capabilities = require('../bin/capabilities');
  const old = JSON.parse(execFileSync('git', ['show', 'HEAD:sai/install-manifest.json'], { encoding: 'utf8' }));
  for (const harness of ['claude', 'opencode']) {
    const directory = temporaryDirectory(t, 'to-pr-install-');
    fs.mkdirSync(path.join(directory, 'commands'), { recursive: true });
    const original = execFileSync('git', ['show', `HEAD:commands/${harness}/sai-pr.md`], { encoding: 'utf8' });
    const file = path.join(directory, 'commands/sai-pr.md');
    fs.writeFileSync(file, capabilities.projectSource(original, old.capabilities, 'commands', 'sai-pr', harness));
    fs.writeFileSync(path.join(directory, 'pr.md'), 'User document');
    if (harness === 'claude') flow.installClaude(directory); else flow.installOpencode(directory);
    assert.equal(fs.existsSync(file), false);
    for (const relative of ['skills/to-pr/SKILL.md', 'skills/to-pr/providers/registry.json', 'skills/to-pr/providers/github.md', 'skills/to-pr/providers/gitlab.md', 'skills/to-pr/description-format.md', 'sai/tools/to-pr.js', 'sai/tools/to-pr-github.js', 'sai/tools/to-pr-gitlab.js']) assert.ok(fs.existsSync(path.join(directory, relative)), relative);
    assert.equal(fs.readFileSync(path.join(directory, 'pr.md'), 'utf8'), 'User document');
    fs.writeFileSync(file, 'User override');
    flow.cleanupRetiredProjections(harness, { base: directory });
    assert.equal(fs.readFileSync(file, 'utf8'), 'User override');
  }
});
