'use strict';

function fault(message, reason = 'retrieval-failed') { return Object.assign(new Error(message), { reason }); }

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

function issueURL(value) {
  let url;
  try { url = new URL(value); } catch { throw fault('A complete GitLab issue URL is required', 'incomplete-reference'); }
  if (!['https:', 'http:'].includes(url.protocol)) throw fault('GitLab issue URL must use HTTP or HTTPS', 'invalid-reference');
  if (url.username || url.password) throw fault('GitLab issue URL must not contain embedded credentials', 'invalid-reference');
  const match = /^(.*)\/-\/(issues|work_items)(?:\/([^/]*))?\/?$/.exec(url.pathname);
  if (!match) throw fault('GitLab reference route is not supported for project-level issues', 'unsupported-reference');
  if (!match[1] || match[1] === '/') throw fault('GitLab project path is missing', 'incomplete-reference');
  if (!match[3]) throw fault('GitLab issue number is missing', 'incomplete-reference');
  const number = Number(match[3]);
  if (!/^[1-9][0-9]*$/.test(match[3]) || !Number.isSafeInteger(number)) throw fault('GitLab issue number must be a positive safe integer', 'invalid-reference');
  return { destination: `${url.origin}${match[1]}`, number, route: match[2] };
}

function resolve(value, io) {
  const parsed = issueURL(value);
  const target = project(parsed.destination, io);
  if (parsed.destination !== target.url) throw fault('GitLab project destination does not match the requested URL');
  return { status: 'resolved', provider: 'gitlab', repository: target.repository, number: parsed.number, url: `${target.url}/-/${parsed.route}/${parsed.number}`, target };
}

function issue(target, number, io) {
  const data = api(target, `projects/${target.id}/issues/${number}`, io);
  if (!Number.isSafeInteger(data?.id) || data.id <= 0) throw fault('Invalid or missing GitLab issue ID');
  if (data.project_id !== target.id) throw fault('GitLab issue project ID does not match the requested project');
  if (data.iid !== number) throw fault('GitLab issue number does not match the requested number');
  let parsed;
  try { parsed = issueURL(data.web_url); } catch (error) { throw fault(`GitLab issue response URL validation failed: ${error.message}`); }
  if (parsed.destination !== target.url) throw fault('GitLab issue response URL destination does not match the requested project');
  if (parsed.number !== number) throw fault('GitLab issue response URL number does not match the requested number');
  if (typeof data.issue_type !== 'string' || !data.issue_type) throw fault('GitLab issue type cannot be verified: missing or invalid issue_type');
  if (data.issue_type !== 'issue') throw fault(`Unsupported GitLab item type: ${data.issue_type}; only ordinary issues are supported`, 'not-an-issue');
  if (typeof data.title !== 'string') throw fault('Invalid or missing GitLab issue title');
  if (data.description !== null && typeof data.description !== 'string') throw fault('Invalid or missing GitLab issue description');
  if (!['opened', 'closed'].includes(data.state)) throw fault('Invalid or missing GitLab issue state');
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
      const notes = api(checked.target, `projects/${checked.target.id}/issues/${checked.number}/notes?per_page=100&page=${page}&sort=asc&order_by=created_at`, io);
      if (!Array.isArray(notes)) throw fault('Incomplete GitLab comments response');
      for (const note of notes) {
        if (!Number.isSafeInteger(note?.id) || typeof note.body !== 'string' || typeof note.system !== 'boolean' || (note.author !== null && typeof note.author?.username !== 'string') || seen.has(note.id)) throw fault('Incomplete or repeated GitLab comment');
        seen.add(note.id);
        if (!note.system) {
          const noteURL = new URL(item.url);
          noteURL.hash = `note_${note.id}`;
          comments.push({ id: note.id, body: note.body, author: note.author?.username ?? null, url: noteURL.href });
        }
      }
      if (notes.length < 100) return { status: 'complete', item, comments: comments.sort((a, b) => a.id - b.id) };
    }
  } catch (error) {
    return { status: item ? 'incomplete' : 'error', reason: error.reason || 'retrieval-failed', message: error.message, ...(item ? { item, comments: comments.sort((a, b) => a.id - b.id) } : {}) };
  }
}

module.exports = { project, api, issueURL, resolve, issue, readIssue, read };
