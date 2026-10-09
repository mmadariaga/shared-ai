'use strict';

const azure = require('./azure-publication');
const classify = value => { try { return azure.repositoryAddress(value) ? 'match' : null; } catch { return null; } };
const resolve = request => azure.resolve(request, true);
function inspect(repository, io) {
  const parsed = azure.repositoryAddress(repository);
  if (!parsed) throw new Error('Azure Repos Services repository URL required');
  const project = azure.inspect(repository, io);
  const row = azure.api(project, 'git', 'repositories', { project: project.project, repositoryId: parsed.repository }, io);
  if (typeof row.id !== 'string' || !row.id || typeof row.name !== 'string' || row.isDisabled || row.project?.id !== project.projectId || typeof row.defaultBranch !== 'string' || !row.defaultBranch.startsWith('refs/heads/')) throw new Error('Incomplete, incompatible or disabled Azure repository');
  const url = `${project.url}/_git/${encodeURIComponent(row.name)}`;
  return { ...project, id: row.id, repository: url, host: 'dev.azure.com', url, defaultBranch: row.defaultBranch.slice(11) };
}
function sameRepository(value, target) {
  const row = azure.repositoryAddress(value), destination = azure.repositoryAddress(target.url);
  return !!row && ['organization', 'project', 'repository'].every(key => azure.equal(row[key], destination[key]));
}
function identity(row, target, source, base) {
  if (!Number.isSafeInteger(row.pullRequestId) || row.pullRequestId < 1 || row.repository?.id !== target.id || row.repository?.project?.id !== target.projectId || row.sourceRefName !== `refs/heads/${source}` || row.targetRefName !== `refs/heads/${base}` || typeof row.title !== 'string' || (row.description != null && typeof row.description !== 'string') || typeof row.createdBy?.id !== 'string' || typeof row.lastMergeSourceCommit?.commitId !== 'string') throw new Error('Incomplete Azure PR identity or content');
  return { number: row.pullRequestId, url: `${target.url}/pullrequest/${row.pullRequestId}`, title: row.title,
    description: row.description ?? '', actor: row.createdBy.id, head: row.lastMergeSourceCommit.commitId, status: row.status };
}
function list(target, source, base, io, all = false) {
  const result = [], seen = new Set();
  for (let skip = 0; ; skip += 100) {
    const page = azure.api(target, 'git', 'pullrequests', { project: target.project, repositoryId: target.id }, io, 'GET', undefined, {
      'searchCriteria.status': all ? 'all' : 'active', 'searchCriteria.sourceRefName': `refs/heads/${source}`,
      'searchCriteria.targetRefName': `refs/heads/${base}`, '$top': 100, '$skip': skip
    });
    if (!Array.isArray(page.value) || page.count !== page.value.length) throw new Error('Incomplete Azure PR list');
    for (const row of page.value) {
      const item = identity(row, target, source, base);
      if (seen.has(item.number) || (!all && item.status !== 'active')) throw new Error('Repeated or incompatible Azure PR');
      seen.add(item.number); result.push(item);
    }
    if (page.value.length < 100 && !page.continuation_token) return result;
    if (!page.value.length) throw new Error('Azure pagination did not advance');
  }
}
function mutate(proposal, io) {
  const p = proposal;
  const row = azure.api(p.target, 'git', 'pullrequests', { project: p.target.project, repositoryId: p.target.id,
    ...(p.existing ? { pullRequestId: p.existing.number } : {}) }, io, p.existing ? 'PATCH' : 'POST', p.existing
    ? { title: p.title, description: p.description }
    : { title: p.title, description: p.description, sourceRefName: `refs/heads/${p.source}`, targetRefName: `refs/heads/${p.base}` });
  return identity(row, p.target, p.source, p.base);
}
function publicationEvidence(proposal, io) {
  return { previous: list(proposal.target, proposal.source, proposal.base, io, true).map(row => row.number) };
}
function recoverPublication(proposal, evidence, io, request) {
  const target = inspect(proposal.target.url, io);
  if (target.id !== proposal.target.id || target.projectId !== proposal.target.projectId || target.actor !== proposal.target.actor || target.visibility !== proposal.target.visibility) throw new Error('Azure recovery destination or authenticated identity changed');
  const rows = list(target, proposal.source, proposal.base, io, true);
  const candidates = rows.filter(row => row.title === proposal.title && row.description === proposal.description && row.head === proposal.head &&
    (proposal.existing ? row.number === proposal.existing.number : row.actor === target.actor && !evidence.previous.includes(row.number)));
  const number = proposal.existing?.number || evidence.result?.number;
  const verified = number ? candidates.filter(row => row.number === number) : candidates.filter(row => row.url === request.requestUrl);
  return verified.length === 1 ? { status: 'complete', request: verified[0] } : { status: 'uncertain', candidates,
    message: 'Query-only recovery cannot prove publication. Confirm the actual PR URL; do not repeat creation.' };
}
module.exports = { classify, resolve, inspect, sameRepository, list, mutate, publicationEvidence, recoverPublication,
  concurrencyWarning: 'Azure PR updates reread before writing, but a concurrent edit between that read and the PATCH is not protected. Approve only if you accept this interval.' };
