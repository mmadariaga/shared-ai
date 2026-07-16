'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const {
  deleteEntry,
  pruneEmptyDirs,
  runDeletion,
} = require('../bin/uninstall-flow.js');

function writeFile(dir, relPath, content) {
  const fullPath = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  return fullPath;
}

test('deleteEntry deletes file when dest hash matches src hash', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-'));
  try {
    const content = 'matching content';
    const srcPath = writeFile(tmpDir, 'canonical.txt', content);
    const destPath = writeFile(tmpDir, 'dest.txt', content);
    const result = deleteEntry({ src: srcPath, dest: destPath, editorBase: tmpDir });
    assert.equal(result, 'deleted');
    assert.equal(fs.existsSync(destPath), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('deleteEntry keeps file as kept-override when dest hash differs from src hash', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-'));
  try {
    const srcPath = writeFile(tmpDir, 'canonical.txt', 'canonical content');
    const destPath = writeFile(tmpDir, 'dest.txt', 'user modified content');
    const result = deleteEntry({ src: srcPath, dest: destPath, editorBase: tmpDir });
    assert.equal(result, 'kept-override');
    assert.equal(fs.existsSync(destPath), true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('deleteEntry returns not-found for missing destination without throwing', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-'));
  try {
    const srcPath = writeFile(tmpDir, 'canonical.txt', 'some content');
    const missingDest = path.join(tmpDir, 'does-not-exist.txt');
    assert.doesNotThrow(() => {
      const result = deleteEntry({ src: srcPath, dest: missingDest, editorBase: tmpDir });
      assert.equal(result, 'not-found');
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('pruneEmptyDirs removes empty parent directories walking upward to editorBase', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-'));
  try {
    const nestedDir = path.join(tmpDir, 'a', 'b', 'c');
    fs.mkdirSync(nestedDir, { recursive: true });
    const filePath = path.join(nestedDir, 'file.md');
    fs.writeFileSync(filePath, 'content');
    fs.unlinkSync(filePath);
    pruneEmptyDirs(nestedDir, tmpDir);
    assert.equal(fs.existsSync(path.join(tmpDir, 'a', 'b', 'c')), false,
      'deepest empty dir should be removed');
    assert.equal(fs.existsSync(path.join(tmpDir, 'a', 'b')), false,
      'intermediate empty dir should be removed');
    assert.equal(fs.existsSync(path.join(tmpDir, 'a')), false,
      'top-level empty dir should be removed');
    assert.equal(fs.existsSync(tmpDir), true,
      'editorBase should not be removed');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('pruneEmptyDirs preserves directory that still contains a kept override', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-'));
  try {
    const contentDir = path.join(tmpDir, 'a', 'b');
    fs.mkdirSync(contentDir, { recursive: true });
    writeFile(tmpDir, path.join('a', 'b', 'override.md'), 'kept override content');
    pruneEmptyDirs(contentDir, tmpDir);
    assert.equal(fs.existsSync(contentDir), true,
      'directory with kept override should be preserved');
    assert.equal(fs.existsSync(tmpDir), true,
      'editorBase should be preserved');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runDeletion on re-run with previously-deleted path raises no error and counts as not-found', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-'));
  try {
    const srcPath = writeFile(tmpDir, 'canonical.txt', 'content');
    const missingDest = path.join(tmpDir, 'already-deleted.txt');
    const plan = [
      { src: srcPath, dest: missingDest, editorBase: tmpDir, action: 'delete', exists: false, hashMatches: false },
    ];
    assert.doesNotThrow(() => {
      const result = runDeletion(plan);
      assert.equal(result.notFound, 1,
        'previously-deleted path should count as not-found');
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runDeletion returned counts equal observed deleted, kept-override, not-found tallies', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-'));
  try {
    const matchContent = 'matching content';
    const srcMatch = writeFile(tmpDir, 'src-match.txt', matchContent);
    const destMatch = writeFile(tmpDir, 'dest-match.txt', matchContent);
    const srcDiff = writeFile(tmpDir, 'src-diff.txt', 'canonical');
    const destDiff = writeFile(tmpDir, 'dest-diff.txt', 'user override');
    const srcMissing = writeFile(tmpDir, 'src-missing.txt', 'content');
    const missingDest = path.join(tmpDir, 'not-found.txt');
    const plan = [
      { src: srcMatch, dest: destMatch, editorBase: tmpDir },
      { src: srcDiff, dest: destDiff, editorBase: tmpDir },
      { src: srcMissing, dest: missingDest, editorBase: tmpDir },
    ];
    const result = runDeletion(plan);
    assert.equal(typeof result.deleted, 'number');
    assert.equal(typeof result.keptOverride, 'number');
    assert.equal(typeof result.notFound, 'number');
    assert.equal(result.deleted + result.keptOverride + result.notFound, plan.length,
      'sum of counts should equal plan length');
    assert.equal(result.deleted, 1,
      'one entry should be deleted (hash matches)');
    assert.equal(result.keptOverride, 1,
      'one entry should be kept as override (hash diverges)');
    assert.equal(result.notFound, 1,
      'one entry should be not-found (dest missing)');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
