'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const Module = require('module');

const flow = require('../bin/install-flow.js');

const stripTunableLines = text => text.split('\n')
  .filter(line => !/^(model|effort|variant):/.test(line))
  .join('\n');

function lineIndexOf(text, needle) {
  return text.split('\n').findIndex(line => line.includes(needle));
}

function writeFixture(dir, sourceText, destText) {
  const sourcePath = path.join(dir, 'source.md');
  const destinationPath = path.join(dir, 'installed', 'wrapper.md');
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.writeFileSync(sourcePath, sourceText);
  fs.writeFileSync(destinationPath, destText);
  return { sourcePath, destinationPath };
}

function installTunableSeed(dir, sourceText, destText, harness = 'claude') {
  const { sourcePath, destinationPath } = writeFixture(dir, sourceText, destText);
  const projection = { strategy: 'tunable-seed', harness, sourcePath, destinationPath };
  assert.doesNotThrow(() => flow.installProjection(projection, dir));
  return fs.readFileSync(destinationPath, 'utf8');
}

test('CLAUDE_TUNABLE_KEYS and OPENCODE_TUNABLE_KEYS declare the harness tunable sets', () => {
  assert.deepEqual(flow.CLAUDE_TUNABLE_KEYS, ['model', 'effort']);
  assert.deepEqual(flow.OPENCODE_TUNABLE_KEYS, ['model', 'variant']);
});

test('first install writes source verbatim', () => {
  assert.equal(typeof flow.tunableSeedInstaller, 'function',
    'tunableSeedInstaller should be exported');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-first-'));
  try {
    const sourcePath = path.join(dir, 'source.md');
    const destinationPath = path.join(dir, 'installed', 'wrapper.md');
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    const sourceText = '---\ndescription: Test\neffort: tuned-effort\nmodel: tuned-model\n---\n\nbody\n';
    fs.writeFileSync(sourcePath, sourceText);
    const projection = { strategy: 'tunable-seed', harness: 'claude', sourcePath, destinationPath };
    const result = flow.tunableSeedInstaller(projection);
    assert.ok(['created', 'reused', 'overwritten'].includes(result),
      'tunableSeedInstaller should report one of created, reused, overwritten');
    assert.equal(fs.readFileSync(destinationPath, 'utf8'), sourceText,
      'an absent destination should receive the source bytes verbatim');
    const effortIndex = lineIndexOf(sourceText, 'effort: tuned-effort');
    const modelIndex = lineIndexOf(sourceText, 'model: tuned-model');
    assert.ok(effortIndex > -1 && modelIndex > -1 && effortIndex < modelIndex,
      'tunable lines should be the source tunable lines in source order');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('body and non-tunable frontmatter are overwritten', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-overwrite-'));
  try {
    const source = '---\ndescription: Source command\nmodel: source-model\neffort: source-effort\n---\n\nSource body.\n';
    const dest = installTunableSeed(dir, source,
      '---\ndescription: Dest command\nmodel: tuned-model\neffort: tuned-effort\n---\n\nDest body.\n');
    assert.equal(stripTunableLines(dest), stripTunableLines(source),
      'body and non-tunable frontmatter should match the source after the tunable pass');
    assert.ok(dest.includes('model: tuned-model') && dest.includes('effort: tuned-effort'),
      'destination tunable lines should retain their pre-install values');
    assert.ok(!dest.includes('model: source-model') && !dest.includes('effort: source-effort'),
      'source tunable values should not overwrite destination tunables');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('source gains a non-tunable key and the destination tunable stays top-level', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-gain-'));
  try {
    const dest = installTunableSeed(dir,
      '---\ndescription: Test\ndescription_priority: override\npermission:\n  task:\n    "*": deny\n---\n\nbody\n',
      '---\ndescription: Test\nmodel: tuned-model\npermission:\n  task:\n    "*": deny\n---\n\nbody\n');
    assert.ok(dest.includes('description_priority: override'),
      'a source non-tunable key should be projected into the destination');
    const modelIndex = lineIndexOf(dest, 'model: tuned-model');
    const permissionIndex = lineIndexOf(dest, 'permission:');
    const priorityIndex = lineIndexOf(dest, 'description_priority: override');
    assert.ok(modelIndex > -1, 'the destination tunable line should be present');
    assert.ok(permissionIndex > -1 && priorityIndex > -1 &&
      modelIndex > priorityIndex && modelIndex < permissionIndex,
      'the model line should follow the last top-level scalar and precede the first nested block');
    assert.doesNotMatch(dest.split('\n').slice(permissionIndex + 1).join('\n'), /^model:/m,
      'no model line should appear inside the permission block');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('source loses a non-tunable key and the destination tunable stays top-level', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-lose-'));
  try {
    const dest = installTunableSeed(dir,
      '---\ndescription: Test\npermission:\n  edit: allow\n---\n\nbody\n',
      '---\ndescription: Test\neffort: tuned-effort\ndescription_priority: stale\npermission:\n  edit: allow\n---\n\nbody\n');
    assert.ok(!dest.includes('description_priority'),
      'a non-tunable key absent from the source should be removed from the destination');
    const effortIndex = lineIndexOf(dest, 'effort: tuned-effort');
    const permissionIndex = lineIndexOf(dest, 'permission:');
    const descriptionIndex = lineIndexOf(dest, 'description: Test');
    assert.ok(effortIndex > -1 && permissionIndex > -1 && descriptionIndex > -1 &&
      effortIndex > descriptionIndex && effortIndex < permissionIndex,
      'the effort line should follow the last top-level scalar and precede the first nested block');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('destination tunable is never emitted inside the permission block', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-permission-'));
  try {
    const dest = installTunableSeed(dir,
      '---\ndescription: Test\npermission:\n  edit: "**"\n  task:\n    "*": deny\n---\n\nbody\n',
      '---\ndescription: Test\nmodel: tuned-model\npermission:\n  edit: "**"\n  task:\n    "*": deny\n---\n\nbody\n',
      'opencode');
    const modelIndex = lineIndexOf(dest, 'model: tuned-model');
    const permissionIndex = lineIndexOf(dest, 'permission:');
    assert.ok(modelIndex > -1, 'the destination model line should be present');
    assert.ok(permissionIndex > -1 && modelIndex < permissionIndex,
      'the model line should sit above the permission block');
    assert.doesNotMatch(dest.split('\n').slice(permissionIndex + 1).join('\n'), /^\s*model:/m,
      'no model line should appear inside the permission block');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('tunable lines appear in source order with destination values', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-order-'));
  try {
    const dest = installTunableSeed(dir,
      '---\ndescription: Test\nmodel: source-model\neffort: source-effort\n---\n\nbody\n',
      '---\ndescription: Test\neffort: tuned-effort\nmodel: tuned-model\n---\n\nbody\n');
    const modelIndex = lineIndexOf(dest, 'model: tuned-model');
    const effortIndex = lineIndexOf(dest, 'effort: tuned-effort');
    assert.ok(modelIndex > -1 && effortIndex > -1 && modelIndex < effortIndex,
      'destination tunable lines should appear in source order with destination values');
    assert.ok(!dest.includes('model: source-model') && !dest.includes('effort: source-effort'),
      'source tunable values should be replaced by the destination values');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a destination tunable with no source counterpart is preserved', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-preserve-'));
  try {
    const dest = installTunableSeed(dir,
      '---\ndescription: Test\nmodel: source-model\n---\n\nbody\n',
      '---\ndescription: Test\nmodel: tuned-model\neffort: tuned-effort\n---\n\nbody\n');
    assert.ok(dest.includes('effort: tuned-effort'),
      'a destination tunable without a source counterpart should be preserved');
    assert.ok(dest.includes('model: tuned-model'),
      'a destination tunable with a source counterpart should keep its value');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('an absent tunable stays absent', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-absent-'));
  try {
    const dest = installTunableSeed(dir,
      '---\ndescription: Test\nmodel: source-model\neffort: source-effort\n---\n\nbody\n',
      '---\ndescription: Test\n---\n\nbody\n');
    assert.doesNotMatch(dest, /^model:/m, 'model should not be re-seeded into the destination');
    assert.doesNotMatch(dest, /^effort:/m, 'effort should not be re-seeded into the destination');
    assert.ok(dest.includes('description: Test'), 'the destination frontmatter should remain intact');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a non-tunable destination line is overwritten', () => {
  assert.equal(typeof flow.tunableSeedInstaller, 'function',
    'tunableSeedInstaller should be exported');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-nontunable-'));
  try {
    const dest = installTunableSeed(dir,
      '---\ndescription: New description\n---\n\nbody\n',
      '---\ndescription: Old description\n---\n\nbody\n');
    assert.ok(dest.includes('description: New description'),
      'a non-tunable destination line should be replaced with the source line');
    assert.ok(!dest.includes('Old description'),
      'the old non-tunable value should not survive');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('extraction does not require a YAML library', () => {
  assert.equal(typeof flow.tunableSeedInstaller, 'function',
    'tunableSeedInstaller should be exported');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-yaml-'));
  try {
    const { sourcePath, destinationPath } = writeFixture(dir,
      '---\ndescription: Test\nmodel: source-model\n---\n\nbody\n',
      '---\ndescription: Test\nmodel: tuned-model\n---\n\nbody\n');
    const projection = { strategy: 'tunable-seed', harness: 'claude', sourcePath, destinationPath };
    const originalLoad = Module._load;
    const requested = [];
    Module._load = function (request, parent, isMain) {
      requested.push(request);
      return originalLoad.call(this, request, parent, isMain);
    };
    try {
      flow.tunableSeedInstaller(projection);
    } finally {
      Module._load = originalLoad;
    }
    assert.ok(!requested.some(name => /yaml/i.test(name)),
      'the tunable extraction path must not require a YAML parser');
    assert.ok(fs.readFileSync(destinationPath, 'utf8').includes('model: tuned-model'),
      'the tunable pass should still apply');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
