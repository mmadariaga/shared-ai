'use strict';

const fs = require('node:fs');
const azure = require('./azure-publication');
const source = require('./from-backlog-azuredevops');
const { convert } = require('./azure-markdown');
const { digest, receiptPath, save } = require('./to-backlog-github');
const classify = value => {
  try { return azure.repositoryAddress(value) || source.address(value) ? 'match' : null; } catch { return null; }
};
const resolve = request => azure.resolve(request);
function content(request, baseline) {
  if (typeof request.title !== 'string' || !request.title.trim() || /[\r\n]/.test(request.title)) throw new Error('Nonempty single-line title required');
  if (baseline && (request.description === undefined || request.description === baseline.description)) return { title: request.title, description: baseline.description };
  return { title: request.title, description: convert(request.description) };
}
function readItem(target, number, io) {
  const row = azure.api(target, 'wit', 'workitems', { project: target.project, id: number }, io);
  const fields = row.fields;
  if (!Number.isSafeInteger(row.id) || row.id !== number || !Number.isSafeInteger(row.rev) || row.rev < 1 || !fields || !azure.equal(fields['System.TeamProject'], target.project) || typeof fields['System.Title'] !== 'string' || typeof fields['System.WorkItemType'] !== 'string' || (fields['System.Description'] != null && typeof fields['System.Description'] !== 'string')) throw new Error('Incomplete or incompatible Boards work item');
  return { issue: { id: row.id, number: row.id, url: `${target.url}/_workitems/edit/${row.id}` },
    baseline: { rev: row.rev, title: fields['System.Title'], description: fields['System.Description'] ?? '' }, type: fields['System.WorkItemType'], actor: fields['System.CreatedBy']?.id };
}
function query(request, io) {
  if (!request.type) return { status: 'needs_input', reason: 'work-item-type-required', message: 'Select the work-item type for this invocation; no default type is stored' };
  if (!source.segment(request.type)) throw new Error('Invalid work-item type');
  const target = azure.inspect(request.repository, io, request.project);
  const type = azure.api(target, 'wit', 'workitemtypes', { project: target.project, type: request.type }, io);
  if (type.name !== request.type) throw new Error('Invalid or incompatible work-item type');
  const proposal = { provider: 'azuredevops', repository: target.url, ...target, type: type.name, ...content(request) };
  return { status: 'ready', proposal, confirmation: digest(proposal) };
}
function readUpdate(request, io) {
  const ref = source.resolve(request.reference, io);
  if (ref.status !== 'resolved' || !ref.project) throw new Error('Complete work-item URL required for update');
  const target = azure.inspect(`${ref.organization}/${encodeURIComponent(ref.project)}`, io);
  const item = readItem(target, ref.number, io);
  return { status: 'complete', ...target, repository: target.url, issue: item.issue, baseline: item.baseline, type: item.type };
}
function queryUpdate(request, io) {
  const current = readUpdate(request, io);
  if (digest(current.baseline) !== digest(request.baseline)) return { status: 'needs_input', reason: 'stale-baseline', current, message: 'Boards revision changed; prepare and explicitly approve again' };
  const proposal = { ...current, provider: 'azuredevops', operation: 'update', ...content(request, current.baseline) };
  delete proposal.status;
  if (proposal.title === current.baseline.title && proposal.description === current.baseline.description) return { status: 'no_changes', issue: current.issue };
  return { status: 'ready', proposal, confirmation: digest(proposal) };
}
function list(proposal, io) {
  const quote = value => value.replace(/'/g, "''");
  const result = azure.api(proposal, 'wit', 'wiql', { project: proposal.project }, io, 'POST', {
    query: `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${quote(proposal.project)}' AND [System.WorkItemType] = '${quote(proposal.type)}' ORDER BY [System.Id]`
  }, { '$top': 20000 });
  if (!Array.isArray(result.workItems) || result.workItems.length >= 20000) throw new Error('Boards recovery inventory incomplete or exceeds supported query limit');
  const ids = result.workItems.map(row => row.id);
  if (ids.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(ids).size !== ids.length) throw new Error('Invalid Boards inventory');
  return ids;
}
function outcome(receipt, io) {
  const p = receipt.proposal;
  const target = azure.inspect(p.repository, io);
  if (target.projectId !== p.projectId || target.actor !== p.actor || target.visibility !== p.visibility) throw new Error('Recovery destination or identity changed');
  if (!receipt.issue) return { status: 'uncertain', message: 'No verified creation identity; query candidates and obtain user clarification, never repeat creation' };
  const row = readItem(target, receipt.issue.number, io);
  if (row.issue.url !== receipt.issue.url || row.type !== p.type) throw new Error('Recovery item identity changed');
  if (row.baseline.title === p.title && row.baseline.description === p.description) return { status: 'complete', issue: row.issue };
  if (p.operation === 'update' && digest(row.baseline) === digest(p.baseline)) return { status: 'pending', issue: row.issue, message: 'Update is not visible; fresh approval and a new receipt are required before retrying' };
  return { status: p.operation === 'update' ? 'divergent' : 'uncertain', issue: row.issue, current: row.baseline, message: 'Remote content differs; reconcile and obtain fresh approval' };
}
function execute(request, io, updating) {
  let receipt, file;
  try {
    file = receiptPath(request.receipt);
    const ready = updating ? queryUpdate(request, io) : query(request, io);
    if (ready.status !== 'ready') return ready;
    if (ready.confirmation !== request.confirmation) throw new Error('Exact destination, revision and outgoing content confirmation required');
    receipt = { proposal: ready.proposal, ...(updating ? { issue: ready.proposal.issue } : { baseline: list(ready.proposal, io) }), stage: 'write_pending' };
    fs.writeFileSync(file, JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
  } catch (error) { return { status: 'failure_before_publication', message: error.message }; }
  const p = receipt.proposal;
  const patch = updating ? [{ op: 'test', path: '/rev', value: p.baseline.rev }] : [];
  patch.push({ op: 'add', path: '/fields/System.Title', value: p.title });
  if (!updating || p.description !== p.baseline.description) patch.push({ op: 'add', path: '/fields/System.Description', value: p.description });
  try {
    const result = azure.api(p, 'wit', 'workitems', { project: p.project, ...(updating ? { id: p.issue.number } : { type: p.type }) }, io, updating ? 'PATCH' : 'POST', patch, {}, true);
    if (!Number.isSafeInteger(result.id) || result.id < 1 || (updating && result.id !== p.issue.number)) throw new Error('Incomplete write response');
    receipt.issue = { id: result.id, number: result.id, url: `${p.url}/_workitems/edit/${result.id}` };
    save(file, receipt);
    return recover({ receipt: file }, io);
  } catch (error) {
    receipt.stage = error.rejected ? 'rejected' : 'uncertain'; save(file, receipt);
    return { status: error.rejected ? 'rejected' : 'uncertain', issue: receipt.issue || null, receipt: file, message: error.rejected && updating ? `${error.message} Reread the revision and obtain renewed approval; never retry automatically.` : error.message };
  }
}
function recover(request, io) {
  try {
    const file = receiptPath(request.receipt), receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (receipt.proposal?.provider !== 'azuredevops' || !['write_pending', 'uncertain', 'rejected', 'complete'].includes(receipt.stage)) throw new Error('Invalid Azure receipt');
    if (!receipt.issue && !receipt.proposal.operation) {
      if (!Array.isArray(receipt.baseline)) throw new Error('Missing pre-creation evidence');
      const p = receipt.proposal, target = azure.inspect(p.repository, io);
      if (target.projectId !== p.projectId || target.actor !== p.actor || target.visibility !== p.visibility) throw new Error('Recovery identity changed');
      const candidates = list(p, io).filter(id => !receipt.baseline.includes(id)).map(id => readItem(target, id, io))
        .filter(row => row.type === p.type && row.actor === p.actor && row.baseline.title === p.title && row.baseline.description === p.description);
      const chosen = candidates.find(row => row.issue.url === request.issueUrl);
      if (!chosen) return { status: 'uncertain', candidates: candidates.map(row => row.issue), message: 'Confirm the actual created item URL; matching title alone is not publication evidence. Do not create again.' };
      receipt.issue = chosen.issue; save(file, receipt);
    }
    const result = outcome(receipt, io);
    if (result.status === 'complete') { receipt.stage = 'complete'; save(file, receipt); }
    return result;
  } catch (error) { return { status: 'uncertain', message: error.message }; }
}
module.exports = { classify, resolve, query, publish: (r, io) => execute(r, io, false), recover,
  'read-update': readUpdate, 'query-update': queryUpdate, update: (r, io) => execute(r, io, true), 'recover-update': recover };
