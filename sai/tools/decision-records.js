#!/usr/bin/env node

'use strict';

/**
 * decision-records — deterministic inventory of one decision-record family.
 *
 * Whether a family's index exists, which records exist, and which number the
 * next record takes are facts of the folder. They are read here with `fs`, so
 * the answer is the same on every harness and for a folder ignored in git,
 * where a file-name search can come back empty.
 *
 * A record is a file named `NNNN-slug.md` or letter-suffixed `NNNNx-slug.md`
 * directly under `docs/<family>/` or `docs/<family>/archive/`. Every other
 * entry is ignored, `0000-INDEX.md` included. A suffixed record counts under
 * its number, and archived records count toward the next number, so a retired
 * number is never reused.
 *
 * The tool reports; it renames and repairs nothing.
 *
 * Sub-commands:
 *   inventory                  Report the family's index existence, records,
 *                              next number, and duplicates.
 *
 * Usage:
 *   node sai/tools/decision-records.js inventory --family <adr|ddr> [--json] [--cwd <dir>]
 *
 * Output (always one JSON object; `--json` is accepted and changes nothing):
 *   family        `adr` or `ddr`.
 *   index_exists  whether `docs/<family>/0000-INDEX.md` is a file.
 *   records       `{ number, suffix, path, archived }` per record, ordered by
 *                 number, suffix, then path. `path` is root-relative with `/`.
 *   next_number   the highest record number plus one, zero-padded to four
 *                 digits; `0001` when the family has no record.
 *   duplicates    `{ number, suffix, paths }` per number-and-suffix pair held
 *                 by more than one file.
 *
 * Exit codes: 0 = inventory reported; 2 = usage error or IO failure.
 */

const fs = require('fs');
const path = require('path');

const FAMILIES = ['adr', 'ddr'];
const INDEX_FILE = '0000-INDEX.md';
const ARCHIVE_DIR = 'archive';
const RECORD_FILE = /^(\d{4})([a-z]*)-.+\.md$/;

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function usage() {
  return 'Usage: node sai/tools/decision-records.js inventory --family <adr|ddr> [--json] [--cwd <dir>]';
}

/** Files directly inside `dir`; a missing directory holds none. */
function fileNames(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
      return [];
    }
    throw err;
  }
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
}

function recordsIn(dir, relativeDir, archived) {
  const records = [];
  for (const name of fileNames(dir)) {
    const match = RECORD_FILE.exec(name);
    if (match && name !== INDEX_FILE) {
      records.push({ number: match[1], suffix: match[2], path: `${relativeDir}/${name}`, archived });
    }
  }
  return records;
}

function findDuplicates(records) {
  const byKey = new Map();
  for (const record of records) {
    const key = `${record.number}${record.suffix}`;
    if (!byKey.has(key)) {
      byKey.set(key, { number: record.number, suffix: record.suffix, paths: [] });
    }
    byKey.get(key).paths.push(record.path);
  }
  return [...byKey.values()].filter((group) => group.paths.length > 1);
}

function inventory(cwd, family) {
  const relativeDir = `docs/${family}`;
  const familyDir = path.join(cwd, 'docs', family);
  const records = [
    ...recordsIn(familyDir, relativeDir, false),
    ...recordsIn(path.join(familyDir, ARCHIVE_DIR), `${relativeDir}/${ARCHIVE_DIR}`, true),
  ].sort((a, b) => compare(a.number, b.number) || compare(a.suffix, b.suffix) || compare(a.path, b.path));
  const highest = records.reduce((max, record) => Math.max(max, Number(record.number)), 0);

  return {
    family,
    index_exists: fileNames(familyDir).includes(INDEX_FILE),
    records,
    next_number: String(highest + 1).padStart(4, '0'),
    duplicates: findDuplicates(records),
  };
}

function parseArgs(argv) {
  const opts = { command: null, family: null, cwd: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--json') {
      // Accepted for a uniform invocation; the output is always JSON.
    } else if (arg === '--family' || arg === '--cwd') {
      const value = argv[++i];
      if (value === undefined) {
        return { error: `${arg} requires a value` };
      }
      opts[arg.slice(2)] = value;
    } else if (arg.startsWith('-')) {
      return { error: `unknown flag: ${arg}` };
    } else if (opts.command === null) {
      opts.command = arg;
    } else {
      return { error: `unexpected argument: ${arg}` };
    }
  }
  return { opts };
}

function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.error) {
    process.stderr.write(`${parsed.error}\n${usage()}\n`);
    return 2;
  }
  const { opts } = parsed;
  if (opts.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  if (opts.command !== 'inventory') {
    process.stderr.write(`sub-command "inventory" required.\n${usage()}\n`);
    return 2;
  }
  if (!FAMILIES.includes(opts.family)) {
    process.stderr.write(`inventory requires --family adr or --family ddr\n${usage()}\n`);
    return 2;
  }
  const cwd = opts.cwd ? path.resolve(opts.cwd) : process.cwd();
  if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
    process.stderr.write(`working directory not found: ${cwd}\n`);
    return 2;
  }

  try {
    process.stdout.write(`${JSON.stringify(inventory(cwd, opts.family), null, 2)}\n`);
    return 0;
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    return 2;
  }
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { main, inventory, usage };
