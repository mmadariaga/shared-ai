'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { installClaude } = require('../bin/install-flow.js');

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

test('installClaude copies all Claude-specific skills', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'token-efficient-languages', 'SKILL.md')), 'skills/token-efficient-languages/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-explorer', 'SKILL.md')), 'skills/budget-explorer/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-executor', 'SKILL.md')), 'skills/budget-executor/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-subagent', 'SKILL.md')), 'skills/budget-subagent/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'fetch', 'SKILL.md')), 'skills/fetch/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget', 'SKILL.md')), 'skills/budget/SKILL.md must be present for Claude');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude overwrites existing vendor command files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  const cmdFile = path.join(tmpDir, 'commands', 'sai-1-spec.md');
  fs.mkdirSync(path.dirname(cmdFile), { recursive: true });
  fs.writeFileSync(cmdFile, 'old sentinel content');
  installClaude(tmpDir);
  const expected = fs.readFileSync(path.join(__dirname, '..', 'commands', 'claude', 'sai-1-spec.md'), 'utf8');
  assert.equal(fs.readFileSync(cmdFile, 'utf8'), expected, 'existing vendor command should be overwritten with repo version');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude overwrites stale command wrappers', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  const skillFile = path.join(tmpDir, 'skills', 'budget-explorer', 'SKILL.md');
  fs.mkdirSync(path.dirname(skillFile), { recursive: true });
  fs.writeFileSync(skillFile, 'old content');
  installClaude(tmpDir);
  assert.notEqual(fs.readFileSync(skillFile, 'utf8'), 'old content', 'existing stale file should be overwritten');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});



