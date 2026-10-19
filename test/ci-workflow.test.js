'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/ci.yml'), 'utf8');

test('CI checks main and v0.9-beta pull requests and main pushes without documentation filters or write access', () => {
  assert.match(workflow, /pull_request:\s+branches: \[main, v0\.9-beta\]/);
  assert.match(workflow, /push:\s+branches: \[main\]/);
  assert.doesNotMatch(workflow, /paths(?:-ignore)?:|pull_request_target|secrets\.|cache:|upload-artifact/);
  assert.match(workflow, /permissions:\s+contents: read/);
  assert.equal((workflow.match(/persist-credentials: false/g) || []).length, 2);
});

test('CI keeps both Node 22 platforms, interpreter preflight, tests, and package verification', () => {
  assert.match(workflow, /fail-fast: false/);
  assert.match(workflow, /os: \[ubuntu-latest, windows-latest\]/);
  assert.equal((workflow.match(/node-version: '22'/g) || []).length, 2);
  assert.match(workflow, /bash --noprofile --norc -c 'exit 0'/);
  assert.match(workflow, /pwsh -NoProfile -NonInteractive -Command .*PSVersion\.Major -lt 7/);
  assert.match(workflow, /- run: npm ci\s+- run: npm test/);
  assert.match(workflow, /npm pack --dry-run --json \| node \.github\/scripts\/verify-package\.cjs/);
});

test('CI provisions the required private OpenCode temporary root on Linux before tests', () => {
  const setup = "- name: Prepare Linux temporary root for OpenCode tests\n        if: runner.os == 'Linux'\n        run: mkdir -m 700 /tmp/opencode";
  assert.ok(workflow.includes(setup));
  assert.ok(workflow.indexOf(setup) < workflow.indexOf('- run: npm test'));
});

test('CI Required runs after all prerequisites and rejects every non-success result', () => {
  assert.match(workflow, /name: CI Required\s+if: \$\{\{ always\(\) \}\}\s+needs: \[tests, package\]/);
  assert.match(workflow, /TEST_RESULT: \$\{\{ needs\.tests\.result \}\}/);
  assert.match(workflow, /PACKAGE_RESULT: \$\{\{ needs\.package\.result \}\}/);
  const gate = workflow.match(/test "\$TEST_RESULT" = success && test "\$PACKAGE_RESULT" = success/);
  assert.ok(gate);
  const probe = spawnSync('bash', ['--noprofile', '--norc', '-c', 'exit 0']);
  if (probe.error || probe.status !== 0) {
    // Workflow preflight fails visibly when Bash is absent; this structural
    // test still checks the exact fail-closed expression in that environment.
    return;
  }
  for (const tests of ['success', 'failure', 'cancelled', 'skipped', '']) {
    for (const pkg of ['success', 'failure', 'cancelled', 'skipped', '']) {
      const result = spawnSync('bash', ['--noprofile', '--norc', '-c', gate[0]], {
        env: { ...process.env, TEST_RESULT: tests, PACKAGE_RESULT: pkg },
      });
      assert.ifError(result.error);
      assert.equal(result.status === 0, tests === 'success' && pkg === 'success', `${tests}/${pkg}`);
    }
  }
});
