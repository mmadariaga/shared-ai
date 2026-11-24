'use strict';

/**
 * change-base — the one computation of the change base, shared by
 * `scenario-coverage.js` and `test-select.js`.
 *
 * Terms.
 * - change base: the merge-base of HEAD with the parent branch, the
 *   `--parent-branch` value when given, else the first of the default branch of
 *   origin/HEAD (without its `origin/` prefix), `master`, and `main` that
 *   `git rev-parse --verify` accepts, the order `/sai-4-review` follows.
 *
 * A failure is a `UsageError`: callers report it as a usage or I/O error and
 * never as a finding.
 */

const { spawnSync } = require('child_process');

class UsageError extends Error {}

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw new UsageError(`cannot run git: ${result.error.message}`);
  return result;
}

function verifies(branch, cwd) {
  return git(['rev-parse', '--verify', '--quiet', `${branch}^{commit}`], cwd).status === 0;
}

function resolveChangeBase(cwd, parentBranch) {
  let parent;
  if (parentBranch) {
    if (!verifies(parentBranch, cwd)) throw new UsageError(`--parent-branch ${parentBranch} does not resolve to a commit`);
    parent = parentBranch;
  } else {
    const origin = git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], cwd);
    const defaultBranch = origin.status === 0 ? origin.stdout.trim().replace(/^origin\//, '') : '';
    const candidates = [defaultBranch, 'master', 'main'].filter(Boolean);
    parent = candidates.find((candidate) => verifies(candidate, cwd));
    if (!parent) throw new UsageError(`no parent branch verifies; tried ${candidates.join(', ')}`);
  }
  const base = git(['merge-base', 'HEAD', parent], cwd);
  if (base.status !== 0) throw new UsageError(`git merge-base HEAD ${parent} failed: ${base.stderr.trim()}`);
  return { parent_branch: parent, change_base: base.stdout.trim() };
}

module.exports = { UsageError, git, verifies, resolveChangeBase };
