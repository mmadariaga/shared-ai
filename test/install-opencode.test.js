'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { installOpencode, copyOpencodeConfig } = require('../bin/install-flow.js');

test('installOpencode copies commands/opencode/*.md to dest/commands/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  installOpencode(tmpDir);
  const cmdDir = path.join(tmpDir, 'commands');
  assert.ok(fs.existsSync(cmdDir), 'commands/ dir should exist');
  const files = fs.readdirSync(cmdDir);
  assert.ok(files.includes('sai-1-spec.md'), 'sai-1-spec.md should be in commands/');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode copies sai/instructions/*.md with Overwriting warn', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const messages = [];
  const origLog = console.log;
  console.log = (msg) => messages.push(String(msg));
  installOpencode(tmpDir);
  console.log = origLog;
  assert.ok(messages.some(m => m.startsWith('Overwriting') || m.startsWith('Creating')), 'should print Overwriting or Creating for instruction files');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode copies all Opencode-specific skills', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  installOpencode(tmpDir);
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'token-efficient-languages', 'SKILL.md')), 'skills/token-efficient-languages/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-explorer', 'SKILL.md')), 'skills/budget-explorer/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-executor', 'SKILL.md')), 'skills/budget-executor/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-subagent', 'SKILL.md')), 'skills/budget-subagent/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget', 'SKILL.md')), 'skills/budget/SKILL.md must be present for Opencode');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'fetch', 'SKILL.md')), 'skills/fetch/SKILL.md');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig copies config when no existing config', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  copyOpencodeConfig(tmpDir);
  assert.ok(fs.existsSync(path.join(tmpDir, 'opencode.jsonc')), 'opencode.jsonc should be copied when none exists');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig skips copy and prints instructions when opencode.jsonc exists', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), '{}');
  let printed = '';
  const origLog = console.log;
  console.log = (msg) => { printed += String(msg) + '\n'; };
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  assert.equal(fs.readFileSync(path.join(tmpDir, 'opencode.jsonc'), 'utf8'), '{}', 'existing config should not be overwritten');
  assert.ok(printed.includes('"agent"'), 'should print manual instructions containing "agent"');
  assert.ok(printed.includes('"budget"'), 'should print the budget agent key in manual instructions');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig skips copy and prints instructions when opencode.json exists', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), '{}');
  let printed = '';
  const origLog = console.log;
  console.log = (msg) => { printed += String(msg) + '\n'; };
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  assert.ok(printed.includes('"agent"'), 'should print manual instructions when opencode.json exists');
  assert.ok(printed.includes('"budget"'), 'should print the budget agent key in manual instructions');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode skips existing vendor command files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const cmdFile = path.join(tmpDir, 'commands', 'sai-1-spec.md');
  fs.mkdirSync(path.dirname(cmdFile), { recursive: true });
  fs.writeFileSync(cmdFile, 'old content');
  installOpencode(tmpDir);
  assert.equal(fs.readFileSync(cmdFile, 'utf8'), 'old content', 'existing vendor command should not be overwritten');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode overwrites stale command wrappers and logs', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const skillFile = path.join(tmpDir, 'skills', 'budget-explorer', 'SKILL.md');
  fs.mkdirSync(path.dirname(skillFile), { recursive: true });
  fs.writeFileSync(skillFile, 'old content');
  const messages = [];
  const origLog = console.log;
  console.log = (msg) => messages.push(String(msg));
  installOpencode(tmpDir);
  console.log = origLog;
  assert.notEqual(fs.readFileSync(skillFile, 'utf8'), 'old content', 'existing stale file should be overwritten');
  assert.ok(messages.some(m => m.startsWith('Overwriting')), 'should log Overwriting for existing file');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

