'use strict';

// Exact-path plan inclusion for to-pr. The real index is never used to build the commit.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { makeTempDir, removeInside } = require('./temp-root');
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function git(cwd, args, env = {}) {
  return execFileSync('git', [...(['check-ignore', 'update-index'].includes(args[0]) ? [] : ['--literal-pathspecs']), ...args], { cwd, env: { ...process.env, ...env }, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}
const documents = ['proposal.md', 'design.md', 'tasks.md', 'interfaces.md', '.openspec.yaml', 'change-overview.md'];
function query(request, io) {
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
  for (const file of git(cwd, ['ls-tree', '-r', '--name-only', '-z', 'HEAD', '--', root]).split('\0').filter(Boolean)) {
    if (eligible(file.slice(root.length + 1))) files.add(file);
  }
  if (!files.has(`${root}/proposal.md`) || !fs.existsSync(path.join(absolute, 'proposal.md'))) throw new Error('The completed plan must have proposal.md');
  const entries = [...files].sort().map(file => {
    const full = path.join(cwd, file), exists = fs.existsSync(full);
    const content = exists ? fs.readFileSync(full) : null;
    let ignored = false;
    try { ignored = !!git(cwd, ['check-ignore', '--no-index', '--', file]).trim(); } catch (error) { if (error.status !== 1) throw error; }
    return { path: file, ignored, deleted: !exists, sha256: content && crypto.createHash('sha256').update(content).digest('hex'), mode: exists && (fs.statSync(full).mode & 0o111) ? '100755' : '100644' };
  });
  const proposal = { change: request.change, source: git(cwd, ['symbolic-ref', '--quiet', '--short', 'HEAD']).trim(), head: git(cwd, ['rev-parse', 'HEAD']).trim(), files: entries,
    index: git(cwd, ['ls-files', '--stage', '-z', '--', ...entries.map(row => row.path)]) };
  return { status: 'ready', proposal, confirmation: digest(proposal) };
}
function commit(request, io) {
  const ready = query(request, io);
  if (request.approved !== true || request.confirmation !== ready.confirmation) throw new Error('Exact plan files, excluded files and content approval required; review again');
  const cwd = io.cwd || process.cwd(), proposal = ready.proposal;
  const directory = makeTempDir(request.harness, 'plan-publication-');
  const env = { GIT_INDEX_FILE: path.join(directory, 'index') };
  const paths = proposal.files.map(row => row.path);
  try {
    git(cwd, ['read-tree', proposal.head], env);
    // Only this approved list can bypass ignore rules, inside the private index.
    for (const row of proposal.files) {
      if (row.deleted) git(cwd, ['update-index', '--force-remove', '--', row.path], env);
      else git(cwd, ['add', ...(row.ignored ? ['-f'] : []), '--', row.path], env);
    }
    if (git(cwd, ['write-tree'], env).trim() === git(cwd, ['rev-parse', `${proposal.head}^{tree}`]).trim()) return { status: 'no_changes', head: proposal.head, files: paths };
    // Recheck after snapshotting: content, index and HEAD changes require renewed approval.
    if (query(request, io).confirmation !== request.confirmation) throw new Error('Plan changed while preparing the commit; review again');
    git(cwd, ['commit', '-m', `docs: publish plan for ${request.change}`], env);
    const head = git(cwd, ['rev-parse', 'HEAD']).trim();
    // Synchronize only owned entries; unrelated staged changes remain byte-for-byte staged.
    git(cwd, ['reset', '-q', head, '--', ...paths]);
    return { status: 'complete', head, files: paths };
  } finally { removeInside(request.harness, directory); }
}
module.exports = { query, commit };
