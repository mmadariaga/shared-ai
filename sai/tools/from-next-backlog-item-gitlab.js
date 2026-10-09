'use strict';

const { project, api, issueURL } = require('./from-backlog-gitlab');
function select(r, io, { pending, check, positive, text }) {
  if (!text(r.project)) return pending('missing-context', 'Supply the GitLab project URL for the manually ordered issue list.');
  if (r.board || r.list || r.view) return pending('order-unavailable', 'Board/list membership and order cannot be established by this issue-list adapter. Keep selection pending; do not substitute the project issue list.');
  const target = project(r.project, io);
  if (!target.issues_enabled) return pending('inaccessible-pile', 'GitLab project issues are disabled.');
  if (r.pile !== undefined && r.pile !== 'issues') return pending('missing-pile', 'Choose the project issue list or supply another pile.', { options: [{ label: `${target.url}/-/issues — manual relative-position order`, value: 'issues' }] });
  const filters = r.filters || {};
  check(typeof filters === 'object' && !Array.isArray(filters), 'Invalid filters.');
  const params = new URLSearchParams({ per_page: '100', state: 'opened', order_by: 'relative_position', sort: 'asc' });
  for (const [key, value] of Object.entries(filters)) {
    check(['state', 'labels', 'milestone', 'assignee_id'].includes(key) && text(value), 'Unsupported or invalid issue-list filter; membership cannot be established.');
    params.set(key, value);
  }
  const items = [], seen = new Set();
  for (let page = 1; ; page++) {
    params.set('page', String(page));
    const batch = api(target, `projects/${target.id}/issues?${params}`, io);
    check(Array.isArray(batch) && batch.length <= 100, 'Incomplete GitLab issue list.');
    for (const item of batch) {
      check(positive(item?.id) && item.project_id === target.id && !seen.has(item.id), 'Invalid or repeated pile member.');
      seen.add(item.id); items.push(item);
    }
    if (batch.length < 100) break;
  }
  if (!items.length) return { status: 'empty' };
  const positioned = items.filter(item => Number.isSafeInteger(item.relative_position) && item.relative_position >= 0);
  const priority = positioned.reduce((minimum, item) => Math.min(minimum, item.relative_position), Infinity);
  const highest = positioned.length ? positioned.filter(item => item.relative_position === priority) : items;
  const candidates = [];
  for (const item of highest) {
    check(text(item.issue_type), 'Candidate item type is unavailable.');
    if (item.issue_type !== 'issue') return pending('non-importable', `Highest-priority GitLab item type: ${item.issue_type}. Choose how to continue; no item was skipped.`);
    const parsed = issueURL(item.web_url);
    check(positive(item.iid) && parsed.destination === target.url && parsed.number === item.iid, 'Candidate reference does not match pile membership.');
    candidates.push({ reference: item.web_url, type: item.issue_type, relative_position: positioned.length ? priority : null });
  }
  return { status: 'candidates', provider: 'gitlab', candidates, pile: target.url, order: 'relative_position ASC, unpositioned last' };
}
module.exports = { select };
