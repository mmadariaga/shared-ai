'use strict';

// Exact-path plan inclusion for to-pr. The real index is never used to build the commit.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { runProcess } = require('./backlog-process');
const { makeTempDir, removeInside } = require('./temp-root');
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Every git call runs through the bounded runner: a call that outlives the limit ends together with its descendants
// (hooks included) and rejects with `reason: 'process-timeout'`. A failing call rejects with its exit `status`.
async function git(cwd, args, env = {}) {
  const result = await runProcess('git', [...(['check-ignore', 'update-index'].includes(args[0]) ? [] : ['--literal-pathspecs']), ...args],
    { step: `git ${args[0]}`, cwd, env: { ...process.env, ...env }, encoding: 'utf8', shell: false, maxBuffer: 256 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw Object.assign(new Error(`git ${args[0]}: ${result.error?.message || result.stderr || `exit ${result.status}`}`), { status: result.status, stderr: result.stderr });
  return result.stdout;
}
const documents = ['proposal.md', 'design.md', 'tasks.md', 'interfaces.md', '.openspec.yaml', 'change-overview.md'];
async function query(request, io) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(request.change || '')) throw new Error('A current change name is required');
  const cwd = io.cwd || process.cwd(), root = `openspec/changes/${request.change}`;
  const absolute = path.join(cwd, root);
  // Do not traverse linked ancestors, directories, or files into unrelated work.
  for (const name of ['openspec', 'openspec/changes', root]) {
    const stat = fs.lstatSync(path.join(cwd, name));
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Plan paths must be real directories');
  }
  const files = new Set();
  function walk(relative) {
    const full = path.join(absolute, relative), stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) throw new Error('Linked plan documents cannot be included');
    if (stat.isDirectory()) for (const item of fs.readdirSync(full).sort()) walk(`${relative}/${item}`);
    else if (stat.isFile()) files.add(`${root}/${relative}`);
    else throw new Error('Plan documents must be regular files');
  }
  for (const name of [...documents, 'specs']) {
    try { fs.lstatSync(path.join(absolute, name)); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    walk(name);
  }
  const eligible = name => documents.includes(name) || name.startsWith('specs/');
  // Include tracked deletions, too, so the published plan does not retain obsolete documents.
  for (const file of (await git(cwd, ['ls-tree', '-r', '--name-only', '-z', 'HEAD', '--', root])).split('\0').filter(Boolean)) {
    if (eligible(file.slice(root.length + 1))) files.add(file);
  }
  if (!files.has(`${root}/proposal.md`) || !fs.existsSync(path.join(absolute, 'proposal.md'))) throw new Error('The completed plan must have proposal.md');
  const entries = [];
  for (const file of [...files].sort()) {
    const full = path.join(cwd, file), exists = fs.existsSync(full);
    const content = exists ? fs.readFileSync(full) : null;
    let ignored = false;
    try { ignored = !!(await git(cwd, ['check-ignore', '--no-index', '--', file])).trim(); } catch (error) { if (error.status !== 1) throw error; }
    entries.push({ path: file, ignored, deleted: !exists, sha256: content && crypto.createHash('sha256').update(content).digest('hex'), mode: exists && (fs.statSync(full).mode & 0o111) ? '100755' : '100644' });
  }
  const index = await git(cwd, ['ls-files', '--stage', '-z', '--', ...entries.map(row => row.path)]);
  const staged_conflicts = await stagedConflicts(cwd, entries, index);
  const proposal = { change: request.change, source: (await git(cwd, ['symbolic-ref', '--quiet', '--short', 'HEAD'])).trim(), head: (await git(cwd, ['rev-parse', 'HEAD'])).trim(), files: entries, index, staged_conflicts };
  const confirmation = digest(proposal);
  if (staged_conflicts.length) return { status: 'blocked', reason: 'staged-content', staged_conflicts, proposal, confirmation,
    message: `Staged content of ${staged_conflicts.join(', ')} differs from both HEAD and the working tree; publishing the plan would drop it. Commit it, unstage it, or discard it, then query again.` };
  return { status: 'ready', proposal, confirmation };
}
// The owned paths whose index entry is a staged change that differs from both HEAD and the working tree: the private
// index of `commit` would not carry it, and the final reset of the owned entries would drop it from the real index.
async function stagedConflicts(cwd, entries, index) {
  const paths = entries.map(row => row.path);
  const staged = new Map();
  for (const record of index.split('\0').filter(Boolean)) {
    const [meta, file] = record.split('\t'), [mode, oid, stage] = meta.split(' ');
    staged.set(file, stage === '0' ? `${mode} ${oid}` : 'unmerged');
  }
  const head = new Map();
  for (const record of (await git(cwd, ['ls-tree', '-r', '-z', 'HEAD', '--', ...paths])).split('\0').filter(Boolean)) {
    const [meta, file] = record.split('\t'), [mode, , oid] = meta.split(' ');
    head.set(file, `${mode} ${oid}`);
  }
  const present = entries.filter(row => !row.deleted);
  const hashes = present.length ? (await git(cwd, ['hash-object', '--', ...present.map(row => row.path)])).split('\n').filter(Boolean) : [];
  const working = new Map(present.map((row, position) => [row.path, `${row.mode} ${hashes[position]}`]));
  return paths.filter(file => {
    const entry = staged.get(file) ?? null;
    return entry !== (head.get(file) ?? null) && entry !== (working.get(file) ?? null);
  });
}
async function commit(request, io) {
  const ready = await query(request, io);
  // Staged content the commit would drop is data loss that cannot be undone: nothing is written and the real index stays as it is.
  if (ready.status === 'blocked') throw Object.assign(new Error(ready.message), { reason: ready.reason, staged_conflicts: ready.staged_conflicts });
  if (request.approved !== true || request.confirmation !== ready.confirmation) throw new Error('Exact plan files, excluded files and content approval required; review again');
  const cwd = io.cwd || process.cwd(), proposal = ready.proposal;
  const directory = makeTempDir(request.harness, 'plan-publication-');
  const env = { GIT_INDEX_FILE: path.join(directory, 'index') };
  const paths = proposal.files.map(row => row.path);
  try {
    await git(cwd, ['read-tree', proposal.head], env);
    // Only this approved list can bypass ignore rules, inside the private index.
    for (const row of proposal.files) {
      if (row.deleted) await git(cwd, ['update-index', '--force-remove', '--', row.path], env);
      else await git(cwd, ['add', ...(row.ignored ? ['-f'] : []), '--', row.path], env);
    }
    if ((await git(cwd, ['write-tree'], env)).trim() === (await git(cwd, ['rev-parse', `${proposal.head}^{tree}`])).trim()) return { status: 'no_changes', head: proposal.head, files: paths };
    // Recheck after snapshotting: content, index and HEAD changes require renewed approval.
    if ((await query(request, io)).confirmation !== request.confirmation) throw new Error('Plan changed while preparing the commit; review again');
    try { await git(cwd, ['commit', '-m', `docs: publish plan for ${request.change}`], env); }
    catch (error) {
      if (error.reason !== 'process-timeout') throw error;
      return await uncertain(cwd, proposal, paths, 'commit-timeout', 'The commit did not finish within the process limit and was stopped');
    }
    const head = (await git(cwd, ['rev-parse', 'HEAD'])).trim();
    // Synchronize only owned entries; unrelated staged changes remain byte-for-byte staged.
    try { await git(cwd, ['reset', '-q', head, '--', ...paths]); }
    catch (error) {
      if (error.reason !== 'process-timeout') throw error;
      return { status: 'uncertain', reason: 'reset-timeout', head, files: paths, message: 'The plan commit exists, but synchronizing its owned index entries did not finish within the process limit. Check git status before publishing; the commit is not repeated.' };
    }
    return { status: 'complete', head, files: paths };
  } finally { removeInside(request.harness, directory); }
}
// After a commit timeout HEAD is read back, never assumed: a surviving git process may still be writing the commit, so
// the result is uncertain whichever HEAD the readback shows, and the commit is never repeated.
async function uncertain(cwd, proposal, files, reason, cause) {
  let head = null;
  try { head = (await git(cwd, ['rev-parse', 'HEAD'])).trim(); } catch { /* The readback is itself bounded and advisory. */ }
  const state = head === null ? 'unverified' : head === proposal.head ? 'unchanged' : 'moved';
  const seen = { unverified: 'HEAD could not be read back.', unchanged: 'HEAD is still the approved commit.', moved: 'HEAD moved, so a plan commit may exist.' }[state];
  return { status: 'uncertain', reason, head, head_state: state, files, message: `${cause}. ${seen} The commit is not repeated automatically; check git log and git status before publishing.` };
}
module.exports = { query, commit };
