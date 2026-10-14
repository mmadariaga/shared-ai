'use strict';

const crypto = require('node:crypto');
const source = require('./from-backlog-github');
const identity = require('./backlog-slice-identity');
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function rest(io, endpoint, method = 'GET', body) {
  return JSON.parse(io.run('gh', ['api', '--hostname', 'github.com', endpoint, '--method', method, ...(body ? ['--input', '-'] : [])], body ? JSON.stringify(body) : undefined));
}
function readHierarchy(io, ref) {
  const [owner, name] = ref.repository.split('/');
  const issue = source.api(io, 'query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){issue(number:$number){parent{url} subIssues(first:1){nodes{url}}}}}', { owner, name, number: ref.number }).repository?.issue;
  // Only a complete response decides: a missing parent field or sub-issue page is never read as "none".
  if (!issue || !Object.prototype.hasOwnProperty.call(issue, 'parent') || (issue.parent !== null && typeof issue.parent?.url !== 'string') || !Array.isArray(issue.subIssues?.nodes)) throw new Error('Incomplete assignment inspection');
  return { parent: issue.parent?.url ?? null, hasSubIssues: issue.subIssues.nodes.length > 0 };
}
function inspect(request, io) {
  const ref = source.normalize(request.reference);
  const issue = rest(io, `repos/${ref.repository}/issues/${ref.number}`);
  const actor = rest(io, 'user');
  if (issue.pull_request || issue.html_url !== ref.url || !Array.isArray(issue.assignees) || issue.assignees.some(item => typeof item.login !== 'string') || typeof actor.login !== 'string' || typeof issue.body !== 'string') throw new Error('Incomplete assignment inspection');
  const correspondence = identity.decode(issue.body);
  if (correspondence && (correspondence.role !== 'child' || correspondence.slices.find(slice => slice.change_name === correspondence.change_name)?.issue !== ref.url)) throw new Error('Assignment requires verified child correspondence; parent responsibility is preserved');
  let nativeParent;
  if (!correspondence || correspondence.hierarchy === 'native') {
    const hierarchy = readHierarchy(io, ref);
    nativeParent = hierarchy.parent;
    if (!nativeParent && correspondence) throw new Error('Selected issue has no verified native parent; parent responsibility is preserved');
    if (!nativeParent && hierarchy.hasSubIssues) throw new Error('Selected issue has sub-issues; parent responsibility is preserved');
  }
  // Without a marker, a native parent or sub-issues, the issue is a standalone leaf and has no parent.
  const parentUrl = correspondence?.parent || nativeParent;
  const parentRef = parentUrl ? source.normalize(parentUrl) : null;
  if (parentRef) {
    if (parentRef.url === ref.url) throw new Error('An issue cannot be its own parent');
    const parentIssue = rest(io, `repos/${parentRef.repository}/issues/${parentRef.number}`);
    if (parentIssue.pull_request || parentIssue.html_url !== parentRef.url || typeof parentIssue.body !== 'string') throw new Error('Parent issue identity could not be verified');
    if (correspondence) {
      const parent = identity.decode(parentIssue.body);
      if (!parent || parent.role !== 'parent' || parent.parent !== parentRef.url || digest(parent.slices) !== digest(correspondence.slices)) throw new Error('Parent does not confirm the selected child correspondence');
    }
    if (nativeParent && nativeParent !== parentRef.url) throw new Error('Native parent does not match the selected child correspondence');
  }
  return { status: 'complete', issue: ref.url, parent: parentRef?.url ?? null, actor: actor.login, assignees: issue.assignees.map(item => item.login).sort(), correspondence };
}
function propose(request, io) {
  const current = inspect(request, io);
  if (request.choice === 'keep') {
    if (!current.assignees.length) return { ...current, status: 'needs_input', reason: 'responsibility-changed' };
    const proposal = { ...current, choice: 'keep', target: current.assignees };
    return { status: 'ready', proposal, confirmation: digest(proposal) };
  }
  if (current.assignees.length && request.choice !== 'replace') return { ...current, status: 'needs_input', reason: 'already-assigned' };
  const proposal = { ...current, choice: current.assignees.length ? 'replace' : 'assign', target: [current.actor] };
  return { status: 'ready', proposal, confirmation: digest(proposal) };
}
function verify(request, io) {
  const current = inspect(request, io);
  const expected = request.expected_assignees || (request.choice === 'keep' ? [] : [current.actor]);
  const valid = Array.isArray(expected) && expected.length > 0 && expected.every(login => typeof login === 'string' && login) && new Set(expected).size === expected.length;
  const target = valid ? expected.slice().sort() : [];
  let verified = valid && request.expected_parent === current.parent && digest(current.assignees) === digest(target);
  if (request.choice === 'keep') verified = verified && request.confirmation === digest({ ...current, choice: 'keep', target });
  else verified = verified && target.length === 1 && target[0] === current.actor;
  return { ...current, status: verified ? 'complete' : 'needs_input', reason: 'assignment-verification', verified };
}
function assign(request, io) {
  if (request.choice === 'keep') throw new Error('Keeping responsibility is read-only; use verify-assignment');
  const ready = propose(request, io);
  if (ready.status !== 'ready' || ready.confirmation !== request.confirmation) throw new Error('Exact assignment approval and unchanged assignees are required');
  const ref = source.normalize(request.reference);
  try {
    // Assignment is a separate operation; title, body, labels and state stay untouched.
    rest(io, `repos/${ref.repository}/issues/${ref.number}`, 'PATCH', { assignees: ready.proposal.target });
    return verify({ ...request, expected_parent: ready.proposal.parent }, io);
  } catch (error) { return { status: 'uncertain', issue: ref.url, message: error.message, next_operation: 'verify-assignment' }; }
}
module.exports = { inspect, propose, assign, verify, rest };
