#!/usr/bin/env node
'use strict';

// input file (or stdin): {change_name, transfer_dir, draft_references}; stdout: JSON evidence.
// Input: --input-file <path>; without it the input is read from stdin.
// validate --harness claude|opencode [--cwd root]
// check --fingerprint <successful validation fingerprint> [--cwd root]
// order [--target backfill|archive]: input {change_name, fingerprint, draft_references, prepared_references (required for backfill), transfer_dir (archive)};
//   stdout: the closed text of the backfill worker's `--direct-build-execute` order, or, for `archive`, the draft section of the
//   archive worker's order, or a JSON error. The format is defined in sai/commands/backfill/worker.md.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { readInput } = require('./input-reader');
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
  if (!files.has(`${prefix}.openspec.yaml`) || !files.has(`${prefix}proposal.md`)) throw new Error('Incomplete draft set');
  // A no-specs set declares skip_specs and carries no spec; any other set carries at least one.
  const noSpecs = /^skip_specs:[ \t]*true[ \t]*$/m.test(files.get(`${prefix}.openspec.yaml`).toString('utf8'));
  const specCount = files.size - 2;
  if (noSpecs && specCount > 0) throw new Error('A draft set that declares skip_specs carries no capability spec');
  if (!noSpecs && specCount === 0) throw new Error('Incomplete draft set');
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

const NAME_FORM = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const HEX = /^[a-f0-9]{64}$/;
const referenceKey = ref => JSON.stringify([ref.destination, ref.path, ref.sha256]);

// The execute order of the worker route, or the draft section of the archive order of the no-specs route.
// The order names exactly the references the worker (or the compose tool) last prepared, in the accepted set's order.
function order(input, target = 'backfill') {
  const { change_name: name, fingerprint, draft_references: accepted, prepared_references: prepared, transfer_dir: dir } = input;
  if (!['backfill', 'archive'].includes(target)) throw new Error('--target must be backfill or archive');
  if (typeof name !== 'string' || !NAME_FORM.test(name)) throw new Error('Invalid change name');
  if (typeof fingerprint !== 'string' || !HEX.test(fingerprint)) throw new Error('Expected the accepted validation fingerprint');
  if (!Array.isArray(accepted) || !accepted.length) throw new Error('Expected the accepted draft references');
  // The worker route compares with the worker's latest prepared set; the no-specs route has no worker, so its compose output is the set.
  if (target === 'backfill' && !Array.isArray(prepared)) throw new Error('Expected the latest prepared_references of the backfill worker');
  const latest = Array.isArray(prepared) ? prepared : accepted;
  const prefix = `openspec/changes/${name}/`;
  const seen = new Set();
  for (const ref of accepted) {
    if (!ref || typeof ref.path !== 'string' || !path.isAbsolute(ref.path) || typeof ref.sha256 !== 'string' || !HEX.test(ref.sha256) || typeof ref.destination !== 'string' || !ref.destination.startsWith(prefix)) throw new Error('Invalid draft reference');
    const relative = ref.destination.slice(prefix.length);
    const metadataOrProposal = ['.openspec.yaml', 'proposal.md'].includes(relative);
    if (!metadataOrProposal && (target === 'archive' || !/^specs\/[A-Za-z0-9][A-Za-z0-9_-]*\/spec\.md$/.test(relative))) throw new Error('Invalid draft destination');
    if (seen.has(ref.destination)) throw new Error('Duplicate draft destination');
    seen.add(ref.destination);
  }
  if (!seen.has(`${prefix}.openspec.yaml`) || !seen.has(`${prefix}proposal.md`)) throw new Error('Incomplete draft set');
  if (accepted.map(referenceKey).sort().join() !== latest.map(referenceKey).sort().join()) throw new Error('The accepted references do not match the latest prepared set; no order is produced');
  if (target === 'archive' && (typeof dir !== 'string' || !path.isAbsolute(dir) || accepted.some(ref => !ref.path.startsWith(`${dir}${path.sep}`)))) throw new Error('Expected the absolute transfer directory holding every reference');
  const drafts = ['drafts:', ...accepted.flatMap(ref => [`- path: ${ref.path}`, `  sha256: ${ref.sha256}`, `  destination: ${ref.destination}`])];
  const lines = target === 'archive'
    ? [`transfer_dir: ${dir}`, `fingerprint: ${fingerprint}`, ...drafts]
    : ['--direct-build-execute', `change_name: ${name}`, `fingerprint: ${fingerprint}`, ...drafts];
  return lines.join('\n');
}

function main(argv) {
  const [command, ...args] = argv;
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--cwd', '--harness', '--fingerprint', '--input-file', '--target'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Expected validate|check|order [--cwd root] [--harness claude|opencode] [--fingerprint hash] [--input-file path] [--target backfill|archive]');
    options[args[i].slice(2)] = args[i + 1];
  }
  const input = JSON.parse(readInput(options['input-file']));
  if (command === 'validate') return validate(input, options);
  if (command === 'order') return { ok: true, order: order(input, options.target) };
  if (command === 'check' && /^[a-f0-9]{64}$/.test(options.fingerprint || '')) {
    const current = collect(input, options.cwd || process.cwd()).fingerprint;
    return { ok: current === options.fingerprint, fingerprint: current, ...(current === options.fingerprint ? {} : { error: 'Inputs changed; repeat validation before writing' }) };
  }
  throw new Error('Expected validate, order, or check --fingerprint <successful validation fingerprint>');
}
if (require.main === module) {
  let result;
  try { result = main(process.argv.slice(2)); } catch (error) { result = { ok: false, error: error.message }; }
  process.stdout.write(result.ok && typeof result.order === 'string' ? `${result.order}\n` : `${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
module.exports = { collect, validate, order, main };
