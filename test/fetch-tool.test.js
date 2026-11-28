'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const manifest = require('../sai/install-manifest.json');
const { translate, validateRegistry } = require('../bin/capabilities');
const { expandInstallManifest } = require('../bin/install-manifest');
const { main, scanDirectives } = require('../skills/universal/fetch/fetch');
const lint = require('../sai/tools/lint');

const repoRoot = path.join(__dirname, '..');
const script = path.join(repoRoot, 'skills/universal/fetch/fetch.js');
const LEGEND = 'legend: ? conditional (not now) | ~ already listed | [skill] load with the skill tool | ! unresolved';

function fixture() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-fetch-tool-'));
  const cwd = path.join(base, 'project');
  const home = path.join(base, 'home');
  fs.mkdirSync(cwd, { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  return { base, cwd, home };
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

// The tool resolves its global root through `harness-root.js`, so the helper hands it an empty environment and a
// silent `opencode debug paths` unless the test supplies its own: no variable of the machine running the suite
// (CLAUDE_CONFIG_DIR, XDG_CONFIG_HOME) and no installed opencode reaches the result.
function run(args, { cwd, home, env = {}, runOpencodePaths = () => ({ status: 1, stdout: '' }) } = {}) {
  let out = '';
  let err = '';
  const code = main(args, { cwd, home, env, runOpencodePaths, stdout: { write: text => { out += text; } }, stderr: { write: text => { err += text; } } });
  return { code, out, err };
}

const slashes = file => path.resolve(file).replace(/\\/g, '/');
const k = text => `${(text.length / 1000).toFixed(1)}k`;
const summary = (entries, nodes, conditional, skills, unresolved, chars) =>
  `graph: ${entries} entries, ${nodes} nodes, ${conditional} conditional, ${skills} skills, ${unresolved} unresolved, ${(chars / 1000).toFixed(1)}k chars`;

test('E1 one entry whose closure is one file prints the content shape with its header', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.claude/sai/policies/x.md'), '# Local\r\nbody');
  write(path.join(home, '.claude/sai/policies/x.md'), 'global');
  const result = run(['--harness', 'claude', 'sai/policies/x.md'], { cwd, home });
  assert.equal(result.code, 0);
  assert.equal(result.err, '');
  assert.equal(result.out, `path: ${slashes(path.join(cwd, '.claude/sai/policies/x.md'))}\nroot: project\n\n# Local\r\nbody`);
});

test('E2 one entry whose single node is above the cap prints the header and the too-large line', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.claude/sai/big.md'), 'x'.repeat(30000));
  write(path.join(cwd, '.claude/sai/fits.md'), 'x'.repeat(29600));
  const big = run(['--harness', 'claude', 'sai/big.md'], { cwd, home });
  assert.equal(big.code, 0);
  assert.match(big.out, /^path: .*\/sai\/big\.md\nroot: project\ntoo-large: /);
  assert.ok(!big.out.includes('xxxx'));
  const fits = run(['--harness', 'claude', 'sai/fits.md'], { cwd, home });
  assert.ok(fits.out.endsWith('x'.repeat(29600)));
});

test('E3 E6 one entry with one file dependency prints the tree, and a nested missing path is marked', () => {
  const { cwd, home } = fixture();
  const a = '# A\n\nFetch `@sai/policies/b.md` and follow it.\n\nFetch `@sai/policies/missing.md`\n';
  write(path.join(cwd, '.claude/sai/policies/a.md'), a);
  const b = '# B\n\nleaf\n';
  write(path.join(cwd, '.claude/sai/policies/b.md'), b);
  const result = run(['--harness', 'claude', 'sai/policies/a.md'], { cwd, home });
  assert.equal(result.code, 0);
  assert.equal(result.err, '');
  assert.equal(result.out, [
    summary(1, 2, 0, 0, 1, a.length + b.length),
    LEGEND,
    `${slashes(path.join(cwd, '.claude/sai/policies/a.md'))}  (${k(a)}) (project)`,
    `  ${slashes(path.join(cwd, '.claude/sai/policies/b.md'))}  (${k(b)}) (project)`,
    '  ! sai/policies/missing.md  (unresolved)',
    '',
  ].join('\n'));
});

test('E4 two entries print the tree shape even when every one is a leaf, in argument order', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.claude/sai/policies/a.md'), 'a');
  write(path.join(cwd, '.claude/sai/policies/b.md'), 'bb');
  const result = run(['--harness', 'claude', 'sai/policies/b.md', 'sai/policies/a.md'], { cwd, home });
  assert.equal(result.code, 0);
  assert.equal(result.out, [
    summary(2, 2, 0, 0, 0, 3),
    LEGEND,
    `${slashes(path.join(cwd, '.claude/sai/policies/b.md'))}  (0.0k) (project)`,
    `${slashes(path.join(cwd, '.claude/sai/policies/a.md'))}  (0.0k) (project)`,
    '',
  ].join('\n'));
});

test('E5 an unresolved entry prints a ! root line, its message on stderr, and exit 1 while the other entry resolves', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.claude/sai/policies/a.md'), 'a');
  const result = run(['--harness', 'claude', 'sai/policies/a.md', 'sai/policies/missing.md'], { cwd, home });
  assert.equal(result.code, 1);
  assert.match(result.out, /^! sai\/policies\/missing\.md$/m);
  assert.match(result.err, /File not found: sai\/policies\/missing\.md \(tried /);
  assert.match(result.out, new RegExp(`${slashes(path.join(cwd, '.claude/sai/policies/a.md'))}`));
});

test('E7 a directive inside a fence, a prose code span, or a template path creates no node and no unresolved entry', () => {
  const { cwd, home } = fixture();
  const a = [
    '## Payload',
    '',
    '```',
    'Fetch @sai/policies/fenced.md',
    '```',
    '',
    'A mention `Fetch @sai/policies/payload.md` stays prose.',
    '',
    '`` `Fetch @sai/policies/template.md` `` stays prose too.',
    '',
    'Fetch `@sai/<path>` names a template.',
    '',
    'Fetch `@sai/policies/real.md`',
    '',
  ].join('\n');
  write(path.join(cwd, '.claude/sai/policies/a.md'), a);
  write(path.join(cwd, '.claude/sai/policies/real.md'), 'real');
  const result = run(['--harness', 'claude', 'sai/policies/a.md'], { cwd, home });
  assert.equal(result.code, 0);
  assert.equal(result.err, '');
  assert.match(result.out, /^graph: /);
  assert.match(result.out, /0 unresolved/);
  assert.ok(!result.out.includes('fenced.md') && !result.out.includes('payload.md') && !result.out.includes('template.md'));
});

test('E8 skill directives resolve to [skill] nodes and the tool never descends into them', () => {
  const { cwd, home } = fixture();
  const a = 'Fetch `@skills/budget/SKILL.md`\nFetch `@skills/fetch/SKILL.md` and follow it.\nFetch `@~/.config/opencode/skills/fetch/SKILL.md` before you continue.\n';
  write(path.join(cwd, '.opencode/sai/policies/a.md'), a);
  write(path.join(cwd, '.opencode/skills/budget/SKILL.md'), 'Fetch `@sai/policies/inside-skill.md`');
  const result = run(['--harness', 'opencode', 'sai/policies/a.md'], { cwd, home });
  assert.equal(result.code, 0);
  assert.equal(result.out, [
    summary(1, 1, 0, 2, 0, a.length),
    LEGEND,
    `${slashes(path.join(cwd, '.opencode/sai/policies/a.md'))}  (${k(a)}) (project)`,
    '  [skill] budget',
    '  [skill] fetch',
    '  ~ [skill] fetch  (already listed)',
    '',
  ].join('\n'));
  assert.ok(!result.out.includes('inside-skill.md'), 'a skill is terminal');
});

test('E9 a cycle prints the second occurrence as an already-listed alias', () => {
  const { cwd, home } = fixture();
  const a = 'Fetch `@sai/policies/b.md`\n';
  const b = 'Fetch `@sai/policies/a.md`\n';
  write(path.join(cwd, '.claude/sai/policies/a.md'), a);
  write(path.join(cwd, '.claude/sai/policies/b.md'), b);
  const result = run(['--harness', 'claude', 'sai/policies/a.md'], { cwd, home });
  assert.equal(result.code, 0);
  const aPath = slashes(path.join(cwd, '.claude/sai/policies/a.md'));
  const bPath = slashes(path.join(cwd, '.claude/sai/policies/b.md'));
  assert.equal(result.out.split(aPath).length - 1, 2);
  assert.equal(result.out.split(bPath).length - 1, 1);
  assert.ok(result.out.includes(`    ~ ${aPath}  (${k(a)})  (already listed)`));
});

test('E10 a project-local copy shadows the global file per node, not per call', () => {
  const { cwd, home } = fixture();
  const a = 'Fetch `@sai/policies/b.md`\nFetch `@sai/policies/c.md`\n';
  write(path.join(cwd, '.claude/sai/policies/a.md'), a);
  write(path.join(cwd, '.claude/sai/policies/b.md'), 'project b');
  write(path.join(home, '.claude/sai/policies/b.md'), 'global b');
  write(path.join(home, '.claude/sai/policies/c.md'), 'global c');
  const result = run(['--harness', 'claude', 'sai/policies/a.md'], { cwd, home });
  assert.equal(result.code, 0);
  assert.match(result.out, new RegExp(`${slashes(path.join(cwd, '.claude/sai/policies/b.md'))}  \\(0\\.0k\\) \\(project\\)`));
  assert.match(result.out, new RegExp(`${slashes(path.join(home, '.claude/sai/policies/c.md'))}  \\(0\\.0k\\)$`, 'm'));
  assert.ok(!result.out.includes(slashes(path.join(home, '.claude/sai/policies/b.md'))));
});

test('E11 a conditional edge is marked, and a node reached only through marked edges stays conditional', () => {
  const { cwd, home } = fixture();
  const a = '## Later\n\nFetch? `@sai/policies/b.md`\n';
  const b = 'Fetch `@sai/policies/c.md`\n';
  write(path.join(cwd, '.claude/sai/policies/a.md'), a);
  write(path.join(cwd, '.claude/sai/policies/b.md'), b);
  write(path.join(cwd, '.claude/sai/policies/c.md'), 'c');
  const result = run(['--harness', 'claude', 'sai/policies/a.md'], { cwd, home });
  assert.equal(result.code, 0);
  assert.match(result.out, /2 conditional/);
  assert.match(result.out, new RegExp(`  \\? ${slashes(path.join(cwd, '.claude/sai/policies/b.md'))}  \\(0\\.0k\\) \\(project\\)`));
  assert.match(result.out, new RegExp(`    ${slashes(path.join(cwd, '.claude/sai/policies/c.md'))}  \\(0\\.0k\\) \\(project\\)`));
});

test('E12 a file whose only dependency is a skill returns the tree, not its content', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.claude/sai/policies/a.md'), 'Fetch `@skills/budget/SKILL.md`\n');
  const result = run(['--harness', 'claude', 'sai/policies/a.md'], { cwd, home });
  assert.equal(result.code, 0);
  assert.match(result.out, /^graph: 1 entries, 1 nodes, 0 conditional, 1 skills, 0 unresolved, /);
  assert.ok(!result.out.includes('path: '));
});

test('naming a subpath twice returns its root line and no content, so a tool can be located without reading it', () => {
  const { cwd, home } = fixture();
  const file = path.join(cwd, '.opencode/sai/tools/transfer.js');
  write(file, '// tool');
  const result = run(['--harness', 'opencode', 'sai/tools/transfer.js', 'sai/tools/transfer.js'], { cwd, home });
  assert.equal(result.code, 0);
  assert.equal(result.out, [
    summary(1, 1, 0, 0, 0, 7),
    LEGEND,
    `${slashes(file)}  (0.0k) (project)`,
    '',
  ].join('\n'));
});

test('a repeated entry counts once in the tree and a distinct spelling stays distinct', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.claude/sai/policies/a.md'), 'CONTENT-A');
  const result = run(['--harness', 'claude', 'sai/policies/a.md', 'sai\\policies\\a.md', 'sai/policies/a.md'], { cwd, home });
  assert.equal(result.code, 0);
  assert.match(result.out, /^graph: 2 entries, 1 nodes, 0 conditional, 0 skills, 0 unresolved, /);
  assert.equal(result.out.match(/\(already listed\)/g).length, 1);
  assert.ok(!result.out.includes('CONTENT-A'));
});

test('E6 opencode runs debug paths at most once per call, whatever the number of subpaths that reach it', () => {
  const { base, cwd, home } = fixture();
  const config = path.join(base, 'xdg', 'opencode');
  write(path.join(config, 'sai/policies/y.md'), 'xdg');
  write(path.join(config, 'sai/policies/z.md'), 'xdg');
  let calls = 0;
  const runOpencodePaths = () => { calls += 1; return { status: 0, stdout: `config     ${config}\n` }; };
  const result = run(['--harness', 'opencode', 'sai/policies/y.md', 'sai/policies/z.md', 'sai/policies/none.md'], { cwd, home, runOpencodePaths });
  assert.equal(result.code, 1);
  assert.equal(calls, 1);
  assert.equal(result.out.split('(project)').length - 1, 0);
  assert.match(result.out, /2 nodes, 0 conditional, 0 skills, 1 unresolved/);
});

test('scope and traversal are rejected before any filesystem access, with the unchanged messages', () => {
  const { cwd, home } = fixture();
  write(path.join(home, 'secret.md'), 'secret');
  const outside = ['vendor/notes.md', 'sai', 'sai/', '/etc/passwd', 'C:/Windows/win.ini', 'C:\\x', '~/x.md', 'sai/../secret.md', 'sai/..\\..\\secret.md',
    'sai//x.md', 'sai/./x.md', '', '../secret.md', '.claude/sai/x.md'];
  for (const subpath of outside) {
    const result = run(['--harness', 'claude', subpath], { cwd, home });
    assert.equal(result.code, 1, subpath);
    assert.equal(result.out.split('\n')[2], `! ${subpath}`, subpath);
    assert.match(result.err, /sai\/, commands\/, skills\//, subpath);
  }
});

test('a skill subpath is rejected with the harness skill tool, and a plain file under skills resolves', () => {
  const { cwd, home } = fixture();
  write(path.join(home, '.claude/skills/budget/SKILL.md'), 'skill');
  const claude = run(['--harness', 'claude', 'skills/budget/SKILL.md'], { cwd, home });
  assert.equal(claude.code, 1);
  assert.match(claude.err, /`Skill` tool/);
  assert.match(run(['--harness', 'opencode', 'skills/budget/SKILL.md'], { cwd, home }).err, /`skill` tool/);
  write(path.join(home, '.claude/skills/budget/other.md'), 'plain');
  assert.equal(run(['--harness', 'claude', 'skills/budget/other.md'], { cwd, home }).code, 0);
});

test('a missing or unknown harness and an unknown option are usage errors that read nothing', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.claude/sai/a.md'), 'a');
  for (const args of [['sai/a.md'], ['--harness', 'copilot', 'sai/a.md'], ['--harness'], ['--harness', 'claude'],
    ['--harness', 'claude', '--cwd', 'x', 'sai/a.md'], ['--harness', 'claude', 'sai/a.md', 'sai/b.md', '--cwd', 'x'],
    ['--harness', 'copilot', 'sai/a.md', 'sai/b.md']]) {
    const result = run(args, { cwd, home });
    assert.equal(result.code, 2, args.join(' '));
    assert.equal(result.out, '');
  }
});

test('an unreadable file is a declared error of that subpath alone, with no stack trace', { skip: process.platform === 'win32' || (process.getuid && process.getuid() === 0) }, () => {
  const { cwd, home } = fixture();
  const locked = path.join(home, '.claude/sai/locked.md');
  write(locked, 'secret');
  write(path.join(home, '.claude/sai/open.md'), 'open');
  fs.chmodSync(locked, 0o000);
  try {
    const single = run(['--harness', 'claude', 'sai/locked.md'], { cwd, home });
    assert.equal(single.code, 1);
    assert.match(single.out, /^! sai\/locked\.md$/m);
    assert.match(single.err, /^File cannot be read: sai\/locked\.md \(.*locked\.md: EACCES\)\n$/);
    assert.ok(!single.err.includes('    at '));
    const batch = run(['--harness', 'claude', 'sai/locked.md', 'sai/open.md'], { cwd, home });
    assert.equal(batch.code, 1);
    assert.match(batch.out, /^! sai\/locked\.md$/m);
    assert.match(batch.out, new RegExp(slashes(path.join(home, '.claude/sai/open.md'))));
  } finally {
    fs.chmodSync(locked, 0o600);
  }
});

test('a root or a file reached through a symbolic link resolves, and the lexical scope still rejects escapes', { skip: process.platform === 'win32' }, () => {
  const { base, cwd, home } = fixture();
  const shared = path.join(base, 'shared');
  write(path.join(shared, 'sai/policies/l.md'), 'linked');
  fs.symlinkSync(shared, path.join(home, '.claude'), 'dir');
  const viaRoot = run(['--harness', 'claude', 'sai/policies/l.md'], { cwd, home });
  assert.equal(viaRoot.code, 0);
  assert.match(viaRoot.out, /root: global\n\nlinked$/);
  fs.symlinkSync(path.join(shared, 'sai/policies/l.md'), path.join(shared, 'sai/policies/alias.md'));
  assert.match(run(['--harness', 'claude', 'sai/policies/alias.md'], { cwd, home }).out, /\n\nlinked$/);
});

test('the script runs as a command and takes its local root from the working directory', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.opencode/sai/a.md'), 'cli');
  const result = spawnSync(process.execPath, [script, '--harness', 'opencode', 'sai/a.md'], { cwd, encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: '', XDG_CONFIG_HOME: '' } });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /root: project\n\ncli$/);
  assert.equal(spawnSync(process.execPath, [script, 'sai/a.md'], { cwd, encoding: 'utf8' }).status, 2);
});

// The golden fixture copies the two real instruction files and stubs every node they name, so the tree shape of
// the repository's own entry files is pinned.
test('I6 the golden tree of sai/commands/explore/body.md plus sai/adapters/opencode/idea-list-render.md', () => {
  const { cwd, home } = fixture();
  const bodyFile = path.join(cwd, '.opencode/sai/commands/explore/body.md');
  const renderFile = path.join(cwd, '.opencode/sai/adapters/opencode/idea-list-render.md');
  write(bodyFile, fs.readFileSync(path.join(repoRoot, 'sai/commands/explore/body.md'), 'utf8'));
  write(renderFile, fs.readFileSync(path.join(repoRoot, 'sai/adapters/opencode/idea-list-render.md'), 'utf8'));
  const stubbed = new Map();
  for (const file of [bodyFile, renderFile]) {
    for (const occurrence of scanDirectives(fs.readFileSync(file, 'utf8'))) {
      if (!occurrence.active || occurrence.skill) continue;
      const target = path.join(cwd, '.opencode', occurrence.subpath);
      if (stubbed.has(target)) continue;
      const text = `# ${occurrence.subpath}\n`;
      write(target, text);
      stubbed.set(target, text);
    }
  }
  const bodyText = fs.readFileSync(bodyFile, 'utf8');
  const renderText = fs.readFileSync(renderFile, 'utf8');
  const node = absolute => `${slashes(absolute)}  (${k(stubbed.get(absolute))}) (project)`;
  const chars = bodyText.length + renderText.length + [...stubbed.values()].reduce((total, text) => total + text.length, 0);
  const result = run(['--harness', 'opencode', 'sai/commands/explore/body.md', 'sai/adapters/opencode/idea-list-render.md'], { cwd, home });
  assert.equal(result.code, 0);
  const expected = [
    summary(2, 15, 4, 4, 0, chars),
    LEGEND,
    `${slashes(bodyFile)}  (${k(bodyText)}) (project)`,
    `  ${node(path.join(cwd, '.opencode/sai/policies/verified-precondition-handback.md'))}`,
    `  ${node(path.join(cwd, '.opencode/sai/policies/public-chat.md'))}`,
    `  ${node(path.join(cwd, '.opencode/sai/policies/tool-access.md'))}`,
    `  ${node(path.join(cwd, '.opencode/sai/policies/prereqs-paths.md'))}`,
    `  ${node(path.join(cwd, '.opencode/sai/policies/prereqs-check.md'))}`,
    '  [skill] safe-operations',
    '  [skill] budget',
    `  ${node(path.join(cwd, '.opencode/sai/commands/explore/instructions.md'))}`,
    '  [skill] openspec-explore',
    `  ${node(path.join(cwd, '.opencode/sai/policies/remember.md'))}`,
    `  ${node(path.join(cwd, '.opencode/sai/policies/question-context.md'))}`,
    `  ${node(path.join(cwd, '.opencode/sai/policies/tool-resolution.md'))}`,
    `  ? ${node(path.join(cwd, '.opencode/sai/policies/obstacle-escalation.md'))}`,
    `  ? ${node(path.join(cwd, '.opencode/sai/policies/investigation-batch.md'))}`,
    `  ? ${node(path.join(cwd, '.opencode/sai/policies/worker-lifecycle.md'))}`,
    '  ? [skill] from-backlog',
    `${slashes(renderFile)}  (${k(renderText)}) (project)`,
    `  ${node(path.join(cwd, '.opencode/sai/adapters/opencode/panel-render.md'))}`,
    '',
  ].join('\n');
  assert.equal(result.out, expected);
});

test('both fetch skills describe the tree, the marked form, and the batch in their own harness terms', () => {
  for (const harness of ['claude', 'opencode']) {
    const skillTool = harness === 'claude' ? 'Skill' : 'skill';
    const read = harness === 'claude' ? 'Read' : 'read';
    const text = fs.readFileSync(path.join(repoRoot, 'skills', harness, 'fetch', 'SKILL.md'), 'utf8');
    assert.ok(text.includes(`node "<base directory>/fetch.js" --harness ${harness} <subpath> [<subpath> ...]`), harness);
    assert.ok(text.includes(`node ${harness === 'claude' ? '.claude' : '.opencode'}/skills/fetch/fetch.js --harness ${harness} <subpath>`), harness);
    assert.ok(text.includes('Fetch `@skills/<name>/SKILL.md`'), harness);
    assert.ok(text.includes('Fetch? `@<subpath>`'), harness);
    assert.ok(text.includes('**The content shape.**'), harness);
    assert.ok(text.includes('**The tree shape.**'), harness);
    assert.ok(text.includes('legend: ? conditional (not now) | ~ already listed | [skill] load with the skill tool | ! unresolved'), harness);
    assert.ok(text.includes('A node line carries the absolute resolved path and the size in thousands of characters'), harness);
    assert.ok(text.includes('name the subpath twice in one call'), harness);
    assert.ok(text.includes('### Batching'), harness);
    assert.ok(text.includes('unconditional directives known at that moment that have no loaded copy'), harness);
    assert.ok(text.includes('in one fetch call'), harness);
    assert.ok(text.includes(`directive of the batch with the \`${skillTool}\` tool`), harness);
    assert.ok(text.includes('Read every node path the tree lists for the required set in parallel, in a single turn'), harness);
    assert.ok(text.includes('a marked directive joins a batch only once its condition holds'), harness);
    assert.ok(text.includes('those are the next batch'), harness);
    assert.ok(text.includes('the full ' + read + ' of the header `path` after a `too-large` result'), harness);
    assert.ok(text.includes('stop that directive and report the message'), harness);
    assert.ok(text.includes('Do not fall back to resolving the path yourself'), harness);
    assert.ok(text.includes('backslashes turned into forward slashes and nothing else, double-quoted'), harness);
    assert.ok(text.includes('tool-resolution.md'), harness);
    assert.doesNotMatch(text, /one subpath per call|one call at a time|once per directive|subpath: <argument>/);
  }
});

test('both fetch skills route a marked skill directive to the skill tool before the generic marked row', () => {
  for (const harness of ['claude', 'opencode']) {
    const skillTool = harness === 'claude' ? 'Skill' : 'skill';
    const text = fs.readFileSync(path.join(repoRoot, 'skills', harness, 'fetch', 'SKILL.md'), 'utf8');
    const markedSkill = text.indexOf('| `Fetch? @skills/<name>/SKILL.md`');
    const genericMarked = text.indexOf('| `Fetch? @<subpath>`');
    assert.ok(markedSkill >= 0, `${harness} documents the marked skill directive`);
    assert.ok(genericMarked >= 0, `${harness} documents the generic marked directive`);
    assert.ok(markedSkill < genericMarked, `${harness} resolves the marked skill form before the generic marked row`);
    const row = text.slice(markedSkill, text.indexOf('\n', markedSkill));
    assert.ok(row.includes(`\`${skillTool}\` tool`), `${harness}: the marked skill row loads the skill with the ${skillTool} tool`);
  }
});

test('every capability profile of both harnesses may run the fetch tool', () => {
  const registry = manifest.capabilities;
  validateRegistry(registry);
  for (const harness of ['claude', 'opencode']) {
    const root = harness === 'claude' ? '~/.claude' : '~/.config/opencode';
    const local = harness === 'claude' ? '.claude' : '.opencode';
    for (const name of Object.keys(registry.profiles)) {
      const grants = translate(registry, name, harness, `/home/u/${harness === 'claude' ? '.claude' : '.config/opencode'}`);
      const wildcard = registry.profiles[name].shell?.includes('*') || (harness === 'claude' && grants.allowedTools.split(', ').includes('Bash') && grants.allowedTools.split(', ').includes('PowerShell') && grants.profile.shell?.includes('*'));
      if (harness === 'claude') {
        const allowed = grants.allowedTools.split(', ');
        for (const shell of ['Bash', 'PowerShell']) {
          const covered = wildcard && allowed.includes(shell);
          for (const location of [`${local}`, root]) assert.ok(covered || allowed.includes(`${shell}(node ${location}/skills/fetch/fetch.js:*)`), `${name} ${shell} ${location}`);
          assert.ok(covered || allowed.includes(`${shell}(node "/home/u/.claude/skills/fetch/fetch.js":*)`), `${name} ${shell} absolute`);
        }
      } else {
        const rules = grants.permissions.filter(rule => rule.action === 'shell' && rule.effect === 'allow').map(rule => rule.resource);
        for (const resource of [`node ${local}/skills/fetch/fetch.js *`, `node ${root}/skills/fetch/fetch.js *`, 'node "/home/u/.config/opencode/skills/fetch/fetch.js" *']) {
          assert.ok(rules.includes('*') || rules.includes(resource), `${name} ${resource}`);
        }
      }
      assert.ok(grants.toolRequirements.some(item => item.capability === 'shell'), `${name} requires a shell`);
    }
  }
});

test('the manifest installs fetch.js beside each harness fetch skill', () => {
  for (const harness of ['claude', 'opencode']) {
    const base = path.join(os.tmpdir(), 'sai-fetch-projection', harness);
    const destinationRoot = Object.fromEntries(['commands', 'agents', 'sai', 'skills', 'config', 'root'].map(key => [key, path.join(base, key)]));
    const projections = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const tool = projections.find(item => item.destinationPath === path.join(destinationRoot.skills, 'fetch', 'fetch.js'));
    assert.ok(tool, `${harness} installs fetch.js`);
    assert.equal(tool.ownership, 'managed');
    assert.equal(tool.drift, 'content');
    assert.ok(projections.some(item => item.destinationPath === path.join(destinationRoot.skills, 'fetch', 'SKILL.md')));
  }
});

test('the manifest installs harness-root.js beside fetch.js for both harnesses', () => {
  const { expandInstallManifest: expand } = require('../bin/install-manifest');
  for (const harness of ['claude', 'opencode']) {
    const base = path.join(os.tmpdir(), `sai-root-${harness}`);
    const roots = { commands: path.join(base, 'commands'), sai: path.join(base, 'sai'), skills: path.join(base, 'skills'), agents: path.join(base, 'agents'), config: base, root: base };
    const destinations = expand(manifest, { harness, repoRoot, destinationRoot: roots }).map(projection => projection.destinationPath);
    assert.ok(destinations.includes(path.join(base, 'skills', 'fetch', 'fetch.js')), harness);
    assert.ok(destinations.includes(path.join(base, 'skills', 'fetch', 'harness-root.js')), harness);
  }
});

test('lint fetch-directives passes over the installed instruction roots', () => {
  const parser = lint.fetchParser();
  assert.ok(parser, 'the graph parser resolves');
  const violations = [];
  for (const root of ['sai', 'skills', 'commands', 'agents']) {
    for (const file of lint.markdownFiles(path.join(repoRoot, root))) {
      violations.push(...lint.checkFetchDirectives(fs.readFileSync(file, 'utf8'), path.relative(repoRoot, file), parser));
    }
  }
  assert.deepEqual(violations, []);
});

test('lint fetch-directives reports the broken form, a marker without a condition, and an unmarked conditional heading', () => {
  const parser = lint.fetchParser();
  const content = [
    'Fetch? `@sai/policies/a.md`',
    '',
    'When the run stops, Fetch?@sai/policies/b.md',
    '',
    '## Optional actions',
    '',
    'Fetch `@sai/policies/c.md`',
    '',
  ].join('\n');
  const found = lint.checkFetchDirectives(content, 'sai/x.md', parser).map(violation => `${violation.line}:${violation.problem}`);
  assert.deepEqual(found, [
    '1:FETCH_MARKER_WITHOUT_CONDITION',
    '3:FETCH_DIRECTIVE_FORM',
    '7:FETCH_UNMARKED_CONDITIONAL',
  ]);
});
