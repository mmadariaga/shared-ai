#!/usr/bin/env node
'use strict';

// Deterministic `Fetch @<subpath>` resolver for the Claude Code and opencode fetch skills.
//
//   node "<skills>/fetch/fetch.js" --harness claude|opencode <subpath> [<subpath> ...]
//
// Looks each subpath up in the project-local root of the working directory and then in the
// user-global root. One subpath prints a header (absolute resolved path, root), one blank line, and
// the unchanged file content. Two or more subpaths (path mode) print only one block per subpath, in
// argument order, on stdout: `subpath:`, `path:`, `root:` for a resolved one, `subpath:` and `error:`
// for a failed one, and never file content. Exit 0 when every subpath resolved, 1 when at least one
// was rejected or unresolved, 2 on a usage error.
// The tool never follows `Fetch @` directives inside the content it returns.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HARNESSES = {
  claude: { local: '.claude', global: ['.claude'], skillTool: 'Skill', outputCap: 30000 },
  // The opencode output cap is a provisional value until the design measures it.
  opencode: { local: '.opencode', global: ['.config', 'opencode'], skillTool: 'skill', outputCap: 30000 },
};
const PREFIXES = ['sai', 'commands', 'skills'];
const USAGE = 'Usage: node fetch.js --harness claude|opencode <subpath> [<subpath> ...]';

class FetchError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.code = code;
  }
}

function parseArgs(argv) {
  let harness;
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--harness') {
      if (index + 1 >= argv.length) throw new FetchError(`--harness needs a value. ${USAGE}`, 2);
      harness = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--harness=')) {
      harness = arg.slice('--harness='.length);
    } else if (arg.startsWith('--')) {
      throw new FetchError(`Unknown option ${arg}. ${USAGE}`, 2);
    } else {
      positional.push(arg);
    }
  }
  if (!Object.hasOwn(HARNESSES, harness || '')) {
    throw new FetchError(`--harness must be claude or opencode. ${USAGE}`, 2);
  }
  if (positional.length === 0) throw new FetchError(`At least one subpath is required. ${USAGE}`, 2);
  return { harness, subpaths: positional };
}

// Rejects before any filesystem access. Returns the subpath's segments.
function checkSubpath(subpath, harness) {
  const scopeMessage = `Fetch @${subpath} is outside the permitted scope: a subpath names one file that begins with ${PREFIXES.map(prefix => `${prefix}/`).join(', ')} and holds no "..", no absolute path, and no empty segment.`;
  if (!subpath || /[\0]/.test(subpath) || /^([a-zA-Z]:|[\\/~])/.test(subpath)) throw new FetchError(scopeMessage);
  const segments = subpath.split(/[\\/]/);
  if (segments.some(segment => segment === '' || segment === '.' || segment === '..')) throw new FetchError(scopeMessage);
  if (!PREFIXES.includes(segments[0]) || segments.length < 2) throw new FetchError(scopeMessage);
  if (segments.length === 3 && segments[0] === 'skills' && segments[2] === 'SKILL.md') {
    throw new FetchError(`Fetch @${subpath} names a skill: load it with the \`${HARNESSES[harness].skillTool}\` tool (skill name "${segments[1]}"), not with the fetch tool.`);
  }
  return segments;
}

function isFile(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function toSlashes(file) {
  return file.replace(/\\/g, '/');
}

// The config directory `opencode debug paths` prints on its `config` line, or null.
function opencodeConfigDir(run) {
  try {
    const result = run();
    if (!result || result.status !== 0 || typeof result.stdout !== 'string') return null;
    const line = result.stdout.split(/\r?\n/).find(item => /^config\s+/.test(item));
    return line ? line.replace(/^config\s+/, '').trim() || null : null;
  } catch {
    return null;
  }
}

function defaultRunOpencodePaths() {
  return spawnSync('opencode', ['debug', 'paths'], { encoding: 'utf8', timeout: 10000, shell: process.platform === 'win32' });
}

function resolveSubpath({ harness, subpath, cwd, home, runOpencodePaths = defaultRunOpencodePaths, segments = checkSubpath(subpath, harness) }) {
  const config = HARNESSES[harness];
  const roots = [
    { root: 'project', base: path.resolve(cwd, config.local) },
    { root: 'global', base: path.join(home, ...config.global) },
  ];
  const tried = [];
  for (const { root, base } of roots) {
    const candidate = path.join(base, ...segments);
    tried.push(toSlashes(candidate));
    if (isFile(candidate)) return { file: candidate, root };
  }
  if (harness === 'opencode') {
    const dir = opencodeConfigDir(runOpencodePaths);
    if (dir) {
      const candidate = path.join(path.resolve(dir), ...segments);
      tried.push(toSlashes(candidate));
      if (isFile(candidate)) return { file: candidate, root: 'global' };
    }
  }
  throw new FetchError(`File not found: ${subpath} (tried ${tried.join(', ')})`);
}

function render({ file, root }, harness) {
  const header = `path: ${toSlashes(path.resolve(file))}\nroot: ${root}\n`;
  const content = fs.readFileSync(file, 'utf8');
  const cap = HARNESSES[harness].outputCap;
  if (header.length + 1 + content.length > cap) {
    return `${header}too-large: the file has ${content.length} characters, above the ${cap}-character output cap; read the path above with Read.\n`;
  }
  return `${header}\n${content}`;
}

// Runs `run` at most once and replays its outcome, so a batch asks `opencode debug paths` once.
function once(run) {
  let outcome;
  return () => {
    if (!outcome) {
      try {
        outcome = { value: run() };
      } catch (error) {
        outcome = { error };
      }
    }
    if (outcome.error) throw outcome.error;
    return outcome.value;
  };
}

// Path mode: one block per subpath argument, in argument order, never file content. Every subpath
// passes the scope check before any of them touches the filesystem.
function renderBatch({ harness, subpaths, cwd, home, runOpencodePaths }) {
  const checked = subpaths.map(subpath => {
    try {
      return { subpath, segments: checkSubpath(subpath, harness) };
    } catch (error) {
      if (!(error instanceof FetchError)) throw error;
      return { subpath, error };
    }
  });
  const blocks = [];
  let failed = false;
  for (const { subpath, segments, error: scopeError } of checked) {
    try {
      if (scopeError) throw scopeError;
      const { file, root } = resolveSubpath({ harness, subpath, cwd, home, runOpencodePaths, segments });
      blocks.push(`subpath: ${subpath}\npath: ${toSlashes(path.resolve(file))}\nroot: ${root}\n`);
    } catch (error) {
      if (!(error instanceof FetchError)) throw error;
      failed = true;
      blocks.push(`subpath: ${subpath}\nerror: ${error.message}\n`);
    }
  }
  return { text: blocks.join('\n'), code: failed ? 1 : 0 };
}

function main(argv, { cwd = process.cwd(), home = os.homedir(), runOpencodePaths = defaultRunOpencodePaths, stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const { harness, subpaths } = parseArgs(argv);
    if (subpaths.length === 1) {
      const resolved = resolveSubpath({ harness, subpath: subpaths[0], cwd, home, runOpencodePaths });
      stdout.write(render(resolved, harness));
      return 0;
    }
    const batch = renderBatch({ harness, subpaths, cwd, home, runOpencodePaths: once(runOpencodePaths) });
    stdout.write(batch.text);
    return batch.code;
  } catch (error) {
    if (!(error instanceof FetchError)) throw error;
    stderr.write(`${error.message}\n`);
    return error.code;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { main, parseArgs, checkSubpath, resolveSubpath, render, HARNESSES, PREFIXES };
