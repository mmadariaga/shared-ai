#!/usr/bin/env node

'use strict';

/**
 * commit — deterministic commit collection and execution engine.
 *
 * Extracts the deterministic mechanics of the `/sai-commit` command into
 * importable tools. The workflow is split:
 *   1. collect: inspect staged state, infer scope, detect repo style, detect
 *      sensitive files; report as JSON for the model to draft the message
 *   2. apply: read message from stdin, validate, block on secrets, execute commit
 *
 * The model sits between collect and apply: collect produces facts, the model
 * drafts a message, apply validates and executes.
 *
 * Sub-commands:
 *   collect                    Report staged state, diff inventory, inferred
 *                              scope, detected style, and sensitive files.
 *   apply                      Read message from stdin, validate it, block on
 *                              detected sensitive files, and execute the commit.
 *
 * Usage:
 *   node sai/tools/commit.js collect [--json] [--cwd <dir>]
 *   node sai/tools/commit.js apply [--acknowledge-secrets <file-list>] [--cwd <dir>]
 *
 * Exit codes:
 *   0 = success (collect reports, apply commits successfully)
 *   1 = validation failed (apply reports violations or secret-file block)
 *   2 = usage error or I/O failure
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { checkCommitRules, ToolError: LintToolError } = require('./lint');

/** Usage error / tooling failure. Carries the exit code the caller sees. */
class ToolError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

/** A refusal: semantic validation failed, nothing is executed. */
class ValidationFailure extends Error {
  constructor(violations) {
    super('commit message validation failed');
    this.violations = violations;
  }
}

/**
 * Quote a string for safe use in a shell command.
 */
function escapeShellArg(arg) {
  if (process.platform === 'win32') {
    // On Windows, use double quotes and escape inner quotes
    return `"${arg.replace(/"/g, '\\"')}"`;
  } else {
    // On Unix, use single quotes (simple case)
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }
}

/**
 * On Windows an npm-installed CLI is a `.cmd` shim, which `spawnSync` cannot
 * execute without a shell. When using shell: true, arguments must be properly
 * quoted to prevent shell interpretation.
 */
function run(command, args, cwd, stdin = null) {
  const useShell = process.platform === 'win32';
  const options = { cwd, encoding: 'utf8', windowsHide: true };
  if (stdin !== null) options.input = stdin;

  let result;
  if (useShell) {
    // On Windows with shell, quote all arguments properly
    const quotedArgs = args.map(arg => escapeShellArg(arg));
    const cmd = `${command} ${quotedArgs.join(' ')}`;
    result = spawnSync(cmd, { ...options, shell: true });
  } else {
    // On Unix, pass args directly to avoid shell interpretation
    result = spawnSync(command, args, options);
  }

  if (result.error && result.error.code === 'ENOENT') {
    return { available: false, status: null, stdout: '', stderr: '', error: result.error };
  }
  if (result.error) {
    return { available: false, status: null, stdout: '', stderr: result.error.message, error: result.error };
  }
  return {
    available: true,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

/**
 * Patterns that indicate a file likely contains secrets.
 * These are deterministic and fixed; project-specific patterns are not supported.
 */
const SENSITIVE_FILE_PATTERNS = [
  /^\.env(?:\.local)?$/,
  /^\.env\.\w+$/,
  /credentials/i,
  /secret/i,
  /private[_-]?key/i,
  /\.pem$/,
  /\.key$/,
  /\.gpg$/,
  /id_rsa/,
  /id_dsa/,
  /id_ecdsa/,
  /id_ed25519/,
];

/**
 * Check if a file path matches sensitive file patterns.
 */
function isSensitiveFile(filePath) {
  const baseName = path.basename(filePath).toLowerCase();
  return SENSITIVE_FILE_PATTERNS.some(pattern => pattern.test(baseName));
}

/**
 * Detect sensitive files in the staged set.
 * Returns an array of paths that match sensitive patterns.
 */
function detectSensitiveFiles(cwd) {
  const result = run('git', ['diff', '--cached', '--name-only'], cwd);
  if (result.status !== 0) {
    throw new ToolError(`git diff failed: ${result.stderr || result.stdout}`);
  }

  const stagedFiles = result.stdout
    .split('\n')
    .map(f => f.trim())
    .filter(f => f);

  return stagedFiles.filter(f => isSensitiveFile(f));
}

/**
 * Get staged file statistics.
 * Returns {path, insertions, deletions} for each staged file.
 */
function getStagedFileStats(cwd) {
  const result = run('git', ['diff', '--cached', '--numstat'], cwd);
  if (result.status !== 0) {
    throw new ToolError(`git diff --numstat failed: ${result.stderr || result.stdout}`);
  }

  const stats = [];
  result.stdout
    .split('\n')
    .forEach(line => {
      if (!line.trim()) return;
      const parts = line.split('\t');
      if (parts.length >= 3) {
        stats.push({
          insertions: parseInt(parts[0], 10) || 0,
          deletions: parseInt(parts[1], 10) || 0,
          path: parts[2],
        });
      }
    });

  return stats;
}

/**
 * Infer scope from the common path prefix of staged files.
 * Returns the inferred scope or null if cross-cutting.
 */
function inferScope(cwd) {
  const result = run('git', ['diff', '--cached', '--name-only'], cwd);
  if (result.status !== 0) {
    throw new ToolError(`git diff failed: ${result.stderr || result.stdout}`);
  }

  const stagedFiles = result.stdout
    .split('\n')
    .map(f => f.trim())
    .filter(f => f);

  if (stagedFiles.length === 0) return null;

  // Find common directory prefix
  const dirs = stagedFiles.map(f => path.dirname(f));

  if (dirs.length === 1) {
    const dir = dirs[0];
    // Single directory: use the first directory component as scope
    if (dir === '.') return null;
    const parts = dir.split(path.sep);
    return parts[0];
  }

  // Multiple files: find common prefix
  let commonPrefix = '';
  const minLen = Math.min(...dirs.map(d => d.length));

  for (let i = 0; i < minLen; i++) {
    const char = dirs[0][i];
    if (dirs.every(d => d[i] === char)) {
      commonPrefix += char;
    } else {
      break;
    }
  }

  // Extract directory name from common prefix
  const parts = commonPrefix.replace(/[/\\]$/, '').split(path.sep);
  return parts[0] || null;
}

/**
 * Detect repository commit style by analyzing the last 20 commits.
 * Returns: { match_rate, detected_types, detected_scopes, body_presence_rate, recurring_headers }
 */
function detectRepoStyle(cwd) {
  // Fetch last 20 commits
  const result = run('git', ['log', '-20', '--pretty=format:%s%n%b%n---END---'], cwd);
  // If git log fails (e.g., repository has no commits yet), return no-adoption style
  // Edge case E5: fewer than 20 commits means style detection has no data and fixed rules apply
  if (result.status !== 0) {
    return {
      match_rate: 0,
      detected_types: [],
      detected_scopes: [],
      body_presence_rate: 0,
      recurring_headers: [],
    };
  }

  const commitText = result.stdout;
  const commits = [];

  // Parse commits: subject is first line, body is everything until ---END---
  let currentSubject = '';
  let currentBody = '';
  let inBody = false;

  commitText.split('\n').forEach(line => {
    if (line === '---END---') {
      if (currentSubject) {
        commits.push({ subject: currentSubject, body: currentBody });
        currentSubject = '';
        currentBody = '';
        inBody = false;
      }
    } else if (!inBody && !currentSubject) {
      currentSubject = line;
      inBody = true;
    } else if (inBody) {
      if (currentBody) currentBody += '\n';
      currentBody += line;
    }
  });

  // Analyze commits
  const ccPattern = /^(feat|fix|perf|refactor|docs|test|build|ci|chore|style|revert)(\([^)]+\))?: .+/;
  let matchCount = 0;
  const types = new Set();
  const scopes = new Set();
  let withBodyCount = 0;

  commits.forEach(commit => {
    if (ccPattern.test(commit.subject)) {
      matchCount++;
      const typeMatch = commit.subject.match(/^(\w+)/);
      if (typeMatch) types.add(typeMatch[1]);

      const scopeMatch = commit.subject.match(/\(([^)]+)\)/);
      if (scopeMatch) scopes.add(scopeMatch[1]);
    }

    if (commit.body.trim()) {
      withBodyCount++;
    }
  });

  const matchRate = commits.length > 0 ? (matchCount / commits.length) : 0;
  const bodyPresenceRate = commits.length > 0 ? (withBodyCount / commits.length) : 0;

  // Find recurring body headers (lines that start with capitalized words followed by colon)
  const headerCounts = {};
  commits.forEach(commit => {
    const lines = commit.body.split('\n');
    lines.forEach(line => {
      const headerMatch = line.match(/^([A-Z][^:]*): /);
      if (headerMatch) {
        const header = headerMatch[1];
        headerCounts[header] = (headerCounts[header] || 0) + 1;
      }
    });
  });

  // Only return headers that appear in at least 2 commits
  const recurringHeaders = Object.keys(headerCounts)
    .filter(h => headerCounts[h] >= 2)
    .sort((a, b) => headerCounts[b] - headerCounts[a]);

  return {
    match_rate: Math.round(matchRate * 100),
    detected_types: Array.from(types),
    detected_scopes: Array.from(scopes),
    body_presence_rate: Math.round(bodyPresenceRate * 100),
    recurring_headers: recurringHeaders,
  };
}

/**
 * Check if there are staged changes.
 */
function hasStagedChanges(cwd) {
  const result = run('git', ['diff', '--cached', '--quiet'], cwd);
  return result.status === 1; // Exit code 1 means there are changes
}

/**
 * Get the current HEAD commit info for amend operations.
 * Returns {sha, subject} or null if no commits exist.
 */
function getAmendTarget(cwd) {
  const result = run('git', ['rev-parse', '--short', 'HEAD'], cwd);
  if (result.status !== 0) {
    return null; // No commits yet
  }
  const sha = result.stdout.trim();

  const subjectResult = run('git', ['log', '-1', '--pretty=format:%s'], cwd);
  if (subjectResult.status !== 0) {
    return null;
  }
  const subject = subjectResult.stdout.trim();

  return { sha, subject };
}

/**
 * Check if HEAD commit is already pushed.
 * Returns true if HEAD has been pushed to any remote, false otherwise.
 */
function isHeadPushed(cwd) {
  // Check if there's a remote at all
  const remotesResult = run('git', ['remote'], cwd);
  if (remotesResult.status !== 0 || !remotesResult.stdout.trim()) {
    return false; // No remotes
  }

  // For each remote, check if HEAD is in its log
  const remotes = remotesResult.stdout.trim().split('\n');
  for (const remote of remotes) {
    // Check if HEAD is an ancestor of the remote branch
    const checkResult = run('git', ['merge-base', '--is-ancestor', 'HEAD', `${remote}/HEAD`], cwd);
    if (checkResult.status === 0) {
      return true; // HEAD is reachable from this remote
    }
  }

  return false;
}

/**
 * Collect staged state, diff inventory, scope, style, and sensitive files.
 * With --amend, allows empty staging area (message-only amend) and reports target.
 */
function collectState(cwd, amend = false) {
  // Check for staged changes
  const hasStaged = hasStagedChanges(cwd);
  if (!hasStaged && !amend) {
    return {
      has_staged: false,
      message: 'No staged changes',
    };
  }

  // With amend, staged changes are optional but we still process them if present
  let fileStats = [];
  let totalInsertions = 0;
  let totalDeletions = 0;
  let inferredScope = null;

  if (hasStaged) {
    fileStats = getStagedFileStats(cwd);
    totalInsertions = fileStats.reduce((sum, s) => sum + s.insertions, 0);
    totalDeletions = fileStats.reduce((sum, s) => sum + s.deletions, 0);
    inferredScope = inferScope(cwd);
  }

  // Detect repository style
  const detectedStyle = detectRepoStyle(cwd);

  // Detect sensitive files
  const sensitiveFiles = detectSensitiveFiles(cwd);

  const result = {
    has_staged: hasStaged,
    file_count: fileStats.length,
    total_insertions: totalInsertions,
    total_deletions: totalDeletions,
    files: fileStats,
    inferred_scope: inferredScope,
    detected_style: detectedStyle,
    sensitive_files: sensitiveFiles,
  };

  // With amend, report the target commit and pushed status
  if (amend) {
    const amendTarget = getAmendTarget(cwd);
    if (amendTarget) {
      result.amend_target = {
        sha: amendTarget.sha,
        subject: amendTarget.subject,
        already_pushed: isHeadPushed(cwd),
      };
    } else {
      // No commits to amend
      return {
        has_staged: false,
        message: 'No commits to amend',
      };
    }
  }

  return result;
}

/**
 * Validate commit message and execute the commit.
 * Message is read from stdin.
 * With --amend, uses git commit --amend instead of git commit.
 */
function applyCommit(cwd, acknowledgeSecretsArg, amend = false) {
  // Read message from stdin
  const inputBuffer = fs.readFileSync(0, 'utf8');
  const message = inputBuffer;

  if (!message || !message.trim()) {
    throw new ToolError('no message provided on stdin');
  }

  // Validate message format
  const violations = checkCommitRules(message);
  if (violations.length > 0) {
    throw new ValidationFailure(violations);
  }

  // Check for sensitive files
  const sensitiveFiles = detectSensitiveFiles(cwd);

  if (sensitiveFiles.length > 0) {
    // Parse acknowledged secrets
    const acknowledged = acknowledgeSecretsArg
      ? acknowledgeSecretsArg.split(',').map(s => s.trim())
      : [];

    // Compare: must match exactly
    const acknowledgedSet = new Set(acknowledged);
    const sensitiveSet = new Set(sensitiveFiles);

    const unacknowledged = sensitiveFiles.filter(f => !acknowledgedSet.has(f));
    const extraAcknowledged = acknowledged.filter(f => !sensitiveSet.has(f));

    if (unacknowledged.length > 0 || extraAcknowledged.length > 0) {
      const err = new Error('sensitive files not acknowledged');
      err.code = 1;
      err.unacknowledged = unacknowledged;
      err.extra_acknowledged = extraAcknowledged;
      err.detected_sensitive_files = sensitiveFiles;
      throw err;
    }
  }

  // Execute git commit (or amend) using -F - to read message from stdin
  // This preserves the message byte-for-byte without shell interpretation
  const commitArgs = amend
    ? ['commit', '--amend', '-F', '-']
    : ['commit', '-F', '-'];
  const result = run('git', commitArgs, cwd, message);
  if (result.status !== 0) {
    throw new ToolError(`git commit failed: ${result.stderr || result.stdout}`);
  }

  return {
    success: true,
    message: result.stdout,
  };
}

function usage() {
  return [
    'Usage: node sai/tools/commit.js <subcommand> [options]',
    '',
    '  Subcommands:',
    '    collect                    Report staged state, inferred scope, detected style, and amend target',
    '    apply                      Read message from stdin, validate, and commit (or amend)',
    '',
    '  Options:',
    '    --json                     Emit output as JSON',
    '    --cwd <dir>                Working directory (default: current directory)',
    '    --amend                    Amend the previous commit instead of creating a new one',
    '    --acknowledge-secrets <list>  Comma-separated list of sensitive files to allow',
    '',
    '  Examples:',
    '    node sai/tools/commit.js collect --json',
    '    node sai/tools/commit.js collect --amend --json',
    '    cat message.txt | node sai/tools/commit.js apply --cwd /path/to/repo',
    '    cat message.txt | node sai/tools/commit.js apply --amend --cwd /path/to/repo',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = {
    subcommand: null,
    json: false,
    cwd: process.cwd(),
    acknowledgeSecrets: null,
    amend: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--amend') {
      opts.amend = true;
    } else if (arg === '--cwd') {
      opts.cwd = argv[++i];
    } else if (arg === '--acknowledge-secrets') {
      opts.acknowledgeSecrets = argv[++i];
    } else if (arg.startsWith('--')) {
      return { error: `unknown flag: ${arg}` };
    } else if (opts.subcommand === null) {
      opts.subcommand = arg;
    } else {
      return { error: `unexpected positional argument: ${arg}` };
    }
  }

  return { opts };
}

function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.error) {
    process.stderr.write(`${parsed.error}\n${usage()}\n`);
    return 2;
  }

  const { opts } = parsed;
  if (opts.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  if (!opts.subcommand) {
    process.stderr.write(`subcommand required.\n${usage()}\n`);
    return 2;
  }

  try {
    if (opts.subcommand === 'collect') {
      const result = collectState(opts.cwd, opts.amend);
      if (opts.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        if (result.has_staged || result.amend_target) {
          if (result.has_staged) {
            process.stdout.write(`Staged: ${result.file_count} files, +${result.total_insertions} -${result.total_deletions}\n`);
            process.stdout.write(`Inferred scope: ${result.inferred_scope || '(none)'}\n`);
            process.stdout.write(`Detected style: ${result.detected_style.match_rate}% CC match\n`);
            if (result.sensitive_files.length > 0) {
              process.stdout.write(`Sensitive files detected: ${result.sensitive_files.join(', ')}\n`);
            }
          }
          if (result.amend_target) {
            process.stdout.write(`Amending: ${result.amend_target.sha} "${result.amend_target.subject}"\n`);
            if (result.amend_target.already_pushed) {
              process.stdout.write(`Warning: this commit is already pushed\n`);
            }
          }
        } else {
          process.stdout.write(`${result.message}\n`);
        }
      }
      return (result.has_staged || result.amend_target) ? 0 : 1;
    } else if (opts.subcommand === 'apply') {
      const result = applyCommit(opts.cwd, opts.acknowledgeSecrets, opts.amend);
      if (opts.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(`${result.message}\n`);
      }
      return 0;
    } else {
      process.stderr.write(`unknown subcommand: ${opts.subcommand}\n${usage()}\n`);
      return 2;
    }
  } catch (err) {
    if (err instanceof ValidationFailure) {
      const report = {
        ok: false,
        violations: err.violations,
      };
      if (opts.json) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      } else {
        for (const v of err.violations) {
          process.stdout.write(`${v.file}:${v.line} [${v.problem}] — ${v.detail}.\n`);
        }
        process.stdout.write(`Validation failed: ${err.violations.length} violation(s).\n`);
      }
      return 1;
    } else if (err instanceof ToolError) {
      process.stderr.write(`${err.message}\n`);
      return err.code || 2;
    } else if (err.code === 1) {
      const report = {
        ok: false,
        reason: err.message,
        detected_sensitive_files: err.detected_sensitive_files || [],
        unacknowledged: err.unacknowledged || [],
        extra_acknowledged: err.extra_acknowledged || [],
      };
      if (opts.json) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      } else {
        process.stdout.write(`${err.message}\n`);
        if (err.detected_sensitive_files.length > 0) {
          process.stdout.write(`Detected: ${err.detected_sensitive_files.join(', ')}\n`);
        }
      }
      return 1;
    } else {
      process.stderr.write(`${err.message}\n`);
      return 2;
    }
  }
}

process.exitCode = main(process.argv.slice(2));
