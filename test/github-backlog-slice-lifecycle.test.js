'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const detector = require('../sai/tools/ready-to-propose');
const github = require('../sai/tools/to-backlog-github');
const source = require('../sai/tools/from-backlog-github');
const assignment = require('../sai/tools/backlog-assignment-github');
const identity = require('../sai/tools/backlog-slice-identity');
function block(name, dependencies = 'None') {
  return ['## Ready to Propose', ...detector.STRICT_FIELDS.filter(field => !field.optional || field.label === 'Depends on').map(field => `**${field.label}**: ${field.label === 'Change name' ? name : field.label === 'Depends on' ? dependencies : field.inline ? 'None' : field.label === 'Out of scope Implementation Details' ? '\n- None' : '\n- I1: agreed source content'}`), '---'].join('\n');
}
function fake({ native = false } = {}) {
  const state = { native, issues: [], members: new Set(), parents: new Map(), blockers: new Map(), calls: [], fail: null, failNumber: null, failNative: false, lostCreation: false, sleeps: [], reads: new Map(), visibleAfter: 0, noItemId: false, autoAdd: false, archived: false, otherProject: false, nullItems: false, hierarchyResponse: null };
  // Direct reads see a member after `visibleAfter` earlier reads of it; the lagging items connection is never read.
  const seen = id => { if (!state.members.has(id)) return false; state.reads.set(id, (state.reads.get(id) || 0) + 1); return state.reads.get(id) > state.visibleAfter; };
  const page = nodes => ({ nodes, pageInfo: { hasNextPage: false, endCursor: null } });
  const project = { id: 'P', title: 'Project', url: 'https://github.com/users/actor/projects/1', closed: false, viewerCanUpdate: true };
  const repo = { id: 'R', nameWithOwner: 'owner/repo', url: 'https://github.com/owner/repo', visibility: 'PRIVATE', hasIssuesEnabled: true, isArchived: false };
  const io = { sleep: ms => state.sleeps.push(ms), run(command, args, input) {
    state.calls.push({ command, args, input });
    if (args[0] !== 'api') return '';
    if (args[1] === 'graphql') {
      const { query, variables: v } = JSON.parse(input);
      if (state.fail && query.includes(state.fail) && (state.failNumber === null || state.failNumber === v.number)) throw new Error('injected read/write failure');
      let data;
      if (query.includes('__type(')) data = { __type: { fields: state.native ? [{ name: 'parent' }, { name: 'subIssues' }, { name: 'blockedBy' }] : [] } };
      else if (query.includes('createIssue')) {
        const issue = { id: `I${state.issues.length + 1}`, number: state.issues.length + 1, url: `https://github.com/owner/repo/issues/${state.issues.length + 1}`, title: v.title, body: v.body, author: { login: 'actor' }, assignees: [], state: 'OPEN' };
        state.issues.push(issue); data = { createIssue: { issue } };
        if (state.autoAdd) state.members.add(issue.id);
        if (state.lostCreation) { state.lostCreation = false; throw new Error('lost creation response'); }
      } else if (query.includes('updateIssue')) {
        const issue = state.issues.find(row => row.id === v.id); issue.title = v.title; issue.body = v.body;
        data = { updateIssue: { issue } };
      } else if (query.includes('addProjectV2ItemById')) {
        if (state.insertionError) {
          if (state.raceMember) state.members.add(v.issue);
          state.afterInsertionError = true;
          if (state.graphqlError) return JSON.stringify({ errors: [{ message: state.insertionError, path: ['addProjectV2ItemById'] }] });
          throw new Error(state.insertionError);
        }
        state.members.add(v.issue); data = { addProjectV2ItemById: { item: state.noItemId ? null : { id: `member-${v.issue}` } } };
      }
      else if (query.includes('items(first')) throw new Error('The lagging items connection must not be read');
      else if (query.includes('on ProjectV2Item{')) { const issue = v.id.replace('member-', ''); data = { node: seen(issue) ? { id: v.id, project: { id: 'P' }, content: { id: issue } } : null }; }
      else if (query.includes('projectItems(first')) {
        if (state.afterInsertionError && state.failRaceRead) throw new Error('Membership query denied');
        const own = seen(v.id) ? [{ id: `member-${v.id}`, project: { id: 'P' }, ...(state.archived ? { isArchived: true } : {}) }] : [];
        data = { node: { projectItems: state.nullItems && !own.length ? null : page(state.otherProject ? [{ id: 'other', project: { id: 'P2' } }, ...own] : own) } };
      }
      else if (query.includes('viewerCanUpdate') && query.includes('issue(number')) {
        const issue = state.issues.find(row => row.number === v.number);
        data = { viewer: { login: 'actor' }, repository: { visibility: repo.visibility, issue: { id: issue.id, url: issue.url, viewerCanUpdate: state.viewerCanUpdate !== false, title: issue.title, body: issue.body } } };
      }
      else if (query.includes('issues(first')) data = { repository: { issues: page(state.issues) } };
      else if (query.includes('issueOrPullRequest')) data = { repository: { ...repo, issueOrPullRequest: { __typename: 'Issue', ...state.issues.find(row => row.number === v.number) } } };
      else if (query.includes('comments(first')) data = { repository: { issue: { comments: page([{ id: `C${v.number}`, url: `comment-${v.number}`, body: 'Full comment', author: { login: 'author' } }]) } } };
      else if (query.includes('assignees(first')) data = { repository: { issue: { assignees: page(state.issues.find(row => row.number === v.number).assignees.map(login => ({ login }))) } } };
      else if (query.includes('parent{url} subIssues(first:1)')) {
        const parent = state.issues.find(row => row.number === state.parents.get(v.number));
        const children = state.issues.filter(row => state.parents.get(row.number) === v.number);
        data = { repository: { issue: { parent: parent ? { url: parent.url } : null, subIssues: { nodes: children.slice(0, 1).map(row => ({ url: row.url })) } } } };
        if (state.hierarchyResponse) data = state.hierarchyResponse(data);
      }
      else if (query.includes('parent{url}')) data = { repository: { issue: { parent: state.parents.has(v.number) ? { url: state.issues.find(row => row.number === state.parents.get(v.number)).url } : null } } };
      else if (query.includes('subIssues(first')) data = { repository: { issue: { subIssues: page(state.issues.filter(row => state.parents.get(row.number) === v.number).map(row => ({ url: row.url }))) } } };
      else if (query.includes('blockedBy(first')) data = { repository: { issue: { blockedBy: page(state.issues.filter(row => state.blockers.get(v.number)?.includes(row.number)).map(row => ({ url: row.url }))) } } };
      else if (query.includes('projectV2(number')) data = { user: { projectV2: project } };
      else data = { viewer: { login: 'actor' }, repository: { ...repo, projectsV2: page([project]) } };
      return JSON.stringify({ data });
    }
    const endpoint = args[args.indexOf('github.com') + 1];
    const method = args[args.indexOf('--method') + 1];
    if (endpoint === 'user') return JSON.stringify({ login: 'actor' });
    const number = Number(/issues\/(\d+)/.exec(endpoint)?.[1]);
    const issue = state.issues.find(row => row.number === number);
    if (endpoint.includes('/dependencies/blocked_by')) {
      if (state.failNative) throw new Error('Native dependencies unavailable');
      if (method === 'POST') { state.blockers.set(number, [...(state.blockers.get(number) || []), JSON.parse(input).issue_id]); return '{}'; }
      return JSON.stringify(state.issues.filter(row => state.blockers.get(number)?.includes(row.number)).map(row => ({ id: row.number, html_url: row.url })));
    }
    if (endpoint.includes('/sub_issues')) {
      if (state.failNative) throw new Error('Native hierarchy is unavailable for this repository');
      if (method === 'POST') {
        const child = state.issues.find(row => row.number === JSON.parse(input).sub_issue_id);
        state.parents.set(child.number, number); return '{}';
      }
      return JSON.stringify(state.issues.filter(row => state.parents.get(row.number) === number).map(row => ({ id: row.number, html_url: row.url })));
    }
    if (method === 'PATCH') issue.assignees = JSON.parse(input).assignees;
    return JSON.stringify({ id: issue.number, html_url: issue.url, body: issue.body, assignees: issue.assignees.map(login => ({ login })) });
  } };
  return { state, io, request: { provider: 'github', repository: 'owner/repo', project: project.url, title: 'Existing agreed parent', description: 'Parent content in full', blocks: block('dependent', 'blocker') + '\n' + block('blocker') } };
}
function receipt(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-slices-')); fs.chmodSync(directory, 0o700);
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return path.join(directory, 'receipt.json');
}
function publish(t, fixture) {
  const ready = github['query-set'](fixture.request, fixture.io);
  assert.equal(ready.status, 'ready');
  const file = receipt(t);
  return { result: github['publish-set']({ ...fixture.request, confirmation: ready.confirmation, receipt: file }, fixture.io), file };
}
test('published GitHub set updates only changed content without creations, membership or relation mutations', t => {
  const f = fake({ native: true }), published = publish(t, f);
  assert.equal(published.result.status, 'complete');
  const request = { origin: f.state.issues[0].url, title: f.request.title, description: f.request.description, blocks: block('blocker') + '\n' + block('dependent', 'blocker') };
  assert.equal(github['query-set-update'](request, f.io).status, 'no_changes');
  request.blocks = request.blocks.replace('**What**: None', '**What**: refined child');
  const ready = github['query-set-update'](request, f.io);
  assert.equal(ready.status, 'ready');
  const start = f.state.calls.length, file = receipt(t);
  const result = github['update-set']({ ...request, confirmation: ready.confirmation, receipt: file }, f.io);
  assert.equal(result.status, 'complete', JSON.stringify(result));
  assert.deepEqual(result.updated.map(item => item.number), [2]);
  assert.equal(f.state.issues.length, 3);
  const writes = f.state.calls.slice(start).filter(call => call.input && JSON.parse(call.input).query?.startsWith('mutation'));
  assert.equal(writes.length, 1);
  assert.match(JSON.parse(writes[0].input).query, /updateIssue/);
  assert.deepEqual(result.correspondence, published.result.correspondence);
  assert.equal(github['recover-set-update']({ receipt: file }, f.io).status, 'complete');
});

test('dependency validator separates singleton and complete sets, format, duplicate, self, absent and cycles', () => {
  assert.equal(detector.checkStrict(block('dependent', 'blocker')).ok, true);
  for (const deps of ['blocker blocker', 'blocker,', 'blocker; second', 'blocker, blocker', 'dependent']) assert.equal(detector.checkStrict(block('dependent', deps)).ok, false, deps);
  assert.equal(detector.validateDependencySet(block('dependent', 'blocker')).ok, false);
  assert.equal(detector.validateDependencySet(block('one', 'two') + '\n' + block('two', 'one')).ok, false);
  const text = block('dependent', 'one, two') + '\n' + block('one') + '\n' + block('two') + '\n' + block('independent');
  assert.deepEqual(detector.validateDependencySet(text).order, ['one', 'two', 'dependent', 'independent']);
  assert.notEqual(detector.hashBlock(block('one')), detector.hashBlock(block('one', 'two')));
  assert.deepEqual(detector.extractBlockTexts(text)[0], block('dependent', 'one, two'));
  const withOrigin = block('one').replace('**What**:', '**Backlog origin**: https://github.com/owner/repo/issues/2\n**What**:');
  assert.equal(detector.checkStrict(withOrigin).ok, true);
  assert.equal(detector.checkStrict(withOrigin.replace('https://github.com/owner/repo/issues/2', 'https://other.test/issues/2')).ok, false);
});
for (const native of [false, true]) test(`set publication and complete import: ${native ? 'native' : 'written'} hierarchy`, t => {
  const fixture = fake({ native });
  const { result } = publish(t, fixture);
  assert.equal(result.status, 'complete', JSON.stringify(result));
  assert.equal(fixture.state.issues.length, 3);
  assert.deepEqual(result.correspondence.slices.map(row => row.change_name), ['blocker', 'dependent']);
  assert.equal(result.representation.hierarchy, native ? 'native' : 'written');
  assert.equal(result.representation.dependencies, native ? 'native' : 'written');
  if (native) assert.deepEqual(fixture.state.blockers.get(3), [2]);
  assert.ok(fixture.state.issues[2].body.startsWith(block('dependent', 'blocker')));
  fixture.state.issues[0].assignees = ['parent-owner'];
  const imported = source.readSet(source.normalize(fixture.state.issues[0].url), fixture.io);
  assert.equal(imported.status, 'complete', JSON.stringify(imported));
  assert.equal(imported.origin.issue, fixture.state.issues[0].url);
  assert.equal(imported.sources.length, 3);
  assert.deepEqual(imported.item.assignees, ['parent-owner']);
  assert.equal(imported.sources[2].comments[0].body, 'Full comment');
  const child = source.readSet(source.normalize(fixture.state.issues[2].url), fixture.io);
  assert.equal(child.status, 'complete', JSON.stringify(child));
  assert.equal(child.sources.length, 2);
  assert.equal(child.sources[1].role, 'parent-context');
  assert.equal(child.origin.issue, fixture.state.issues[2].url);
  assert.deepEqual(child.item.dependencies, [fixture.state.issues[1].url]);
  assert.deepEqual(fixture.state.issues[0].assignees, ['parent-owner']);
});
test('one-slice set creates parent and child; simple publication API remains unchanged', t => {
  const fixture = fake(); fixture.request.blocks = block('one');
  assert.equal(publish(t, fixture).result.status, 'complete');
  assert.equal(fixture.state.issues.length, 2);
  assert.equal(github.query({ ...fixture.request, blocks: undefined }, fixture.io).proposal.operation, undefined);
  assert.equal(typeof github.publish, 'function');
});
test('partial creation has read-only recovery and approved continuation without duplicates', t => {
  const fixture = fake(); fixture.state.lostCreation = true;
  const { result, file } = publish(t, fixture);
  assert.equal(result.status, 'partial_failure'); assert.equal(fixture.state.issues.length, 1);
  let recovered = github['recover-set']({ receipt: file }, fixture.io);
  assert.equal(recovered.candidates.length, 1);
  assert.equal(fixture.state.issues.length, 1);
  assert.throws(() => github['continue-set']({ receipt: file, confirmation: 'not approval', identified: { 0: fixture.state.issues[0].url } }, fixture.io), /approval/);
  recovered = github['recover-set']({ receipt: file, identified: { 0: fixture.state.issues[0].url } }, fixture.io);
  assert.equal(github['continue-set']({ receipt: file, confirmation: recovered.continuation }, fixture.io).status, 'complete');
  assert.equal(fixture.state.issues.length, 3);
});
const adds = fixture => fixture.state.calls.filter(call => call.input?.includes('addProjectV2ItemById(')).length;
test('one durable automatic retry covers the complete set and exhaustion survives recovery', t => {
  const fixture = fake(); fixture.state.insertionError = 'Permission denied';
  const { file } = publish(t, fixture);
  let verified = github['recover-set']({ receipt: file }, fixture.io);
  assert.equal(adds(fixture), 1);
  const failed = github['continue-set']({ receipt: file, confirmation: verified.continuation, automatic_retry: true }, fixture.io);
  assert.equal(failed.status, 'partial_failure');
  assert.equal(JSON.parse(fs.readFileSync(file)).automatic_retry_consumed, true);
  verified = github['recover-set']({ receipt: file }, fixture.io);
  assert.throws(() => github['continue-set']({ receipt: file, confirmation: verified.continuation, automatic_retry: true }, fixture.io), /exhausted/);
  assert.equal(adds(fixture), 2);
  fixture.state.insertionError = null;
  // An explicit subsequent answer still uses the fresh verified token.
  assert.equal(github['continue-set']({ receipt: file, confirmation: verified.continuation }, fixture.io).status, 'complete');
  assert.equal(fixture.state.issues.length, 3);
});
test('automatic continuation preserves verified work and completion does not consume retry', t => {
  const fixture = fake(); fixture.state.insertionError = 'Permission denied';
  const { file } = publish(t, fixture);
  const verified = github['recover-set']({ receipt: file }, fixture.io);
  fixture.state.insertionError = null;
  assert.equal(github['continue-set']({ receipt: file, confirmation: verified.continuation, automatic_retry: true }, fixture.io).status, 'complete');
  const before = fixture.state.calls.filter(call => call.input?.includes('mutation(')).length;
  assert.equal(github['continue-set']({ receipt: file, automatic_retry: true }, fixture.io).status, 'complete');
  assert.equal(fixture.state.calls.filter(call => call.input?.includes('mutation(')).length, before);
  assert.equal(fixture.state.issues.length, 3);
});
test('uncertain creation and changed content cannot use the automatic continuation', t => {
  const fixture = fake(); fixture.state.lostCreation = true;
  const { file } = publish(t, fixture);
  const verified = github['recover-set']({ receipt: file }, fixture.io);
  assert.equal(github['continue-set']({ receipt: file, confirmation: verified.continuation, automatic_retry: true }, fixture.io).candidates.length, 1);
  assert.equal(JSON.parse(fs.readFileSync(file)).automatic_retry_consumed, undefined);
  assert.equal(fixture.state.issues.length, 1);
  fixture.state.issues[0].body = 'unapproved edit';
  assert.equal(github['continue-set']({ receipt: file, identified: { 0: fixture.state.issues[0].url }, confirmation: verified.continuation, automatic_retry: true }, fixture.io).candidates.length, 1);
  assert.equal(fixture.state.issues.length, 1);
});
test('known issue content and relationship scope changes invalidate automatic continuation', t => {
  const fixture = fake({ native: true }); fixture.state.failNative = true;
  const { file } = publish(t, fixture);
  const fallback = github['recover-set']({ receipt: file, fallback: 'written' }, fixture.io);
  assert.throws(() => github['continue-set']({ receipt: file, fallback: 'written', confirmation: fallback.continuation, automatic_retry: true }, fixture.io), /renewed approval/);
  fixture.state.failNative = false;
  const verified = github['recover-set']({ receipt: file }, fixture.io);
  fixture.state.issues[0].body = 'unapproved edit';
  assert.throws(() => github['continue-set']({ receipt: file, confirmation: verified.continuation, automatic_retry: true }, fixture.io), /diverged/);
  assert.equal(JSON.parse(fs.readFileSync(file)).automatic_retry_consumed, undefined);
});
test('verified completion consumes nothing and an unread relationship authorizes no retry', t => {
  const complete = fake(); const finished = publish(t, complete);
  const before = complete.state.calls.length;
  assert.equal(github['continue-set']({ receipt: finished.file, automatic_retry: true }, complete.io).status, 'complete');
  assert.equal(JSON.parse(fs.readFileSync(finished.file)).automatic_retry_consumed, undefined);
  assert.ok(complete.state.calls.slice(before).every(call => !call.input?.includes('mutation(')));
  const partial = fake({ native: true }); partial.state.failNative = true;
  const { file } = publish(t, partial);
  assert.throws(() => github['recover-set']({ receipt: file }, partial.io), /unavailable/);
  assert.throws(() => github['continue-set']({ receipt: file, automatic_retry: true }, partial.io), /unavailable/);
  assert.equal(JSON.parse(fs.readFileSync(file)).automatic_retry_consumed, undefined);
});
test('Project membership is verified by direct reads: no wait when visible at once, no items connection', t => {
  const fixture = fake(); const { result } = publish(t, fixture);
  assert.equal(result.status, 'complete'); assert.equal(adds(fixture), 3); assert.deepEqual(fixture.state.sleeps, []);
});
test('lagging visibility waits two seconds between at most five reads per issue', t => {
  const fixture = fake(); fixture.state.visibleAfter = 2;
  const { result } = publish(t, fixture);
  assert.equal(result.status, 'complete');
  assert.deepEqual(fixture.state.sleeps, Array(6).fill(2000));
});
test('unverified Project membership stops with project pending, then recover-set and continue-set decide by the issue-side read', t => {
  const fixture = fake(); fixture.state.visibleAfter = 99;
  const { result, file } = publish(t, fixture);
  assert.equal(result.status, 'partial_failure'); assert.equal(result.message, 'Project membership not verified');
  assert.ok(result.pending.includes('project:0')); assert.equal(fixture.state.issues.length, 1);
  assert.deepEqual(fixture.state.sleeps, Array(4).fill(2000)); assert.equal(adds(fixture), 1);
  fixture.state.visibleAfter = 0; fixture.state.reads.clear();
  const recovered = github['recover-set']({ receipt: file }, fixture.io);
  assert.ok(!recovered.pending.includes('project:0'));
  assert.equal(github['continue-set']({ receipt: file, confirmation: recovered.continuation }, fixture.io).status, 'complete');
  assert.equal(fixture.state.issues.length, 3); assert.equal(adds(fixture), 3);
});
test('recover-set leaves project pending when the issue-side read sees no item and never repeats the mutation', t => {
  const fixture = fake(); fixture.state.visibleAfter = 99;
  const { file } = publish(t, fixture);
  const recovered = github['recover-set']({ receipt: file }, fixture.io);
  assert.ok(recovered.pending.includes('project:0')); assert.equal(adds(fixture), 1);
});
test('an issue already in the Project, archived or not, counts as member and is never re-added', t => {
  for (const archived of [false, true]) {
    const fixture = fake(); fixture.state.autoAdd = true; fixture.state.archived = archived;
    const { result } = publish(t, fixture);
    assert.equal(result.status, 'complete'); assert.equal(adds(fixture), 0); assert.deepEqual(fixture.state.sleeps, []);
  }
});
test('only items of the destination Project count, and a null projectItems means no items', t => {
  for (const option of ['otherProject', 'nullItems']) {
    const fixture = fake(); fixture.state[option] = true;
    const { result } = publish(t, fixture);
    assert.equal(result.status, 'complete', option); assert.equal(adds(fixture), 3, option);
  }
});
test('a mutation response without an item id is verified by the issue-side read', t => {
  const fixture = fake(); fixture.state.noItemId = true; fixture.state.visibleAfter = 1;
  const { result } = publish(t, fixture);
  assert.equal(result.status, 'complete'); assert.deepEqual(fixture.state.sleeps, Array(3).fill(2000));
});
for (const message of ['Content already exists', 'Content already exists in this project'])
for (const graphqlError of [false, true]) test(`set publication resolves concurrent auto-add for every issue: ${message}, GraphQL=${graphqlError}`, t => {
  const fixture = fake();
  Object.assign(fixture.state, { insertionError: graphqlError ? message : `gh: gh: ${message} (addProjectV2ItemById)`, graphqlError, raceMember: true, visibleAfter: 1 });
  const { result, file } = publish(t, fixture);
  assert.equal(result.status, 'complete', JSON.stringify(result));
  assert.equal(fixture.state.issues.length, 3);
  assert.equal(adds(fixture), 3);
  assert.ok([...fixture.state.reads.values()].every(reads => reads >= 2));
  assert.equal(JSON.parse(fs.readFileSync(file)).automatic_retry_consumed, undefined);
});
for (const message of ['Content already exists', 'Content already exists in this project'])
for (const option of ['absent', 'wrong-project', 'read-error', 'unrelated-error']) test(`set partial result and approved continuation preserve existing issues: ${message}, ${option}`, t => {
  const fixture = fake();
  Object.assign(fixture.state, { insertionError: option === 'unrelated-error' ? 'Permission denied' : message, otherProject: option === 'wrong-project', failRaceRead: option === 'read-error', raceMember: option === 'read-error' || option === 'unrelated-error' });
  const { result, file } = publish(t, fixture);
  assert.equal(result.status, 'partial_failure');
  assert.ok(result.pending.includes('project:0'));
  assert.equal(result.created[0].id, 'I1');
  assert.equal(JSON.parse(fs.readFileSync(file)).items[0].issue.id, 'I1');
  assert.match(result.message, option === 'read-error' ? /Membership query denied/ : option === 'unrelated-error' ? /Permission denied/ : /Project membership not verified/);
  fixture.state.failRaceRead = false;
  fixture.state.members.clear();
  const recovered = github['recover-set']({ receipt: file }, fixture.io);
  assert.ok(recovered.pending.includes('project:0'));
  fixture.state.insertionError = message; fixture.state.raceMember = false;
  const incomplete = github['continue-set']({ receipt: file, confirmation: recovered.continuation }, fixture.io);
  assert.equal(incomplete.status, 'partial_failure');
  assert.ok(incomplete.pending.includes('project:0'));
  assert.equal(incomplete.created[0].id, 'I1');
  assert.equal(fixture.state.issues.length, 1);
  const retry = github['recover-set']({ receipt: file }, fixture.io);
  fixture.state.insertionError = message; fixture.state.raceMember = true;
  const done = github['continue-set']({ receipt: file, confirmation: retry.continuation }, fixture.io);
  assert.equal(done.status, 'complete', JSON.stringify(done));
  assert.equal(fixture.state.issues.length, 3);
  assert.equal(done.created[0].id, 'I1');
  assert.equal(adds(fixture), 5);
});

test('assignment is isolated, exact-authorized and verified; existing assignment blocks', t => {
  const fixture = fake(); publish(t, fixture);
  const ref = fixture.state.issues[1].url;
  const before = fixture.state.issues.map(issue => [issue.title, issue.body, issue.state]);
  assert.throws(() => assignment.assign({ reference: ref, confirmation: 'wrong' }, fixture.io), /approval/);
  const ready = assignment.propose({ reference: ref }, fixture.io);
  assert.equal(assignment.assign({ reference: ref, confirmation: ready.confirmation }, fixture.io).verified, true);
  assert.deepEqual(fixture.state.issues.map(issue => [issue.title, issue.body, issue.state]), before);
  assert.equal(assignment.propose({ reference: ref }, fixture.io).reason, 'already-assigned');
  assert.throws(() => assignment.inspect({ reference: fixture.state.issues[0].url }, fixture.io), /child correspondence/);
  fixture.state.issues[1].assignees.push('another');
  assert.equal(assignment.verify({ reference: ref }, fixture.io).verified, false);
});
test('required child read failures leave import incomplete and keep selected parent identity', t => {
  const fixture = fake(); publish(t, fixture); fixture.state.fail = 'comments(first'; fixture.state.failNumber = 2;
  const imported = source.readSet(source.normalize(fixture.state.issues[0].url), fixture.io);
  assert.equal(imported.status, 'incomplete'); assert.equal(imported.item.url, fixture.state.issues[0].url);
  assert.throws(() => identity.decode('<!-- sai-backlog-slices@1 bad -->'), /JSON/);
});
test('native hierarchy failure proposes an explicitly approved written fallback', t => {
  const fixture = fake({ native: true }); fixture.state.failNative = true;
  const { result, file } = publish(t, fixture);
  assert.equal(result.status, 'partial_failure');
  const ready = github['recover-set']({ receipt: file, fallback: 'written' }, fixture.io);
  assert.equal(ready.fallback_proposal.hierarchy, 'written');
  assert.throws(() => github['continue-set']({ receipt: file, fallback: 'written', confirmation: 'wrong' }, fixture.io), /approval/);
  const done = github['continue-set']({ receipt: file, fallback: 'written', confirmation: ready.continuation }, fixture.io);
  assert.equal(done.status, 'complete', JSON.stringify(done)); assert.equal(fixture.state.issues.length, 3);
  assert.equal(identity.decode(fixture.state.issues[0].body).hierarchy, 'written');
  assert.equal(source.readSet(source.normalize(fixture.state.issues[0].url), fixture.io).status, 'complete');
});
test('hierarchical connection exhausts pages and refuses repeated cursors or incomplete pages', () => {
  let calls = 0;
  const io = { run(command, args, input) {
    const { variables } = JSON.parse(input); calls++;
    return JSON.stringify({ data: { repository: { issue: { subIssues: { nodes: [{ url: `https://github.com/owner/repo/issues/${variables.cursor ? 3 : 2}` }], pageInfo: { hasNextPage: !variables.cursor, endCursor: 'next' } } } } } });
  } };
  assert.deepEqual(source.connection(io, source.normalize('https://github.com/owner/repo/issues/1'), 'subIssues'), ['https://github.com/owner/repo/issues/2', 'https://github.com/owner/repo/issues/3']);
  assert.equal(calls, 2);
  assert.throws(() => source.connection({ run: () => JSON.stringify({ data: { repository: { issue: { subIssues: { nodes: [], pageInfo: { hasNextPage: true, endCursor: 'same' } } } } } }) }, source.normalize('https://github.com/owner/repo/issues/1'), 'subIssues'), /pagination/);
});
test('pre-existing assignee replacement requires fresh exact approval and preserves parent responsibility', t => {
  const fixture = fake(); publish(t, fixture);
  fixture.state.issues[0].assignees = ['parent-owner']; fixture.state.issues[1].assignees = ['existing'];
  const request = { reference: fixture.state.issues[1].url, choice: 'replace' };
  const ready = assignment.propose(request, fixture.io);
  fixture.state.issues[1].assignees = ['new-owner'];
  assert.throws(() => assignment.assign({ ...request, confirmation: ready.confirmation }, fixture.io), /approval/);
  const renewed = assignment.propose(request, fixture.io);
  assert.equal(assignment.assign({ ...request, confirmation: renewed.confirmation }, fixture.io).verified, true);
  assert.deepEqual(fixture.state.issues[0].assignees, ['parent-owner']);
});
test('both harnesses install canonical tooling and retain read-only importer and conditional branch owner', () => {
  const { expandInstallManifest } = require('../bin/install-manifest');
  const manifest = require('../sai/install-manifest.json');
  assert.equal(manifest.capabilities.profiles['from-backlog-command'].shell.some(command => command.includes('to-backlog')), false);
  const text = fs.readFileSync(path.join(__dirname, '../sai/commands/explore/steps/route-selector.md'), 'utf8');
  assert.match(text, /already-prepared initial branch/); assert.match(text, /new-change-branch/);
  for (const harness of ['claude', 'opencode']) {
    const destinationRoot = Object.fromEntries(['sai', 'skills', 'agents', 'commands', 'root', 'config'].map(name => [name, path.join(os.tmpdir(), 'sai-slice-projection', harness, name)]));
    const projected = expandInstallManifest(manifest, { harness, repoRoot: path.join(__dirname, '..'), destinationRoot });
    for (const suffix of ['tools/backlog-set-github.js', 'tools/backlog-assignment-github.js', 'tools/backlog-slice-identity.js', 'policies/backlog-implementation-start.md', 'policies/backlog-origin-transport.md', 'to-backlog/slice-set.md']) {
      assert.ok(projected.some(row => row.destinationPath.replace(/\\/g, '/').endsWith(suffix)), `${harness}: ${suffix}`);
    }
  }
  assert.match(fs.readFileSync(path.join(__dirname, '../sai/policies/backlog-implementation-start.md'), 'utf8'), /Fast-track and unattended route\nconsent do not approve assignment/);
});

for (const assignees of [['existing'], ['existing', 'another'], ['actor']]) test(`H1 keeping exact existing responsibility: ${assignees.join(', ')}`, t => {
  const fixture = fake(); publish(t, fixture);
  fixture.state.issues[1].assignees = assignees.slice();
  const request = { reference: fixture.state.issues[1].url, choice: 'keep' };
  const ready = assignment.propose(request, fixture.io);
  assert.equal(ready.status, 'ready');
  const approved = { ...request, expected_assignees: ready.proposal.target, expected_parent: ready.proposal.parent, confirmation: ready.confirmation };
  const beforeCalls = fixture.state.calls.length;
  assert.equal(assignment.verify(approved, fixture.io).verified, true);
  assert.deepEqual(fixture.state.issues[1].assignees, assignees);
  assert.ok(fixture.state.calls.slice(beforeCalls).every(call => call.args.includes('GET')));
  assert.throws(() => assignment.assign(approved, fixture.io), /read-only/);
  fixture.state.issues[1].assignees = ['changed'];
  assert.equal(assignment.verify(approved, fixture.io).verified, false);
  assert.equal(assignment.verify({ ...approved, expected_assignees: ['changed'] }, fixture.io).verified, false);
});

function ordinaryIssue(number, body = 'Ordinary complete issue content') {
  return { id: `I${number}`, number, url: `https://github.com/owner/repo/issues/${number}`, title: `Issue ${number}`, body, author: { login: 'actor' }, assignees: [], state: 'OPEN' };
}
test('H3 ordinary native child is independently verified without markers, and parent is never assigned', () => {
  const fixture = fake({ native: true });
  fixture.state.issues.push(ordinaryIssue(1), ordinaryIssue(2));
  fixture.state.parents.set(2, 1); fixture.state.issues[0].assignees = ['parent-owner'];
  const child = source.readSet(source.normalize(fixture.state.issues[1].url), fixture.io);
  assert.equal(child.status, 'complete'); assert.equal(child.origin.issue, fixture.state.issues[1].url);
  const request = { reference: child.origin.issue };
  const ready = assignment.propose(request, fixture.io);
  assert.equal(ready.proposal.parent, fixture.state.issues[0].url);
  assert.equal(ready.proposal.correspondence, null);
  assert.equal(assignment.assign({ ...request, confirmation: ready.confirmation }, fixture.io).verified, true);
  assert.throws(() => assignment.inspect({ reference: fixture.state.issues[0].url }, fixture.io), /sub-issues; parent responsibility is preserved/);
  assert.deepEqual(fixture.state.issues[0].assignees, ['parent-owner']);
  assert.deepEqual(fixture.state.issues[1].assignees, ['actor']);
});
function standalone(options = {}) {
  const fixture = fake({ native: true });
  fixture.state.issues.push(ordinaryIssue(1), ordinaryIssue(2), ordinaryIssue(3));
  Object.assign(fixture.state, options);
  return fixture;
}
test('E1 standalone leaf is inspected with no parent and assigned through the current flow', () => {
  const fixture = standalone();
  const request = { reference: fixture.state.issues[0].url };
  const inspected = assignment.inspect(request, fixture.io);
  assert.equal(inspected.status, 'complete'); assert.equal(inspected.parent, null); assert.equal(inspected.correspondence, null);
  const ready = assignment.propose(request, fixture.io);
  assert.equal(ready.status, 'ready'); assert.equal(ready.proposal.parent, null); assert.deepEqual(ready.proposal.target, ['actor']);
  const done = assignment.assign({ ...request, confirmation: ready.confirmation }, fixture.io);
  assert.equal(done.verified, true); assert.equal(done.parent, null);
  assert.deepEqual(fixture.state.issues[0].assignees, ['actor']);
  assert.equal(assignment.verify({ ...request, expected_parent: null }, fixture.io).verified, true);
});
test('E2 an unmarked issue with sub-issues, open or closed, is a parent and is never assigned', () => {
  for (const state of ['OPEN', 'CLOSED']) {
    const fixture = standalone(); fixture.state.parents.set(2, 1); fixture.state.issues[1].state = state;
    assert.throws(() => assignment.inspect({ reference: fixture.state.issues[0].url }, fixture.io), /sub-issues; parent responsibility is preserved/, state);
    assert.throws(() => assignment.propose({ reference: fixture.state.issues[0].url }, fixture.io), /sub-issues/, state);
    assert.deepEqual(fixture.state.issues[0].assignees, []);
  }
});
test('E3 only a complete hierarchy response decides; errors and incomplete responses fail the inspection', () => {
  const request = { reference: 'https://github.com/owner/repo/issues/1' };
  const incomplete = [data => ({ repository: { issue: { subIssues: data.repository.issue.subIssues } } }), data => ({ repository: { issue: { parent: null } } }), data => ({ repository: { issue: { parent: null, subIssues: { nodes: null } } } }), data => ({ repository: { issue: { parent: {}, subIssues: { nodes: [] } } } }), data => ({ repository: { issue: null } })];
  for (const hierarchyResponse of incomplete) assert.throws(() => assignment.inspect(request, standalone({ hierarchyResponse }).io), /Incomplete assignment inspection/);
  for (const message of ['HTTP 401', 'HTTP 403', 'HTTP 502', 'network unreachable']) {
    const fixture = standalone(); const run = fixture.io.run;
    fixture.io.run = (command, args, input) => { if (args[1] === 'graphql' && JSON.parse(input).query.includes('subIssues(first:1)')) throw new Error(message); return run(command, args, input); };
    assert.throws(() => assignment.inspect(request, fixture.io), new RegExp(message));
  }
  const graphqlError = standalone(); const run = graphqlError.io.run;
  graphqlError.io.run = (command, args, input) => args[1] === 'graphql' && JSON.parse(input).query.includes('subIssues(first:1)') ? JSON.stringify({ errors: [{ message: 'Forbidden' }] }) : run(command, args, input);
  assert.throws(() => assignment.inspect(request, graphqlError.io), /retrieval failed/);
});
test('E4 a marked issue keeps the correspondence flow; a native marker without a native parent is an unverified-parent error', t => {
  const fixture = fake({ native: true }); publish(t, fixture);
  const child = fixture.state.issues[1].url;
  assert.equal(assignment.inspect({ reference: child }, fixture.io).parent, fixture.state.issues[0].url);
  fixture.state.parents.delete(2);
  assert.throws(() => assignment.inspect({ reference: child }, fixture.io), /no verified native parent/);
});
test('E5 a native child with sub-issues of its own follows the current flow', () => {
  const fixture = standalone(); fixture.state.parents.set(2, 1); fixture.state.parents.set(3, 2);
  const inspected = assignment.inspect({ reference: fixture.state.issues[1].url }, fixture.io);
  assert.equal(inspected.parent, fixture.state.issues[0].url);
});
test('E6 verification requires the approved parent for every choice and the approved leaf-or-parent outcome', () => {
  const fixture = standalone(); fixture.state.parents.set(2, 1);
  const child = { reference: fixture.state.issues[1].url };
  const ready = assignment.propose(child, fixture.io);
  const done = assignment.assign({ ...child, confirmation: ready.confirmation }, fixture.io);
  assert.equal(done.verified, true);
  assert.equal(assignment.verify({ ...child, expected_parent: fixture.state.issues[0].url }, fixture.io).verified, true);
  for (const expected_parent of [null, undefined, fixture.state.issues[2].url]) assert.equal(assignment.verify({ ...child, expected_parent }, fixture.io).verified, false);
  fixture.state.issues[1].assignees = ['existing'];
  const keep = assignment.propose({ ...child, choice: 'keep' }, fixture.io);
  const approved = { ...child, choice: 'keep', expected_assignees: keep.proposal.target, expected_parent: keep.proposal.parent, confirmation: keep.confirmation };
  assert.equal(assignment.verify(approved, fixture.io).verified, true);
  fixture.state.parents.delete(2);
  assert.equal(assignment.verify(approved, fixture.io).verified, false);
  const leaf = standalone(); const request = { reference: leaf.state.issues[0].url };
  const approvedLeaf = assignment.propose(request, leaf.io);
  assert.equal(assignment.assign({ ...request, confirmation: approvedLeaf.confirmation }, leaf.io).verified, true);
  leaf.state.parents.set(2, 1);
  assert.throws(() => assignment.verify({ ...request, expected_parent: null }, leaf.io), /sub-issues/);
  leaf.state.parents.delete(2); leaf.state.parents.set(1, 3);
  assert.equal(assignment.verify({ ...request, expected_parent: null }, leaf.io).verified, false);
  assert.equal(assignment.verify({ ...request, expected_parent: leaf.state.issues[2].url }, leaf.io).verified, true);
});
test('H4 written correspondence reconciles extra native children, full content and comments, without replacing origin', t => {
  const fixture = fake(); publish(t, fixture);
  fixture.state.native = true;
  fixture.state.issues.push(ordinaryIssue(4, 'External native child content\n\nEvery constraint retained.'));
  fixture.state.parents.set(4, 1);
  const imported = source.readSet(source.normalize(fixture.state.issues[0].url), fixture.io);
  assert.equal(imported.status, 'complete', JSON.stringify(imported));
  assert.equal(imported.origin.issue, fixture.state.issues[0].url);
  assert.equal(imported.sources.length, 4);
  assert.equal(imported.sources[3].item.description, fixture.state.issues[3].body);
  assert.equal(imported.sources[3].comments[0].body, 'Full comment');
  fixture.state.fail = 'subIssues(first';
  assert.notEqual(source.readSet(source.normalize(fixture.state.issues[0].url), fixture.io).status, 'complete');
});
for (const native of [false, true]) test(`nested published parent imports its own children plus higher context (${native ? 'native' : 'written'} slices)`, t => {
  const fixture = fake({ native }); publish(t, fixture);
  fixture.state.native = true;
  fixture.state.issues.push(ordinaryIssue(4, 'Higher parent in full'), ordinaryIssue(5, 'Sibling not to import'));
  fixture.state.parents.set(1, 4); fixture.state.parents.set(5, 4);
  fixture.state.issues[0].assignees = ['selected-parent-owner'];
  const imported = source.readSet(source.normalize(fixture.state.issues[0].url), fixture.io);
  assert.equal(imported.status, 'complete', JSON.stringify(imported));
  assert.equal(imported.origin.issue, fixture.state.issues[0].url);
  assert.equal(imported.origin.parent, fixture.state.issues[3].url);
  assert.deepEqual(imported.sources.map(row => [row.role, row.item.number]), [['selected', 1], ['parent-context', 4], ['child', 2], ['child', 3]]);
  for (const row of imported.sources) {
    assert.equal(row.item.description, fixture.state.issues[row.item.number - 1].body);
    assert.equal(row.comments[0].body, 'Full comment');
  }
  assert.deepEqual(imported.item.assignees, ['selected-parent-owner']);
  assert.ok(!fixture.state.calls.some(call => call.input && JSON.parse(call.input).query?.includes('issueOrPullRequest') && JSON.parse(call.input).variables.number === 5));
});
test('ordinary nested parent imports direct children, separate parent context, but no siblings or descendants', () => {
  const fixture = fake({ native: true });
  fixture.state.issues.push(...[1, 2, 3, 4, 5].map(number => ordinaryIssue(number, `Full original content ${number}`)));
  fixture.state.parents.set(2, 1); fixture.state.parents.set(3, 2); fixture.state.parents.set(4, 1); fixture.state.parents.set(5, 3);
  const imported = source.readSet(source.normalize(fixture.state.issues[1].url), fixture.io);
  assert.equal(imported.status, 'complete', JSON.stringify(imported));
  assert.equal(imported.origin.issue, fixture.state.issues[1].url);
  assert.deepEqual(imported.sources.map(row => [row.role, row.item.number]), [['selected', 2], ['parent-context', 1], ['child', 3]]);
  for (const row of imported.sources) { assert.equal(row.item.description, `Full original content ${row.item.number}`); assert.equal(row.comments[0].body, 'Full comment'); }
  const leaf = source.readSet(source.normalize(fixture.state.issues[4].url), fixture.io);
  assert.equal(leaf.status, 'complete');
  assert.deepEqual(leaf.sources.map(row => [row.role, row.item.number]), [['selected', 5], ['parent-context', 3]]);
});
test('an explicit published child retains child-only scope even when it has native descendants', t => {
  const fixture = fake({ native: true }); publish(t, fixture);
  fixture.state.issues.push(ordinaryIssue(4)); fixture.state.parents.set(4, 2);
  const imported = source.readSet(source.normalize(fixture.state.issues[1].url), fixture.io);
  assert.equal(imported.status, 'complete');
  assert.deepEqual(imported.sources.map(row => [row.role, row.item.number]), [['selected', 2], ['parent-context', 1]]);
  assert.equal(imported.origin.issue, fixture.state.issues[1].url);
});
test('H2 publication -> amended stored block/hash -> spec provenance -> cold implementation identity', t => {
  const fixture = fake();
  const publication = publish(t, fixture).result;
  const root = path.join(__dirname, '..');
  const { sessionFile } = require('../bin/sai-state');
  function cli(args, input = '') {
    const result = spawnSync(process.execPath, [path.join(root, 'bin/sai-state.js'), ...args], { input, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return JSON.parse(result.stdout);
  }
  const id = cli(['spawn', '--key', `origin-transport-${process.pid}-${require('node:crypto').randomUUID()}`]).id;
  t.after(() => fs.rmSync(sessionFile(id), { force: true }));
  for (let step = 0; step < 3; step++) cli(['emit', id, 'explore-idea@1', '-'], '{"intent":"next-step"}');
  cli(['emit', id, 'explore-slice@1', '--ready-to-propose', '-'], fixture.request.blocks);
  const before = cli(['block', id, 'dependent']);
  const storedSet = publication.correspondence.slices.map(slice => cli(['block', id, slice.change_name]).text).join('\n\n');
  const attached = spawnSync(process.execPath, [path.join(root, 'sai/tools/ready-to-propose.js'), 'attach-origin'], { input: JSON.stringify({ text: storedSet, correspondence: publication.correspondence }), encoding: 'utf8' });
  assert.equal(attached.status, 0, attached.stdout + attached.stderr);
  const transported = JSON.parse(attached.stdout);
  for (const updated of transported.blocks) {
    cli(['emit', id, 'explore-slice@1', '--ready-to-propose', '--amend', updated.name, '-'], updated.text);
  }
  const cold = cli(['block', id, 'dependent']);
  assert.notEqual(cold.hash, before.hash);
  assert.equal(cold.hash, detector.hashBlock(cold.text));
  assert.equal(cold.text.replace(/^\*\*Backlog origin\*\*:.*\n/m, ''), before.text);
  const intake = detector.checkDispatchable(cold.text);
  assert.equal(intake.dispatchable, true);
  const provenance = intake.blocks[0].backlog_origin;
  assert.equal(provenance, publication.correspondence.slices.find(slice => slice.change_name === 'dependent').issue);
  assert.notEqual(provenance, publication.correspondence.parent);
  // Spec's writer contract uses the parsed value in YAML; a cold start needs no prior map.
  const writer = fs.readFileSync(path.join(root, 'sai/commands/spec/worker.md'), 'utf8');
  assert.match(writer, /validator's returned `backlog_origin`/);
  const metadata = `backlog_origin: ${provenance}\n`;
  const standaloneReference = /^backlog_origin: (.+)$/m.exec(metadata)[1];
  assert.equal(assignment.inspect({ reference: standaloneReference }, fixture.io).issue, provenance);
  const wrong = structuredClone(publication.correspondence); wrong.slices.pop();
  assert.throws(() => detector.attachBacklogOrigins(fixture.request.blocks, wrong), /complete stored block set|correspondence dependency/);
});
test('per-slice chain: later branches start from the previous branch, hold on uncommitted work and detect an occupied name', () => {
  const { execute } = require('../sai/tools/new-change-branch');
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'slice-branch-chain-'));
  try {
    const git = (...args) => { const r = spawnSync('git', args, { cwd, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
    git('init', '-b', 'main'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.invalid');
    fs.writeFileSync(path.join(cwd, 'file'), 'base'); git('add', 'file'); git('commit', '-m', 'base');
    const start = (name, id, base, extra = {}) => {
      const resolved = execute('base', { base }, cwd);
      return execute('create', { type: 'feat', name, id, base, sha: resolved.sha, ...extra }, cwd);
    };
    const first = start('first-slice', '11', 'main');
    assert.equal(first.branch, 'feat/11_first_slice');
    fs.writeFileSync(path.join(cwd, 'file'), 'slice one');
    const held = start('second-slice', '12', first.branch, { require_clean: true });
    assert.equal(held.status, 'failed');
    assert.equal(held.created, false);
    assert.equal(git('symbolic-ref', '--short', 'HEAD'), first.branch);
    git('commit', '-am', 'slice one');
    const second = start('second-slice', '12', first.branch, { require_clean: true });
    assert.equal(second.status, 'completed');
    assert.equal(second.branch, 'feat/12_second_slice');
    assert.equal(git('rev-parse', 'HEAD'), git('rev-parse', first.branch));
    git('switch', first.branch);
    const occupied = execute('name', { type: 'feat', name: 'second-slice', id: '12' }, cwd);
    assert.equal(occupied.status, 'failed');
    assert.match(occupied.reason, /Branch already exists: feat\/12_second_slice/);
    assert.equal(git('rev-parse', '--verify', 'refs/heads/feat/12_second_slice'), second.sha);
  } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
});
test('the shared branch strategy reuses one initial branch, and the chain tracks only conversation state', () => {
  const text = fs.readFileSync(path.join(__dirname, '../sai/commands/explore/steps/route-selector.md'), 'utf8');
  assert.match(text, /originating principal issue's identity for `shared`; reuse an already-prepared initial branch/);
  assert.match(text, /`shared` creates nothing more/);
  assert.match(text, /Keep `branch_strategy` in conversation state/);
});

// An originating issue becomes the set parent; nothing replaces it.
function withOrigin(fixture, body = 'Old origin text') {
  const origin = { id: 'O1', number: 1, url: 'https://github.com/owner/repo/issues/1', title: 'Origin title', body, author: { login: 'actor' }, assignees: [], state: 'OPEN' };
  fixture.state.issues.push(origin);
  const baseline = github['read-update']({ reference: origin.url }, fixture.io).baseline;
  Object.assign(fixture.request, { origin: origin.url, origin_baseline: baseline, description: 'Agreed whole objective' });
  delete fixture.request.repository;
  return origin;
}
const writes = fixture => fixture.state.calls.filter(call => call.input?.includes('mutation('));
for (const native of [false, true]) test(`origin set publication reuses the origin as parent: ${native ? 'native' : 'written'} hierarchy`, t => {
  const fixture = fake({ native }), origin = withOrigin(fixture);
  const ready = github['query-set'](fixture.request, fixture.io);
  assert.equal(ready.status, 'ready', JSON.stringify(ready));
  assert.equal(ready.proposal.origin.issue.url, origin.url);
  assert.equal(ready.proposal.title, 'Origin title');
  const file = receipt(t);
  const result = github['publish-set']({ ...fixture.request, confirmation: ready.confirmation, receipt: file }, fixture.io);
  assert.equal(result.status, 'complete', JSON.stringify(result));
  assert.equal(fixture.state.issues.length, 3);
  assert.equal(result.created.length, 2);
  assert.equal(result.origin.url, origin.url);
  assert.equal(result.correspondence.parent, origin.url);
  assert.equal(origin.title, 'Origin title');
  assert.ok(origin.body.startsWith('Agreed whole objective\n\nChild: blocker'));
  assert.equal(identity.decode(origin.body).role, 'parent');
  assert.ok(fixture.state.issues[2].body.includes(`Parent: ${origin.url}`));
  if (native) assert.deepEqual([...fixture.state.parents], [[2, 1], [3, 1]]);
  // The origin is rewritten after every child exists and is linked, and is never closed.
  const updates = writes(fixture).filter(call => call.input.includes('updateIssue('));
  assert.equal(JSON.parse(updates.at(-1).input).variables.id, 'O1');
  assert.equal(origin.state, 'OPEN');
  assert.equal(writes(fixture).filter(call => call.input.includes('createIssue(')).length, 2);
  assert.equal(github['recover-set']({ receipt: file }, fixture.io).status, 'complete');
});
test('origin set publication lists existing native children and leaves them linked', t => {
  const fixture = fake({ native: true }), origin = withOrigin(fixture);
  fixture.state.issues.push({ id: 'X', number: 2, url: 'https://github.com/owner/repo/issues/2', title: 'Native child', body: 'kept', author: { login: 'actor' }, assignees: [], state: 'OPEN' });
  fixture.state.parents.set(2, 1);
  const ready = github['query-set'](fixture.request, fixture.io);
  assert.deepEqual(ready.proposal.origin.children, ['https://github.com/owner/repo/issues/2']);
  const result = github['publish-set']({ ...fixture.request, confirmation: ready.confirmation, receipt: receipt(t) }, fixture.io);
  assert.equal(result.status, 'complete', JSON.stringify(result));
  assert.equal(fixture.state.issues[1].body, 'kept');
  assert.equal(fixture.state.parents.get(2), 1);
  assert.equal(fixture.state.parents.size, 3);
  assert.ok(origin.body.includes('Child: blocker'));
});
test('origin set publication stops before any write when the origin cannot take children', () => {
  const stop = (mutate, reason) => {
    const fixture = fake(), origin = withOrigin(fixture);
    mutate(fixture, origin);
    const result = github['query-set'](fixture.request, fixture.io);
    assert.equal(result.status, reason === 'stale-baseline' ? 'needs_input' : 'blocked', JSON.stringify(result));
    assert.equal(result.reason, reason, result.message);
    assert.equal(writes(fixture).length, 0);
    assert.equal(fixture.state.issues.length, 1);
  };
  stop((f, o) => { o.state = 'CLOSED'; }, 'origin-closed');
  stop((f, o) => {
    o.body = `Earlier\n${identity.encode({ version: 1, platform: 'github', role: 'parent', parent: o.url, slices: [{ change_name: 'one', issue: 'https://github.com/owner/repo/issues/9', depends_on: [] }] })}`;
    f.request.origin_baseline = { title: o.title, description: o.body };
  }, 'origin-already-published');
  stop((f, o) => { o.body = 'edited after reading'; }, 'stale-baseline');
  stop((f, o) => { f.state.viewerCanUpdate = false; }, 'origin-unavailable');
  stop((f, o) => { f.request.origin = 'https://gitlab.example/group/repo/-/issues/1'; }, 'origin-destination-mismatch');
});
test('origin set publication stops on a configured destination that differs from the origin', () => {
  const fixture = fake(); withOrigin(fixture);
  const run = fixture.io.run;
  fixture.io.run = (command, args, input) => {
    const out = run(command, args, input);
    if (!input?.includes('"owner":"other"')) return out;
    const data = JSON.parse(out); data.data.repository.id = 'R2'; data.data.repository.nameWithOwner = 'other/repo';
    return JSON.stringify(data);
  };
  fixture.request.repository = 'other/repo';
  const result = github['query-set'](fixture.request, fixture.io);
  assert.equal(result.reason, 'origin-destination-mismatch');
  assert.equal(writes(fixture).length, 0);
});
test('interrupted origin publication keeps the origin text and resumes with the same parent', t => {
  const fixture = fake({ native: true }), origin = withOrigin(fixture);
  const ready = github['query-set'](fixture.request, fixture.io);
  fixture.state.failNative = true;
  const file = receipt(t);
  const result = github['publish-set']({ ...fixture.request, confirmation: ready.confirmation, receipt: file }, fixture.io);
  assert.equal(result.status, 'partial_failure');
  assert.equal(origin.body, 'Old origin text');
  assert.equal(fixture.state.issues.length, 3);
  assert.equal(JSON.parse(fs.readFileSync(file)).items[0].issue.url, origin.url);
  fixture.state.failNative = false;
  const verified = github['recover-set']({ receipt: file }, fixture.io);
  assert.equal(github['continue-set']({ receipt: file, confirmation: verified.continuation }, fixture.io).status, 'complete');
  assert.equal(fixture.state.issues.length, 3);
  assert.equal(identity.decode(origin.body).parent, origin.url);
  assert.equal(writes(fixture).filter(call => call.input.includes('createIssue(')).length, 2);
});
test('a set without an origin keeps creating a new parent', t => {
  const fixture = fake();
  assert.equal(publish(t, fixture).result.status, 'complete');
  assert.equal(fixture.state.issues.length, 3);
});

for (const native of [false, true]) test(`an origin that is a published child takes a set and keeps its earlier correspondence: ${native ? 'native' : 'written'} hierarchy`, t => {
  const fixture = fake({ native }), first = publish(t, fixture);
  assert.equal(first.result.status, 'complete');
  const origin = fixture.state.issues[1], parent = fixture.state.issues[0].url;
  const baseline = github['read-update']({ reference: origin.url }, fixture.io).baseline;
  const request = { ...fixture.request, blocks: block('sub-one'), origin: origin.url, origin_baseline: baseline, description: 'Agreed sub objective' };
  const ready = github['query-set'](request, fixture.io);
  assert.equal(ready.status, 'ready', JSON.stringify(ready));
  const result = github['publish-set']({ ...request, confirmation: ready.confirmation, receipt: receipt(t) }, fixture.io);
  assert.equal(result.status, 'complete', JSON.stringify(result));
  assert.equal(fixture.state.issues.length, 4);
  const marker = identity.decode(origin.body);
  assert.equal(marker.role, 'parent');
  assert.equal(marker.child_of.change_name, 'blocker');
  assert.equal(marker.child_of.parent, parent);
  assert.ok(origin.body.includes(`Parent: ${parent}`));
  if (native) { assert.equal(fixture.state.parents.get(2), 1); assert.equal(fixture.state.parents.get(4), 2); }
  assert.equal(github['lookup-slice']({ ...fixture.request, change_name: 'blocker' }, fixture.io).candidates[0].correspondence.parent, parent);
  assert.equal(github['lookup-slice']({ ...fixture.request, change_name: 'sub-one' }, fixture.io).status, 'complete');
  if (native) {
    const imported = source.readSet(source.normalize(origin.url), fixture.io);
    assert.equal(imported.status, 'complete', imported.message);
    assert.deepEqual(imported.sources.map(row => row.role), ['selected', 'parent-context', 'child']);
    assert.equal(imported.item.parent, parent);
  }
  const descendant = JSON.stringify(fixture.state.issues[3]);
  const relationships = JSON.stringify([...fixture.state.parents]);
  const dependencies = JSON.stringify([...fixture.state.blockers]);
  const members = [...fixture.state.members];
  const updateRequest = { origin: parent, title: fixture.request.title, description: fixture.request.description,
    blocks: block('dependent', 'blocker') + '\n' + block('blocker').replace('**What**: None', '**What**: Refined upper slice') };
  const prepared = github['query-set-update'](updateRequest, fixture.io);
  assert.equal(prepared.status, 'ready', JSON.stringify(prepared));
  const start = fixture.state.calls.length;
  const updated = github['update-set']({ ...updateRequest, confirmation: prepared.confirmation, receipt: receipt(t) }, fixture.io);
  assert.equal(updated.status, 'complete', JSON.stringify(updated));
  assert.deepEqual(updated.updated.map(item => item.url), [origin.url]);
  assert.deepEqual(identity.decode(origin.body), marker);
  assert.ok(origin.body.includes('Refined upper slice'));
  assert.ok(origin.body.includes(`Child: sub-one — ${fixture.state.issues[3].url}`));
  assert.ok(origin.body.includes(`Parent: ${parent}`));
  assert.equal(JSON.stringify(fixture.state.issues[3]), descendant);
  assert.equal(JSON.stringify([...fixture.state.parents]), relationships);
  assert.equal(JSON.stringify([...fixture.state.blockers]), dependencies);
  assert.deepEqual([...fixture.state.members], members);
  const mutations = fixture.state.calls.slice(start).filter(call => call.input && JSON.parse(call.input).query?.startsWith('mutation'));
  assert.equal(mutations.length, 1);
  assert.match(JSON.parse(mutations[0].input).query, /updateIssue/);
  assert.equal(fixture.state.issues.length, 4);
});
test('origin transport replaces the adopted origin in slice blocks with the child URL and refuses other origins', t => {
  const fixture = fake(), origin = withOrigin(fixture);
  const named = text => text.replace('**What**:', `**Backlog origin**: ${origin.url}\n**What**:`);
  const blocks = named(block('dependent', 'blocker')) + '\n' + named(block('blocker'));
  const request = { ...fixture.request, blocks };
  const ready = github['query-set'](request, fixture.io);
  const result = github['publish-set']({ ...request, confirmation: ready.confirmation, receipt: receipt(t) }, fixture.io);
  assert.equal(result.status, 'complete', JSON.stringify(result));
  const attached = detector.attachBacklogOrigins(blocks, result.correspondence);
  for (const entry of attached.blocks) {
    const slice = result.correspondence.slices.find(row => row.change_name === entry.name);
    assert.equal(entry.backlog_origin, slice.issue);
    assert.equal(detector.checkStrict(entry.text).ok, true);
    assert.equal(detector.checkStrict(entry.text).blocks[0].backlog_origin, slice.issue);
    assert.ok(!entry.text.includes(origin.url));
    assert.equal(detector.hashBlock(entry.text), entry.hash);
  }
  const other = named(block('blocker')).replace(origin.url, 'https://github.com/owner/repo/issues/77');
  assert.throws(() => detector.attachBacklogOrigins(block('dependent', 'blocker') + '\n' + other, result.correspondence), /conflicts with publication/);
});
