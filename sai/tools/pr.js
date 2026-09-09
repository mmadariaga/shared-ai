#!/usr/bin/env node

'use strict';

/**
 * pr — deterministic pull request collection and execution engine.
 *
 * Extracts the deterministic mechanics of the `/sai-pr` command into
 * importable tools. The workflow is split:
 *   1. collect: inspect git branch state, derive parent, report artifacts,
 *      check for existing PR; report as JSON for the model to draft the title/body
 *   2. apply: read title and body from stdin, validate title, create PR
 *
 * The model sits between collect and apply: collect produces facts, the model
 * drafts a title and body, apply validates and executes.
 *
 * Sub-commands:
 *   collect                    Report branch, parent, commits, diff inventory,
 *                              artifact presence/absence, and existing PR status.
 *   apply                      Read title and body from stdin, validate title,
 *                              and create the pull request.
 *
 * Usage:
 *   node sai/tools/pr.js collect [--json] [--cwd <dir>]
 *   node sai/tools/pr.js apply [--cwd <dir>]
 *
 * Exit codes:
 *   0 = success (collect reports, apply creates PR successfully)
 *   1 = validation failed (apply reports violations)
 *   2 = usage error or I/O failure
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { checkPrTitleRules, ToolError: LintToolError } = require('./lint');

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
    super('pull request validation failed');
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
 * Get the current branch name.
 */
function getCurrentBranch(cwd) {
  const result = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  if (result.status !== 0) {
    throw new ToolError(`git rev-parse failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

/**
 * Derive the parent branch for the PR.
 * Strategy: check if current branch was created from another feature branch,
 * otherwise default to 'master' (or 'main' if 'master' doesn't exist).
 */
function deriveParentBranch(cwd) {
  // Check if 'master' exists
  const masterCheckResult = run('git', ['rev-parse', '--verify', 'master'], cwd);
  const masterExists = masterCheckResult.status === 0;

  // Try to find the merge base to detect parent branch
  const currentBranch = getCurrentBranch(cwd);
  const defaultBranch = masterExists ? 'master' : 'main';

  // For now, return the default branch
  // A more sophisticated implementation would analyze branch history
  return defaultBranch;
}

/**
 * Get commits in the current branch relative to parent.
 */
function getCommits(parentBranch, cwd) {
  const result = run('git', ['log', `${parentBranch}..HEAD`, '--oneline'], cwd);
  if (result.status !== 0) {
    throw new ToolError(`git log failed: ${result.stderr || result.stdout}`);
  }

  const commits = result.stdout
    .split('\n')
    .map(line => line.trim())
    .filter(line => line);

  return commits;
}

/**
 * Get full commit messages.
 */
function getFullCommits(parentBranch, cwd) {
  const result = run('git', ['log', `${parentBranch}..HEAD`, '--pretty=format:%H%n%s%n%b%n---END---'], cwd);
  if (result.status !== 0) {
    throw new ToolError(`git log failed: ${result.stderr || result.stdout}`);
  }

  return result.stdout;
}

/**
 * Get diff statistics.
 */
function getDiffStats(parentBranch, cwd) {
  const result = run('git', ['diff', '--stat', `${parentBranch}...HEAD`], cwd);
  if (result.status !== 0) {
    throw new ToolError(`git diff --stat failed: ${result.stderr || result.stdout}`);
  }

  return result.stdout;
}

/**
 * Get list of changed files with their status.
 * Returns structured entries with status and path fields.
 * Paths are normalized to forward slashes for consistency across platforms.
 */
function getChangedFiles(parentBranch, cwd) {
  const result = run('git', ['diff', '--name-status', `${parentBranch}...HEAD`], cwd);
  if (result.status !== 0) {
    throw new ToolError(`git diff --name-status failed: ${result.stderr || result.stdout}`);
  }

  const files = [];
  result.stdout
    .split('\n')
    .forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Parse status and path from "STATUS\tPATH" format
      const parts = trimmed.split('\t');
      if (parts.length >= 2) {
        const status = parts[0];
        // Rejoin in case path contains tabs (unlikely but possible)
        const filePath = parts.slice(1).join('\t');
        // Normalize to forward slashes for consistency
        const normalized = filePath.replace(/\\/g, '/');
        files.push({
          status,
          path: normalized,
        });
      }
    });

  return files;
}

/**
 * Check if gh command is available and authenticated.
 */
function checkGhAvailable(cwd) {
  const result = run('gh', ['auth', 'status'], cwd);
  return result.available && result.status === 0;
}

/**
 * Check if a PR already exists for the current branch.
 */
function getExistingPR(cwd) {
  const currentBranch = getCurrentBranch(cwd);
  const result = run('gh', ['pr', 'list', '--head', currentBranch, '--json', 'number,url,state'], cwd);

  if (result.status !== 0 || !result.stdout) {
    return null;
  }

  try {
    const prs = JSON.parse(result.stdout);
    if (prs.length > 0) {
      return prs[0];
    }
  } catch (err) {
    // Parse error, treat as no PR
  }

  return null;
}

/**
 * Discover capability spec files in the change directory.
 * Returns an array of paths matching openspec/changes/{name}/specs/.../...md
 */
function discoverSpecs(changeName, cwd) {
  const specsDir = path.join(cwd, 'openspec', 'changes', changeName, 'specs');

  if (!fs.existsSync(specsDir)) {
    return [];
  }

  const specs = [];
  const walk = (dir) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // Normalize to forward slashes for consistency across platforms
          const relPath = path.relative(cwd, fullPath);
          const normalized = relPath.replace(/\\/g, '/');
          specs.push(normalized);
        }
      }
    } catch (err) {
      // Ignore read errors, just return what we have
    }
  };

  walk(specsDir);
  return specs.sort();
}

/**
 * Check artifact presence in the change directory.
 * Also reports the list of capability specs.
 */
function checkArtifacts(changeName, cwd) {
  const changeDir = path.join(cwd, 'openspec', 'changes', changeName);

  const artifacts = {
    proposal: path.join(changeDir, 'proposal.md'),
    design: path.join(changeDir, 'design.md'),
    implementation: path.join(changeDir, 'implementation.md'),
    review: path.join(changeDir, 'review.md'),
    security: path.join(changeDir, 'security.md'),
    performance: path.join(changeDir, 'performance.md'),
    accessibility: path.join(changeDir, 'accessibility.md'),
  };

  const present = {};
  for (const [key, filePath] of Object.entries(artifacts)) {
    present[key] = fs.existsSync(filePath);
  }

  // Add specs list
  present.specs = discoverSpecs(changeName, cwd);

  return present;
}

/**
 * Check if branch has an upstream.
 */
function hasUpstream(cwd) {
  const currentBranch = getCurrentBranch(cwd);
  const result = run('git', ['rev-parse', '--abbrev-ref', `${currentBranch}@{u}`], cwd);
  return result.status === 0;
}

/**
 * Collect branch state, commits, diff inventory, artifacts, and existing PR status.
 */
function collectState(cwd, changeName = null) {
  const currentBranch = getCurrentBranch(cwd);
  const parentBranch = deriveParentBranch(cwd);
  const commits = getCommits(parentBranch, cwd);
  const fullCommits = getFullCommits(parentBranch, cwd);
  const diffStats = getDiffStats(parentBranch, cwd);
  const changedFiles = getChangedFiles(parentBranch, cwd);
  const ghAvailable = checkGhAvailable(cwd);
  const existingPR = ghAvailable ? getExistingPR(cwd) : null;
  const hasUpstreamBranch = hasUpstream(cwd);

  const result = {
    current_branch: currentBranch,
    parent_branch: parentBranch,
    has_upstream: hasUpstreamBranch,
    commit_count: commits.length,
    commits: commits,
    full_commits: fullCommits,
    diff_stats: diffStats,
    changed_files: changedFiles,
    gh_available: ghAvailable,
    existing_pr: existingPR,
  };

  // If change name is provided, include artifact status and stop if proposal is missing
  if (changeName) {
    const artifacts = checkArtifacts(changeName, cwd);
    result.artifacts = artifacts;

    // Stop if proposal.md is missing (E7 condition)
    if (!artifacts.proposal) {
      throw new ToolError(
        `openspec/changes/${changeName}/proposal.md not found. Ensure the change name is correct and that \`/sai-1-spec\` has been run for this change.`,
        1
      );
    }
  }

  return result;
}

/**
 * Validate and create a pull request.
 * Input format from stdin:
 *   Line 1: PR title
 *   Line 2: Empty line
 *   Lines 3+: PR body
 */
function applyPR(cwd, parentBranch = null) {
  // Read input from stdin
  const inputBuffer = fs.readFileSync(0, 'utf8');

  // Parse title and body
  const lines = inputBuffer.split('\n');
  if (lines.length < 1) {
    throw new ToolError('no input provided on stdin');
  }

  const title = lines[0].trim();
  if (!title) {
    throw new ToolError('title is empty');
  }

  // Body starts after the blank line (line 2)
  // If there are fewer than 3 lines, body is empty
  let body = '';
  if (lines.length > 2) {
    body = lines.slice(2).join('\n').trim();
  }

  if (!body) {
    throw new ToolError('body is empty');
  }

  // Validate title
  const violations = checkPrTitleRules(title);
  if (violations.length > 0) {
    throw new ValidationFailure(violations);
  }

  // Determine parent branch if not provided
  if (!parentBranch) {
    parentBranch = deriveParentBranch(cwd);
  }

  // Create the PR using gh pr create with body from stdin
  const createArgs = ['pr', 'create', '--base', parentBranch, '--title', title, '--body-file', '-'];
  const result = run('gh', createArgs, cwd, body);

  if (result.status !== 0) {
    throw new ToolError(`gh pr create failed: ${result.stderr || result.stdout}`);
  }

  return {
    success: true,
    message: result.stdout,
    url: result.stdout.trim(),
  };
}

function usage() {
  return [
    'Usage: node sai/tools/pr.js <subcommand> [options]',
    '',
    '  Subcommands:',
    '    collect                    Report branch state, commits, diff inventory, and existing PR status',
    '    apply                      Read title and body from stdin and create pull request',
    '',
    '  Options:',
    '    --json                     Emit output as JSON (collect only)',
    '    --cwd <dir>                Working directory (default: current directory)',
    '    --change <name>            Change name for artifact checking (collect only)',
    '    --parent <branch>          Parent branch for PR (apply only)',
    '',
    '  Examples:',
    '    node sai/tools/pr.js collect --json',
    '    node sai/tools/pr.js collect --change my-feature --json',
    '    cat pr.txt | node sai/tools/pr.js apply --cwd /path/to/repo',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = {
    subcommand: null,
    json: false,
    cwd: process.cwd(),
    change: null,
    parent: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--cwd') {
      opts.cwd = argv[++i];
    } else if (arg === '--change') {
      opts.change = argv[++i];
    } else if (arg === '--parent') {
      opts.parent = argv[++i];
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
      const result = collectState(opts.cwd, opts.change);
      if (opts.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(`Branch: ${result.current_branch}\n`);
        process.stdout.write(`Parent: ${result.parent_branch}\n`);
        process.stdout.write(`Commits: ${result.commit_count}\n`);
        process.stdout.write(`gh available: ${result.gh_available}\n`);
        if (result.existing_pr) {
          process.stdout.write(`Existing PR: #${result.existing_pr.number} (${result.existing_pr.state})\n`);
        }
      }
      return 0;
    } else if (opts.subcommand === 'apply') {
      const result = applyPR(opts.cwd, opts.parent);
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
    } else {
      process.stderr.write(`${err.message}\n`);
      return 2;
    }
  }
}

process.exitCode = main(process.argv.slice(2));
