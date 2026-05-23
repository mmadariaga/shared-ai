#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const CLAUDE_BASE = path.join(os.homedir(), '.claude');
const OPENCODE_BASE = path.join(os.homedir(), '.config', 'opencode');

if (process.argv.includes('--help')) {
  console.log(`shared-ai installer

Usage: npx github:mmadariaga/shared-ai [--help]

Interactive keys:
  ↑ / ↓     Move cursor
  Space      Toggle selection
  Enter      Confirm selection
  Ctrl-C / q Exit without installing`);
  process.exit(0);
}
