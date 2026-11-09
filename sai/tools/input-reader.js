'use strict';

/**
 * input-reader — one shared reader for the structured input of SAI tools.
 *
 * An agent hands structured input to a tool as an input file: a file it wrote
 * with its native write tool inside a SAI temp directory, passed as
 * `--input-file <path>`. Standard input (`-`) stays accepted so instructions
 * installed before the input file existed keep working.
 *
 * `--input-file` wins over stdin. The file is read as UTF-8 bytes, unchanged.
 * A missing, unreadable, or empty input file is an `InputFileError` whose
 * message names the path; callers report it as a usage error and change no
 * state.
 */

const fs = require('node:fs');

const FLAG = '--input-file';

/** A missing, unreadable, empty, or malformed input file argument. */
class InputFileError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InputFileError';
  }
}

/**
 * Split `--input-file <path>` (or `--input-file=<path>`) out of an argument
 * list. Returns the remaining arguments in order and the path, or null when the
 * flag is absent. A separate value that starts with `--` is a usage error (the
 * flag was given no path); `--input-file=<path>` accepts any path.
 */
function extractInputFile(argv) {
  const rest = [];
  let inputFile = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    let value;
    if (arg === FLAG) {
      // A value that starts with `--` is the next option, never a path: the `=` form names such a path.
      if (i + 1 < argv.length && argv[i + 1].startsWith('--')) throw new InputFileError(`${FLAG} requires a path, not the option ${argv[i + 1]}; use ${FLAG}=<path> for a path that starts with --`);
      value = i + 1 < argv.length ? argv[i + 1] : '';
      i += 1;
    } else if (arg.startsWith(`${FLAG}=`)) {
      value = arg.slice(FLAG.length + 1);
    } else {
      rest.push(arg);
      continue;
    }
    if (typeof value !== 'string' || value === '') throw new InputFileError(`${FLAG} requires a path`);
    if (inputFile !== null) throw new InputFileError(`${FLAG} given more than once`);
    inputFile = value;
  }
  return { argv: rest, inputFile };
}

/** Read the input file's raw bytes; fail naming the path. */
function readInputBytes(file, { io = fs } = {}) {
  if (typeof file !== 'string' || file === '') throw new InputFileError(`${FLAG} requires a path`);
  let bytes;
  try {
    bytes = io.readFileSync(file);
  } catch (error) {
    throw new InputFileError(`${FLAG} ${file}: cannot read input file (${error.code || error.message})`);
  }
  if (bytes.length === 0) throw new InputFileError(`${FLAG} ${file}: input file is empty`);
  return bytes;
}

/** Read the input file's bytes as UTF-8 text; fail naming the path. */
function readInputFile(file, options = {}) {
  return readInputBytes(file, options).toString('utf8');
}

/** Read the whole of stdin synchronously. A closed or empty pipe yields ''. */
function readStdinSync({ io = fs } = {}) {
  const chunks = [];
  const buf = Buffer.alloc(65536);
  for (;;) {
    let n = 0;
    try {
      n = io.readSync(0, buf, 0, buf.length, null);
    } catch (err) {
      if (err && err.code === 'EAGAIN') continue;
      if (err && err.code === 'EOF') break;
      throw err;
    }
    if (n === 0) break;
    chunks.push(Buffer.from(buf.subarray(0, n)));
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** The input text: the input file when given, otherwise stdin. */
function readInput(inputFile, options = {}) {
  return inputFile ? readInputFile(inputFile, options) : readStdinSync(options);
}

module.exports = { FLAG, InputFileError, extractInputFile, readInputBytes, readInputFile, readStdinSync, readInput };
