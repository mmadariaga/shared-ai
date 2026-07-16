'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

const { installClaude, installOpencode, installCopilot } = require('../bin/install-flow.js');
const { enumerateClaude, enumerateOpencode, enumerateCopilot, buildDeletionSet } = require('../bin/uninstall-flow.js');

function walkFiles(dir) {
  const result = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        result.push(full);
      }
    }
  }
  walk(dir);
  return result;
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

test('enumerateClaude dests match installClaude written files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-uninstall-'));
  try {
    installClaude(tmpDir);
    const written = walkFiles(tmpDir).map(f => path.relative(tmpDir, f));
    const entries = enumerateClaude(tmpDir);
    const enumeratedDests = entries.map(e => path.relative(tmpDir, e.dest));
    assert.deepEqual([...written].sort(), [...enumeratedDests].sort());
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('enumerateOpencode dests match installOpencode written files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-uninstall-'));
  try {
    installOpencode(tmpDir);
    const written = walkFiles(tmpDir).map(f => path.relative(tmpDir, f));
    const entries = enumerateOpencode(tmpDir);
    const enumeratedDests = entries.map(e => path.relative(tmpDir, e.dest));
    assert.deepEqual([...written].sort(), [...enumeratedDests].sort());
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('enumerateCopilot dests match installCopilot written files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-uninstall-'));
  try {
    installCopilot(tmpDir, tmpDir, tmpDir, tmpDir);
    const written = walkFiles(tmpDir).map(f => path.relative(tmpDir, f));
    const entries = enumerateCopilot(tmpDir, tmpDir, tmpDir, tmpDir);
    const enumeratedDests = entries.map(e => path.relative(tmpDir, e.dest));
    assert.deepEqual([...written].sort(), [...enumeratedDests].sort());
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('enumerateClaude src sha256 matches installed dest sha256', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-uninstall-'));
  try {
    installClaude(tmpDir);
    const entries = enumerateClaude(tmpDir);
    assert.ok(entries.length > 0, 'enumerateClaude should return entries after install');
    for (const { src, dest } of entries) {
      assert.equal(sha256(src), sha256(dest), `sha256 mismatch: ${src} -> ${dest}`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('enumerateOpencode src sha256 matches installed dest sha256', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-uninstall-'));
  try {
    installOpencode(tmpDir);
    const entries = enumerateOpencode(tmpDir);
    assert.ok(entries.length > 0, 'enumerateOpencode should return entries after install');
    for (const { src, dest } of entries) {
      assert.equal(sha256(src), sha256(dest), `sha256 mismatch: ${src} -> ${dest}`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('enumerateCopilot src sha256 matches installed dest sha256', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-uninstall-'));
  try {
    installCopilot(tmpDir, tmpDir, tmpDir, tmpDir);
    const entries = enumerateCopilot(tmpDir, tmpDir, tmpDir, tmpDir);
    assert.ok(entries.length > 0, 'enumerateCopilot should return entries after install');
    for (const { src, dest } of entries) {
      assert.equal(sha256(src), sha256(dest), `sha256 mismatch: ${src} -> ${dest}`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('buildDeletionSet excludes opencode.json/opencode.jsonc paths', () => {
  const entries = buildDeletionSet();
  const hasConfigPath = entries.some(e =>
    e.dest.endsWith('opencode.json') || e.dest.endsWith('opencode.jsonc')
  );
  assert.ok(!hasConfigPath, 'buildDeletionSet should not include opencode config paths');
});

test('enumerateClaude does not error with default paths (no manifest)', () => {
  assert.doesNotThrow(() => {
    const result = enumerateClaude();
    assert.ok(Array.isArray(result));
  });
});

test('enumerateOpencode does not error with default paths (no manifest)', () => {
  assert.doesNotThrow(() => {
    const result = enumerateOpencode();
    assert.ok(Array.isArray(result));
  });
});

test('enumerateCopilot does not error with default paths (no manifest)', () => {
  assert.doesNotThrow(() => {
    const result = enumerateCopilot();
    assert.ok(Array.isArray(result));
  });
});
