'use strict';

const backlog = require('./from-backlog-github');

function api(target, endpoint, io, method = 'GET', body) {
  const args = ['api', endpoint, '--hostname', target.host, '--method', method];
  if (body !== undefined) args.push('--input', '-');
  return JSON.parse(io.run('gh', args, body === undefined ? undefined : JSON.stringify(body)));
}
function inspect(repository, io) {
  const match = /^(?:https:\/\/github\.com\/)?([^/]+\/[^/]+?)(?:\.git)?\/?$/.exec(repository);
  if (!match) throw new Error('Supply a GitHub owner/repository');
  const target = { host: 'github.com', repository: match[1] };
  const row = api(target, `repos/${target.repository}`, io);
  if (!Number.isSafeInteger(row.id) || !row.default_branch || row.archived || typeof row.private !== 'boolean') throw new Error('Invalid or archived GitHub repository');
  if (row.html_url !== `https://github.com/${target.repository}`) throw new Error('GitHub repository identity changed');
  return { ...target, id: row.id, url: row.html_url, visibility: row.private ? 'private' : 'public', defaultBranch: row.default_branch };
}
function list(target, source, base, io) {
  const rows = [], seen = new Set();
  for (let page = 1; ; page++) {
    const batch = api(target, `repos/${target.repository}/pulls?state=open&head=${encodeURIComponent(target.repository.split('/')[0] + ':' + source)}&base=${encodeURIComponent(base)}&per_page=100&page=${page}`, io);
    if (!Array.isArray(batch)) throw new Error('Invalid GitHub PR list');
    for (const row of batch) {
      identity(row);
      if (seen.has(row.number)) throw new Error('Repeated GitHub PR in paginated response');
      seen.add(row.number);
      if (!Number.isSafeInteger(row.head?.repo?.id) || typeof row.head?.ref !== 'string' || typeof row.base?.ref !== 'string') throw new Error('Incomplete GitHub PR branch identity');
      if (row.head.repo.id === target.id && row.head.ref === source && row.base.ref === base) rows.push(identity(row));
    }
    if (batch.length < 100) return rows;
  }
}
function identity(row) {
  if (!Number.isSafeInteger(row.number) || typeof row.html_url !== 'string' || typeof row.title !== 'string' || (row.body !== null && typeof row.body !== 'string')) throw new Error('Incomplete GitHub PR response');
  return { number: row.number, url: row.html_url, title: row.title, description: row.body ?? '', version: row.updated_at,
    assignees: Array.isArray(row.assignees) ? row.assignees.map(item => item?.login) : [], labels: Array.isArray(row.labels) ? row.labels.map(item => item?.name) : [] };
}
// The authenticated user, who is assigned to a request created through this tool.
function currentUser(target, io) {
  const row = api(target, 'user', io);
  if (typeof row?.login !== 'string' || !row.login) throw new Error('Invalid GitHub current user response');
  return { login: row.login };
}
// Every label name of the repository, across all pages.
function labels(target, io) {
  const names = [];
  for (let page = 1; ; page++) {
    const batch = api(target, `repos/${target.repository}/labels?per_page=100&page=${page}`, io);
    if (!Array.isArray(batch)) throw new Error('Invalid GitHub label list');
    for (const row of batch) {
      if (typeof row?.name !== 'string' || !row.name) throw new Error('Incomplete GitHub label response');
      names.push(row.name);
    }
    if (batch.length < 100) return [...new Set(names)];
  }
}
function mutate(proposal, io) {
  const endpoint = `repos/${proposal.target.repository}/pulls`;
  const row = identity(api(proposal.target, proposal.existing ? `${endpoint}/${proposal.existing.number}` : endpoint, io, proposal.existing ? 'PATCH' : 'POST', proposal.existing
    ? { title: proposal.title, body: proposal.description }
    : { title: proposal.title, body: proposal.description, head: proposal.source, base: proposal.base }));
  if (proposal.existing) return row;
  // A pull request has no assignee or label field at creation: a second call on its issue sets them.
  const body = { ...(proposal.assignee ? { assignees: [proposal.assignee.login] } : {}), ...(proposal.labels?.length ? { labels: proposal.labels } : {}) };
  if (!Object.keys(body).length) return row;
  try { api(proposal.target, `repos/${proposal.target.repository}/issues/${row.number}`, io, 'PATCH', body); }
  catch (error) { return { ...row, warnings: [`Pull request ${row.url} was created, but its ${Object.keys(body).map(key => key === 'assignees' ? 'assignee' : key).join(' and ')} could not be applied: ${error.message}`] }; }
  return row;
}
// Closing references: how to address an issue and read its children (E5).
const closing = {
  issueUrl: (repository, number) => `https://github.com/${repository}/issues/${number}`,
  children: (url, io) => backlog.readChildren({ url }, io),
};
module.exports = { inspect, list, currentUser, labels, mutate, closing };
