'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { retireLegacyProjections } = require('../bin/install-retirement.js');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sai-retirement-step-3-'));
}

function hash(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function record(destinationPath, managedHashes) {
  return { id: 'retired-loader', destinationPath, managedHashes };
}

test('retirement cleanup treats an absent destination as a no-op', () => {
  const base = tempDir();
  try {
    const destinationPath = path.join(base, 'missing-loader.md');
    assert.deepEqual(
      retireLegacyProjections([record(destinationPath, [hash(Buffer.from('managed'))])]),
      { deleted: 0, preserved: 0, absent: 1 }
    );
    assert.equal(fs.existsSync(destinationPath), false);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('retirement cleanup deletes a destination whose bytes match a registered hash', () => {
  const base = tempDir();
  try {
    const bytes = Buffer.from('managed loader bytes');
    const destinationPath = path.join(base, 'loader.md');
    fs.writeFileSync(destinationPath, bytes);

    assert.deepEqual(
      retireLegacyProjections([record(destinationPath, [hash(bytes)])]),
      { deleted: 1, preserved: 0, absent: 0 }
    );
    assert.equal(fs.existsSync(destinationPath), false);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('retirement cleanup preserves modified and unknown destination bytes', () => {
  const base = tempDir();
  try {
    const registered = Buffer.from('registered loader bytes');
    const modifiedPath = path.join(base, 'modified-loader.md');
    const unknownPath = path.join(base, 'unknown-loader.md');
    const modifiedBytes = Buffer.from('user-modified loader bytes');
    const unknownBytes = Buffer.from('unrecognized loader bytes');
    fs.writeFileSync(modifiedPath, modifiedBytes);
    fs.writeFileSync(unknownPath, unknownBytes);

    assert.deepEqual(
      retireLegacyProjections([
        record(modifiedPath, [hash(registered)]),
        record(unknownPath, [hash(registered)]),
      ]),
      { deleted: 0, preserved: 2, absent: 0 }
    );
    assert.deepEqual(fs.readFileSync(modifiedPath), modifiedBytes);
    assert.deepEqual(fs.readFileSync(unknownPath), unknownBytes);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});
