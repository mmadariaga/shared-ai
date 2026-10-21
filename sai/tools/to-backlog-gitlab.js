'use strict';

const fs = require('node:fs');
const source = require('./from-backlog-gitlab');
const { digest, receiptPath, save } = require('./to-backlog-github');

function resolve({ explicit, config, remotes }, io) {
  const destination = { ...config, ...explicit };
  if (destination.project) return { status: 'needs_input', reason: 'GitLab supports issues only; remove the board/Project destination' };
  if (!destination.repository) {
    const candidates = [...new Set(remotes)];
    if (candidates.length !== 1) return { status: 'needs_input', reason: 'repository-ambiguous', candidates };
    destination.repository = candidates[0];
  }
  const target = source.project(destination.repository, io);
  return { status: 'resolved', repository: target.url };
}

function content(request) {
  if (typeof request.title !== 'string' || !request.title.trim() || typeof request.description !== 'string') throw new Error('A nonempty title and string description are required');
  return { title: request.title, description: request.description };
}

function inspect(repository, io) {
  const target = source.project(repository, io);
  if (target.archived || !target.issues_enabled) throw new Error('GitLab project is archived or issues are disabled');
  const actor = source.api(target, 'user', io);
  if (!Number.isSafeInteger(actor.id)) throw new Error('Incomplete GitLab authenticated-user response');
  return { target, actor: actor.id };
}

function query(request, io) {
  if (typeof request.repository !== 'string' || !request.repository.trim()) throw new Error('A resolved GitLab project destination is required');
  if (request.project) throw new Error('GitLab boards and metadata are outside scope');
  const state = inspect(request.repository, io);
  const proposal = { provider: 'gitlab', repository: state.target.url, repositoryId: state.target.id, visibility: state.target.visibility, host: state.target.host, actor: state.actor, ...content(request) };
  return { status: 'ready', proposal, confirmation: digest(proposal) };
}

function list(proposal, io) {
  const result = [], seen = new Set();
  for (let page = 1; ; page++) {
    const rows = source.api(proposal, `projects/${proposal.repositoryId}/issues?scope=all&state=all&per_page=100&page=${page}&order_by=created_at&sort=asc`, io);
    if (!Array.isArray(rows)) throw new Error('Incomplete GitLab issue list');
    for (const row of rows) {
      if (!Number.isSafeInteger(row?.id) || typeof row.title !== 'string' || (row.description !== null && typeof row.description !== 'string') || !Number.isSafeInteger(row.iid) || row.project_id !== proposal.repositoryId || typeof row.web_url !== 'string' || !Number.isSafeInteger(row.author?.id) || seen.has(row.id)) throw new Error('Incomplete or repeated GitLab issue');
      seen.add(row.id); result.push(row);
    }
    if (rows.length < 100) return result;
  }
}

function identity(row) { return { id: row.id, number: row.iid, url: row.web_url }; }

function publish(request, io) {
  let receipt;
  try {
    request = { ...request, receipt: receiptPath(request.receipt) };
    const ready = query(request, io);
    if (ready.confirmation !== request.confirmation) throw new Error('Exact content and destination confirmation is required; review again');
    receipt = { proposal: ready.proposal, baseline: list(ready.proposal, io).map(row => row.id), stage: 'creation_pending' };
    fs.writeFileSync(request.receipt, JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
  } catch (error) { return { status: 'failure_before_publication', message: error.message }; }
  try {
    const row = source.api(receipt.proposal, `projects/${receipt.proposal.repositoryId}/issues`, io, 'POST', content(receipt.proposal));
    if (!Number.isSafeInteger(row?.id) || !Number.isSafeInteger(row.iid) || row.project_id !== receipt.proposal.repositoryId || typeof row.web_url !== 'string') throw new Error('Incomplete GitLab creation response; verify before retrying');
    receipt.issue = identity(row);
    save(request.receipt, receipt);
    return recover({ receipt: request.receipt }, io);
  } catch (error) { return { status: 'uncertain', issue: receipt.issue || null, message: error.message }; }
}

function recover(request, io) {
  let receipt;
  try {
    const file = receiptPath(request.receipt);
    receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (receipt.proposal?.provider !== 'gitlab' || receipt.proposal.operation || !Array.isArray(receipt.baseline)) throw new Error('Invalid GitLab creation receipt');
    const ready = query(receipt.proposal, io);
    if (digest(ready.proposal) !== digest(receipt.proposal)) throw new Error('Recovery identity or destination changed; review again');
    const rows = list(receipt.proposal, io);
    if (!receipt.issue) {
      const candidates = rows.filter(row => !receipt.baseline.includes(row.id) && row.title === receipt.proposal.title && (row.description ?? '') === receipt.proposal.description && row.author.id === receipt.proposal.actor);
      const chosen = candidates.find(row => row.web_url === request.issueUrl);
      if (!chosen) return { status: 'uncertain', candidates: candidates.map(identity), message: 'Verify creation and supply the confirmed issueUrl. Recovery never creates an issue.' };
      receipt.issue = identity(chosen);
    }
    const current = rows.find(row => row.id === receipt.issue.id && row.web_url === receipt.issue.url && row.iid === receipt.issue.number);
    if (!current || current.title !== receipt.proposal.title || (current.description ?? '') !== receipt.proposal.description) throw new Error('Created issue or approved content could not be verified');
    receipt.stage = 'complete'; save(file, receipt);
    return { status: 'complete', issue: receipt.issue };
  } catch (error) { return { status: 'uncertain', issue: receipt?.issue || null, message: error.message }; }
}

function readEditable(request, io) {
  const reference = source.resolve(request.reference, io);
  const { target, actor } = inspect(reference.target.url, io);
  const row = source.issue(target, reference.number, io);
  if (typeof row.updated_at !== 'string') throw new Error('Incomplete GitLab issue version');
  return { status: 'complete', issue: identity(row), repository: target.url, repositoryId: target.id, visibility: target.visibility, host: target.host, actor, baseline: { title: row.title, description: row.description ?? '', updated_at: row.updated_at }, state: row.state, reference };
}

function readUpdate(request, io) {
  const { state, reference, ...result } = readEditable(request, io);
  return result;
}

const CHILDREN = 'query($path:ID!,$iid:String!){namespace(fullPath:$path){workItem(iid:$iid){widgets{type ... on WorkItemWidgetHierarchy{children(first:100){nodes{webUrl} pageInfo{hasNextPage}}}}}}}';
// A read-only permission query: the work item exposes whether the authenticated user may update it.
const PERMISSIONS = 'query($path:ID!,$iid:String!){namespace(fullPath:$path){workItem(iid:$iid){userPermissions{updateWorkItem}}}}';
function requireEditable(reference, io) {
  let response;
  try { response = source.api(reference.target, 'graphql', io, 'POST', { query: PERMISSIONS, variables: { path: reference.repository, iid: String(reference.number) } }); }
  catch { throw new Error('GitLab edit permission on the originating issue could not be verified'); }
  const allowed = response?.errors?.length ? undefined : response?.data?.namespace?.workItem?.userPermissions?.updateWorkItem;
  if (typeof allowed !== 'boolean') throw new Error('GitLab edit permission on the originating issue could not be verified');
  if (!allowed) throw new Error('Originating issue is not editable by the authenticated user; no replacement will be created');
}
// The origin as set parent: its open state and the native children it already has.
function readOrigin(request, io) {
  const { state, reference, ...current } = readEditable({ reference: request.origin }, io);
  requireEditable(reference, io);
  const children = () => {
    let response;
    try { response = source.api(reference.target, 'graphql', io, 'POST', { query: CHILDREN, variables: { path: reference.repository, iid: String(reference.number) } }); }
    catch { throw new Error('GitLab work item children could not be verified'); }
    const widget = response?.errors?.length ? null : response?.data?.namespace?.workItem?.widgets?.find(item => item?.type === 'HIERARCHY');
    if (!widget || !Array.isArray(widget.children?.nodes) || widget.children.pageInfo?.hasNextPage) throw new Error('GitLab work item children could not be verified');
    return widget.children.nodes.map(node => node.webUrl).filter(Boolean);
  };
  return { issue: current.issue, repository: current.repository, baseline: current.baseline, closed: state === 'closed', children };
}

function queryUpdate(request, io) {
  const current = readUpdate(request, io);
  if (digest(current.baseline) !== digest(request.baseline)) return { status: 'needs_input', reason: 'stale-baseline', current, message: 'Origin issue changed; prepare and approve a new proposal' };
  const proposal = { ...current, provider: 'gitlab', operation: 'update', ...content(request) };
  delete proposal.status;
  if (proposal.title === current.baseline.title && proposal.description === current.baseline.description) return { status: 'no_changes', issue: current.issue, message: 'No update is necessary' };
  return { status: 'ready', proposal, confirmation: digest(proposal) };
}

function updateOutcome(receipt, io) {
  const proposal = receipt.proposal;
  const current = readUpdate({ reference: proposal.issue.url }, io);
  for (const field of ['issue', 'repository', 'repositoryId', 'visibility', 'host', 'actor']) {
    if (digest(current[field]) !== digest(proposal[field])) throw new Error('Update identity or destination changed; review again');
  }
  if (current.baseline.title === proposal.title && current.baseline.description === proposal.description) return { status: 'complete', issue: current.issue };
  if (digest(current.baseline) === digest(proposal.baseline)) return { status: 'pending', issue: current.issue, message: 'Renew review and explicit confirmation before retrying; recovery does not mutate.' };
  return { status: 'divergent', issue: current.issue, current, message: 'Reconcile current content and obtain fresh approval' };
}

function update(request, io) {
  let receipt;
  try {
    request = { ...request, receipt: receiptPath(request.receipt) };
    const ready = queryUpdate(request, io);
    if (ready.status !== 'ready') return ready;
    if (ready.confirmation !== request.confirmation) throw new Error('Exact issue, baseline and content confirmation is required; review again');
    receipt = { proposal: ready.proposal, stage: 'update_pending' };
    fs.writeFileSync(request.receipt, JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
  } catch (error) { return { status: 'failure_before_publication', message: error.message }; }
  let submission_error;
  try { source.api(receipt.proposal, `projects/${receipt.proposal.repositoryId}/issues/${receipt.proposal.issue.number}`, io, 'PUT', content(receipt.proposal)); }
  catch (error) { submission_error = error.message; }
  const result = recoverUpdate({ receipt: request.receipt }, io);
  return { ...result, ...(submission_error ? { submission_error } : {}) };
}

function recoverUpdate(request, io) {
  try {
    const file = receiptPath(request.receipt);
    const receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (receipt.proposal?.provider !== 'gitlab' || receipt.proposal.operation !== 'update' || typeof receipt.proposal.baseline?.title !== 'string' || typeof receipt.proposal.baseline?.description !== 'string') throw new Error('Invalid GitLab update receipt');
    const result = updateOutcome(receipt, io);
    receipt.stage = result.status; save(file, receipt);
    return result;
  } catch (error) { return { status: 'uncertain', message: error.message }; }
}

const sliceIdentity = require('./backlog-slice-identity');
const set = require('./backlog-provider-set').bind('gitlab', {
  query, origin: readOrigin, representation: { hierarchy: 'written', dependencies: 'native' }, renderBlock: text => text,
  append: (description, links, value) => `${description}\n\n${links.join('\n')}\n${sliceIdentity.encode(value)}`,
  inventory: (p, io) => list(p, io).map(row => ({ issue: identity(row), title: row.title, description: row.description ?? '', actor: row.author.id })),
  read: (p, item, io) => {
    const ref = source.resolve(item.url, io);
    if (ref.target.id !== p.repositoryId) throw new Error('Set item destination changed');
    const row = source.issue(ref.target, item.number, io);
    return { issue: identity(row), title: row.title, description: row.description ?? '', version: row.updated_at };
  },
  create: (p, item, io) => {
    const row = source.api(p, `projects/${p.repositoryId}/issues`, io, 'POST', content(item));
    if (!Number.isSafeInteger(row.id) || !Number.isSafeInteger(row.iid) || row.project_id !== p.repositoryId || typeof row.web_url !== 'string') throw new Error('Incomplete GitLab creation identity');
    return identity(row);
  },
  writeReferences: (p, current, description, io) => {
    const now = source.issue({ id: p.repositoryId, url: p.repository, host: p.host }, current.issue.number, io);
    if (now.title !== current.title || (now.description ?? '') !== current.description || now.updated_at !== current.version) throw new Error('Concurrent GitLab content change; renew review');
    source.api(p, `projects/${p.repositoryId}/issues/${current.issue.number}`, io, 'PUT', { description });
  },
  hasRelation: (p, item, other, kind, io) => {
    if (kind !== 'dependency') throw new Error('Ordinary GitLab issues use written hierarchy');
    return source.dependencies({ id: p.repositoryId, url: p.repository, host: p.host }, item.number, io).includes(other.url);
  },
  addRelation: (p, item, other, kind, io) => {
    if (kind !== 'dependency') throw new Error('Ordinary GitLab issues use written hierarchy');
    source.api(p, `projects/${p.repositoryId}/issues/${item.number}/links`, io, 'POST', { target_project_id: p.repositoryId, target_issue_iid: other.number, link_type: 'is_blocked_by' });
  }
});
const HIERARCHY = 'query($path:ID!,$iid:String!){namespace(fullPath:$path){workItem(iid:$iid){widgets{type ... on WorkItemWidgetHierarchy{parent{id} children(first:1){nodes{id}}}}}}}';
// Only a complete response decides: a missing widget, parent field or children page is never read as "none".
function readHierarchy(ref, io) {
  const unverified = () => new Error('GitLab work item hierarchy could not be verified');
  let response;
  try { response = source.api(ref.target, 'graphql', io, 'POST', { query: HIERARCHY, variables: { path: ref.repository, iid: String(ref.number) } }); }
  catch { throw unverified(); }
  const widget = response?.errors?.length ? null : response?.data?.namespace?.workItem?.widgets?.find(item => item?.type === 'HIERARCHY');
  if (!widget || !Object.hasOwn(widget, 'parent') || (widget.parent !== null && typeof widget.parent?.id !== 'string') || !Array.isArray(widget.children?.nodes)) throw unverified();
  return { hasParent: widget.parent !== null, hasChildren: widget.children.nodes.length > 0 };
}
/** A work item without a written marker, native parent or native children; null when another flow decides. */
function standaloneLeaf(ref, io) {
  const row = source.issue(ref.target, ref.number, io, true);
  if (require('./backlog-slice-identity').decode(row.description ?? '')) return null;
  const hierarchy = readHierarchy(ref, io);
  if (hierarchy.hasParent) return null;
  if (hierarchy.hasChildren) throw new Error('Selected work item has child items; parent responsibility is preserved');
  if (!Array.isArray(row.assignees) || row.assignees.some(actor => !Number.isSafeInteger(actor?.id) || actor.id < 1)) throw new Error('Incomplete GitLab assignees');
  return { status: 'complete', item: { url: row.web_url, assignees: row.assignees.map(actor => actor.id) } };
}
const assignment = require('./backlog-provider-assignment').bind('gitlab', {
  native: false,
  inspect: (request, io) => {
    const ref = source.resolve(request.reference, io);
    const actor = inspect(ref.target.url, io).actor, leaf = standaloneLeaf(ref, io);
    return leaf ? { result: leaf, actor, standalone: true } : { result: source.readSet(ref, io), actor };
  },
  assign: (request, proposal, io) => {
    const ref = source.resolve(request.reference, io);
    const current = source.issue(ref.target, ref.number, io, true);
    if (!Array.isArray(current.assignees) || digest(current.assignees.map(actor => actor.id).sort()) !== digest(proposal.assignees)) throw new Error('GitLab responsibility changed');
    source.api(ref.target, `projects/${ref.target.id}/issues/${ref.number}`, io, 'PUT', { assignee_ids: proposal.target });
  }
});
module.exports = { resolve, query, publish, recover, 'read-update': readUpdate, 'query-update': queryUpdate, update, 'recover-update': recoverUpdate, ...set, ...assignment };
