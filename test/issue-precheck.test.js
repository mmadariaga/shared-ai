'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const toolPath = path.join(root, 'sai', 'tools', 'issue-precheck.js');
const precheck = require(toolPath);
const { checkDocument } = require('../sai/tools/change-document');

function temporaryDirectory(prefix) {
  return fs.mkdtempSync(path.join(fs.existsSync('/tmp/opencode') ? '/tmp/opencode' : os.tmpdir(), prefix));
}

function git(cwd, args) {
  const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function makeRepository() {
  const directory = temporaryDirectory('issue-precheck-');
  git(directory, ['init', '-q']);
  fs.mkdirSync(path.join(directory, 'src'), { recursive: true });
  fs.mkdirSync(path.join(directory, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'src', 'widget.js'), [
    "'use strict';",
    'function read() { return CommercialQuoteStatus; }',
    'module.exports = { read };',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(directory, 'docs', 'guide.md'), '# Guide\n\nOne line.\n');
  git(directory, ['add', '-A']);
  return directory;
}

const ISSUE = [
  '# Keep the widget status in sync',
  '',
  '## Problem',
  '`QuoteStatus` does not exist; the type is `CommercialQuoteStatus`.',
  '',
  '## Goal',
  'Read `src/widget.js:2` and never `src/widget.js:99`.',
  '',
  '## Scope',
  '- `src/missing.js` is gone.',
  '- `guide.md` is cited by its bare name.',
  '- `docs/guide.md:1` is inside its file.',
  '- `NewWidget` is the symbol this change proposes.',
  '',
  '## Non-goals',
  'None.',
  '',
  '## Open questions',
  'None.',
  '',
  '## Maturity',
  'Ready to propose',
  '',
].join('\n');

test('check reports missing paths, out-of-range lines, and missing symbols with their section', () => {
  const cwd = makeRepository();
  try {
    const result = precheck.checkIssue(ISSUE, { cwd });
    assert.ok(result.checked > 0);
    const missing = result.missing.map((entry) => `${entry.kind}:${entry.ref}:${entry.section}`);
    assert.ok(missing.includes('symbol:QuoteStatus:Problem'), 'a missing symbol is named with its section');
    assert.ok(!missing.includes('symbol:CommercialQuoteStatus:Problem'), 'an existing symbol is not missing');
    assert.ok(missing.includes('path-line:src/widget.js:99:Goal'), 'a line past the end of its file is missing');
    assert.ok(!missing.some((entry) => entry.ref === 'src/widget.js:2'), 'a line inside its file is not missing');
    assert.ok(missing.includes('path:src/missing.js:Scope'), 'a missing path is named with its section');
    assert.ok(!missing.some((entry) => entry.ref === 'guide.md'), 'a bare filename resolves to its tracked file');
    assert.ok(!missing.some((entry) => entry.ref === 'docs/guide.md:1'), 'an in-range path:line is not missing');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('a newly proposed symbol is listed without an error, and the check informs rather than decides', () => {
  const cwd = makeRepository();
  try {
    const directory = temporaryDirectory('issue-precheck-run-');
    const issueFile = path.join(directory, 'issue.md');
    const outputFile = path.join(directory, 'out.json');
    fs.writeFileSync(issueFile, ISSUE);
    const result = spawnSync(process.execPath, [toolPath, 'check', '--input-file', issueFile, '--cwd', cwd], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.deepEqual(Object.keys(payload).sort(), ['checked', 'missing', 'unchecked']);
    assert.equal(payload.unchecked, 0);
    assert.ok(payload.missing.some((entry) => entry.ref === 'NewWidget' && entry.kind === 'symbol' && entry.section === 'Scope'));
    assert.ok(payload.missing.every((entry) => entry.kind && entry.ref && entry.section));
    fs.writeFileSync(outputFile, result.stdout);
    assert.ok(fs.readFileSync(outputFile, 'utf8').length > 0);
    fs.rmSync(directory, { recursive: true, force: true });
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('non-references, commands, URLs, options, and ordinary words are not checked', () => {
  const cwd = makeRepository();
  try {
    const text = [
      '# No references to check',
      '',
      '## Problem',
      'Run `git grep -w -F -l` and `/sai-explore` with `work`/`context`, an `https://example.com/doc` link, and `--document-file`.',
      '',
      '## Goal',
      'None.',
      '',
      '## Scope',
      '- None.',
      '',
      '## Non-goals',
      'None.',
      '',
      '## Maturity',
      'Ready to propose',
      '',
    ].join('\n');
    const result = precheck.checkIssue(text, { cwd });
    assert.equal(result.checked, 0);
    assert.deepEqual(result.missing, []);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('the CLI rejects a wrong invocation with exit 2 and changes nothing', () => {
  const directory = temporaryDirectory('issue-precheck-usage-');
  try {
    const issueFile = path.join(directory, 'issue.md');
    fs.writeFileSync(issueFile, ISSUE);
    const run = (args) => spawnSync(process.execPath, [toolPath, ...args], { encoding: 'utf8', cwd: directory });
    assert.equal(run([]).status, 2);
    assert.equal(run(['check']).status, 2);
    assert.equal(run(['check', '--input-file', issueFile]).status, 2);
    assert.equal(run(['check', '--input-file', issueFile, '--cwd', directory, '--bogus']).status, 2);
    assert.equal(run(['check', '--input-file', path.join(directory, 'missing.md'), '--cwd', directory]).status, 2);
    assert.equal(run(['check', '--input-file', issueFile, '--cwd', path.join(directory, 'missing')]).status, 2);
    assert.equal(fs.readdirSync(directory).length, 1, 'a usage error creates nothing');
    const help = run(['check', '--help']);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /Usage: /);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('the issue format of a composed document keeps its parse after the precheck', () => {
  const cwd = makeRepository();
  try {
    const text = [
      '# A change',
      '',
      '## Problem',
      '`CommercialQuoteStatus` exists.',
      '',
      '## Goal',
      'Use it.',
      '',
      '## Scope',
      '- Use the type.',
      '',
      '## Non-goals',
      'None.',
      '',
      '## Open questions',
      'None.',
      '',
      '## Maturity',
      'Ready to propose',
      '',
      '## Change',
      '',
      '- Change name: a-change',
      '- Depends on: None',
      '- Backlog origin: https://github.com/owner/repo/issues/12',
      '',
    ].join('\n');
    assert.equal(checkDocument(text).dispatchable, true);
    assert.deepEqual(precheck.checkIssue(text, { cwd }).missing, []);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('a path outside the project is reported missing and never read, even when it exists', () => {
  const cwd = makeRepository();
  try {
    const outside = path.relative(cwd, path.join(root, 'package.json'));
    const text = ['# Outside', '', '## Problem', `\`${outside}:1\` and \`${path.join(root, 'package.json')}\` and \`../package.json\`.`, ''].join('\n');
    const result = precheck.checkIssue(text, { cwd });
    assert.deepEqual(result.missing.map((entry) => entry.kind).sort(), ['path', 'path', 'path-line']);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('a bare filename matches a tracked file of exactly that name, not a suffix of another name', () => {
  const cwd = makeRepository();
  try {
    fs.writeFileSync(path.join(cwd, 'src', 'mywidget.ts'), 'export {};\n');
    git(cwd, ['add', '-A']);
    const text = ['# Names', '', '## Problem', '`widget.ts` is not `mywidget.ts`, and `widget.js:2` is.', ''].join('\n');
    const result = precheck.checkIssue(text, { cwd });
    assert.deepEqual(result.missing.map((entry) => entry.ref), ['widget.ts']);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('symbols git cannot search are counted as unchecked, never as found', () => {
  const cwd = temporaryDirectory('issue-precheck-norepo-');
  try {
    const text = ['# No repository', '', '## Problem', '`fooBarBaz` and `other_thing` and `fooBarBaz`.', ''].join('\n');
    const result = precheck.checkIssue(text, { cwd });
    assert.deepEqual(result, { checked: 0, unchecked: 2, missing: [] });
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('a repeated reference is checked once and listed once per section', () => {
  const cwd = makeRepository();
  try {
    const text = ['# Repeats', '', '## Problem', '`QuoteStatus`, `QuoteStatus`, and `src/widget.js:2:7`.', '', '## Goal', '`QuoteStatus` again.', ''].join('\n');
    const result = precheck.checkIssue(text, { cwd });
    assert.equal(result.checked, 2);
    assert.deepEqual(result.missing, [
      { kind: 'symbol', ref: 'QuoteStatus', section: 'Problem' },
      { kind: 'symbol', ref: 'QuoteStatus', section: 'Goal' },
    ]);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
