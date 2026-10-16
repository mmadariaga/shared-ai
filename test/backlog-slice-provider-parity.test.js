'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const detector = require('../sai/tools/ready-to-propose');
const identity = require('../sai/tools/backlog-slice-identity');

function block(name, dependencies = 'None') {
  return ['## Ready to Propose', ...detector.STRICT_FIELDS.filter(field => !field.optional || field.label === 'Depends on').map(field => `**${field.label}**: ${field.label === 'Change name' ? name : field.label === 'Depends on' ? dependencies : field.inline ? 'None' : '\n- I1: agreed full content α'}`), '---'].join('\n');
}
function fixture(platform) {
  const azure = platform === 'azuredevops', repository = azure ? 'https://dev.azure.com/org/Project' : 'https://gitlab.example/group/repo';
  const adapter = require(`../sai/tools/to-backlog-${platform}`), source = require(`../sai/tools/from-backlog-${platform}`);
  const state = { rows: [], writes: [], calls: [], lost: false, failRead: null, failRelation: false, failLinkRead: null, comments: 0, blockers: new Map(), noUniqueName: false, assignmentFailure: null };
  const actor = azure ? 'actor-id' : 7, uniqueName = 'actor@example.com';
  const url = number => azure ? `${repository}/_workitems/edit/${number}` : `${repository}/-/issues/${number}`;
  function create(title, description) {
    // A provider may store a description in a different but harmless form (state.normalize).
    description = state.normalize ? state.normalize(description) : description;
    const number = state.rows.length + 1;
    const row = azure ? { id: number, rev: 1, fields: { 'System.Title': title, 'System.Description': description, 'System.WorkItemType': 'Task', 'System.TeamProject': 'Project', 'System.State': 'New', 'System.CreatedBy': { id: actor } }, relations: [] }
      : { id: number + 100, iid: number, project_id: 1, title, description, web_url: url(number), author: { id: actor }, assignees: [], issue_type: 'issue', state: 'opened', updated_at: 'v1' };
    state.rows.push(row); return row;
  }
  function show(number) {
    if (state.failRead === number) throw new Error('injected missing full child read');
    const row = state.rows[number - 1];
    if (!row) throw new Error('missing item');
    return row;
  }
  const io = { run(command, args, input) {
    state.calls.push({ command, args, input });
    if (!azure) {
      if (args[0] === 'repo') return JSON.stringify({ id: 1, path_with_namespace: 'group/repo', archived: false, visibility: 'private', issues_enabled: true, web_url: repository });
      const endpoint = args[1], method = args[args.indexOf('--method') + 1];
      if (endpoint === 'user') return JSON.stringify({ id: actor });
      if (endpoint.includes('/links')) {
        const number = Number(/issues\/(\d+)/.exec(endpoint)[1]);
        if (state.failLinkRead && method === 'GET') throw new Error(state.failLinkRead);
        if (method === 'POST') {
          if (state.failRelation) throw new Error('native relation denied');
          const body = JSON.parse(input); state.writes.push({ method, body });
          state.blockers.set(number, [...(state.blockers.get(number) || []), body.target_issue_iid]);
          return '{}';
        }
        return JSON.stringify((state.blockers.get(number) || []).map(id => ({ id: id + 100, web_url: url(id), link_type: 'is_blocked_by' })));
      }
      if (endpoint.includes('/notes?')) {
        const page = Number(/[?&]page=(\d+)/.exec(endpoint)[1]);
        return JSON.stringify(Array.from({ length: Math.min(100, Math.max(0, state.comments - (page - 1) * 100)) }, (_, i) => ({ id: (page - 1) * 100 + i + 1, body: 'Full comment α', system: false, author: { username: 'writer' } })));
      }
      if (endpoint.includes('/issues?')) {
        const page = Number(/[?&]page=(\d+)/.exec(endpoint)[1]); return JSON.stringify(state.rows.slice((page - 1) * 100, page * 100));
      }
      if (method === 'POST') {
        state.writes.push({ method, body: JSON.parse(input) });
        const body = JSON.parse(input), row = create(body.title, body.description);
        if (state.lost) { state.lost = false; throw new Error('lost response'); }
        return JSON.stringify(row);
      }
      const row = show(Number(/issues\/(\d+)/.exec(endpoint)[1]));
      if (method === 'PUT') {
        const body = JSON.parse(input); state.writes.push({ method, body });
        if (body.description !== undefined) row.description = state.normalize ? state.normalize(body.description) : body.description;
        if (body.assignee_ids) row.assignees = body.assignee_ids.map(id => ({ id }));
        row.updated_at += '+';
      }
      return JSON.stringify(row);
    }
    if (command === 'azure-sdk') {
      const request = JSON.parse(input), { route, body, method } = request;
      if (request.client === 'location') return JSON.stringify({ authenticatedUser: { id: actor, ...(state.noUniqueName ? {} : { properties: { Account: { $type: 'System.String', $value: uniqueName } } }) } });
      if (method === 'POST') {
        state.writes.push({ method, body });
        const row = create(body.find(part => part.path === '/fields/System.Title').value, body.find(part => part.path === '/fields/System.Description').value);
        if (state.lost) { state.lost = false; throw new Error('lost response'); }
        return JSON.stringify(row);
      }
      const row = show(route.id);
      if (method === 'PATCH') {
        state.writes.push({ method, body });
        assert.equal(body[0].path, '/rev'); assert.equal(body[0].value, row.rev);
        // Azure resolves an identity field by unique name only; an id is an unknown identity (bridge payload shape).
        const assigned = body.find(part => part.path === '/fields/System.AssignedTo');
        if (assigned && state.assignmentFailure) { if (state.assignmentFailure.thrown) throw new Error(state.assignmentFailure.thrown); return JSON.stringify(state.assignmentFailure.payload); }
        if (assigned && assigned.value !== uniqueName) return JSON.stringify({ sdk_error: `VS402625: Unknown identity ${assigned.value}`, status_code: 400 });
        for (const part of body.slice(1)) {
          if (part.path === '/relations/-') {
            if (state.failRelation) throw new Error('native relation rejected by project rules');
            row.relations.push(part.value);
            const other = show(Number(part.value.url.split('/').pop()));
            other.relations.push({ rel: part.value.rel.replace('-Reverse', '-Forward'), url: `https://dev.azure.com/org/_apis/wit/workItems/${row.id}` });
          } else {
            const field = part.path.slice('/fields/'.length);
            row.fields[field] = field === 'System.AssignedTo' ? { id: actor } : field === 'System.Description' && state.normalize ? state.normalize(part.value) : part.value;
          }
        }
        row.rev++;
      }
      return JSON.stringify(row);
    }
    if (args[0] === 'boards') return JSON.stringify(show(Number(args[args.indexOf('--id') + 1])));
    const resource = args[args.indexOf('--resource') + 1];
    if (resource === 'projects') return JSON.stringify({ id: 'project-id', name: 'Project', visibility: 'private' });
    if (resource === 'workitemtypes') return JSON.stringify({ name: 'Task' });
    if (resource === 'wiql') return JSON.stringify({ workItems: state.rows.map(row => ({ id: row.id })) });
    if (resource === 'comments') {
      const token = args.find(arg => arg.startsWith('continuationToken='));
      const offset = token ? Number(token.split('=')[1]) : 0, count = Math.min(100, Math.max(0, state.comments - offset));
      return JSON.stringify({ count, totalCount: state.comments, comments: Array.from({ length: count }, (_, i) => ({ id: offset + i + 1, text: 'Full comment α', createdBy: { displayName: 'writer' } })), ...(offset + count < state.comments ? { continuationToken: offset + count } : {}) });
    }
    throw new Error(`Unexpected transport ${command} ${args.join(' ')}`);
  } };
  return { platform, adapter, source, state, io, actor, url, request: { provider: platform, repository, ...(azure ? { type: 'Task' } : {}), title: 'Whole objective', description: 'Full parent α', blocks: block('dependent', 'blocker') + '\n' + block('blocker') } };
}
function publish(t, fixture) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-provider-parity-')); fs.chmodSync(directory, 0o700);
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'receipt.json'), ready = fixture.adapter['query-set'](fixture.request, fixture.io);
  assert.equal(ready.status, 'ready');
  return { file, ready, result: fixture.adapter['publish-set']({ ...fixture.request, receipt: file, confirmation: ready.confirmation }, fixture.io) };
}
for (const platform of ['gitlab', 'azuredevops']) {
  test(`${platform}: verified parent/child publication, complete import, identity transport and lookup`, t => {
    const f = fixture(platform), { result } = publish(t, f);
    assert.equal(result.status, 'complete', result.message);
    assert.equal(result.correspondence.platform, platform);
    assert.deepEqual(result.correspondence.slices.map(slice => slice.change_name), ['blocker', 'dependent']);
    assert.equal(result.created.length, 3);
    const routed = require('../sai/tools/to-backlog').dispatch('query-set', f.request, require('../skills/universal/to-backlog/providers/registry.json'), f.io);
    assert.equal(routed.status, 'ready'); assert.equal(routed.proposal.provider, platform);
    assert.deepEqual(result.representation, platform === 'gitlab' ? { hierarchy: 'written', dependencies: 'native' } : { hierarchy: 'native', dependencies: 'native' });
    f.state.comments = 101;
    const before = f.state.writes.length;
    const imported = f.source.readSet(f.source.resolve(f.url(1), f.io), f.io);
    assert.equal(imported.status, 'complete', imported.message);
    assert.deepEqual(imported.sources.map(source => source.role), ['selected', 'child', 'child']);
    assert.equal(imported.origin.issue, f.url(1));
    assert.ok(imported.sources.every(source => source.comments.length === 101));
    const child = f.source.readSet(f.source.resolve(f.url(3), f.io), f.io);
    assert.deepEqual(child.sources.map(source => source.role), ['selected', 'parent-context']);
    assert.equal(child.origin.issue, f.url(3));
    assert.deepEqual(child.item.dependencies, [f.url(2)]);
    if (platform === 'azuredevops') {
      const numeric = f.source.readSet({ status: 'resolved', organization: 'https://dev.azure.com/org', number: 3 }, f.io);
      assert.equal(numeric.status, 'complete', numeric.message); assert.equal(numeric.origin.issue, f.url(3));
    }
    const attached = detector.attachBacklogOrigins(f.request.blocks, result.correspondence);
    for (const entry of attached.blocks) {
      assert.equal(detector.checkStrict(entry.text).ok, true);
      assert.equal(detector.hashBlock(entry.text), entry.hash);
      assert.equal(detector.checkStrict(entry.text).blocks[0].backlog_origin, entry.backlog_origin);
    }
    assert.equal(f.adapter['lookup-slice']({ ...f.request, change_name: 'dependent' }, f.io).issue, f.url(3));
    assert.equal(f.state.writes.length, before, 'import and lookup never mutate remote content');
  });
  test(`${platform}: isolated exact-approved assignment, existing responsibility, keep and verification`, t => {
    const f = fixture(platform); publish(t, f);
    const request = { provider: platform, reference: f.url(2) };
    const ready = f.adapter['propose-assignment'](request, f.io);
    assert.equal(ready.status, 'ready');
    assert.throws(() => f.adapter.assign({ ...request, confirmation: 'wrong' }, f.io), /approval/);
    assert.equal(f.adapter.assign({ ...request, confirmation: ready.confirmation }, f.io).verified, true);
    const last = f.state.writes.at(-1).body;
    if (platform === 'gitlab') assert.deepEqual(Object.keys(last), ['assignee_ids']);
    else assert.deepEqual(last.map(part => part.path), ['/rev', '/fields/System.AssignedTo']);
    assert.equal(f.adapter['propose-assignment'](request, f.io).reason, 'already-assigned');
    const before = f.state.writes.length;
    const keep = f.adapter['propose-assignment']({ ...request, choice: 'keep' }, f.io);
    assert.equal(f.adapter['verify-assignment']({ ...request, choice: 'keep', expected_assignees: keep.proposal.target, confirmation: keep.confirmation }, f.io).verified, true);
    assert.equal(f.state.writes.length, before);
    assert.throws(() => f.adapter['inspect-assignment']({ reference: f.url(1) }, f.io), /child/);
    const parent = f.state.rows[0];
    assert.deepEqual(platform === 'gitlab' ? parent.assignees : parent.fields['System.AssignedTo'], platform === 'gitlab' ? [] : undefined);
  });
  test(`${platform}: lost creation recovery identifies existing result before approved continuation`, t => {
    const f = fixture(platform); f.state.lost = true;
    const { result, file } = publish(t, f);
    assert.equal(result.status, 'partial_failure'); assert.equal(f.state.rows.length, 1);
    const before = f.state.writes.length;
    const recovered = f.adapter['recover-set']({ receipt: file }, f.io);
    assert.equal(recovered.candidates.length, 1); assert.equal(f.state.writes.length, before);
    const identified = { 0: f.url(1) }, approved = f.adapter['recover-set']({ receipt: file, identified }, f.io);
    assert.throws(() => f.adapter['continue-set']({ receipt: file, identified, confirmation: 'wrong' }, f.io), /approval/);
    const complete = f.adapter['continue-set']({ receipt: file, identified, confirmation: approved.continuation }, f.io);
    assert.equal(complete.status, 'complete', complete.message); assert.equal(f.state.rows.length, 3);
  });
  test(`${platform}: dependency failures and incomplete required reads never silently succeed`, t => {
    const f = fixture(platform);
    for (const blocks of [block('one', 'missing'), block('one', 'one'), block('one', 'two, two') + '\n' + block('two'), block('one', 'two') + '\n' + block('two', 'one')]) {
      assert.equal(f.adapter['query-set']({ ...f.request, blocks }, f.io).reason, 'invalid-dependencies');
    }
    publish(t, f); f.state.failRead = 3;
    const result = f.source.readSet(f.source.resolve(f.url(1), f.io), f.io);
    assert.equal(result.status, 'incomplete'); assert.equal(result.item.url, f.url(1));
  });
  test(`${platform}: singleton sets still create a parent; marker errors and duplicate identities reject`, t => {
    const f = fixture(platform); f.request.blocks = block('only');
    const { result } = publish(t, f); assert.equal(result.status, 'complete', result.message); assert.equal(result.created.length, 2);
    const value = result.correspondence;
    assert.throws(() => identity.checkIdentity({ ...value, slices: [...value.slices, value.slices[0]] }), /correspondence/);
    const encoded = platform === 'gitlab' ? identity.encode(value) : identity.encodeHtml(value);
    assert.throws(() => identity.decode(encoded + '\n' + encoded), /ambiguous|Ambiguous/);
  });
  test(`${platform}: replacement uses fresh approval; changed responsibility and incomplete recovery block`, t => {
    const f = fixture(platform); const { file } = publish(t, f);
    const row = f.state.rows[1], previous = platform === 'gitlab' ? 22 : 'previous-id';
    function assignLocal(id) {
      if (platform === 'gitlab') row.assignees = [{ id }];
      else row.fields['System.AssignedTo'] = { id };
    }
    assignLocal(previous);
    const request = { reference: f.url(2), choice: 'replace' }, ready = f.adapter['propose-assignment'](request, f.io);
    assignLocal(platform === 'gitlab' ? 33 : 'changed-id');
    assert.throws(() => f.adapter.assign({ ...request, confirmation: ready.confirmation }, f.io), /approval/);
    const fresh = f.adapter['propose-assignment'](request, f.io);
    assert.equal(f.adapter.assign({ ...request, confirmation: fresh.confirmation }, f.io).verified, true);
    f.state.failRead = 3;
    const before = f.state.writes.length, result = f.adapter['recover-set']({ receipt: file }, f.io);
    assert.equal(result.status, 'partial_failure'); assert.equal(result.continuation, undefined);
    assert.equal(result.created.length, 3); assert.equal(f.state.writes.length, before);
    assert.throws(() => f.adapter['continue-set']({ receipt: file }, f.io), /approval/);
  });
}
test('azuredevops: harmless Azure normalization does not stop a set publication or its recovery readback', t => {
  const f = fixture('azuredevops');
  f.state.normalize = html => html.replace(/<\/p>/g, '\n</p>');
  const { result, file } = publish(t, f);
  assert.equal(result.status, 'complete', result.message);
  assert.equal(f.state.rows.length, 3);
  assert.equal(f.adapter['recover-set']({ receipt: file }, f.io).status, 'complete');
  assert.match(f.state.rows[0].fields['System.Description'], /\n<\/p>/);
});
test('azuredevops: a meaningful change in a set item stays a divergence', t => {
  const f = fixture('azuredevops');
  f.state.normalize = html => html.replace('Full parent', 'Full  parent');
  const { result } = publish(t, f);
  assert.equal(result.status, 'partial_failure');
  assert.match(result.message, /Creation identity or complete content not verified/);
});
test('gitlab: a normalized description stays a byte-exact mismatch in a set publication', t => {
  const f = fixture('gitlab');
  f.state.normalize = text => `${text}\n`;
  const { result } = publish(t, f);
  assert.equal(result.status, 'partial_failure');
  assert.match(result.message, /Creation identity or complete content not verified/);
});
test('GitLab unavailable native blocking links require approved written fallback without duplicate creation', t => {
  const f = fixture('gitlab'); f.state.failRelation = true;
  f.state.failLinkRead = 'GitLab issue links feature is not available for this license';
  const { result, file } = publish(t, f); assert.equal(result.status, 'partial_failure');
  const pending = f.adapter['recover-set']({ receipt: file, fallback: 'written' }, f.io);
  assert.equal(pending.fallback_proposal.dependencies, 'written');
  const complete = f.adapter['continue-set']({ receipt: file, fallback: 'written', confirmation: pending.continuation }, f.io);
  assert.equal(complete.status, 'complete', complete.message); assert.equal(f.state.rows.length, 3);
  assert.equal(f.source.readSet(f.source.resolve(f.url(1), f.io), f.io).status, 'complete');
});
test('H1 Azure imports actual cross-project parent, direct-child and blocker identities with complete contents', t => {
  const f = fixture('azuredevops'); publish(t, f); f.state.comments = 101;
  const projects = ['ParentProject', 'Child Project', 'OtherChild'];
  f.state.rows.forEach((row, i) => {
    row.fields['System.TeamProject'] = projects[i];
    row.fields['System.Description'] = `Full unchanged source ${i + 1} α\n<pre>code\nnext line</pre>`;
  });
  f.state.rows.push({ id: 4, rev: 1, fields: { 'System.TeamProject': 'BlockerProject', 'System.Title': 'External blocker', 'System.Description': 'Full blocker α', 'System.WorkItemType': 'Task', 'System.State': 'New' }, relations: [] });
  f.state.rows[2].relations.push({ rel: 'System.LinkTypes.Dependency-Reverse', url: 'https://dev.azure.com/org/_apis/wit/workItems/4' });
  const actual = (project, number) => `https://dev.azure.com/org/${encodeURIComponent(project)}/_workitems/edit/${number}`;
  const before = f.state.writes.length;
  const parent = f.source.readSet(f.source.resolve(actual('ParentProject', 1), f.io), f.io);
  assert.equal(parent.status, 'complete', parent.message);
  assert.deepEqual(parent.sources.map(source => source.item.url), [actual('ParentProject', 1), actual('Child Project', 2), actual('OtherChild', 3)]);
  assert.deepEqual(parent.sources.map(source => source.item.description), f.state.rows.slice(0, 3).map(row => row.fields['System.Description']));
  assert.ok(parent.sources.every(source => source.comments.length === 101 && source.comments.at(-1).body === 'Full comment α'));
  assert.deepEqual(parent.sources[2].item.dependencies, [actual('Child Project', 2), actual('BlockerProject', 4)]);
  const child = f.source.readSet(f.source.resolve(actual('OtherChild', 3), f.io), f.io);
  assert.equal(child.status, 'complete', child.message);
  assert.deepEqual(child.sources.map(source => source.role), ['selected', 'parent-context']);
  assert.equal(child.origin.issue, actual('OtherChild', 3));
  assert.equal(child.sources[1].item.description, f.state.rows[0].fields['System.Description']);
  assert.ok(child.sources.every(source => source.comments.length === 101));
  const numeric = f.source.readSet({ organization: 'https://dev.azure.com/org', number: 3 }, f.io);
  assert.equal(numeric.status, 'complete', numeric.message); assert.equal(numeric.origin.issue, actual('OtherChild', 3));
  assert.equal(f.state.writes.length, before);
});
test('H1 Azure related-project lookup failure preserves selected content and leaves import pending', t => {
  const f = fixture('azuredevops'); publish(t, f); f.state.comments = 101;
  f.state.rows[1].fields['System.TeamProject'] = 'OtherProject';
  f.state.failRead = 2;
  const before = f.state.writes.length, result = f.source.readSet(f.source.resolve(f.url(1), f.io), f.io);
  assert.equal(result.status, 'incomplete'); assert.equal(result.origin.issue, f.url(1));
  assert.equal(result.item.description, f.state.rows[0].fields['System.Description']);
  assert.equal(result.comments.length, 101); assert.match(result.message, /missing full child read/);
  assert.equal(f.state.writes.length, before);
});
test('H1 Azure rejects foreign organizations and unverified related projects without fabricated URLs', t => {
  const f = fixture('azuredevops'); publish(t, f);
  const parent = f.state.rows[0], original = parent.relations[0].url;
  parent.relations[0].url = 'https://dev.azure.com/foreign/_apis/wit/workItems/2';
  const start = f.state.calls.length;
  const foreign = f.source.readSet(f.source.resolve(f.url(1), f.io), f.io);
  assert.equal(foreign.status, 'incomplete'); assert.match(foreign.message, /relation identity/);
  assert.ok(!f.state.calls.slice(start).some(call => call.command === 'az' && call.args[0] === 'boards' && call.args[call.args.indexOf('--id') + 1] === '2'));
  parent.relations[0].url = original;
  f.state.rows[1].fields['System.TeamProject'] = null;
  const unknown = f.source.readSet(f.source.resolve(f.url(1), f.io), f.io);
  assert.equal(unknown.status, 'incomplete'); assert.match(unknown.message, /project could not be verified/);
  assert.equal(unknown.origin.issue, f.url(1));
});
test('H2 GitLab written correspondence reconciles additional readable native blockers and retained fallback links', t => {
  const f = fixture('gitlab'); f.state.failRelation = true;
  const { file } = publish(t, f);
  // A relation verified before the failed stretch remains present at fallback.
  f.state.blockers.set(3, [2]);
  const pending = f.adapter['recover-set']({ receipt: file, fallback: 'written' }, f.io);
  assert.deepEqual(pending.fallback_proposal.existing_native_dependencies, [{ issue: { id: 103, number: 3, url: f.url(3) }, depends_on: ['blocker'] }]);
  const complete = f.adapter['continue-set']({ receipt: file, fallback: 'written', confirmation: pending.continuation }, f.io);
  assert.equal(complete.status, 'complete', complete.message);
  f.state.rows.push({ id: 104, iid: 4, project_id: 1, title: 'External blocker', description: 'Full external blocker', web_url: f.url(4), author: { id: f.actor }, assignees: [], issue_type: 'issue', state: 'opened', updated_at: 'v1' });
  f.state.blockers.set(3, [2, 4]);
  const before = f.state.writes.length, imported = f.source.readSet(f.source.resolve(f.url(3), f.io), f.io);
  assert.equal(imported.status, 'complete', imported.message);
  assert.equal(imported.item.correspondence.dependency_representation, 'written');
  assert.deepEqual(imported.item.dependencies, [f.url(2), f.url(4)]);
  assert.equal(f.state.writes.length, before); assert.equal(f.state.rows.length, 4);
});
test('H2 GitLab arbitrary native read failures stay pending; only established unavailability permits disclosed written fallback import', t => {
  const f = fixture('gitlab'); f.state.failRelation = true;
  const { file } = publish(t, f), pending = f.adapter['recover-set']({ receipt: file, fallback: 'written' }, f.io);
  assert.equal(f.adapter['continue-set']({ receipt: file, fallback: 'written', confirmation: pending.continuation }, f.io).status, 'complete');
  const before = f.state.writes.length;
  for (const message of ['HTTP 403: permission denied', 'HTTP 404: item not found', 'connection timed out', 'Incomplete GitLab dependency links']) {
    f.state.failLinkRead = message;
    const result = f.source.readSet(f.source.resolve(f.url(3), f.io), f.io);
    assert.equal(result.status, 'incomplete', message); assert.equal(result.origin.issue, f.url(3));
    assert.match(result.message, /403|404|timed out|Incomplete/);
  }
  f.state.failLinkRead = 'GitLab issue links feature is not supported by this server';
  const supportedFallback = f.source.readSet(f.source.resolve(f.url(3), f.io), f.io);
  assert.equal(supportedFallback.status, 'complete', supportedFallback.message);
  assert.deepEqual(supportedFallback.item.dependencies, [f.url(2)]);
  assert.equal(supportedFallback.item.native_dependency_status, 'unavailable');
  assert.match(supportedFallback.item.native_dependency_notice, /not supported/);
  assert.equal(f.state.writes.length, before);
});
test('GitLab recovery exhausts inventory pages and excludes every pre-existing identity', t => {
  const f = fixture('gitlab');
  for (let i = 1; i <= 101; i++) f.state.rows.push({ id: i + 100, iid: i, project_id: 1, title: 'Existing', description: 'Existing full content', web_url: f.url(i), author: { id: f.actor }, assignees: [], issue_type: 'issue', state: 'opened', updated_at: 'v1' });
  f.request.blocks = block('only'); f.state.lost = true;
  const { file } = publish(t, f);
  const verified = f.adapter['recover-set']({ receipt: file }, f.io);
  assert.deepEqual(verified.candidates[0].issues.map(issue => issue.url), [f.url(102)]);
  const identified = { 0: f.url(102) }, approved = f.adapter['recover-set']({ receipt: file, identified }, f.io);
  const result = f.adapter['continue-set']({ receipt: file, identified, confirmation: approved.continuation }, f.io);
  assert.equal(result.status, 'complete', result.message); assert.equal(f.state.rows.length, 103);
});
test('Azure native relationship rejection requires explicitly approved disclosed written fallback', t => {
  const f = fixture('azuredevops'); f.state.failRelation = true;
  const { result, file } = publish(t, f); assert.equal(result.status, 'partial_failure');
  const pending = f.adapter['recover-set']({ receipt: file, fallback: 'written' }, f.io);
  assert.equal(pending.fallback_proposal.hierarchy, 'written');
  assert.throws(() => f.adapter['continue-set']({ receipt: file, fallback: 'written', confirmation: 'wrong' }, f.io), /approval/);
  const complete = f.adapter['continue-set']({ receipt: file, fallback: 'written', confirmation: pending.continuation }, f.io);
  assert.equal(complete.status, 'complete', complete.message); assert.equal(complete.correspondence.hierarchy, 'written');
  assert.equal(f.state.rows.length, 3);
});
test('provider registry and both managed projections share operations; import access and next-item selection stay read-only', () => {
  const registry = require('../skills/universal/to-backlog/providers/registry.json');
  for (const entry of registry.providers) {
    for (const op of ['query-set', 'publish-set', 'recover-set', 'continue-set', 'lookup-slice', 'inspect-assignment', 'propose-assignment', 'assign', 'verify-assignment']) {
      assert.ok(entry.capabilities.includes(op)); assert.equal(typeof require(`../sai/tools/${entry.adapter}`)[op], 'function');
    }
  }
  const manifest = require('../sai/install-manifest.json');
  assert.deepEqual(manifest.capabilities.profiles['from-backlog-command'].shell, ['node {sai}/tools/from-backlog.js *']);
  const { expandInstallManifest } = require('../bin/install-manifest');
  for (const harness of ['claude', 'opencode']) {
    const repoRoot = path.resolve(__dirname, '..');
    const destinationRoot = Object.fromEntries(['sai', 'skills', 'agents', 'commands', 'root', 'schemas', 'config'].map(key => [key, path.join(os.tmpdir(), `sai-parity-${harness}`, key)]));
    const rows = expandInstallManifest(manifest, { repoRoot, harness, destinationRoot });
    for (const file of ['backlog-provider-set.js', 'backlog-provider-import.js', 'backlog-provider-assignment.js']) assert.ok(rows.some(row => row.sourcePath === path.join(repoRoot, 'sai', 'tools', file)), `${harness}: ${file}`);
    assert.ok(rows.some(row => row.sourcePath === path.join(repoRoot, 'skills', 'universal', 'to-backlog', 'slice-set.md')));
  }
});

for (const platform of ['gitlab', 'azuredevops']) {
  test(`${platform}: propose emits a choice that assign accepts for an unassigned child`, t => {
    const f = fixture(platform); publish(t, f);
    const request = { provider: platform, reference: f.url(2) }, ready = f.adapter['propose-assignment'](request, f.io);
    assert.equal(ready.proposal.choice, 'assign');
    const echoed = f.adapter['propose-assignment']({ ...request, choice: ready.proposal.choice }, f.io);
    assert.equal(echoed.confirmation, ready.confirmation);
    assert.equal(f.adapter.assign({ ...request, choice: ready.proposal.choice, confirmation: ready.confirmation }, f.io).verified, true);
    assert.throws(() => f.adapter['propose-assignment']({ ...request, choice: 'bogus' }, f.io), /Invalid assignment choice/);
  });
}
test('azuredevops: assignment writes the unique name and compares identity ids', t => {
  const f = fixture('azuredevops'); publish(t, f);
  const request = { provider: 'azuredevops', reference: f.url(2) }, ready = f.adapter['propose-assignment'](request, f.io);
  assert.deepEqual(ready.proposal.target, [f.actor]);
  const result = f.adapter.assign({ ...request, confirmation: ready.confirmation }, f.io);
  assert.equal(result.verified, true); assert.deepEqual(result.assignees, [f.actor]);
  assert.equal(f.state.writes.at(-1).body[1].value, 'actor@example.com');
});
test('azuredevops: a provider rejection that proves nothing changed returns rejected, not uncertain', t => {
  const f = fixture('azuredevops'); publish(t, f);
  const request = { provider: 'azuredevops', reference: f.url(2) }, ready = f.adapter['propose-assignment'](request, f.io);
  // The opencode run's failure: Azure answered 400 "unknown identity" through the SDK bridge payload.
  f.state.assignmentFailure = { payload: { sdk_error: 'VS402625: The identity is an unknown identity', status_code: 400 } };
  const result = f.adapter.assign({ ...request, confirmation: ready.confirmation }, f.io);
  assert.equal(result.status, 'rejected'); assert.match(result.message, /No change was applied/);
  assert.equal(result.next_operation, undefined);
  assert.equal(f.state.rows[1].fields['System.AssignedTo'], undefined);
});
test('azuredevops: transport errors, timeouts and 5xx stay uncertain and lead to verification', t => {
  for (const failure of [{ payload: { sdk_error: 'Service unavailable', status_code: 503 } }, { payload: { sdk_error: 'read timed out', status_code: null } }, { thrown: 'socket hang up' }]) {
    const f = fixture('azuredevops'); publish(t, f);
    const request = { provider: 'azuredevops', reference: f.url(2) }, ready = f.adapter['propose-assignment'](request, f.io);
    f.state.assignmentFailure = failure;
    const result = f.adapter.assign({ ...request, confirmation: ready.confirmation }, f.io);
    assert.equal(result.status, 'uncertain'); assert.equal(result.next_operation, 'verify-assignment');
  }
});
test('azuredevops: without a reported unique name assign fails before the PATCH as rejected', t => {
  const f = fixture('azuredevops'); publish(t, f);
  const request = { provider: 'azuredevops', reference: f.url(2) }, ready = f.adapter['propose-assignment'](request, f.io);
  f.state.noUniqueName = true;
  const before = f.state.writes.length, result = f.adapter.assign({ ...request, confirmation: ready.confirmation }, f.io);
  assert.equal(result.status, 'rejected'); assert.equal(f.state.writes.length, before);
});
test('all providers: a definite rejection maps to rejected and an unmarked failure to uncertain through one shared contract', () => {
  const { bind } = require('../sai/tools/backlog-provider-assignment');
  for (const platform of ['github', 'gitlab', 'azuredevops']) {
    const item = { url: 'https://example.test/child', parent: 'p', assignees: [], correspondence: undefined };
    for (const [error, status] of [[Object.assign(new Error('refused'), { rejected: true }), 'rejected'], [new Error('timeout'), 'uncertain']]) {
      const adapter = bind(platform, { native: true, inspect: () => ({ actor: platform === 'gitlab' ? 7 : 'me', result: { status: 'complete', item, sources: [{ role: 'parent-context', item: { url: 'https://example.test/parent' } }] } }), assign: () => { throw error; } });
      const ready = adapter['propose-assignment']({}, {});
      assert.equal(adapter.assign({ confirmation: ready.confirmation }, {}).status, status, platform);
    }
  }
});
test('the start gate offers Skip identically for every provider and keeps step 2 and consent rules', () => {
  const policy = fs.readFileSync(path.join(__dirname, '../sai/policies/backlog-implementation-start.md'), 'utf8').replace(/\s+/g, ' ');
  assert.match(policy, /\*\*Approve \/ Stop \/ Skip\*\*/);
  assert.match(policy, /\*\*Retry \/ Skip \/ Stop\*\*/);
  assert.match(policy, /After `rejected`, Skip is the recommended option/);
  assert.match(policy, /Skip performs no remote operation and holds for the whole implementation stretch/);
  assert.match(policy, /never choose Skip/);
  assert.match(policy, /stayed unassigned by user choice and lists the assignees last verified/);
  assert.match(policy, /keep that responsibility and start, explicitly replace it with the authenticated user, or stop/);
  for (const provider of ['github', 'gitlab', 'azuredevops']) {
    const doc = fs.readFileSync(path.join(__dirname, `../skills/universal/to-backlog/providers/${provider}.md`), 'utf8');
    assert.match(doc, /sai\/policies\/backlog-implementation-start\.md|assignment/i, provider);
    assert.ok(!/Skip/.test(doc), `${provider} adapter doc must not diverge from the shared gate`);
  }
});
