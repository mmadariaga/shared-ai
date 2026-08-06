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
  return { base, sai: path.join(base, 'sai'), skills: path.join(base, 'skills') };
}

function retirementPaths(base) {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  return expandRetirementManifest(manifest, {
    harness: 'claude',
    repoRoot: path.join(__dirname, '..'),
    destinationRoot: { sai: path.join(base, 'sai'), skills: path.join(base, 'skills') },
  });
}

test('retirement cleanup treats an absent destination as a no-op', () => {
  const base = tempDir();
  try {
    const results = cleanupRetiredProjections('claude', roots(base));
    assert.equal(results.length, retirementPaths(base).length);
    assert.ok(results.every(result => result.action === 'not-found'));
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('retirement cleanup deletes matching bytes for every accepted historical worker digest', () => {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const retirements = manifest.retirements.filter(retirement => retirement.id.endsWith('-proxy-skill'));

  for (const retirement of retirements) {
    for (const acceptedHash of retirement.managedHashes) {
      const base = tempDir();
      try {
        const expanded = expandRetirementManifest(manifest, {
          harness: retirement.harnesses[0],
          repoRoot: path.join(__dirname, '..'),
          destinationRoot: { sai: path.join(base, 'sai'), skills: path.join(base, 'skills') },
        });
        const target = expanded.find(record => record.id === retirement.id);
        const bytes = Buffer.from(`historical bytes for ${acceptedHash}`);
        fs.mkdirSync(path.dirname(target.destinationPath), { recursive: true });
        fs.writeFileSync(target.destinationPath, bytes);

        const originalCreateHash = crypto.createHash;
        crypto.createHash = () => ({ update: () => ({ digest: () => acceptedHash }) });
        let results;
        try {
          results = cleanupRetiredProjections(retirement.harnesses[0], roots(base));
        } finally {
          crypto.createHash = originalCreateHash;
        }
        assert.equal(results.find(result => result.id === retirement.id).action, 'deleted',
          `${retirement.id} should delete digest ${acceptedHash}`);
        assert.equal(fs.existsSync(target.destinationPath), false);
      } finally {
        fs.rmSync(base, { recursive: true, force: true });
      }
    }
  }
});

test('retirement cleanup deletes a destination whose bytes match a registered hash', () => {
  const base = tempDir();
  try {
    const retirement = retirementPaths(base).find(record => record.id.endsWith('-proxy-skill'));
    assert.ok(retirement, 'a proxy retirement record should be available');
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
    const [modifiedRetirement, unknownRetirement] = retirementPaths(base)
      .filter(record => record.id.endsWith('-proxy-skill'));
    assert.ok(modifiedRetirement && unknownRetirement, 'two proxy retirement records should be available');
    const modifiedPath = modifiedRetirement.destinationPath;
    const unknownPath = unknownRetirement.destinationPath;
    const modifiedBytes = Buffer.from('user-modified loader bytes');
    const unknownBytes = Buffer.from('unrecognized loader bytes');
    fs.mkdirSync(path.dirname(modifiedPath), { recursive: true });
    fs.mkdirSync(path.dirname(unknownPath), { recursive: true });
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

test('retirement cleanup preserves unknown bytes for every former worker binding destination', () => {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const retirements = manifest.retirements.filter(retirement => retirement.id.endsWith('-proxy-skill'));
  const base = tempDir();
  try {
    const destinations = retirements.map(retirement => expandRetirementManifest(manifest, {
      harness: retirement.harnesses[0],
      repoRoot: path.join(__dirname, '..'),
       destinationRoot: { sai: path.join(base, 'sai'), skills: path.join(base, 'skills') },
    }).find(record => record.id === retirement.id));
    const bytes = Buffer.from('unrecognized worker binding bytes');
    for (const destination of destinations) {
      fs.mkdirSync(path.dirname(destination.destinationPath), { recursive: true });
      fs.writeFileSync(destination.destinationPath, bytes);
    }

    const results = [
      ...cleanupRetiredProjections('claude', roots(base)),
      ...cleanupRetiredProjections('opencode', roots(base)),
    ];
    for (const destination of destinations) {
      assert.equal(results.find(result => result.id === destination.id).action, 'preserved');
      assert.deepEqual(fs.readFileSync(destination.destinationPath), bytes);
    }
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

test('STEP1_RETIRE_INLINE: retired routed loaders use exact hashes and preserve modified copies', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const retiredLoaderPaths = [
    'commands/sai-2-design.md',
    'commands/sai-3-implement.md',
    'commands/sai-2-design-inline.md',
    'commands/sai-3-implement-inline.md',
    'compat/sai-2-design-core.md',
    'compat/sai-3-implementation-core.md',
    'compat/implement-invocation.md',
  ];
  const loaderRetirements = manifest.retirements.filter(retirement =>
    retiredLoaderPaths.includes(retirement.destination.path));
  assert.ok(loaderRetirements.length > 0, 'routed loader retirements should be declared');
  assert.ok(loaderRetirements.every(retirement =>
    retirement.harnesses.every(harness => ['claude', 'opencode'].includes(harness)) &&
    retirement.managedHashes.length > 0 &&
    retirement.managedHashes.every(value => /^[0-9a-f]{64}$/.test(value))));

  for (const retirement of loaderRetirements) {
    const base = tempDir();
    try {
      const expanded = expandRetirementManifest(manifest, {
        harness: retirement.harnesses[0],
        repoRoot,
        destinationRoot: { sai: path.join(base, 'sai'), skills: path.join(base, 'skills') },
      });
      const target = expanded.find(record => record.id === retirement.id);
      assert.ok(target, `${retirement.id} should expand for its owning harness`);
      fs.mkdirSync(path.dirname(target.destinationPath), { recursive: true });
      fs.writeFileSync(target.destinationPath, 'retired routed loader bytes');

      const originalCreateHash = crypto.createHash;
      crypto.createHash = () => ({ update: () => ({ digest: () => retirement.managedHashes[0] }) });
      try {
        assert.equal(cleanupRetiredProjections(retirement.harnesses[0], roots(base))
          .find(result => result.id === retirement.id).action, 'deleted');
      } finally {
        crypto.createHash = originalCreateHash;
      }
      assert.equal(fs.existsSync(target.destinationPath), false);

      fs.mkdirSync(path.dirname(target.destinationPath), { recursive: true });
      fs.writeFileSync(target.destinationPath, 'modified routed loader bytes');
      const result = cleanupRetiredProjections(retirement.harnesses[0], roots(base))
        .find(record => record.id === retirement.id);
      assert.equal(result.action, 'preserved');
      assert.equal(fs.readFileSync(target.destinationPath, 'utf8'), 'modified routed loader bytes');
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }
});
