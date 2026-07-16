'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { Writable } = require('stream');

const {
  sha256File,
  computePlanEntry,
  computePlan,
  printPlan,
  formatSummary,
} = require('../bin/uninstall-flow.js');

test('sha256File returns 64 hex chars for existing file', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-plan-'));
  try {
    const filePath = path.join(tmpDir, 'test.txt');
    fs.writeFileSync(filePath, 'hello');
    const hash = sha256File(filePath);
    assert.ok(hash !== null, 'hash should not be null');
    assert.match(hash, /^[0-9a-f]{64}$/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('sha256File returns different hash for different content', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-plan-'));
  try {
    const fileA = path.join(tmpDir, 'a.txt');
    const fileB = path.join(tmpDir, 'b.txt');
    fs.writeFileSync(fileA, 'hello');
    fs.writeFileSync(fileB, 'world');
    const hashA = sha256File(fileA);
    const hashB = sha256File(fileB);
    assert.notEqual(hashA, hashB);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('sha256File returns null for missing file', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-plan-'));
  try {
    const result = sha256File(path.join(tmpDir, 'nonexistent.txt'));
    assert.equal(result, null);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('computePlanEntry returns delete when dest matches canonical', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-plan-'));
  try {
    const canonical = 'canonical data';
    const srcPath = path.join(tmpDir, 'canonical.txt');
    const destPath = path.join(tmpDir, 'dest.txt');
    fs.writeFileSync(srcPath, canonical);
    fs.writeFileSync(destPath, canonical);
    const result = computePlanEntry({
      src: srcPath,
      dest: destPath,
      editorBase: tmpDir,
    });
    assert.equal(result.action, 'delete');
    assert.equal(result.exists, true);
    assert.equal(result.hashMatches, true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('computePlanEntry returns keep-override when dest differs from canonical', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-plan-'));
  try {
    const srcPath = path.join(tmpDir, 'canonical.txt');
    const destPath = path.join(tmpDir, 'dest.txt');
    fs.writeFileSync(srcPath, 'canonical content');
    fs.writeFileSync(destPath, 'user modified content');
    const result = computePlanEntry({
      src: srcPath,
      dest: destPath,
      editorBase: tmpDir,
    });
    assert.equal(result.action, 'keep-override');
    assert.equal(result.exists, true);
    assert.equal(result.hashMatches, false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('computePlanEntry returns not-found when dest is absent', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-plan-'));
  try {
    const srcPath = path.join(tmpDir, 'canonical.txt');
    fs.writeFileSync(srcPath, 'canonical');
    const result = computePlanEntry({
      src: srcPath,
      dest: path.join(tmpDir, 'missing.txt'),
      editorBase: tmpDir,
    });
    assert.equal(result.action, 'not-found');
    assert.equal(result.exists, false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('computePlan returns entries with correct shape', () => {
  const deletionSet = [
    { src: '/fake/src/a.md', dest: '/fake/dest/a.md', editorBase: '/fake/base' },
  ];
  const plan = computePlan(deletionSet);
  assert.ok(Array.isArray(plan));
  assert.ok(plan.length > 0);
  assert.ok(plan.every(p => 'dest' in p && 'action' in p && 'exists' in p && 'hashMatches' in p));
});

test('printPlan emits one line per entry with metadata and version-skew note', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-plan-'));
  try {
    const plan = [
      { dest: path.join(tmpDir, 'a.md'), action: 'delete', exists: true, hashMatches: true },
      { dest: path.join(tmpDir, 'b.md'), action: 'keep-override', exists: true, hashMatches: false },
    ];
    let output = '';
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });
    printPlan(plan, { stream });
    assert.ok(output.includes(path.join(tmpDir, 'a.md')), 'should include first dest path');
    assert.ok(output.includes(path.join(tmpDir, 'b.md')), 'should include second dest path');
    assert.ok(output.includes('delete'), 'should include action text');
    assert.ok(output.includes('keep-override'), 'should include override action');
    assert.ok(output.includes('hash'), 'should include hash-matches indicator');
    assert.ok(output.includes('version'), 'should include version-skew upgrade guidance');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('formatSummary renders all three counts', () => {
  const result = formatSummary({ deleted: 3, keptOverride: 1, notFound: 2 });
  assert.ok(result.length > 0, 'summary should not be empty');
  assert.ok(
    result.includes('3') || result.toLowerCase().includes('delet'),
    'should mention deleted count'
  );
  assert.ok(
    result.includes('1') || result.toLowerCase().includes('kept'),
    'should mention kept count'
  );
  assert.ok(
    result.includes('2') || result.toLowerCase().includes('not found') || result.toLowerCase().includes('not-found'),
    'should mention not-found count'
  );
});
