'use strict';

const identity = require('./backlog-slice-identity');

// An originating issue is item 0 of a slice set. This module holds the provider-neutral checks
// that run before any write; each provider supplies how to read the origin and its destination.
const digest = value => require('./to-backlog-github').digest(value);
const blocked = (reason, message, extra = {}) => ({ status: 'blocked', reason, message, ...extra });

/**
 * Reads and checks the origin, then prepares the destination derived from it.
 * `provider.origin(request, io)` returns { issue, repository, baseline, closed, children }, where `children()`
 * reads the existing children only once the origin is known to take a new set.
 * `provider.query(request, io)` is the provider's ordinary destination query.
 */
function prepare(platform, request, io, provider) {
  if (identity.platformFor(request.origin) !== platform) return blocked('origin-destination-mismatch', 'Slices are published in the originating issue\'s own provider; nothing was written');
  let url;
  try { url = identity.normalize(request.origin, platform); } catch (error) { return blocked('origin-unavailable', error.message); }
  let current;
  try { current = provider.origin({ ...request, origin: url }, io); } catch (error) { return blocked('origin-unavailable', error.message); }
  const { issue } = current;
  if (current.closed) return blocked('origin-closed', 'The originating issue is closed; it is not reopened and nothing was written', { issue });
  let marker;
  try { marker = identity.decode(current.baseline.description); } catch (error) { return blocked('origin-already-published', error.message, { issue }); }
  // Only a parent marker means a set exists; a child marker keeps its earlier correspondence beside the new set (child_of).
  if (marker?.role === 'parent') return blocked('origin-already-published', 'The originating issue already carries a sai-backlog-slices@1 parent marker; no second set is written', { issue, children: marker.slices.map(slice => slice.issue) });
  if (!request.origin_baseline) return { status: 'needs_input', reason: 'origin-baseline-required', message: 'Read the originating issue with read-update and pass its baseline as origin_baseline', current };
  if (digest(current.baseline) !== digest(request.origin_baseline)) return { status: 'needs_input', reason: 'stale-baseline', current, message: 'Originating issue content changed; prepare and approve a new proposal from the current baseline' };
  const children = current.children();
  const content = { title: current.baseline.title, description: request.description };
  const ready = provider.query({ ...request, ...content, repository: current.repository }, io);
  if (ready.status !== 'ready') return ready;
  if (request.repository) {
    const configured = provider.query({ ...request, ...content }, io);
    if (configured.status !== 'ready' || digest(configured.proposal) !== digest(ready.proposal)) return blocked('origin-destination-mismatch', 'The configured destination differs from the originating issue\'s; nothing was written', { issue });
  }
  return { status: 'ready', ready, origin: { issue, baseline: current.baseline, children, destination: digest(ready.proposal), ...(marker ? { child_of: marker } : {}) } };
}

// The first item of a receipt is the existing origin; its description is rewritten last.
function item(proposal) {
  return { title: proposal.title, description: proposal.description, issue: proposal.origin.issue, origin: true, baseline_body: proposal.origin.baseline.description };
}

// The origin keeps its earlier link to the set it belongs to, in the marker and as readable lines.
function upperLinks(upper) {
  const own = upper.slices.find(slice => slice.change_name === upper.change_name);
  return [`Parent: ${upper.parent}`, ...own.depends_on.map(name => `Depends on: ${upper.slices.find(slice => slice.change_name === name).issue}`)];
}

// Bodies the origin (or any item) may legitimately hold while a set is published or resumed.
const bodies = (row, ...current) => [...current, row.description, row.previous_body, row.previous_relation_body, row.baseline_body];

// Re-reads the destination of an origin set against the one approved.
function checkDestination(receipt, query, io) {
  const { request, proposal } = receipt;
  const fresh = query({ ...request, title: proposal.title, repository: proposal.repository }, io);
  if (fresh.status !== 'ready' || digest(fresh.proposal) !== proposal.origin.destination) throw new Error('Publication destination, content, type or authenticated identity changed; renew review');
}

const RELATIONS = 'Reuse the originating issue as the parent: create and link the children, then rewrite its description with the agreed objective, Child lines and the sai-backlog-slices@1 marker. Its title and state are unchanged and it is never closed; assignment is unchanged';

module.exports = { prepare, item, upperLinks, bodies, checkDestination, RELATIONS };
