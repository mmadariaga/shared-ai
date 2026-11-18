'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolveOpencode, shimTarget } = require('../sai/tools/opencode-launcher');
const { route, checkAgents, FALLBACK_CAUSES } = require('../sai/tools/opencode-dispatch');

const repoRoot = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(repoRoot, file), 'utf8');

/** The Windows branch against an in-memory file system: `files` maps a Windows path to its text. */
function windows(files, pathValue, key = 'Path') {
  const table = new Map(Object.entries(files));
  return resolveOpencode({
    platform: 'win32',
    env: { [key]: pathValue },
    exists: file => table.has(file),
    read: file => { if (!table.has(file)) throw new Error('ENOENT'); return table.get(file); },
  });
}

const NPM_SHIM = target => [
  '@ECHO off', 'GOTO start', ':find_dp0', 'SET dp0=%~dp0', 'EXIT /b', ':start', 'SETLOCAL', 'CALL :find_dp0', '',
  `"${target}"   %*`, '',
].join('\r\n');

const SH_SHIM = '#!/bin/sh\nexec "$basedir/node_modules/@opencode/cli/bin/opencode.exe" "$@"\n';
const NPM_EXE = 'C:\\npm\\node_modules\\@opencode\\cli\\bin\\opencode.exe';

test('E6 on Linux and macOS the command is `opencode` from PATH, resolved by the spawn itself', () => {
  for (const platform of ['linux', 'darwin']) {
    assert.deepEqual(resolveOpencode({ platform, env: {}, exists: () => assert.fail('no file is read') }), { command: 'opencode', shim: null, cause: null });
  }
});

test('E1 on Windows the first opencode entry on PATH decides: a .exe runs directly', () => {
  const files = { 'C:\\first\\opencode.exe': '', 'C:\\second\\opencode.exe': '', 'C:\\npm\\opencode.cmd': NPM_SHIM('%dp0%\\node_modules\\@opencode\\cli\\bin\\opencode.exe'), [NPM_EXE]: '' };
  assert.deepEqual(windows(files, 'C:\\Windows;C:\\first;C:\\second;C:\\npm'), { command: 'C:\\first\\opencode.exe', shim: null, cause: null });
  assert.equal(windows(files, 'C:\\npm;C:\\first').command, NPM_EXE, 'the earlier shim directory wins over the later .exe');
});

test('E2 an npm .cmd shim resolves to the .exe it names and skips the extensionless sh shim', () => {
  const files = {
    'C:\\npm\\opencode': SH_SHIM, 'C:\\npm\\opencode.ps1': '# powershell shim',
    'C:\\npm\\opencode.cmd': NPM_SHIM('%dp0%\\node_modules\\@opencode\\cli\\bin\\opencode.exe'), [NPM_EXE]: '',
  };
  assert.deepEqual(windows(files, 'C:\\npm'), { command: NPM_EXE, shim: 'C:\\npm\\opencode.cmd', cause: null });
  assert.deepEqual(windows({ 'C:\\npm\\opencode': SH_SHIM }, 'C:\\npm'), { command: null, shim: null, cause: 'opencode-missing' }, 'an extensionless entry alone is skipped');
});

test('E3 %dp0% and %~dp0 resolve against the shim directory, spaces included', () => {
  const directory = 'C:\\Program Files\\nodejs';
  const target = `${directory}\\node_modules\\@opencode\\cli\\bin\\opencode.exe`;
  for (const prefix of ['%dp0%\\', '%~dp0\\', '%~dp0']) {
    const files = { [`${directory}\\opencode.cmd`]: NPM_SHIM(`${prefix}node_modules\\@opencode\\cli\\bin\\opencode.exe`), [target]: '' };
    assert.equal(windows(files, `C:\\Windows;"${directory}"`).command, target, prefix);
  }
  assert.equal(shimTarget(NPM_SHIM('%dp0%\\bin\\opencode.exe'), 'C:\\a b'), 'C:\\a b\\bin\\opencode.exe');
});

test('E4 no opencode entry on PATH is a missing install, whatever the case of the PATH key', () => {
  assert.deepEqual(windows({ 'C:\\other\\tool.exe': '' }, 'C:\\other'), { command: null, shim: null, cause: 'opencode-missing' });
  assert.equal(windows({}, '', 'PATH').cause, 'opencode-missing');
  assert.equal(windows({ 'C:\\first\\opencode.exe': '' }, 'C:\\first', 'PATH').command, 'C:\\first\\opencode.exe');
  assert.equal(resolveOpencode({ platform: 'win32', env: {}, exists: () => true }).cause, 'opencode-missing');
});

test('E5 a shim whose .exe cannot be read is unresolved and names the shim', () => {
  const unresolved = (files, shim) => assert.deepEqual(windows(files, 'C:\\npm'), { command: null, shim, cause: 'opencode-shim-unresolved' });
  unresolved({ 'C:\\npm\\opencode.cmd': NPM_SHIM('%dp0%\\node_modules\\@opencode\\cli\\bin\\opencode.exe') }, 'C:\\npm\\opencode.cmd');
  unresolved({ 'C:\\npm\\opencode.cmd': '@echo off\r\npnpm exec opencode %*\r\n' }, 'C:\\npm\\opencode.cmd');
  unresolved({ 'C:\\npm\\opencode.cmd': NPM_SHIM('%dp0%\\node.exe') + '"%dp0%\\node_modules\\opencode-ai\\bin\\opencode" %*' }, 'C:\\npm\\opencode.cmd');
  unresolved({ 'C:\\npm\\opencode.cmd': NPM_SHIM('%USERPROFILE%\\opencode.exe') }, 'C:\\npm\\opencode.cmd');
  unresolved({ 'C:\\npm\\opencode.ps1': '# powershell shim' }, 'C:\\npm\\opencode.ps1');
  assert.equal(shimTarget('no exe here', 'C:\\npm'), null);
});

test('E5 E8 the route query and the setup warning report the same shim cause, and the notice names the shim', () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-launcher-'));
  try {
    fs.mkdirSync(path.join(project, '.claude', 'agents'), { recursive: true });
    fs.writeFileSync(path.join(project, '.claude', 'agents', 'worker.md'), '---\nname: worker\nharness: opencode\n---\nbody\n');
    const probe = () => ({ available: false, agents: null, cause: 'opencode-shim-unresolved', shim: 'C:\\npm\\opencode.cmd' });
    const answer = route({ agent: 'worker', cwd: project }, { root: () => project, probe });
    assert.deepEqual([answer.route, answer.cause], ['claude', 'opencode-shim-unresolved']);
    assert.match(answer.notice, /Agent worker /);
    assert.ok(answer.notice.includes('C:\\npm\\opencode.cmd'));
    assert.ok(answer.notice.includes(FALLBACK_CAUSES['opencode-shim-unresolved']));
    assert.deepEqual(checkAgents(['worker'], {}, { probe }), { worker: 'opencode-shim-unresolved' });
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('on Windows the launcher resolves a real .exe and a real npm .cmd shim from fixture directories', { skip: process.platform !== 'win32' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-launcher-real-'));
  try {
    const bin = path.join(dir, 'Program Files', 'nodejs');
    const target = path.join(bin, 'node_modules', '@opencode', 'cli', 'bin', 'opencode.exe');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '');
    fs.writeFileSync(path.join(bin, 'opencode'), SH_SHIM);
    fs.writeFileSync(path.join(bin, 'opencode.cmd'), NPM_SHIM('%dp0%\\node_modules\\@opencode\\cli\\bin\\opencode.exe'));
    assert.equal(resolveOpencode({ env: { Path: bin } }).command, target);
    fs.writeFileSync(path.join(bin, 'opencode.exe'), '');
    assert.equal(resolveOpencode({ env: { Path: bin } }).command, path.join(bin, 'opencode.exe'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('E7 the dispatch turns and the dispose tool launch opencode through the launcher', () => {
  for (const file of ['sai/tools/opencode-dispatch.js', 'sai/tools/dispose-shells.js']) {
    assert.match(read(file), /require\('\.\/opencode-launcher'\)/, file);
  }
  assert.match(read('bin/doctor.js'), /require\('\.\.\/sai\/tools\/opencode-launcher'\)/);
});

/** The files under `directory` (relative to the repository), without dependencies and generated folders. */
function sourceFiles(directory) {
  return fs.readdirSync(path.join(repoRoot, directory), { withFileTypes: true }).flatMap(entry => {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(relative);
    return entry.name.endsWith('.js') ? [relative] : [];
  });
}

test('E9 no file under sai/tools or bin spawns opencode without the opencode launcher', () => {
  const spawnOfOpencode = /\b(?:spawn|spawnSync|execFile|execFileSync)\(\s*(['"`])opencode\1/;
  const offenders = [...sourceFiles('sai/tools'), ...sourceFiles('bin')]
    .filter(file => file !== 'sai/tools/opencode-launcher.js')
    .filter(file => spawnOfOpencode.test(read(file)));
  assert.deepEqual(offenders, []);
  assert.ok(spawnOfOpencode.test("childProcess.spawnSync('opencode', args)"), 'the scan recognizes the call it guards against');
  assert.ok(!spawnOfOpencode.test('spawnSync(resolveOpencode().command, args)'));
});

test('E10 every Claude Code dispatch site states the route query as an unconditional step', () => {
  for (const file of ['skills/claude/budget-explorer/SKILL.md', 'skills/claude/budget-executor/SKILL.md', 'skills/claude/budget-subagent/SKILL.md']) {
    const text = read(file);
    assert.match(text, /Before every creation of this agent, run the route query of that policy/, file);
    assert.doesNotMatch(text, /When the agent file carries `harness: opencode`/, file);
  }
  assert.match(read('sai/orchestration/workers/bindings/claude/standalone-worker-template.md'), /Before every creation of the worker, a replacement included, run the route query/);
  assert.match(read('sai/commands/design/steps/overview.md'), /runs the route query of `@sai\/policies\/opencode-dispatch\.md` first, every time/);
  assert.match(read('sai/commands/explore/body.md'), /On Claude Code, before each creation of an explorer, run the route query of `@sai\/policies\/opencode-dispatch\.md`/);
});
