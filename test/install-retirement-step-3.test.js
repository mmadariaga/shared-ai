'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { cleanupRetiredProjections } = require('../bin/install-flow.js');
const { loadInstallManifest, expandRetirementManifest } = require('../bin/install-manifest.js');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sai-retirement-step-3-'));
}

function hash(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function roots(base) {
  return { base };
}

function retirementPaths(base) {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  return expandRetirementManifest(manifest, {
    harness: 'claude',
    repoRoot: path.join(__dirname, '..'),
    destinationRoot: { sai: path.join(base, 'sai') },
  });
}

test('retirement cleanup treats an absent destination as a no-op', () => {
  const base = tempDir();
  try {
    const results = cleanupRetiredProjections('claude', roots(base));
    assert.equal(results.length, 7);
    assert.ok(results.every(result => result.action === 'not-found'));
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('retirement cleanup deletes a destination whose bytes match a registered hash', () => {
  const base = tempDir();
  try {
    const [retirement] = retirementPaths(base);
    const bytes = Buffer.from('managed loader bytes');
    const destinationPath = retirement.destinationPath;
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.writeFileSync(destinationPath, bytes);

    const originalCreateHash = crypto.createHash;
    crypto.createHash = () => ({ update: () => ({ digest: () => retirement.managedHashes[0] }) });
    let results;
    try {
      results = cleanupRetiredProjections('claude', roots(base));
    } finally {
      crypto.createHash = originalCreateHash;
    }
    assert.equal(results.find(result => result.id === retirement.id).action, 'deleted');
    assert.equal(fs.existsSync(destinationPath), false);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('retirement cleanup preserves modified and unknown destination bytes', () => {
  const base = tempDir();
  try {
    const [modifiedRetirement, unknownRetirement] = retirementPaths(base);
    const modifiedPath = modifiedRetirement.destinationPath;
    const unknownPath = unknownRetirement.destinationPath;
    const modifiedBytes = Buffer.from('user-modified loader bytes');
    const unknownBytes = Buffer.from('unrecognized loader bytes');
    fs.mkdirSync(path.dirname(modifiedPath), { recursive: true });
    fs.writeFileSync(modifiedPath, modifiedBytes);
    fs.writeFileSync(unknownPath, unknownBytes);

    const results = cleanupRetiredProjections('claude', roots(base));
    assert.equal(results.find(result => result.id === modifiedRetirement.id).action, 'preserved');
    assert.equal(results.find(result => result.id === unknownRetirement.id).action, 'preserved');
    assert.deepEqual(fs.readFileSync(modifiedPath), modifiedBytes);
    assert.deepEqual(fs.readFileSync(unknownPath), unknownBytes);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('ADR template retirement cleanup deletes a former compatibility copy for each accepted hash', () => {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const acceptedHashes = manifest.retirements.find(retirement => retirement.id === 'retired-adr-index-template').managedHashes;

  for (const acceptedHash of acceptedHashes) {
    const base = tempDir();
    try {
      const retirement = retirementPaths(base).find(record => record.id === 'retired-adr-index-template');
      const destinationPath = retirement.destinationPath;
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.writeFileSync(destinationPath, Buffer.from(`historical ADR template ${acceptedHash}`));

      const originalCreateHash = crypto.createHash;
      crypto.createHash = () => ({ update: () => ({ digest: () => acceptedHash }) });
      let results;
      try {
        results = cleanupRetiredProjections('claude', roots(base));
      } finally {
        crypto.createHash = originalCreateHash;
      }

      assert.equal(results.find(result => result.id === 'retired-adr-index-template').action, 'deleted');
      assert.equal(fs.existsSync(destinationPath), false);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }
});

test('ADR template retirement cleanup preserves a modified former compatibility copy', () => {
  const base = tempDir();
  try {
    const retirement = retirementPaths(base).find(record => record.id === 'retired-adr-index-template');
    const destinationPath = retirement.destinationPath;
    const bytes = Buffer.from('modified ADR template bytes');
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.writeFileSync(destinationPath, bytes);

    const results = cleanupRetiredProjections('claude', roots(base));
    assert.equal(results.find(result => result.id === 'retired-adr-index-template').action, 'preserved');
    assert.deepEqual(fs.readFileSync(destinationPath), bytes);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('ADR template retirement cleanup preserves an unrecognized former compatibility copy', () => {
  const base = tempDir();
  try {
    const retirement = retirementPaths(base).find(record => record.id === 'retired-adr-index-template');
    const destinationPath = retirement.destinationPath;
    const bytes = Buffer.from('unrecognized ADR template bytes');
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.writeFileSync(destinationPath, bytes);

    const results = cleanupRetiredProjections('claude', roots(base));
    assert.equal(results.find(result => result.id === 'retired-adr-index-template').action, 'preserved');
    assert.deepEqual(fs.readFileSync(destinationPath), bytes);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});
