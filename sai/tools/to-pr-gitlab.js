'use strict';

const { api } = require('./from-backlog-gitlab');
function inspect(repository, io) {
  const row = JSON.parse(io.run('glab', ['repo', 'view', '--output', 'json', '--', repository]));
  const url = new URL(row.web_url);
  if (!Number.isSafeInteger(row.id) || !row.path_with_namespace || !row.default_branch || row.archived || !['https:', 'http:'].includes(url.protocol) || url.username || url.password || !['private', 'internal', 'public'].includes(row.visibility)) throw new Error('Invalid or archived GitLab project');
  return { id: row.id, repository: row.path_with_namespace, host: url.host, url: row.web_url.replace(/\/$/, ''), defaultBranch: row.default_branch, visibility: row.visibility };
}
function resolve({ explicit, config, remotes }, io) {
  const destination = { ...config, ...explicit };
  const candidates = [...new Set(remotes)];
  if (!destination.repository && candidates.length !== 1) return { status: 'needs_input', reason: 'repository-ambiguous', candidates };
  return { status: 'resolved', repository: inspect(destination.repository || candidates[0], io).url };
}
function identity(row) {
  if (!Number.isSafeInteger(row.iid) || typeof row.web_url !== 'string' || typeof row.title !== 'string' || (row.description !== null && typeof row.description !== 'string')) throw new Error('Incomplete GitLab MR response');
  return { number: row.iid, url: row.web_url, title: row.title, description: row.description ?? '', version: row.updated_at };
}
function list(target, source, base, io) {
  const rows = [], seen = new Set();
  for (let page = 1; ; page++) {
    const batch = api(target, `projects/${target.id}/merge_requests?state=opened&source_branch=${encodeURIComponent(source)}&target_branch=${encodeURIComponent(base)}&per_page=100&page=${page}`, io);
    if (!Array.isArray(batch)) throw new Error('Invalid GitLab MR list');
    for (const row of batch) {
      identity(row);
      if (seen.has(row.iid)) throw new Error('Repeated GitLab MR in paginated response');
      seen.add(row.iid);
      if (!Number.isSafeInteger(row.source_project_id) || !Number.isSafeInteger(row.target_project_id) || typeof row.source_branch !== 'string' || typeof row.target_branch !== 'string') throw new Error('Incomplete GitLab MR branch identity');
      if (row.source_project_id === target.id && row.target_project_id === target.id && row.source_branch === source && row.target_branch === base) rows.push(identity(row));
    }
    if (batch.length < 100) return rows;
  }
}
function mutate(proposal, io) {
  const endpoint = `projects/${proposal.target.id}/merge_requests`;
  return identity(api(proposal.target, proposal.existing ? `${endpoint}/${proposal.existing.number}` : endpoint, io, proposal.existing ? 'PUT' : 'POST', proposal.existing
    ? { title: proposal.title, description: proposal.description }
    : { title: proposal.title, description: proposal.description, source_branch: proposal.source, target_branch: proposal.base }));
}
module.exports = { inspect, resolve, list, mutate };
