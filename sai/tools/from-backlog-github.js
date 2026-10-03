'use strict';

function fault(reason, message) { return Object.assign(new Error(message), { reason }); }

function normalize(value) {
  // Validate the raw path too: URL normalization must not repair a bad reference.
  const match = /^(?:https:\/\/github\.com)?\/([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+)\/issues\/([1-9][0-9]*)\/?(?:[?#][^\s]*)?$/i.exec(value);
  if (!match || ['.', '..'].includes(match[2]) || !Number.isSafeInteger(Number(match[3])) || Number(match[3]) > 2147483647) throw fault('invalid-reference', 'Use https://github.com/owner/repo/issues/123 or /owner/repo/issues/123');
  return { repository: `${match[1]}/${match[2]}`, number: Number(match[3]), url: `https://github.com/${match[1]}/${match[2]}/issues/${Number(match[3])}` };
}

function api(io, query, variables) {
  const response = JSON.parse(io.run('gh', ['api', 'graphql', '--hostname', 'github.com', '--input', '-'], JSON.stringify({ query, variables })));
  if (response.errors?.length || !response.data) throw fault('retrieval-failed', `GitHub retrieval failed: ${JSON.stringify(response.errors || response)}`);
  return response.data;
}

function read(reference, io) {
  let item;
  const comments = [];
  try {
    const checked = normalize(reference.url);
    const [owner, name] = checked.repository.split('/');
    const variables = { owner, name, number: checked.number };
    const repo = api(io, 'query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){nameWithOwner isArchived issueOrPullRequest(number:$number){__typename ... on Issue{number url title body state}}}}', variables).repository;
    const issue = repo?.issueOrPullRequest;
    if (!issue) throw fault('inaccessible-issue', 'Issue is missing or not readable; check authentication and repository access');
    if (issue.__typename === 'PullRequest') throw fault('not-an-issue', 'This number identifies a pull request, not an issue');
    if (issue.__typename !== 'Issue' || issue.number !== checked.number || typeof issue.url !== 'string' || typeof issue.title !== 'string' || typeof issue.body !== 'string' || !['OPEN', 'CLOSED'].includes(issue.state) || typeof repo.isArchived !== 'boolean' || typeof repo.nameWithOwner !== 'string') throw fault('incomplete-response', 'GitHub issue response is incomplete');
    item = { provider: 'github', repository: repo.nameWithOwner, repository_archived: repo.isArchived, number: issue.number, url: issue.url, title: issue.title, description: issue.body, state: issue.state, description_missing: issue.body.trim().length === 0 };
    let cursor = null;
    const seen = new Set();
    do {
      const result = api(io, 'query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){issue(number:$number){comments(first:100,after:$cursor){nodes{id url body author{login}} pageInfo{hasNextPage endCursor}}}}}', { ...variables, cursor });
      const page = result.repository?.issue?.comments;
      if (!Array.isArray(page?.nodes) || typeof page.pageInfo?.hasNextPage !== 'boolean') throw fault('incomplete-response', 'GitHub comments response is incomplete');
      for (const comment of page.nodes) {
        if (!comment || typeof comment.id !== 'string' || typeof comment.url !== 'string' || typeof comment.body !== 'string' || (comment.author !== null && typeof comment.author?.login !== 'string') || seen.has(`id:${comment.id}`)) throw fault('incomplete-response', 'GitHub comment is incomplete or repeated');
        seen.add(`id:${comment.id}`);
        comments.push({ id: comment.id, url: comment.url, author: comment.author?.login ?? null, body: comment.body });
      }
      if (!page.pageInfo.hasNextPage) return { status: 'complete', item, comments };
      cursor = page.pageInfo.endCursor;
      if (typeof cursor !== 'string' || !cursor || seen.has(`cursor:${cursor}`)) throw fault('incomplete-response', 'GitHub pagination cursor is missing or repeated');
      seen.add(`cursor:${cursor}`);
    } while (true);
  } catch (error) {
    return { status: item ? 'incomplete' : 'error', reason: error.reason || 'retrieval-failed', message: error.message, ...(item ? { item, comments } : {}) };
  }
}

module.exports = { normalize, read };
