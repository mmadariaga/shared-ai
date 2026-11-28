#!/usr/bin/env node
'use strict';

// Deterministic `Fetch @<subpath>` resolver for the Claude Code and opencode fetch skills.
//
//   node "<skills>/fetch/fetch.js" --harness claude|opencode <subpath> [<subpath> ...]
//
// Looks each subpath up in the project-local root of the working directory and then in the
// user-global root, which `harness-root.js` resolves (Claude Code: `CLAUDE_CONFIG_DIR`, else `~/.claude`;
// opencode: the directory `opencode debug paths` reports, else `XDG_CONFIG_HOME/opencode`, else
// `~/.config/opencode`). A root or a file reached through a symbolic link resolves like any other: the scope
// check is lexical (see `checkSubpath`) and never compares real paths, because linked install roots are a
// supported layout. A file that exists but cannot be read is a declared error for that subpath alone.
//
// The tool resolves the full closure of the requested subpaths through the `Fetch @` edges of Markdown files:
//
// - One requested subpath whose closure is one node prints a header (absolute resolved path, root), one blank
//   line, and the unchanged content, or the `too-large` line above the output cap.
// - Every other call prints a tree: a summary line, the fixed legend, and one root line per requested subpath
//   followed by its dependencies. A node line carries the absolute resolved path and the size in thousands of
//   characters; a project-local node carries ` (project)`. An edge is conditional when its directive carries the
//   `?` marker directly after the verb (`Fetch? @<path>`); a node reached only through conditional edges is
//   conditional. A node already printed renders as an alias line and is never printed twice. A skill directive
//   renders as `[skill] <name>` and is never descended into. An unresolved nested path renders as
//   `! <subpath>  (unresolved)` and changes no exit code; an unresolved requested subpath prints `! <subpath>`
//   as its root line and exits 1.
// - A directive inside a fenced code block, or inside an inline code span that holds prose around the
//   directive, is payload for another agent and is never an edge. A machine pointer named by `next.follow` is
//   not a directive: the file it names is resolved by a later call when it is due.
//
// The tool never returns more than one file's content in a call. Exit 0 when every requested subpath resolved,
// 1 when at least one was rejected or unresolved, 2 on a usage error.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveGlobalRoot, defaultRunOpencodePaths } = require('./harness-root');

const HARNESSES = {
  claude: { local: '.claude', skillTool: 'Skill', outputCap: 30000 },
  // The opencode output cap is a provisional value until the design measures it.
  opencode: { local: '.opencode', skillTool: 'skill', outputCap: 30000 },
};
const PREFIXES = ['sai', 'commands', 'skills'];
const USAGE = 'Usage: node fetch.js --harness claude|opencode <subpath> [<subpath> ...]';
const LEGEND = 'legend: ? conditional (not now) | ~ already listed | [skill] load with the skill tool | ! unresolved';
// A template path names no file: it is prose, never an edge.
const PLACEHOLDER = /[<>{}*$…]/;
const FENCE_OPEN = /^\s*(```+|~~~+)/;
const SECTION = /^\s{0,3}##\s+(.*)$/;
const DIRECTIVE = /(Also fetch|Fetch)(\?)?[ \t]*(`?)(@[^\s`]+)/g;

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

// The readable file at `file`, or null when no file is there. A file that exists but cannot be read is a
// declared error, so no stack trace ever reaches the caller.
function readableFile(file, subpath) {
  if (!isFile(file)) return null;
  try {
    fs.accessSync(file, fs.constants.R_OK);
  } catch (error) {
    throw new FetchError(`File cannot be read: ${subpath} (${toSlashes(file)}: ${error.code || error.message})`);
  }
  return file;
}

function resolveSubpath({ harness, subpath, cwd, home, env = process.env, runOpencodePaths = defaultRunOpencodePaths, segments = checkSubpath(subpath, harness) }) {
  const config = HARNESSES[harness];
  const tried = [];
  const projectCandidate = path.join(path.resolve(cwd, config.local), ...segments);
  tried.push(toSlashes(projectCandidate));
  if (readableFile(projectCandidate, subpath)) return { file: projectCandidate, root: 'project' };
  const globalCandidate = path.join(resolveGlobalRoot(harness, { home, env, runOpencodePaths }), ...segments);
  tried.push(toSlashes(globalCandidate));
  if (readableFile(globalCandidate, subpath)) return { file: globalCandidate, root: 'global' };
  throw new FetchError(`File not found: ${subpath} (tried ${tried.join(', ')})`);
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    throw new FetchError(`File cannot be read: ${toSlashes(file)} (${error.code || error.message})`);
  }
}

// The content shape: the header, one blank line, and the unchanged content, or the too-large line above the cap.
function render({ file, root }, harness) {
  const header = `path: ${toSlashes(path.resolve(file))}\nroot: ${root}\n`;
  const content = readText(file);
  const cap = HARNESSES[harness].outputCap;
  if (header.length + 1 + content.length > cap) {
    return `${header}too-large: the file has ${content.length} characters, above the ${cap}-character output cap; read the path above with Read.\n`;
  }
  return `${header}\n${content}`;
}

// Inline code spans of one paragraph: a backtick run closes at the next run of the same length.
function inlineCodeSpans(text) {
  const spans = [];
  let index = 0;
  while (index < text.length) {
    if (text[index] !== '`') { index += 1; continue; }
    let runEnd = index;
    while (text[runEnd] === '`') runEnd += 1;
    const runLength = runEnd - index;
    let close = runEnd;
    let closeEnd = -1;
    while (close < text.length) {
      if (text[close] !== '`') { close += 1; continue; }
      let candidateEnd = close;
      while (text[candidateEnd] === '`') candidateEnd += 1;
      if (candidateEnd - close === runLength) { closeEnd = candidateEnd; break; }
      close = candidateEnd;
    }
    if (closeEnd === -1) { index = runEnd; continue; }
    spans.push([index, closeEnd]);
    index = closeEnd;
  }
  return spans;
}

const spanAt = (spans, index) => spans.find(([start, end]) => index >= start && index < end) || null;

// The skill a directive path names, or null. `skills/<name>/SKILL.md` and the installed
// `.../skills/<name>/SKILL.md` forms both name the skill without resolving its file.
function skillOf(subpath) {
  const match = /(?:^|\/)skills\/([^/\\]+)\/SKILL\.md$/.exec(subpath);
  return match ? match[1] : null;
}

// Every directive occurrence of one Markdown document, in source order, with the metadata the lint check reads.
// An occurrence is active unless it is payload: a fenced block, a template path, or a code span that holds prose
// around the directive. An active occurrence is bare, or its bare verb names a path that alone sits in a code
// span. `section` is the enclosing `##` heading; `paragraph` is the source block that holds the occurrence.
function scanDirectives(text) {
  const lines = text.split(/\r?\n/);
  const found = [];
  let section = null;
  let paragraph = [];
  let fenced = null;

  const flush = () => {
    if (paragraph.length === 0) return;
    const joined = paragraph.map(item => item.text).join('\n');
    const spans = inlineCodeSpans(joined);
    const spanText = span => joined.slice(span[0] + 1, span[1] - 1).trim();
    for (const match of joined.matchAll(DIRECTIVE)) {
      const [phrase, verb, marker, backtick, rawPath] = match;
      const verbIndex = match.index;
      const pathIndex = verbIndex + phrase.length - rawPath.length;
      const subpath = rawPath.slice(1).replace(/[.,;:]+$/, '');
      const line = paragraph[joined.slice(0, verbIndex).split('\n').length - 1].line;
      const occurrence = { line, verb, conditional: Boolean(marker), subpath, skill: skillOf(subpath), section, paragraph: joined };
      if (!subpath || PLACEHOLDER.test(subpath) || subpath.endsWith('/')) {
        found.push({ ...occurrence, active: false, reason: 'template' });
        continue;
      }
      if (spanAt(spans, verbIndex)) {
        found.push({ ...occurrence, active: false, reason: 'prose-span' });
        continue;
      }
      const pathSpan = spanAt(spans, pathIndex);
      if (backtick && (!pathSpan || spanText(pathSpan) !== rawPath)) {
        found.push({ ...occurrence, active: false, reason: 'prose-span' });
        continue;
      }
      if (!backtick && pathSpan && spanText(pathSpan) !== rawPath) {
        found.push({ ...occurrence, active: false, reason: 'prose-span' });
        continue;
      }
      found.push({ ...occurrence, active: true });
    }
    paragraph = [];
  };

  for (const [index, line] of lines.entries()) {
    const fenceMatch = FENCE_OPEN.exec(line);
    if (fenced) {
      if (fenceMatch && fenceMatch[1][0] === fenced) fenced = null;
      continue;
    }
    if (fenceMatch) {
      flush();
      fenced = fenceMatch[1][0];
      continue;
    }
    const sectionMatch = SECTION.exec(line);
    if (sectionMatch) {
      flush();
      section = sectionMatch[1].trim();
      continue;
    }
    if (/^\s{0,3}#\s/.test(line)) { flush(); section = null; continue; }
    if (line.trim() === '') { flush(); continue; }
    paragraph.push({ line: index + 1, text: line });
  }
  flush();
  return found;
}

function parseDirectives(text) {
  return scanDirectives(text).filter(occurrence => occurrence.active)
    .map(occurrence => ({ subpath: occurrence.subpath, skill: occurrence.skill, conditional: occurrence.conditional, section: occurrence.section }));
}

// Runs `run` at most once and replays its outcome, so a batch asks `opencode debug paths` once.
function once(run) {
  let outcome;
  return (...args) => {
    if (!outcome) {
      try {
        outcome = { value: run(...args) };
      } catch (error) {
        outcome = { error };
      }
    }
    if (outcome.error) throw outcome.error;
    return outcome.value;
  };
}

// One resolved node of the graph: a file with its edges, a skill, or an unresolved path.
function resolveNode({ harness, subpath, cwd, home, env, runOpencodePaths }) {
  const skill = skillOf(subpath);
  if (skill) return { kind: 'skill', name: skill, subpath };
  const { file, root } = resolveSubpath({ harness, subpath, cwd, home, env, runOpencodePaths });
  const text = readText(file);
  return {
    kind: 'file',
    subpath,
    file: path.resolve(file),
    root,
    text,
    edges: /\.md$/i.test(file) ? parseDirectives(text) : [],
  };
}

const nodeKey = node => node.kind === 'skill' ? `skill:${node.name}` : node.kind === 'unresolved' ? node.key : toSlashes(node.file);

// Resolves the closure of the requested entries and lays out its tree. A node is required when a path of
// unmarked edges reaches it from an entry; every other resolved node is conditional.
function buildGraph({ harness, entries, cwd, home, env, runOpencodePaths }) {
  const files = new Map();
  const skills = new Map();
  const unresolved = new Map();
  const positions = [];
  const links = [];
  let failed = false;

  const load = subpath => {
    let node;
    try {
      node = resolveNode({ harness, subpath, cwd, home, env, runOpencodePaths });
    } catch (error) {
      if (!(error instanceof FetchError)) throw error;
      const key = `unresolved:${subpath}`;
      if (!unresolved.has(key)) unresolved.set(key, { kind: 'unresolved', subpath, key, message: error.message });
      return unresolved.get(key);
    }
    const key = nodeKey(node);
    const store = node.kind === 'skill' ? skills : files;
    if (!store.has(key)) { node.key = key; node.printed = false; store.set(key, node); }
    return store.get(key);
  };

  // The layout is a tree of positions, flattened depth first at the end. The required edges of every entry are
  // walked before any marked edge, so a node of the required set is first printed under a required parent even
  // when an earlier entry reaches it through a marked edge; each parent keeps its required children first.
  const roots = [];
  const pendingMarked = [];

  const place = (node, edge, depth, parent, siblings, entry = false) => {
    const position = { depth, parent, conditional: Boolean(edge.conditional), node, entry, children: [] };
    if (node.kind !== 'unresolved' && node.printed) position.kind = 'alias';
    else position.kind = 'node';
    siblings.push(position);
    if (position.kind === 'alias' || node.kind === 'unresolved') return null;
    node.printed = true;
    return position;
  };

  const follow = (position, item) => {
    const child = load(item.subpath);
    links.push({ parent: position.node.key, child: child.key || nodeKey(child), conditional: item.conditional });
    return place(child, item, position.depth + 1, position.node.key, position.children);
  };

  // Required edges only; the marked edges of each printed file wait for the second phase.
  const walkRequired = position => {
    if (!position || position.node.kind !== 'file') return;
    pendingMarked.push(position);
    for (const item of position.node.edges.filter(edge => !edge.conditional)) walkRequired(follow(position, item));
  };

  // A node first printed in the second phase is conditional, and its whole subtree follows at once.
  const walkAll = position => {
    if (!position || position.node.kind !== 'file') return;
    const ordered = [...position.node.edges.filter(edge => !edge.conditional), ...position.node.edges.filter(edge => edge.conditional)];
    for (const item of ordered) walkAll(follow(position, item));
  };

  const seenEntries = new Set();
  for (const entry of entries) {
    // A repeated entry prints one root line and counts once in `entries`.
    if (seenEntries.has(entry.subpath)) continue;
    seenEntries.add(entry.subpath);
    if (entry.error) {
      failed = true;
      const key = `unresolved:${entry.subpath}`;
      if (!unresolved.has(key)) unresolved.set(key, { kind: 'unresolved', subpath: entry.subpath, key, message: entry.error.message, scopeRejected: true });
      place(unresolved.get(key), { conditional: false }, 0, null, roots, true);
      continue;
    }
    const node = load(entry.subpath);
    if (node.kind === 'unresolved') failed = true;
    node.entry = true;
    walkRequired(place(node, { conditional: false }, 0, null, roots, true));
  }
  for (const position of pendingMarked) {
    for (const item of position.node.edges.filter(edge => edge.conditional)) walkAll(follow(position, item));
  }
  const flatten = list => { for (const position of list) { positions.push(position); flatten(position.children); } };
  flatten(roots);

  const conditional = conditionalKeys({ files, skills, links });
  const nodes = [...files.values(), ...skills.values()];
  return {
    failed,
    positions,
    files,
    skills,
    unresolved,
    conditional,
    counts: {
      // A repeated entry counts once in `entries`; the tree-shape decision keeps the raw argument count.
      entries: new Set(entries.map(entry => entry.subpath)).size,
      nodes: files.size,
      conditional: nodes.filter(node => conditional.has(nodeKey(node))).length,
      skills: skills.size,
      unresolved: unresolved.size,
    },
    chars: [...files.values()].reduce((total, node) => total + node.text.length, 0),
  };
}

// The required set: entries and every node a path of unmarked edges reaches. Everything else is conditional.
function conditionalKeys({ files, skills, links }) {
  const required = new Set();
  const outgoing = new Map();
  for (const link of links) {
    if (link.conditional) continue;
    if (!outgoing.has(link.parent)) outgoing.set(link.parent, []);
    outgoing.get(link.parent).push(link.child);
  }
  const queue = [...files.values(), ...skills.values()].filter(node => node.entry).map(nodeKey);
  while (queue.length > 0) {
    const key = queue.pop();
    if (required.has(key)) continue;
    required.add(key);
    for (const child of outgoing.get(key) || []) if (!required.has(child)) queue.push(child);
  }
  const conditional = new Set();
  for (const key of [...files.keys(), ...skills.keys()]) if (!required.has(key)) conditional.add(key);
  return conditional;
}

const size = chars => `${(chars / 1000).toFixed(1)}k`;

function nodeLine({ node, entry }) {
  if (node.kind === 'skill') return `[skill] ${node.name}`;
  if (node.kind === 'unresolved') return `! ${node.subpath}${entry ? '' : '  (unresolved)'}`;
  return `${toSlashes(node.file)}  (${size(node.text.length)})${node.root === 'project' ? ' (project)' : ''}`;
}

function renderGraph(graph) {
  const { entries, nodes, conditional, skills, unresolved } = graph.counts;
  const summary = `graph: ${entries} entries, ${nodes} nodes, ${conditional} conditional, ${skills} skills, ${unresolved} unresolved, ${size(graph.chars)} chars`;
  const lines = [summary, LEGEND];
  for (const position of graph.positions) {
    const indent = '  '.repeat(position.depth);
    const prefix = position.conditional ? '? ' : '';
    if (position.kind === 'alias') {
      const line = position.node.kind === 'skill'
        ? `~ [skill] ${position.node.name}  (already listed)`
        : `~ ${toSlashes(position.node.kind === 'unresolved' ? position.node.subpath : position.node.file)}  (${position.node.kind === 'unresolved' ? 'unresolved' : size(position.node.text.length)})  (already listed)`;
      lines.push(`${indent}${prefix}${line}`);
      continue;
    }
    lines.push(`${indent}${prefix}${nodeLine(position)}`);
  }
  return `${lines.join('\n')}\n`;
}

// Resolves one call and chooses its shape: the content of a single-node closure, or the dependency tree.
// Diagnostics travel for the unresolved requested subpaths only; a nested unresolved path is marked in the tree.
function evaluate({ harness, subpaths, cwd, home, env = process.env, runOpencodePaths = defaultRunOpencodePaths }) {
  const entries = subpaths.map(subpath => {
    try {
      checkSubpath(subpath, harness);
      return { subpath, error: null };
    } catch (error) {
      if (!(error instanceof FetchError)) throw error;
      return { subpath, error };
    }
  });
  const graph = buildGraph({ harness, entries, cwd, home, env, runOpencodePaths: once(runOpencodePaths) });
  const diagnostics = entries.filter(entry => entry.error).map(entry => entry.error.message);
  for (const node of graph.unresolved.values()) if (node.entry) diagnostics.push(node.message);
  const single = entries.length === 1 && !entries[0].error
    && graph.files.size === 1 && graph.skills.size === 0 && graph.unresolved.size === 0
    && [...graph.files.values()][0].edges.length === 0;
  if (single) {
    const node = [...graph.files.values()][0];
    return { text: render({ file: node.file, root: node.root }, harness), code: 0, diagnostics };
  }
  return { text: renderGraph(graph), code: graph.failed ? 1 : 0, diagnostics };
}

function main(argv, { cwd = process.cwd(), home = os.homedir(), env = process.env, runOpencodePaths = defaultRunOpencodePaths, stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const { harness, subpaths } = parseArgs(argv);
    const result = evaluate({ harness, subpaths, cwd, home, env, runOpencodePaths });
    for (const message of result.diagnostics) stderr.write(`${message}\n`);
    stdout.write(result.text);
    return result.code;
  } catch (error) {
    if (!(error instanceof FetchError)) throw error;
    stderr.write(`${error.message}\n`);
    return error.code;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { main, parseArgs, checkSubpath, resolveSubpath, render, parseDirectives, scanDirectives, renderGraph, evaluate, HARNESSES, PREFIXES };
