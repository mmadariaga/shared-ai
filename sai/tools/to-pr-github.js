'use strict';

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
  return { number: row.number, url: row.html_url, title: row.title, description: row.body ?? '', version: row.updated_at };
}
function mutate(proposal, io) {
  const endpoint = `repos/${proposal.target.repository}/pulls`;
  return identity(api(proposal.target, proposal.existing ? `${endpoint}/${proposal.existing.number}` : endpoint, io, proposal.existing ? 'PATCH' : 'POST', proposal.existing
    ? { title: proposal.title, body: proposal.description }
    : { title: proposal.title, body: proposal.description, head: proposal.source, base: proposal.base }));
}
module.exports = { inspect, list, mutate };
