'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const settings = require('../sai/tools/project-settings');
const toBacklog = require('../sai/tools/to-backlog');
const fromBacklog = require('../sai/tools/from-backlog');
const toRegistry = require('../skills/universal/to-backlog/providers/registry.json');

const root = path.resolve(__dirname, '..');
const providerIds = ['github', 'gitlab', 'azuredevops'];

function project(files = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'project-settings-'));
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(directory, name)), { recursive: true });
    fs.writeFileSync(path.join(directory, name), text);
  }
  return directory;
}

test('JSONC parsing strips comments and trailing commas but keeps comment markers inside strings', () => {
  const parsed = settings.parseJsonc(`{
    // line comment
    "backlog": { /* block */ "repository": "https://example.com/a//b/*c*/", "provider": "gitlab", },
  }`);
  assert.deepEqual(parsed, { backlog: { repository: 'https://example.com/a//b/*c*/', provider: 'gitlab' } });
  assert.deepEqual(settings.parseJsonc('{"a":["x,}",],}'), { a: ['x,}'] });
  assert.throws(() => settings.parseJsonc('{ /* open'), /Unterminated/);
});

test('E1 and E2: a missing file, a missing key and "ask" all leave the question normal', () => {
  assert.deepEqual(settings.get('backlog.provider', { cwd: project() }), { value: null, source: 'absent', warnings: [] });
  const cwd = project({ '.sai/settings.jsonc': '{"backlog":{"provider":"ask","project":"p"}}' });
  assert.deepEqual(settings.readBacklog({ cwd, providerIds }), { config: { project: 'p' }, source: 'setting', warnings: [] });
});

test('E6: an unknown id or an invalid value drops only that key, with a warning', () => {
  const cwd = project({ '.sai/settings.jsonc': '{"backlog":{"provider":"jira","type":"bug","repository":"owner/repo","project":3},"other":{"key":1}}' });
  const { config, source, warnings } = settings.readBacklog({ cwd, providerIds });
  assert.deepEqual(config, { repository: 'owner/repo' });
  assert.equal(source, 'setting');
  assert.equal(warnings.length, 4);
  assert.match(warnings.join('\n'), /backlog\.provider.*must be one of github, gitlab, azuredevops/);
  assert.match(warnings.join('\n'), /Unknown setting id backlog\.type/);
  assert.match(warnings.join('\n'), /backlog\.project.*nonempty string/);
  assert.match(warnings.join('\n'), /Unknown setting id other\.key/);
});

test('E5: an unparseable file warns once and every setting stays a normal question', () => {
  const cwd = project({ '.sai/settings.jsonc': '{"backlog": ' });
  const result = settings.readBacklog({ cwd, providerIds });
  assert.deepEqual(result.config, {});
  assert.equal(result.source, 'absent');
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /Cannot parse \.sai\/settings\.jsonc/);
});

test('E22: source is setting or absent', () => {
  const options = { providerIds };
  const current = project({ '.sai/settings.jsonc': '{"backlog":{"provider":"gitlab"}}' });
  assert.deepEqual(settings.get('backlog.provider', { ...options, cwd: current }), { value: 'gitlab', source: 'setting', warnings: [] });
  assert.equal(settings.get('backlog.repository', { ...options, cwd: current }).source, 'absent');
  const unreadable = project({ '.sai/settings.jsonc': '{ nope' });
  const result = settings.readBacklog({ cwd: unreadable, providerIds });
  assert.deepEqual([result.config, result.source], [{}, 'absent']);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /Cannot parse/);
});

test('E4 notices name only settings that no explicit field replaced and the result took', () => {
  const result = { status: 'resolved', provider: 'gitlab', repository: 'g/r', project: 'other' };
  assert.deepEqual(settings.notices({ provider: 'gitlab', project: 'p' }, { project: 'other' }, result), ['Project setting backlog.provider: gitlab']);
});

test('the CLI prints value, source and warnings', () => {
  const cwd = project({ '.sai/settings.jsonc': '{"backlog":{"provider":"gitlab"}}' });
  const run = (...args) => spawnSync(process.execPath, [path.join(root, 'sai/tools/project-settings.js'), ...args], { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(run('get', 'backlog.provider', '--json', '--cwd', cwd).stdout), { value: 'gitlab', source: 'setting', warnings: [] });
  assert.equal(run('get', 'backlog.type', '--json').status, 2);
});

test('E7: explore language ids accept any language name and normalize English and none', () => {
  const cwd = project({ '.sai/settings.jsonc': '{"explore":{"readyToProposeLanguage":" Español ","overviewLanguage":"NONE"}}' });
  assert.deepEqual(settings.get('explore.readyToProposeLanguage', { cwd }), { value: 'Español', source: 'setting', warnings: [] });
  assert.deepEqual(settings.get('explore.overviewLanguage', { cwd }), { value: 'None', source: 'setting', warnings: [] });
  const english = project({ '.sai/settings.jsonc': '{"explore":{"readyToProposeLanguage":"eNGLISH","overviewLanguage":"english"}}' });
  assert.equal(settings.get('explore.readyToProposeLanguage', { cwd: english }).value, 'English');
  assert.equal(settings.get('explore.overviewLanguage', { cwd: english }).value, 'English');
});

test('E7: none is invalid for the Ready to Propose language and an empty or non-string value is invalid for both', () => {
  const cwd = project({ '.sai/settings.jsonc': '{"explore":{"readyToProposeLanguage":"none","overviewLanguage":""}}' });
  const ready = settings.get('explore.readyToProposeLanguage', { cwd });
  assert.equal(ready.value, null);
  assert.match(ready.warnings.join('\n'), /explore\.readyToProposeLanguage.*not none/);
  const overview = settings.get('explore.overviewLanguage', { cwd });
  assert.equal(overview.value, null);
  assert.match(overview.warnings.join('\n'), /explore\.overviewLanguage.*nonempty string/);
  const number = project({ '.sai/settings.jsonc': '{"explore":{"readyToProposeLanguage":3}}' });
  assert.match(settings.get('explore.readyToProposeLanguage', { cwd: number }).warnings.join('\n'), /nonempty string/);
});

test('E1: ask matches case-insensitively and counts as an absent setting', () => {
  const cwd = project({ '.sai/settings.jsonc': '{"explore":{"readyToProposeLanguage":"ASK","overviewLanguage":" Ask "},"backlog":{"provider":"Ask"}}' });
  assert.deepEqual(settings.get('explore.readyToProposeLanguage', { cwd }), { value: null, source: 'absent', warnings: [] });
  assert.deepEqual(settings.get('explore.overviewLanguage', { cwd }), { value: null, source: 'absent', warnings: [] });
  assert.deepEqual(settings.readBacklog({ cwd, providerIds }), { config: {}, source: 'absent', warnings: [] });
});

test('the CLI gets both explore ids with canonical values and rejects an unknown explore id', () => {
  const cwd = project({ '.sai/settings.jsonc': '{"explore":{"readyToProposeLanguage":"english","overviewLanguage":"none"}}' });
  const run = (...args) => spawnSync(process.execPath, [path.join(root, 'sai/tools/project-settings.js'), ...args], { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(run('get', 'explore.readyToProposeLanguage', '--json', '--cwd', cwd).stdout), { value: 'English', source: 'setting', warnings: [] });
  assert.deepEqual(JSON.parse(run('get', 'explore.overviewLanguage', '--json', '--cwd', cwd).stdout), { value: 'None', source: 'setting', warnings: [] });
  assert.equal(run('get', 'explore.itemThree', '--json', '--cwd', cwd).status, 2);
});

test('to-backlog resolves an unknown host through the configured provider', () => {
  const remotes = ['https://git.example.com/group/repo.git', 'https://github.com/owner/repo.git'];
  assert.equal(toBacklog.resolve({ remotes }, toRegistry, {}).reason, 'provider-ambiguous');
  const cwd = project({ '.sai/settings.jsonc': '{"backlog":{"provider":"gitlab"}}' });
  const { config } = settings.readBacklog({ cwd, providerIds });
  const loadAdapter = entry => ({ resolve: input => ({ status: 'resolved', repository: input.remotes[0] }), id: entry.id });
  assert.deepEqual(toBacklog.resolve({ explicit: {}, config, remotes }, toRegistry, { loadAdapter }), {
    status: 'resolved', repository: remotes[0], provider: 'gitlab', instructions: 'providers/gitlab.md', adapter: 'to-backlog-gitlab.js',
  });
});

test('to-backlog resolve output carries settings warnings and no notice for an unsupported explicit provider', () => {
  const cwd = project({ '.sai/settings.jsonc': '{"backlog":{"provider":"github","project":"board","type":"bug"}}' });
  const result = spawnSync(process.execPath, [path.join(root, 'sai/tools/to-backlog.js'), 'resolve', path.join(root, 'skills/universal/to-backlog/providers/registry.json')], {
    cwd, input: JSON.stringify({ explicit: { provider: 'jira' } }), encoding: 'utf8', env: { ...process.env, PATH: '' },
  });
  const output = JSON.parse(result.stdout);
  assert.deepEqual([output.status, output.provider], ['unsupported', 'jira']);
  assert.match(output.warnings.join('\n'), /Unknown setting id backlog\.type/);
  assert.equal(output.notices, undefined);
});

// E15: two fallback providers make a self-hosted URL ambiguous without a setting.
const fromRegistry = { providers: ['gitlab', 'forge'].map(id => ({ id, resolution: 'provider', capabilities: ['read'], instructions: `providers/${id}.md`, adapter: `from-backlog-${id}.js` })) };
const fromIo = extra => ({ ...extra, loadAdapter: entry => entry.id === 'github' ? require('../sai/tools/from-backlog-github') : { resolve: () => ({ status: 'resolved', from: entry.id }) } });
const url = 'https://git.example.com/group/repo/-/issues/1';

test('E15 from-backlog: the configured provider breaks a tie between fallback candidates only', () => {
  assert.throws(() => fromBacklog.resolve(url, fromRegistry, fromIo()), { reason: 'unsupported-provider' });
  const picked = fromBacklog.resolve(url, fromRegistry, fromIo({ configuredProvider: 'forge' }));
  assert.deepEqual([picked.provider, picked.from, picked.settingApplied], ['forge', 'forge', true]);
  assert.throws(() => fromBacklog.resolve(url, fromRegistry, fromIo({ configuredProvider: 'github' })), { reason: 'provider-destination-conflict' });
});

test('E15 from-backlog: a single fallback candidate needs the setting absent or naming it', () => {
  const single = { providers: fromRegistry.providers.slice(0, 1) };
  assert.equal(fromBacklog.resolve(url, single, fromIo()).provider, 'gitlab');
  const named = fromBacklog.resolve(url, single, fromIo({ configuredProvider: 'gitlab' }));
  assert.deepEqual([named.provider, named.settingApplied], ['gitlab', undefined]);
  assert.throws(() => fromBacklog.resolve(url, single, fromIo({ configuredProvider: 'forge' })), { reason: 'provider-destination-conflict' });
});

test('E15 from-backlog: a positive match ignores the configured provider', () => {
  const registry = { providers: [{ id: 'github', hosts: ['github.com'], domainless: true, capabilities: ['read'], instructions: 'providers/github.md', adapter: 'from-backlog-github.js' }, ...fromRegistry.providers] };
  const result = fromBacklog.resolve('https://github.com/owner/repo/issues/1', registry, fromIo({ configuredProvider: 'forge' }));
  assert.equal(result.provider, 'github');
  assert.equal(result.settingApplied, undefined);
});

const registryPath = path.join(root, 'skills/universal/to-backlog/providers/registry.json');
const resolveCli = (cwd, explicit, env = { ...process.env, PATH: '' }) => spawnSync(process.execPath, [path.join(root, 'sai/tools/to-backlog.js'), 'resolve', registryPath], { cwd, input: JSON.stringify({ explicit }), encoding: 'utf8', env });

test('E4: no notice for a setting that an explicit repository address outranked', () => {
  const cwd = project({ '.sai/settings.jsonc': '{"backlog":{"provider":"gitlab"}}' });
  const output = JSON.parse(resolveCli(cwd, { repository: 'https://github.com/o/r' }).stdout);
  assert.deepEqual([output.status, output.provider], ['resolved', 'github']);
  assert.equal(output.notices, undefined);
});

test('E4: a notice names each setting the resolved destination took', () => {
  const cwd = project({ '.sai/settings.jsonc': '{"backlog":{"provider":"github","repository":"o/r","organization":"unused"}}' });
  const output = JSON.parse(resolveCli(cwd, {}).stdout);
  assert.equal(output.status, 'resolved');
  assert.deepEqual(output.notices, ['Project setting backlog.provider: github', 'Project setting backlog.repository: o/r']);
  const overridden = JSON.parse(resolveCli(cwd, { repository: 'o/other' }).stdout);
  assert.deepEqual(overridden.notices, ['Project setting backlog.provider: github']);
});

test('E5/E6: settings warnings stay on a failed to-backlog resolve', () => {
  const cwd = project({ '.sai/settings.jsonc': '{"backlog":{"provider":"gitlab","bogus":1}}' });
  const bin = project({ glab: '#!/bin/sh\nexit 1\n' });
  fs.chmodSync(path.join(bin, 'glab'), 0o755);
  for (const args of [['init', '-q'], ['remote', 'add', 'origin', 'https://git.example.com/g/r.git']]) spawnSync('git', args, { cwd });
  const result = resolveCli(cwd, {}, { ...process.env, PATH: `${bin}:${process.env.PATH}` });
  const output = JSON.parse(result.stdout);
  assert.equal(output.status, 'failure_before_publication');
  assert.match(output.warnings.join('\n'), /Unknown setting id backlog\.bogus/);
});

test('E5/E6: settings warnings stay on a failed from-next-backlog-item selection', () => {
  const cwd = project({ '.sai/settings.jsonc': '{"backlog":{"provider":"gitlab","bogus":1}}' });
  const run = command => {
    if (command === 'git') return 'origin\thttps://git.example.com/g/r.git (fetch)\n';
    throw new Error('glab unreachable');
  };
  const output = require('../sai/tools/from-next-backlog-item').select({}, { cwd, run });
  assert.deepEqual([output.status, output.reason], ['pending', 'retrieval-failed']);
  assert.match(output.warnings.join('\n'), /Unknown setting id backlog\.bogus/);
});

// E9-E11: the settings root is the git top-level directory, then the main worktree.
const git = (cwd, ...args) => {
  const result = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
};
const realTemp = prefix => fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), prefix));

test('E9: a reader run from a subdirectory finds the settings at the git top-level directory', t => {
  const top = realTemp('settings-root-');
  t.after(() => fs.rmSync(top, { recursive: true, force: true }));
  git(top, 'init', '-q');
  fs.mkdirSync(path.join(top, '.sai'));
  fs.writeFileSync(path.join(top, '.sai/settings.jsonc'), '{"backlog":{"provider":"gitlab"}}');
  fs.mkdirSync(path.join(top, 'a/b'), { recursive: true });
  assert.deepEqual(settings.get('backlog.provider', { cwd: path.join(top, 'a/b') }), { value: 'gitlab', source: 'setting', warnings: [] });
  assert.equal(settings.readBacklog({ cwd: path.join(top, 'a'), providerIds }).config.provider, 'gitlab');
});

test('E10: a linked worktree without settings reads the main worktree and says so; its own file wins', t => {
  const top = realTemp('settings-main-');
  const linked = path.join(realTemp('settings-linked-'), 'wt');
  t.after(() => { fs.rmSync(top, { recursive: true, force: true }); fs.rmSync(path.dirname(linked), { recursive: true, force: true }); });
  git(top, 'init', '-q');
  git(top, 'commit', '-q', '--allow-empty', '-m', 'init');
  git(top, 'worktree', 'add', '-q', linked);
  fs.mkdirSync(path.join(top, '.sai'));
  fs.writeFileSync(path.join(top, '.sai/settings.jsonc'), '{"backlog":{"provider":"gitlab"}}');
  const inherited = settings.get('backlog.provider', { cwd: linked });
  assert.equal(inherited.value, 'gitlab');
  assert.match(inherited.notices.join('\n'), /main worktree/);
  assert.equal(settings.readBacklog({ cwd: linked, providerIds }).notices.length, 1);
  fs.mkdirSync(path.join(linked, '.sai'));
  fs.writeFileSync(path.join(linked, '.sai/settings.jsonc'), '{"backlog":{"provider":"github"}}');
  assert.deepEqual(settings.get('backlog.provider', { cwd: linked }), { value: 'github', source: 'setting', warnings: [] });
});

test('E11: outside a git repository only the current directory is read', () => {
  const parent = project({ '.sai/settings.jsonc': '{"backlog":{"provider":"gitlab"}}' });
  const child = path.join(parent, 'child');
  fs.mkdirSync(child);
  assert.equal(settings.get('backlog.provider', { cwd: child }).value, null);
  assert.equal(settings.get('backlog.provider', { cwd: parent }).value, 'gitlab');
});

test('pr.*: readPr returns the four code-host keys and drops an invalid provider with a warning (E12)', () => {
  const cwd = project({ '.sai/settings.jsonc': '{"backlog":{"provider":"github"},"pr":{"provider":"gitlab","repository":"g/r","organization":"o","project":"p"}}' });
  assert.deepEqual(settings.readPr({ cwd, providerIds: ['github', 'gitlab'] }).config, { provider: 'gitlab', repository: 'g/r', organization: 'o', project: 'p' });
  assert.equal(settings.readBacklog({ cwd, providerIds }).config.provider, 'github');
  const invalid = project({ '.sai/settings.jsonc': '{"pr":{"provider":"jira","repository":"g/r"}}' });
  const read = settings.readPr({ cwd: invalid, providerIds: ['github', 'gitlab'] });
  assert.deepEqual(read.config, { repository: 'g/r' });
  assert.match(read.warnings.join('\n'), /Setting pr\.provider .*must be one of github, gitlab/);
  assert.equal(settings.get('pr.provider', { cwd, prProviderIds: ['github', 'gitlab'] }).value, 'gitlab');
});

// E6-E8: a configured backlog provider decides bare references; a full URL keeps its own provider.
const realFromRegistry = require('../skills/universal/from-backlog/providers/registry.json');
const remoteIo = (remote, extra = {}) => ({
  ...extra,
  run: command => { assert.equal(command, 'git'); return `origin\t${remote} (fetch)\norigin\t${remote} (push)\n`; },
  loadAdapter: entry => entry.id === 'gitlab' ? { resolve: value => ({ status: 'resolved', value }) } : require(`../sai/tools/${entry.adapter.replace('.js', '')}`),
});

test('E6: with backlog.provider gitlab, N and #N resolve against the repository of the remote', () => {
  for (const reference of ['8', '#8']) {
    const resolved = fromBacklog.resolve(reference, realFromRegistry, remoteIo('git@git.example.com:group/sub/repo.git', { configuredProvider: 'gitlab' }));
    assert.deepEqual([resolved.provider, resolved.value, resolved.settingApplied], ['gitlab', 'https://git.example.com/group/sub/repo/-/issues/8', true]);
  }
  const http = fromBacklog.resolve('8', realFromRegistry, remoteIo('http://git.example.com:8080/g/r.git', { configuredProvider: 'gitlab' }));
  assert.equal(http.value, 'http://git.example.com:8080/g/r/-/issues/8');
});

test('E6: with backlog.provider github, #N resolves against the github.com remote; no single repository asks for a URL', () => {
  const resolved = fromBacklog.resolve('#8', realFromRegistry, remoteIo('https://github.com/owner/repo.git', { configuredProvider: 'github' }));
  assert.deepEqual([resolved.provider, resolved.repository, resolved.number, resolved.settingApplied], ['github', 'owner/repo', 8, true]);
  const none = fromBacklog.resolve('8', realFromRegistry, remoteIo('https://git.example.com/g/r.git', { configuredProvider: 'github' }));
  assert.deepEqual([none.status, none.reason], ['needs_input', 'context-ambiguous']);
});

test('E6: with backlog.provider azuredevops, N resolves against the configured organization and project', () => {
  const configuredDestination = { organization: 'https://dev.azure.com/acme', project: 'Board One' };
  const resolved = fromBacklog.resolve('#8', realFromRegistry, remoteIo('https://git.example.com/g/r.git', { configuredProvider: 'azuredevops', configuredDestination }));
  assert.deepEqual([resolved.provider, resolved.organization, resolved.project, resolved.number], ['azuredevops', 'https://dev.azure.com/acme', 'Board One', 8]);
});

test('E6: a configured provider that does not read the registry stops with provider-destination-conflict', () => {
  assert.throws(() => fromBacklog.resolve('8', realFromRegistry, remoteIo('https://github.com/o/r.git', { configuredProvider: 'jira' })), { reason: 'provider-destination-conflict' });
});

test('E7: a full URL keeps its own provider and reports that the setting was overridden', () => {
  const resolved = fromBacklog.resolve('https://github.com/owner/repo/issues/3', realFromRegistry, remoteIo('https://git.example.com/g/r.git', { configuredProvider: 'gitlab' }));
  assert.deepEqual([resolved.provider, resolved.settingOverridden, resolved.settingApplied], ['github', true, undefined]);
});

test('E8: without backlog.provider, a bare number keeps its current resolution', () => {
  const io = { run: () => '', loadAdapter: remoteIo('x').loadAdapter };
  assert.throws(() => fromBacklog.resolve('#8', realFromRegistry, io), { reason: 'invalid-reference' });
  const bare = fromBacklog.resolve('8', realFromRegistry, io);
  assert.deepEqual([bare.provider, bare.status, bare.reason, bare.settingApplied], ['azuredevops', 'needs_input', 'context-ambiguous', undefined]);
});

test('E6: the from-backlog CLI prints the settings notice and reads the root from a subdirectory', t => {
  const top = realTemp('from-backlog-root-');
  t.after(() => fs.rmSync(top, { recursive: true, force: true }));
  git(top, 'init', '-q');
  git(top, 'remote', 'add', 'origin', 'https://github.com/owner/repo.git');
  fs.mkdirSync(path.join(top, '.sai'));
  fs.writeFileSync(path.join(top, '.sai/settings.jsonc'), '{"backlog":{"provider":"github"}}');
  fs.mkdirSync(path.join(top, 'sub'));
  const result = spawnSync(process.execPath, [path.join(root, 'sai/tools/from-backlog.js'), 'resolve', path.join(root, 'skills/universal/from-backlog/providers/registry.json')], {
    cwd: path.join(top, 'sub'), input: JSON.stringify({ reference: '#4' }), encoding: 'utf8',
  });
  const output = JSON.parse(result.stdout);
  assert.deepEqual([output.status, output.provider, output.repository, output.number], ['resolved', 'github', 'owner/repo', 4]);
  assert.deepEqual(output.notices, ['Project setting backlog.provider: github']);
});

const LOCAL = '.sai/settings.local.jsonc';

test('I3 and E4: the local file overrides the base file key by key, with each key origin', () => {
  const cwd = project({
    '.sai/settings.jsonc': '{"backlog":{"provider":"gitlab","project":"p"},"explore":{"overviewLanguage":"English"}}',
    [LOCAL]: '// mine\n{"backlog":{"provider":"github",},"explore":{"chatPublicLanguage":" español "}}',
  });
  const result = settings.readSettings({ cwd, providerIds });
  assert.deepEqual(result.values, {
    'backlog.provider': 'github', 'backlog.project': 'p', 'explore.overviewLanguage': 'English', 'explore.chatPublicLanguage': 'español',
  });
  assert.deepEqual(result.origins, {
    'backlog.provider': 'local', 'backlog.project': 'base', 'explore.overviewLanguage': 'base', 'explore.chatPublicLanguage': 'local',
  });
  assert.equal(result.baseValues['backlog.provider'], 'gitlab');
  assert.equal(result.localValues['backlog.provider'], 'github');
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(settings.get('backlog.provider', { cwd, providerIds }), { value: 'github', source: 'setting', warnings: [] });
  assert.equal(settings.get('explore.chatPublicLanguage', { cwd }).value, 'español');
  assert.deepEqual(settings.readBacklog({ cwd, providerIds }).config, { provider: 'github', project: 'p' });
  const run = (...args) => spawnSync(process.execPath, [path.join(root, 'sai/tools/project-settings.js'), ...args], { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(run('get', 'backlog.provider', '--json', '--cwd', cwd).stdout), { value: 'github', source: 'setting', warnings: [] });
});

test('E1: without a local file the result is the base file alone', () => {
  const cwd = project({ '.sai/settings.jsonc': '{"backlog":{"provider":"gitlab"}}' });
  const result = settings.readSettings({ cwd, providerIds });
  assert.deepEqual(result.values, { 'backlog.provider': 'gitlab' });
  assert.deepEqual(result.origins, { 'backlog.provider': 'base' });
  assert.deepEqual(settings.get('explore.chatPublicLanguage', { cwd }), { value: null, source: 'absent', warnings: [] });
});

test('E5: a local file without a base file applies from .sai/ at the project root', () => {
  const cwd = project({ [LOCAL]: '{"explore":{"chatPublicLanguage":"Euskara"}}' });
  assert.deepEqual(settings.get('explore.chatPublicLanguage', { cwd }), { value: 'Euskara', source: 'setting', warnings: [] });
});

test('E7: a local key equal to the base value is still an override', () => {
  const cwd = project({ '.sai/settings.jsonc': '{"backlog":{"provider":"gitlab"}}', [LOCAL]: '{"backlog":{"provider":"gitlab"}}' });
  assert.deepEqual(settings.readSettings({ cwd, providerIds }).origins, { 'backlog.provider': 'local' });
});

test('local ask or an invalid local value replaces the base value and leaves the question normal', () => {
  const base = '{"backlog":{"provider":"gitlab","project":"p"},"explore":{"chatPublicLanguage":"Euskara"}}';
  const asked = project({ '.sai/settings.jsonc': base, [LOCAL]: '{"backlog":{"provider":"ASK"}}' });
  const askedResult = settings.readSettings({ cwd: asked, providerIds });
  assert.deepEqual(askedResult.values, { 'backlog.project': 'p', 'explore.chatPublicLanguage': 'Euskara' });
  assert.deepEqual(askedResult.warnings, []);
  const invalid = project({ '.sai/settings.jsonc': base, [LOCAL]: '{"backlog":{"provider":"jira"},"explore":{"chatPublicLanguage":"none"}}' });
  const invalidResult = settings.readSettings({ cwd: invalid, providerIds });
  assert.deepEqual(invalidResult.values, { 'backlog.project': 'p' });
  assert.equal(invalidResult.warnings.length, 2);
  assert.match(invalidResult.warnings.join('\n'), /backlog\.provider in \.sai\/settings\.local\.jsonc must be one of/);
  assert.match(invalidResult.warnings.join('\n'), /explore\.chatPublicLanguage in \.sai\/settings\.local\.jsonc must name a language, not none/);
});

test('E2: an unparseable local file warns once, names the local file, and leaves the base file in force', () => {
  const cwd = project({ '.sai/settings.jsonc': '{"backlog":{"provider":"gitlab"}}', [LOCAL]: '{"backlog": ' });
  const result = settings.get('backlog.provider', { cwd, providerIds });
  assert.equal(result.value, 'gitlab');
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /Cannot parse \.sai\/settings\.local\.jsonc/);
  assert.match(result.warnings[0], /; the local overrides are ignored and the base values apply\.$/);
  assert.doesNotMatch(result.warnings[0], /normal question/);
  const base = project({ '.sai/settings.jsonc': '{"backlog": ', [LOCAL]: '{"backlog":{"provider":"github"}}' });
  const baseResult = settings.get('backlog.provider', { cwd: base, providerIds });
  assert.equal(baseResult.value, 'github');
  assert.match(baseResult.warnings[0], /Cannot parse \.sai\/settings\.jsonc: .*; every setting asks its normal question\.$/);
});

test('E3: an unknown id in the local file is ignored with a warning naming the local file', () => {
  const cwd = project({ '.sai/settings.jsonc': '{"backlog":{"provider":"gitlab"}}', [LOCAL]: '{"backlog":{"type":"bug"},"other":1}' });
  const result = settings.readSettings({ cwd, providerIds });
  assert.deepEqual(result.values, { 'backlog.provider': 'gitlab' });
  assert.deepEqual(result.origins, { 'backlog.provider': 'base' });
  assert.equal(result.warnings.length, 2);
  assert.match(result.warnings.join('\n'), /Unknown setting id backlog\.type in \.sai\/settings\.local\.jsonc/);
  const notObject = project({ '.sai/settings.jsonc': '{"backlog":{"provider":"gitlab"}}', [LOCAL]: '[1]' });
  assert.match(settings.readSettings({ cwd: notObject, providerIds }).warnings.join('\n'), /\.sai\/settings\.local\.jsonc must contain a JSON object/);
});

test('E5: a linked worktree reads the local file beside the base file it uses', t => {
  const top = realTemp('settings-local-main-');
  const linked = path.join(realTemp('settings-local-linked-'), 'wt');
  t.after(() => { fs.rmSync(top, { recursive: true, force: true }); fs.rmSync(path.dirname(linked), { recursive: true, force: true }); });
  git(top, 'init', '-q');
  git(top, 'commit', '-q', '--allow-empty', '-m', 'init');
  git(top, 'worktree', 'add', '-q', linked);
  fs.mkdirSync(path.join(top, '.sai'));
  fs.writeFileSync(path.join(top, '.sai/settings.jsonc'), '{"backlog":{"provider":"gitlab"}}');
  fs.writeFileSync(path.join(top, LOCAL), '{"backlog":{"provider":"github"}}');
  const inherited = settings.get('backlog.provider', { cwd: linked });
  assert.equal(inherited.value, 'github');
  assert.match(inherited.notices.join('\n'), /main worktree/);
  fs.mkdirSync(path.join(linked, '.sai'));
  fs.writeFileSync(path.join(linked, '.sai/settings.jsonc'), '{"backlog":{"provider":"azuredevops"}}');
  assert.equal(settings.get('backlog.provider', { cwd: linked }).value, 'azuredevops');
});

test('I1: the catalogue labels and sections the screen keys and the chat language key accepts any language but none', () => {
  for (const id of ['explore.readyToProposeLanguage', 'explore.overviewLanguage', 'explore.chatPublicLanguage', 'backlog.provider', 'pr.provider']) {
    assert.equal(typeof settings.CATALOGUE[id].label, 'string', id);
    assert.equal(typeof settings.CATALOGUE[id].section, 'string', id);
  }
  for (const id of ['backlog.repository', 'pr.project', 'backlog.organization']) assert.equal(settings.CATALOGUE[id].label, undefined, id);
  assert.equal(settings.CATALOGUE['explore.chatPublicLanguage'].label, 'Chat language');
  assert.deepEqual(
    ['explore.readyToProposeLanguage', 'explore.overviewLanguage', 'explore.chatPublicLanguage', 'backlog.provider', 'pr.provider'].map(id => [settings.CATALOGUE[id].section, settings.CATALOGUE[id].label]),
    [['Explore', 'Ready to Propose language'], ['Explore', 'Change overview language'], ['Explore', 'Chat language'], ['Backlog', 'Provider'], ['Pull requests', 'Provider']],
  );
  const cwd = project({ '.sai/settings.jsonc': '{"explore":{"chatPublicLanguage":"english"}}' });
  assert.equal(settings.get('explore.chatPublicLanguage', { cwd }).value, 'English');
  const bad = project({ '.sai/settings.jsonc': '{"explore":{"chatPublicLanguage":"none"}}' });
  assert.deepEqual([settings.get('explore.chatPublicLanguage', { cwd: bad }).value, settings.get('explore.chatPublicLanguage', { cwd: bad }).warnings.length], [null, 1]);
});

test('I7: the explore load reads explore.chatPublicLanguage after spawn and its resets, and leaves the shared policies alone', () => {
  const body = fs.readFileSync(path.join(root, 'sai/commands/explore/body.md'), 'utf8');
  const spawn = body.indexOf('Run `sai-state spawn');
  const reset = body.indexOf('sai-state reset <id> explore-slice@1');
  const chat = body.indexOf('get explore.chatPublicLanguage --json');
  assert.ok(spawn > 0 && reset > spawn && chat > reset, 'the chat language read follows the spawn and its resets');
  assert.match(body, /let's talk in <value>/);
  assert.match(body, /only the user's explicit request for another language replaces it/);
  const policy = fs.readFileSync(path.join(root, 'sai/policies/public-chat.md'), 'utf8');
  assert.equal(policy.includes('chatPublicLanguage'), false);
});

// The `warming` setting and its resolver (E1, E2, E15, I3, I4).
const warmingSetting = {
  defaults: { agent: { interval: 4, max: 30 }, subagent: false },
  rules: [
    { provider: 'anthropic', model: 'haiku', role: 'subagent', interval: 4, max: 20 },
    { provider: 'anthropic', role: 'subagent', interval: 3, max: 15 },
    { provider: 'opencode-go', role: 'subagent', enabled: false },
  ],
};
const warmingProject = (value = warmingSetting, local) => project({
  '.sai/settings.jsonc': JSON.stringify({ warming: value }),
  ...(local === undefined ? {} : { '.sai/settings.local.jsonc': JSON.stringify({ warming: local }) }),
});
const resolved = (cwd, provider, model, role) => settings.warming({ provider, model, role }, { cwd });

test('I3: warming is one catalogue id and no setting means off for both roles (E1)', () => {
  assert.ok(settings.CATALOGUE.warming);
  const cwd = project();
  for (const role of ['agent', 'subagent']) {
    assert.deepEqual(resolved(cwd, 'anthropic', 'haiku', role), { warming: 'off', origin: 'none', warnings: [] });
  }
  assert.equal(resolved(warmingProject({ defaults: { agent: false, subagent: false } }), 'anthropic', 'haiku', 'agent').warming, 'off');
});

test('E2/I4: the model rule beats the provider rule, which beats the role default, separately per role', () => {
  const cwd = warmingProject();
  assert.deepEqual(resolved(cwd, 'anthropic', 'haiku', 'subagent'), { warming: { interval: 4, max: 20 }, origin: 'model', warnings: [] });
  assert.deepEqual(resolved(cwd, 'anthropic', 'opus', 'subagent'), { warming: { interval: 3, max: 15 }, origin: 'provider', warnings: [] });
  assert.deepEqual(resolved(cwd, 'anthropic', undefined, 'subagent').warming, { interval: 3, max: 15 });
  assert.deepEqual(resolved(cwd, 'unlisted', 'any', 'agent'), { warming: { interval: 4, max: 30 }, origin: 'defaults', warnings: [] });
  assert.equal(resolved(cwd, 'unlisted', 'any', 'subagent').warming, 'off');
  assert.equal(resolved(cwd, 'anthropic', 'haiku', 'agent').origin, 'defaults');
});

test('E3/I4: the family rule applies between the exact model rule and the provider rule, for both roles and anthropic only', () => {
  const rule = (model, role, interval) => ({ provider: 'anthropic', ...(model === undefined ? {} : { model }), role, interval, max: 30 });
  const cwd = warmingProject({
    defaults: { agent: { interval: 9, max: 30 } },
    rules: [rule('opus', 'agent', 2), rule('claude-opus-5-5', 'agent', 1), rule(undefined, 'agent', 3), rule('opus', 'subagent', 4), rule(undefined, 'subagent', 5), { provider: 'opencode-go', model: 'opus', role: 'agent', interval: 6, max: 30 }],
  });
  assert.deepEqual(resolved(cwd, 'anthropic', 'claude-opus-5-5', 'agent'), { warming: { interval: 1, max: 30 }, origin: 'model', warnings: [] });
  assert.deepEqual(resolved(cwd, 'anthropic', 'claude-opus-5-6', 'agent'), { warming: { interval: 2, max: 30 }, origin: 'family', warnings: [] });
  assert.deepEqual(resolved(cwd, 'anthropic', 'claude-opus-5-6', 'subagent'), { warming: { interval: 4, max: 30 }, origin: 'family', warnings: [] });
  assert.deepEqual(resolved(cwd, 'anthropic', 'opus', 'agent'), { warming: { interval: 2, max: 30 }, origin: 'model', warnings: [] });
  assert.equal(resolved(cwd, 'anthropic', 'claude-sonnet-5-5', 'agent').origin, 'provider');
  assert.equal(resolved(cwd, 'anthropic', 'claude-sonnet-5-5', 'subagent').origin, 'provider');
  assert.equal(resolved(cwd, 'opencode-go', 'claude-opus-5-5', 'agent').origin, 'defaults');
  assert.equal(resolved(cwd, 'unlisted', 'claude-opus-5-5', 'agent').origin, 'defaults');
});

test('E3/I4: an id that names no family skips the family step', () => {
  const cwd = warmingProject({ rules: [{ provider: 'anthropic', model: 'opus', role: 'agent', interval: 2, max: 30 }, { provider: 'anthropic', role: 'agent', interval: 3, max: 30 }] });
  for (const model of ['gpt-5', 'claude', 'claude-3-5-sonnet-20241022', 'opus-5', 'Claude-opus-5', undefined]) {
    assert.equal(resolved(cwd, 'anthropic', model, 'agent').origin, 'provider', String(model));
  }
});

test('E1/E2: a rule with enabled: false turns warming off even where the defaults enable it', () => {
  const cwd = warmingProject({ defaults: { subagent: { interval: 4, max: 30 } }, rules: [{ provider: 'opencode-go', model: 'm', role: 'subagent', enabled: false }] });
  assert.deepEqual(resolved(cwd, 'opencode-go', 'm', 'subagent'), { warming: 'off', origin: 'model', warnings: [] });
  assert.deepEqual(resolved(cwd, 'opencode-go', 'other', 'subagent').warming, { interval: 4, max: 30 });
});

test('E15: the resolver reads the files again at every call, and the local file overrides the whole entry', () => {
  const cwd = warmingProject();
  assert.deepEqual(resolved(cwd, 'x', 'y', 'agent').warming, { interval: 4, max: 30 });
  fs.writeFileSync(path.join(cwd, '.sai/settings.local.jsonc'), '{ "warming": { "defaults": { "agent": false, "subagent": false }, "rules": [] } }');
  assert.equal(resolved(cwd, 'x', 'y', 'agent').warming, 'off');
  assert.equal(resolved(cwd, 'anthropic', 'haiku', 'subagent').warming, 'off');
  fs.rmSync(path.join(cwd, '.sai/settings.local.jsonc'));
  assert.deepEqual(resolved(cwd, 'anthropic', 'haiku', 'subagent').warming, { interval: 4, max: 20 });
});

test('I3: an invalid warming value drops the key with a warning, so nothing warms', () => {
  const invalid = [
    'text', { defaults: { agent: { interval: 0, max: 5 } } }, { defaults: { agent: { interval: 5, max: 2 } } }, { defaults: { manager: false } },
    { rules: {} }, { rules: [{ provider: 'p', role: 'agent' }] }, { rules: [{ provider: 'p', role: 'boss', interval: 1, max: 2 }] },
    { rules: [{ provider: '', role: 'agent', interval: 1, max: 2 }] }, { rules: [{ provider: 'p', role: 'agent', enabled: false, interval: 1, max: 2 }] },
    { rules: [{ provider: 'p', role: 'agent', interval: 1, max: 2, extra: 1 }] }, { surprise: true },
  ];
  for (const value of invalid) {
    const result = resolved(warmingProject(value), 'p', 'm', 'agent');
    assert.equal(result.warming, 'off', JSON.stringify(value));
    assert.match(result.warnings.join('\n'), /Setting warming in \.sai\/settings\.jsonc/, JSON.stringify(value));
  }
});

test('I4: the warming subcommand prints the effective values as JSON and rejects bad arguments', () => {
  const cwd = warmingProject();
  const run = (...args) => spawnSync(process.execPath, [path.join(root, 'sai/tools/project-settings.js'), 'warming', ...args, '--json', '--cwd', cwd], { encoding: 'utf8' });
  const ok = run('--provider', 'anthropic', '--model', 'haiku', '--role', 'subagent');
  assert.equal(ok.status, 0);
  assert.deepEqual(JSON.parse(ok.stdout), { warming: { interval: 4, max: 20 }, origin: 'model', warnings: [] });
  assert.equal(JSON.parse(run('--provider', 'x', '--role', 'subagent').stdout).warming, 'off');
  for (const args of [['--role', 'agent'], ['--provider', 'p', '--role', 'boss'], ['--provider', 'p', '--role', 'agent', '--wat', '1']]) {
    const bad = run(...args);
    assert.equal(bad.status, 2);
    assert.equal(JSON.parse(bad.stdout).status, 'error');
  }
});

test('I3: the settings writer validates and saves a warming entry through the catalogue', () => {
  const writer = require('../bin/project-settings-writer');
  const cwd = project({ '.sai/settings.jsonc': '{\n  // keep me\n  "explore": { "chatPublicLanguage": "English" }\n}\n' });
  assert.equal(writer.saveSettings(cwd, { warming: { defaults: { agent: { interval: 4, max: 30 } } } }).ok, true);
  const text = fs.readFileSync(path.join(cwd, '.sai/settings.jsonc'), 'utf8');
  assert.match(text, /\/\/ keep me/);
  assert.deepEqual(resolved(cwd, 'x', 'y', 'agent').warming, { interval: 4, max: 30 });
  const refused = writer.saveSettings(cwd, { warming: { defaults: { agent: { interval: -1, max: 30 } } } });
  assert.equal(refused.ok, false);
  assert.match(refused.error, /warming/);
});
