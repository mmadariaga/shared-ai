'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const azure = require('../sai/tools/azure-publication');
const boards = require('../sai/tools/to-backlog-azuredevops');
const backlog = require('../sai/tools/to-backlog');
const prs = require('../sai/tools/to-pr');
const { convert } = require('../sai/tools/azure-markdown');
const boardsRegistry = require('../skills/universal/to-backlog/providers/registry.json');
const prRegistry = require('../skills/universal/to-pr/providers/registry.json');
const organization = 'https://dev.azure.com/org', project = 'Team', repo = `${organization}/${project}/_git/Repo`;
function receipt() {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'azure-test-'));
  if (process.platform !== 'win32') fs.chmodSync(dir, 0o700);
  return path.join(dir, 'receipt.json');
}
// Mocked protocol tests, not live Azure integration. Every test names its
// crystallized E/I coverage and asserts both results and forbidden operations.
function fixture() {
  const state = { calls: [], writes: [], items: new Map(), rows: [], head: 'a'.repeat(40), remoteHead: 'a'.repeat(40), rev: 1 };
  const item = (id, title = 'Old', description = '<p>Keep <custom>HTML</custom></p>') => ({ id, rev: state.rev,
    fields: { 'System.TeamProject': project, 'System.WorkItemType': 'Task', 'System.Title': title,
      'System.Description': description, 'System.CreatedBy': { id: 'actor' } } });
  state.items.set(1, item(1));
  const pr = (title, description) => ({ pullRequestId: 7, repository: { id: 'repo-id', project: { id: 'project-id' } },
    title, description, sourceRefName: 'refs/heads/feature', targetRefName: 'refs/heads/main', status: 'active',
    createdBy: { id: 'actor' }, lastMergeSourceCommit: { commitId: state.head } });
  const io = { registry: prRegistry, run(command, args, input) {
    state.calls.push({ command, args });
    const sdk = command === 'azure-sdk' ? JSON.parse(input) : null;
    if (sdk) {
      command = 'az';
      args = ['devops', 'invoke', '--resource', sdk.identity ? 'connectionData' : 'workitems', '--http-method', sdk.method,
        '--detect', 'false', '--route-parameters', ...Object.entries(sdk.route).map(([k,v]) => `${k}=${v}`), '--media-type', sdk.mediaType];
    }
    if (command === 'git') {
      if (args[0] === 'symbolic-ref') return 'feature';
      if (args[0] === 'rev-parse') return state.head;
      if (args[0] === 'status') return '';
      if (args[0] === 'remote') return args.length === 1 ? 'origin' : args.includes('--push') && state.pushUrl ? state.pushUrl : 'git@ssh.dev.azure.com:v3/org/Team/Repo';
      if (args[0] === 'ls-remote') return state.remoteHead ? `${state.remoteHead}\trefs/heads/feature` : '';
      if (args[0] === 'push') { state.writes.push({ command, args }); state.remoteHead = state.head; return ''; }
      throw new Error('Unexpected Git command');
    }
    assert.equal(command, 'az');
    if (state.failRemoteAfterWrite && state.writes.length) throw new Error('HTTP status 403: readback forbidden');
    assert.equal(args[args.indexOf('--detect') + 1], 'false');
    const resource = args[args.indexOf('--resource') + 1], method = args[args.indexOf('--http-method') + 1];
    const routeIndex = args.indexOf('--route-parameters');
    const routes = routeIndex < 0 ? [] : args.slice(routeIndex + 1).filter(a => !a.startsWith('--'));
    const parameter = key => routes.find(a => a.startsWith(`${key}=`))?.slice(key.length + 1);
    const body = sdk ? sdk.body : args.includes('--in-file') ? JSON.parse(fs.readFileSync(args[args.indexOf('--in-file') + 1], 'utf8')) : undefined;
    if (resource === 'projects') return JSON.stringify({ id: 'project-id', name: project, visibility: 'private' });
    if (resource === 'connectionData') return JSON.stringify({ authenticatedUser: { id: 'actor' } });
    if (state.accessError) throw new Error(state.accessError);
    if (resource === 'workitemtypes') return JSON.stringify({ name: state.invalidType ? 'Bug' : 'Task' });
    if (resource === 'repositories') return JSON.stringify({ id: 'repo-id', name: 'Repo', project: { id: 'project-id' }, defaultBranch: 'refs/heads/main' });
    if (resource === 'wiql') return JSON.stringify({ workItems: [...state.items.keys()].map(id => ({ id })) });
    if (resource === 'workitems' && method === 'GET') {
      if (state.readbackError) throw new Error('Readback unavailable');
      return JSON.stringify(state.items.get(Number(parameter('id'))));
    }
    if (resource === 'pullrequests' && method === 'GET') return JSON.stringify({ count: state.rows.length, value: state.rows });
    state.writes.push({ command, method, resource, body, args });
    if (state.reject) throw new Error('HTTP status 400: project required field is missing');
    if (resource === 'workitems') {
      if (method === 'PATCH' && (state.race || body[0].value !== state.items.get(1).rev)) throw new Error('HTTP status 412: revision test failed');
      const id = method === 'PATCH' ? 1 : 2, row = state.items.get(id) || item(id);
      for (const part of body) if (part.path.startsWith('/fields/')) row.fields[part.path.slice(8)] = part.value;
      row.rev++; state.items.set(id, row);
      if (state.lost) throw new Error('Connection lost after submission');
      return JSON.stringify(row);
    }
    assert.equal(resource, 'pullrequests');
    state.rows = [pr(body.title, body.description)];
    if (state.lost) throw new Error('Lost write response');
    return JSON.stringify(state.rows[0]);
  } };
  return { io, state, pr };
}
test('E1 E2 I1 I4 I5: cloud address normalization and registry precedence ask only for unresolved choices', () => {
  const https = 'https://org.visualstudio.com/DefaultCollection/Team/_git/Repo';
  assert.equal(azure.repositoryAddress(https).url, repo);
  assert.equal(azure.repositoryAddress('ssh://git@ssh.dev.azure.com/v3/org/Team/Repo').url, repo);
  assert.equal(azure.repositoryAddress('ssh://git@ssh.dev.azure.com:22/v3/org/Team/Repo').url, repo);
  assert.equal(azure.repositoryAddress('org.visualstudio.com:v3/org/Team/Repo').url, repo);
  assert.equal(azure.repositoryAddress('org@vs-ssh.visualstudio.com:v3/org/Team/Repo').url, repo);
  assert.equal(azure.repositoryAddress('ssh://org@vs-ssh.visualstudio.com:22/v3/org/Team/Repo').url, repo);
  const request = { explicit: { provider: 'azuredevops', repository: repo }, config: {}, remotes: [repo, 'https://dev.azure.com/else/Other/_git/R'] };
  assert.equal(backlog.resolve(request, boardsRegistry).status, 'resolved');
  assert.equal(prs.resolve(request, prRegistry, {}).repository, repo);
  assert.equal(azure.resolve({ explicit: { organization, project }, remotes: ['https://dev.azure.com/org/../bad'] }).status, 'resolved');
  assert.equal(backlog.resolve({ remotes: [https] }, boardsRegistry).provider, 'azuredevops');
  assert.equal(prs.resolve({ remotes: [https] }, prRegistry, {}).provider, 'azuredevops');
  assert.equal(azure.resolve({ explicit: { organization, project } }).repository, `${organization}/${project}`);
  assert.equal(azure.resolve({ explicit: { repository: `${organization}/${project}` } }).status, 'resolved');
  assert.equal(azure.resolve({ remotes: [repo, 'https://dev.azure.com/else/Other/_git/R'] }).status, 'needs_input');
  assert.equal(azure.resolve({ config: { organization, project }, remotes: [] }).status, 'resolved');
  assert.throws(() => azure.resolve({ explicit: { repository: 'https://server.local/Collection/Team/_git/Repo' } }), /Services only/);
  assert.throws(() => azure.resolve({ explicit: { repository: repo, project: 'Other' } }), /Incompatible/);
});
test('E5 I6: deterministic examples preserve format, code and counter metadata; unsupported input stops', () => {
  assert.equal(convert('## Goal\n\n**Keep** `x < y`\n\n- [guide](https://a.test)'), '<h2>Goal</h2>\n<p><strong>Keep</strong> <code>x &lt; y</code></p>\n<ul><li><a href="https://a.test">guide</a></li></ul>');
  assert.equal(convert('1. First\n2. *Second*\n\n> Quoted\n\n```js\nx < y\n```'), '<ol><li>First</li><li><em>Second</em></li></ol>\n<blockquote><p>Quoted</p></blockquote>\n<pre><code class="language-js">x &lt; y</code></pre>');
  const comment = '<!-- backlog-id-counters: E=3 I=2 Q=5 -->';
  assert.equal(convert(comment), comment);
  assert.equal(convert('[`code`](https://a.test)'), '<p><a href="https://a.test"><code>code</code></a></p>');
  for (const text of ['<div>raw</div>', '| A | B |', '- Parent\n  - Nested', '[x](javascript:alert)', '![image](https://a.test/img)', '```\nunclosed', '**unclosed']) assert.throws(() => convert(text), /Unsupported|Unclosed/);
});
test('E3 E4 I3 I6: type question, invalid type, access and conversion failures perform no publication', () => {
  const { io, state } = fixture(), request = { repository: `${organization}/${project}`, title: 'Create', description: 'Body' };
  assert.equal(boards.query(request, io).reason, 'work-item-type-required');
  assert.equal(state.calls.length, 0);
  state.invalidType = true;
  assert.throws(() => boards.query({ ...request, type: 'Task' }, io), /type/);
  state.invalidType = false;
  assert.throws(() => boards.query({ ...request, type: 'Task', description: '<div>no</div>' }, io), /Unsupported/);
  for (const error of ['ENOENT az not found', 'extension not installed', 'az login required', 'HTTP status 403 permissions']) {
    state.accessError = error; assert.throws(() => boards.query({ ...request, type: 'Task' }, io), /Azure DevOps/);
  }
  assert.equal(state.writes.length, 0);
  assert.ok(state.calls.every(call => !call.args.includes('login') && !call.args.includes('configure') && !call.args.includes('add')));
});
test('E4 E5 E6 I6 I7: title-only update preserves HTML and atomically tests approved revision', () => {
  const { io, state } = fixture(), reference = `${organization}/${project}/_workitems/edit/1`;
  const baseline = boards['read-update']({ reference }, io).baseline;
  const request = { reference, baseline, title: 'New title' }, ready = boards['query-update'](request, io);
  assert.equal(ready.proposal.description, baseline.description);
  assert.equal(boards.update({ ...request, confirmation: 'wrong', receipt: receipt() }, io).status, 'failure_before_publication');
  assert.equal(state.writes.length, 0);
  const file = receipt(), result = boards.update({ ...request, confirmation: ready.confirmation, receipt: file }, io);
  assert.equal(result.status, 'complete');
  assert.deepEqual(state.writes[0].body, [{ op: 'test', path: '/rev', value: baseline.rev }, { op: 'add', path: '/fields/System.Title', value: 'New title' }]);
  assert.equal(state.items.get(1).fields['System.Description'], baseline.description);
  assert.ok(!state.writes[0].args.includes('bypassRules=true'));
  assert.equal(boards['recover-update']({ receipt: file }, io).status, 'complete');
  assert.equal(state.writes.length, 1);
});
test('E6 E8 I7 I9: revisions changed before or inside write require new approval and no retry', () => {
  const { io, state } = fixture(), reference = `${organization}/${project}/_workitems/edit/1`;
  const baseline = boards['read-update']({ reference }, io).baseline, request = { reference, baseline, title: 'New' };
  const ready = boards['query-update'](request, io);
  state.items.get(1).rev++;
  assert.equal(boards.update({ ...request, confirmation: ready.confirmation, receipt: receipt() }, io).reason, 'stale-baseline');
  assert.equal(state.writes.length, 0);
  state.items.get(1).rev = baseline.rev; state.race = true;
  assert.equal(boards.update({ ...request, confirmation: ready.confirmation, receipt: receipt() }, io).status, 'rejected');
  assert.equal(state.writes.length, 1);
  assert.equal(state.items.get(1).fields['System.Title'], 'Old');
});
test('E4 E8 I7 I9: create enforced rules, failed readback and query-only lost-response recovery', () => {
  for (const reject of [true, false]) {
    const { io, state } = fixture(), request = { repository: `${organization}/${project}`, type: 'Task', title: 'Create', description: '## Body\nExact' };
    const ready = boards.query(request, io), file = receipt(); state.reject = reject; state.lost = !reject;
    const result = boards.publish({ ...request, confirmation: ready.confirmation, receipt: file }, io);
    assert.equal(result.status, reject ? 'rejected' : 'uncertain');
    assert.equal(state.writes.length, 1);
    assert.equal(state.writes[0].args[state.writes[0].args.indexOf('--media-type') + 1], 'application/json-patch+json');
    assert.equal(state.writes[0].args.includes('type=Task'), true);
    const recovery = boards.recover({ receipt: file }, io);
    assert.equal(recovery.status, 'uncertain');
    if (!reject) {
      assert.equal(recovery.candidates.length, 1);
      assert.equal(boards.recover({ receipt: file, issueUrl: recovery.candidates[0].url }, io).status, 'complete');
    }
    assert.equal(state.writes.length, 1, 'Recovery must not publish');
  }
  const { io, state } = fixture(), request = { repository: `${organization}/${project}`, type: 'Task', title: 'Create', description: 'Body' };
  const ready = boards.query(request, io); state.readbackError = true;
  assert.equal(boards.publish({ ...request, confirmation: ready.confirmation, receipt: receipt() }, io).status, 'uncertain');
  assert.equal(state.writes.length, 1);
});
const prRequest = { provider: 'azuredevops', repository: repo, remote: 'origin', base: 'main', title: 'feat: azure publication', description: '## Summary\nMarkdown' };
test('E7 I5 I8: exact fetch/push and branch identity, independent push approval and PR creation', () => {
  const { io, state } = fixture();
  state.pushUrl = 'https://dev.azure.com/org/Team/_git/Other';
  assert.throws(() => prs.query(prRequest, io), /fetch and push/);
  state.pushUrl = repo;
  const ready = prs.query(prRequest, io);
  assert.throws(() => prs.publish({ ...prRequest, confirmation: ready.confirmation, receipt: receipt() }, io), /approval/);
  state.remoteHead = null;
  assert.throws(() => prs.publish({ ...prRequest, approved: true, confirmation: ready.confirmation, receipt: receipt() }, io), /push approval/);
  assert.throws(() => prs.push({ ...prRequest, approved: true, confirmation: ready.confirmation }, io), /push approval/);
  assert.equal(state.writes.length, 0);
  const pushReady = prs.pushQuery(prRequest, io);
  assert.equal(prs.push({ ...prRequest, approved: true, confirmation: pushReady.confirmation }, io).status, 'complete');
  assert.equal(prs.publish({ ...prRequest, approved: true, confirmation: ready.confirmation, receipt: receipt() }, io).status, 'complete');
  assert.deepEqual(Object.keys(state.writes[1].body).sort(), ['description', 'sourceRefName', 'targetRefName', 'title']);
  assert.equal(state.rows[0].description, prRequest.description);
});
test('E6 E7 I8: PR update warning bound before approval, stale baseline and multiple matches block', () => {
  const { io, state, pr } = fixture(); state.rows = [pr('feat: old', 'Old')];
  const ready = prs.query(prRequest, io);
  assert.match(ready.proposal.concurrency_warning, /between.*read.*PATCH/);
  state.rows[0].title = 'feat: concurrent';
  assert.throws(() => prs.publish({ ...prRequest, approved: true, confirmation: ready.confirmation, receipt: receipt() }, io), /approval/);
  assert.equal(state.writes.length, 0);
  state.rows = [pr('feat: old', 'Old')];
  const renewed = prs.query(prRequest, io);
  assert.equal(prs.publish({ ...prRequest, approved: true, confirmation: renewed.confirmation, receipt: receipt() }, io).status, 'complete');
  assert.deepEqual(Object.keys(state.writes[0].body).sort(), ['description', 'title']);
  state.rows.push({ ...state.rows[0], pullRequestId: 8 });
  assert.throws(() => prs.query(prRequest, io), /Multiple/);
});
test('E8 I9: uncertain Azure PR creation is query-only and needs identity evidence, not a coincident title', () => {
  const { io, state } = fixture(), ready = prs.query(prRequest, io), file = receipt(); state.lost = true;
  assert.equal(prs.publish({ ...prRequest, approved: true, confirmation: ready.confirmation, receipt: file }, io).status, 'uncertain');
  const found = prs.recover({ receipt: file }, io);
  assert.equal(found.status, 'uncertain');
  assert.equal(found.candidates.length, 1);
  assert.equal(prs.recover({ receipt: file, requestUrl: found.candidates[0].url }, io).status, 'complete');
  state.rows[0].lastMergeSourceCommit.commitId = 'b'.repeat(40);
  assert.equal(prs.recover({ receipt: file, requestUrl: found.candidates[0].url }, io).status, 'uncertain');
  assert.equal(state.writes.length, 1);
});
test('E8 I8 I9: failed PR readback remains uncertain even when its read is a confirmed rejection', () => {
  const { io, state } = fixture(), ready = prs.query(prRequest, io);
  state.failRemoteAfterWrite = true;
  assert.equal(prs.publish({ ...prRequest, approved: true, confirmation: ready.confirmation, receipt: receipt() }, io).status, 'uncertain');
  assert.equal(state.writes.length, 1);
});
test('E5 E6 E8 I7 I9: Boards no-op, pending and divergent recovery require no further writes', () => {
  const { io, state } = fixture(), reference = `${organization}/${project}/_workitems/edit/1`;
  const baseline = boards['read-update']({ reference }, io).baseline;
  assert.equal(boards['query-update']({ reference, baseline, title: baseline.title }, io).status, 'no_changes');
  const request = { reference, baseline, title: 'New' }, ready = boards['query-update'](request, io), file = receipt();
  state.race = true;
  assert.equal(boards.update({ ...request, confirmation: ready.confirmation, receipt: file }, io).status, 'rejected');
  assert.equal(boards['recover-update']({ receipt: file }, io).status, 'pending');
  state.items.get(1).fields['System.Title'] = 'Different'; state.items.get(1).rev++;
  assert.equal(boards['recover-update']({ receipt: file }, io).status, 'divergent');
  assert.equal(state.writes.length, 1);
});
test('E1 I1 I2 I4: origin references select one registry reference without commands; az uses the existing launcher', () => {
  const { spawnSync } = require('node:child_process');
  for (const [reference, provider] of [
    [`${organization}/${project}/_workitems/edit/1`, 'azuredevops'],
    ['https://org.visualstudio.com/Team/_workitems/edit/1', 'azuredevops'],
    ['/owner/repo/issues/1', 'github'],
    ['https://gitlab.example.com/group/repo/-/issues/1', 'gitlab']
  ]) {
    const result = spawnSync(process.execPath, ['sai/tools/to-backlog.js', 'resolve-origin', 'skills/universal/to-backlog/providers/registry.json'], { input: JSON.stringify({ reference }), encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout);
    const row = JSON.parse(result.stdout);
    assert.equal(row.provider, provider); assert.equal(row.instructions, `providers/${provider}-update.md`);
  }
  const child = spawnSync(process.execPath, ['-e', "const reader=require('./sai/tools/from-backlog');reader.run=(c,a,i)=>JSON.stringify({c,a,i});process.stdout.write(require('./sai/tools/to-backlog').run('az',['devops','invoke'],process.cwd(),'data'));"], { encoding: 'utf8' });
  assert.equal(child.status, 0);
  assert.deepEqual(JSON.parse(child.stdout), { c: 'az', a: ['devops', 'invoke'], i: 'data' });
});
test('I2 I10: references are branch-specific, approval limitations precede approval and both harnesses install the same tools', () => {
  const skill = fs.readFileSync('skills/universal/to-pr/SKILL.md', 'utf8');
  assert.ok(skill.indexOf('proposal.concurrency_warning') < skill.indexOf('Then ask:'));
  for (const name of ['to-pr', 'to-backlog']) assert.match(fs.readFileSync(`skills/universal/${name}/SKILL.md`, 'utf8'), /disable-model-invocation: true/);
  const { expandInstallManifest, loadInstallManifest } = require('../bin/install-manifest');
  const manifest = loadInstallManifest(process.cwd());
  for (const harness of ['claude', 'opencode']) {
    const root = path.join(os.tmpdir(), `azure-projection-${harness}`);
    const roots = Object.fromEntries(['commands', 'sai', 'skills', 'agents', 'config', 'root'].map(key => [key, path.join(root, key)]));
    const files = expandInstallManifest(manifest, { harness, repoRoot: process.cwd(), destinationRoot: roots });
    for (const file of ['azure-publication.js', 'azure-markdown.js', 'to-backlog-azuredevops.js', 'to-pr-azuredevops.js']) {
      const projection = files.find(row => row.destinationPath === path.join(roots.sai, 'tools', file));
      assert.ok(projection, `${harness} installs ${file}`);
      assert.equal(projection.ownership, 'managed'); assert.equal(projection.drift, 'content');
    }
    for (const [name, references] of [['to-pr', ['azuredevops.md']], ['to-backlog', ['azuredevops.md', 'azuredevops-update.md', 'azuredevops-content.md', 'azuredevops-transport.md']]]) {
      for (const file of references) assert.ok(files.some(row => row.destinationPath === path.join(roots.skills, name, 'providers', file)));
      const access = manifest.capabilities.profiles[`${name}-command`];
      assert.ok(access.shell.every(command => !/^az |^git /.test(command)), 'Only helper access, no independent az/push grant');
    }
  }
});
