#!/usr/bin/env node

'use strict';

if (process.argv.includes('--help')) {
  console.log(`shared-ai installer

Usage: npx github:mmadariaga/shared-ai [install|setup|uninstall] [--help]

Interactive keys:
  ↑ / ↓     Move cursor
  Space      Toggle selection
  Enter      Confirm selection
  Ctrl-C / q Exit without installing`);
  process.exit(0);
}

const sub = process.argv[2];

if (sub === undefined || sub === 'install') {
  require('./install-flow').main().catch(err => { console.error(err); process.exit(1); });
} else if (sub === 'setup') {
  require('./setup').main().catch(err => { console.error(err); process.exit(1); });
} else if (sub === 'uninstall') {
  require('./uninstall-flow').main().then(code => process.exit(code)).catch(err => { console.error(err); process.exit(1); });
} else {
  process.stderr.write(`Unknown subcommand: ${sub}. Usage: npx shared-ai [install|setup|uninstall]\n`);
  process.exit(1);
}
