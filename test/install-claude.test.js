'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { installClaude } = require('../bin/install.js');

test('installClaude copies commands/claude/*.md to dest/commands/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  const cmdDir = path.join(tmpDir, 'commands');
  assert.ok(fs.existsSync(cmdDir), 'commands/ dir should exist');
  const files = fs.readdirSync(cmdDir);
  assert.ok(files.includes('sai-1-spec.md'), 'sai-1-spec.md should be in commands/');
  assert.ok(files.includes('budget.md'), 'budget.md should be in commands/');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude copies sai/commands/*.md to dest/sai/commands/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  const saiCmdDir = path.join(tmpDir, 'sai', 'commands');
  assert.ok(fs.existsSync(saiCmdDir), 'sai/commands/ dir should exist');
  const files = fs.readdirSync(saiCmdDir);
  assert.ok(files.includes('sai-1-spec.md'), 'sai-1-spec.md should be in sai/commands/');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude copies sai/instructions/*.md with Overwriting warn', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  const messages = [];
  const origLog = console.log;
  console.log = (msg) => messages.push(String(msg));
  installClaude(tmpDir);
  console.log = origLog;
  const instrDir = path.join(tmpDir, 'sai', 'instructions');
  assert.ok(fs.existsSync(instrDir), 'sai/instructions/ dir should exist');
  assert.ok(messages.some(m => m.startsWith('Overwriting') || m.startsWith('Creating')), 'should print Overwriting or Creating for instruction files');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude copies six Claude-specific skills', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'caveman', 'SKILL.md')), 'skills/caveman/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'token-efficient-languages', 'SKILL.md')), 'skills/token-efficient-languages/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-explorer', 'SKILL.md')), 'skills/budget-explorer/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-executor', 'SKILL.md')), 'skills/budget-executor/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'fetch', 'SKILL.md')), 'skills/fetch/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget', 'SKILL.md')), 'skills/budget/SKILL.md must be present for Claude');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude skips existing skill files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  const skillDest = path.join(tmpDir, 'skills', 'caveman', 'SKILL.md');
  fs.mkdirSync(path.dirname(skillDest), { recursive: true });
  fs.writeFileSync(skillDest, 'old content');
  installClaude(tmpDir);
  assert.equal(fs.readFileSync(skillDest, 'utf8'), 'old content', 'existing skill should not be overwritten');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude skips existing non-caveman skill files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  const skillNames = ['token-efficient-languages', 'budget-explorer', 'budget-executor', 'fetch', 'budget'];
  for (const name of skillNames) {
    const dest = path.join(tmpDir, 'skills', name, 'SKILL.md');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, 'old content');
  }
  installClaude(tmpDir);
  for (const name of skillNames) {
    const dest = path.join(tmpDir, 'skills', name, 'SKILL.md');
    assert.equal(fs.readFileSync(dest, 'utf8'), 'old content', `skills/${name}/SKILL.md should not be overwritten when already installed`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
