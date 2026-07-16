'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { parseArgs, main } = require('../bin/uninstall-flow.js');

// ---------- parseArgs ----------

test('parseArgs throws on positional argument, naming the token', () => {
  assert.throws(
    () => parseArgs(['uninstall', '/some/path']),
    (err) => {
      assert.equal(err.name, 'Error');
      assert.match(err.message, /\/some\/path|positional/i);
      return true;
    },
  );
});

test('parseArgs throws on unrecognized flag, naming the token', () => {
  assert.throws(
    () => parseArgs(['uninstall', '--force']),
    (err) => {
      assert.equal(err.name, 'Error');
      assert.match(err.message, /--force/i);
      return true;
    },
  );
});

test('parseArgs --dry-run returns dryRun true', () => {
  const result = parseArgs(['uninstall', '--dry-run']);
  assert.equal(result.dryRun, true);
  assert.equal(result.yes, false);
});

test('parseArgs --yes returns yes true', () => {
  const result = parseArgs(['uninstall', '--yes']);
  assert.equal(result.dryRun, false);
  assert.equal(result.yes, true);
});

test('parseArgs --dry-run --yes sets both flags', () => {
  const result = parseArgs(['uninstall', '--dry-run', '--yes']);
  assert.equal(result.dryRun, true);
  assert.equal(result.yes, true);
});

test('parseArgs --yes --dry-run sets both flags (order independent)', () => {
  const result = parseArgs(['uninstall', '--yes', '--dry-run']);
  assert.equal(result.dryRun, true);
  assert.equal(result.yes, true);
});

// ---------- main ----------

test('main returns non-zero when parseArgs would reject positional argument', async () => {
  const exitCode = await main({ argv: ['uninstall', '/some/path'] });
  assert.notEqual(exitCode, 0);
});

test('main returns non-zero when parseArgs would reject unrecognized flag', async () => {
  const exitCode = await main({ argv: ['uninstall', '--force'] });
  assert.notEqual(exitCode, 0);
});

test('main --dry-run prints plan, touches nothing, does not call confirm', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-cli-'));
  try {
    const filePath = path.join(tmpDir, 'commands', 'test.md');
    fs.mkdirSync(path.join(tmpDir, 'commands'), { recursive: true });
    fs.writeFileSync(filePath, 'test content');

    let confirmCalled = false;
    const logs = [];
    const origLog = console.log;
    const origError = console.error;
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => logs.push(args.join(' '));
    try {
      const exitCode = await main({
        argv: ['uninstall', '--dry-run'],
        confirm: async () => { confirmCalled = true; return true; },
        claudeBase: tmpDir,
      });

      assert.equal(exitCode, 0);
      assert.ok(logs.some(l => /plan/i.test(l)), 'should print plan');
      assert.equal(confirmCalled, false, 'confirm should not be called');
      assert.equal(fs.existsSync(filePath), true, 'file should not be deleted under dry-run');
    } finally {
      console.log = origLog;
      console.error = origError;
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('main --dry-run --yes behaves identically to --dry-run (dry-run takes precedence)', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-cli-'));
  try {
    const filePath = path.join(tmpDir, 'commands', 'test.md');
    fs.mkdirSync(path.join(tmpDir, 'commands'), { recursive: true });
    fs.writeFileSync(filePath, 'test content');

    let confirmCalled = false;
    const logs = [];
    const origLog = console.log;
    const origError = console.error;
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => logs.push(args.join(' '));
    try {
      const exitCode = await main({
        argv: ['uninstall', '--dry-run', '--yes'],
        confirm: async () => { confirmCalled = true; return true; },
        claudeBase: tmpDir,
      });

      assert.equal(exitCode, 0);
      assert.ok(logs.some(l => /plan/i.test(l)), 'should print plan');
      assert.equal(confirmCalled, false, 'confirm should not be called');
      assert.equal(fs.existsSync(filePath), true, 'file should not be deleted under dry-run');
    } finally {
      console.log = origLog;
      console.error = origError;
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('main default with confirm=true deletes installed files and prints summary', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-cli-'));
  try {
    const filePath = path.join(tmpDir, 'commands', 'test.md');
    fs.mkdirSync(path.join(tmpDir, 'commands'), { recursive: true });
    fs.writeFileSync(filePath, 'test content');

    const logs = [];
    const origLog = console.log;
    const origError = console.error;
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => logs.push(args.join(' '));
    try {
      const exitCode = await main({
        argv: ['uninstall'],
        confirm: async () => true,
        claudeBase: tmpDir,
      });

      assert.equal(exitCode, 0);
      assert.equal(fs.existsSync(filePath), false, 'file should be deleted after confirmation');
      assert.ok(logs.some(l => /summary/i.test(l)), 'should emit summary');
    } finally {
      console.log = origLog;
      console.error = origError;
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('main default with confirm=false calls confirm and does not delete', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-cli-'));
  try {
    const filePath = path.join(tmpDir, 'commands', 'test.md');
    fs.mkdirSync(path.join(tmpDir, 'commands'), { recursive: true });
    fs.writeFileSync(filePath, 'test content');

    let confirmCalled = false;
    const exitCode = await main({
      argv: ['uninstall'],
      confirm: async () => { confirmCalled = true; return false; },
      claudeBase: tmpDir,
    });

    assert.equal(exitCode, 0);
    assert.ok(confirmCalled, 'confirm should have been called');
    assert.equal(fs.existsSync(filePath), true, 'file should not be deleted when user declines');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('main --yes proceeds without confirmation, deletes files, emits summary', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-cli-'));
  try {
    const filePath = path.join(tmpDir, 'commands', 'test.md');
    fs.mkdirSync(path.join(tmpDir, 'commands'), { recursive: true });
    fs.writeFileSync(filePath, 'test content');

    let confirmCalled = false;
    const logs = [];
    const origLog = console.log;
    const origError = console.error;
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => logs.push(args.join(' '));
    try {
      const exitCode = await main({
        argv: ['uninstall', '--yes'],
        confirm: async () => { confirmCalled = true; return true; },
        claudeBase: tmpDir,
      });

      assert.equal(exitCode, 0);
      assert.equal(confirmCalled, false, 'confirm should not be called with --yes');
      assert.equal(fs.existsSync(filePath), false, 'file should be deleted');
      assert.ok(logs.some(l => /summary/i.test(l)), 'should emit summary');
    } finally {
      console.log = origLog;
      console.error = origError;
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
