#!/usr/bin/env node
'use strict';

// stdin: {change_name, transfer_dir, draft_references}; stdout: JSON evidence.
// validate --harness claude|opencode [--cwd root]
// check --fingerprint <successful validation fingerprint> [--cwd root]
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { verify } = require('./transfer');
const { makeTempDir, harnessFromInstalledPath } = require('./temp-root');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function collect(input, cwd) {
  const { change_name: name, transfer_dir: dir, draft_references: refs } = input;
  if (typeof name !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name) || !Array.isArray(refs)) throw new Error('Expected change_name, transfer_dir, and complete draft_references');
  const prefix = `openspec/changes/${name}/`;
  const files = new Map();
  for (const ref of refs) {
    if (!ref || typeof ref.destination !== 'string' || !ref.destination.startsWith(prefix)) throw new Error('Invalid draft destination');
    const relative = ref.destination.slice(prefix.length);
    if (!['.openspec.yaml', 'proposal.md'].includes(relative) && !/^specs\/[A-Za-z0-9][A-Za-z0-9_-]*\/spec\.md$/.test(relative)) throw new Error('Invalid draft destination');
    if (files.has(ref.destination)) throw new Error('Duplicate draft destination');
    const { bytes } = verify(dir, ref);
    files.set(ref.destination, bytes);
  }
  if (!files.has(`${prefix}.openspec.yaml`) || !files.has(`${prefix}proposal.md`) || files.size < 3) throw new Error('Incomplete draft set');
  // Copy every specification, including untouched capabilities, at its relative path.
  // Only a missing optional root means absent; unreadable or unsafe entries fail.
  function copyInput(relative, optional = false) {
    const source = path.join(cwd, relative);
    let stat;
    try { stat = fs.lstatSync(source); }
    catch (error) { if (optional && error.code === 'ENOENT') return; throw error; }
    if (stat.isSymbolicLink()) throw new Error(`Symbolic input is not supported: ${relative}`);
    if ((relative === 'openspec/specs' || relative === 'openspec/schemas') && !stat.isDirectory()) throw new Error(`Expected directory: ${relative}`);
    if ((relative.endsWith('/spec.md') || relative === 'openspec/config.yaml') && !stat.isFile()) throw new Error(`Expected regular file: ${relative}`);
    if (stat.isDirectory()) {
      for (const child of fs.readdirSync(source).sort()) copyInput(`${relative}/${child}`);
    } else if (stat.isFile()) files.set(relative, fs.readFileSync(source));
    else throw new Error(`Not a regular input: ${relative}`);
  }
  const openspec = fs.lstatSync(path.join(cwd, 'openspec'));
  if (!openspec.isDirectory() || openspec.isSymbolicLink()) throw new Error('openspec must be a real directory');
  copyInput('openspec/specs', true);
  copyInput('openspec/config.yaml', true);
  copyInput('openspec/schemas', true);
  const entries = [...files].sort(([a], [b]) => a.localeCompare(b));
  const fingerprint = hash(JSON.stringify({ cwd: fs.realpathSync(cwd), name, refs, files: entries.map(([file, bytes]) => [file, hash(bytes)]) }));
  return { files: entries, fingerprint };
}

// npm's Windows shim needs a shell; every argument passed here is a fixed literal or a validated name.
function openspec(args, options) {
  return spawnSync('openspec', args, { encoding: 'utf8', shell: process.platform === 'win32', env: { ...process.env, OPENSPEC_TELEMETRY: '0' }, ...options });
}

function validate(input, { cwd = process.cwd(), harness = harnessFromInstalledPath(__filename) } = {}) {
  let project;
  try {
    // A CLI that cannot launch is checked before the drafts, so the reason wins over any draft problem
    // and no correction attempt is spent on it.
    const probe = openspec(['--version'], { timeout: 30000 });
    if (probe.error || probe.status !== 0) {
      const diagnostic = { command: ['openspec', '--version'], exit_code: probe.status, stdout: probe.stdout || '', stderr: probe.stderr || '', error: probe.error?.message || null };
      return { ok: false, reason: 'openspec-cli-unavailable', diagnostic, error: 'The OpenSpec CLI could not be launched; draft correction cannot help' };
    }
    const snapshot = collect(input, cwd);
    project = makeTempDir(harness, 'backfill-validation-');
    for (const [relative, bytes] of snapshot.files) {
      const target = path.join(project, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, bytes);
    }
    const args = ['validate', input.change_name, '--type', 'change', '--json', '--no-interactive'];
    const result = openspec(args, { cwd: project, timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
    const diagnostic = { command: ['openspec', ...args], exit_code: result.status, stdout: result.stdout || '', stderr: result.stderr || '', error: result.error?.message || null };
    let report;
    try { report = JSON.parse(result.stdout); } catch { /* Incomplete output cannot authorize writes. */ }
    const items = report?.items;
    if (result.error || result.status !== 0 || !Array.isArray(items) || items.length !== 1 || items[0].id !== input.change_name || items[0].type !== 'change' || items[0].valid !== true || report.root?.path !== project) return { ok: false, project_dir: project, diagnostic, error: 'OpenSpec rejected the draft set or validation did not complete in the temporary project' };
    if (collect(input, cwd).fingerprint !== snapshot.fingerprint) return { ok: false, project_dir: project, diagnostic, error: 'Inputs changed during validation; repeat validation' };
    return { ok: true, fingerprint: snapshot.fingerprint, project_dir: project, diagnostic };
  } catch (error) { return { ok: false, ...(project ? { project_dir: project } : {}), error: error.message }; }
}

function main(argv) {
  const [command, ...args] = argv;
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--cwd', '--harness', '--fingerprint'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Expected validate|check [--cwd root] [--harness claude|opencode] [--fingerprint hash]');
    options[args[i].slice(2)] = args[i + 1];
  }
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));
  if (command === 'validate') return validate(input, options);
  if (command === 'check' && /^[a-f0-9]{64}$/.test(options.fingerprint || '')) {
    const current = collect(input, options.cwd || process.cwd()).fingerprint;
    return { ok: current === options.fingerprint, fingerprint: current, ...(current === options.fingerprint ? {} : { error: 'Inputs changed; repeat validation before writing' }) };
  }
  throw new Error('Expected validate or check --fingerprint <successful validation fingerprint>');
}
if (require.main === module) {
  let result;
  try { result = main(process.argv.slice(2)); } catch (error) { result = { ok: false, error: error.message }; }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
module.exports = { collect, validate, main };
