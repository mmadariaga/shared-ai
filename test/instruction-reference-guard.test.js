'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const INSTALLED_ROOTS = ['sai', 'skills', 'commands', 'agents'];
const CUSTOMIZATION_MARKER = '<!-- User customizations below this line -->';
// `@~/.config/...` (the opencode fetch bootstrap) never matches: a reference starts with one of three roots.
const REFERENCE = /@(?:sai|skills|commands)\/[A-Za-z0-9_\-./<>{}*$…]*/g;
const FENCE_OPEN = /^\s*(```+|~~~+)/;

function markdownFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(absolute);
    return entry.isFile() && entry.name.endsWith('.md') ? [absolute] : [];
  });
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

function referenceTokens(text) {
  return [...text.matchAll(REFERENCE)].map(match => ({
    index: match.index,
    path: match[0].replace(/[.,;:]+$/, '').slice(1),
  }));
}

// Violations of one file: a bare reference (outside an inline code span), or a fenced reference
// that names an existing file. `fileExists` takes a repository-relative path.
function findViolations(relativePath, content, fileExists) {
  const violations = [];
  const lines = content.split(/\r?\n/);
  let paragraph = [];
  let paragraphStart = 0;
  let fence = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join('\n');
    const spans = inlineCodeSpans(text);
    for (const token of referenceTokens(text)) {
      if (spans.some(([start, end]) => token.index >= start && token.index < end)) continue;
      const line = paragraphStart + text.slice(0, token.index).split('\n').length;
      violations.push(`${relativePath}:${line}: reference @${token.path} sits outside an inline code span`);
    }
    paragraph = [];
  };

  for (const [index, line] of lines.entries()) {
    if (line.startsWith(CUSTOMIZATION_MARKER)) break;
    const fenceMatch = FENCE_OPEN.exec(line);
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence) fence = null;
      else {
        for (const token of referenceTokens(line)) {
          if (/[<>{}*$…]/.test(token.path) || !fileExists(token.path)) continue;
          violations.push(`${relativePath}:${index + 1}: fenced reference @${token.path} names an existing file`);
        }
      }
      continue;
    }
    if (fenceMatch) {
      flushParagraph();
      fence = fenceMatch[1][0];
      continue;
    }
    if (line.trim() === '') { flushParagraph(); continue; }
    if (paragraph.length === 0) paragraphStart = index;
    paragraph.push(line);
  }
  flushParagraph();
  return violations;
}

test('installed instruction files write every @sai/, @skills/, and @commands/ reference inside an inline code span', () => {
  const violations = [];
  const fileExists = relative => {
    const absolute = path.join(repoRoot, relative);
    return fs.existsSync(absolute) && fs.statSync(absolute).isFile();
  };
  for (const root of INSTALLED_ROOTS) {
    for (const filePath of markdownFiles(path.join(repoRoot, root))) {
      const relativePath = path.relative(repoRoot, filePath).split(path.sep).join('/');
      violations.push(...findViolations(relativePath, fs.readFileSync(filePath, 'utf8'), fileExists));
    }
  }
  assert.deepEqual(violations, [], 'wrap each reference in backticks so Claude Code does not attach the referenced file on its own');
});

test('the guard flags a bare reference with its file and line, and accepts wrapped ones', () => {
  const content = [
    'Fetch `@sai/policies/a.md` and follow it exactly.',
    '',
    'Fetch @sai/policies/b.md and follow it exactly.',
    'See ``Fetch `@skills/x/SKILL.md` `` and @commands/c.md.',
    'A span `that opens here and runs',
    'over two lines`, resolved per `@sai/d.md` and `@sai/e.md`.',
    'Opencode bootstrap: Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.',
  ].join('\n');
  assert.deepEqual(findViolations('sai/x.md', content, () => false), [
    'sai/x.md:3: reference @sai/policies/b.md sits outside an inline code span',
    'sai/x.md:4: reference @commands/c.md sits outside an inline code span',
  ]);
});

test('the guard ignores text below the customization marker', () => {
  const content = `Fetch \`@sai/a.md\`\n\n${CUSTOMIZATION_MARKER}\nFetch @sai/b.md\n`;
  assert.deepEqual(findViolations('commands/claude/x.md', content, () => false), []);
});

test('the guard flags a fenced reference only when it names an existing file', () => {
  const content = [
    'Example:',
    '',
    '```',
    'Fetch @sai/policies/real.md',
    'Fetch @sai/<path>',
    'Fetch @sai/commands/{name}/body.md',
    'Fetch @sai/policies/missing.md',
    '```',
    '',
    'Fetch @sai/policies/after.md',
  ].join('\n');
  assert.deepEqual(findViolations('sai/x.md', content, relative => relative === 'sai/policies/real.md'), [
    'sai/x.md:4: fenced reference @sai/policies/real.md names an existing file',
    'sai/x.md:10: reference @sai/policies/after.md sits outside an inline code span',
  ]);
});
