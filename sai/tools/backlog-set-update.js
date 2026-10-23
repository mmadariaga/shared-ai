'use strict';

const fs = require('node:fs');
const blocks = require('./ready-to-propose');
const identity = require('./backlog-slice-identity');
const digest = value => require('./to-backlog-github').digest(value);
const receiptPath = value => require('./to-backlog-github').receiptPath(value);
const save = (file, receipt) => require('./to-backlog-github').save(file, receipt);

// Only the single-issue content adapters can write in this lane. No creation or relation operation is reachable.
function bind(provider, adapter, same = (a, b) => a === b) {
  const correspondence = value => digest({ ...value, slices: [...value.slices].map(slice => ({ ...slice, depends_on: [...slice.depends_on].sort() })).sort((a, b) => a.change_name.localeCompare(b.change_name)) });
  function render(description, value) {
    const own = value.role === 'child' && value.slices.find(slice => slice.change_name === value.change_name);
    const links = own ? [`Parent: ${value.parent}`, ...own.depends_on.map(name => `Depends on: ${value.slices.find(slice => slice.change_name === name).issue}`)]
      : [...value.slices.map(slice => `Child: ${slice.change_name} — ${slice.issue}`), ...(value.child_of ? require('./backlog-set-origin').upperLinks(value.child_of) : [])];
    return provider === 'azuredevops' ? `${description}\n<p>${links.map(identity.escape).join('<br>')}</p>\n${identity.encodeHtml(value)}`
      : `${description}\n\n${links.join('\n')}\n${identity.encode(value)}`;
  }
  function query(request, io) {
    const validation = blocks.validateDependencySet(request.blocks);
    if (!validation.ok) return { status: 'blocked', reason: 'invalid-dependencies', validation };
    const api = adapter();
    const parent = api['read-update']({ reference: request.origin }, io);
    const marker = identity.decode(parent.baseline.description);
    if (!marker || marker.role !== 'parent' || marker.platform !== provider || marker.parent !== parent.issue.url) return { status: 'blocked', reason: 'unverifiable-correspondence' };
    const names = validation.blocks.map(row => row.name), previous = marker.slices.map(slice => slice.change_name);
    const added = names.filter(name => !previous.includes(name)), removed = previous.filter(name => !names.includes(name));
    const dependencies = validation.blocks.filter(row => digest([...row.dependencies].sort()) !== digest([...(marker.slices.find(slice => slice.change_name === row.name)?.depends_on || [])].sort())).map(row => row.name);
    if (added.length || removed.length || dependencies.length) return { status: 'blocked', reason: 'composition-changed', added, removed, dependencies };
    if (typeof request.title !== 'string' || !request.title.trim() || typeof request.description !== 'string') throw new Error('Complete parent title and description required');
    const texts = blocks.extractBlockTexts(request.blocks), items = [];
    const inputs = [{ current: parent, title: request.title, description: provider === 'azuredevops' ? require('./azure-markdown').convert(request.description) : request.description, marker }];
    // Resolve the complete correspondence before preparing any write, independent of block order.
    for (const slice of marker.slices) {
      const current = api['read-update']({ reference: slice.issue }, io);
      const child = identity.decode(current.baseline.description), upper = identity.upper(child);
      const expected = { ...marker, role: 'child', change_name: slice.change_name };
      delete expected.child_of;
      if (current.issue.url !== slice.issue || !upper || correspondence(upper) !== correspondence(expected)) throw new Error('Child correspondence is missing, ambiguous, or incompatible; no updates were written');
      if (current.repository !== parent.repository) throw new Error('Child destination differs from the parent');
      const index = validation.blocks.findIndex(row => row.name === slice.change_name);
      if (validation.blocks[index].backlog_origin && validation.blocks[index].backlog_origin !== slice.issue) throw new Error('Block origin conflicts with the published child correspondence; no updates were written');
      const text = texts[index];
      const description = provider === 'azuredevops' ? `<pre>${identity.escape(text)}</pre>` : text;
      // An adopted parent keeps its own descendants and child_of; upper verifies only its place in this set.
      inputs.push({ current, title: slice.change_name, description, marker: child });
    }
    for (const input of inputs) {
      const content = { reference: input.current.issue.url, baseline: input.current.baseline, title: input.title, description: render(input.description, input.marker) };
      const ready = api['query-update'](content, io);
      if (!['ready', 'no_changes'].includes(ready.status)) return ready;
      items.push({ issue: input.current.issue, current: input.current, request: content, changed: ready.status === 'ready', state: ready.status === 'ready' ? 'pending' : 'complete', ...(ready.status === 'ready' ? { proposal: ready.proposal, confirmation: ready.confirmation } : {}) });
    }
    const proposal = { provider, operation: 'set-update', correspondence: marker, items };
    return { status: items.some(item => item.changed) ? 'ready' : 'no_changes', proposal, confirmation: digest(proposal) };
  }
  function load(request) {
    const file = receiptPath(request.receipt), receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (receipt.version !== 1 || receipt.proposal?.provider !== provider || receipt.proposal.operation !== 'set-update' || !Array.isArray(receipt.proposal.items)) throw new Error('Invalid set-update receipt');
    return { file, receipt };
  }
  function report(receipt, message) {
    const items = receipt.proposal.items;
    return { status: message || items.some(item => item.state !== 'complete') ? 'partial_failure' : 'complete',
      updated: items.filter(item => item.changed && item.state === 'complete').map(item => item.issue),
      unchanged: items.filter(item => !item.changed && item.state === 'complete').map(item => item.issue),
      pending: items.filter(item => item.state !== 'complete').map(item => ({ issue: item.issue, state: item.state })),
      correspondence: receipt.proposal.correspondence, ...(message ? { message } : {}) };
  }
  function inspect(receipt, io) {
    const errors = [];
    for (const item of receipt.proposal.items) {
      try {
        const current = adapter()['read-update']({ reference: item.issue.url }, io);
        const fixed = value => { const { baseline, ...rest } = value; return rest; };
        if (digest(fixed(current)) !== digest(fixed(item.current))) throw new Error('Issue identity, destination, visibility or actor changed; renew comparison and confirmation');
        if (current.baseline.title === item.request.title && same(item.request.description, current.baseline.description)) item.state = 'complete';
        else if (digest(current.baseline) === digest(item.request.baseline)) item.state = 'pending';
        else { item.state = 'divergent'; throw new Error('Remote content changed; renew comparison and confirmation before pending writes'); }
      } catch (error) { if (item.state !== 'divergent') item.state = 'unverified'; errors.push(error.message); }
    }
    if (errors.length) throw new Error(errors.join('; '));
  }
  function recover(request, io) {
    const { file, receipt } = load(request);
    try {
      inspect(receipt, io); save(file, receipt);
      return { ...report(receipt), continuation: digest(receipt) };
    } catch (error) { return interrupted(file, receipt, error); }
  }
  function interrupted(file, receipt, error) {
    let message = error.message;
    try { save(file, receipt); } catch (saving) { message += `; recovery record could not be saved: ${saving.message}`; }
    return report(receipt, message);
  }
  function perform(file, receipt, io) {
    try {
      // Validate the whole frontier before each write; a later edit stops all pending operations.
      for (const item of receipt.proposal.items) {
        inspect(receipt, io); save(file, receipt);
        if (item.state === 'complete') continue;
        if (item.attempted) {
          const recovered = adapter()['recover-update']({ receipt: item.receipt }, io);
          if (!['complete', 'pending'].includes(recovered.status)) throw new Error('Previous update outcome requires renewed comparison and confirmation');
        }
        const ready = adapter()['query-update'](item.request, io);
        if (ready.status !== 'ready' || ready.confirmation !== item.confirmation) throw new Error('Issue changed before update; renew comparison and confirmation');
        item.receipt = `${file}.item-${receipt.proposal.items.indexOf(item)}-${item.attempts || 0}.json`;
        item.attempted = true; item.attempts = (item.attempts || 0) + 1; save(file, receipt);
        const result = adapter().update({ ...item.request, confirmation: item.confirmation, receipt: item.receipt }, io);
        inspect(receipt, io); save(file, receipt);
        if (item.state !== 'complete') throw new Error(result.message || 'Update did not complete; recover before continuing');
      }
      return report(receipt);
    } catch (error) { return interrupted(file, receipt, error); }
  }
  function update(request, io) {
    let file, receipt;
    try {
      file = receiptPath(request.receipt);
      const ready = query(request, io);
      if (ready.status !== 'ready') return ready;
      if (request.confirmation !== ready.confirmation) throw new Error('Exact combined set content and baseline confirmation required');
      receipt = { version: 1, proposal: ready.proposal };
      fs.writeFileSync(file, JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
    } catch (error) { return { status: 'failure_before_publication', message: error.message }; }
    return perform(file, receipt, io);
  }
  function continueUpdate(request, io) {
    const verified = recover(request, io);
    if (verified.status === 'complete' || !verified.continuation) return verified;
    if (request.confirmation !== verified.continuation) throw new Error('Exact verified pending set-update confirmation required');
    const { file, receipt } = load(request);
    require('./backlog-publication-retry').authorize(request, receipt, file, save);
    return perform(file, receipt, io);
  }
  return { 'query-set-update': query, 'update-set': update, 'recover-set-update': recover, 'continue-set-update': continueUpdate };
}
module.exports = { bind };
