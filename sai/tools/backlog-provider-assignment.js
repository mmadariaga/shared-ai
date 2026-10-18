'use strict';

const { digest } = require('./to-backlog-github');
function bind(platform, mechanics) {
  function inspect(request, io) {
    const state = mechanics.inspect(request, io);
    const selected = state.result.item, parent = state.result.sources?.find(source => source.role === 'parent-context')?.item;
    // A standalone leaf has no parent, and only evidence the adapter proved natively may stand in for the parent and marker.
    const leaf = state.standalone === true && !selected?.parent && !selected?.correspondence;
    if (state.result.status !== 'complete' || !selected || selected.correspondence?.role === 'parent' || (!leaf && (!selected.parent || !parent))) throw new Error('Assignment requires a verified child and parent; parent responsibility is preserved');
    const value = selected.correspondence;
    if (value && (!parent.correspondence || parent.correspondence.role !== 'parent' || digest(parent.correspondence.slices) !== digest(value.slices))) throw new Error('Parent does not confirm the selected child correspondence');
    if (!value && !leaf && !mechanics.native) throw new Error('Written child correspondence is required');
    const validId = id => platform === 'gitlab' ? Number.isSafeInteger(id) && id > 0 : typeof id === 'string' && !!id;
    if (!Array.isArray(selected.assignees) || selected.assignees.some(id => !validId(id)) || new Set(selected.assignees).size !== selected.assignees.length || !validId(state.actor)) throw new Error('Incomplete assignment identity');
    return { status: 'complete', issue: selected.url, parent: leaf ? null : parent.url, actor: state.actor, assignees: selected.assignees.slice().sort(), correspondence: value };
  }
  function propose(request, io) {
    const current = inspect(request, io);
    if (request.choice === 'keep') {
      if (!current.assignees.length) return { ...current, status: 'needs_input', reason: 'responsibility-changed' };
      const proposal = { ...current, choice: 'keep', target: current.assignees };
      return { status: 'ready', proposal, confirmation: digest(proposal) };
    }
    if (request.choice && !['assign', 'replace'].includes(request.choice)) throw new Error('Invalid assignment choice');
    if (current.assignees.length && request.choice !== 'replace') return { ...current, status: 'needs_input', reason: 'already-assigned' };
    const proposal = { ...current, choice: current.assignees.length ? 'replace' : 'assign', target: [current.actor] };
    return { status: 'ready', proposal, confirmation: digest(proposal) };
  }
  function verify(request, io) {
    const current = inspect(request, io), expected = request.expected_assignees || (request.choice === 'keep' ? [] : [current.actor]);
    const valid = Array.isArray(expected) && expected.length && expected.every(id => id) && new Set(expected).size === expected.length;
    const target = valid ? expected.slice().sort() : [];
    let verified = !!valid && request.expected_parent === current.parent && digest(target) === digest(current.assignees);
    if (request.choice === 'keep') verified = verified && request.confirmation === digest({ ...current, choice: 'keep', target });
    else verified = verified && target.length === 1 && target[0] === current.actor;
    return { ...current, status: verified ? 'complete' : 'needs_input', reason: 'assignment-verification', verified };
  }
  function assign(request, io) {
    if (request.choice === 'keep') throw new Error('Keeping responsibility is read-only; use verify-assignment');
    const ready = propose(request, io);
    if (ready.status !== 'ready' || ready.confirmation !== request.confirmation) throw new Error('Exact assignment approval and unchanged responsibility required');
    try { mechanics.assign(request, ready.proposal, io); return verify({ ...request, expected_parent: ready.proposal.parent }, io); }
    catch (error) {
      // A provider rejection that proves nothing changed is definite; retrying it cannot succeed.
      if (error.rejected === true) return { status: 'rejected', issue: ready.proposal.issue, message: `No change was applied: ${error.message}` };
      return { status: 'uncertain', issue: ready.proposal.issue, message: error.message, next_operation: 'verify-assignment' };
    }
  }
  return { 'inspect-assignment': inspect, 'propose-assignment': propose, assign, 'verify-assignment': verify };
}
module.exports = { bind };
