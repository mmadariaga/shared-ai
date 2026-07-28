'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

const {
  computePlanEntry,
  deleteEntry,
  runDeletion,
} = require('../bin/uninstall-flow.js');

function writeFile(dir, name, content) {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function retirementEntry(src, dest, acceptedHashes, editorBase) {
  return { src, dest, acceptedHashes, editorBase };
}

test('computePlanEntry deletes a retirement destination matching any accepted hash', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-step-4-'));
  try {
    const retiredSource = writeFile(tmpDir, 'retired-source.txt', 'new source content');
    const destination = writeFile(tmpDir, 'destination.txt', 'previous released content');
    const acceptedHashes = [
      sha256('older released content'),
      sha256('previous released content'),
    ];

    const result = computePlanEntry(
      retirementEntry(retiredSource, destination, acceptedHashes, tmpDir)
    );

    assert.equal(result.action, 'delete');
    assert.equal(result.exists, true);
    assert.equal(result.hashMatches, true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('computePlanEntry preserves every retirement destination that matches no accepted hash', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-step-4-'));
  try {
    const retiredSource = writeFile(tmpDir, 'retired-source.txt', 'new source content');
    const destination = writeFile(tmpDir, 'destination.txt', 'user configuration');
    const acceptedHashes = [sha256('older released content')];

    const result = computePlanEntry(
      retirementEntry(retiredSource, destination, acceptedHashes, tmpDir)
    );

    assert.equal(result.action, 'keep-override');
    assert.equal(result.exists, true);
    assert.equal(result.hashMatches, false);
    assert.equal(fs.readFileSync(destination, 'utf8'), 'user configuration');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('deleteEntry treats an absent retirement destination as a no-op', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-step-4-'));
  try {
    const retiredSource = writeFile(tmpDir, 'retired-source.txt', 'new source content');
    const destination = path.join(tmpDir, 'already-absent.txt');

    assert.equal(
      deleteEntry(retirementEntry(retiredSource, destination, [sha256('released')], tmpDir)),
      'not-found'
    );
    assert.equal(fs.existsSync(destination), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runDeletion removes only matching retirement files and leaves unrelated configuration unchanged', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-step-4-'));
  try {
    const retiredSource = writeFile(tmpDir, 'retired-source.txt', 'new source content');
    const retiredDestination = writeFile(tmpDir, 'retired.md', 'released content');
    const userConfig = writeFile(tmpDir, 'opencode.json', '{"user":true}\n');
    const plan = [
      retirementEntry(retiredSource, retiredDestination, [sha256('released content')], tmpDir),
    ];

    const result = runDeletion(plan);

    assert.equal(result.deleted, 1);
    assert.equal(fs.existsSync(retiredDestination), false);
    assert.equal(fs.readFileSync(userConfig, 'utf8'), '{"user":true}\n');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
