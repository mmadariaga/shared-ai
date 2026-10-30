'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { projectSource, translate } = require('../../bin/capabilities');
const registry = require('../../sai/install-manifest.json').capabilities;
const root = path.join(__dirname, '..', '..');

function readProjected(relative, installRoot) {
  const text = fs.readFileSync(path.join(root, relative), 'utf8');
  const match = /^(agents|commands)\/(claude|opencode)\/([^/]+)\.md$/.exec(relative);
  return match && match[3] !== 'worker-template' ? projectSource(text, registry, match[1], match[3], match[2], installRoot) : text;
}

function commandTools(name, installRoot) {
  return translate(registry, registry.assignments.commands[name], 'claude', installRoot).allowedTools;
}

module.exports = { readProjected, commandTools };
