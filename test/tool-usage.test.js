'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const usage = require('../sai/tools/usage');

const ROOT = path.join(__dirname, '..');

// The agent-facing deterministic tools. `kind` is how the tool reports a usage error: `text` prints the block to
// stderr, `json` adds `usage` and `examples` to the JSON object it already prints on stdout. `keep` lists the keys of
// that object that a usage error has always carried. `subcommands` is the closed list its parser accepts; a tool
// without subcommands lists none.
const TOOLS = [
  { name: 'commit', file: 'sai/tools/commit.js', kind: 'text', subcommands: ['collect', 'apply'] },
  { name: 'to-pr', file: 'sai/tools/to-pr.js', kind: 'json', keep: { status: 'blocked' }, subcommands: ['prepare', 'collect', 'resolve', 'destination', 'query', 'push-query', 'push', 'publish', 'recover', 'resume', 'plan-query', 'plan-commit'] },
  { name: 'to-backlog', file: 'sai/tools/to-backlog.js', kind: 'json', keep: { status: 'failure_before_publication' }, subcommands: ['resolve', 'resolve-origin', 'query', 'publish', 'recover', 'read-update', 'query-update', 'update', 'recover-update', 'query-set', 'publish-set', 'recover-set', 'continue-set', 'query-set-update', 'update-set', 'recover-set-update', 'continue-set-update', 'lookup-slice', 'inspect-assignment', 'propose-assignment', 'assign', 'verify-assignment'] },
  { name: 'from-backlog', file: 'sai/tools/from-backlog.js', kind: 'json', keep: { status: 'error', reason: 'usage' }, subcommands: ['resolve', 'read', 'detect'] },
  { name: 'from-next-backlog-item', file: 'sai/tools/from-next-backlog-item.js', kind: 'json', keep: { status: 'pending', reason: 'usage' }, subcommands: ['select'] },
  { name: 'file-manifest', file: 'sai/tools/file-manifest.js', kind: 'text', subcommands: ['fold', 'verify', 'format', 'writeback'] },
  { name: 'check-delta-headers', file: 'sai/tools/check-delta-headers.js', kind: 'text', subcommands: [] },
  { name: 'scenario-coverage', file: 'sai/tools/scenario-coverage.js', kind: 'text', subcommands: ['step', 'change'] },
  { name: 'test-select', file: 'sai/tools/test-select.js', kind: 'text', subcommands: ['select', 'swap', 'restore', 'command'] },
  { name: 'validate-backfill-drafts', file: 'sai/tools/validate-backfill-drafts.js', kind: 'json', keep: { ok: false }, subcommands: ['validate', 'check', 'order'] },
  { name: 'backfill-no-specs', file: 'sai/tools/backfill-no-specs.js', kind: 'json', keep: { ok: false }, subcommands: ['compose'] },
  { name: 'worker-report-validator', file: 'sai/tools/worker-report-validator.js', kind: 'text', subcommands: ['validate'] },
  { name: 'risk-signals', file: 'sai/tools/risk-signals.js', kind: 'json', keep: { status: 'blocked' }, subcommands: ['compute', 'validate'] },
  { name: 'change-document', file: 'sai/tools/change-document.js', kind: 'text', subcommands: ['check', 'check-set', 'hash', 'verify-file', 'compare', 'sections', 'split', 'set-origin', 'attach-origin'] },
  { name: 'change-telemetry', file: 'sai/tools/change-telemetry.js', kind: 'json', keep: {}, errorKeys: ['error'], subcommands: ['collect', 'explore-origin'] },
  { name: 'decision-records', file: 'sai/tools/decision-records.js', kind: 'text', subcommands: ['inventory'] },
  { name: 'tool-access', file: 'sai/tools/tool-access.js', kind: 'text', subcommands: ['verify', 'notices'] },
  { name: 'prereqs', file: 'sai/tools/prereqs.js', kind: 'text', subcommands: ['check'] },
  { name: 'change-picker', file: 'sai/tools/change-picker.js', kind: 'text', subcommands: ['resolve'] },
  { name: 'transfer', file: 'sai/tools/transfer.js', kind: 'json', keep: { ok: false }, subcommands: ['open', 'put', 'verify', 'materialize', 'accept', 'receive', 'status', 'watch', 'retire-handle', 'live', 'close'] },
  { name: 'temp-root', file: 'sai/tools/temp-root.js', kind: 'json', keep: { ok: false, code: 'USAGE' }, subcommands: ['resolve', 'mkdtemp', 'remove'] },
  { name: 'dispose-shells', file: 'sai/tools/dispose-shells.js', kind: 'json', keep: { status: 'error' }, subcommands: [] },
  { name: 'project-settings', file: 'sai/tools/project-settings.js', kind: 'json', keep: { status: 'error' }, subcommands: ['get', 'warming'] },
  { name: 'archive-plan', file: 'sai/tools/archive-plan.js', kind: 'json', keep: { ok: false }, subcommands: ['plan'] },
  { name: 'check-cited-paths', file: 'sai/tools/check-cited-paths.js', kind: 'text', subcommands: ['sai-1', 'sai-2', 'audit-report'] },
  { name: 'lint', file: 'sai/tools/lint.js', kind: 'text', subcommands: ['commit-rules', 'pr-title-rules', 'glossary-format', 'change-document', 'artifact-review', 'audit-report', 'sai-learnings-format', 'worker-emission-ownership'] },
  { name: 'merge', file: 'sai/tools/merge.js', kind: 'json', keep: { outcome: 'failure' }, subcommands: ['preflight', 'provenance', 'simulate', 'conflicts', 'correction', 'bundle', 'write', 'valid', 'resolution', 'verify', 'collision', 'duplicates', 'status'] },
  { name: 'worktree', file: 'sai/tools/worktree.js', kind: 'text', subcommands: ['inventory', 'create', 'index', 'remove', 'delete-branch'] },
  { name: 'review-delta', file: 'sai/tools/review-delta.js', kind: 'text', subcommands: ['snapshot', 'delta'] },
  { name: 'slice-path-scope', file: 'sai/tools/slice-path-scope.js', kind: 'text', subcommands: ['snapshot', 'verify'] },
  { name: 'no-commit-guard', file: 'sai/tools/no-commit-guard.js', kind: 'text', subcommands: ['snapshot', 'verify'] },
  { name: 'status', file: 'sai/tools/status.js', kind: 'text', subcommands: ['panel', 'bulk'] },
  { name: 'opencode-dispatch', file: 'sai/tools/opencode-dispatch.js', kind: 'text', subcommands: ['route', 'start', 'continue'] },
  { name: 'new-change-branch', file: 'sai/tools/new-change-branch.js', kind: 'json', keep: { status: 'failed' }, subcommands: ['inspect', 'name', 'base', 'create'] },
  { name: 'retrospective', file: 'sai/tools/retrospective.js', kind: 'json', keep: {}, errorKeys: ['error'], subcommands: ['index', 'cost', 'excerpt'] },
  { name: 'sai-state', file: 'bin/sai-state.js', kind: 'text', subcommands: ['spawn', 'emit', 'block', 'reset', 'close'] },
];

// A tool that `node --test` would discover as a test file does nothing when it runs inside the test context.
const { NODE_TEST_CONTEXT, ...ENVIRONMENT } = process.env;

function run(tool, args, options = {}) {
  const result = spawnSync(process.execPath, [path.join(ROOT, tool.file), ...args], { encoding: 'utf8', input: '', cwd: options.cwd || ROOT, env: ENVIRONMENT, timeout: 60000 });
  let json = null;
  try { json = JSON.parse(result.stdout); } catch { /* text output */ }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, json };
}

// The usage block of a call, wherever the tool puts it, as { usage, examples, text }.
function blockOf(tool, result, { help }) {
  if (tool.kind === 'json') {
    assert.ok(result.json, `${tool.name}: stdout is one JSON object: ${result.stdout}`);
    assert.equal(typeof result.json.usage, 'string', `${tool.name}: usage text`);
    assert.ok(Array.isArray(result.json.examples) && result.json.examples.length > 0, `${tool.name}: examples`);
    return { usage: result.json.usage, examples: result.json.examples, text: result.stdout };
  }
  const text = help ? result.stdout : result.stderr;
  assert.match(text, /Usage: /, `${tool.name}: Usage: line`);
  assert.match(text, /Examples:\n {2}\S/, `${tool.name}: example`);
  return { usage: text.slice(text.indexOf('Usage: '), text.indexOf('Examples:')), examples: text.slice(text.indexOf('Examples:')).split('\n').slice(1).filter(Boolean).map(line => line.trim()), text };
}

const loaded = new Map();
const declarationOf = tool => {
  if (!loaded.has(tool.name)) loaded.set(tool.name, require(path.join(ROOT, tool.file)).USAGE);
  return loaded.get(tool.name);
};

test('E11 the fixed list names the 36 agent-facing tools', () => {
  assert.equal(TOOLS.length, 36);
  assert.equal(new Set(TOOLS.map(tool => tool.name)).size, 36);
});

test('E11 every tool exports a usage declaration whose subcommands are the ones its parser accepts, and whose examples use only declared subcommands and flags', () => {
  for (const tool of TOOLS) {
    const declaration = declarationOf(tool);
    assert.ok(declaration, `${tool.name} exports USAGE`);
    assert.deepEqual(usage.lint(declaration), [], `${tool.name} declaration`);
    assert.deepEqual(Object.keys(declaration.subcommands || {}).sort(), [...tool.subcommands].sort(), `${tool.name} subcommands`);
    if (!tool.subcommands.length) assert.ok(declaration.general, `${tool.name} general entry`);
    const entries = tool.subcommands.length ? Object.values(declaration.subcommands) : [declaration.general];
    for (const entry of entries) {
      assert.ok(entry.usage.length >= 1 && entry.examples.length >= 1, `${tool.name}: a usage line and an example per entry`);
      for (const flag of Object.keys(entry.flags || {})) assert.match(flag, /^--[a-z][a-z0-9-]*$/, `${tool.name}: flag ${flag}`);
    }
  }
});

test('E11 the checker rejects a declaration without usage, without an example, or with an example outside it', () => {
  const entry = { usage: ['node t.js a --x <v>'], examples: ['node t.js a --x 1'], flags: { '--x': true } };
  assert.deepEqual(usage.lint({ subcommands: { a: entry } }), []);
  assert.ok(usage.lint({ subcommands: { a: { ...entry, usage: [] } } }).length);
  assert.ok(usage.lint({ subcommands: { a: { ...entry, examples: [] } } }).length);
  assert.ok(usage.lint({ subcommands: { a: { ...entry, examples: ['node t.js a --y 1'] } } }).some(problem => /unknown flag: --y/.test(problem)));
  assert.ok(usage.lint({ subcommands: { a: { ...entry, examples: ['node t.js b'] } } }).some(problem => /unknown sub-command: b/.test(problem)));
  assert.ok(usage.lint({ subcommands: {} }).length);
  assert.ok(usage.lint({}).length);
});

test('--help exits 0 with the general block, and a call with no arguments is a usage error that exits 2 with the same block on the error channel', () => {
  for (const tool of TOOLS) {
    const helped = run(tool, ['--help']);
    assert.equal(helped.status, 0, `${tool.name} --help`);
    const block = blockOf(tool, helped, { help: true });
    for (const name of tool.subcommands) assert.ok(block.usage.includes(` ${name}`), `${tool.name}: the general help lists ${name}`);

    const bare = run(tool, []);
    assert.equal(bare.status, 2, `${tool.name} with no arguments`);
    if (tool.kind === 'text') {
      assert.equal(bare.stdout, '', `${tool.name}: a bare call prints nothing on stdout`);
      assert.match(bare.stderr, /Usage: /);
    } else {
      assert.equal(typeof bare.json.usage, 'string');
    }
    blockOf(tool, bare, { help: false });
  }
});

test('E3 an unknown subcommand is named and answered with the general block that lists every subcommand', () => {
  for (const tool of TOOLS.filter(entry => entry.subcommands.length)) {
    const result = run(tool, ['no-such-subcommand']);
    assert.equal(result.status, 2, tool.name);
    const text = tool.kind === 'json' ? JSON.stringify(result.json) : result.stderr;
    assert.match(text, /unknown (sub-command|check): no-such-subcommand/, tool.name);
    const block = blockOf(tool, result, { help: false });
    for (const name of tool.subcommands) assert.ok(block.usage.includes(` ${name}`), `${tool.name}: lists ${name}`);
  }
});

test('E1 a tool without subcommands has the general help only, and an extra positional is a usage error', () => {
  for (const tool of TOOLS.filter(entry => !entry.subcommands.length)) {
    const result = run(tool, ['one', 'two', 'three']);
    assert.equal(result.status, 2, tool.name);
    assert.match(tool.kind === 'json' ? JSON.stringify(result.json) : result.stderr, /unexpected positional argument|unknown flag|missing/, tool.name);
  }
  const noSubcommand = TOOLS.find(tool => tool.name === 'dispose-shells');
  const result = run(noSubcommand, ['extra', '--session', 'ses_1', '--cwd', '/tmp']);
  assert.equal(result.status, 2);
  assert.match(result.json.message, /unexpected positional argument: extra/);
});

test('E4 an error inside a recognized subcommand names the argument and prints only that subcommand\'s block', () => {
  for (const tool of TOOLS.filter(entry => entry.subcommands.length > 1)) {
    const declaration = declarationOf(tool);
    const [first, second] = tool.subcommands;
    const result = run(tool, [first, '--no-such-flag']);
    assert.equal(result.status, 2, `${tool.name} ${first}`);
    const text = tool.kind === 'json' ? JSON.stringify(result.json) : result.stderr;
    assert.match(text, /[Uu]nknown (flag|option|or incomplete option)\b.*--no-such-flag/, `${tool.name} names the flag`);
    const block = blockOf(tool, result, { help: false });
    for (const line of declaration.subcommands[first].usage) assert.ok(block.usage.includes(line), `${tool.name}: ${first} usage is printed`);
    for (const line of declaration.subcommands[second].usage) {
      if (!declaration.subcommands[first].usage.includes(line)) assert.ok(!block.usage.includes(line), `${tool.name}: the ${second} usage is not printed`);
    }
    assert.deepEqual(block.examples.length > 0, true);
  }
});

test('E5 --help wins in any position, next to invalid arguments, and in a flag value position, and prints the subcommand block', () => {
  for (const tool of TOOLS.filter(entry => entry.subcommands.length)) {
    const declaration = declarationOf(tool);
    for (const name of tool.subcommands.slice(0, 3)) {
      const flags = Object.keys(declaration.subcommands[name].flags || {});
      const calls = [[name, '--help'], ['--help', name], [name, '--no-such-flag', '--help'], [name, 'one', 'two', 'three', '--help']];
      const valued = flags.find(flag => declaration.subcommands[name].flags[flag] !== false);
      if (valued) calls.push([name, valued, '--help']);
      for (const args of calls) {
        const result = run(tool, args);
        assert.equal(result.status, 0, `${tool.name} ${args.join(' ')}`);
        const block = blockOf(tool, result, { help: true });
        for (const line of declaration.subcommands[name].usage) assert.ok(block.usage.includes(line), `${tool.name}: ${args.join(' ')} prints the ${name} block`);
      }
    }
  }
});

test('E6 a JSON usage error keeps its existing keys and adds usage and examples; the help is a JSON object with the same fields', () => {
  for (const tool of TOOLS.filter(entry => entry.kind === 'json')) {
    const result = run(tool, ['no-such-subcommand', '--no-such-flag']);
    assert.equal(result.status, 2, tool.name);
    assert.ok(result.json && typeof result.json === 'object', `${tool.name}: one JSON object on stdout`);
    assert.equal(result.stdout.trim().split('\n').length >= 1, true);
    for (const [key, value] of Object.entries(tool.keep || {})) assert.deepEqual(result.json[key], value, `${tool.name}: ${key}`);
    for (const key of tool.errorKeys || []) assert.ok(key in result.json, `${tool.name}: ${key}`);
    assert.ok(Array.isArray(result.json.examples) && typeof result.json.usage === 'string');
  }
  const temp = run(TOOLS.find(tool => tool.name === 'temp-root'), ['mkdtemp', '--help']);
  assert.equal(temp.json.ok, true);
  assert.match(temp.json.usage, /^Usage: temp-root\.js mkdtemp/);
  const transfer = run(TOOLS.find(tool => tool.name === 'transfer'), ['live', '--help']);
  assert.equal(transfer.json.ok, true);
  assert.equal(transfer.json.command, 'live');
});

test('E7 a text tool prints the block to stderr on errors and to stdout on --help', () => {
  for (const tool of TOOLS.filter(entry => entry.kind === 'text' && entry.subcommands.length)) {
    const name = tool.subcommands[0];
    const error = run(tool, [name, '--no-such-flag']);
    assert.equal(error.stdout, '', `${tool.name}: nothing on stdout for an error`);
    assert.match(error.stderr, /Usage: /);
    const help = run(tool, [name, '--help']);
    assert.equal(help.stderr, '', `${tool.name}: nothing on stderr for --help`);
    assert.match(help.stdout, /Usage: /);
  }
});

test('E8 a usage error exits 2 where it used to exit 1, and a domain failure still exits 1', () => {
  const backfill = TOOLS.find(tool => tool.name === 'validate-backfill-drafts');
  assert.equal(run(backfill, ['validate', '--bogus']).status, 2);
  const noSpecs = TOOLS.find(tool => tool.name === 'backfill-no-specs');
  assert.equal(run(noSpecs, ['compose', '--bogus']).status, 2);
  assert.equal(run(noSpecs, ['bogus']).status, 2);
  const branch = TOOLS.find(tool => tool.name === 'new-change-branch');
  assert.equal(run(branch, ['no-such-operation']).status, 2);
  assert.equal(run(branch, ['inspect', '--bogus']).status, 2);

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-usage-'));
  try {
    const missing = path.join(directory, 'missing.json');
    const failed = run(noSpecs, ['compose', '--document-file', missing, '--document-hash', 'a'.repeat(64), '--change-name', 'my-change', '--transfer-dir', directory], { cwd: directory });
    assert.equal(failed.status, 1);
    assert.equal(failed.json.ok, false);
    assert.equal('usage' in failed.json, false);
    const input = path.join(directory, 'input.json');
    fs.writeFileSync(input, '{}');
    const checked = run(backfill, ['check', '--fingerprint', 'a'.repeat(64), '--input-file', input], { cwd: directory });
    assert.equal(checked.status, 1);
    const outside = run(branch, ['inspect', '--input-file', input], { cwd: directory });
    assert.equal(outside.status, 1);
    assert.equal(outside.json.status, 'failed');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('E4 a usage error has no side effect: nothing is created and no input file is read', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-usage-'));
  try {
    const repo = path.join(directory, 'repo');
    fs.mkdirSync(repo);
    spawnSync('git', ['init', '-q'], { cwd: repo });
    spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init'], { cwd: repo });
    const worktree = TOOLS.find(tool => tool.name === 'worktree');
    const before = fs.readdirSync(directory).sort();
    assert.equal(run(worktree, ['create', 'a', 'b'], { cwd: repo }).status, 2);
    assert.equal(run(worktree, ['create', '--bogus'], { cwd: repo }).status, 2);
    assert.deepEqual(fs.readdirSync(directory).sort(), before);

    const commit = TOOLS.find(tool => tool.name === 'commit');
    const unreadable = path.join(directory, 'does-not-exist.txt');
    const result = run(commit, ['apply', '--input-file', unreadable, '--bogus'], { cwd: repo });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unknown flag: --bogus/);
    assert.doesNotMatch(result.stderr, /does-not-exist|ENOENT/);
    assert.equal(spawnSync('git', ['rev-list', '--count', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout.trim(), '1');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('E9 the help of emit gives each distinct shape of the command its own usage line and an example', () => {
  const state = TOOLS.find(tool => tool.name === 'sai-state');
  const help = run(state, ['emit', '--help']);
  assert.equal(help.status, 0);
  const lines = help.stdout.slice(help.stdout.indexOf('Usage: '), help.stdout.indexOf('Examples:')).split('\n').filter(line => /emit </.test(line));
  const shapes = [/emit <id> <machineId> --input-file <path>$/, /--set <field>=<id>/, /--progress --report-dir <dir> --report-file <path> --report-hash <sha256>/, /--progress --input-file <path>$/, /explore-slice@1 --document-file <path>/, /explore-slice@1 --amend <change-name>/];
  for (const shape of shapes) assert.equal(lines.filter(line => shape.test(line)).length, 1, String(shape));
  const examples = help.stdout.slice(help.stdout.indexOf('Examples:')).split('\n').filter(line => /emit /.test(line));
  for (const shape of [/--input-file event/, /--set /, /--report-hash /, /--progress --input-file/, /--document-file /, /--amend /]) {
    assert.ok(examples.some(line => shape.test(line)), String(shape));
  }
});

test('E10 a wrong argument never ends in an uncaught exception with a stack trace', () => {
  for (const tool of TOOLS) {
    const calls = [['--no-such-flag'], ['--input-file'], ['no-such-subcommand', '--cwd']];
    for (const name of tool.subcommands.slice(0, 2)) calls.push([name, '--cwd'], [name, '--no-such-flag', 'x']);
    for (const args of calls) {
      const result = run(tool, args);
      assert.equal(result.status, 2, `${tool.name} ${args.join(' ')}`);
      assert.doesNotMatch(`${result.stdout}${result.stderr}`, /\n\s+at .*\(.*:\d+:\d+\)|Error: .*\n\s+at /, `${tool.name} ${args.join(' ')}`);
    }
  }
});

test('E10 a domain error keeps its behavior: a missing change in file-manifest verify still reports the unreadable tasks.md', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-usage-'));
  try {
    const result = run(TOOLS.find(tool => tool.name === 'file-manifest'), ['verify', 'no-such-change', '--cwd', directory]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /file-manifest: cannot read tasks\.md/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('the renderer: help in any position, value checks, enum values, positionals, and the cause line', () => {
  const declaration = {
    subcommands: {
      go: {
        usage: ['node t.js go <name> --mode <fast|slow> [--tag <t>] [--force]'],
        examples: ['node t.js go thing --mode fast'],
        flags: { '--mode': ['fast', 'slow'], '--tag': { once: true }, '--force': false },
        positionals: { min: 1, max: 1, names: ['name'] },
        required: ['--mode'],
      },
      stop: { usage: ['node t.js stop'], examples: ['node t.js stop'] },
    },
  };
  assert.equal(usage.helpRequested(['go', '--mode', '--help']), true);
  assert.equal(usage.check(declaration, ['go', 'thing', '--mode', 'fast']), null);
  assert.equal(usage.check(declaration, ['--mode', 'fast', 'go', 'thing']), null);
  assert.equal(usage.check(declaration, ['go', 'thing', '--mode=fast']), null);
  assert.match(usage.check(declaration, ['go', 'thing', '--mode', 'medium']).cause, /invalid value for --mode: medium \(expected fast\|slow\)/);
  assert.match(usage.check(declaration, ['go', 'thing', '--mode']).cause, /value required for --mode/);
  assert.match(usage.check(declaration, ['go', 'thing', '--mode', '--force']).cause, /value required for --mode/);
  assert.match(usage.check(declaration, ['go', 'thing']).cause, /missing required flag: --mode/);
  assert.match(usage.check(declaration, ['go', '--mode', 'fast']).cause, /missing <name>/);
  assert.match(usage.check(declaration, ['go', 'a', 'b', '--mode', 'fast']).cause, /unexpected positional argument: b/);
  assert.match(usage.check(declaration, ['go', 'a', '--mode', 'fast', '--force=yes']).cause, /--force takes no value/);
  assert.match(usage.check(declaration, ['go', 'a', '--mode', 'fast', '--tag', 'x', '--tag', 'y']).cause, /--tag accepts one value/);
  assert.match(usage.check(declaration, ['stop', 'extra']).cause, /unexpected positional argument: extra/);
  assert.deepEqual(usage.check(declaration, []), { cause: 'sub-command required', subcommand: null });
  assert.equal(usage.check(declaration, ['nope']).cause, 'unknown sub-command: nope');
  assert.equal(usage.recognized(declaration, ['--mode', 'fast', 'go']), 'go');
  const text = usage.render(declaration, 'go', 'unknown flag: --x');
  assert.equal(text.split('\n')[0], 'unknown flag: --x');
  assert.match(text, /^unknown flag: --x\nUsage: node t\.js go <name>/);
  assert.match(text, /Examples:\n {2}node t\.js go thing --mode fast$/);
  const general = usage.render(declaration);
  assert.match(general, /node t\.js go <name>/);
  assert.match(general, /node t\.js stop/);
  assert.deepEqual(usage.fields(declaration, 'stop'), { usage: 'Usage: node t.js stop', examples: ['node t.js stop'] });

  const written = [];
  const sink = { write: text => written.push(text) };
  assert.equal(usage.handle(declaration, ['go', 'thing', '--mode', 'fast'], { stdout: sink, stderr: sink }), null);
  assert.equal(usage.handle(declaration, ['go', '--help'], { stdout: sink, stderr: sink }), 0);
  assert.equal(usage.handle(declaration, ['go'], { stdout: sink, stderr: sink }), 2);
  assert.equal(written.length, 2);
});

test('H1 sai-state usage errors keep the message of the verb parser, which states that no transition occurred and shows its form, and then show the usage block', () => {
  const state = TOOLS.find(tool => tool.name === 'sai-state');
  const id = '11111111-1111-4111-8111-111111111111';
  const cases = [
    [['emit', id, 'spec-steps@1', '--input-file'], /^emit: --input-file requires a path; no transition occurred\n/],
    [['emit', id, 'spec-steps@1', '--input-file', '--progress'], /^emit: --input-file requires a path; no transition occurred\n/],
    [['emit', id, 'spec-steps@1', '--set-path'], /^emit: .*requires <field>=<value>.*; no transition occurred\. Send it as: node <tool-path> emit <id> <machineId> --set <field>=<id>/],
    [['emit'], /^emit requires <id> <machineId> and reads the event JSON from an input file: node <tool-path> emit <id> <machineId> --input-file <path>/],
    [['emit', id], /^emit requires <id> <machineId> and reads the event JSON from an input file: node <tool-path> emit <id> <machineId> --input-file <path>/],
    [['emit', id, 'spec-steps@1', '--progress', '--report-dir', 'd'], /^emit --progress takes either a report reference \(all of --report-dir, --report-file, and --report-hash/],
    [['emit', id, '--document-file', 'x'], /^emit --document-file requires <id> explore-slice@1 and reads the documents from files: /],
    [['spawn'], /^spawn requires --key <stable-key>\n/],
    [['spawn', '--key'], /^spawn requires --key <stable-key>\n/],
    [['block'], /^block requires <id> <change-name>\n/],
    [['reset', id], /^reset requires <id> <machineId>\n/],
    [['close'], /^close requires <id>\n/],
  ];
  for (const [args, first] of cases) {
    const result = run(state, args);
    assert.equal(result.status, 2, args.join(' '));
    assert.equal(result.stdout, '', args.join(' '));
    assert.match(result.stderr, first, args.join(' '));
    assert.match(result.stderr, /\nUsage: node bin\/sai-state\.js /, `${args.join(' ')} shows the usage block`);
    assert.match(result.stderr, /Examples:\n {2}node bin\/sai-state\.js /, `${args.join(' ')} shows an example`);
  }
  const unknown = run(state, ['emit', id, 'spec-steps@1', '--bogus']);
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /^unknown flag: --bogus\nUsage: /);
});
