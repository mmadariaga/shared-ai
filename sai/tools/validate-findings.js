#!/usr/bin/env node

'use strict';

/**
 * validate-findings — deterministic format validator for externally supplied
 * artifact review findings blocks.
 *
 * Validates that a findings block (text) conforms to the format policy defined
 * in sai/policies/artifact-review-contract.md by delegating to the artifact-review
 * check in sai/tools/lint.js.
 *
 * This module provides a synchronous programmatic interface to findings validation,
 * separate from lint.js's CLI. It handles tool path resolution through candidate paths:
 * sibling lint.js, .claude/sai/tools/lint.js (project-local), then ~/.claude/sai/tools/lint.js (user-global).
 *
 * Usage:
 *   const { validateFindings } = require('./validate-findings.js');
 *   const result = validateFindings(findingsText, { cwd: '/path/to/repo' });
 *   if (!result.ok) {
 *     console.log(result.violations); // Array of violation objects
 *   }
 *
 * Exit codes (when used as a CLI):
 *   0 = validation passed
 *   1 = validation failed (violations found)
 *   2 = I/O or tool error
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

/**
 * Resolve the path to lint.js, checking candidate locations in order.
 * Candidates (in order):
 *   1. sibling lint.js in the same directory as this module (__dirname/lint.js)
 *   2. .claude/sai/tools/lint.js (project-local)
 *   3. ~/.claude/sai/tools/lint.js (user-global)
 *
 * @param {object} options - Options object
 * @param {string} options.cwd - Working directory for resolution (used for .claude candidates only)
 * @return {string|null} - Resolved lint.js path, or null if not found
 */
function resolveLintToolPath(options = {}) {
  const cwd = options.cwd || process.cwd();

  // Candidate 1: sibling lint.js (same directory as this module)
  const sibling = path.join(__dirname, 'lint.js');
  if (fs.existsSync(sibling)) {
    return sibling;
  }

  // Candidate 2: project-local .claude/sai/tools/lint.js
  const projectLocal = path.join(cwd, '.claude', 'sai', 'tools', 'lint.js');
  if (fs.existsSync(projectLocal)) {
    return projectLocal;
  }

  // Candidate 3: user-global ~/.claude/sai/tools/lint.js
  const userGlobal = path.join(os.homedir(), '.claude', 'sai', 'tools', 'lint.js');
  if (fs.existsSync(userGlobal)) {
    return userGlobal;
  }

  return null;
}

/**
 * Validate an artifact review findings block.
 *
 * Runs the artifact-review check from lint.js on the supplied findings text
 * and returns a structured result.
 *
 * @param {string} findingsText - The findings block text to validate
 * @param {object} options - Options object
 * @param {string} options.cwd - Working directory for file operations and tool resolution
 * @return {object} - Result object with { ok, violations, error }
 *   ok: boolean indicating validation success
 *   violations: array of violation objects (empty if ok === true)
 *   error: error message (only present if a tool error occurred)
 */
function validateFindings(findingsText, options = {}) {
  const cwd = options.cwd || process.cwd();

  // Write findings to a temporary file
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-validate-findings-'));
  const tmpFile = path.join(tmpDir, 'findings.md');

  try {
    fs.writeFileSync(tmpFile, findingsText, 'utf8');

    // Resolve the lint.js tool path
    const lintPath = resolveLintToolPath({ cwd });
    if (!lintPath) {
      return {
        ok: false,
        violations: [],
        error: 'lint.js tool not found in sibling, .claude/sai/tools/, or ~/.claude/sai/tools/',
      };
    }

    // Run lint.js artifact-review check
    const result = spawnSync(process.execPath, [lintPath, 'artifact-review', tmpFile, '--json', '--cwd', tmpDir], {
      cwd: tmpDir,
      encoding: 'utf8',
    });

    // Parse JSON output
    let payload = null;
    if (result.stdout && result.stdout.trim()) {
      try {
        payload = JSON.parse(result.stdout);
      } catch (parseErr) {
        return {
          ok: false,
          violations: [],
          error: `Failed to parse lint.js output: ${parseErr.message}`,
        };
      }
    }

    // Handle tool execution errors
    if (result.status === 2) {
      const errorMsg = result.stderr || result.stdout || 'Unknown lint.js error';
      return {
        ok: false,
        violations: [],
        error: errorMsg,
      };
    }

    // Return structured result
    return {
      ok: result.status === 0,
      violations: payload?.violations || [],
    };
  } catch (err) {
    return {
      ok: false,
      violations: [],
      error: `Validation error: ${err.message}`,
    };
  } finally {
    // Cleanup temporary directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      // Ignore cleanup errors
    }
  }
}

/**
 * CLI: node validate-findings.js [<file>] [--cwd <dir>] [--json]
 * Reads the findings block from <file>, or from stdin when no file is given,
 * prints the result as JSON, and exits 0 (valid), 1 (violations), or 2 (error).
 * `--json` is accepted for symmetry with the other tools; output is always JSON.
 */
function main(argv) {
  let file = null;
  let cwd = process.cwd();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') continue;
    if (arg === '--cwd') {
      if (i + 1 >= argv.length) return { code: 2, result: { ok: false, violations: [], error: '--cwd requires a directory' } };
      cwd = argv[++i];
      continue;
    }
    if (arg.startsWith('--')) return { code: 2, result: { ok: false, violations: [], error: `unknown option ${arg}` } };
    if (file !== null) return { code: 2, result: { ok: false, violations: [], error: 'expected at most one findings file' } };
    file = arg;
  }

  let text;
  try {
    text = file === null ? fs.readFileSync(0, 'utf8') : fs.readFileSync(path.resolve(cwd, file), 'utf8');
  } catch (err) {
    return { code: 2, result: { ok: false, violations: [], error: `cannot read findings: ${err.message}` } };
  }
  if (!text.trim()) return { code: 2, result: { ok: false, violations: [], error: 'empty findings block' } };

  const result = validateFindings(text, { cwd });
  const code = result.error ? 2 : (result.ok ? 0 : 1);
  return { code, result };
}

if (require.main === module) {
  const { code, result } = main(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exitCode = code;
}

module.exports = { validateFindings, resolveLintToolPath, main };
