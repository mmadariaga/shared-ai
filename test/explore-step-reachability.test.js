'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const explorerStepsDir = path.join(__dirname, '..', 'sai', 'commands', 'explore', 'steps');
const nucleusFile = path.join(__dirname, '..', 'sai', 'commands', 'explore', 'instructions.md');

function findFetchDirectives(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fetchRegex = /Fetch @sai\/commands\/explore\/steps\/([a-z-]+\.md)/g;
    const fetches = [];
    let match;
    while ((match = fetchRegex.exec(content)) !== null) {
      fetches.push(match[1]);
    }
    return fetches;
  } catch (err) {
    return [];
  }
}

function getReachableStepFiles() {
  const reachable = new Set();
  const toProcess = new Set();
  const filesBeingProcessed = new Set();

  // Start with the nucleus
  const nucleusFetches = findFetchDirectives(nucleusFile);
  nucleusFetches.forEach(file => {
    if (file.startsWith('..')) {
      // This is a relative path like ../../ which shouldn't happen for steps
      return;
    }
    toProcess.add(file);
  });

  // Process all reachable files
  while (toProcess.size > 0) {
    const file = [...toProcess][0];
    toProcess.delete(file);

    if (reachable.has(file) || filesBeingProcessed.has(file)) {
      continue;
    }

    filesBeingProcessed.add(file);
    const filePath = path.join(explorerStepsDir, file);

    const fetches = findFetchDirectives(filePath);
    fetches.forEach(fetchedFile => {
      if (!reachable.has(fetchedFile)) {
        toProcess.add(fetchedFile);
      }
    });

    reachable.add(file);
    filesBeingProcessed.delete(file);
  }

  return reachable;
}

function getAllStepFiles() {
  try {
    const files = fs.readdirSync(explorerStepsDir);
    return new Set(files.filter(f => f.endsWith('.md')));
  } catch (err) {
    return new Set();
  }
}

test('should have common.md reachable directly from nucleus', () => {
  const nucleusFetches = findFetchDirectives(nucleusFile);
  assert.ok(nucleusFetches.includes('common.md'),
    'common.md should be directly reachable from nucleus');
});

test('should have all step files reachable through fetch chain', () => {
  const allStepFiles = getAllStepFiles();
  const reachableFiles = getReachableStepFiles();

  const unreachableFiles = Array.from(allStepFiles)
    .filter(file => !reachableFiles.has(file))
    .sort();

  assert.deepEqual(unreachableFiles, [],
    `The following step files are unreachable through the fetch chain: ${unreachableFiles.join(', ')}`
  );
});

test('should have all reachable files present in steps directory', () => {
  const allStepFiles = getAllStepFiles();
  const reachableFiles = getReachableStepFiles();

  const missingFiles = Array.from(reachableFiles)
    .filter(file => !allStepFiles.has(file))
    .sort();

  assert.deepEqual(missingFiles, [],
    `The following fetched files are missing from the steps directory: ${missingFiles.join(', ')}`
  );
});
