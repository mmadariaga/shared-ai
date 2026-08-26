'use strict';

const defaultMutationScope = ['bin/install.js'];
const requestedMutationScope = typeof process.env.SAI_MUTATION_SCOPE === 'string'
  ? process.env.SAI_MUTATION_SCOPE.split(',').map(file => file.trim()).filter(Boolean)
  : [];

module.exports = {
  testRunner: 'command',
  commandRunner: {
    command: 'node --test',
  },
  // The CLI entrypoint is covered by black-box tests. The remaining package
  // modules are inspected as source text by contract tests, which makes
  // instrumenting them incompatible with the project's test stack.
  // Review invocations override this default with their exact diff-scoped
  // production paths through SAI_MUTATION_SCOPE or Stryker's --mutate flag.
  mutate: requestedMutationScope.length > 0 ? requestedMutationScope : defaultMutationScope,
  ignorePatterns: ['/.codegraph/**', '/.git/**'],
  reporters: ['clear-text', 'json'],
  jsonReporter: {
    fileName: 'reports/mutation/mutation.json',
  },
  coverageAnalysis: 'off',
  timeoutMS: 60000,
  concurrency: 1,
  cleanTempDir: 'always',
};
