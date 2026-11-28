'use strict';

/**
 * opencode-launcher — which opencode or Claude Code executable runs, and how it is spawned
 * (sai/policies/opencode-dispatch.md, sai/policies/claude-dispatch.md).
 *
 * Every SAI tool that starts `opencode` or `claude` asks this module for the command first, so a route that answers
 * for one harness is never followed by a turn or a stop that cannot find the binary. The command it returns is always
 * spawned without a shell: a worker message is multi-line free text that must reach the child as one argument, and
 * `cmd.exe` would break its line breaks and expand `%` and `^`.
 *
 * On Linux and macOS the command is the binary's own name, found on `PATH` by the spawn itself. On Windows Node cannot
 * execute the `.cmd` shim that npm writes, so the launcher walks the `PATH` directories in order, with no process
 * spawned, and in the first directory that holds a `<binary>` entry takes `<binary>.exe`, else the `.exe` that
 * `<binary>.cmd` names. `PATH` order decides which install runs, as it does in a terminal. An extensionless entry is
 * the sh shim npm writes beside the `.cmd` and is skipped. A shim whose `.exe` the launcher cannot read, or whose
 * `.exe` is absent (a pnpm, yarn, or scoop shim, or a `.ps1`-only install), is `<binary>-shim-unresolved` and names
 * the shim path.
 *
 * `resolveBinary` takes the platform, the environment, and the file-system reads as inputs, so the Windows branch
 * runs on any operating system.
 */

const fs = require('node:fs');
const win = require('node:path').win32;

// The opencode causes keep their spelling: the dispatch and setup surfaces name them.
const SHIM_UNRESOLVED = 'opencode-shim-unresolved';
const MISSING = 'opencode-missing';
const QUOTED_EXE = /"([^"\r\n]+\.exe)"/gi;
const SHIM_DIRECTORY = /^%~?dp0%?[\\/]*/i;

const isFile = file => { try { return fs.statSync(file).isFile(); } catch { return false; } };
const readText = file => fs.readFileSync(file, 'utf8');

/** The `PATH` directories of a Windows environment, in order, without quotes and empty entries. */
function windowsDirectories(env) {
  const key = Object.keys(env).find(name => name.toLowerCase() === 'path');
  const value = key === undefined ? '' : env[key];
  return String(value ?? '').split(';').map(entry => entry.trim().replace(/^"(.*)"$/, '$1')).filter(Boolean);
}

/**
 * The `.exe` an npm `.cmd` shim runs: the first quoted path ending in `.exe`, a leading `%dp0%` or `%~dp0` replaced by
 * the shim's directory. `node.exe` is the interpreter of a script shim, never the target. `null` when the text names none.
 */
function shimTarget(text, directory) {
  for (const match of text.matchAll(QUOTED_EXE)) {
    let target = match[1];
    if (SHIM_DIRECTORY.test(target)) target = win.join(directory, target.replace(SHIM_DIRECTORY, ''));
    if (target.includes('%') || !win.isAbsolute(target) || win.basename(target).toLowerCase() === 'node.exe') continue;
    return win.normalize(target);
  }
  return null;
}

function resolveWindows(binary, { env, exists, read }) {
  for (const directory of windowsDirectories(env)) {
    const exe = win.join(directory, `${binary}.exe`);
    if (exists(exe)) return { command: exe, shim: null, cause: null };
    const cmd = win.join(directory, `${binary}.cmd`);
    if (exists(cmd)) {
      let target = null;
      try { target = shimTarget(read(cmd), directory); } catch { target = null; }
      if (target !== null && exists(target)) return { command: target, shim: cmd, cause: null };
      return { command: null, shim: cmd, cause: `${binary}-shim-unresolved` };
    }
    const script = win.join(directory, `${binary}.ps1`);
    if (exists(script)) return { command: null, shim: script, cause: `${binary}-shim-unresolved` };
  }
  return { command: null, shim: null, cause: `${binary}-missing` };
}

/**
 * The command of one CLI binary: `{ command, shim, cause }`. `command` is what to spawn (without a shell) or `null`
 * when none can run, and `cause` is then `<binary>-missing` or `<binary>-shim-unresolved` (with the `shim` path). On
 * Linux and macOS the command is the binary name and a missing binary shows up as the spawn's own error.
 */
function resolveBinary(binary, { platform = process.platform, env = process.env, exists = isFile, read = readText } = {}) {
  if (platform !== 'win32') return { command: binary, shim: null, cause: null };
  return resolveWindows(binary, { env, exists, read });
}

/** The opencode command, as `resolveBinary` returns it. */
function resolveOpencode(options = {}) {
  return resolveBinary('opencode', options);
}

module.exports = { resolveBinary, resolveOpencode, shimTarget, SHIM_UNRESOLVED, MISSING };
