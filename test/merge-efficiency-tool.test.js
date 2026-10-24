'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const merge = require('../sai/tools/merge');
const { expandInstallManifest, loadInstallManifest } = require('../bin/install-manifest');
const ROOT = path.join(__dirname, '..');
const TOOL = path.join(ROOT, 'sai/tools/merge.js');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

function git(cwd, args, allowedFailure = false) {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (!allowedFailure) assert.equal(run.status, 0, run.stderr);
  return run;
}

function fixture(t, combined = false) {
  const parent = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-merge-efficiency-'));
  const cwd = path.join(parent, 'repo');
  fs.mkdirSync(cwd);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  git(cwd, ['init', '-b', 'main']);
  git(cwd, ['config', 'user.name', 'Test']);
  git(cwd, ['config', 'user.email', 'test@example.com']);
  // These fixtures compare working files and Git blobs byte-for-byte. CRLF
  // marker parsing has its own test; do not inherit the runner's conversion.
  git(cwd, ['config', 'core.autocrlf', 'false']);
  const spacer = Array.from({ length: 25 }, (_, i) => `unchanged ${i}`).join('\n');
  const contents = (value, prefix = 'prefix', suffix = 'suffix') => `${prefix}\n${spacer}\nvalue=${value}\n${spacer}\n${suffix}\n`;
  fs.writeFileSync(path.join(cwd, 'f.txt'), contents('base'));
  fs.writeFileSync(path.join(cwd, 'unrelated.txt'), 'preserve me\n');
  git(cwd, ['add', '.']); git(cwd, ['commit', '-m', 'base']);
  git(cwd, ['checkout', '-b', 'feature']);
  fs.writeFileSync(path.join(cwd, 'f.txt'), contents('source', 'prefix', combined ? 'source-extra' : 'suffix'));
  git(cwd, ['commit', '-am', 'source']);
  git(cwd, ['checkout', 'main']);
  fs.writeFileSync(path.join(cwd, 'f.txt'), contents('target', combined ? 'target-extra' : 'prefix'));
  git(cwd, ['commit', '-am', 'target']);
  return { parent, cwd, contents };
}

function launch(cwd) {
  const provenance = merge.provenance(cwd, 'refs/heads/feature', 'merge', 'not-applicable');
  assert.equal(git(cwd, ['merge', '--no-ff', '--no-commit', 'refs/heads/feature'], true).status, 1);
  return { provenance, snapshot: merge.conflicts(cwd) };
}

function resolution(snapshot, source = 'authored', text = 'value=resolved\n', semantic = true) {
  const file = snapshot.data.files[0];
  const decisions = semantic ? [{ conflict_id: file.regions[0].conflict_id, decision: 'synthesis' }] : [];
  const payload = { selected_contextual_decisions: decisions, files: [{ path: file.path, category: file.category,
    source, regions: source === 'authored' ? file.regions.map(region => ({ conflict_id: region.conflict_id, text })) : [], decisions }] };
  return { decisions, payload, original: JSON.stringify({ status: 'completed', changed_files: source === 'authored' ? [file.path] : [],
    summary: `Applied strategy 1.\n## Complete resolution payload\n\`\`\`json\n${JSON.stringify(payload)}\n\`\`\`\n`, original_evidence: 'retain this field' }) };
}

function writeAuthored(cwd, snapshot, text = 'value=resolved\n') {
  const file = snapshot.data.files[0];
  const bytes = Buffer.from(file.before, 'base64');
  const parts = []; let cursor = 0;
  for (const region of file.regions) { parts.push(bytes.subarray(cursor, region.start), Buffer.from(text)); cursor = region.end; }
  parts.push(bytes.subarray(cursor));
  fs.writeFileSync(path.join(cwd, file.path), Buffer.concat(parts));
}

function cli(cwd, args, input = '') {
  const run = spawnSync(process.execPath, [TOOL, ...args, '--json', '--cwd', cwd], { encoding: 'utf8', input });
  return { ...run, payload: JSON.parse(run.stdout) };
}

test('preflight produces complete candidates and guards without moving HEAD', t => {
  const { cwd } = fixture(t);
  const head = git(cwd, ['rev-parse', 'HEAD']).stdout;
  const receipt = merge.preflight(cwd);
  assert.equal(receipt.data.current_branch, 'main');
  assert.deepEqual(receipt.data.candidates.map(item => item.name), ['feature']);
  assert.equal(receipt.data.merge_in_progress, false);
  assert.equal(merge.valid(cwd, receipt).outcome, 'success');
  assert.equal(git(cwd, ['rev-parse', 'HEAD']).stdout, head);
  const untracked = process.platform === 'win32' ? 'untracked name with spaces' : 'untracked name\nwith newline';
  fs.writeFileSync(path.join(cwd, untracked), 'new');
  const dirty = merge.preflight(cwd).data.dirty;
  assert.ok(dirty.some(item => item.path === untracked));
  assert.ok(merge.valid(cwd, receipt).changed_dependencies.includes('tree'));
});

test('repository root checks accept equivalent native paths but reject subdirectories', t => {
  const { cwd } = fixture(t);
  const repository = git(cwd, ['rev-parse', '--show-toplevel']).stdout.trim();
  for (const root of [cwd, repository, cwd + path.sep, ...(process.platform === 'win32' ? [cwd.toUpperCase()] : [])]) {
    const receipt = merge.state(root, []);
    assert.equal(path.relative(fs.realpathSync.native(cwd), fs.realpathSync.native(receipt.repository)), '');
  }
  const nested = path.join(cwd, 'nested');
  fs.mkdirSync(nested);
  assert.throws(() => merge.preflight(nested), /--cwd must be the repository root/);
  const refused = cli(nested, ['preflight']);
  assert.equal(refused.status, 2);
  assert.match(refused.payload.error, /--cwd must be the repository root/);
});

test('repository root checks use native realpaths when legacy resolution retains a short-name alias', t => {
  const { cwd, parent } = fixture(t);
  const aliased = cwd + path.sep;
  const legacy = fs.realpathSync;
  t.mock.method(fs, 'realpathSync', filename => filename === aliased ? path.join(parent, 'REPO~1') : legacy(filename));
  const repository = git(cwd, ['rev-parse', '--show-toplevel']).stdout.trim();
  assert.notEqual(path.relative(fs.realpathSync(aliased), fs.realpathSync(repository)), '');
  assert.equal(path.relative(fs.realpathSync.native(aliased), fs.realpathSync.native(repository)), '');
  const receipt = merge.state(aliased, []);
  assert.equal(path.relative(fs.realpathSync.native(cwd), fs.realpathSync.native(receipt.repository)), '');
});

test('Windows 8.3 paths work through the API and CLI without weakening snapshot containment', { skip: process.platform !== 'win32' }, t => {
  const { cwd, parent } = fixture(t);
  const run = spawnSync('cmd.exe', ['/d', '/c', `for %I in ("${cwd}") do @echo %~sI`], {
    encoding: 'utf8', windowsVerbatimArguments: true,
  });
  assert.equal(run.status, 0, run.stderr);
  const short = run.stdout.trim();
  assert.ok(fs.existsSync(short), short);
  if (!/~\d/.test(short)) { t.skip('8.3 short names are disabled on this volume'); return; }
  assert.equal(merge.preflight(short).outcome, 'success');
  assert.equal(cli(short, ['preflight']).status, 0);
  launch(short);
  const external = cli(short, ['conflicts', '--record', path.join(parent, 'snapshot.json')]);
  assert.equal(external.status, 0, external.payload.error);
  const internal = cli(short, ['conflicts', '--record', path.join(short, 'forbidden.json')]);
  assert.equal(internal.status, 2);
  assert.match(internal.payload.error, /snapshot must be outside repository/);
  assert.equal(fs.existsSync(path.join(cwd, 'forbidden.json')), false);
});

test('dependency validity invalidates changed paths, not unrelated settled metadata', t => {
  const { cwd } = fixture(t);
  const suite = merge.suite(cwd);
  fs.writeFileSync(path.join(cwd, 'unrelated.txt'), 'changed');
  assert.equal(merge.valid(cwd, suite).outcome, 'success');
  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ scripts: { test: 'node --test' } }));
  assert.deepEqual(merge.valid(cwd, suite).changed_dependencies, ['path:package.json']);
});

test('provenance is immutable historical evidence and collision absence is mechanical', t => {
  const { cwd } = fixture(t);
  const { provenance } = launch(cwd);
  assert.equal(merge.valid(cwd, provenance).outcome, 'failure');
  assert.deepEqual(provenance.data.source_introduced_records, []);
  const snapshot = merge.conflicts(cwd);
  writeAuthored(cwd, snapshot); git(cwd, ['add', 'f.txt']);
  const collision = merge.collision(cwd, provenance);
  assert.equal(collision.data.applicability, 'not-applicable');
  assert.equal(collision.data.reason, 'no-source-introduced-records');
  assert.deepEqual(collision.data.groups, []);
  assert.equal(git(cwd, ['rev-parse', 'HEAD']).stdout.trim(), provenance.data.target_sha);
});

test('collision frontier groups all suffixes in one family and escalates uncertain survival', t => {
  const { cwd } = fixture(t);
  fs.mkdirSync(path.join(cwd, 'docs/adr'), { recursive: true });
  fs.mkdirSync(path.join(cwd, 'docs/ddr'), { recursive: true });
  for (const name of ['docs/adr/0010-target.md', 'docs/adr/0010a-older.md', 'docs/ddr/0010-other-family.md', 'docs/adr/0011-old-a.md', 'docs/adr/0011-old-b.md']) {
    fs.writeFileSync(path.join(cwd, name), '# Existing ' + name + '\n');
  }
  git(cwd, ['add', 'docs']); git(cwd, ['commit', '-m', 'target records']);
  git(cwd, ['checkout', 'feature']);
  fs.mkdirSync(path.join(cwd, 'docs/adr'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'docs/adr/0010-source.md'), '# New source decision\n');
  git(cwd, ['add', 'docs']); git(cwd, ['commit', '-m', 'source record']); git(cwd, ['checkout', 'main']);
  const { provenance, snapshot } = launch(cwd);
  assert.deepEqual(provenance.data.source_introduced_records, ['docs/adr/0010-source.md']);
  assert.throws(() => merge.collision(cwd, provenance), /final resolved integration/);
  writeAuthored(cwd, snapshot); git(cwd, ['add', 'f.txt']);
  const result = merge.collision(cwd, provenance);
  assert.equal(result.data.applicability, 'needs-judgment');
  assert.deepEqual(result.data.groups, [{ key: 'adr:0010', paths: ['docs/adr/0010-source.md', 'docs/adr/0010-target.md', 'docs/adr/0010a-older.md'] }]);
  fs.renameSync(path.join(cwd, 'docs/adr/0010-source.md'), path.join(cwd, 'docs/adr/0010-renamed.md'));
  assert.equal(merge.collision(cwd, provenance).data.reason, 'reconcile-survival-or-rename');
});

test('suffixed source-introduced records retain collision applicability and require semantic judgment', t => {
  for (const [family, suffix] of [['adr', 'a'], ['ddr', 'aa']]) {
    const { cwd } = fixture(t);
    const directory = `docs/${family}`;
    fs.mkdirSync(path.join(cwd, directory), { recursive: true });
    const targetPath = `${directory}/0011-target.md`;
    const sourcePath = `${directory}/0011${suffix}-new.md`;
    fs.writeFileSync(path.join(cwd, targetPath), `# Existing ${family} decision\n`);
    git(cwd, ['add', 'docs']); git(cwd, ['commit', '-m', 'target decision']);
    git(cwd, ['checkout', 'feature']);
    fs.mkdirSync(path.join(cwd, directory), { recursive: true });
    fs.writeFileSync(path.join(cwd, sourcePath), `# Newly introduced suffixed ${family} decision\n`);
    git(cwd, ['add', 'docs']); git(cwd, ['commit', '-m', 'suffixed source decision']);
    git(cwd, ['checkout', 'main']);
    const { provenance, snapshot } = launch(cwd);
    assert.deepEqual(provenance.data.source_introduced_records, [sourcePath]);
    writeAuthored(cwd, snapshot); git(cwd, ['add', 'f.txt']);
    const result = merge.collision(cwd, provenance);
    assert.equal(result.data.applicability, 'needs-judgment');
    assert.notEqual(result.data.reason, 'no-source-introduced-records');
    assert.deepEqual(result.data.groups, [{ key: `${family}:0011`, paths: [targetPath, sourcePath] }]);
  }
});

test('operation detection follows git-path in linked worktrees instead of assuming a .git directory', t => {
  const { cwd, parent } = fixture(t);
  const worktree = path.join(parent, 'linked');
  git(cwd, ['worktree', 'add', '--detach', worktree, 'HEAD']);
  const location = git(worktree, ['rev-parse', '--git-path', 'rebase-merge']).stdout.trim();
  fs.mkdirSync(path.resolve(worktree, location));
  const receipt = merge.preflight(worktree);
  assert.equal(receipt.data.rebase_in_progress, true);
  assert.equal(receipt.data.merge_in_progress, false);
});

test('conflict snapshot protects Git-combined content, not either stage whole file', t => {
  const { cwd } = fixture(t, true);
  const { snapshot } = launch(cwd);
  const before = Buffer.from(snapshot.data.files[0].before, 'base64').toString();
  assert.match(before, /target-extra/); assert.match(before, /source-extra/);
  assert.deepEqual(snapshot.data.files[0].stage_checkout_preserves_combined_content, { 2: false, 3: false });
  const result = resolution(snapshot);
  writeAuthored(cwd, snapshot);
  assert.equal(merge.checkResolution(cwd, snapshot, result.original, result.decisions).outcome, 'success');
  const written = fs.readFileSync(path.join(cwd, 'f.txt'), 'utf8');
  assert.match(written, /target-extra/); assert.match(written, /source-extra/); assert.match(written, /value=resolved/);
  fs.writeFileSync(path.join(cwd, 'f.txt'), written.replace('source-extra', 'lost-content'));
  assert.match(merge.checkResolution(cwd, snapshot, result.original, result.decisions).errors.join('\n'), /outside regions/);
});

test('whole-stage selection that discards automatically combined content is rejected before checkout', t => {
  const { cwd } = fixture(t, true);
  const { snapshot } = launch(cwd);
  const result = resolution(snapshot, 'git-ours', '', false);
  assert.match(merge.checkResolution(cwd, snapshot, result.original, []).errors.join('\n'), /discards Git-combined content/);
});

test('original envelopes, exact inventories and semantic confirmations are validated', t => {
  const { cwd } = fixture(t);
  const { snapshot } = launch(cwd);
  const result = resolution(snapshot);
  writeAuthored(cwd, snapshot);
  const check = original => merge.checkResolution(cwd, snapshot, original, result.decisions);
  assert.equal(check(result.original).outcome, 'success');
  const changed = JSON.parse(result.original);
  delete changed.changed_files;
  assert.throws(() => check(JSON.stringify(changed)), /changed_files/);
  assert.throws(() => check(JSON.stringify(result.payload)), /status|summary/);
  assert.equal(merge.checkResolution(cwd, snapshot, result.original, [{ ...result.decisions[0], decision: 'ours' }]).outcome, 'failure');
  const missing = { ...result.payload, files: [] };
  changed.changed_files = ['f.txt']; changed.summary = '## Complete resolution payload\n' + JSON.stringify(missing);
  assert.match(check(JSON.stringify(changed)).errors.join('\n'), /incomplete affected/);
  const duplicate = { ...result.payload, files: [...result.payload.files, ...result.payload.files] };
  changed.summary = '## Complete resolution payload\n' + JSON.stringify(duplicate);
  assert.match(check(JSON.stringify(changed)).errors.join('\n'), /duplicate file/);
});

test('unexpected writes and index changes reject a resolution without mutating Git', t => {
  const { cwd } = fixture(t);
  const { snapshot } = launch(cwd);
  const result = resolution(snapshot);
  writeAuthored(cwd, snapshot);
  fs.writeFileSync(path.join(cwd, 'unrelated.txt'), 'unauthorized');
  assert.match(merge.checkResolution(cwd, snapshot, result.original, result.decisions).errors.join('\n'), /unrelated content changed/);
  fs.writeFileSync(path.join(cwd, 'unrelated.txt'), 'preserve me\n');
  git(cwd, ['add', 'f.txt']);
  assert.match(merge.checkResolution(cwd, snapshot, result.original, result.decisions).errors.join('\n'), /snapshot HEAD\/index\/operation is stale/);
});

test('safe Git-sourced resolution stays untouched until coordinator checkout and is independently checked', t => {
  const { cwd } = fixture(t);
  const { snapshot } = launch(cwd);
  const result = resolution(snapshot, 'git-ours', '', false);
  assert.equal(merge.checkResolution(cwd, snapshot, result.original, []).outcome, 'success');
  git(cwd, ['checkout', '--ours', '--', 'f.txt']);
  assert.equal(merge.checkResolution(cwd, snapshot, result.original, [], 'materialized').outcome, 'success');
  assert.equal(merge.checkResolution(cwd, snapshot, result.original, [], 'authored').outcome, 'failure');
});

test('snapshot CLI uses exact external references, refuses overwrite and verifies retained hashes', t => {
  const { cwd, parent } = fixture(t);
  launch(cwd);
  const filename = path.join(parent, 'snapshot.json');
  const captured = cli(cwd, ['conflicts', '--record', filename]);
  assert.equal(captured.status, 0);
  assert.equal(captured.payload.record_hash, hash(fs.readFileSync(filename)));
  assert.equal(captured.payload.data.files[0].before, undefined);
  assert.equal(cli(cwd, ['conflicts', '--record', filename]).status, 2);
  assert.equal(cli(cwd, ['conflicts', '--record', path.join(cwd, 'bad.json')]).status, 2);
  const snapshot = JSON.parse(fs.readFileSync(filename));
  const result = resolution(snapshot);
  writeAuthored(cwd, snapshot);
  const source = path.join(parent, 'worker.json'); const confirmed = path.join(parent, 'decisions.json');
  fs.writeFileSync(source, result.original); fs.writeFileSync(confirmed, JSON.stringify(result.decisions));
  const args = ['resolution', '--record', filename, '--record-hash', captured.payload.record_hash, '--source', source, '--confirmed', confirmed];
  assert.equal(cli(cwd, args).status, 0);
  fs.appendFileSync(filename, '\n');
  assert.match(cli(cwd, args).payload.error, /changed snapshot hash/);
});

test('explicit correction ranges work after staging and protect everything outside the authorized fix', t => {
  const { cwd } = fixture(t);
  const { snapshot } = launch(cwd);
  writeAuthored(cwd, snapshot); git(cwd, ['add', 'f.txt']);
  const bytes = fs.readFileSync(path.join(cwd, 'f.txt'));
  const start = bytes.indexOf('value=resolved');
  const authorized = [{ path: 'f.txt', category: 'code', before_hash: hash(bytes), regions: [{ start, end: start + 'value=resolved\n'.length, conflict_id: 'code:f.txt#1' }] }];
  const correction = merge.correction(cwd, authorized);
  const result = resolution(correction, 'authored', 'value=fixed\n', false);
  writeAuthored(cwd, correction, 'value=fixed\n');
  assert.equal(merge.checkResolution(cwd, correction, result.original, []).outcome, 'success');
  assert.throws(() => merge.correction(cwd, authorized), /preimage changed/);
});

test('markers support diff3, wider labels, CRLF and malformed marker rejection', () => {
  const text = Buffer.from('keep\r\n<<<<<<<< ours\r\nleft\r\n|||||||| base\r\nbase\r\n========\r\nright\r\n>>>>>>>> theirs\r\nend\r\n');
  const ranges = merge.regions(text);
  assert.equal(ranges.length, 1);
  assert.equal(ranges[0].start, 6);
  assert.equal(text.subarray(ranges[0].end).toString(), 'end\r\n');
  for (const malformed of ['<<<<<<< a\nx\n>>>>>>> b\n', '=======\n', '<<<<<<< a\nx\n=======\ny\n']) {
    assert.throws(() => merge.regions(Buffer.from(malformed)), /separator|malformed|unterminated/);
  }
});

test('verification runs Windows package-manager shims through the shell and keeps native spawning elsewhere', t => {
  const { cwd } = fixture(t);
  const source = fs.readFileSync(TOOL, 'utf8');
  const toolRequire = createRequire(TOOL);
  for (const platform of ['win32', 'linux']) {
    const calls = [];
    const loaded = { exports: {} };
    const spawn = (command, args, options) => {
      if (command === 'git') return spawnSync(command, args, options);
      const opts = Array.isArray(args) ? options : args;
      calls.push({ command, args: Array.isArray(args) ? args : [], options: opts });
      if (platform === 'win32' && !opts.shell) return { status: null, error: new Error('spawn npm ENOENT') };
      return { status: 3, signal: null, stdout: '', stderr: 'failure evidence\n' };
    };
    vm.runInNewContext(source, {
      module: loaded, __dirname: path.dirname(TOOL), process: { platform, env: process.env },
      require: name => name === 'node:child_process' ? { spawnSync: spawn } : toolRequire(name),
    }, { filename: TOOL });
    for (const manager of ['npm', 'pnpm', 'yarn']) {
      fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ packageManager: `${manager}@1.0.0`, scripts: { test: 'ignored by the spawn stub' } }));
      const result = loaded.exports.verify(cwd);
      assert.equal(result.data.error, null, result.data.error);
      assert.equal(result.data.exit_code, 3);
      assert.equal(result.data.verification_result, 'failed');
      assert.match(result.data.stderr, /failure evidence/);
      const call = calls.at(-1);
      assert.equal(call.command, platform === 'win32' ? `${manager} test` : manager);
      assert.equal(call.args.join(' '), platform === 'win32' ? '' : 'test');
      assert.equal(Boolean(call.options.shell), platform === 'win32');
      assert.equal(call.options.env.NODE_TEST_CONTEXT, undefined);
    }
  }
});

test('verification distinguishes passed, failed and unavailable and retains failure evidence', t => {
  const { cwd, parent } = fixture(t);
  const unavailable = merge.verify(cwd);
  assert.equal(unavailable.outcome, 'not-applicable');
  assert.equal(unavailable.data.verification_result, 'unavailable');
  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "console.error(\'failure evidence\'); process.exit(3)"' } }));
  const failed = merge.verify(cwd);
  assert.equal(failed.data.error, null, failed.data.error);
  assert.equal(failed.data.verification_result, 'failed'); assert.equal(failed.data.exit_code, 3);
  assert.match(failed.data.stderr, /failure evidence/); assert.ok(failed.data.test_ms > 0);
  const stored = cli(cwd, ['verify', '--record', path.join(parent, 'verification.json')]);
  assert.equal(stored.status, 1);
  assert.equal(stored.payload.data.stderr, undefined);
  const full = fs.readFileSync(stored.payload.record);
  assert.equal(hash(full), stored.payload.record_hash);
  assert.match(JSON.parse(full).data.stderr, /failure evidence/);
  assert.equal(stored.payload.data.stderr_hash, hash(JSON.parse(full).data.stderr));
  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "console.log(\'pass\')"' } }));
  assert.equal(merge.verify(cwd).data.verification_result, 'passed');
  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "require(\'fs\').writeFileSync(\'unrelated.txt\', \'test side effect\')"' } }));
  const changed = merge.verify(cwd);
  assert.equal(changed.data.state_changed_during_run, true); assert.equal(changed.data.verification_result, 'failed');
});

test('a documented command runs instead of the detected suite, on every entry path', t => {
  const { cwd, parent } = fixture(t);
  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "process.exit(3)"' } }));
  const documented = 'node -e "console.log(\'documented ran\')"';
  const passed = merge.verify(cwd, documented);
  assert.equal(passed.data.verification_result, 'passed', passed.data.stderr);
  assert.equal(passed.data.command, documented);
  assert.equal(passed.data.command_source, 'documented');
  assert.match(passed.data.stdout, /documented ran/);
  const listed = merge.verify(cwd);
  assert.equal(listed.data.verification_result, 'failed');
  assert.equal(listed.data.command_source, 'list');
  const failing = merge.verify(cwd, 'node -e "process.exit(4)"');
  assert.equal(failing.data.verification_result, 'failed'); assert.equal(failing.data.exit_code, 4);
  const stored = cli(cwd, ['verify', '--command', 'node --version', '--record', path.join(parent, 'documented.json')]);
  assert.equal(stored.status, 0, stored.stdout);
  assert.equal(stored.payload.data.verification_result, 'passed');
  assert.equal(stored.payload.data.command, 'node --version');
  assert.equal(stored.payload.data.command_source, 'documented');
});

test('.NET markers resolve to dotnet test and several candidates are unavailable', t => {
  const { cwd } = fixture(t);
  const command = () => merge.suite(cwd).data;
  fs.writeFileSync(path.join(cwd, 'App.csproj'), '<Project />');
  assert.deepEqual(command(), { command: ['dotnet', 'test', 'App.csproj'] });
  fs.mkdirSync(path.join(cwd, 'src', 'deep'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'src', 'deep', 'TooDeep.sln'), '');
  assert.deepEqual(command(), { command: ['dotnet', 'test', 'App.csproj'] }, 'two levels below is not a marker');
  fs.writeFileSync(path.join(cwd, 'src', 'App.sln'), '');
  assert.deepEqual(command(), { command: ['dotnet', 'test', 'src/App.sln'] }, 'a solution wins over a root project');
  const receipt = merge.suite(cwd);
  assert.ok(receipt.dependencies.includes('path:src/App.sln'));
  fs.writeFileSync(path.join(cwd, 'Other.sln'), '');
  assert.deepEqual(command(), { command: null, ambiguous: ['Other.sln', 'src/App.sln'] });
  const ambiguous = merge.verify(cwd);
  assert.equal(ambiguous.outcome, 'not-applicable');
  assert.equal(ambiguous.data.verification_result, 'unavailable');
  assert.equal(ambiguous.data.unavailable_reason, 'ambiguous-suite');
  assert.match(ambiguous.data.detail, /Other\.sln, src\/App\.sln/);
  fs.writeFileSync(path.join(cwd, 'Cargo.toml'), '');
  assert.deepEqual(command(), { command: ['cargo', 'test'] }, 'the existing list keeps its precedence');
  fs.rmSync(path.join(cwd, 'Cargo.toml')); fs.rmSync(path.join(cwd, 'Other.sln')); fs.rmSync(path.join(cwd, 'src'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'Second.csproj'), '<Project />');
  assert.deepEqual(command(), { command: null, ambiguous: ['App.csproj', 'Second.csproj'] });
});

test('a command that fails to start is unavailable with its reason, apart from failing tests', t => {
  const { cwd, parent } = fixture(t);
  assert.equal(merge.verify(cwd).data.unavailable_reason, 'no-suite');
  const missing = merge.verify(cwd, 'sai-merge-no-such-tool --run');
  assert.equal(missing.outcome, 'not-applicable');
  assert.equal(missing.data.verification_result, 'unavailable');
  assert.equal(missing.data.unavailable_reason, 'not-runnable');
  assert.ok(missing.data.detail);
  assert.equal(missing.data.command, 'sai-merge-no-such-tool --run');
  const stored = cli(cwd, ['verify', '--command', 'sai-merge-no-such-tool', '--record', path.join(parent, 'not-runnable.json')]);
  assert.equal(stored.status, 0, 'not runnable is not a failed test run');
  assert.equal(stored.payload.data.unavailable_reason, 'not-runnable');
  // A command that started and exited 1 stays a test failure.
  assert.equal(merge.verify(cwd, 'node -e "process.exit(1)"').data.verification_result, 'failed');
  // The list path: a listed tool that is not installed never starts either.
  const source = fs.readFileSync(TOOL, 'utf8');
  const loaded = { exports: {} };
  const spawn = (command, args, options) => command === 'git' ? spawnSync(command, args, options)
    : { status: null, signal: null, error: Object.assign(new Error('spawn cargo ENOENT'), { code: 'ENOENT' }) };
  vm.runInNewContext(source, { module: loaded, __dirname: path.dirname(TOOL), process: { platform: 'linux', env: process.env },
    require: name => name === 'node:child_process' ? { spawnSync: spawn } : createRequire(TOOL)(name) }, { filename: TOOL });
  fs.writeFileSync(path.join(cwd, 'Cargo.toml'), '');
  const uninstalled = loaded.exports.verify(cwd);
  assert.equal(uninstalled.data.verification_result, 'unavailable');
  assert.equal(uninstalled.data.unavailable_reason, 'not-runnable');
  assert.match(uninstalled.data.detail, /ENOENT/);
});

test('the marker-list outcome captured at run start decides every later round', t => {
  const { cwd, parent } = fixture(t);
  // No marker at run start: a marker file added later starts no test.
  const none = cli(cwd, ['suite', '--record', path.join(parent, 'suite-none.json')]);
  assert.equal(none.status, 0, none.stdout);
  assert.equal(none.payload.data.command, null);
  const fixedNone = ['--suite', none.payload.record, '--suite-hash', none.payload.record_hash];
  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "process.exit(3)"' } }));
  assert.equal(merge.verify(cwd).data.verification_result, 'failed', 'detection now would run the new marker');
  const stillNone = cli(cwd, ['verify', ...fixedNone, '--record', path.join(parent, 'verify-none.json')]);
  assert.equal(stillNone.status, 0, stillNone.stdout);
  assert.equal(stillNone.payload.data.verification_result, 'unavailable');
  assert.equal(stillNone.payload.data.unavailable_reason, 'no-suite');
  // One command at run start: a marker file that would select another command changes nothing.
  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "console.log(1)"' } }));
  const npm = cli(cwd, ['suite', '--record', path.join(parent, 'suite-npm.json')]);
  assert.deepEqual(npm.payload.data.command, ['npm', 'test']);
  const fixedNpm = ['--suite', npm.payload.record, '--suite-hash', npm.payload.record_hash];
  fs.writeFileSync(path.join(cwd, 'pnpm-lock.yaml'), '');
  assert.deepEqual(merge.suite(cwd).data.command, ['pnpm', 'test'], 'detection now would select another command');
  const fixedRun = cli(cwd, ['verify', ...fixedNpm, '--record', path.join(parent, 'verify-npm.json')]).payload;
  assert.deepEqual(fixedRun.data.command, ['npm', 'test']);
  assert.equal(fixedRun.data.command_source, 'list');
  assert.equal(fixedRun.data.verification_result, 'passed', JSON.stringify(fixedRun.data));
  // An ambiguous outcome at run start stays unavailable with its reason.
  fs.rmSync(path.join(cwd, 'package.json')); fs.rmSync(path.join(cwd, 'pnpm-lock.yaml'));
  fs.writeFileSync(path.join(cwd, 'A.sln'), ''); fs.writeFileSync(path.join(cwd, 'B.sln'), '');
  const ambiguous = merge.suite(cwd);
  fs.rmSync(path.join(cwd, 'B.sln'));
  assert.equal(merge.verify(cwd, undefined, ambiguous).data.unavailable_reason, 'ambiguous-suite');
  // The record is used only unchanged, and only one source is named.
  assert.equal(cli(cwd, ['verify', '--suite', npm.payload.record, '--suite-hash', none.payload.record_hash]).status, 2);
  assert.equal(cli(cwd, ['verify', '--suite', npm.payload.record]).status, 2);
  assert.equal(cli(cwd, ['verify', ...fixedNpm, '--command', 'node --version']).status, 2);
  assert.throws(() => merge.verify(cwd, undefined, merge.preflight(cwd)), /captured suite receipt required/);
});

test('the coordinator fixes the test command once, before anything runs, and reports a not-runnable command apart', () => {
  const coordinator = fs.readFileSync(path.join(ROOT, 'sai/commands/merge/coordinator.md'), 'utf8');
  const fix = coordinator.indexOf('Fix the test command once');
  assert.ok(fix > coordinator.indexOf('2. Run `merge.js preflight`'));
  assert.ok(fix < coordinator.indexOf('Take the baseline with `merge.js verify --baseline'), 'fixed before the baseline and the launch');
  assert.ok(coordinator.indexOf('`AGENTS.md`, then `README.md`') > fix);
  assert.match(coordinator, /`merge\.js suite --record`/);
  assert.match(coordinator, /a document naming several with none clearly the general one names none/);
  assert.match(coordinator, /use it for every run of the suite/);
  const mechanics = fs.readFileSync(path.join(ROOT, 'sai/commands/merge/mechanics.md'), 'utf8');
  assert.match(mechanics, /`verify` reports `unavailable` with its reason[\s\S]+not a failing test and not a pass/);
  const doc = fs.readFileSync(path.join(ROOT, 'docs/commands/sai-merge.md'), 'utf8');
  assert.match(doc, /`AGENTS\.md`, then one in `README\.md`, then the project markers/);
});

test('the tool has no stage entry points: instructions travel by pointer and the hand-over by file', () => {
  for (const retired of ['instructions', 'enter', 'STAGES']) assert.equal(merge[retired], undefined, retired);
  for (const args of [['enter', '--stage', 'preflight'], ['instructions', '--stage', 'strategy']]) {
    const run = spawnSync(process.execPath, [TOOL, ...args, '--json', '--cwd', ROOT], { encoding: 'utf8' });
    assert.equal(run.status, 2, `${args[0]} is retired`);
  }
  const help = spawnSync(process.execPath, [TOOL, '--help'], { encoding: 'utf8' }).stdout;
  assert.doesNotMatch(help, /enter|--reconstruct|--stage/);
  for (const action of ['preflight', 'provenance', 'conflicts', 'bundle', 'write', 'verify', 'collision', 'status']) {
    assert.match(help, new RegExp(action), `${action} stays`);
  }
  const mechanics = fs.readFileSync(path.join(ROOT, 'sai/commands/merge/mechanics.md'), 'utf8');
  for (const action of ['preflight', 'provenance', 'conflicts', 'bundle', 'write', 'resolution', 'correction', 'suite', 'verify', 'collision', 'status']) {
    assert.match(mechanics, new RegExp(`\`${action}`), `mechanics documents ${action}`);
  }
});

test('one preflight, provenance, conflicts, resolution, collision and status sequence works through the CLI alone', t => {
  const { cwd, parent } = fixture(t);
  const start = cli(cwd, ['preflight']);
  assert.equal(start.status, 0, start.stdout);
  assert.deepEqual(start.payload.data.candidates.map(item => item.name), ['feature']);

  // Branch validation and provenance are one call: format, existence, commit, capture.
  const missing = cli(cwd, ['provenance', '--source-ref', 'refs/heads/absent', '--method', 'merge', '--squash', 'not-applicable']);
  assert.equal(missing.status, 2);
  assert.match(missing.payload.error, /show-ref|rev-parse/);
  const captured = cli(cwd, ['provenance', '--source-ref', 'refs/heads/feature', '--method', 'merge', '--squash', 'not-applicable']);
  assert.equal(captured.status, 0, captured.payload.error);
  assert.equal(git(cwd, ['merge', '--no-ff', '--no-commit', 'refs/heads/feature'], true).status, 1);

  const stop = cli(cwd, ['conflicts', '--record', path.join(parent, 'stop-1.json')]);
  assert.equal(stop.status, 0, stop.stdout);
  assert.deepEqual(stop.payload.data.categories, { specs: 0, 'adr-ddr': 0, code: 1 });
  assert.deepEqual(stop.payload.data.operation, { merge_in_progress: true, rebase_in_progress: false });
  assert.equal(stop.payload.data.files[0].before, undefined);
  assert.equal(stop.payload.record_hash, hash(fs.readFileSync(stop.payload.record)));

  const snapshot = JSON.parse(fs.readFileSync(stop.payload.record));
  writeAuthored(cwd, snapshot); git(cwd, ['add', 'f.txt']);
  const verified = cli(cwd, ['verify', '--record', path.join(parent, 'verify-1.json')]);
  assert.equal(verified.status, 0, verified.stdout);
  assert.equal(verified.payload.data.verification_result, 'unavailable');
  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "process.exit(3)"' } }));
  const failed = cli(cwd, ['verify', '--record', path.join(parent, 'verify-2.json')]);
  assert.equal(failed.status, 1, 'a failed test run exits 1');
  assert.equal(failed.payload.data.verification_result, 'failed');
  assert.equal(failed.payload.data.stdout, undefined);
  fs.rmSync(path.join(cwd, 'package.json'));

  const collided = cli(cwd, ['collision', '--record', path.join(parent, 'collision.json')], JSON.stringify(captured.payload));
  assert.equal(collided.status, 0, collided.stdout);
  assert.equal(collided.payload.data.applicability, 'not-applicable');

  const closing = cli(cwd, ['status']);
  assert.equal(closing.status, 0, closing.stdout);
  assert.deepEqual(closing.payload.data.staged, ['f.txt']);
  assert.deepEqual(closing.payload.data.unmerged, []);
  assert.equal(closing.payload.data.merge_in_progress, true);
  assert.equal(closing.payload.data.head, captured.payload.data.target_sha);
});

test('a clean integration reaches closure through the tool alone, with no conflict snapshot', t => {
  const { cwd, parent } = fixture(t);
  git(cwd, ['checkout', '-b', 'side', 'HEAD~1']);
  fs.writeFileSync(path.join(cwd, 'side.txt'), 'side\n');
  git(cwd, ['add', 'side.txt']); git(cwd, ['commit', '-m', 'side']); git(cwd, ['checkout', 'main']);
  assert.equal(cli(cwd, ['preflight']).status, 0);
  const captured = cli(cwd, ['provenance', '--source-ref', 'refs/heads/side', '--method', 'merge', '--squash', 'not-applicable']);
  assert.equal(git(cwd, ['merge', '--no-ff', '--no-commit', 'refs/heads/side']).status, 0);
  const collided = cli(cwd, ['collision', '--record', path.join(parent, 'collision.json')], JSON.stringify(captured.payload));
  assert.equal(collided.payload.data.applicability, 'not-applicable');
  assert.deepEqual(cli(cwd, ['status']).payload.data.staged, ['side.txt']);
});

test('existing projections install the tool and every merge card for both harnesses', () => {
  for (const harness of ['claude', 'opencode']) {
    const root = path.join(os.tmpdir(), `sai-merge-parity-${harness}`);
    const destinationRoot = Object.fromEntries(['commands', 'sai', 'skills', 'agents', 'config', 'root'].map(name => [name, path.join(root, name)]));
    const expanded = expandInstallManifest(loadInstallManifest(ROOT), { harness, repoRoot: ROOT, destinationRoot });
    for (const name of ['tools/merge.js', 'commands/merge/coordinator.md', 'commands/merge/worker.md', 'commands/merge/mechanics.md',
      'commands/merge/steps/common.md', 'commands/merge/steps/strategy.md', 'commands/merge/steps/apply.md',
      'commands/merge/steps/test-correction.md', 'commands/merge/steps/renumbering-plan.md']) {
      assert.ok(expanded.some(item => item.harness === harness && item.destinationPath === path.join(destinationRoot.sai, name)), `${harness}: ${name}`);
    }
    for (const retired of ['instructions', 'coordinator-stages', 'presentation', 'lifecycle', 'command-bootstrap']) {
      assert.ok(!expanded.some(item => item.destinationPath === path.join(destinationRoot.sai, 'commands/merge', `${retired}.md`)), `${harness}: ${retired} retired`);
    }
  }
});

test('equivalent preflight measurement separates tool execution from instruction volume', t => {
  const { cwd } = fixture(t);
  const legacyCommands = [['status', '--porcelain'], ['rev-parse', '--verify', '-q', 'MERGE_HEAD'],
    ['rev-parse', '--verify', '-q', 'REBASE_HEAD'], ['branch', '--no-merged', 'HEAD', '--format=%(refname:short) %(committerdate:iso8601)'],
    ['rev-parse', '--abbrev-ref', 'HEAD']];
  const start = performance.now();
  const legacy = legacyCommands.map(args => git(cwd, args, true));
  const legacyMs = performance.now() - start;
  const afterStart = performance.now();
  const after = cli(cwd, ['preflight']);
  const afterMs = performance.now() - afterStart;
  assert.equal(after.status, 0);
  assert.equal(after.payload.data.current_branch, legacy[4].stdout.trim());
  assert.equal(after.payload.data.dirty.length, 0);
  assert.equal(after.payload.data.candidates[0].name, legacy[3].stdout.split(' ')[0]);
  const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/merge-efficiency-baseline.json'), 'utf8'));
  assert.equal(baseline.version, 1);
  assert.equal(baseline.instruction_bytes, 30208);
  assert.match(baseline.source_revision, /^[0-9a-f]{40}$/);
  assert.match(baseline.source_sha256, /^[0-9a-f]{64}$/);
  // The worker's first step is its judgment-point reading: the common file plus the strategy step.
  const step = name => fs.readFileSync(path.join(ROOT, 'sai/commands/merge/steps', `${name}.md`), 'utf8');
  const disclosed = Buffer.byteLength(step('common')) + Buffer.byteLength(step('strategy'));
  assert.ok(disclosed < baseline.instruction_bytes);
  t.diagnostic(JSON.stringify({ case: 'same-clean-preflight', node: process.version,
    baseline_revision: baseline.source_revision, baseline_source_sha256: baseline.source_sha256,
    before_tool_ms: legacyMs, after_tool_ms: afterMs, before_boundary_calls: legacyCommands.length, after_boundary_calls: 1,
    before_instruction_bytes: baseline.instruction_bytes, after_instruction_bytes: disclosed,
    human_wait_ms: 0, test_ms: 0, corrections: 0, model: 'not-involved', end_to_end_overhead: 'not-measured' }));
});
