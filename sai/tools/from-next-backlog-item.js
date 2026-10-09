'use strict';

const fs = require('node:fs');
const { run } = require('./from-backlog');
const adapters = {
  github: require('./from-next-backlog-item-github'),
  gitlab: require('./from-next-backlog-item-gitlab'),
  azuredevops: require('./from-next-backlog-item-azuredevops'),
};
const FIELDS = {
  github: ['owner', 'owner_kind', 'project', 'view', 'filters'],
  gitlab: ['project', 'pile', 'filters', 'board', 'list', 'view'],
  azuredevops: ['organization', 'project', 'team', 'backlog', 'view', 'filters'],
};
function pending(reason, message, extra = {}) { return { status: 'pending', reason, message, ...extra }; }
function check(condition, message) { if (!condition) throw Object.assign(new Error(message), { reason: 'incomplete-response' }); }
function positive(value) { return Number.isSafeInteger(value) && value > 0; }
function text(value) { return typeof value === 'string' && !!value.trim() && !/[\x00-\x1f\x7f]/.test(value); }
function select(request, io = { run }) {
  try {
    if (!request || typeof request !== 'object' || Array.isArray(request)) return pending('invalid-request', 'Supply a selection object.');
    if (request.cancel === true) return { status: 'cancelled' };
    if (!request.provider) return pending('missing-provider', 'Which provider holds the pile?', { options: Object.keys(adapters).map(value => ({ label: value, value })) });
    if (!Object.hasOwn(adapters, request.provider)) return pending('unsupported-provider', 'Supported providers: GitHub, GitLab, Azure DevOps.');
    if (Object.keys(request).some(key => !['provider', 'cancel', ...FIELDS[request.provider]].includes(key))) return pending('unsupported-context', 'The pile has unsupported selection context; membership and manual order cannot be established.');
    return adapters[request.provider].select(request, io, { pending, check, positive, text });
  } catch (error) {
    return pending(error.reason || 'retrieval-failed', error.message);
  }
}
function main(argv) {
  if (argv.length !== 1 || argv[0] !== 'select') {
    process.stdout.write(JSON.stringify(pending('usage', 'Usage: node from-next-backlog-item.js select; selection JSON on stdin')) + '\n');
    return 2;
  }
  let result;
  try { result = select(JSON.parse(fs.readFileSync(0, 'utf8'))); }
  catch (error) { result = pending('invalid-request', error.message); }
  process.stdout.write(JSON.stringify(result) + '\n');
  return ['selected', 'empty', 'cancelled'].includes(result.status) ? 0 : 1;
}
if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { select, main };
