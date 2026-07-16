'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const childProcess = require('child_process');

const INSTALL_SCRIPT = path.join(__dirname, '..', 'bin', 'install.js');

test('uninstall subcommand routes to uninstall-flow', () => {
  const result = childProcess.spawnSync(process.execPath, [INSTALL_SCRIPT, 'uninstall', '--dry-run'], { encoding: 'utf8' });
  assert.equal(result.status, 0, 'uninstall --dry-run should exit 0');
  assert.ok(result.stdout.toLowerCase().includes('plan'), 'output should contain a plan');
});

test('unknown subcommand prints error listing install, setup, and uninstall and exits non-zero', () => {
  const result = childProcess.spawnSync(process.execPath, [INSTALL_SCRIPT, 'nonsense'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0, 'unknown subcommand should exit non-zero');
  assert.ok(result.stderr.includes('install'), 'stderr should mention install');
  assert.ok(result.stderr.includes('setup'), 'stderr should mention setup');
  assert.ok(result.stderr.includes('uninstall'), 'stderr should mention uninstall');
});

test('--help output names uninstall alongside install and setup', () => {
  const result = childProcess.spawnSync(process.execPath, [INSTALL_SCRIPT, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0, '--help should exit 0');
  assert.ok(result.stdout.includes('install'), 'help should mention install');
  assert.ok(result.stdout.includes('setup'), 'help should mention setup');
  assert.ok(result.stdout.includes('uninstall'), 'help should mention uninstall');
});
