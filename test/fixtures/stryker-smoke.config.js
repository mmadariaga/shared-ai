'use strict';

const os = require('node:os');
const path = require('node:path');
const reportFile = process.env.SAI_MUTATION_REPORT || 'reports/mutation/smoke.json';
const tempDirName = process.env.SAI_MUTATION_TEMP
  || path.join(os.tmpdir(), 'shared-ai-mutation-smoke-stryker');

module.exports = {
  testRunner: 'command',
  commandRunner: {
    command: 'node --test test/fixtures/mutation-target.test.js',
  },
  mutate: ['test/fixtures/mutation-target.js'],
  reporters: ['json'],
  jsonReporter: {
    fileName: reportFile,
  },
  coverageAnalysis: 'off',
  timeoutMS: 60000,
  concurrency: 1,
  cleanTempDir: 'always',
  tempDirName,
};
