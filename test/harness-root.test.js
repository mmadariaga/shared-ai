'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { resolveGlobalRoot, parseOpencodeConfigLine } = require('../skills/universal/fetch/harness-root');

const repoRoot = path.join(__dirname, '..');
const home = path.resolve(path.sep, 'home', 'u');
const silent = () => ({ status: 1, stdout: '' });
const reporting = dir => () => ({ status: 0, stdout: `home       ${home}\nconfig     ${dir}\nstate      /x\n` });

test('E7 Claude Code resolves CLAUDE_CONFIG_DIR when it is set and ~/.claude when it is unset or blank', () => {
  const configured = path.resolve(path.sep, 'srv', 'claude-alt');
  assert.equal(resolveGlobalRoot('claude', { home, env: { CLAUDE_CONFIG_DIR: configured } }), configured);
  assert.equal(resolveGlobalRoot('claude', { home, env: {} }), path.join(home, '.claude'));
  assert.equal(resolveGlobalRoot('claude', { home, env: { CLAUDE_CONFIG_DIR: '  ' } }), path.join(home, '.claude'));
  assert.equal(resolveGlobalRoot('claude', { home, env: { CLAUDE_CONFIG_DIR: '' } }), path.join(home, '.claude'));
});

test('E8 opencode resolves the reported directory, then XDG_CONFIG_HOME/opencode, then ~/.config/opencode', () => {
  const reported = path.resolve(path.sep, 'srv', 'reported');
  const xdg = path.resolve(path.sep, 'srv', 'xdg');
  const env = { XDG_CONFIG_HOME: xdg };
  assert.equal(resolveGlobalRoot('opencode', { home, env, runOpencodePaths: reporting(reported) }), reported);
  assert.equal(resolveGlobalRoot('opencode', { home, env, runOpencodePaths: silent }), path.join(xdg, 'opencode'));
  assert.equal(resolveGlobalRoot('opencode', { home, env: {}, runOpencodePaths: silent }), path.join(home, '.config', 'opencode'));
  assert.equal(resolveGlobalRoot('opencode', { home, env: { XDG_CONFIG_HOME: '' }, runOpencodePaths: silent }), path.join(home, '.config', 'opencode'));
});

test('an opencode probe that throws, reports no config line, or fails never stops the resolution', () => {
  const expected = path.join(home, '.config', 'opencode');
  for (const probe of [() => { throw new Error('no binary'); }, () => ({ status: 0, stdout: 'home /x\nstate /y\n' }), () => ({ status: 0, stdout: 'config   \n' }), () => ({ status: 0, error: new Error('x'), stdout: 'config /z\n' }), () => undefined]) {
    assert.equal(resolveGlobalRoot('opencode', { home, env: {}, runOpencodePaths: probe }), expected);
  }
});

test('Claude Code never runs the opencode probe', () => {
  let calls = 0;
  resolveGlobalRoot('claude', { home, env: {}, runOpencodePaths: () => { calls += 1; return silent(); } });
  assert.equal(calls, 0);
});

test('an unsupported harness is rejected and the config line parser reads only that line', () => {
  assert.throws(() => resolveGlobalRoot('copilot', { home, env: {} }), /Unsupported harness/);
  assert.equal(parseOpencodeConfigLine('data /d\nconfig   /a b/opencode  \r\nstate /s\n'), '/a b/opencode');
  assert.equal(parseOpencodeConfigLine(undefined), null);
});

test('the module runs from the installed layout beside fetch.js with no repository path', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-harness-root-'));
  try {
    for (const name of ['fetch.js', 'harness-root.js']) fs.copyFileSync(path.join(repoRoot, 'skills/universal/fetch', name), path.join(dir, name));
    const result = spawnSync(process.execPath, ['-e', `process.stdout.write(require(${JSON.stringify(path.join(dir, 'harness-root.js'))}).resolveGlobalRoot('claude'))`], { encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: path.join(dir, 'cfg') } });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, path.join(dir, 'cfg'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
