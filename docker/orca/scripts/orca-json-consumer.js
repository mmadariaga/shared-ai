#!/usr/bin/env node
'use strict';

// Dedicated JSON consumer for the Orca headless runtime.
// Reads newline-delimited JSON records from stdin. For each accepted
// `type: orca_server_ready` record with a supported `schemaVersion`:
//   - writes /run/orca/readiness.json with the nested `pairing` object
//     stripped (atomic: temp file + rename) — readiness never carries
//     pairing secrets;
//   - derives /run/orca/pairing.json from the same record's nested
//     `pairing` object, owner-only (0600).
// Sanitized status lines are relayed to stdout; pairing secrets never are.
// Malformed JSON, an unsupported schemaVersion, or missing required fields
// exit non-zero with a clear stderr message and never claim readiness.
// Unknown additional fields are ignored (forward compatibility).
// Clean capture followed by EOF exits 0; EOF without an accepted record
// exits non-zero (fail closed). SIGTERM/SIGINT during shutdown exit 0.

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Pinned against the committed Orca release (v1.4.177); recorded in README.
const SUPPORTED_SCHEMA_VERSION = 1;

// Test-only seam: production never sets ORCA_RUN_DIR (default /run/orca); the
// consumer refuses a non-default value unless ORCA_TEST_MODE=1.
const RUN_DIR = process.env.ORCA_RUN_DIR || '/run/orca';
if (process.env.ORCA_RUN_DIR && process.env.ORCA_RUN_DIR !== '/run/orca' && process.env.ORCA_TEST_MODE !== '1') {
  process.stderr.write('orca-json-consumer: ORCA_RUN_DIR may only be overridden under ORCA_TEST_MODE=1\n');
  process.exit(1);
}
const READINESS_FILE = path.join(RUN_DIR, 'readiness.json');
const PAIRING_FILE = path.join(RUN_DIR, 'pairing.json');

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

let claimed = false;

function fail(message) {
  process.stderr.write(`orca-json-consumer: ${message}\n`);
  process.exit(1);
}

function atomicWrite(file, data, mode) {
  const tmp = `${file}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, data, { mode: mode || 0o644 });
  fs.renameSync(tmp, file);
}

function sanitizedStatus(record) {
  const pairing = record.pairing && typeof record.pairing === 'object' ? record.pairing : {};
  if (pairing.available === true) {
    return 'orca_server_ready: pairing available';
  }
  const reason = typeof pairing.reason === 'string' ? pairing.reason : 'pairing_unavailable';
  const guidance = typeof pairing.guidance === 'string' ? pairing.guidance : 'See the container logs for non-secret guidance.';
  return `orca_server_ready: pairing unavailable (${reason}) — ${guidance}`;
}

function handleReadyRecord(record) {
  if (typeof record.schemaVersion !== 'number' || record.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    fail(`unsupported schemaVersion ${JSON.stringify(record.schemaVersion)} (supported: ${SUPPORTED_SCHEMA_VERSION})`);
  }
  if (typeof record.type !== 'string' || record.type !== 'orca_server_ready') {
    fail(`record type is not orca_server_ready: ${JSON.stringify(record.type)}`);
  }
  if (!record.pairing || typeof record.pairing !== 'object') {
    fail('record is missing the required nested pairing object');
  }

  // Readiness: the full record with the nested pairing object stripped.
  const readiness = Object.assign({}, record);
  delete readiness.pairing;
  atomicWrite(READINESS_FILE, JSON.stringify(readiness) + '\n', 0o644);

  // Pairing: derived from the same record's nested pairing object.
  const pairing = record.pairing;
  if (pairing.available === true) {
    atomicWrite(PAIRING_FILE, JSON.stringify(pairing) + '\n', 0o600);
  } else {
    // Absent or sanitized unavailable status; the non-secret reason and
    // guidance are relayed to logs, never stored alongside secrets.
    try { fs.unlinkSync(PAIRING_FILE); } catch (e) { /* absent is fine */ }
  }

  claimed = true;
  process.stdout.write(`${sanitizedStatus(record)}\n`);
}

rl.on('line', (line) => {
  if (line.trim() === '') return;
  let record;
  try {
    record = JSON.parse(line);
  } catch (e) {
    fail(`malformed JSON record: ${e.message}`);
  }
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    fail('record is not a JSON object');
  }
  if (record.type === 'orca_server_ready') {
    handleReadyRecord(record);
  } else {
    // Unknown record type: forward-compatible — relay sanitized status only.
    process.stdout.write(`orca-json-consumer: ignoring record of type ${JSON.stringify(record.type)}\n`);
  }
});

rl.on('close', () => {
  if (!claimed) {
    fail('EOF reached without an accepted orca_server_ready record');
  }
  process.exit(0);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
