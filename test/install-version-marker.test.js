'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { installClaude, installOpencode, installCopilot } = require('../bin/install-flow.js');
const pkg = require('../package.json');
const VERSION = pkg.version;

test('installClaude writes .version marker', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  const versionFile = path.join(tmpDir, '.version');
  assert.ok(fs.existsSync(versionFile), '.version should exist');
  assert.equal(fs.readFileSync(versionFile, 'utf8'), VERSION);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode writes .version marker', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  installOpencode(tmpDir);
  const versionFile = path.join(tmpDir, '.version');
  assert.ok(fs.existsSync(versionFile), '.version should exist');
  assert.equal(fs.readFileSync(versionFile, 'utf8'), VERSION);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installCopilot writes .version marker to sai dir', () => {
  const promptsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-copilot-prompts-'));
  const skillsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-copilot-skills-'));
  const agentsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-copilot-agents-'));
  const saiDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-copilot-sai-'));
  installCopilot(promptsDir, skillsDir, agentsDir, saiDir);
  const versionFile = path.join(saiDir, '.version');
  assert.ok(fs.existsSync(versionFile), '.version should exist in sai dir');
  assert.equal(fs.readFileSync(versionFile, 'utf8'), VERSION);
  fs.rmSync(promptsDir, { recursive: true, force: true });
  fs.rmSync(skillsDir, { recursive: true, force: true });
  fs.rmSync(agentsDir, { recursive: true, force: true });
  fs.rmSync(saiDir, { recursive: true, force: true });
});
