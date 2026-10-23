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
  const state = { calls: [], writes: [], items: new Map(), rows: [], pullRequestCalls: [], head: 'a'.repeat(40), remoteHead: 'a'.repeat(40), rev: 1 };
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
      // Pull-request calls must select the git client with the repository-scoped location id, and never rely on invoke.
      if (sdk.client === 'git') {
        assert.equal(sdk.location, '9946fd70-0d40-406e-b686-b4744cbbcc37'); assert.equal(sdk.version, '7.1');
        assert.equal(sdk.route.project, project); assert.equal(sdk.route.repositoryId, 'repo-id');
        assert.equal(sdk.route.pullRequestId !== undefined, sdk.method === 'PATCH');
        state.pullRequestCalls.push({ method: sdk.method, route: sdk.route, location: sdk.location });
      }
      if (sdk.client === 'work') {
        assert.equal(sdk.location, 'c9175577-28a1-4b06-9197-8636af9f64ad');
        assert.deepEqual(sdk.route, { project, team: 'Team' });
        assert.deepEqual(sdk.query, { '$timeframe': 'current' });
      }
      if (sdk.location === '5a172953-1b41-49d3-840a-33f79c3ce89f') {
        assert.deepEqual(sdk.route, { project, structureGroup: 'iterations' });
        assert.equal(sdk.client, 'wit'); assert.equal(sdk.query.$depth, 14);
      }
      args = ['devops', 'invoke', '--resource', sdk.location === '5a172953-1b41-49d3-840a-33f79c3ce89f' ? 'classificationnodes' : { location: 'connectionData', wit: 'workitems', git: 'pullrequests', work: 'iterations' }[sdk.client], '--http-method', sdk.method,
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
    if (resource === 'connectionData') return JSON.stringify({ authenticatedUser: { id: 'actor', ...(state.uniqueName ? { properties: { Account: { $value: state.uniqueName } } } : {}) } });
    if (resource === 'iterations') return JSON.stringify({ value: state.iterations || [{ path: 'Team\\Sprint 1' }] });
    if (resource === 'classificationnodes') return JSON.stringify({ name: 'Team', children: [{ name: 'Sprint 1' }, { name: 'Sprint 2' }] });
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
      const id = method === 'PATCH' ? Number(parameter('id')) : 2, row = state.items.get(id) || item(id);
      if (method === 'PATCH' && (state.race || body[0].value !== row.rev)) throw new Error('HTTP status 412: revision test failed');
      const planning = body.some(part => part.path === '/relations/-' || /IterationPath|AssignedTo/.test(part.path));
      if (planning && state.rejectPlanning) throw new Error('HTTP status 400: planning rejected');
      for (const part of body) {
        if (part.path.startsWith('/fields/')) row.fields[part.path.slice(8)] = part.path.endsWith('AssignedTo') ? { id: 'actor', uniqueName: part.value } : part.value;
        if (part.path === '/relations/-') (row.relations ||= []).push(part.value);
      }
      row.rev++; state.items.set(id, row);
      if (state.lost || planning && state.lostPlanning) throw new Error('Connection lost after submission');
      return JSON.stringify(row);
    }
    assert.equal(resource, 'pullrequests');
    state.rows = [{ ...pr(body.title, body.description), ...(body.isDraft !== undefined ? { isDraft: body.isDraft } : state.rows[0]?.isDraft !== undefined ? { isDraft: state.rows[0].isDraft } : {}) }];
    if (state.lost) throw new Error('Lost write response');
    return JSON.stringify(state.rows[0]);
  } };
  return { io, state, pr };
}
test('Azure description boundaries and UTF-16 units are checked before approval or push, including update and publish', () => {
  for (const existing of [false, true]) {
    const { io, state, pr } = fixture();
    if (existing) state.rows = [pr('old', 'old')];
    const valid = { ...prRequest, description: 'x'.repeat(3998) + '\u{1f600}' };
    const ready = prs.query(valid, io);
    assert.equal(ready.proposal.description.length, 4000);
    const overflow = { ...valid, description: valid.description + 'x' };
    const check = error => error.provider === 'azuredevops' && error.length === 4001 && error.limit === 4000 && error.excess === 1;
    assert.throws(() => prs.query(overflow, io), check);
    assert.throws(() => prs.publish({ ...overflow, approved: true, confirmation: ready.confirmation }, io), check);
    assert.equal(state.writes.length, 0);
    assert.ok(!state.calls.some(call => call.command === 'git' && ['push', 'ls-remote'].includes(call.args[0])));
  }
});
test('Azure explicit draft create/conversion is approval-bound, omitted otherwise and verified independently of a response', () => {
  for (const existing of [false, true]) {
    const { io, state, pr } = fixture();
    if (existing) state.rows = [{ ...pr('old', 'old'), isDraft: false }];
    const plain = prs.query(prRequest, io), draft = { ...prRequest, draft: true };
    const ready = prs.query(draft, io);
    assert.notEqual(ready.confirmation, plain.confirmation);
    assert.throws(() => prs.publish({ ...draft, approved: true, confirmation: plain.confirmation }, io), /approval/);
    const file = receipt();
    assert.equal(prs.publish({ ...draft, approved: true, confirmation: ready.confirmation, receipt: file }, io).status, 'complete');
    assert.equal(state.writes[0].body.isDraft, true);
    assert.equal(state.rows[0].isDraft, true);
    delete state.rows[0].isDraft;
    const unverified = prs.recover({ receipt: file }, io);
    assert.equal(unverified.status, 'uncertain');
    assert.equal(unverified.pr.status, 'complete'); assert.equal(unverified.draft.status, 'pending');
    assert.equal(state.writes.length, 1);
  }
  const { io, state, pr } = fixture();
  state.rows = [{ ...pr('old', 'old'), isDraft: true }];
  const ready = prs.query(prRequest, io);
  assert.equal(prs.publish({ ...prRequest, approved: true, confirmation: ready.confirmation, receipt: receipt() }, io).status, 'complete');
  assert.equal(Object.hasOwn(state.writes[0].body, 'isDraft'), false);
  assert.equal(state.rows[0].isDraft, true);
});
test('Azure risk thread is complete, authored, updated in place and still blocks insufficient relocation', () => {
  const made = fixture(), { io, state } = made, baseRun = io.run;
  const threads = [], calls = [];
  io.run = (command, args, input) => {
    const sdk = command === 'azure-sdk' ? JSON.parse(input) : null;
    if (sdk && ['ab9e40f9-4de4-4271-baf8-0a97fbc7e7f1', 'c817c469-cee2-4f6e-9167-27d812472a76'].includes(sdk.location)) {
      assert.equal(sdk.route.repositoryId, 'repo-id'); assert.equal(sdk.route.pullRequestId, 7);
      assert.equal(sdk.version, '7.1');
      if (sdk.method === 'GET') return JSON.stringify({ count: threads.length, value: threads });
      calls.push(sdk);
      if (sdk.method === 'POST') threads.push({ id: 20, comments: [{ id: 1, content: sdk.body.comments[0].content, author: { id: 'actor' } }] });
      else threads[0].comments[0].content = sdk.body.content;
      return '{}';
    }
    return baseRun(command, args, input);
  };
  const block = '<!-- sai-inherent-risk:start -->\n## Inherent Risk\nComplete ratings\n<!-- sai-inherent-risk:end -->';
  const request = { ...prRequest, draft: true, risk_placement: 'comment', risk_block: block, description_overflow: { length: 5000, limit: 4000 } };
  assert.throws(() => prs.query({ ...request, description: 'x'.repeat(4001) }, io), error => error.code === 'description-too-long');
  const ready = prs.query(request, io);
  assert.equal(prs.publish({ ...request, approved: true, confirmation: ready.confirmation, receipt: receipt() }, io).status, 'complete');
  assert.equal(threads[0].comments[0].content, `<!-- sai-to-pr:inherent-risk -->\n${block}`);
  const next = { ...request, risk_block: block.replace('ratings', 'updated ratings') };
  assert.equal(prs.publish({ ...next, approved: true, confirmation: prs.query(next, io).confirmation, receipt: receipt() }, io).status, 'complete');
  assert.equal(calls.length, 2); assert.equal(calls[1].method, 'PATCH'); assert.equal(calls[1].route.threadId, 20);
  assert.equal(state.writes.length, 1, 'Comment-only update never repeats PR mutation');
});
function planningFixture() {
  const result = fixture();
  result.state.uniqueName = 'me@example.test';
  result.state.items.set(3, { id: 3, rev: 1, fields: { 'System.TeamProject': project, 'System.WorkItemType': 'Product Backlog Item', 'System.Title': 'Parent' } });
  return result;
}
const planningRequest = { repository: `${organization}/${project}`, type: 'Task', title: 'Create', description: 'Body', parent: 3, iteration: 'current', team: 'Team', assignToMe: true };
test('planning H1 M1: instruction completion follows the full proposal and provider-owned recovery', () => {
  const skill = fs.readFileSync('skills/universal/to-backlog/SKILL.md', 'utf8');
  const prepare = skill.split('## 2. Prepare one item')[1].split('## 3. Review and confirm')[0];
  assert.match(prepare, /operation determine whether the complete\s+intended content and planning result needs changes/);
  assert.match(prepare, /End without mutation only\s+on its `no_changes` result/);
  assert.doesNotMatch(prepare, /If content already matches/);
  const update = fs.readFileSync('skills/universal/to-backlog/providers/azuredevops-update.md', 'utf8');
  assert.match(update, /`recover-update`\s+takes the saved receipt for read-only verification/);
  assert.match(update, /provider-owned\s+planning recovery contract in `azuredevops\.md` for explicitly approved\s+pending-only continuation/);
  assert.match(update, /`complete` and `no_changes` require the intended\s+content and all requested planning fields to match/);
  assert.doesNotMatch(update, /only queries|`complete` requires equal content/);
  const commonUpdate = fs.readFileSync('skills/universal/to-backlog/update.md', 'utf8');
  assert.match(commonUpdate, /`complete` means\s+the complete intended content and planning result is verified/);
  assert.match(commonUpdate, /explicitly approved pending-planning continuation/);
});
test('planning E1 I2 I4: exact approval binds resolved planning; content precedes one native planning patch', () => {
  const { io, state } = planningFixture(), ready = boards.query(planningRequest, io), file = receipt();
  assert.equal(ready.proposal.planning.iteration, 'Team\\Sprint 1');
  assert.equal(ready.proposal.planning.assignee.id, 'actor');
  assert.equal(boards.publish({ ...planningRequest, parent: 1, confirmation: ready.confirmation, receipt: file }, io).status, 'failure_before_publication');
  assert.equal(state.writes.length, 0);
  const result = boards.publish({ ...planningRequest, confirmation: ready.confirmation, receipt: file }, io);
  assert.equal(result.status, 'complete');
  assert.equal(state.writes.length, 2);
  assert.deepEqual(state.writes[0].body.map(part => part.path), ['/fields/System.Title', '/fields/System.Description']);
  assert.deepEqual(state.writes[1].body.map(part => part.path), ['/rev', '/relations/-', '/fields/System.IterationPath', '/fields/System.AssignedTo']);
  assert.equal(state.writes[1].body.at(-1).value, 'me@example.test');
  assert.equal(boards.recover({ receipt: file }, io).status, 'complete');
  assert.equal(state.writes.length, 2);
});
test('planning E1 I2: parent alone never infers sprint or assignment; invalid references fail before writes', () => {
  const { io, state } = planningFixture(), request = { ...planningRequest, iteration: undefined, assignToMe: undefined };
  const ready = boards.query(request, io);
  assert.deepEqual(Object.keys(ready.proposal.planning), ['parent']);
  assert.equal(boards.publish({ ...request, confirmation: ready.confirmation, receipt: receipt() }, io).status, 'complete');
  assert.deepEqual(state.writes[1].body.map(part => part.path), ['/rev', '/relations/-']);
  for (const change of [{ parent: 1 }, { parent: `${organization}/Other/_workitems/edit/3` }, { parent: 'https://dev.azure.com/else/Team/_workitems/edit/3' }, { iteration: 'Team\\Missing' }, { iteration: 'current', team: undefined }, { assignToMe: 'someone' }, { assignee: 'someone' }, { state: 'Done' }]) {
    assert.throws(() => boards.query({ ...planningRequest, ...change }, io));
  }
  state.iterations = [];
  assert.throws(() => boards.query(planningRequest, io), /missing or ambiguous/);
  state.iterations = [{ path: 'Team\\Sprint 1' }, { path: 'Team\\Sprint 2' }];
  assert.throws(() => boards.query(planningRequest, io), /missing or ambiguous/);
  assert.equal(state.writes.length, 2);
});
test('planning E1 I2: current sprint and authenticated unique name changes invalidate publication approval', () => {
  const { io, state } = planningFixture(), ready = boards.query(planningRequest, io);
  state.iterations = [{ path: 'Team\\Sprint 2' }];
  assert.equal(boards.publish({ ...planningRequest, confirmation: ready.confirmation, receipt: receipt() }, io).status, 'failure_before_publication');
  state.iterations = [{ path: 'Team\\Sprint 1' }]; state.uniqueName = 'changed@example.test';
  assert.equal(boards.publish({ ...planningRequest, confirmation: ready.confirmation, receipt: receipt() }, io).status, 'failure_before_publication');
  state.uniqueName = undefined;
  assert.throws(() => boards.query(planningRequest, io), /unique name/);
  assert.equal(state.writes.length, 0);
});
test('planning E2 I4: rejection remains partial; read-only recovery then approved continuation never recreates content', () => {
  const { io, state } = planningFixture(), ready = boards.query(planningRequest, io), file = receipt();
  state.rejectPlanning = true;
  assert.equal(boards.publish({ ...planningRequest, confirmation: ready.confirmation, receipt: file }, io).status, 'partial_failure');
  const pending = boards.recover({ receipt: file }, io);
  assert.equal(pending.status, 'partial_failure');
  assert.deepEqual(pending.confirmed, ['content']);
  assert.deepEqual(pending.pending, ['parent', 'iteration', 'assignee']);
  assert.equal(state.writes.length, 2);
  assert.equal(boards.recover({ receipt: file, confirmation: pending.continuation }, io).status, 'uncertain');
  state.rejectPlanning = false;
  assert.equal(boards.recover({ receipt: file, confirmation: pending.continuation, approved: true }, io).status, 'complete');
  assert.equal(state.writes.length, 3);
  assert.equal(state.writes.filter(row => row.method === 'POST').length, 1);
  assert.equal(boards.recover({ receipt: file, confirmation: pending.continuation, approved: true }, io).status, 'complete');
  assert.equal(state.writes.length, 3);
});
test('planning E2 I4: lost planning response verifies completed fields without another write', () => {
  const { io, state } = planningFixture(), ready = boards.query(planningRequest, io), file = receipt();
  state.lostPlanning = true;
  assert.equal(boards.publish({ ...planningRequest, confirmation: ready.confirmation, receipt: file }, io).status, 'partial_failure');
  assert.equal(boards.recover({ receipt: file }, io).status, 'complete');
  assert.equal(state.writes.length, 2);
});
test('planning E1 E2 I2 I4: planning-only update binds baseline, protects parent conflicts and is idempotent', () => {
  const { io, state } = planningFixture(), reference = `${organization}/${project}/_workitems/edit/1`;
  const current = boards['read-update']({ reference }, io);
  assert.deepEqual(current.planning_state, { parent: null, iteration: null, assignee: null });
  const request = { ...planningRequest, reference, baseline: current.baseline, title: current.baseline.title, description: undefined };
  const ready = boards['query-update'](request, io), file = receipt();
  assert.equal(ready.status, 'ready');
  assert.equal(boards.update({ ...request, confirmation: ready.confirmation, receipt: file }, io).status, 'complete');
  const next = boards['read-update']({ reference }, io);
  assert.equal(boards['query-update']({ ...request, baseline: next.baseline }, io).status, 'no_changes');
  state.items.get(1).relations[0].url = `${organization}/_apis/wit/workItems/4`;
  assert.throws(() => boards['query-update']({ ...request, baseline: next.baseline }, io), /different native parent/);
  assert.equal(state.writes.length, 2);
});
test('planning E2 I4: stale continuation does not overwrite a concurrent planning change', () => {
  const { io, state } = planningFixture(), ready = boards.query(planningRequest, io), file = receipt();
  state.rejectPlanning = true;
  boards.publish({ ...planningRequest, confirmation: ready.confirmation, receipt: file }, io);
  const pending = boards.recover({ receipt: file }, io);
  state.items.get(2).rev++; state.items.get(2).fields['System.IterationPath'] = 'Team\\Sprint 2';
  state.rejectPlanning = false;
  assert.equal(boards.recover({ receipt: file, confirmation: pending.continuation, approved: true }, io).status, 'uncertain');
  assert.equal(state.writes.length, 2);
});
test('planning I3: ordinary Azure read exposes parent, iteration and assignment and rejects malformed metadata', () => {
  const reader = require('../sai/tools/from-backlog-azuredevops');
  const row = { id: 1, fields: { 'System.TeamProject': project, 'System.Title': 'Task', 'System.WorkItemType': 'Task', 'System.State': 'New',
    'System.IterationPath': 'Team\\Sprint 1', 'System.AssignedTo': { id: 'actor', uniqueName: 'me@example.test', displayName: 'Me' } },
    relations: [{ rel: 'System.LinkTypes.Hierarchy-Reverse', url: `${organization}/_apis/wit/workItems/3` }] };
  const io = { run(command, args) {
    assert.equal(command, 'az');
    if (args[0] === 'boards') { assert.ok(args.includes('relations')); return JSON.stringify(row); }
    return JSON.stringify({ comments: [], count: 0, totalCount: 0 });
  } };
  const ref = { organization, project, number: 1 }, result = reader.read(ref, io);
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.item.parent, { id: 3, url: `${organization}/_apis/wit/workItems/3` });
  assert.equal(result.item.iteration, 'Team\\Sprint 1');
  assert.deepEqual(result.item.assignment, { id: 'actor', displayName: 'Me', uniqueName: 'me@example.test' });
  row.fields['System.AssignedTo'] = {};
  assert.equal(reader.read(ref, io).status, 'incomplete');
});
test('planning E1 E2: a race after continuation verification cannot overwrite unapproved state', () => {
  const { io, state } = planningFixture(), ready = boards.query(planningRequest, io), file = receipt();
  state.rejectPlanning = true;
  boards.publish({ ...planningRequest, confirmation: ready.confirmation, receipt: file }, io);
  const pending = boards.recover({ receipt: file }, io);
  state.rejectPlanning = false;
  let reads = 0;
  const racing = { run(command, args, input) {
    const sdk = command === 'azure-sdk' ? JSON.parse(input) : null;
    if (sdk?.query?.$expand === 'relations' && ++reads === 2) {
      state.items.get(2).rev++; state.items.get(2).fields['System.IterationPath'] = 'Team\\Sprint 2';
    }
    return io.run(command, args, input);
  } };
  assert.equal(boards.recover({ receipt: file, confirmation: pending.continuation, approved: true }, racing).status, 'partial_failure');
  assert.equal(state.items.get(2).fields['System.IterationPath'], 'Team\\Sprint 2');
  assert.equal(state.writes.length, 2);
});
test('planning E2 I4: update continuation applies only fields still pending after verified partial completion', () => {
  const { io, state } = planningFixture(), reference = `${organization}/${project}/_workitems/edit/1`;
  const baseline = boards['read-update']({ reference }, io).baseline;
  const request = { ...planningRequest, reference, baseline }, ready = boards['query-update'](request, io), file = receipt();
  state.rejectPlanning = true;
  assert.equal(boards.update({ ...request, confirmation: ready.confirmation, receipt: file }, io).status, 'partial_failure');
  const row = state.items.get(1);
  row.relations = [{ rel: 'System.LinkTypes.Hierarchy-Reverse', url: `${organization}/_apis/wit/workItems/3` }]; row.rev++;
  const pending = boards['recover-update']({ receipt: file }, io);
  assert.deepEqual(pending.confirmed, ['content', 'parent']);
  assert.deepEqual(pending.pending, ['iteration', 'assignee']);
  state.rejectPlanning = false;
  assert.equal(boards['recover-update']({ receipt: file, confirmation: pending.continuation, approved: true }, io).status, 'complete');
  assert.deepEqual(state.writes.at(-1).body.map(part => part.path), ['/rev', '/fields/System.IterationPath', '/fields/System.AssignedTo']);
});
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
  assert.throws(() => prs.push({ ...prRequest, approved: true, push_token: pushReady.confirmation }, io), /push approval/);
  assert.match(fs.readFileSync('skills/universal/to-pr/SKILL.md', 'utf8'), /`push token` in the\s+`confirmation` field/);
  assert.equal(prs.push({ ...prRequest, approved: true, confirmation: pushReady.confirmation }, io).status, 'complete');
  assert.equal(prs.publish({ ...prRequest, approved: true, confirmation: ready.confirmation, receipt: receipt() }, io).status, 'complete');
  assert.deepEqual(Object.keys(state.writes[1].body).sort(), ['description', 'sourceRefName', 'targetRefName', 'title']);
  assert.equal(state.rows[0].description, prRequest.description);
  assert.ok(state.pullRequestCalls.length >= 2);
  assert.ok(state.pullRequestCalls.some(call => call.method === 'GET') && state.pullRequestCalls.some(call => call.method === 'POST'));
  assert.ok(state.calls.every(call => call.command !== 'az' || !call.args.includes('--in-file')), 'no payload file is written');
});
test('E8 I3: Azure Repos descriptions publish as drafted, without a closing block or a commit-log read', () => {
  const { io, state } = fixture();
  const ready = prs.query({ ...prRequest, description: `${prRequest.description}\nCloses #5` }, io);
  assert.equal(ready.proposal.description, `${prRequest.description}\nCloses #5`);
  // E9: creation states in one line that Azure has no assignee or labels, and reads neither.
  assert.deepEqual(ready.warnings, ['no assignee or labels: the provider does not support them']);
  assert.equal(ready.proposal.assignee, undefined);
  assert.equal(ready.proposal.labels, undefined);
  assert.equal(state.calls.some(call => call.command === 'git' && call.args[0] === 'log'), false);
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
  assert.ok(state.pullRequestCalls.some(call => call.method === 'PATCH' && call.route.pullRequestId === 7));
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
// Harmless normalization (E1, E2, E5, E6): sent Markdown converts to `sent`; Azure stores and returns `received`.
const counters = '<!-- backlog-id-counters: E=1 I=2 Q=3 -->';
function normalizationCase(markdown, received) {
  const { io, state } = fixture(), reference = `${organization}/${project}/_workitems/edit/1`;
  state.items.get(1).fields['System.Description'] = received;
  const baseline = boards['read-update']({ reference }, io).baseline;
  return { io, state, status: boards['query-update']({ reference, baseline, title: baseline.title, description: markdown }, io).status };
}
test('E1 E2 E6 I1 I2: update with only harmless Azure normalization is no_changes and writes nothing', () => {
  const list = '## Goal\n\ntext\n\n- a\n- b';
  for (const [markdown, received] of [
    [list, '<h2>Goal</h2>\n\n<p>text</p>\n<ul>\n<li>a\n</li>\n<li>b</li>\n</ul>'],
    [list, '<h2>Goal\n</h2>\n  <p>text</p>\n<ul><li>a</li><li>b</li></ul>'],
    [`text\n\n${counters}`, '<p>text</p>'],
    [`text\n\n${counters}`, `<p>text</p>\n${counters}`],
    [`text\n\n${counters}\n\nmore`, '<p>text</p>\n<p>more\n</p>'],
    ['```\na  b\n```', '<pre><code>a  b</code></pre>'],
    ['text', '<p>text</p>\n'],
    [`text\n\n${counters}`, '<p>text</p>\n'],
    [`text\n\n${counters}`, '\n<p>text</p>\n\n'],
    ['text', '\n<p>text</p>'],
    ['## A\n\ntext', '<h2>A</h2>\n<p>text</p>\n']
  ]) {
    const result = normalizationCase(markdown, received);
    assert.equal(result.status, 'no_changes', received);
    assert.equal(result.state.writes.length, 0);
  }
});
test('E2 E3 E4 I1 I2: meaningful differences, including those next to normalization, stay visible', () => {
  for (const [markdown, received] of [
    ['foo bar', '<p>foobar</p>'],
    ['foo bar', '<p>foo  bar</p>'],
    ['**foo**bar', '<p><strong>foo </strong>bar</p>'],
    ['```\na b\n```', '<pre><code>a  b</code></pre>'],
    ['```\na b\n```', '<pre><code>a b\n</code></pre>'],
    ['```\na b\n```', '<pre>\n<code>a b</code></pre>'],
    ['`a b`', '<p><code>a  b</code></p>'],
    [`text\n\n${counters}`, '<p>text</p>\n<!-- other -->'],
    [`text\n\n${counters}`, '<p>text</p>\n<!-- backlog-id-counters: E=1 I=2 Q=4 -->'],
    [`text\n\n${counters}`, '<p>other</p>'],
    ['[guide](https://a.test)', '<p><a href="https://b.test">guide</a></p>\n'],
    ['text\n\nmore', '<p>text</p><p>more</p>\n<p>extra</p>'],
    ['text\n\nmore', '<p>text</p>more'],
    ['text\n\nmore', '<p>text</p><p>more</p>'],
    ['text', '<p>text</p> x\n'],
    ['text', '<p>text</p><b>x</b>\n'],
    ['```\na\n```', '<pre><code>a</code></pre>\n<pre><code>a\n']
  ]) assert.equal(normalizationCase(markdown, received).status, 'ready', received);
  assert.equal(normalizationCase('text\n\nmore', '<p>text\n</p>\n<p>more</p>').status, 'no_changes');
  assert.equal(normalizationCase('text\n\nmore', '<p>text\n</p>\n<p>changed</p>').status, 'ready');
});
test('E5 I2: creation recovery recognizes normalized content once and still rejects different content', () => {
  for (const [received, found] of [['<h2>Body</h2>\n\n<p>Exact\n</p>', true], ['<h2>Body</h2>\n<p>Exact changed</p>', false]]) {
    const { io, state } = fixture(), request = { repository: `${organization}/${project}`, type: 'Task', title: 'Create', description: '## Body\nExact' };
    const ready = boards.query(request, io), file = receipt(); state.lost = true;
    assert.equal(boards.publish({ ...request, confirmation: ready.confirmation, receipt: file }, io).status, 'uncertain');
    state.items.get(2).fields['System.Description'] = received;
    const recovery = boards.recover({ receipt: file }, io);
    assert.equal(recovery.status, 'uncertain');
    assert.equal(recovery.candidates.length, found ? 1 : 0);
    if (found) assert.equal(boards.recover({ receipt: file, issueUrl: recovery.candidates[0].url }, io).status, 'complete');
    assert.equal(state.writes.length, 1, 'Recovery must not publish');
  }
});
test('E5 I2 I3: update outcome accepts normalized content and compares two Azure reads strictly', () => {
  const { io, state } = fixture(), reference = `${organization}/${project}/_workitems/edit/1`;
  const baseline = boards['read-update']({ reference }, io).baseline;
  const request = { reference, baseline, title: 'New', description: '## Body\nExact' }, ready = boards['query-update'](request, io), file = receipt();
  state.lost = true;
  assert.equal(boards.update({ ...request, confirmation: ready.confirmation, receipt: file }, io).status, 'uncertain');
  state.items.get(1).fields['System.Description'] = '<h2>Body</h2>\n\n<p>Exact\n</p>';
  assert.equal(boards['recover-update']({ receipt: file }, io).status, 'complete');
  state.items.get(1).fields['System.Description'] = '<h2>Body</h2>\n<p>Exact  changed</p>';
  assert.equal(boards['recover-update']({ receipt: file }, io).status, 'divergent');
  assert.equal(state.writes.length, 1);
});
test('E1 E2 E3: the Azure adapter declares normalization only for itself', () => {
  assert.equal(typeof require('../sai/tools/backlog-provider-set').bind, 'function');
  const source = fs.readFileSync(path.join(__dirname, '..', 'sai', 'tools', 'to-backlog-github.js'), 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'sai', 'tools', 'to-backlog-gitlab.js'), 'utf8');
  assert.doesNotMatch(source, /equivalent/);
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
