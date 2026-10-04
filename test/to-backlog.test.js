'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { resolve, address } = require('../sai/tools/to-backlog');
const github = require('../sai/tools/to-backlog-github');
const registry = require('../skills/universal/to-backlog/providers/registry.json');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest');
const { translate } = require('../bin/capabilities');
const { prepareTemp } = require('../skills/universal/to-backlog/scripts/prepare-temp');

const root = path.resolve(__dirname, '..');
const request = { provider: 'github', repository: 'code/repo', title: '-n $(touch nope)', description: '# Markdown\n```sh\necho "$HOME"; `whoami`\n```\nUnicode: ñ' };
function temp() { return fs.mkdtempSync(path.join(fs.existsSync('/tmp/opencode') ? '/tmp/opencode' : os.tmpdir(), 'to-backlog-test-')); }

// A simulated gh implements the relevant API, including cursor pages and lost
// mutation responses. No real executable, credentials or network are used.
function fakeGithub(state, command, args, input) {
  if (command !== 'gh') throw new Error('Unexpected command');
  if (state.unavailable) throw new Error('gh unavailable');
  if (args[0] === '--version') return 'gh fake';
  if (args[0] === 'auth') { if (state.unauthenticated) throw new Error('not authenticated'); return ''; }
  if (JSON.stringify(args) !== JSON.stringify(['api', 'graphql', '--hostname', 'github.com', '--input', '-'])) throw new Error('Unsafe invocation');
  const { query, variables } = JSON.parse(input);
  const project = { id: 'P', title: 'Board', url: 'https://github.com/orgs/board/projects/7', closed: !!state.closed, viewerCanUpdate: !state.readOnlyProject };
  const page = (nodes, next = false) => ({ nodes, pageInfo: { hasNextPage: next, endCursor: next ? 'next' : null } });
  let data;
  if (query.includes('createIssue(')) {
    state.creations = (state.creations || 0) + 1;
    state.issue = { id: 'I', number: 5, url: 'https://github.com/code/repo/issues/5', title: variables.title, body: variables.body, author: { login: 'me' } };
    if (state.driftAfterCreation) state.private = true;
    if (state.editAfterCreation) state.issue.body = 'external edit';
    if (state.loseCreation) throw new Error('response lost');
    data = { createIssue: { issue: state.issue } };
  } else if (query.includes('addProjectV2ItemById(')) {
    state.insertions = (state.insertions || 0) + 1;
    if (state.failInsertion) throw new Error('Project access denied');
    state.member = true;
    if (state.loseInsertion) throw new Error('insertion response lost');
    data = { addProjectV2ItemById: { item: { id: 'ITEM' } } };
  } else if (query.includes('items(first:')) {
    data = { node: { items: page(state.member ? [{ id: 'ITEM', content: { id: 'I' } }] : []) } };
  } else if (query.includes('issues(first:')) {
    data = { repository: { issues: page(state.issue ? [state.issue] : []) } };
  } else if (query.includes('projectsV2(first:')) {
    if (state.projectError) throw new Error('Project query failed');
    const nodes = state.noProjects ? [] : state.twoProjects ? [project, { ...project, id: 'P2' }] : [project];
    data = { repository: { projectsV2: variables.cursor ? page(nodes) : page([{ ...project, id: 'CLOSED', closed: true }], true) } };
  } else if (query.includes('projectV2(number:')) {
    data = { organization: { projectV2: project }, user: { projectV2: project } };
  } else if (query.includes('repository(owner:')) {
    data = { viewer: { login: state.otherActor ? 'other' : 'me' }, repository: { id: 'R', nameWithOwner: `${variables.owner}/${variables.name}`, visibility: state.private ? 'PRIVATE' : 'PUBLIC', url: 'https://github.com/code/repo', hasIssuesEnabled: !state.disabled, isArchived: false } };
  } else data = { viewer: { login: state.otherActor ? 'other' : 'me' } };
  return JSON.stringify({ data });
}
function mock(state = {}) { return { run: (...args) => fakeGithub(state, ...args) }; }
function approved(state = {}) {
  const io = mock(state);
  const ready = github.query(request, io);
  const directory = process.platform === 'linux' ? prepareTemp('opencode', { cwd: root }).directory : temp();
  const receipt = path.join(directory, 'receipt.json');
  return { io, receipt, input: { ...request, confirmation: ready.confirmation, receipt } };
}

test('resolution prioritizes explicit destination, configuration and deduplicated remotes', () => {
  const remotes = ['git@github.com:a/b.git', 'https://github.com/a/b.git'];
  assert.equal(resolve({ remotes }, registry).repository, 'a/b');
  assert.equal(resolve({ config: { provider: 'github', repository: 'configured/repo' }, remotes }, registry).repository, 'configured/repo');
  assert.equal(resolve({ explicit: { repository: 'https://github.com/explicit/repo' }, config: { provider: 'jira' }, remotes }, registry).repository, 'explicit/repo');
  assert.equal(resolve({ explicit: { provider: 'jira' }, remotes }, registry).status, 'unsupported');
  assert.equal(resolve({ remotes: [...remotes, 'ssh://git@github.com/c/d.git'] }, registry).reason, 'repository-ambiguous');
  assert.equal(resolve({ remotes: [] }, registry).reason, 'provider-ambiguous');
  assert.equal(resolve({ remotes: [...remotes, 'git@gitlab.com:other/repo.git'] }, registry).reason, 'provider-ambiguous');
  assert.equal(resolve({ explicit: { repository: 'https://gitlab.com/a/b' }, remotes }, registry).reason, 'unrecognized-destination');
  assert.deepEqual(address('ssh://git@github.com/a/b.git'), { host: 'github.com', repository: 'a/b' });
  assert.equal(address('$(touch nope)'), null);
  assert.throws(() => resolve({ config: { labels: 'no' } }, registry), /Invalid destination/);
});

test('registry extensions do not need provider branches in resolver', () => {
  const extended = { providers: [...registry.providers, { id: 'example', hosts: ['example.test'], capabilities: ['publish'], instructions: 'providers/example.md', adapter: 'to-backlog-example.js' }] };
  assert.equal(resolve({ remotes: ['git@example.test:a/b.git'] }, extended).provider, 'example');
  assert.equal(resolve({ remotes: ['git@example.test:a/b.git', 'git@github.com:a/b.git'] }, extended).reason, 'provider-ambiguous');
});

test('queries exhaust pages, omit closed Projects, respect explicit independent owner and public visibility', () => {
  const ready = github.query(request, mock());
  assert.equal(ready.status, 'ready');
  assert.equal(ready.proposal.project.id, 'P');
  assert.equal(ready.proposal.visibility, 'PUBLIC');
  assert.equal(github.query(request, mock({ twoProjects: true })).reason, 'project-ambiguous');
  assert.equal(github.query(request, mock({ noProjects: true })).reason, 'project-required');
  assert.throws(() => github.query(request, mock({ projectError: true })), /query failed/);
  assert.equal(github.query({ ...request, project: ready.proposal.project.url }, mock({ projectError: true })).status, 'ready');
  assert.throws(() => github.query(request, mock({ disabled: true })), /issues disabled/);
  assert.throws(() => github.query(request, mock({ unauthenticated: true })), /not authenticated/);
  assert.throws(() => github.query(request, mock({ unavailable: true })), /unavailable/);
  assert.equal(github.query(request, mock({ readOnlyProject: true })).reason, 'project-required');
  assert.throws(() => github.query({ ...request, project: ready.proposal.project.url }, mock({ closed: true })), /closed/);
  assert.throws(() => github.query({ ...request, project: ready.proposal.project.url }, mock({ readOnlyProject: true })), /not writable/);
});

test('confirmation binds content, destination and visibility; absence and edits cause no mutation', () => {
  for (const edit of [{ confirmation: undefined }, { title: 'changed' }, { description: 'changed' }, { repository: 'different/repo' }]) {
    const state = {};
    const { input, io } = approved(state);
    assert.equal(github.publish({ ...input, ...edit }, io).status, 'failure_before_publication');
    assert.equal(state.creations, undefined);
  }
  const state = {};
  const { input, io } = approved(state);
  state.private = true;
  assert.equal(github.publish(input, io).status, 'failure_before_publication');
  assert.equal(state.creations, undefined);
});

test('publication preserves Markdown exactly and publishes at most once per receipt', () => {
  const state = {};
  const { input, io } = approved(state);
  const result = github.publish(input, io);
  assert.equal(result.status, 'complete');
  assert.equal(state.issue.title, request.title);
  assert.equal(state.issue.body, request.description);
  assert.equal(state.creations, 1);
  assert.equal(state.insertions, 1);
  assert.equal(github.publish(input, io).status, 'failure_before_publication');
  assert.equal(state.creations, 1);
});

test('receipt boundary rejects relative and repository-contained paths before writes, including from nested cwd', () => {
  const { input } = approved();
  const relative = `to-backlog-rejected-${process.pid}.json`;
  const inside = path.join(root, relative);
  const io = { run() { assert.fail('A rejected receipt must not query or mutate GitHub'); } };
  for (const receipt of [relative, inside]) {
    assert.equal(github.publish({ ...input, receipt }, io).status, 'failure_before_publication');
    assert.equal(github.recover({ receipt }, io).status, 'failure_before_publication');
    assert.equal(fs.existsSync(path.resolve(receipt)), false);
  }
  const cwd = process.cwd();
  try {
    process.chdir(path.join(root, 'test'));
    assert.match(github.publish({ ...input, receipt: inside }, io).message, /outside the repository/);
    assert.equal(fs.existsSync(inside), false);
  } finally { process.chdir(cwd); }
});

test('receipt boundary rejects symlink aliases into the repository and linked receipt files', { skip: process.platform === 'win32' }, () => {
  const { input } = approved();
  const directory = temp();
  const alias = path.join(directory, 'repo-alias');
  fs.symlinkSync(root, alias, 'dir');
  const receipt = path.join(alias, `to-backlog-rejected-${process.pid}.json`);
  const io = { run() { assert.fail('A rejected symlink must not access GitHub'); } };
  assert.match(github.publish({ ...input, receipt }, io).message, /outside the repository/);
  assert.match(github.recover({ receipt }, io).message, /outside the repository/);
  assert.equal(fs.existsSync(receipt), false);
  const target = path.join(temp(), 'original.json');
  fs.writeFileSync(target, 'unchanged', { mode: 0o600 });
  const linked = path.join(directory, 'linked.json');
  fs.symlinkSync(target, linked);
  assert.match(github.publish({ ...input, receipt: linked }, io).message, /regular/);
  assert.match(github.recover({ receipt: linked }, io).message, /regular/);
  assert.equal(fs.readFileSync(target, 'utf8'), 'unchanged');
});

test('receipt parent must remain private', { skip: process.platform === 'win32' }, () => {
  const directory = temp();
  fs.chmodSync(directory, 0o755);
  const receipt = path.join(directory, 'receipt.json');
  const io = { run() { assert.fail('Insecure receipts must not access GitHub'); } };
  assert.match(github.publish({ ...request, receipt }, io).message, /private/);
  assert.match(github.recover({ receipt }, io).message, /private/);
  assert.equal(fs.existsSync(receipt), false);
});

test('explicit unsupported provider takes precedence over incompatible destination without Git or gh probing', () => {
  const explicit = { provider: 'jira', repository: 'https://github.com/code/repo' };
  assert.deepEqual(resolve({ explicit }, registry), { status: 'unsupported', provider: 'jira' });
  const directory = temp();
  // An empty PATH makes even accidental Git/gh calls fail instead of passing.
  const result = spawnSync(process.execPath, [path.join(root, 'sai/tools/to-backlog.js'), 'resolve', path.join(root, 'skills/universal/to-backlog/providers/registry.json')], { cwd: directory, input: JSON.stringify({ explicit }), encoding: 'utf8', env: { ...process.env, PATH: '' } });
  assert.equal(result.status, 1);
  assert.deepEqual(JSON.parse(result.stdout), { status: 'unsupported', provider: 'jira' });
});

test('recovery blocks visibility drift and known-issue edits before receipt writes or insertion', () => {
  for (const originalPrivate of [false, true]) {
    const state = { private: originalPrivate, failInsertion: true };
    const { input, io, receipt } = approved(state);
    assert.equal(github.publish(input, io).status, 'partial_failure');
    const before = fs.readFileSync(receipt, 'utf8');
    const insertions = state.insertions;
    state.private = !originalPrivate;
    state.failInsertion = false;
    const result = github.recover({ receipt }, io);
    assert.equal(result.status, 'partial_failure');
    assert.match(result.message, /visibility changed; fresh review/);
    assert.equal(fs.readFileSync(receipt, 'utf8'), before);
    assert.equal(state.insertions, insertions);
    assert.equal(state.creations, 1);
  }
  for (const field of ['title', 'body']) {
    const state = { failInsertion: true };
    const { input, io, receipt } = approved(state);
    github.publish(input, io);
    state.issue[field] = 'external edit';
    state.failInsertion = false;
    const before = fs.readFileSync(receipt, 'utf8');
    const insertions = state.insertions;
    assert.match(github.recover({ receipt }, io).message, /content changed; fresh review/);
    assert.equal(state.insertions, insertions);
    assert.equal(state.creations, 1);
    assert.equal(fs.readFileSync(receipt, 'utf8'), before);
    assert.equal(state.issue[field], 'external edit');
  }
});

test('initial insertion also checks visibility and issue content after creation', () => {
  for (const option of ['driftAfterCreation', 'editAfterCreation']) {
    const state = { [option]: true };
    const { input, io } = approved(state);
    const result = github.publish(input, io);
    assert.equal(result.status, 'partial_failure');
    assert.match(result.message, /fresh review/);
    assert.equal(state.creations, 1);
    assert.equal(state.insertions, undefined);
  }
});

test('partial failure and lost insertion recover membership without issue recreation', () => {
  for (const option of ['failInsertion', 'loseInsertion']) {
    const state = { [option]: true };
    const { input, io, receipt } = approved(state);
    assert.equal(github.publish(input, io).status, 'partial_failure');
    const before = state.insertions;
    state[option] = false;
    assert.equal(github.recover({ receipt }, io).status, 'complete');
    assert.equal(state.creations, 1);
    assert.equal(state.insertions, option === 'loseInsertion' ? before : before + 1);
  }
});

test('lost creation returns uncertain, requires verified issue choice, never repeats creation', () => {
  const state = { loseCreation: true };
  const { input, io, receipt } = approved(state);
  assert.equal(github.publish(input, io).status, 'uncertain');
  const found = github.recover({ receipt }, io);
  assert.equal(found.status, 'uncertain');
  assert.equal(found.candidates[0].url, state.issue.url);
  assert.equal(github.recover({ receipt, issueUrl: state.issue.url }, io).status, 'complete');
  assert.equal(state.creations, 1);
});

test('uncertain empty verification and changed authentication remain blocked', () => {
  const state = { loseCreation: true };
  const { input, io, receipt } = approved(state);
  github.publish(input, io);
  state.issue = null;
  const result = github.recover({ receipt }, io);
  assert.equal(result.status, 'uncertain');
  assert.deepEqual(result.candidates, []);
  state.otherActor = true;
  assert.match(github.recover({ receipt }, io).message, /identity/);
  assert.equal(state.creations, 1);
});

test('pagination failures are errors rather than empty destinations', () => {
  assert.throws(() => github.pages(() => ({ nodes: [], pageInfo: { hasNextPage: true, endCursor: null } }), page => page), /cursor/);
  assert.throws(() => github.pages(() => ({ nodes: [] }), page => page), /Incomplete/);
});

test('common instructions retain conversation, confirmation and cancellation boundaries in both wrappers', () => {
  const skill = fs.readFileSync(path.join(root, 'skills/universal/to-backlog/SKILL.md'), 'utf8');
  assert.match(skill, /prioritizing recent messages/);
  assert.match(skill, /retaining earlier/);
  assert.match(skill, /Cancel ends without publication/);
  assert.match(skill, /new full confirmation/);
  assert.match(skill, /explicit approval/);
  assert.match(skill, /If public, explicitly warn/);
  assert.doesNotMatch(skill, /provider ===|provider: "github"/);
  for (const harness of ['claude', 'opencode']) {
    const wrapper = fs.readFileSync(path.join(root, `commands/${harness}/to-backlog.md`), 'utf8');
    assert.match(wrapper, /current conversation/);
    assert.doesNotMatch(wrapper, /boot\.md|starts clean|subtask: true/);
  }
});

test('both harness projections install references, registry, wrappers, skill and tools', () => {
  const manifest = loadInstallManifest(root);
  for (const harness of ['claude', 'opencode']) {
    const destination = temp();
    const destinationRoot = Object.fromEntries(['root', 'sai', 'commands', 'skills', 'agents', 'config'].map(key => [key, path.join(destination, key)]));
    const projections = expandInstallManifest(manifest, { harness, repoRoot: root, destinationRoot });
    for (const suffix of ['skills/to-backlog/SKILL.md', 'skills/to-backlog/providers/github.md', 'skills/to-backlog/providers/registry.json', 'commands/to-backlog.md', 'sai/tools/to-backlog.js', 'sai/tools/to-backlog-github.js']) {
      assert.ok(projections.some(item => item.destinationPath.endsWith(suffix)), `${harness}: ${suffix}`);
    }
    assert.ok(translate(manifest.capabilities, 'to-backlog-command', harness).profile.question);
  }
});

test('CLI uses simulated Git and gh, structured stdin and no shell interpretation', { skip: process.platform === 'win32' }, () => {
  const dir = temp();
  const statePath = path.join(dir, 'state.json');
  fs.writeFileSync(statePath, '{}');
  fs.writeFileSync(path.join(dir, 'git'), `#!${process.execPath}\nprocess.stdout.write('origin\\tgit@github.com:code/repo.git (fetch)\\n');\n`, { mode: 0o700 });
  fs.writeFileSync(path.join(dir, 'gh'), `#!${process.execPath}\nconst fs=require('node:fs');\n${fakeGithub.toString()}\nconst file=process.env.FAKE_GH_STATE; const state=JSON.parse(fs.readFileSync(file));\ntry { console.log(fakeGithub(state,'gh',process.argv.slice(2),fs.readFileSync(0,'utf8'))); } catch(e) { console.error(e.message);process.exitCode=1; } finally { fs.writeFileSync(file,JSON.stringify(state)); }\n`, { mode: 0o700 });
  const invoke = (op, input) => {
    const result = spawnSync(process.execPath, [path.join(root, 'sai/tools/to-backlog.js'), op, path.join(root, 'skills/universal/to-backlog/providers/registry.json')], { cwd: dir, input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, FAKE_GH_STATE: statePath } });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return JSON.parse(result.stdout);
  };
  const destination = invoke('resolve', {});
  assert.equal(destination.repository, 'code/repo');
  const ready = invoke('query', request);
  const result = invoke('publish', { ...request, receipt: path.join(temp(), 'receipt.json'), confirmation: ready.confirmation });
  assert.equal(result.status, 'complete');
  assert.equal(fs.readFileSync(statePath, 'utf8').includes('Unicode: ñ'), true);
  assert.equal(fs.existsSync(path.join(dir, 'nope')), false);
});
