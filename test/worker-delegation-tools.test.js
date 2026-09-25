'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { loadInstallManifest } = require('../bin/install-manifest.js');
const { defineWorkerMatrix } = require('../bin/worker-matrix.js');

const REPO_ROOT = path.join(__dirname, '..');

// A delegating load is a Fetch line naming one of the budget skills; a prose
// mention of budget-explorer without Fetch does not count.
const BUDGET_FETCH = /\bFetch\b.*@skills\/budget(?:-explorer|-executor|-subagent)?\/SKILL\.md/;
const SAI_FETCH = /\bFetch\b[^@\n]*@(sai\/[^\s`'")]+)/g;

function readSource(relativePath) {
  const absolute = path.join(REPO_ROOT, relativePath);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return null;
  return fs.readFileSync(absolute, 'utf8');
}

function fetchClosure(startPath) {
  const visited = new Set();
  const queue = [startPath];
  const files = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    const content = readSource(current);
    // Targets absent from source (install-generated bindings) are skipped.
    if (content === null) continue;
    files.push({ file: current, content });
    for (const line of content.split(/\r?\n/)) {
      for (const match of line.matchAll(SAI_FETCH)) {
        queue.push(match[1].replace(/[.,;:]+$/, ''));
      }
    }
  }
  return files;
}

function stepFiles(workerContract) {
  const stepsDir = path.posix.join(path.posix.dirname(workerContract), 'steps');
  const absolute = path.join(REPO_ROOT, stepsDir);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isDirectory()) return [];
  return fs.readdirSync(absolute)
    .filter(name => name.endsWith('.md'))
    .sort()
    .map(name => path.posix.join(stepsDir, name));
}

function delegationSource(entry) {
  const scanned = fetchClosure(entry.workerContract);
  const seen = new Set(scanned.map(item => item.file));
  for (const file of stepFiles(entry.workerContract)) {
    if (seen.has(file)) continue;
    seen.add(file);
    const content = readSource(file);
    if (content !== null) scanned.push({ file, content });
  }
  for (const { file, content } of scanned) {
    if (content.split(/\r?\n/).some(line => BUDGET_FETCH.test(line))) return file;
  }
  return null;
}

function workerEntries() {
  const manifest = loadInstallManifest(REPO_ROOT);
  return defineWorkerMatrix(manifest['worker-matrix'].entries).entries;
}

test('budget fetch detection ignores prose mentions', () => {
  assert.equal(BUDGET_FETCH.test('Fetch @skills/budget/SKILL.md'), true);
  assert.equal(BUDGET_FETCH.test('Fetch @skills/budget-explorer/SKILL.md'), true);
  assert.equal(BUDGET_FETCH.test('Fetch @skills/budget-executor/SKILL.md'), true);
  assert.equal(BUDGET_FETCH.test('Fetch @skills/budget-subagent/SKILL.md'), true);
  assert.equal(BUDGET_FETCH.test('Dispatch a budget-explorer subagent for conflict scanning.'), false);
  assert.equal(BUDGET_FETCH.test('The @skills/budget/SKILL.md load lives in the worker card.'), false);
});

test('every worker that delegates to a budget subagent carries dispatch capability on both harnesses', () => {
  const delegating = [];
  for (const entry of workerEntries()) {
    const source = delegationSource(entry);
    if (source === null) continue;
    delegating.push(entry.workerName);

    const tools = entry.claudeAgent.tools.split(',').map(tool => tool.trim());
    assert.ok(
      tools.includes('Agent'),
      `${entry.workerName} loads a budget skill (Fetch in ${source}) but claudeAgent.tools lacks Agent`,
    );

    const permissionLines = entry.opencodeAgent.permissionBlock.split(/\r?\n/).map(line => line.trim());
    for (const required of ['budget: allow', 'explore: allow']) {
      assert.ok(
        permissionLines.includes(required),
        `${entry.workerName} loads a budget skill (Fetch in ${source}) but opencodeAgent.permissionBlock lacks "${required}"`,
      );
    }
  }

  assert.ok(delegating.length > 0, 'expected at least one delegating worker');
  assert.ok(
    delegating.includes('sai-backfill-worker'),
    `expected sai-backfill-worker among delegating workers; found ${delegating.join(', ')}`,
  );
});
