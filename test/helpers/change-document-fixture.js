'use strict';

// A dispatchable change document for the tests of the backlog tools and the contract tests.
// `dependencies` is the `Depends on:` value, `origin` an optional `Backlog origin:` URL, `explore` an optional `Explore origin:` value.
function document(name, { dependencies = 'None', origin = null, explore = null, title = `Ship ${name}`, notes = 'agreed full content α' } = {}) {
  const change = [`Change name: ${name}`, `Depends on: ${dependencies}`];
  if (origin) change.push(`Backlog origin: ${origin}`);
  if (explore) change.push(`Explore origin: ${explore}`);
  return [
    `# ${title}`,
    '',
    '## Problem',
    `The ${name} behavior is missing.`,
    '',
    '## Goal',
    `Provide the ${name} behavior.`,
    '',
    '## Scope',
    `- The ${name} behavior works.`,
    '',
    '## Non-goals',
    'None.',
    '',
    '## Edge cases',
    '- E1: An empty input changes nothing.',
    '',
    '## Implementation notes',
    `- I1: ${notes}`,
    '',
    '## Open questions',
    'None.',
    '',
    '## Maturity',
    'Ready to propose',
    '',
    '## Change',
    ...change.map(line => `- ${line}`),
    '',
  ].join('\n');
}

module.exports = { document };
