'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// The instruction surface that spells tool calls. `docs/`, `README.md`, manifests, and fixtures are not scanned.
const SCANNED_ROOTS = ['sai/commands', 'sai/policies', 'skills', 'sai/orchestration', 'agents'];

// The tool markers and the calls each one names, read from the tools' own USAGE declarations.
const TOOLS = [
  { marker: '<transfer-path>', name: 'transfer.js', calls: Object.keys(require(path.join(ROOT, 'sai/tools/transfer.js')).USAGE.subcommands) },
  { marker: '<sai-state-path>', name: 'sai-state.js', calls: Object.keys(require(path.join(ROOT, 'bin/sai-state.js')).USAGE.subcommands) },
];

const PLACEHOLDER = /^<[^<>\n]+>$/;

function markdownFiles(directory) {
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...markdownFiles(absolute));
    else if (entry.isFile() && entry.name.endsWith('.md')) found.push(absolute);
  }
  return found;
}

// One line's candidate invocation texts: its fenced line, its inline code spans, and the rest of the line.
function invocationTexts(lines) {
  const candidates = [];
  let inFence = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      candidates.push({ line: index + 1, text: line });
      continue;
    }
    let rest = line;
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      candidates.push({ line: index + 1, text: match[1] });
      rest = rest.replace(match[0], ' ');
    }
    if (/node\s+<(?:transfer|sai-state)-path>/.test(rest)) candidates.push({ line: index + 1, text: rest });
  }
  return candidates;
}

// Every spelled invocation of `text`, each with the text that follows its subcommand or verb.
function spelledInvocations(text) {
  const found = [];
  for (const tool of TOOLS) {
    const pattern = new RegExp(`node\\s+${tool.marker}\\s+(\\S+)`, 'g');
    for (const match of text.matchAll(pattern)) {
      const call = match[1];
      if (!PLACEHOLDER.test(call) && !tool.calls.includes(call)) continue;
      found.push({ tool, call, after: text.slice(match.index + match[0].length) });
    }
  }
  return found;
}

test('every spelled transfer.js or sai-state call carries --note immediately after the subcommand or verb', () => {
  const problems = [];
  for (const root of SCANNED_ROOTS) {
    const directory = path.join(ROOT, root);
    if (!fs.existsSync(directory)) continue;
    for (const file of markdownFiles(directory)) {
      const relative = path.relative(ROOT, file).split(path.sep).join('/');
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      for (const candidate of invocationTexts(lines)) {
        if (candidate.text.includes('--help')) continue;
        for (const invocation of spelledInvocations(candidate.text)) {
          // The note is a separate double-quoted string, or a `<...>` placeholder of the convention.
          if (!/^\s+--note\s+(?:"[^"\n]*"|<[^<>\n]+>)/.test(invocation.after)) {
            problems.push(`${relative}:${candidate.line}: ${invocation.tool.name} ${invocation.call} does not carry --note immediately after the subcommand or verb (${candidate.text.trim()})`);
          }
        }
      }
    }
  }
  assert.deepEqual(problems, []);
});
