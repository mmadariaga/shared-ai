'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { resolve } = require('../sai/tools/from-backlog');
const azure = require('../sai/tools/from-backlog-azuredevops');
const registry = require('../skills/universal/from-backlog/providers/registry.json');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest');
const { translate } = require('../bin/capabilities');
const link = 'https://dev.azure.com/team/My%20Project/_workitems/edit/42';
const reference = resolve(link, registry);
const html = '<p>Exact ñ &amp; text</p><ul><li><a href="https://example.test">Link</a></li></ul>';

function mock(state = {}) {
  state.calls = [];
  return { run(command, args) {
    state.calls.push([command, args]);
    if (command === 'git') return state.remotes || '';
    assert.equal(command, 'az');
    assert.ok(!args.includes('login') && !args.includes('install') && !args.includes('update'));
    if (args.includes('configure')) { assert.ok(args.includes('--list')); return state.defaults || ''; }
    if (state.failure) throw new Error(state.failure);
    assert.equal(args[args.indexOf('--organization') + 1], 'https://dev.azure.com/team');
    assert.equal(args[args.indexOf('--detect') + 1], 'false');
    assert.equal(args[args.indexOf('--output') + 1], 'json');
    if (args[0] === 'boards') return JSON.stringify({ id: 42, fields: { 'System.TeamProject': state.project || 'My Project', 'System.Title': 'Custom item', 'System.State': 'Custom closed', 'System.WorkItemType': 'Custom type', 'System.Description': state.empty ? '' : html } });
    assert.deepEqual(args.slice(0, 8), ['devops', 'invoke', '--organization', 'https://dev.azure.com/team', '--area', 'wit', '--resource', 'comments']);
    assert.ok(args.includes('project=My Project') && args.includes('workItemId=42') && args.includes('$top=100'));
    assert.equal(args[args.indexOf('--http-method') + 1], 'GET');
    assert.equal(args[args.indexOf('--api-version') + 1], '7.1-preview');
    const second = args.includes('continuationToken=next');
    if (state.commentsFailure || second && state.pageFailure) throw new Error('permission denied');
    const comments = state.noComments ? [] : [{ id: second && !state.duplicate ? 2 : 1, workItemId: 42, text: html, createdBy: second ? null : { displayName: 'Author' }, format: 'html' }];
    return JSON.stringify({ count: comments.length, totalCount: state.noComments ? 0 : state.total ?? 2, comments, continuationToken: state.noComments || second && !state.repeat ? null : 'next', ...state.page });
  } };
}

test('Services references claim their hosts without breaking GitHub or self-hosted GitLab', () => {
  for (const value of [link, 'https://team.visualstudio.com/My%20Project/_workitems/edit/42', 'https://team.visualstudio.com/DefaultCollection/My%20Project/_workitems/edit/42?x=1#comment']) {
    assert.equal(resolve(value, registry).url, link);
    assert.equal(resolve(value, registry).provider, 'azuredevops');
  }
  assert.equal(resolve('/owner/repo/issues/42', registry).provider, 'github');
  assert.equal(resolve('https://github.com/owner/repo/issues/42', registry).provider, 'github');
  const io = { run(command) { assert.equal(command, 'glab'); return JSON.stringify({ id: 1, path_with_namespace: 'group/repo', archived: false, visibility: 'private', issues_enabled: true, web_url: 'https://private.example/group/repo' }); } };
  assert.equal(resolve('https://private.example/group/repo/-/issues/42', registry, io).provider, 'gitlab');
  for (const value of ['http://dev.azure.com/team/project/_workitems/edit/42', 'https://user@dev.azure.com/team/project/_workitems/edit/42', 'https://dev.azure.com:8443/team/project/_workitems/edit/42', 'https://dev.azure.com/team/project/_workitems/edit/0', 'https://dev.azure.com/team/project/_workitems/edit/999999999999999999', 'https://dev.azure.com/team/project/_workitems/edit/42/extra', 'https://dev.azure.com/team/project/../project/_workitems/edit/42', 'https://dev.azure.com/team/p%2fq/_workitems/edit/42']) assert.throws(() => resolve(value, registry));
  assert.equal(azure.classify('https://server.test/collection/project/_workitems/edit/42'), null);
  for (const value of ['https://dev.azure.com/team/p%ZZ/_workitems/edit/42', 'https://dev.azure.com/team/p%0A/_workitems/edit/42']) assert.throws(() => resolve(value, registry), error => error.reason === 'invalid-reference');
});

test('isolated ID uses only existing unambiguous organization context', () => {
  assert.equal(resolve('42', registry, mock()).status, 'needs_input');
  const defaults = 'organization = https://dev.azure.com/team\nproject = My Project';
  assert.equal(resolve('42', registry, mock({ defaults })).organization, reference.organization);
  for (const remote of ['https://user@dev.azure.com/team/My%20Project/_git/repo', 'git@ssh.dev.azure.com:v3/team/My%20Project/repo', 'https://team.visualstudio.com/My%20Project/_git/repo']) {
    assert.equal(resolve('42', registry, mock({ remotes: `origin ${remote} (fetch)\norigin ${remote} (push)` })).project, 'My Project');
  }
  assert.equal(resolve('42', registry, mock({ defaults, remotes: 'other https://dev.azure.com/other/project/_git/repo (fetch)' })).status, 'needs_input');
  const selected = resolve('42', registry, mock({ defaults: 'organization = https://dev.azure.com/team' }));
  assert.equal(selected.project, undefined);
  assert.equal(azure.read(selected, mock()).item.project, 'My Project');
});

test('custom type, state, rich content and all comment pages preserve project identity', () => {
  const state = {}, result = azure.read(reference, mock(state));
  assert.equal(result.status, 'complete');
  assert.equal(result.item.type, 'Custom type');
  assert.equal(result.item.state, 'Custom closed');
  assert.equal(result.item.description, html);
  assert.equal(result.item.description_format, 'html');
  assert.equal(result.item.repository, undefined);
  assert.equal(result.comments.length, 2);
  assert.equal(result.comments[0].body, html);
  assert.equal(result.comments[1].author, null);
  assert.equal(state.calls.length, 3);
  assert.equal(azure.read(reference, mock({ noComments: true, empty: true })).item.description_missing, true);
});

test('partial, repeated, malformed and changing comments never report complete', () => {
  for (const state of [{ commentsFailure: true }, { pageFailure: true }, { repeat: true }, { duplicate: true }, { total: 3 }, { page: { count: 9 } }, { page: { continuationToken: {} } }, { page: { comments: null } }]) {
    const result = azure.read(reference, mock(state));
    assert.equal(result.status, 'incomplete', JSON.stringify(state));
    assert.equal(result.item.description, html);
  }
  assert.equal(azure.read(reference, mock({ pageFailure: true })).comments.length, 1);
  assert.equal(azure.read(reference, mock({ project: 'Wrong' })).status, 'error');
});

test('missing tool, extension, authentication and access failures remain distinct', () => {
  for (const [failure, reason] of [['spawn az ENOENT', 'tool-unavailable'], ['extension not installed; az extension add', 'extension-unavailable'], ['Run az devops login to setup credentials', 'authentication-failed'], ['does not exist, or you do not have permissions', 'inaccessible-item']]) {
    const result = azure.read(reference, mock({ failure }));
    assert.equal(result.status, 'error');
    assert.equal(result.reason, reason);
  }
});

test('both harnesses project the adapter and provider without write or direct az grants', () => {
  const root = path.resolve(__dirname, '..'), manifest = loadInstallManifest(root);
  for (const harness of ['claude', 'opencode']) {
    const destinationRoot = Object.fromEntries(['root', 'sai', 'commands', 'skills', 'agents', 'config'].map(key => [key, path.join(os.tmpdir(), 'azure-projection', key)]));
    const projections = expandInstallManifest(manifest, { harness, repoRoot: root, destinationRoot });
    for (const suffix of ['sai/tools/from-backlog-azuredevops.js', 'skills/from-backlog/providers/azuredevops.md', 'skills/from-backlog/providers/registry.json']) assert.ok(projections.some(item => item.destinationPath.endsWith(path.join(...suffix.split('/')))), `${harness}: ${suffix}`);
    const profile = translate(manifest.capabilities, 'from-backlog-command', harness).profile;
    assert.ok(!profile.write);
    assert.deepEqual(profile.shell, ['node {sai}/tools/from-backlog.js *']);
  }
});

test('Windows Azure execution bypasses shell syntax and disables automatic extension installation', () => {
  const script = `
    const assert=require('node:assert/strict');
    const path=require('node:path');
    const fs=require('node:fs');
    const child=require('node:child_process');
    Object.defineProperty(process,'platform',{value:'win32'});
    const malicious="project=a&whoami|echo%NAME%\\\"'";
    const calls=[];
    child.spawnSync=(command,args,options)=>{
      calls.push({command,args,options});
      if(command==='where.exe')return {stdout:'C:\\\\cli\\\\wbin\\\\az\\r\\nC:\\\\cli\\\\wbin\\\\az.cmd\\r\\n',status:0};
      assert.equal(command,path.resolve(path.dirname('C:\\\\cli\\\\wbin\\\\az.cmd'),'..','python.exe'));
      assert.deepEqual(args,['-IBm','azure.cli','devops','invoke',malicious]);
      assert.equal(options.shell,false);
      assert.equal(options.env.AZURE_EXTENSION_USE_DYNAMIC_INSTALL,'no');
      return {stdout:'{}',status:0};
    };
    const tool=require('./sai/tools/from-backlog');
    fs.existsSync=()=>true;
    fs.readFileSync=()=>'-IBm azure.cli';
    tool.run('az',['devops','invoke',malicious]);
    assert.equal(calls.length,2);
  `;
  const result = spawnSync(process.execPath, ['-e', script], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
