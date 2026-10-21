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
// Azure re-serializes a description it stores: it adds formatting whitespace between block tags or before a
// block closing tag and drops the backlog-id-counters comment. Sent content is equivalent to received content
// only when received is sent plus that whitespace (counters comment optional); everything else is a real change.
const COUNTERS = /\s*<!-- backlog-id-counters: E=\d+ I=\d+ Q=\d+ -->\s*/g;
const BLOCK = 'p|li|ul|ol|h[1-6]|pre|blockquote';
const TAG = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)(?:\s[^<>]*)?>/g;
const blockTagEnd = new RegExp(`<\\/?(?:${BLOCK})(?:\\s[^<>]*)?>$`, 'i');
const blockTagStart = new RegExp(`^<\\/?(?:${BLOCK})[\\s>]`, 'i');
const blockCloseStart = new RegExp(`^<\\/(?:${BLOCK})\\s*>`, 'i');
function literalText(html) {
  const literal = new Uint8Array(html.length);
  let pre = 0, code = 0, at = 0;
  for (const tag of html.matchAll(TAG)) {
    if (pre || code) literal.fill(1, at, tag.index);
    const name = tag[2]?.toLowerCase(), step = tag[1] ? -1 : 1;
    if (name === 'pre') pre = Math.max(0, pre + step);
    if (name === 'code') code = Math.max(0, code + step);
    at = tag.index + tag[0].length;
  }
  if (pre || code) literal.fill(1, at);
  return literal;
}
function addsOnlyWhitespace(sent, received) {
  const literal = literalText(received), space = /\s/;
  let i = 0;
  for (let j = 0; j < received.length; j++) {
    if (sent[i] === received[j]) { i++; continue; }
    if (literal[j] || !space.test(received[j])) return false;
    let start = j, end = j;
    while (start > 0 && space.test(received[start - 1])) start--;
    while (end < received.length && space.test(received[end])) end++;
    const before = received.slice(0, start), after = received.slice(end);
    const leading = start === 0 && blockTagStart.test(after), trailing = end === received.length && blockTagEnd.test(before);
    if (!(leading || trailing || blockCloseStart.test(after) || blockTagEnd.test(before) && blockTagStart.test(after))) return false;
  }
  return i === sent.length;
}
const equivalent = (sent, received) => typeof sent === 'string' && typeof received === 'string'
  && (addsOnlyWhitespace(sent, received) || addsOnlyWhitespace(sent.replace(COUNTERS, ''), received));
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
function planningState(row) {
  const parents = (row.relations || []).filter(link => link.rel === 'System.LinkTypes.Hierarchy-Reverse').map(link => link.url);
  if (parents.length > 1 || parents.some(url => typeof url !== 'string')) throw new Error('Invalid parent relations');
  const assigned = row.fields['System.AssignedTo'];
  if (assigned != null && (typeof assigned.id !== 'string' || !assigned.id)) throw new Error('Incomplete assignee identity');
  const iteration = row.fields['System.IterationPath'];
  if (iteration != null && typeof iteration !== 'string') throw new Error('Invalid iteration path');
  return { parent: parents[0] || null, iteration: iteration ?? null, assignee: assigned?.id || null };
}
function planning(request, target, io, item) {
  if (request.assignToMe !== undefined && typeof request.assignToMe !== 'boolean') throw new Error('assignToMe must be boolean; arbitrary assignment is unsupported');
  if (request.assignee !== undefined || request.state !== undefined) throw new Error('Arbitrary assignment and state changes are unsupported');
  const result = {};
  if (request.parent !== undefined) {
    let ref;
    if (/^[1-9][0-9]*$/.test(String(request.parent))) ref = { number: Number(request.parent), organization: target.organization };
    else ref = source.resolve(request.parent, io);
    if (!Number.isSafeInteger(ref.number) || !azure.equal(ref.organization, target.organization) || ref.number === item?.number) throw new Error('Invalid or self parent reference');
    const row = azure.api(target, 'wit', 'workitems', { id: ref.number }, io);
    if (row.id !== ref.number || !source.segment(row.fields?.['System.TeamProject']) || (ref.project && !azure.equal(ref.project, row.fields['System.TeamProject'])) || row.fields['System.WorkItemType'] !== 'Product Backlog Item') throw new Error('Parent must resolve to the intended PBI');
    result.parent = { number: row.id, url: `${target.organization}/_apis/wit/workItems/${row.id}` };
  }
  if (request.iteration !== undefined) {
    if (typeof request.iteration !== 'string' || !request.iteration.trim()) throw new Error('Native iteration path or current required');
    let selected = request.iteration;
    if (selected === 'current') {
      if (!source.segment(request.team)) throw new Error('Team required to resolve the current sprint');
      const rows = azure.api(target, 'work', 'iterations', { project: target.project, team: request.team }, io, 'GET', undefined, { '$timeframe': 'current' });
      if (!Array.isArray(rows.value) || rows.value.length !== 1 || typeof rows.value[0].path !== 'string') throw new Error('Current sprint is missing or ambiguous');
      selected = rows.value[0].path;
    }
    const tree = azure.api(target, 'wit', 'classificationnodes', { project: target.project, structureGroup: 'iterations' }, io, 'GET', undefined, { '$depth': 14 });
    const matches = [];
    const visit = (node, path) => {
      if (!source.segment(node?.name) || (node.children != null && !Array.isArray(node.children)) || (node.hasChildren && !node.children?.length)) throw new Error('Incomplete iteration inventory');
      const native = path ? `${path}\\${node.name}` : node.name;
      if (azure.equal(native, selected)) matches.push(native);
      for (const child of node.children || []) visit(child, native);
    };
    visit(tree, '');
    if (matches.length !== 1) throw new Error('Iteration path is missing or ambiguous');
    result.iteration = matches[0];
  }
  if (request.assignToMe === true) {
    if (!target.uniqueName) throw new Error('Authenticated user unique name unavailable');
    result.assignee = { id: target.actor, uniqueName: target.uniqueName };
  }
  if (!Object.keys(result).length) return undefined;
  if (item) {
    result.baseline = planningState(relationRow(target, item, io));
    if (result.parent && result.baseline.parent && !azure.equal(result.parent.url, result.baseline.parent)) throw new Error('A different native parent already exists');
  }
  return result;
}
function pendingPlanning(plan, state) {
  return ['parent', 'iteration', 'assignee'].filter(key => plan[key] !== undefined && !azure.equal(
    key === 'parent' ? plan.parent.url : key === 'assignee' ? plan.assignee.id : plan.iteration, state[key]));
}
function planningOutcome(receipt, io) {
  const p = receipt.proposal, row = relationRow(p, receipt.issue, io), state = planningState(row);
  if (row.fields['System.WorkItemType'] !== p.type || row.fields['System.Title'] !== p.title || !equivalent(p.description, row.fields['System.Description'] ?? '')) throw new Error('Content changed during planning verification');
  const pending = pendingPlanning(p.planning, state);
  if (!pending.length) return { status: 'complete', issue: receipt.issue, confirmed: ['content', ...Object.keys(p.planning).filter(key => key !== 'baseline')], pending: [] };
  return { status: 'partial_failure', issue: receipt.issue, confirmed: ['content', ...['parent', 'iteration', 'assignee'].filter(key => p.planning[key] !== undefined && !pending.includes(key))], pending, current: state,
    continuation: digest({ proposal: p, issue: receipt.issue, rev: row.rev, state }), message: 'Content is verified; planning changes remain pending. Confirm this continuation to complete only pending changes.' };
}
function applyPlanning(receipt, file, io, continuation) {
  const p = receipt.proposal;
  try {
    const target = azure.inspect(p.repository, io);
    if (target.actor !== p.actor || target.projectId !== p.projectId || target.visibility !== p.visibility || (p.planning.assignee && target.uniqueName !== p.planning.assignee.uniqueName)) throw new Error('Planning destination or authenticated identity changed');
    const row = relationRow(p, receipt.issue, io), state = planningState(row), pending = pendingPlanning(p.planning, state);
    if (continuation && continuation !== digest({ proposal: p, issue: receipt.issue, rev: row.rev, state })) throw new Error('Planning changed after continuation approval; verify and approve again');
    if (row.fields['System.Title'] !== p.title || !equivalent(p.description, row.fields['System.Description'] ?? '')) throw new Error('Content changed before planning; reconcile and approve again');
    if (!continuation && p.planning.baseline && digest(state) !== digest(p.planning.baseline) && pending.length) throw new Error('Planning fields changed; reconcile and approve again');
    if (p.planning.parent && state.parent && !azure.equal(state.parent, p.planning.parent.url)) throw new Error('A different native parent already exists');
    if (!pending.length) return planningOutcome(receipt, io);
    const patch = [{ op: 'test', path: '/rev', value: row.rev }];
    if (pending.includes('parent')) patch.push({ op: 'add', path: '/relations/-', value: { rel: relationType('parent'), url: p.planning.parent.url } });
    if (pending.includes('iteration')) patch.push({ op: 'add', path: '/fields/System.IterationPath', value: p.planning.iteration });
    if (pending.includes('assignee')) patch.push({ op: 'add', path: '/fields/System.AssignedTo', value: p.planning.assignee.uniqueName });
    azure.api(p, 'wit', 'workitems', { project: p.project, id: receipt.issue.number }, io, 'PATCH', patch, {}, true);
    return recover({ receipt: file }, io);
  } catch (error) { return { status: 'partial_failure', issue: receipt.issue, receipt: file, confirmed: ['content'], message: error.message }; }
}
function query(request, io) {
  if (!request.type) return { status: 'needs_input', reason: 'work-item-type-required', message: 'Select the work-item type for this invocation; no default type is stored' };
  if (!source.segment(request.type)) throw new Error('Invalid work-item type');
  const target = azure.inspect(request.repository, io, request.project);
  const type = azure.api(target, 'wit', 'workitemtypes', { project: target.project, type: request.type }, io);
  if (type.name !== request.type) throw new Error('Invalid or incompatible work-item type');
  const plan = planning(request, target, io);
  const proposal = { provider: 'azuredevops', repository: target.url, ...target, type: type.name, ...content(request), ...(plan ? { planning: plan } : {}) };
  return { status: 'ready', proposal, confirmation: digest(proposal) };
}
function readUpdate(request, io) {
  const ref = source.resolve(request.reference, io);
  if (ref.status !== 'resolved' || !ref.project) throw new Error('Complete work-item URL required for update');
  const target = azure.inspect(`${ref.organization}/${encodeURIComponent(ref.project)}`, io);
  const item = readItem(target, ref.number, io);
  return { status: 'complete', ...target, repository: target.url, issue: item.issue, baseline: item.baseline, type: item.type,
    planning_state: planningState(relationRow(target, item.issue, io)) };
}
function queryUpdate(request, io) {
  const current = readUpdate(request, io);
  if (digest(current.baseline) !== digest(request.baseline)) return { status: 'needs_input', reason: 'stale-baseline', current, message: 'Boards revision changed; prepare and explicitly approve again' };
  const plan = planning(request, current, io, current.issue);
  const proposal = { ...current, provider: 'azuredevops', operation: 'update', ...content(request, current.baseline), ...(plan ? { planning: plan } : {}) };
  delete proposal.status;
  if (proposal.title === current.baseline.title && equivalent(proposal.description, current.baseline.description) && (!plan || !pendingPlanning(plan, plan.baseline).length)) return { status: 'no_changes', issue: current.issue };
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
  if (row.baseline.title === p.title && equivalent(p.description, row.baseline.description)) return p.planning ? planningOutcome(receipt, io) : { status: 'complete', issue: row.issue };
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
    const verified = recover({ receipt: file }, io);
    return p.planning && verified.status === 'partial_failure' ? applyPlanning(receipt, file, io) : verified;
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
        .filter(row => row.type === p.type && row.actor === p.actor && row.baseline.title === p.title && equivalent(p.description, row.baseline.description));
      const chosen = candidates.find(row => row.issue.url === request.issueUrl);
      if (!chosen) return { status: 'uncertain', candidates: candidates.map(row => row.issue), message: 'Confirm the actual created item URL; matching title alone is not publication evidence. Do not create again.' };
      receipt.issue = chosen.issue; save(file, receipt);
    }
    const result = outcome(receipt, io);
    if (result.status === 'partial_failure' && request.confirmation !== undefined) {
      if (request.confirmation !== result.continuation || request.approved !== true) throw new Error('Exact pending planning continuation approval required');
      return applyPlanning(receipt, file, io, request.confirmation);
    }
    if (result.status === 'complete') { receipt.stage = 'complete'; save(file, receipt); }
    return result;
  } catch (error) { return { status: 'uncertain', message: error.message }; }
}
const sliceIdentity = require('./backlog-slice-identity');
const CLOSED = ['Closed', 'Done', 'Removed'];
// Azure DevOps exposes no direct per-item permission read. A validate-only update (a revision test, nothing saved) is
// evaluated by the same service-side authorization as a real update and persists nothing, so a refusal is read before any write.
function requireEditable(current, io) {
  try {
    azure.api(current, 'wit', 'workitems', { project: current.project, id: current.issue.number }, io, 'PATCH', [{ op: 'test', path: '/rev', value: current.baseline.rev }], { validateOnly: 'true' }, true);
  } catch (error) {
    throw new Error(`Originating work item is not editable or its edit permission could not be verified (${error.message}); no replacement will be created`);
  }
}
// The origin as set parent: its state and the native children it already has.
function readOrigin(request, io) {
  const current = readUpdate({ reference: request.origin }, io);
  requireEditable(current, io);
  const ref = source.resolve(request.origin, io);
  const found = source.nativeRelations({ ...ref, project: ref.project }, io);
  return { issue: current.issue, repository: current.repository, baseline: current.baseline, closed: CLOSED.includes(found.row.fields['System.State']), children: () => found.children };
}
function setRead(p, item, io) {
  const row = readItem(p, item.number, io);
  // An originating work item keeps its own type; only the published children share the configured one.
  if (row.type !== p.type && row.issue.url !== p.origin?.issue.url) throw new Error('Work-item type changed');
  return { issue: row.issue, title: row.baseline.title, description: row.baseline.description, version: row.baseline.rev, actor: row.actor };
}
const relationType = kind => kind === 'parent' ? 'System.LinkTypes.Hierarchy-Reverse' : 'System.LinkTypes.Dependency-Reverse';
const relationURL = (p, other) => `${p.organization}/_apis/wit/workItems/${other.number}`;
function relationRow(p, item, io) {
  const row = azure.api(p, 'wit', 'workitems', { project: p.project, id: item.number }, io, 'GET', undefined, { '$expand': 'relations' });
  if (row.id !== item.number || !Number.isSafeInteger(row.rev) || !row.fields || !azure.equal(row.fields['System.TeamProject'], p.project) || (row.relations != null && !Array.isArray(row.relations))) throw new Error('Incomplete native relation inspection');
  return row;
}
function hasRelation(p, item, other, kind, io) {
  return (relationRow(p, item, io).relations || []).some(link => link.rel === relationType(kind) && azure.equal(link.url, relationURL(p, other)));
}
const set = require('./backlog-provider-set').bind('azuredevops', {
  query, equivalent, origin: readOrigin, representation: { hierarchy: 'native', dependencies: 'native' },
  // Preserve every character of the agreed block, including the Markdown separator.
  renderBlock: text => `<pre>${sliceIdentity.escape(text)}</pre>`,
  append: (description, links, value) => `${description}\n<p>${links.map(sliceIdentity.escape).join('<br>')}</p>\n${sliceIdentity.encodeHtml(value)}`,
  inventory: (p, io) => list(p, io).map(number => setRead(p, { number }, io)), read: setRead,
  create: (p, item, io) => {
    const row = azure.api(p, 'wit', 'workitems', { project: p.project, type: p.type }, io, 'POST', [
      { op: 'add', path: '/fields/System.Title', value: item.title }, { op: 'add', path: '/fields/System.Description', value: item.description }
    ], {}, true);
    if (!Number.isSafeInteger(row.id) || row.id < 1) throw new Error('Incomplete work-item creation identity');
    return { id: row.id, number: row.id, url: `${p.url}/_workitems/edit/${row.id}` };
  },
  writeReferences: (p, current, description, io) => azure.api(p, 'wit', 'workitems', { project: p.project, id: current.issue.number }, io, 'PATCH', [
    { op: 'test', path: '/rev', value: current.version }, { op: 'add', path: '/fields/System.Description', value: description }
  ], {}, true),
  hasRelation,
  addRelation: (p, item, other, kind, io) => {
    const current = relationRow(p, item, io);
    if (kind === 'parent' && (current.relations || []).some(link => link.rel === relationType(kind))) throw new Error('A different native parent already exists');
    azure.api(p, 'wit', 'workitems', { project: p.project, id: item.number }, io, 'PATCH', [
      { op: 'test', path: '/rev', value: current.rev }, { op: 'add', path: '/relations/-', value: { rel: relationType(kind), url: relationURL(p, other) } }
    ], {}, true);
  }
});
const assignment = require('./backlog-provider-assignment').bind('azuredevops', {
  native: true,
  inspect: (request, io) => {
    const ref = source.resolve(request.reference, io);
    if (!ref.url) throw new Error('Complete child work-item URL required');
    const target = azure.inspect(`${ref.organization}/${encodeURIComponent(ref.project)}`, io);
    return { result: source.readSet(ref, io), actor: target.actor };
  },
  assign: (request, proposal, io) => {
    const ref = source.resolve(request.reference, io), target = azure.inspect(`${ref.organization}/${encodeURIComponent(ref.project)}`, io);
    const current = relationRow(target, { number: ref.number }, io);
    const assigned = current.fields['System.AssignedTo'];
    if (digest(assigned ? [assigned.id] : []) !== digest(proposal.assignees) || target.actor !== proposal.actor) throw new Error('Azure responsibility or authenticated identity changed');
    // Azure resolves an identity field by unique name; the identity id is rejected as an unknown identity.
    if (!target.uniqueName) throw Object.assign(new Error('Azure did not report the authenticated user unique name; the work item was not changed'), { rejected: true });
    azure.api(target, 'wit', 'workitems', { project: target.project, id: ref.number }, io, 'PATCH', [
      { op: 'test', path: '/rev', value: current.rev }, { op: 'add', path: '/fields/System.AssignedTo', value: target.uniqueName }
    ], {}, true);
  }
});
module.exports = { classify, resolve, query, publish: (r, io) => execute(r, io, false), recover,
  'read-update': readUpdate, 'query-update': queryUpdate, update: (r, io) => execute(r, io, true), 'recover-update': recover, ...set, ...assignment };
