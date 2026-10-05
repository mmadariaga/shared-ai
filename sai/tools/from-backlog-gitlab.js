'use strict';

function fault(message) { return Object.assign(new Error(message), { reason: 'retrieval-failed' }); }

function project(repository, io) {
  const args = ['repo', 'view', '--output', 'json'];
  if (repository) args.push('--', repository);
  const data = JSON.parse(io.run('glab', args));
  if (!Number.isSafeInteger(data.id) || data.id <= 0 || typeof data.path_with_namespace !== 'string' || typeof data.archived !== 'boolean' || typeof data.visibility !== 'string') throw fault('Incomplete GitLab project response');
  const hasEnabled = Object.hasOwn(data, 'issues_enabled');
  const hasAccess = Object.hasOwn(data, 'issues_access_level');
  if ((!hasEnabled && !hasAccess) || (hasEnabled && typeof data.issues_enabled !== 'boolean') || (hasAccess && !['enabled', 'private', 'disabled'].includes(data.issues_access_level))) throw fault('Incomplete GitLab project issue-enablement response');
  const issuesEnabled = (!hasEnabled || data.issues_enabled) && (!hasAccess || data.issues_access_level !== 'disabled');
  const url = new URL(data.web_url);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw fault('Invalid GitLab project URL');
  return { id: data.id, repository: data.path_with_namespace, url: data.web_url.replace(/\/$/, ''), host: url.host, archived: data.archived, visibility: data.visibility, issues_enabled: issuesEnabled };
}

function api(target, endpoint, io, method = 'GET', body) {
  const args = ['api', endpoint, '--hostname', target.host, '--method', method];
  if (body !== undefined) args.push('--header', 'Content-Type: application/json', '--input', '-');
  return JSON.parse(io.run('glab', args, body === undefined ? undefined : JSON.stringify(body)));
}

function resolve(value, io) {
  let url;
  try { url = new URL(value); } catch { throw fault('Supply a complete GitLab issue URL including /-/issues/N'); }
  const match = /^(.*)\/-\/issues\/([1-9][0-9]*)\/?$/.exec(url.pathname);
  if (!match || !Number.isSafeInteger(Number(match[2])) || !['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw fault('Supply a complete GitLab issue URL including /-/issues/N');
  const target = project(`${url.origin}${match[1]}`, io);
  return { status: 'resolved', provider: 'gitlab', repository: target.repository, number: Number(match[2]), url: `${target.url}/-/issues/${Number(match[2])}`, target };
}

function issue(target, number, io) {
  const data = api(target, `projects/${target.id}/issues/${number}`, io);
  if (!Number.isSafeInteger(data.id) || data.project_id !== target.id || data.iid !== number || data.web_url !== `${target.url}/-/issues/${number}` || typeof data.title !== 'string' || (data.description !== null && typeof data.description !== 'string') || !['opened', 'closed'].includes(data.state) || (data.issue_type && data.issue_type !== 'issue')) throw fault('Incomplete response or not a GitLab issue');
  return data;
}

function readIssue(reference, io) {
  const checked = resolve(reference.url, io);
  const data = issue(checked.target, checked.number, io);
  const description = data.description ?? '';
  return { provider: 'gitlab', repository: checked.repository, repository_archived: checked.target.archived, number: data.iid, url: data.web_url, title: data.title, description, state: data.state === 'opened' ? 'OPEN' : 'CLOSED', description_missing: !description.trim() };
}

function read(reference, io) {
  let item;
  const comments = [];
  try {
    const checked = resolve(reference.url, io);
    item = readIssue(checked, io);
    const seen = new Set();
    for (let page = 1; ; page++) {
      const notes = api(checked.target, `projects/${checked.target.id}/issues/${checked.number}/notes?per_page=100&page=${page}&sort=asc&order_by=id`, io);
      if (!Array.isArray(notes)) throw fault('Incomplete GitLab comments response');
      for (const note of notes) {
        if (!Number.isSafeInteger(note?.id) || typeof note.body !== 'string' || typeof note.system !== 'boolean' || (note.author !== null && typeof note.author?.username !== 'string') || seen.has(note.id)) throw fault('Incomplete or repeated GitLab comment');
        seen.add(note.id);
        if (!note.system) comments.push({ id: note.id, body: note.body, author: note.author?.username ?? null, url: `${item.url}#note_${note.id}` });
      }
      if (notes.length < 100) return { status: 'complete', item, comments };
    }
  } catch (error) {
    return { status: item ? 'incomplete' : 'error', reason: error.reason || 'retrieval-failed', message: error.message, ...(item ? { item, comments } : {}) };
  }
}

module.exports = { project, api, resolve, issue, readIssue, read };
