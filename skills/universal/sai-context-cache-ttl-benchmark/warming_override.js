#!/usr/bin/env node
'use strict';

/**
 * Warming override of the cache TTL benchmark. While the benchmark measures, SAI agents must not warm the cache,
 * so it writes a `warming` entry that turns warming off for both roles into `.sai/settings.local.jsonc`, and puts the
 * file back afterwards. The installed reader cannot edit JSONC without `jsonc-parser`, so the restoration is byte
 * for byte: a restoration record under the SAI temp root holds the exact bytes of the file (or the fact that it was
 * absent) and the hash of the override that this tool wrote. Applying and restoring also write a cutoff mark under
 * the SAI temp root; the cache warmer's `wait.js` ends, at their next wake, the chains of waits armed before it.
 *
 * CLI (JSON on stdout; exit 0 on `ok: true`, 1 otherwise):
 *   node warming_override.js status|apply|restore|verify [--project <dir>] [--harness claude|opencode]
 *                            [--sai-root <dir>] [--tools-dir <dir>]
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const LOCAL_FILE = path.join('.sai', 'settings.local.jsonc');
const CUTOFF_FILE = 'warming-cutoff.json'; // the name `wait.js` reads
const WARMING_OFF = Object.freeze({ defaults: { agent: false, subagent: false }, rules: [] });
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

/** The installed sai/tools folder beside this skill folder; tests pass their own. */
const defaultToolsDir = () => path.resolve(__dirname, '..', '..', 'sai', 'tools');
const loadTool = (toolsDir, name) => require(path.join(toolsDir, name));

function writeAtomic(file, bytes, mode) {
  const temp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temp, bytes, mode === undefined ? undefined : { mode });
    fs.renameSync(temp, file);
  } catch (error) {
    fs.rmSync(temp, { force: true });
    throw error;
  }
}

/** Mark now as the moment before which every armed wait chain ends. The mark only moves forward. */
function markCutoff(saiRoot, now = Date.now()) {
  const file = path.join(saiRoot, CUTOFF_FILE);
  let held;
  try { held = JSON.parse(fs.readFileSync(file, 'utf8')).cutoff_ms; } catch { held = undefined; }
  const cutoff = Number.isFinite(held) ? Math.max(held, now) : now;
  writeAtomic(file, `${JSON.stringify({ cutoff_ms: cutoff })}\n`, 0o600);
}

function readLocal(file) {
  try { return { present: true, bytes: fs.readFileSync(file) }; }
  catch (error) { if (error.code === 'ENOENT') return { present: false }; throw error; }
}

/** The settings root the reader uses for `project`, so the override lands in the file the reader reads. */
const settingsRoot = (tools, project) => tools.projectRoot(project).root;
const recordFile = (saiRoot, root) => path.join(saiRoot, `benchmark-warming-${sha256(root).slice(0, 16)}.json`);

function readRecord(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

/** The override text: the values the local file already holds, re-serialized, with `warming` off for both roles. */
function overrideText(tools, bytes) {
  const text = bytes ? bytes.toString('utf8') : '';
  let held = {};
  if (text.trim() !== '') {
    try { held = tools.parseJsonc(text); } catch (error) { return { error: `${LOCAL_FILE} cannot be parsed: ${error.message}` }; }
    if (held === null || typeof held !== 'object' || Array.isArray(held)) return { error: `${LOCAL_FILE} must hold a JSON object` };
  }
  return { text: `${JSON.stringify({ ...held, warming: WARMING_OFF }, null, 2)}\n` };
}

/** Report whether a restoration record is waiting, left by a run that did not finish. */
function status({ tools, saiRoot, project }) {
  const root = settingsRoot(tools, project);
  const record = readRecord(recordFile(saiRoot, root));
  return { ok: true, status: record ? 'record-found' : 'no-record', file: path.join(root, LOCAL_FILE) };
}

/** Record the file's state, then write the override. A waiting record is never overwritten. */
function apply({ tools, saiRoot, project }) {
  const root = settingsRoot(tools, project);
  const file = path.join(root, LOCAL_FILE);
  const recordPath = recordFile(saiRoot, root);
  if (readRecord(recordPath)) return { ok: false, status: 'record-found', message: 'A restoration record from an earlier run is waiting; restore it first.' };
  const current = readLocal(file);
  const dirExisted = fs.existsSync(path.dirname(file));
  const override = overrideText(tools, current.present ? current.bytes : null);
  if (override.error) return { ok: false, status: 'unreadable', message: `${override.error}; the benchmark does not overwrite a local file it cannot read.` };
  const bytes = Buffer.from(override.text, 'utf8');
  const record = { version: 1, file, state: current.present ? 'present' : 'absent', ...(current.present ? { original_base64: current.bytes.toString('base64') } : {}), override_sha256: sha256(bytes), sai_dir_created: !dirExisted };
  writeAtomic(recordPath, `${JSON.stringify(record)}\n`, 0o600);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    writeAtomic(file, bytes);
  } catch (error) {
    fs.rmSync(recordPath, { force: true });
    return { ok: false, status: 'write-failed', message: `Cannot write ${LOCAL_FILE}: ${error.message}` };
  }
  markCutoff(saiRoot);
  return { ok: true, status: 'applied', file, created: !current.present, override_sha256: record.override_sha256 };
}

/** Remove the `.sai/` folder that the override created, and only while it is empty. */
function removeEmptyDirectory(directory) {
  try { fs.rmdirSync(directory); } catch { /* not empty, already gone, or not removable: it stays */ }
}

/** Put the recorded state back. A file that no longer holds the written override stays where it is. */
function restore({ tools, saiRoot, project }) {
  const root = settingsRoot(tools, project);
  const recordPath = recordFile(saiRoot, root);
  const record = readRecord(recordPath);
  if (!record) return { ok: true, status: 'no-record', file: path.join(root, LOCAL_FILE) };
  const { file } = record;
  const current = readLocal(file);
  if (current.present && sha256(current.bytes) !== record.override_sha256) {
    const stale = `${recordPath}.stale`;
    fs.renameSync(recordPath, stale);
    markCutoff(saiRoot);
    return {
      ok: true, status: 'changed', file, stale_record: stale,
      warning: `${file} changed after the benchmark wrote its warming override, so it was left as it is. Restoring it is up to you: the original is kept in ${stale}.`,
    };
  }
  if (record.state === 'present') writeAtomic(file, Buffer.from(record.original_base64, 'base64'));
  else if (current.present) fs.rmSync(file);
  fs.rmSync(recordPath, { force: true });
  if (record.sai_dir_created) removeEmptyDirectory(path.dirname(file));
  markCutoff(saiRoot);
  return { ok: true, status: 'restored', file, removed: record.state === 'absent' };
}

/** Confirm that the resolver turns warming off for both roles with the override in place. */
function verify({ tools, project }) {
  const root = settingsRoot(tools, project);
  const roles = {};
  for (const role of tools.WARMING_ROLES) roles[role] = tools.warming({ provider: 'benchmark', model: 'benchmark', role }, { cwd: root, locate: false }).warming;
  return { ok: Object.values(roles).every(value => value === 'off'), status: 'verified', roles };
}

const ACTIONS = { status, apply, restore, verify };

function parseArguments(argv) {
  const [action, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    if (!['--project', '--harness', '--sai-root', '--tools-dir'].includes(flag) || rest[index + 1] === undefined) throw new Error(`Unexpected argument ${flag}`);
    options[flag.slice(2)] = rest[index + 1];
  }
  if (!ACTIONS[action]) throw new Error('Usage: warming_override.js status|apply|restore|verify [--project <dir>] [--harness claude|opencode] [--sai-root <dir>] [--tools-dir <dir>]');
  return { action, options };
}

function main(argv) {
  try {
    const { action, options } = parseArguments(argv);
    const toolsDir = options['tools-dir'] ?? defaultToolsDir();
    const tempRoot = loadTool(toolsDir, 'temp-root.js');
    const saiRoot = options['sai-root'] ?? tempRoot.resolveTempRoot(options.harness ?? tempRoot.harnessFromInstalledPath(__filename));
    const result = ACTIONS[action]({ tools: loadTool(toolsDir, 'project-settings.js'), saiRoot, project: path.resolve(options.project ?? process.cwd()) });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result.ok ? 0 : 1;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ ok: false, status: 'error', message: error.message })}\n`);
    return 1;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { CUTOFF_FILE, LOCAL_FILE, WARMING_OFF, recordFile, status, apply, restore, verify, main };
