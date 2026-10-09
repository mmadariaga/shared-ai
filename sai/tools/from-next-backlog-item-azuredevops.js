'use strict';

const { address, segment } = require('./from-backlog-azuredevops');
const { runAzureSdk } = require('./from-backlog');
// Work REST location IDs: the same authenticated, installed SDK transport used
// by backlog tooling. Fixed GET requests avoid resource-name dispatch ambiguity.
const LOCATIONS = {
  backlogs: 'a93726f9-7867-4e38-b4f2-0bfafc2f6a94',
  backlogWorkItems: '7c468d96-ab1d-4294-a360-92f07e9ccd98',
  backlogConfigurations: '7799f497-3cb5-4f16-ad4f-5cd06012db64',
};
function select(r, io, { pending, check, positive, text }) {
  if (!text(r.organization) || !segment(r.project)) return pending('missing-context', 'Supply the Azure DevOps Services organization URL and project.');
  const org = address(r.organization);
  check(org && !org.parts.length && !org.username, 'Invalid Azure DevOps organization.');
  if (!segment(r.team)) return pending('missing-context', 'Supply the team whose backlog you want.');
  if (r.filters || r.view) return pending('order-unavailable', 'Additional view filters cannot be established. Keep this pile pending; do not substitute the unfiltered team backlog.');
  function invoke(resource, route = {}) {
    const data = JSON.parse((io.sdk || runAzureSdk)(JSON.stringify({ organization: org.organization, identity: false,
      location: LOCATIONS[resource], method: 'GET', version: '7.1', route: { project: r.project, team: r.team, ...route }, query: {}, mediaType: 'application/json' })));
    check(!data.sdk_error && !data.continuationToken && !data.continuation_token, `Incomplete or failed Azure read: ${data.sdk_error || 'unexpected continuation'}`);
    return data;
  }
  const levels = invoke('backlogs');
  check(Array.isArray(levels.value) && levels.count === levels.value.length, 'Incomplete Azure backlog levels.');
  for (const level of levels.value) check(text(level?.id) && text(level.name), 'Invalid backlog level.');
  if (!text(r.backlog)) return pending('missing-pile', 'Choose the team backlog level, or supply another pile.', { options: levels.value.map(b => ({ label: `${r.project} / ${r.team} / ${b.name} (${b.id})`, value: b.id })) });
  const level = levels.value.find(b => b.id === r.backlog);
  check(level, 'The requested backlog level is not in this team.');
  // This endpoint supplies membership. Verify rank independently: response
  // relation order is not assumed to be the displayed manual backlog order.
  const result = invoke('backlogWorkItems', { backlogId: level.id });
  check(Array.isArray(result.workItems), 'Incomplete Azure backlog membership.');
  check(result.workItems.every(link => link && positive(link.target?.id)), 'Incomplete backlog member relation.');
  const ids = result.workItems.map(link => link.target.id);
  check(ids.every(positive) && new Set(ids).size === ids.length, 'Invalid or repeated backlog members.');
  if (positive(level.workItemCountLimit) && ids.length >= level.workItemCountLimit) return pending('incomplete-membership', 'The backlog response reaches its item limit; complete membership cannot be established.');
  if (!ids.length) return { status: 'empty' };
  const configuration = invoke('backlogConfigurations');
  const rankField = configuration.backlogFields?.typeFields?.Order;
  check(text(rankField), 'Team backlog configuration does not expose its manual rank field.');
  const items = ids.map(id => JSON.parse(io.run('az', ['boards', 'work-item', 'show', '--id', String(id), '--organization', org.organization, '--detect', 'false', '--output', 'json', '--only-show-errors'])));
  for (let i = 0; i < items.length; i++) check(items[i]?.id === ids[i] && items[i].fields?.['System.TeamProject'] === r.project && typeof items[i].fields[rankField] === 'number' && Number.isFinite(items[i].fields[rankField]), 'Missing or incompatible manual rank.');
  items.sort((a, b) => a.fields[rankField] - b.fields[rankField]);
  if (items.length > 1 && items[0].fields[rankField] === items[1].fields[rankField]) return pending('order-ambiguous', 'Several Azure items share the first manual position.');
  const first = items[0];
  check(text(first.fields['System.WorkItemType']), 'First work-item type is unavailable.');
  return { status: 'selected', provider: 'azuredevops', reference: `${org.organization}/${encodeURIComponent(r.project)}/_workitems/edit/${first.id}`, type: first.fields['System.WorkItemType'], order: rankField };
}
module.exports = { select };
