'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { select } = require('../sai/tools/from-next-backlog-item');
const { resolve } = require('../sai/tools/from-backlog');
const registry = require('../skills/universal/from-backlog/providers/registry.json');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest');
const root = path.resolve(__dirname, '..');
const github = { provider: 'github', owner: 'owner', owner_kind: 'organization', project: 1 };
const gitlab = { provider: 'gitlab', project: 'https://gitlab.com/group/repo', pile: 'issues' };
const azure = { provider: 'azuredevops', organization: 'https://dev.azure.com/org', project: 'Project', team: 'Team', backlog: 'requirements' };
function gh(options = {}) {
  return { run(command, args, input) {
    assert.equal(command, 'gh'); assert.deepEqual(args, ['api', 'graphql', '--hostname', 'github.com', '--input', '-']);
    const { query } = JSON.parse(input); assert.doesNotMatch(query, /mutation/);
    if (options.fail) throw new Error('denied');
    if (query.includes('projectsV2')) return JSON.stringify({ data: { organization: { projectsV2: { nodes: [{ number: 1, title: 'Pile', url: 'https://github.com/orgs/owner/projects/1' }], pageInfo: { hasNextPage: false } } } } });
    assert.match(query, /field:POSITION,direction:ASC/);
    return JSON.stringify({ data: { organization: { projectV2: { number: 1, url: 'https://github.com/orgs/owner/projects/1', items: {
      nodes: options.empty ? [] : [{ id: 'item', content: options.hidden ? null : { __typename: options.type || 'Issue', url: 'https://github.com/owner/repo/issues/8' } }],
      pageInfo: options.partial ? {} : { hasNextPage: !!options.more },
    } } } } });
  } };
}
const issue = (id, rank, type = 'issue') => ({ id, iid: id, project_id: 1, relative_position: rank, issue_type: type, web_url: `https://gitlab.com/group/repo/-/issues/${id}` });
function gl(items = [issue(20, 100), issue(8, 2)], options = {}) {
  return { run(command, args) {
    assert.equal(command, 'glab'); assert.ok(!args.includes('POST'));
    if (options.fail) throw new Error('not authenticated');
    if (args[0] === 'repo') return JSON.stringify({ id: 1, path_with_namespace: 'group/repo', archived: false, visibility: 'private', issues_enabled: true, web_url: gitlab.project });
    assert.match(args[1], /order_by=relative_position/);
    if (options.check) options.check(args[1]);
    if (options.partial) return '{}';
    const page = Number(new URL(`https://unused/${args[1]}`).searchParams.get('page'));
    return JSON.stringify(items.slice((page - 1) * 100, page * 100));
  } };
}
function az(options = {}) {
  return { run(command, args) {
    assert.equal(command, 'az');
    if (options.fail) throw new Error('access denied');
    if (args[0] === 'boards') {
      const id = Number(args[args.indexOf('--id') + 1]);
      return JSON.stringify({ id, fields: { 'System.TeamProject': 'Project', 'System.WorkItemType': options.type || 'Custom PBI', 'Custom.Rank': options.missingRank ? null : options.tie ? 1 : id === 20 ? 10 : 1 } });
    }
    assert.fail('Unexpected CLI operation');
  }, sdk(input) {
    if (options.fail) throw new Error('access denied');
    const request = JSON.parse(input);
    assert.equal(request.method, 'GET'); assert.equal(request.route.team, 'Team');
    assert.equal(request.organization, azure.organization);
    if (request.location === 'a93726f9-7867-4e38-b4f2-0bfafc2f6a94') return JSON.stringify({ count: 1, value: [{ id: 'requirements', name: 'Requirements' }] });
    if (request.location === '7799f497-3cb5-4f16-ad4f-5cd06012db64') return JSON.stringify({ backlogFields: { typeFields: { Order: 'Custom.Rank' } } });
    assert.equal(request.location, '7c468d96-ab1d-4294-a360-92f07e9ccd98');
    return JSON.stringify(options.partial ? {} : { workItems: options.empty ? [] : [{ target: { id: 20 } }, { target: { id: 8 } }] });
  } };
}
test('E1 missing provider and provider context remain pending without guessing', () => {
  assert.equal(select({}).options.length, 3);
  for (const provider of ['github', 'gitlab', 'azuredevops']) {
    assert.equal(select({ provider }, { run() { assert.fail('No unresolved-context query'); } }).status, 'pending');
  }
  assert.equal(select({ ...github, project: undefined }, gh()).options[0].value, 1);
  assert.equal(select({ ...gitlab, pile: undefined }, gl()).options[0].value, 'issues');
  assert.equal(select({ ...azure, backlog: undefined }, az()).options[0].value, 'requirements');
  assert.equal(select({ ...azure, backlog: 'unknown' }, az()).status, 'pending');
});
test('E2 and E5 first manual position produces complete import references for every provider', () => {
  const outcomes = [select(github, gh()), select(gitlab, gl()), select(azure, az())];
  for (const outcome of outcomes) { assert.equal(outcome.status, 'selected', JSON.stringify(outcome)); assert.match(outcome.reference, /(?:issues\/8|edit\/8)$/); }
  assert.equal(resolve(outcomes[0].reference, registry).url, outcomes[0].reference);
  assert.equal(resolve(outcomes[1].reference, registry, gl()).url, outcomes[1].reference);
  assert.equal(resolve(outcomes[2].reference, registry).url, outcomes[2].reference);
  assert.equal(outcomes[2].type, 'Custom PBI');
});
test('E2 unavailable ranks, top ties, partial responses, and unsupported views stay pending', () => {
  assert.equal(select(github, gh({ partial: true })).status, 'pending');
  assert.equal(select(gitlab, gl([issue(1, null)])).status, 'pending');
  assert.equal(select(gitlab, gl([issue(1, 1), issue(2, 1)])).reason, 'order-ambiguous');
  assert.equal(select(gitlab, gl([], { partial: true })).status, 'pending');
  assert.equal(select(azure, az({ missingRank: true })).status, 'pending');
  assert.equal(select(azure, az({ tie: true })).reason, 'order-ambiguous');
  assert.equal(select(azure, az({ partial: true })).status, 'pending');
  for (const request of [github, gitlab, azure]) assert.equal(select({ ...request, view: 'filtered' }).reason, 'order-unavailable');
  for (const request of [github, gitlab, azure]) assert.equal(select({ ...request, sort: 'created_at' }).reason, 'unsupported-context');
});
test('E2 GitLab filters and complete pagination determine membership before manual selection', () => {
  const members = Array.from({ length: 101 }, (_, i) => issue(i + 1, 200 - i));
  const result = select({ ...gitlab, filters: { labels: 'ready', state: 'opened' } }, gl(members, { check(endpoint) { assert.match(endpoint, /labels=ready/); assert.match(endpoint, /state=opened/); } }));
  assert.match(result.reference, /issues\/101$/);
  assert.equal(select({ ...gitlab, filters: { order_by: 'created_at' } }, gl()).status, 'pending');
});
test('E3 only complete empty results establish an empty pile', () => {
  assert.equal(select(github, gh({ empty: true })).status, 'empty');
  assert.equal(select(gitlab, gl([])).status, 'empty');
  assert.equal(select(azure, az({ empty: true })).status, 'empty');
  assert.equal(select(github, gh({ empty: true, more: true })).status, 'pending');
});
test('E4 unsupported first items are not skipped; Azure importer supports custom types', () => {
  for (const type of ['PullRequest', 'DraftIssue']) assert.equal(select(github, gh({ type })).reason, 'non-importable');
  assert.equal(select(github, gh({ hidden: true })).reason, 'non-importable');
  assert.equal(select(gitlab, gl([issue(1, 1, 'incident'), issue(2, 2)])).reason, 'non-importable');
  assert.equal(select(azure, az({ type: 'Custom PBI' })).status, 'selected');
});
test('E6 access failures are pending, not empty; E7 cancellation performs no reads', () => {
  for (const [request, io] of [[github, gh({ fail: true })], [gitlab, gl([], { fail: true })], [azure, az({ fail: true })]]) {
    assert.equal(select(request, io).status, 'pending');
  }
  for (const provider of ['github', 'gitlab', 'azuredevops']) assert.deepEqual(select({ provider, cancel: true }, { run() { assert.fail('Cancelled selection has no I/O'); } }), { status: 'cancelled' });
});
test('both installations include selector, provider instructions, tools, and bounded import access', () => {
  const manifest = loadInstallManifest(root);
  for (const harness of ['claude', 'opencode']) {
    const destinationRoot = Object.fromEntries(['sai', 'skills', 'commands', 'agents', 'config', 'root'].map(key => [key, path.join(root, '.unused-install', harness, key)]));
    const projections = expandInstallManifest(manifest, { harness, repoRoot: root, destinationRoot });
    for (const suffix of ['commands/from-next-backlog-item.md', 'skills/from-next-backlog-item/SKILL.md', ...['github', 'gitlab', 'azuredevops'].map(p => `skills/from-next-backlog-item/providers/${p}.md`), ...['', '-github', '-gitlab', '-azuredevops'].map(p => `sai/tools/from-next-backlog-item${p}.js`)]) {
      assert.ok(projections.some(p => p.destinationPath.replace(/\\/g, '/').endsWith(suffix)), `${harness}: ${suffix}`);
    }
    const entry = fs.readFileSync(path.join(root, 'commands', harness, 'from-next-backlog-item.md'), 'utf8');
    assert.match(entry, /retaining its context and exploration stage/);
    assert.doesNotMatch(entry, /boot\.md/);
  }
  const profile = manifest.capabilities.profiles['from-next-backlog-item-command'];
  assert.deepEqual(profile.skills, ['from-next-backlog-item', 'from-backlog']);
  assert.deepEqual(profile.shell, ['node {sai}/tools/from-next-backlog-item.js select', 'node {sai}/tools/from-backlog.js *']);
  assert.equal(profile.write, undefined);
});
test('selection instructions hand off exactly once without duplicating source retrieval', () => {
  const skill = fs.readFileSync(path.join(root, 'skills/universal/from-next-backlog-item/SKILL.md'), 'utf8');
  const importer = fs.readFileSync(path.join(root, 'skills/universal/from-backlog/SKILL.md'), 'utf8');
  assert.match(skill, /disable-model-invocation: true/);
  assert.match(skill, /Reject non-empty invocation arguments/);
  assert.match(skill, /helper's exact `reference`/);
  assert.match(skill, /Cancellation at any question stops immediately/);
  assert.match(skill, /Offer free text and cancellation/);
  assert.match(importer, /one import continuation authorized/);
  assert.match(importer, /Autonomous invocation remains forbidden/);
});
test('CLI cancellation and unresolved identification use JSON stdin without provider reads', () => {
  const tool = path.join(root, 'sai/tools/from-next-backlog-item.js');
  for (const [input, status, outcome] of [[{ cancel: true }, 0, 'cancelled'], [{}, 1, 'pending']]) {
    const result = spawnSync(process.execPath, [tool, 'select'], { input: JSON.stringify(input), encoding: 'utf8' });
    assert.equal(result.status, status, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, outcome);
  }
  const bad = spawnSync(process.execPath, [tool, 'select', 'unexpected'], { input: '{}', encoding: 'utf8' });
  assert.equal(bad.status, 2);
  assert.equal(JSON.parse(bad.stdout).reason, 'usage');
});
