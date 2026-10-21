'use strict';

const fs = require('node:fs');
const blocks = require('./ready-to-propose');
const identity = require('./backlog-slice-identity');
const { digest, receiptPath, save } = require('./to-backlog-github');
const origin = require('./backlog-set-origin');

// The workflow is shared; adapters own destination, content and remote mechanics.
function bind(provider, mechanics) {
  // Descriptions compare byte for byte unless the provider declares which stored forms are the same content.
  const same = mechanics.equivalent || ((sent, received) => sent === received);
  const accepted = (sent, received) => sent.some(value => typeof value === 'string' && same(value, received));
  function query(request, io) {
    const validation = blocks.validateDependencySet(request.blocks);
    if (!validation.ok) return { status: 'needs_input', reason: 'invalid-dependencies', validation };
    let ready = request.origin ? undefined : mechanics.query(request, io), existing;
    if (request.origin) {
      if (!mechanics.origin) return { status: 'blocked', reason: 'origin-unsupported', message: 'Provider cannot publish a set under an originating issue' };
      const prepared = origin.prepare(provider, request, io, mechanics);
      if (prepared.status !== 'ready') return prepared;
      ({ ready, origin: existing } = prepared);
    }
    if (ready.status !== 'ready') return ready;
    const texts = blocks.extractBlockTexts(request.blocks);
    const slices = validation.order.map(name => {
      const index = validation.blocks.findIndex(row => row.name === name);
      return { change_name: name, title: name, description: mechanics.renderBlock(texts[index]), depends_on: validation.blocks[index].dependencies };
    });
    const representation = mechanics.representation;
    const proposal = { ...ready.proposal, operation: 'set', ...(existing ? { origin: existing } : {}), slices, ...representation,
      relations: existing ? origin.RELATIONS : 'Separate verified creations, written correspondence and supported native relations; assignment is unchanged' };
    return { status: 'ready', proposal, confirmation: digest(proposal) };
  }
  function body(receipt, index) {
    const slices = receipt.proposal.slices.map((slice, i) => ({ change_name: slice.change_name, issue: receipt.items[i + 1].issue.url, depends_on: slice.depends_on }));
    const upper = index ? null : receipt.proposal.origin?.child_of;
    const value = { version: 1, platform: provider, role: index ? 'child' : 'parent', parent: receipt.items[0].issue.url, slices,
      hierarchy: receipt.proposal.hierarchy, dependency_representation: receipt.proposal.dependencies,
      ...(index ? { change_name: slices[index - 1].change_name } : {}), ...(upper ? { child_of: upper } : {}) };
    const links = index ? [`Parent: ${value.parent}`, ...slices[index - 1].depends_on.map(name => `Depends on: ${slices.find(slice => slice.change_name === name).issue}`)]
      : [...slices.map(slice => `Child: ${slice.change_name} — ${slice.issue}`), ...(upper ? origin.upperLinks(upper) : [])];
    return mechanics.append(receipt.items[index].description, links, value);
  }
  function report(receipt, message) {
    const pending = receipt.items.flatMap((item, index) => [!item.issue && `create:${index}`, !item.references && `references:${index}`,
      index && receipt.proposal.hierarchy === 'native' && !item.hierarchy && `hierarchy:${index}`,
      ...(index && receipt.proposal.dependencies === 'native' ? receipt.proposal.slices[index - 1].depends_on.filter(name => !item.dependencies?.includes(name)).map(name => `dependency:${index}:${name}`) : [])].filter(Boolean));
    const adopted = receipt.items.find(item => item.origin);
    return { status: pending.length || message ? 'partial_failure' : 'complete', created: receipt.items.filter(item => item.issue && !item.origin).map(item => item.issue), ...(adopted ? { origin: adopted.issue } : {}), pending,
      representation: { hierarchy: receipt.proposal.hierarchy, dependencies: receipt.proposal.dependencies },
      correspondence: pending.length || message ? null : identity.decode(body(receipt, 0)), ...(message ? { message } : {}) };
  }
  function load(request) {
    const file = receiptPath(request.receipt), receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (receipt.version !== 1 || receipt.proposal?.provider !== provider || receipt.proposal.operation !== 'set' || !Array.isArray(receipt.items) || receipt.items.length !== receipt.proposal.slices.length + 1) throw new Error('Invalid provider set receipt');
    return { file, receipt };
  }
  function check(receipt, io) {
    if (receipt.proposal.origin) return origin.checkDestination(receipt, mechanics.query, io);
    const ready = query(receipt.request, io);
    if (ready.status !== 'ready' || digest(ready.proposal) !== receipt.original_confirmation) throw new Error('Publication destination, content, type or authenticated identity changed; renew review');
  }
  function recover(request, io) {
    const { file, receipt } = load(request);
    try {
    check(receipt, io);
    const candidates = [];
    let verificationIncomplete = false;
    for (let index = 0; index < receipt.items.length; index++) {
      const item = receipt.items[index];
      if (!item.issue && item.attempted) {
        const matches = mechanics.inventory(receipt.proposal, io).filter(row => !item.baseline.includes(row.issue.id) && row.title === item.title && same(item.description, row.description) && row.actor === receipt.proposal.actor);
        const chosen = matches.find(row => row.issue.url === request.identified?.[index]);
        if (chosen) item.issue = chosen.issue;
        else candidates.push({ index, issues: matches.map(row => row.issue) });
      }
      if (!item.issue) continue;
      const current = mechanics.read(receipt.proposal, item.issue, io);
      const expected = receipt.items.every(row => row.issue) ? body(receipt, index) : item.description;
      if (digest(current.issue) !== digest(item.issue) || current.title !== item.title || !accepted(origin.bodies(item, expected), current.description)) throw new Error('Existing result diverged; no continuation is authorized');
      item.references = same(expected, current.description) && expected !== item.description;
      if (index && receipt.items[0].issue) {
        try {
        if (receipt.proposal.hierarchy === 'native') item.hierarchy = mechanics.hasRelation(receipt.proposal, item.issue, receipt.items[0].issue, 'parent', io);
        if (receipt.proposal.dependencies === 'native') item.dependencies = receipt.proposal.slices[index - 1].depends_on.filter(name => {
          const blocker = receipt.items[receipt.proposal.slices.findIndex(slice => slice.change_name === name) + 1].issue;
          return blocker && mechanics.hasRelation(receipt.proposal, item.issue, blocker, 'dependency', io);
        });
        if (item.hierarchy) item.last_verified_hierarchy = true;
        item.last_verified_dependencies = [...new Set([...(item.last_verified_dependencies || []), ...(item.dependencies || [])])];
        } catch (error) {
          if (!receipt.relation_error) throw error;
          // An unavailable relation read is not proof of absence or success.
          item.hierarchy = false; item.dependencies = [];
          receipt.relation_error = error.message;
          verificationIncomplete = true;
        }
      }
    }
    save(file, receipt);
    const result = { ...report(receipt), candidates };
    if (request.fallback === 'written') {
      if (!receipt.relation_error) throw new Error('Written fallback requires an established native relation failure');
      return { ...result, fallback_proposal: { hierarchy: 'written', dependencies: 'written', reason: receipt.relation_error,
        existing_native_links: receipt.items.filter(item => item.last_verified_hierarchy).map(item => item.issue), existing_native_dependencies: receipt.items.filter(item => item.last_verified_dependencies?.length).map(item => ({ issue: item.issue, depends_on: item.last_verified_dependencies })) }, continuation: digest({ receipt, fallback: 'written' }) };
    }
    return { ...result, ...(verificationIncomplete ? { message: 'Relationship verification incomplete; consult the user' } : { continuation: digest(receipt) }) };
    } catch (error) {
      // Keep verified identities visible, but offer no continuation from an unread frontier.
      return { ...report(receipt, error.message), candidates: [] };
    }
  }
  function perform(receipt, file, io) {
    try {
      check(receipt, io);
      for (const item of receipt.items) {
        if (item.issue) continue;
        if (item.attempted) return report(receipt, 'Recover and identify the existing creation before continuing');
        item.baseline = mechanics.inventory(receipt.proposal, io).map(row => row.issue.id);
        item.attempted = true; save(file, receipt);
        item.issue = mechanics.create(receipt.proposal, item, io); save(file, receipt);
        const current = mechanics.read(receipt.proposal, item.issue, io);
        if (digest(current.issue) !== digest(item.issue) || current.title !== item.title || !same(item.description, current.description)) throw new Error('Creation identity or complete content not verified');
      }
      // An origin is rewritten last, so an interrupted publication never lists children that do not exist.
      const order = receipt.items.map((row, index) => index);
      if (receipt.items[0].origin) order.push(order.shift());
      for (const index of order) {
        const item = receipt.items[index], expected = body(receipt, index);
        const current = mechanics.read(receipt.proposal, item.issue, io);
        if (current.title !== item.title || !accepted(origin.bodies(item, expected), current.description)) throw new Error('Content diverged; renew approval');
        if (!same(expected, current.description)) mechanics.writeReferences(receipt.proposal, current, expected, io);
        if (!same(expected, mechanics.read(receipt.proposal, item.issue, io).description)) throw new Error('Written references not verified');
        item.references = true; save(file, receipt);
        if (!index) continue;
        const relations = [ ...(receipt.proposal.hierarchy === 'native' ? [{ other: receipt.items[0].issue, kind: 'parent' }] : []),
          ...(receipt.proposal.dependencies === 'native' ? receipt.proposal.slices[index - 1].depends_on.map(name => ({ other: receipt.items[receipt.proposal.slices.findIndex(slice => slice.change_name === name) + 1].issue, kind: 'dependency' })) : []) ];
        for (const relation of relations) {
          try {
            if (!mechanics.hasRelation(receipt.proposal, item.issue, relation.other, relation.kind, io)) mechanics.addRelation(receipt.proposal, item.issue, relation.other, relation.kind, io);
            if (!mechanics.hasRelation(receipt.proposal, item.issue, relation.other, relation.kind, io)) throw new Error('Native relation not verified');
            if (relation.kind === 'parent') item.last_verified_hierarchy = true;
            else {
              const name = receipt.proposal.slices.find((slice, i) => receipt.items[i + 1].issue.url === relation.other.url).change_name;
              item.last_verified_dependencies = [...new Set([...(item.last_verified_dependencies || []), name])];
            }
            save(file, receipt);
          } catch (error) { receipt.relation_error = error.message; save(file, receipt); throw error; }
        }
      }
      return recover({ receipt: file }, io);
    } catch (error) { return report(receipt, error.message); }
  }
  function publish(request, io) {
    let receipt, file;
    try {
      file = receiptPath(request.receipt);
      const ready = query(request, io);
      if (ready.status !== 'ready') return ready;
      if (ready.confirmation !== request.confirmation) throw new Error('Exact parent, children, destination and relations approval required');
      const { receipt: ignoredReceipt, confirmation: ignoredConfirmation, ...input } = request;
      receipt = { version: 1, request: input, original_confirmation: ready.confirmation, proposal: ready.proposal,
        items: [ready.proposal.origin ? origin.item(ready.proposal) : { title: ready.proposal.title, description: ready.proposal.description }, ...ready.proposal.slices.map(slice => ({ title: slice.title, description: slice.description }))] };
      fs.writeFileSync(file, JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
    } catch (error) { return { status: 'failure_before_publication', message: error.message }; }
    return perform(receipt, file, io);
  }
  function continueSet(request, io) {
    const verified = recover(request, io);
    if (verified.candidates.length) return verified;
    if (verified.status === 'complete' && !request.fallback) return verified;
    if (!verified.continuation || verified.continuation !== request.confirmation) throw new Error('Explicit approval of verified pending operations required');
    const { file, receipt } = load(request);
    require('./backlog-publication-retry').authorize(request, receipt, file, save);
    if (request.fallback === 'written') {
      receipt.items.forEach((item, index) => { item.previous_body = body(receipt, index); item.references = false; });
      receipt.proposal.hierarchy = 'written'; receipt.proposal.dependencies = 'written'; save(file, receipt);
    }
    return perform(receipt, file, io);
  }
  function lookupSlice(request, io) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(request.change_name)) throw new Error('Explicit change name required');
    const ready = mechanics.query({ ...request, title: 'lookup', description: '' }, io);
    if (ready.status !== 'ready') return ready;
    const rows = mechanics.inventory(ready.proposal, io);
    const candidates = rows.flatMap(row => {
      const value = identity.upper(identity.decode(row.description));
      if (!value || value.platform !== provider || value.change_name !== request.change_name || value.slices.find(slice => slice.change_name === value.change_name)?.issue !== row.issue.url) return [];
      const parentRow = rows.find(row => row.issue.url === value.parent);
      const parent = parentRow && identity.decode(parentRow.description);
      if (!parent || parent.role !== 'parent' || parent.platform !== provider || parent.parent !== value.parent || digest(parent.slices) !== digest(value.slices)) throw new Error('Parent does not confirm recovered slice correspondence');
      return [{ issue: row.issue.url, parent: value.parent, change_name: value.change_name, platform: provider, correspondence: value }];
    });
    return candidates.length === 1 ? { status: 'complete', ...candidates[0] } : { status: 'needs_input', reason: 'slice-identity-ambiguous', candidates };
  }
  return { 'query-set': query, 'publish-set': publish, 'recover-set': recover, 'continue-set': continueSet, 'lookup-slice': lookupSlice };
}
module.exports = { bind };
