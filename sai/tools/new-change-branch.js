#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.error) throw new Error(result.error.message);
  return { status: result.status, out: (result.stdout || '').trim(), error: (result.stderr || '').trim() };
}

function required(cwd, args) {
  const result = git(cwd, args);
  if (result.status !== 0) throw new Error(result.error || `git ${args[0]} failed`);
  return result.out;
}

function active(cwd) {
  try {
    return git(cwd, ['symbolic-ref', '--quiet', '--short', 'HEAD']).out || null;
  } catch {
    return null;
  }
}

function commit(cwd, base) {
  if (typeof base !== 'string' || !base || base.startsWith('-')) throw new Error('Enter an existing base that resolves to a commit.');
  return required(cwd, ['rev-parse', '--verify', '--end-of-options', `${base}^{commit}`]);
}

function busy(cwd) {
  return ['MERGE_HEAD', 'rebase-merge', 'rebase-apply'].some((name) =>
    fs.existsSync(path.resolve(cwd, required(cwd, ['rev-parse', '--git-path', name]))));
}

function name(cwd, input) {
  if (!['feat', 'fix', 'docs', 'chore'].includes(input.type)) throw new Error('Choose feat, fix, docs, or chore.');
  if (typeof input.name !== 'string') throw new Error('Enter a change name.');
  const normalized = input.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  if (!normalized) throw new Error('Enter a non-empty change name.');
  if (input.id !== undefined && (typeof input.id !== 'string' || !input.id)) throw new Error('Provide the actual identifier or omit it.');
  const branch = `${input.type}/${input.id === undefined ? '' : `${input.id}_`}${normalized}`;
  if (git(cwd, ['check-ref-format', `refs/heads/${branch}`]).status !== 0) throw new Error(`Invalid branch name: ${branch}. Request a correction; preserve the identifier.`);
  if (git(cwd, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]).status === 0) throw new Error(`Branch already exists: ${branch}. Choose another name.`);
  return branch;
}

function inspect(cwd) {
  const head = commit(cwd, 'HEAD');
  if (busy(cwd)) throw new Error('A merge or rebase is in progress. Finish it before creating a branch.');
  const current = git(cwd, ['symbolic-ref', '--quiet', 'HEAD']).out || null;
  const refs = required(cwd, ['for-each-ref', '--format=%(refname)\t%(objectname)\t%(symref)', 'refs/heads', 'refs/remotes'])
    .split('\n').filter(Boolean).map((line) => {
      const [ref, sha, symbolic] = line.split('\t');
      return { ref, sha, symbolic };
    }).filter((r) => !r.symbolic).sort((a, b) => a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0);
  const history = required(cwd, ['rev-list', '--first-parent', '--max-count=20', 'HEAD']).split('\n');
  let parent = null;
  for (const sha of history) {
    const match = refs.find((r) => r.ref !== current && r.sha === sha);
    if (match) { parent = match.ref; break; }
  }
  const options = [current, parent, ...refs.filter((r) => r.ref.endsWith('/main')).map((r) => r.ref),
    ...refs.filter((r) => r.ref.endsWith('/master')).map((r) => r.ref)].filter(Boolean);
  return { status: 'ready', head, current: active(cwd), parent, bases: [...new Set(options)] };
}

function execute(operation, input = {}, cwd = process.cwd()) {
  let branch = null;
  let attempted = false;
  try {
    if (input.cancelled === true) return { status: 'cancelled', created: false, active_branch: active(cwd) };
    required(cwd, ['rev-parse', '--show-toplevel']);
    if (operation === 'inspect') return inspect(cwd);
    if (operation === 'name') return { status: 'ready', branch: name(cwd, input) };
    if (operation === 'base') return { status: 'ready', base: input.base, sha: commit(cwd, input.base) };
    if (operation !== 'create') throw new Error('Use inspect, name, base, or create.');
    branch = name(cwd, input);
    const sha = commit(cwd, input.base);
    if (sha !== input.sha) throw new Error('The base changed. Select and resolve the base again.');
    if (busy(cwd)) throw new Error('A merge or rebase is in progress. No branch was created.');
    attempted = true;
    const result = git(cwd, ['switch', '--no-track', '-c', branch, sha]);
    const created = git(cwd, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]).status === 0;
    if (result.status !== 0) return { status: 'failed', reason: result.error, attempted, created, active_branch: active(cwd), incomplete: 'creation and switch verification' };
    if (active(cwd) !== branch || commit(cwd, 'HEAD') !== sha) throw new Error('Creation ran, but active branch or HEAD verification failed.');
    return { status: 'completed', branch, base: input.base, sha, created: true, active_branch: branch };
  } catch (error) {
    return { status: 'failed', reason: error.message, attempted, created: attempted && branch ? git(cwd, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]).status === 0 : false,
      active_branch: active(cwd), ...(operation === 'create' ? { incomplete: attempted ? 'completion verification' : 'creation not executed' } : {}) };
  }
}

if (require.main === module) {
  try {
    const text = fs.readFileSync(0, 'utf8');
    const result = execute(process.argv[2], text.trim() ? JSON.parse(text) : {});
    console.log(JSON.stringify(result));
    if (result.status === 'failed') process.exitCode = 1;
  } catch (error) {
    console.log(JSON.stringify({ status: 'failed', reason: error.message, attempted: false, created: false, active_branch: active(process.cwd()), incomplete: 'invalid input' }));
    process.exitCode = 1;
  }
}

module.exports = { execute };
