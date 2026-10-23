'use strict';

const MARKER = '<!-- sai-to-pr:inherent-risk -->';
const START = '<!-- sai-inherent-risk:start -->', END = '<!-- sai-inherent-risk:end -->';
const BLOCK = /<!-- sai-inherent-risk:start -->[\s\S]*?<!-- sai-inherent-risk:end -->/g;
function plan(request, description, provider, target, existing, io) {
  if (request.risk_placement === undefined && request.risk_block === undefined) return undefined;
  const placement = request.risk_placement || 'description', block = request.risk_block;
  if (!['description', 'comment'].includes(placement) || typeof block !== 'string' ||
      !block.startsWith(START) || !block.endsWith(END) || block.split(START).length !== 2 || block.split(END).length !== 2 ||
      !block.includes('## Inherent Risk')) throw new Error('A complete marked Inherent Risk block and valid placement are required');
  const blocks = description.match(BLOCK) || [];
  if (placement === 'description' ? blocks.length !== 1 || blocks[0] !== block || description.split(START).length !== 2 || description.split(END).length !== 2
    : blocks.length !== 0 || description.includes(START) || description.includes(END)) throw new Error('Keep exactly one complete risk block in the selected location');
  let overflow;
  if (placement === 'comment') {
    const limit = request.provider === 'azuredevops' ? 4000 : request.description_overflow?.limit;
    const length = request.description_overflow?.length;
    if (!Number.isSafeInteger(limit) || limit < 1 || request.description_overflow?.limit !== limit || !Number.isSafeInteger(length) || length <= limit || length < request.description.length + block.length) throw new Error('Comment placement requires the original description overflow length and provider limit');
    overflow = { length, limit };
  }
  const actor = provider.commentActor(target, io);
  const comments = existing ? provider.comments(target, existing, io) : [];
  const managed = comments.filter(row => row.body.includes(MARKER));
  if (managed.some(row => row.actor !== actor) || managed.length > 1) throw new Error('Ambiguous managed risk comments or a different author; clarify before modification');
  const previous = managed.find(row => row.actor === actor) || null;
  const body = placement === 'comment' ? `${MARKER}\n${block}` : `${MARKER}\nInherent Risk is in the request description.`;
  return { placement, block, actor, existing: previous, body, required: placement === 'comment' || !!previous, ...(overflow ? { description_overflow: overflow } : {}) };
}
function current(proposal, published, provider, io) {
  const risk = proposal.inherent_risk;
  const rows = provider.comments(proposal.target, published, io).filter(row => row.body.includes(MARKER));
  if (rows.length > 1 || rows.some(row => row.actor !== risk.actor)) throw new Error('Ambiguous managed risk comments or a different author; no modification is authorized');
  return rows[0] || null;
}
module.exports = { MARKER, plan, current };
