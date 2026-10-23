'use strict';

// Test preload (`node --import ./test/harness-roots.js --test`). On Linux the SAI temp root sits inside a
// harness root that the harness itself creates (`/tmp/claude-{uid}`, `/tmp/opencode`) and SAI never creates.
// A machine that has not run both harnesses lacks one of them, so the tools under test would stop with
// TEMP_ROOT_MISSING. This preload creates the missing ones as the harness would (a private directory), the
// same step the CI workflow runs, so the suite does not depend on which harness ran on the machine before.
// It runs once in the test runner process, before any test file starts. Elsewhere it does nothing: on
// Windows and macOS the tools create their own root.
const fs = require('node:fs');
const { HARNESSES, harnessRoot } = require('../sai/tools/temp-root');

if (process.platform === 'linux') {
  for (const harness of HARNESSES) {
    try {
      fs.mkdirSync(harnessRoot(harness), { mode: 0o700 });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
}
