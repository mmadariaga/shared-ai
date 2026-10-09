'use strict';

const { normalize } = require('./from-backlog-github');
function select(r, io, { pending, check, positive, text }) {
  if (!text(r.owner) || !['organization', 'user'].includes(r.owner_kind)) return pending('missing-context', 'Supply the GitHub project owner and whether it is an organization or user.');
  if (r.view || r.filters) return pending('order-unavailable', 'GitHub view filters and view-specific order are not exposed by this selector. Keep this pile pending; do not substitute the whole project.');
  function api(query, variables) {
    const data = JSON.parse(io.run('gh', ['api', 'graphql', '--hostname', 'github.com', '--input', '-'], JSON.stringify({ query, variables })));
    check(!data.errors?.length && data.data, `GitHub query failed: ${JSON.stringify(data.errors || data)}`);
    return data.data[r.owner_kind];
  }
  if (!positive(r.project)) {
    const options = [], seen = new Set();
    let cursor = null;
    for (;;) {
      const owner = api(`query($owner:String!,$cursor:String){${r.owner_kind}(login:$owner){projectsV2(first:100,after:$cursor){nodes{number title url} pageInfo{hasNextPage endCursor}}}}`, { owner: r.owner, cursor });
      const page = owner?.projectsV2;
      check(Array.isArray(page?.nodes) && typeof page.pageInfo?.hasNextPage === 'boolean', 'Incomplete GitHub project list.');
      for (const p of page.nodes) {
        check(positive(p?.number) && text(p.title) && text(p.url) && !seen.has(p.number), 'Invalid or repeated project.');
        seen.add(p.number); options.push({ label: `${p.title} — ${p.url}`, value: p.number });
      }
      if (!page.pageInfo.hasNextPage) return pending('missing-pile', 'Choose a GitHub project in its project-wide manual order, or supply another pile.', { options });
      cursor = page.pageInfo.endCursor;
      check(text(cursor) && !seen.has(cursor), 'Invalid project pagination.'); seen.add(cursor);
    }
  }
  // POSITION is the project-wide drag-and-drop order, not creation time.
  const owner = api(`query($owner:String!,$number:Int!){${r.owner_kind}(login:$owner){projectV2(number:$number){number url items(first:1,orderBy:{field:POSITION,direction:ASC}){nodes{id content{__typename ... on Issue{url} ... on PullRequest{url} ... on DraftIssue{title}}} pageInfo{hasNextPage endCursor}}}}}`, { owner: r.owner, number: r.project });
  const project = owner?.projectV2, page = project?.items;
  check(project?.number === r.project && text(project.url) && Array.isArray(page?.nodes) && page.nodes.length <= 1 && typeof page.pageInfo?.hasNextPage === 'boolean', 'Incomplete GitHub project response.');
  if (!page.nodes.length) { check(!page.pageInfo.hasNextPage, 'Partial empty project response.'); return { status: 'empty' }; }
  const item = page.nodes[0];
  check(text(item?.id), 'Missing project item identity.');
  if (item.content?.__typename !== 'Issue') return pending('non-importable', `First GitHub item type: ${item.content?.__typename || 'inaccessible content'}. Choose how to continue; no item was skipped.`);
  return { status: 'selected', provider: 'github', reference: normalize(item.content.url).url, pile: project.url, order: 'POSITION ASC' };
}
module.exports = { select };
