'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const github = require('../sai/tools/to-backlog-github');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest');
const { translate } = require('../bin/capabilities');
const { prepareTemp } = require('../skills/universal/to-backlog/scripts/prepare-temp');
const root = path.resolve(__dirname, '..');
const reference = '/owner/repo/issues/123';
const url = 'https://github.com/owner/repo/issues/123';
const baseline = { title: 'Original', description: 'Requested work\n\nUnrelated appendix: ñ\n' };
const final = { title: '-n $(touch nope)', description: 'Refined work\n\nUnrelated appendix: ñ\n' };

function temp(prefix) {
  const base = process.platform === 'linux' && fs.existsSync('/tmp/opencode') ? '/tmp/opencode' : os.tmpdir();
  return fs.mkdtempSync(path.join(base, prefix));
}

function fakeUpdate(state, command, args, input) {
  assert.equal(command, 'gh');
  if (state.unavailable) throw new Error('gh unavailable');
  if (args[0] === '--version') return 'fake gh';
  if (args[0] === 'auth') {
    if (state.unauthenticated) throw new Error('not authenticated');
    return '';
  }
  assert.deepEqual(args, ['api', 'graphql', '--hostname', 'github.com', '--input', '-']);
  const { query, variables } = JSON.parse(input);
  assert.doesNotMatch(query, /createIssue|projectsV2|addProject|comments|labels|assignees/);
  if (query.startsWith('mutation')) {
    state.mutations = (state.mutations || 0) + 1;
    assert.match(query, /updateIssue\(input:\{id:\$id,title:\$title,body:\$body\}\)/);
    assert.deepEqual(Object.keys(variables).sort(), ['body', 'id', 'title']);
    if (!state.notApplied) state.content = { title: variables.title, description: variables.body };
    if (state.diverge) state.content.description = 'External content';
    if (state.lost) throw new Error('response lost');
    return JSON.stringify({ data: { updateIssue: { issue: { id: 'I', url: 'https://github.com/owner/repo/issues/123' } } } });
  }
  if (state.mutations && state.verificationFailure) throw new Error('read unavailable');
  const content = state.content || { title: 'Original', description: 'Requested work\n\nUnrelated appendix: ñ\n' };
  const issue = { __typename: state.pr ? 'PullRequest' : 'Issue', id: state.otherId ? 'OTHER' : 'I', number: variables.number, url: `https://github.com/${variables.owner}/${variables.name}/issues/${variables.number}`, title: content.title, body: content.description, state: 'CLOSED', viewerCanUpdate: !state.readOnly };
  if (query.includes('issueOrPullRequest')) return JSON.stringify({ data: { repository: state.missing ? null : { nameWithOwner: state.mutations && state.renameAfterUpdate ? 'owner/renamed' : `${variables.owner}/${variables.name}`, isArchived: !!state.archived, issueOrPullRequest: issue } } });
  return JSON.stringify({ data: { viewer: { login: state.otherActor ? 'other' : 'me' }, repository: { visibility: state.private ? 'PRIVATE' : 'PUBLIC', issue } } });
}

function approved(state = {}) {
  const io = { run: (...args) => fakeUpdate(state, ...args) };
  const current = github['read-update']({ reference }, io);
  const request = { provider: 'github', reference: current.issue.url, baseline: current.baseline, ...final };
  const ready = github['query-update'](request, io);
  const directory = process.platform === 'linux' ? prepareTemp('opencode', { cwd: root }).directory : temp('to-backlog-update-');
  return { io, request: { ...request, confirmation: ready.confirmation, receipt: path.join(directory, 'receipt.json') } };
}

test('E2 full and partial origin references reuse reader; incomplete references never guess', () => {
  for (const ref of [reference, `${url}?x=1#comment`]) {
    const current = github['read-update']({ reference: ref }, { run: (...args) => fakeUpdate({}, ...args) });
    assert.equal(current.issue.url, url);
    assert.deepEqual(current.baseline, baseline);
  }
  for (const ref of ['123', '/repo/issues/123', 'https://gitlab.com/owner/repo/issues/123']) {
    assert.throws(() => github['read-update']({ reference: ref }, { run: (...args) => fakeUpdate({}, ...args) }), /Use https/);
  }
});

test('E4 update changes only exact title and body without Project or creation operations', () => {
  const state = {};
  const { request, io } = approved(state);
  assert.equal(github.update(request, io).status, 'complete');
  assert.deepEqual(state.content, final);
  assert.equal(state.mutations, 1);
  assert.equal(github.update(request, io).reason, 'stale-baseline');
  assert.equal(state.mutations, 1);
});

test('E5 bound approval rejects missing token, changed final content and changed target', () => {
  for (const change of [{ confirmation: undefined }, { title: 'Changed' }, { description: 'Changed' }, { reference: '/owner/other/issues/123' }]) {
    const state = {};
    const { request, io } = approved(state);
    assert.equal(github.update({ ...request, ...change }, io).status, 'failure_before_publication');
    assert.equal(state.mutations, undefined);
  }
});

test('E6 concurrent title or body changes require fresh baseline and approval', () => {
  for (const field of ['title', 'description']) {
    const state = {};
    const { request, io } = approved(state);
    state.content = { ...baseline, [field]: 'External edit' };
    const stale = github.update(request, io);
    assert.equal(stale.reason, 'stale-baseline');
    assert.equal(state.mutations, undefined);
    assert.equal(fs.existsSync(request.receipt), false);
    assert.equal(github.update({ ...request, baseline: stale.current.baseline }, io).status, 'failure_before_publication');
    assert.equal(state.mutations, undefined);
  }
  for (const field of ['otherActor', 'otherId', 'private']) {
    const state = {};
    const { request, io } = approved(state);
    state[field] = true;
    assert.equal(github.update(request, io).status, 'failure_before_publication');
    assert.equal(state.mutations, undefined);
  }
});

test('E7 missing, pull request, archived, non-editable and inaccessible origins stop', () => {
  for (const field of ['missing', 'pr', 'archived', 'readOnly', 'unavailable', 'unauthenticated']) {
    const state = {};
    const { request, io } = approved(state);
    state[field] = true;
    assert.equal(github.update(request, io).status, 'failure_before_publication');
    assert.equal(state.mutations, undefined);
  }
});

test('E8 matching content is a verified no-op without receipt or mutation', () => {
  const state = {};
  const { request, io } = approved(state);
  assert.equal(github.update({ ...request, ...baseline }, io).status, 'no_changes');
  assert.equal(state.mutations, undefined);
  assert.equal(fs.existsSync(request.receipt), false);
});

test('E9 uncertain submission reconciles applied, pending or divergent remotely before retry', () => {
  for (const [options, expected] of [[{ lost: true }, 'complete'], [{ lost: true, notApplied: true }, 'pending'], [{ lost: true, diverge: true }, 'divergent']]) {
    const state = { ...options };
    const { request, io } = approved(state);
    assert.equal(github.update(request, io).status, expected);
    assert.equal(github['recover-update']({ receipt: request.receipt }, io).status, expected);
    assert.equal(state.mutations, 1);
  }
  const state = { lost: true, verificationFailure: true };
  const { request, io } = approved(state);
  assert.equal(github.update(request, io).status, 'uncertain');
  assert.equal(github['recover-update']({ receipt: request.receipt }, io).status, 'uncertain');
  state.verificationFailure = false;
  assert.equal(github['recover-update']({ receipt: request.receipt }, io).status, 'complete');
  assert.equal(state.mutations, 1);
});

test('L1 repository drift during reconciliation fails closed without another mutation', () => {
  const state = { renameAfterUpdate: true };
  const { request, io } = approved(state);
  // Keep the observed issue identity and URL unchanged to isolate the explicit
  // repository comparison from the existing issue identity checks.
  const observed = {
    run: (...args) => {
      const result = fakeUpdate(state, ...args);
      if (!args[2]) return result;
      const response = JSON.parse(result);
      const issue = response.data?.repository?.issue;
      if (issue) issue.url = url;
      return JSON.stringify(response);
    },
  };
  const result = github.update(request, observed);
  assert.equal(result.status, 'uncertain');
  assert.match(result.message, /identity or destination changed/);
  const recovery = github['recover-update']({ receipt: request.receipt }, observed);
  assert.equal(recovery.status, 'uncertain');
  assert.match(recovery.message, /identity or destination changed/);
  assert.equal(state.mutations, 1);
  assert.deepEqual(state.content, final);
});

test('L2 update-only review requires the user-facing race note before approval', () => {
  const skill = fs.readFileSync(path.join(root, 'skills/universal/to-backlog/SKILL.md'), 'utf8');
  const update = fs.readFileSync(path.join(root, 'skills/universal/to-backlog/update.md'), 'utf8');
  const provider = fs.readFileSync(path.join(root, 'skills/universal/to-backlog/providers/github-update.md'), 'utf8');
  const create = fs.readFileSync(path.join(root, 'skills/universal/to-backlog/create.md'), 'utf8');
  assert.match(skill, /selected branch's review requirements before asking for approval/);
  assert.match(update, /Review — before common confirmation/);
  assert.match(update, /Present the provider's required update limitation note before asking for approval/);
  assert.match(provider, /Before asking the user to approve an update, say once/);
  assert.match(provider, /concurrent edit between them can be overwritten/);
  assert.doesNotMatch(create, /atomic|concurrent edit/);
});

test('E1/E3 instruction selection preserves manual creation and explicit origin provenance', () => {
  const skill = fs.readFileSync(path.join(root, 'skills/universal/to-backlog/SKILL.md'), 'utf8');
  for (const pattern of [/disable-model-invocation: true/, /not a link cited later/, /Using from-backlog is\nnot mandatory/, /several origins/, /With no\norigin, select/, /preserving unrelated description content\nverbatim/, /baseline version/, /new explicit approval/, /read `create.md`/, /read `update.md`/]) assert.match(skill, pattern);
  const update = fs.readFileSync(path.join(root, 'skills/universal/to-backlog/update.md'), 'utf8');
  assert.match(update, /without creating a replacement/);
  assert.match(update, /Pending\ncontent requires fresh review and explicit approval/);
});

test('both harnesses install every branch and update provider through existing capability seam', () => {
  const manifest = loadInstallManifest(root);
  for (const harness of ['claude', 'opencode']) {
    const directory = temp('to-backlog-update-projection-');
    const destinationRoot = Object.fromEntries(['root', 'sai', 'commands', 'skills', 'agents', 'config'].map(key => [key, path.join(directory, key)]));
    const projection = expandInstallManifest(manifest, { harness, repoRoot: root, destinationRoot });
    for (const suffix of ['skills/to-backlog/create.md', 'skills/to-backlog/update.md', 'skills/to-backlog/providers/github-update.md', 'sai/tools/from-backlog-github.js']) assert.ok(projection.some(item => item.destinationPath.endsWith(path.join(...suffix.split('/')))), `${harness}: ${suffix}`);
    assert.ok(translate(manifest.capabilities, 'to-backlog-command', harness).profile.shell.includes('node {sai}/tools/to-backlog.js *'));
  }
});

test('update CLI dispatch handles structured Markdown data through registry and simulated gh', { skip: process.platform === 'win32' }, () => {
  const directory = temp('to-backlog-update-cli-');
  const statePath = path.join(directory, 'state.json');
  fs.writeFileSync(statePath, '{}');
  fs.writeFileSync(path.join(directory, 'gh'), `#!${process.execPath}\nconst assert=require('node:assert/strict'); const fs=require('node:fs');\n${fakeUpdate.toString()}\nconst file=process.env.FAKE_GH_STATE; const state=JSON.parse(fs.readFileSync(file));\ntry { console.log(fakeUpdate(state,'gh',process.argv.slice(2),fs.readFileSync(0,'utf8'))); } catch(e) { console.error(e.message);process.exitCode=1; } finally { fs.writeFileSync(file,JSON.stringify(state)); }\n`, { mode: 0o700 });
  const invoke = (operation, input) => {
    const result = spawnSync(process.execPath, [path.join(root, 'sai/tools/to-backlog.js'), operation, path.join(root, 'skills/universal/to-backlog/providers/registry.json')], { cwd: directory, input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, FAKE_GH_STATE: statePath } });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return JSON.parse(result.stdout);
  };
  const current = invoke('read-update', { provider: 'github', reference });
  const request = { provider: 'github', reference: current.issue.url, baseline: current.baseline, ...final };
  const ready = invoke('query-update', request);
  const receipt = path.join(temp('to-backlog-update-receipt-'), 'receipt.json');
  assert.equal(invoke('update', { ...request, confirmation: ready.confirmation, receipt }).status, 'complete');
  assert.equal(invoke('recover-update', { provider: 'github', receipt }).status, 'complete');
  assert.equal(fs.existsSync(path.join(directory, 'nope')), false);
});
