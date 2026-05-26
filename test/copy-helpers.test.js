'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { copy, copyWithWarn, copySkipIfExists, listMdFiles } = require('../bin/install-flow.js');

test('copy overwrites existing file', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-test-'));
  const src = path.join(tmpDir, 'src.txt');
  const dest = path.join(tmpDir, 'dest.txt');
  fs.writeFileSync(src, 'new content');
  fs.writeFileSync(dest, 'old content');
  copy(src, dest);
  assert.equal(fs.readFileSync(dest, 'utf8'), 'new content');
  fs.rmSync(tmpDir, { recursive: true });
});

test('copy creates missing parent dirs', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-test-'));
  const src = path.join(tmpDir, 'src.txt');
  const dest = path.join(tmpDir, 'a', 'b', 'dest.txt');
  fs.writeFileSync(src, 'hello');
  copy(src, dest);
  assert.ok(fs.existsSync(dest), 'dest should exist after copy');
  fs.rmSync(tmpDir, { recursive: true });
});

test('copyWithWarn prints Overwriting and copies file', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-test-'));
  const src = path.join(tmpDir, 'src.txt');
  const dest = path.join(tmpDir, 'dest.txt');
  fs.writeFileSync(src, 'new content');
  fs.writeFileSync(dest, 'old content');
  let printed = '';
  const origLog = console.log;
  console.log = (msg) => { printed += String(msg); };
  copyWithWarn(src, dest);
  console.log = origLog;
  assert.ok(printed.startsWith('Overwriting'), `expected "Overwriting..." but got "${printed}"`);
  assert.ok(fs.existsSync(dest), 'dest should exist after copyWithWarn');
  assert.equal(fs.readFileSync(dest, 'utf8'), 'new content');
  fs.rmSync(tmpDir, { recursive: true });
});

test('copySkipIfExists does not overwrite when dest exists', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-test-'));
  const src = path.join(tmpDir, 'src.txt');
  const dest = path.join(tmpDir, 'dest.txt');
  fs.writeFileSync(src, 'new content');
  fs.writeFileSync(dest, 'old content');
  copySkipIfExists(src, dest);
  assert.equal(fs.readFileSync(dest, 'utf8'), 'old content');
  fs.rmSync(tmpDir, { recursive: true });
});

test('copySkipIfExists prints skip message when dest exists', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-test-'));
  const src = path.join(tmpDir, 'src.txt');
  const dest = path.join(tmpDir, 'dest.txt');
  fs.writeFileSync(src, 'new content');
  fs.writeFileSync(dest, 'old content');
  let printed = '';
  const origLog = console.log;
  console.log = (msg) => { printed += String(msg); };
  copySkipIfExists(src, dest);
  console.log = origLog;
  assert.ok(printed.startsWith('Skipping'), `expected "Skipping..." but got "${printed}"`);
  fs.rmSync(tmpDir, { recursive: true });
});

test('copySkipIfExists copies when dest does not exist', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-test-'));
  const src = path.join(tmpDir, 'src.txt');
  const dest = path.join(tmpDir, 'dest.txt');
  fs.writeFileSync(src, 'hello');
  copySkipIfExists(src, dest);
  assert.equal(fs.readFileSync(dest, 'utf8'), 'hello');
  fs.rmSync(tmpDir, { recursive: true });
});

test('listMdFiles returns .md files with full paths, excludes non-.md', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-test-'));
  fs.writeFileSync(path.join(tmpDir, 'a.md'), '');
  fs.writeFileSync(path.join(tmpDir, 'b.md'), '');
  fs.writeFileSync(path.join(tmpDir, 'c.txt'), '');
  const result = listMdFiles(tmpDir);
  assert.ok(result.length >= 2, `expected >= 2 .md files, got ${result.length}`);
  assert.ok(result.some(f => f.endsWith('a.md')), 'should include a.md');
  assert.ok(!result.some(f => f.endsWith('c.txt')), 'should not include c.txt');
  fs.rmSync(tmpDir, { recursive: true });
});
