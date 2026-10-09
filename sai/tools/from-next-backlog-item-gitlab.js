'use strict';

const { project, api, issueURL } = require('./from-backlog-gitlab');
function select(r, io, { pending, check, positive, text }) {
  if (!text(r.project)) return pending('missing-context', 'Supply the GitLab project URL for the manually ordered issue list.');
  if (r.board || r.list || r.view) return pending('order-unavailable', 'Board/list membership and order cannot be established by this issue-list adapter. Keep selection pending; do not substitute the project issue list.');
  const target = project(r.project, io);
  if (!target.issues_enabled) return pending('inaccessible-pile', 'GitLab project issues are disabled.');
  if (!r.pile || r.pile !== 'issues') return pending('missing-pile', 'Choose the project issue list or supply another pile.', { options: [{ label: `${target.url}/-/issues — manual relative-position order`, value: 'issues' }] });
  const filters = r.filters || {};
  check(typeof filters === 'object' && !Array.isArray(filters), 'Invalid filters.');
  const params = new URLSearchParams({ per_page: '100', order_by: 'relative_position', sort: 'asc' });
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
  check(items.every(item => Number.isSafeInteger(item.relative_position) && item.relative_position >= 0), 'Manual position is unavailable for one or more members.');
  items.sort((a, b) => a.relative_position - b.relative_position);
  if (items.length > 1 && items[0].relative_position === items[1].relative_position) return pending('order-ambiguous', 'Several items share the first manual position.');
  const first = items[0];
  check(text(first.issue_type), 'First item type is unavailable.');
  if (first.issue_type !== 'issue') return pending('non-importable', `First GitLab item type: ${first.issue_type}. Choose how to continue; no item was skipped.`);
  const parsed = issueURL(first.web_url);
  check(parsed.destination === target.url && parsed.number === first.iid, 'First item reference does not match pile membership.');
  return { status: 'selected', provider: 'gitlab', reference: first.web_url, pile: target.url, order: 'relative_position ASC' };
}
module.exports = { select };
