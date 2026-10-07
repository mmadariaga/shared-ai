'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const from = require('../sai/tools/from-backlog-gitlab');
const to = require('../sai/tools/to-backlog-gitlab');
const importRouter = require('../sai/tools/from-backlog');
const publishRouter = require('../sai/tools/to-backlog');
const readRegistry = require('../skills/universal/from-backlog/providers/registry.json');
const writeRegistry = require('../skills/universal/to-backlog/providers/registry.json');
const { prepareTemp } = require('../skills/universal/to-backlog/scripts/prepare-temp');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest');
const { translate } = require('../bin/capabilities');
const url = 'https://private.example:8443/group/nested/repo';
const reference = `${url}/-/issues/7`;
const text = { title: '-n $(touch nope) ñ', description: '\n```sh\n`whoami` "$HOME"\n```\n' };

function mock(state = {}) {
  state.rows ??= [];
  state.calls ??= [];
  return { run(command, args, input) {
    assert.equal(command, 'glab');
    state.calls.push({ args, input });
    if (state.failure) throw new Error(state.failure);
    if (args[0] === 'repo') {
      assert.deepEqual(args.slice(0, 4), ['repo', 'view', '--output', 'json']);
      if (args.length > 4) assert.equal(args[4], '--');
      return JSON.stringify({ id: 14, web_url: url, path_with_namespace: 'group/nested/repo', archived: !!state.archived, visibility: state.visibility || 'internal', ...(state.projectSignals ?? { issues_enabled: !state.disabled }) });
    }
    assert.equal(args[0], 'api');
    assert.equal(args[args.indexOf('--hostname') + 1], 'private.example:8443');
    const endpoint = args[1], method = args[args.indexOf('--method') + 1];
    if (method === 'GET') {
      assert.equal(args.includes('--header'), false);
      assert.equal(args.includes('--input'), false);
      assert.equal(input ?? '', '');
    }
    const row = () => ({ id: 30, project_id: 14, iid: 7, web_url: reference, issue_type: 'issue', title: 'Old', description: 'Before', updated_at: 'version-1', state: 'opened', author: { id: 2 }, ...state.issue });
    if (endpoint === 'user') return JSON.stringify({ id: state.otherActor ? 3 : 2 });
    if (method !== 'GET') {
      assert.equal(args[args.indexOf('--header') + 1], 'Content-Type: application/json');
      assert.deepEqual(args.slice(-2), ['--input', '-']);
      const body = JSON.parse(input);
      assert.deepEqual(Object.keys(body).sort(), ['description', 'title']);
      state.mutations = (state.mutations || 0) + 1;
      if (state.denyMutation) throw new Error('glab: permission denied');
      if (!state.ignoreMutation) {
        state.issue = { ...row(), ...body, ...(state.emptyDescription ? { description: '' } : {}), updated_at: 'version-2' };
        if (method === 'POST') state.rows.push(state.issue);
      }
      if (state.loseResponse) throw new Error('response lost');
      return JSON.stringify(state.issue);
    }
    if (endpoint.includes('/notes?')) {
      const params = new URLSearchParams(endpoint.split('?')[1]);
      if (params.get('order_by') === 'id') throw new Error('glab: HTTP 400: order_by does not have a valid value');
      const page = Number(params.get('page'));
      assert.equal(endpoint, `projects/14/issues/7/notes?per_page=100&page=${page}&sort=asc&order_by=created_at`);
      if (page === 2 && state.pageFailure) throw new Error('second page failed');
      if (state.notePages) return JSON.stringify(state.notePages[page - 1]);
      return JSON.stringify(page === 1 ? Array.from({ length: state.manyNotes ? 100 : 2 }, (_, index) => ({ id: index + 1, body: ` exact ${index}\n`, author: index ? null : { username: 'author' }, system: index === 1 })) : [{ id: state.repeated ? 1 : 101, body: 'last', author: null, system: false }]);
    }
    if (endpoint.startsWith('projects/14/issues?')) {
      const page = Number(new URLSearchParams(endpoint.split('?')[1]).get('page'));
      assert.equal(endpoint, `projects/14/issues?scope=all&state=all&per_page=100&page=${page}&order_by=created_at&sort=asc`);
      if (page === state.issuePageFailure) throw new Error('issue page failed');
      if (state.issuePages) return JSON.stringify(state.issuePages[page - 1]);
      return JSON.stringify(state.manyIssues ? page === 1 ? Array.from({ length: 100 }, (_, i) => ({ ...row(), id: i + 100, iid: i + 100, web_url: `${url}/-/issues/${i + 100}` })) : state.rows : state.rows);
    }
    assert.equal(endpoint, 'projects/14/issues/7');
    return JSON.stringify(row());
  } };
}

function temp(harness = 'opencode') {
  return process.platform === 'linux'
    ? prepareTemp(harness).directory
    : fs.mkdtempSync(path.join(fs.existsSync('/tmp/opencode') ? '/tmp/opencode' : os.tmpdir(), 'backlog-gitlab-test-'));
}

function receipt(harness = 'opencode') {
  return path.join(temp(harness), 'receipt.json');
}

function prepared(state = {}, mode = 'create') {
  const io = mock(state);
  const request = mode === 'create' ? { provider: 'gitlab', repository: url, ...text } : { provider: 'gitlab', reference, baseline: to['read-update']({ reference }, io).baseline, ...text };
  const ready = to[mode === 'create' ? 'query' : 'query-update'](request, io);
  return { io, request: { ...request, confirmation: ready.confirmation, receipt: receipt() } };
}

test('GitLab resolves through glab without host catalogue; GitHub priority and missing destinations remain intact', () => {
  const io = mock();
  const imported = importRouter.resolve(reference, readRegistry, io);
  assert.equal(imported.provider, 'gitlab'); assert.equal(imported.url, reference);
  const resolved = publishRouter.resolve({ explicit: { repository: url } }, writeRegistry, io);
  assert.equal(resolved.provider, 'gitlab'); assert.equal(resolved.repository, url);
  assert.equal(publishRouter.resolve({ explicit: { provider: 'gitlab' } }, writeRegistry, io).reason, 'repository-ambiguous');
  assert.equal(publishRouter.resolve({ explicit: { provider: 'gitlab', repository: url, project: 'board' } }, writeRegistry, io).status, 'needs_input');
  assert.equal(publishRouter.resolve({ explicit: { repository: 'https://github.com/a/b' } }, writeRegistry, io).provider, 'github');
  assert.equal(importRouter.resolve('/a/b/issues/7', readRegistry, io).provider, 'github');
  assert.throws(() => to.query(text, io), /destination/);
  assert.throws(() => importRouter.resolve('7', readRegistry, io));
});

test('both GitLab display routes import ordinary issues with API provenance intact', () => {
  for (const inputRoute of ['issues', 'work_items']) {
    for (const responseRoute of ['issues', 'work_items']) {
      const returnedURL = `${url}/-/${responseRoute}/7?display=1#details`;
      const state = { issue: { web_url: returnedURL, title: text.title, description: text.description } };
      const io = mock(state);
      const resolved = importRouter.resolve(`${url}/-/${inputRoute}/7?view=1#note_2`, readRegistry, io);
      const result = from.read(resolved, io);
      assert.equal(result.status, 'complete');
      assert.equal(result.item.url, returnedURL);
      assert.equal(result.item.title, text.title);
      assert.equal(result.item.description, text.description);
      assert.equal(result.comments[0].body, ' exact 0\n');
      assert.equal(result.comments[0].url, `${url}/-/${responseRoute}/7?display=1#note_1`);
      assert.ok(state.calls.every(call => call.args[0] === 'repo' || call.args.includes('GET')));
    }
  }
});

test('GitLab invalid and incomplete references fail before provider queries with specific causes', () => {
  for (const [input, reason, message] of [
    [`${url}/-/issues/0`, 'invalid-reference', /positive safe integer/],
    [`${url}/-/work_items/999999999999999999`, 'invalid-reference', /positive safe integer/],
    [`${url}/-/issues/nope`, 'invalid-reference', /positive safe integer/],
    [`${url}/-/issues/`, 'incomplete-reference', /number is missing/],
    ['https://private.example/-/issues/7', 'incomplete-reference', /project path is missing/],
    ['https://user:secret@private.example/group/repo/-/issues/7', 'invalid-reference', /credentials/],
    [`${url}/-/epics/7`, 'unsupported-reference', /route is not supported/],
  ]) {
    const state = {};
    assert.throws(() => importRouter.resolve(input, readRegistry, mock(state)), error => error.reason === reason && message.test(error.message));
    assert.deepEqual(state.calls, []);
  }
});

test('GitLab response validation names the failed identity, URL, type or content check', () => {
  for (const [issue, message] of [
    [{ id: 0 }, /issue ID/], [{ project_id: 15 }, /project ID/], [{ iid: 8 }, /issue number/],
    [{ web_url: `${url}/-/work_items/8` }, /URL.*number/],
    [{ web_url: 'https://other.example/group/nested/repo/-/issues/7' }, /URL.*destination/],
    [{ web_url: `${url}-other/-/issues/7` }, /URL.*destination/],
    [{ web_url: `${url}/-/epics/7` }, /URL.*route/],
    [{ web_url: `https://user@private.example:8443/group/nested/repo/-/issues/7` }, /URL.*credentials/],
    ...['task', 'incident', 'epic'].map(issue_type => [{ issue_type }, /Unsupported GitLab item type/]),
    ...[undefined, null, ''].map(issue_type => [{ issue_type }, /issue type cannot be verified/]),
    [{ title: null }, /title/], [{ description: 5 }, /description/], [{ state: 'unknown' }, /state/],
  ]) {
    const result = from.read({ url: reference }, mock({ issue }));
    assert.equal(result.status, 'error');
    assert.match(result.message, message);
    assert.equal(result.item, undefined);
  }
  const io = mock();
  const redirected = { run(command, args, input) {
    const result = JSON.parse(io.run(command, args, input));
    if (args[0] === 'repo') result.web_url = `${url}-other`;
    return JSON.stringify(result);
  } };
  assert.throws(() => from.resolve(reference, redirected), /project destination/);
});

test('recognized issue-enablement signals preserve boolean and access-level-only responses', () => {
  for (const projectSignals of [{ issues_enabled: true }, { issues_access_level: 'enabled' }, { issues_access_level: 'private' }, { issues_enabled: true, issues_access_level: 'enabled' }]) {
    const state = { projectSignals };
    const { io, request } = prepared(state);
    assert.equal(to.publish(request, io).status, 'complete');
    assert.equal(state.mutations, 1);
    assert.equal(from.read({ url: reference }, io).status, 'complete');
    const update = prepared({ projectSignals }, 'update');
    assert.equal(to.update(update.request, update.io).status, 'complete');
  }
});

test('missing, malformed and disabled issue-enablement signals block POST and PUT', () => {
  const malformed = [{}, { issues_enabled: null }, { issues_enabled: 'true' }, { issues_enabled: 1 }, { issues_access_level: null }, { issues_access_level: 'unknown' }, { issues_access_level: true }, { issues_enabled: true, issues_access_level: 'unknown' }, { issues_enabled: 'true', issues_access_level: 'enabled' }];
  const disabled = [{ issues_enabled: false }, { issues_access_level: 'disabled' }, { issues_enabled: true, issues_access_level: 'disabled' }, { issues_enabled: false, issues_access_level: 'enabled' }];
  for (const projectSignals of [...malformed, ...disabled]) {
    for (const mode of ['create', 'update']) {
      const state = {};
      const { io, request } = prepared(state, mode);
      // A previously approved proposal must also fail closed when its fresh
      // project response loses the enablement evidence before publication.
      state.projectSignals = projectSignals;
      const result = to[mode === 'create' ? 'publish' : 'update'](request, io);
      assert.equal(result.status, 'failure_before_publication');
      assert.match(result.message, malformed.includes(projectSignals) ? /Incomplete.*issue-enablement/ : /issues are disabled/);
      assert.equal(state.mutations, undefined);
      assert.equal(fs.existsSync(request.receipt), false);
      assert.ok(state.calls.every(call => !call.args.includes('POST') && !call.args.includes('PUT')));
    }
  }
});

test('complete paginated comments preserve text, unknown authors and canonical provenance', () => {
  const state = { manyNotes: true, archived: true, issue: { description: null, state: 'closed' } };
  const result = from.read({ url: reference }, mock(state));
  assert.equal(result.status, 'complete'); assert.equal(result.comments.length, 100);
  assert.equal(result.item.description_missing, true); assert.equal(result.item.state, 'CLOSED');
  assert.equal(result.item.repository_archived, true);
  assert.equal(result.comments[0].body, ' exact 0\n');
  assert.equal(result.comments.at(-1).url, `${reference}#note_101`);
  assert.equal(result.comments.at(-1).author, null);
  assert.ok(state.calls.every(call => !call.args.includes('POST') && !call.args.includes('PUT')));
});

test('supported note ordering keeps ascending user identifiers across pages and partial failures', () => {
  const note = id => ({ id, body: ` original ${id} ñ\n\u0060code\u0060\n`, author: { username: 'writer' }, system: false });
  // Provider creation-time order need not equal identifier order, including
  // across page boundaries. System notes still count toward page length.
  const first = Array.from({ length: 100 }, (_, index) => note(300 - index));
  first[10].system = true;
  const last = [note(5), note(400), note(150)];
  const received = `${url}/-/work_items/7?display=1#details`;
  for (const pageFailure of [false, true]) {
    const state = { notePages: [first, last], pageFailure, issue: { web_url: received, ...text } };
    const result = from.read({ url: received }, mock(state));
    assert.equal(result.status, pageFailure ? 'incomplete' : 'complete');
    assert.equal(result.item.url, received);
    assert.equal(result.item.title, text.title);
    assert.equal(result.item.description, text.description);
    const expected = [...first, ...(pageFailure ? [] : last)].filter(row => !row.system).sort((a, b) => a.id - b.id);
    assert.deepEqual(result.comments, expected.map(row => ({ id: row.id, body: row.body, author: 'writer', url: `${url}/-/work_items/7?display=1#note_${row.id}` })));
    const requests = state.calls.filter(call => call.args[1]?.includes('/notes?'));
    assert.equal(requests.length, 2);
    assert.ok(requests.every(call => call.args.includes('GET') && call.args[1].endsWith('&sort=asc&order_by=created_at')));
    if (pageFailure) assert.match(result.message, /second page failed/);
  }
  const empty = from.read({ url: received }, mock({ notePages: [[]], issue: { web_url: received } }));
  assert.equal(empty.status, 'complete');
  assert.deepEqual(empty.comments, []);
});

test('partial comment retrieval keeps title, description and already retrieved comments', () => {
  const result = from.read({ url: reference }, mock({ manyNotes: true, pageFailure: true }));
  assert.equal(result.status, 'incomplete'); assert.equal(result.comments.length, 99);
  assert.equal(result.item.description, 'Before'); assert.match(result.message, /second page/);
  assert.equal(from.read({ url: reference }, mock({ manyNotes: true, repeated: true })).status, 'incomplete');
  for (const failure of ['authentication failed', 'permission denied', 'unsupported glab version']) {
    assert.match(from.read({ url: reference }, mock({ failure })).message, new RegExp(failure));
    assert.throws(() => to.query({ repository: url, ...text }, mock({ failure })), new RegExp(failure));
  }
});

test('partial work_items import preserves API provenance and already retrieved source text', () => {
  const received = `${url}/-/work_items/7`;
  const result = from.read({ url: received }, mock({ manyNotes: true, pageFailure: true, issue: { web_url: received, ...text } }));
  assert.equal(result.status, 'incomplete');
  assert.equal(result.item.url, received);
  assert.equal(result.item.description, text.description);
  assert.equal(result.comments.length, 99);
  assert.match(result.message, /second page failed/);
});

test('work_items update uses exact approval and route drift does not normalize authorization or recovery', () => {
  const received = `${url}/-/work_items/7`;
  const state = { issue: { web_url: received } };
  const { io, request } = prepared(state, 'update');
  assert.equal(to.update({ ...request, description: 'unapproved' }, io).status, 'failure_before_publication');
  assert.equal(state.mutations, undefined);
  assert.equal(to.update(request, io).status, 'complete');
  state.issue.web_url = reference;
  const recovered = to['recover-update']({ receipt: request.receipt }, io);
  assert.equal(recovered.status, 'uncertain');
  assert.match(recovered.message, /identity or destination changed/);
  assert.equal(state.mutations, 1);

  const drift = { issue: { web_url: reference } };
  const approved = prepared(drift, 'update');
  drift.issue.web_url = received;
  assert.equal(to.update(approved.request, approved.io).status, 'failure_before_publication');
  assert.equal(drift.mutations, undefined);
  assert.equal(fs.existsSync(approved.request.receipt), false);
});

test('exact confirmation precedes creation; JSON content remains data and results are verified', () => {
  const state = {};
  const { io, request } = prepared(state);
  assert.equal(to.publish({ ...request, title: 'edited' }, io).status, 'failure_before_publication');
  assert.equal(state.mutations, undefined);
  assert.equal(to.publish(request, io).status, 'complete');
  assert.equal(state.mutations, 1);
  assert.equal(state.rows[0].title, text.title);
  assert.equal(state.rows[0].description, text.description);
  const submission = state.calls.find(call => call.args.includes('POST'));
  assert.equal(submission.input, JSON.stringify(text));
  assert.ok(!submission.args.includes(text.title) && !submission.args.includes(text.description));
  assert.equal(to.publish(request, io).status, 'failure_before_publication');
  assert.equal(state.mutations, 1);
});

test('paginated issue baselines retain IDs regardless of their creation-time order', () => {
  const rows = Array.from({ length: 101 }, (_, i) => ({ id: 500 - i, project_id: 14, iid: i + 100, web_url: `${url}/-/issues/${i + 100}`, title: text.title, description: text.description, author: { id: 2 } }));
  const state = { issuePages: [rows.slice(0, 100), rows.slice(100)] };
  const { io, request } = prepared(state);
  // The POST reaches the host, but its response is lost. Existing matches
  // across both pages must remain baseline entries, not recovery candidates.
  state.loseResponse = true;
  assert.equal(to.publish(request, io).status, 'uncertain');
  assert.deepEqual(JSON.parse(fs.readFileSync(request.receipt)).baseline, rows.map(row => row.id));
  const recovery = to.recover({ receipt: request.receipt, issueUrl: rows[100].web_url }, io);
  assert.equal(recovery.status, 'uncertain');
  assert.deepEqual(recovery.candidates, []);
  assert.equal(state.mutations, 1);
});

test('invalid, repeated and failed issue pages stop before POST and pending receipt creation', () => {
  const row = { id: 100, project_id: 14, iid: 100, web_url: `${url}/-/issues/100`, title: 'Existing', description: null, author: { id: 2 } };
  const fullPage = Array.from({ length: 100 }, (_, i) => ({ ...row, id: i + 100, iid: i + 100, web_url: `${url}/-/issues/${i + 100}` }));
  for (const listing of [
    { issuePages: [{}] },
    { issuePages: [[{ ...row, id: undefined }]] },
    { issuePages: [[row, row]] },
    { issuePages: [fullPage, [row]] },
    { issuePages: [fullPage, null] },
    { issuePageFailure: 1 },
    { issuePages: [fullPage], issuePageFailure: 2 },
  ]) {
    const state = { ...listing };
    const { io, request } = prepared(state);
    const result = to.publish(request, io);
    assert.equal(result.status, 'failure_before_publication');
    assert.match(result.message, /Incomplete.*GitLab issue|repeated GitLab issue|issue page failed/);
    assert.equal(fs.existsSync(request.receipt), false);
    assert.equal(state.mutations, undefined);
    assert.ok(state.calls.every(call => !call.args.includes('POST')));
  }
});

test('uncertain creation keeps its receipt and recovery performs reads only', () => {
  for (const behavior of [{ denyMutation: true }, { ignoreMutation: true, loseResponse: true }]) {
    const state = { ...behavior };
    const { io, request } = prepared(state);
    assert.equal(to.publish(request, io).status, 'uncertain');
    const originalReceipt = fs.readFileSync(request.receipt, 'utf8');
    assert.equal(JSON.parse(originalReceipt).stage, 'creation_pending');
    state.calls = [];
    assert.equal(to.recover({ receipt: request.receipt, issueUrl: reference }, io).status, 'uncertain');
    assert.equal(fs.readFileSync(request.receipt, 'utf8'), originalReceipt);
    assert.ok(state.calls.every(call => call.args[0] === 'repo' || call.args.includes('GET')));
    assert.equal(to.publish(request, io).status, 'failure_before_publication');
    assert.equal(state.mutations, 1);
  }
});

test('a correct title with an empty description is never verified or repaired', () => {
  for (const loseResponse of [false, true]) {
    const state = { emptyDescription: true, loseResponse };
    const { io, request } = prepared(state);
    assert.equal(to.publish(request, io).status, 'uncertain');
    const originalReceipt = fs.readFileSync(request.receipt, 'utf8');
    state.calls = [];
    const recovered = to.recover({ receipt: request.receipt, issueUrl: reference }, io);
    assert.equal(recovered.status, 'uncertain');
    if (loseResponse) assert.deepEqual(recovered.candidates, []);
    else assert.match(recovered.message, /approved content could not be verified/);
    assert.equal(fs.readFileSync(request.receipt, 'utf8'), originalReceipt);
    assert.equal(state.rows[0].title, text.title);
    assert.equal(state.rows[0].description, '');
    assert.equal(state.mutations, 1);
    assert.ok(state.calls.every(call => call.args[0] === 'repo' || call.args.includes('GET')));
  }
});

test('lost creation responses are verified before recovery and never cause duplicate creation', () => {
  const state = { loseResponse: true, manyIssues: true };
  const { io, request } = prepared(state);
  assert.equal(to.publish(request, io).status, 'uncertain');
  const recovered = to.recover({ receipt: request.receipt }, io);
  assert.equal(recovered.status, 'uncertain'); assert.equal(recovered.candidates.length, 1);
  assert.equal(to.recover({ receipt: request.receipt, issueUrl: reference }, io).status, 'complete');
  assert.equal(state.mutations, 1);
  assert.equal(to.recover({ receipt: request.receipt }, mock({ otherActor: true })).status, 'uncertain');
});

test('no-op and stale origin updates do not mutate, including version-only changes', () => {
  const state = {};
  const { io, request } = prepared(state, 'update');
  assert.equal(to['query-update']({ ...request, title: 'Old', description: 'Before' }, io).status, 'no_changes');
  state.issue = { updated_at: 'version-2' };
  assert.equal(to.update(request, io).reason, 'stale-baseline');
  assert.equal(state.mutations, undefined);
  state.issue = {};
  assert.equal(to.update({ ...request, description: 'unconfirmed' }, io).status, 'failure_before_publication');
  assert.equal(state.mutations, undefined);
});

test('update lost responses distinguish applied, pending and divergent; recovery never mutates', () => {
  for (const ignoreMutation of [false, true]) {
    const state = { loseResponse: true, ignoreMutation };
    const { io, request } = prepared(state, 'update');
    assert.equal(to.update(request, io).status, ignoreMutation ? 'pending' : 'complete');
    const submission = state.calls.find(call => call.args.includes('PUT'));
    assert.equal(submission.input, JSON.stringify(text));
    if (!ignoreMutation) {
      assert.equal(state.issue.title, text.title);
      assert.equal(state.issue.description, text.description);
    }
    assert.equal(to['recover-update']({ receipt: request.receipt }, io).status, ignoreMutation ? 'pending' : 'complete');
    state.issue = { title: 'Other author edit', updated_at: 'version-3' };
    assert.equal(to['recover-update']({ receipt: request.receipt }, io).status, 'divergent');
    assert.equal(state.mutations, 1);
  }
});

test('GitLab provider references and tools project for both harnesses with helper-only permissions', () => {
  const root = path.resolve(__dirname, '..');
  const manifest = loadInstallManifest(root);
  for (const harness of ['claude', 'opencode']) {
    const destination = temp(harness);
    const destinationRoot = Object.fromEntries(['root', 'sai', 'commands', 'skills', 'agents', 'config'].map(key => [key, path.join(destination, key)]));
    const projection = expandInstallManifest(manifest, { harness, repoRoot: root, destinationRoot });
    for (const suffix of ['sai/tools/from-backlog-gitlab.js', 'sai/tools/to-backlog-gitlab.js', 'skills/from-backlog/providers/gitlab.md', 'skills/to-backlog/providers/gitlab.md', 'skills/to-backlog/providers/gitlab-update.md']) {
      assert.ok(projection.some(entry => entry.destinationPath.replaceAll('\\', '/').endsWith(suffix)), suffix);
    }
    for (const command of ['from-backlog', 'to-backlog']) {
      const profile = manifest.capabilities.profiles[`${command}-command`];
      assert.ok(profile.shell.some(rule => rule.includes(`tools/${command}.js`)));
      const native = translate(manifest.capabilities, `${command}-command`, harness).profile;
      assert.ok(native.shell.some(rule => rule.includes(`tools/${command}.js`)));
      assert.ok(!native.shell.some(rule => /^(gh|glab) /.test(rule)));
    }
  }
  const githubInstructions = fs.readFileSync(path.join(root, 'skills/universal/to-backlog/providers/github.md'), 'utf8');
  assert.match(githubInstructions, /Create this exact issue\s+and add it to this Project\?/);
});

test('CLI dispatch uses simulated glab with literal JSON stdin and no shell interpretation', { skip: process.platform === 'win32' }, () => {
  const directory = temp();
  const stateFile = path.join(directory, 'state.json');
  fs.writeFileSync(stateFile, '{}', { mode: 0o600 });
  fs.writeFileSync(path.join(directory, 'glab'), `#!${process.execPath}\nconst fs=require('node:fs'); const assert=require('node:assert/strict');\nconst url=${JSON.stringify(url)}, reference=${JSON.stringify(reference)};\n${mock.toString()}\nconst file=process.env.FAKE_GLAB_STATE; const state=JSON.parse(fs.readFileSync(file));\ntry { console.log(mock(state).run('glab',process.argv.slice(2),fs.readFileSync(0,'utf8'))); } catch(error) { console.error(error.message); process.exitCode=1; } finally { fs.writeFileSync(file,JSON.stringify(state)); }\n`, { mode: 0o700 });
  const root = path.resolve(__dirname, '..');
  function invoke(skill, operation, request) {
    const result = spawnSync(process.execPath, [path.join(root, `sai/tools/${skill}.js`), operation, path.join(root, `skills/universal/${skill}/providers/registry.json`)], { cwd: directory, input: JSON.stringify(request), encoding: 'utf8', env: { ...process.env, PATH: directory, FAKE_GLAB_STATE: stateFile } });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return JSON.parse(result.stdout);
  }
  const destination = invoke('to-backlog', 'resolve', { explicit: { repository: url } });
  assert.equal(destination.provider, 'gitlab');
  const request = { provider: 'gitlab', repository: destination.repository, ...text };
  const ready = invoke('to-backlog', 'query', request);
  assert.equal(invoke('to-backlog', 'publish', { ...request, confirmation: ready.confirmation, receipt: receipt() }).status, 'complete');
  const imported = invoke('from-backlog', 'read', { reference });
  assert.equal(imported.item.description, text.description);
  const saved = JSON.parse(fs.readFileSync(stateFile));
  saved.issue.web_url = `${url}/-/work_items/7`;
  fs.writeFileSync(stateFile, JSON.stringify(saved));
  for (const inputRoute of ['issues', 'work_items']) {
    const importedEquivalent = invoke('from-backlog', 'read', { reference: `${url}/-/${inputRoute}/7?view=1#details` });
    assert.equal(importedEquivalent.status, 'complete');
    assert.equal(importedEquivalent.item.url, saved.issue.web_url);
    assert.equal(importedEquivalent.item.description, text.description);
  }
  const current = invoke('to-backlog', 'read-update', { provider: 'gitlab', reference });
  const updateRequest = { provider: 'gitlab', reference, baseline: current.baseline, title: 'Refined', description: text.description };
  const updateReady = invoke('to-backlog', 'query-update', updateRequest);
  assert.equal(invoke('to-backlog', 'update', { ...updateRequest, confirmation: updateReady.confirmation, receipt: receipt() }).status, 'complete');
  assert.equal(JSON.parse(fs.readFileSync(stateFile)).mutations, 2);
  assert.equal(fs.existsSync(path.join(directory, 'nope')), false);
});
