'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const saiRoot = path.join(repoRoot, 'sai');
const ALLOWLIST = new Set();

function markdownFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(absolute);
    return entry.isFile() && entry.name.endsWith('.md') ? [absolute] : [];
  });
}

test('sai markdown contains no replacement-character mojibake', () => {
  const matches = [];
  for (const filePath of markdownFiles(saiRoot)) {
    const relativePath = path.relative(repoRoot, filePath).split(path.sep).join('/');
    const content = fs.readFileSync(filePath, 'utf8');
    for (const [index, line] of content.split(/\r?\n/).entries()) {
      if (line.includes(' ? ') && !ALLOWLIST.has(`${relativePath}:${index + 1}`)) {
        matches.push(`${relativePath}:${index + 1}`);
      }
    }
  }
  assert.deepEqual(matches, [], 'restore em dashes instead of retaining mojibake replacement text');
});
