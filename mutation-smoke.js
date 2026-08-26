'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoRoot = __dirname;
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'shared-ai-mutation-smoke-'));
const reportPath = path.join(tempRoot, 'mutation.json');
const strykerPath = path.join(repoRoot, 'node_modules', '@stryker-mutator', 'core', 'bin', 'stryker.js');
const repositoryTempPath = path.join(repoRoot, '.stryker-tmp');
const repositoryReportPath = path.join(repoRoot, 'reports', 'mutation', 'smoke.json');
const repositoryTempExisted = fs.existsSync(repositoryTempPath);
const repositoryReportExisted = fs.existsSync(repositoryReportPath);

function runSmoke() {
  const childEnv = {
    ...process.env,
    SAI_MUTATION_REPORT: reportPath,
    SAI_MUTATION_TEMP: path.join(tempRoot, 'stryker-tmp'),
  };
  delete childEnv.NODE_TEST_CONTEXT;

  const result = childProcess.spawnSync(
    process.execPath,
    [strykerPath, 'run', 'test/fixtures/stryker-smoke.config.js'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 120000,
      env: childEnv,
    },
  );

  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  assert.equal(result.error, undefined, result.error && result.error.message);
  assert.equal(fs.existsSync(reportPath), true, 'Stryker should write its configured report');

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const mutants = Object.values(report.files || {}).flatMap(file => file.mutants || []);
  const nativeStatuses = new Set([
    'Killed', 'Survived', 'Timeout', 'NoCoverage', 'CompileError', 'RuntimeError', 'Ignored',
  ]);
  assert.ok(mutants.length > 0, 'Stryker should execute at least one real mutation');
  assert.ok(mutants.some(mutant => mutant.status === 'Killed'), 'the focused test should kill a mutation');
  assert.ok(mutants.every(mutant => nativeStatuses.has(mutant.status)),
    'every mutation must retain a recognized engine-native status');
  assert.equal(fs.existsSync(path.join(tempRoot, 'stryker-tmp')), false,
    'Stryker should clean its configured temporary workspace');
  assert.equal(fs.existsSync(repositoryTempPath), repositoryTempExisted,
    'the smoke run must not create a repository-local Stryker workspace');
  assert.equal(fs.existsSync(repositoryReportPath), repositoryReportExisted,
    'the smoke run must not write its report into the repository');
}

try {
  runSmoke();
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
  assert.equal(fs.existsSync(tempRoot), false, 'the smoke workspace should be removed after execution');
}
