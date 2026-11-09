'use strict';

// The one resolver of the global harness root: the directory that holds the installed `commands/`, `sai/`,
// `skills/`, and `agents/` of a harness. The fetch tool, the installer, `doctor`, uninstall, and the generated
// permission rules all resolve the root through this module, so they never disagree about it.
//
//   Claude Code: `CLAUDE_CONFIG_DIR` when it is set and not blank, else `<home>/.claude`.
//   opencode:    the directory `opencode debug paths` reports on its `config` line, else
//                `XDG_CONFIG_HOME/opencode` when that variable is set, else `<home>/.config/opencode`.
//
// The module is installed beside `fetch.js` and `bin/` requires the same file from the repository.

const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HARNESS_IDS = ['claude', 'opencode'];

function nonBlank(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

// The config directory of the `config` line of `opencode debug paths` output, or null.
function parseOpencodeConfigLine(stdout) {
  if (typeof stdout !== 'string') return null;
  const line = stdout.split(/\r?\n/).find(item => /^config\s+/.test(item.trim()));
  return line ? nonBlank(line.trim().replace(/^config\s+/, '')) : null;
}

// The default `opencode debug paths` call. Its result is `{status, stdout}` shaped like `spawnSync`'s.
function defaultRunOpencodePaths(env = process.env) {
  return spawnSync('opencode debug paths', { shell: true, encoding: 'utf8', timeout: 10000, env });
}

// The directory opencode reports, or null when the command is absent, fails, or prints no `config` line.
function opencodeReportedConfig({ runOpencodePaths = defaultRunOpencodePaths, env = process.env } = {}) {
  try {
    const result = runOpencodePaths(env);
    if (!result || result.error || result.status !== 0) return null;
    return parseOpencodeConfigLine(result.stdout);
  } catch {
    return null;
  }
}

// The global root of `harness`. `home`, `env`, and `runOpencodePaths` exist so a caller (a test, the
// installer's own spawn) can supply what it already holds; every one defaults to the live process.
function resolveGlobalRoot(harness, { home = os.homedir(), env = process.env, runOpencodePaths } = {}) {
  if (!HARNESS_IDS.includes(harness)) throw new Error(`Unsupported harness: ${harness}`);
  if (harness === 'claude') {
    const configured = nonBlank(env.CLAUDE_CONFIG_DIR);
    return configured ? path.resolve(configured) : path.join(home, '.claude');
  }
  const reported = opencodeReportedConfig({ runOpencodePaths, env });
  if (reported) return path.resolve(reported);
  const xdg = nonBlank(env.XDG_CONFIG_HOME);
  return xdg ? path.join(path.resolve(xdg), 'opencode') : path.join(home, '.config', 'opencode');
}

module.exports = { resolveGlobalRoot, opencodeReportedConfig, parseOpencodeConfigLine, defaultRunOpencodePaths, HARNESS_IDS };
