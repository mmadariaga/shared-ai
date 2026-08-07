'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { installProjection } = require('../bin/install-flow.js');

function captureOutput(fn) {
  const lines = [];
  const originalLog = console.log;
  const originalWrite = process.stdout.write;
  console.log = message => lines.push(String(message));
  process.stdout.write = (chunk, ...args) => {
    lines.push(String(chunk));
    return true;
  };
  try {
    fn();
  } finally {
    console.log = originalLog;
    process.stdout.write = originalWrite;
  }
  return lines;
}

function writeFixture(dir, sourceText, destText) {
  const sourcePath = path.join(dir, 'source.md');
  const destinationPath = path.join(dir, 'installed', 'wrapper.md');
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.writeFileSync(sourcePath, sourceText);
  fs.writeFileSync(destinationPath, destText);
  return { sourcePath, destinationPath };
}

test('divergent body produces a notice, not a throw', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-notice-'));
  try {
    const { sourcePath, destinationPath } = writeFixture(dir,
      '---\ndescription: Source command\nmodel: source-model\n---\n\nSource body.\n',
      '---\ndescription: Dest command\nmodel: tuned-model\n---\n\nDest body.\n');
    const projection = { strategy: 'tunable-seed', harness: 'claude', sourcePath, destinationPath };
    const printed = captureOutput(() => {
      assert.doesNotThrow(() => installProjection(projection, dir),
        'a divergent tunable-seed install should return normally');
    });
    assert.ok(printed.some(line => line.includes(destinationPath)),
      'a stdout notice should name the destination path when the body diverges');
    assert.ok(fs.readFileSync(destinationPath, 'utf8').includes('model: tuned-model'),
      'destination tunables should survive a divergent update');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('identical body produces no notice', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-quiet-'));
  try {
    const { sourcePath, destinationPath } = writeFixture(dir,
      '---\ndescription: Same\nmodel: source-model\n---\n\nbody\n',
      '---\ndescription: Same\nmodel: tuned-model\n---\n\nbody\n');
    const projection = { strategy: 'tunable-seed', harness: 'claude', sourcePath, destinationPath };
    const printed = captureOutput(() => installProjection(projection, dir));
    assert.ok(!printed.some(line => line.includes(destinationPath)),
      'no stdout notice should be printed when only tunables differ');
    const dest = fs.readFileSync(destinationPath, 'utf8');
    assert.ok(dest.includes('model: tuned-model'), 'the tunable pass should still apply');
    assert.ok(dest.includes('description: Same'), 'the body should match the source');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
