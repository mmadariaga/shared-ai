'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { installClaude, installOpencode } = require('../bin/install-flow.js');
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
