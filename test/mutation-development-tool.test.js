'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const repoRoot = path.join(__dirname, '..');

function loadDefaultMutationConfig() {
  const configPath = require.resolve('../stryker.config.js');
  const previousScope = process.env.SAI_MUTATION_SCOPE;
  try {
    delete process.env.SAI_MUTATION_SCOPE;
    delete require.cache[configPath];
    return require(configPath);
  } finally {
    if (previousScope === undefined) delete process.env.SAI_MUTATION_SCOPE;
    else process.env.SAI_MUTATION_SCOPE = previousScope;
    delete require.cache[configPath];
  }
}

test('Stryker remains an independent deterministic development workflow', () => {
  const packageManifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const scopeBeforeDefaultLoad = process.env.SAI_MUTATION_SCOPE;
  const config = loadDefaultMutationConfig();
  assert.equal(process.env.SAI_MUTATION_SCOPE, scopeBeforeDefaultLoad);
  assert.equal(packageManifest.devDependencies['@stryker-mutator/core'], '8.7.1');
  assert.equal(packageManifest.scripts['test:mutation'], 'stryker run');
  assert.equal(config.testRunner, 'command');
  assert.equal(config.commandRunner.command, 'node --test');
  assert.deepEqual(config.mutate, ['bin/install.js']);
  assert.deepEqual(config.ignorePatterns, ['/.codegraph/**', '/.git/**']);
  assert.deepEqual(config.reporters, ['clear-text', 'json']);
  assert.equal(config.jsonReporter.fileName, 'reports/mutation/mutation.json');
  assert.equal(config.timeoutMS, 60000);
  assert.equal(config.concurrency, 1);
  assert.equal(config.cleanTempDir, 'always');
  const scoped = childProcess.spawnSync(process.execPath,
    ['-e', "process.stdout.write(JSON.stringify(require('./stryker.config.js').mutate))"], {
      cwd: repoRoot,
      env: { ...process.env, SAI_MUTATION_SCOPE: 'bin/install.js,bin/setup.js' },
      encoding: 'utf8',
    });
  assert.equal(scoped.status, 0, scoped.stderr);
  assert.deepEqual(JSON.parse(scoped.stdout), ['bin/install.js', 'bin/setup.js']);
  assert.match(fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8'), /reports\/mutation\//);
  assert.doesNotMatch(fs.readFileSync(path.join(repoRoot, 'stryker.config.js'), 'utf8'), /Review invocations/);
});

test('review-specific mutation smoke machinery is retired', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.equal(manifest.scripts['test:mutation:smoke'], undefined);
  for (const retired of ['mutation-smoke.js', 'test/fixtures/stryker-smoke.config.js',
    'test/fixtures/mutation-target.js', 'test/fixtures/mutation-target.test.js',
    'sai/commands/review/steps/resolve-mutation-analysis.md']) {
    assert.equal(fs.existsSync(path.join(repoRoot, retired)), false, `${retired} must stay retired`);
  }
});
