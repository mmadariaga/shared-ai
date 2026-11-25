'use strict';

/**
 * Minimal closed-subset YAML reader (no dependency), shared by the worker report validator and
 * the request readers of `to-pr.js` and `to-backlog.js`.
 * Supports block mappings, block lists (scalars or mappings), flow lists and
 * maps, block scalars (| and >), quoted and plain scalars. Anything else
 * throws a clear error.
 */
function yamlError(lineNo, message) {
  return new Error(`line ${lineNo}: ${message}`);
}

function parseFlow(src, lineNo) {
  let i = 0;
  const ws = () => { while (i < src.length && /\s/.test(src[i])) i += 1; };
  const quoted = () => {
    const q = src[i];
    let out = '';
    i += 1;
    while (i < src.length) {
      const c = src[i];
      if (q === '"' && c === '\\') {
        out += c + (src[i + 1] || '');
        i += 2;
        continue;
      }
      if (c === q) {
        if (q === "'" && src[i + 1] === "'") { out += "'"; i += 2; continue; }
        i += 1;
        return q === '"' ? JSON.parse(`"${out}"`) : out;
      }
      out += c;
      i += 1;
    }
    throw yamlError(lineNo, 'unterminated quoted string');
  };
  const value = () => {
    ws();
    const c = src[i];
    if (c === '[') {
      i += 1;
      const arr = [];
      ws();
      if (src[i] === ']') { i += 1; return arr; }
      for (;;) {
        arr.push(value());
        ws();
        if (src[i] === ',') { i += 1; ws(); if (src[i] === ']') { i += 1; return arr; } continue; }
        if (src[i] === ']') { i += 1; return arr; }
        throw yamlError(lineNo, 'malformed flow list');
      }
    }
    if (c === '{') {
      i += 1;
      const obj = {};
      ws();
      if (src[i] === '}') { i += 1; return obj; }
      for (;;) {
        ws();
        let key;
        if (src[i] === '"' || src[i] === "'") key = quoted();
        else {
          const m = /^[^:,{}\[\]]+/.exec(src.slice(i));
          if (!m) throw yamlError(lineNo, 'malformed flow map key');
          key = m[0].trim();
          i += m[0].length;
        }
        ws();
        if (src[i] !== ':') throw yamlError(lineNo, 'malformed flow map: expected ":"');
        i += 1;
        obj[key] = value();
        ws();
        if (src[i] === ',') { i += 1; ws(); if (src[i] === '}') { i += 1; return obj; } continue; }
        if (src[i] === '}') { i += 1; return obj; }
        throw yamlError(lineNo, 'malformed flow map');
      }
    }
    if (c === '"' || c === "'") return quoted();
    const m = /^[^,\]}]*/.exec(src.slice(i));
    i += m[0].length;
    return plainScalar(m[0].trim());
  };
  const result = value();
  ws();
  if (i !== src.length) throw yamlError(lineNo, 'unexpected trailing text after flow value');
  return result;
}

function plainScalar(text) {
  if (text === '' || text === '~' || text === 'null') return null;
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return text;
}

function stripComment(text) {
  let q = null;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (q) {
      if (c === '\\' && q === '"') i += 1;
      else if (c === q) q = null;
    } else if ((c === '"' || c === "'") && (i === 0 || /[\s:\[{,-]/.test(text[i - 1]))) q = c;
    else if (c === '#' && (i === 0 || /\s/.test(text[i - 1]))) return text.slice(0, i).trimEnd();
  }
  return text;
}

function parseScalarText(text, lineNo) {
  const t = text.trim();
  if (t[0] === '[' || t[0] === '{' || t[0] === '"' || t[0] === "'") return parseFlow(t, lineNo);
  if (/^[&*!%@`]/.test(t)) throw yamlError(lineNo, `unsupported YAML construct: ${t[0]}`);
  return plainScalar(t);
}

function parseYaml(text) {
  const raw = text.replace(/\r\n?/g, '\n').split('\n');
  const lines = raw.map((s, idx) => ({ s, n: idx + 1 }));
  let pos = 0;

  const indentOf = (s) => s.length - s.trimStart().length;
  const isSkippable = (s) => {
    const t = s.trim();
    return t === '' || t.startsWith('#') || t === '---';
  };
  const skip = () => { while (pos < lines.length && isSkippable(lines[pos].s)) pos += 1; };

  function blockScalar(header, parentIndent) {
    const style = header[0];
    const chomp = header.includes('-') ? 'strip' : header.includes('+') ? 'keep' : 'clip';
    const body = [];
    let indent = null;
    while (pos < lines.length) {
      const { s } = lines[pos];
      if (s.trim() === '') { body.push(''); pos += 1; continue; }
      const ind = indentOf(s);
      if (ind <= parentIndent) break;
      if (indent === null) indent = ind;
      if (ind < indent) throw yamlError(lines[pos].n, 'block scalar line is less indented than its first line');
      body.push(s.slice(indent));
      pos += 1;
    }
    let trailing = 0;
    while (body.length && body[body.length - 1] === '') { body.pop(); trailing += 1; }
    let out = style === '|' ? body.join('\n') : body.join('\n').replace(/([^\n])\n(?=[^\n])/g, '$1 ');
    if (chomp === 'clip') out += body.length ? '\n' : '';
    else if (chomp === 'keep') out += '\n'.repeat(trailing + (body.length ? 1 : 0));
    return out;
  }

  function parseValueAfterKey(rest, indent, lineNo) {
    const r = stripComment(rest).trim();
    if (/^[|>][+-]?$/.test(r)) return blockScalar(r, indent);
    if (r === '') {
      skip();
      if (pos < lines.length) {
        const ind = indentOf(lines[pos].s);
        const t = lines[pos].s.trim();
        if (ind > indent || (ind === indent && t.startsWith('- '))) return parseNode(ind);
        if (ind === indent && t === '-') return parseNode(ind);
      }
      return null;
    }
    const v = parseScalarText(r, lineNo);
    return v;
  }

  function splitKey(t, lineNo) {
    let m;
    if (t[0] === '"' || t[0] === "'") {
      const q = t[0];
      let i = 1;
      while (i < t.length && t[i] !== q) i += t[i] === '\\' && q === '"' ? 2 : 1;
      m = [t.slice(0, i + 1), t.slice(i + 1)];
      if (!/^\s*:(\s|$)/.test(m[1])) throw yamlError(lineNo, 'expected "key: value"');
      return [parseFlow(m[0], lineNo), m[1].replace(/^\s*:/, '')];
    }
    m = /^([^\s:#][^:#]*?):(\s+(.*))?$/.exec(t);
    if (!m) throw yamlError(lineNo, `expected "key: value", got "${t}"`);
    return [m[1].trim(), m[2] || ''];
  }

  function parseMapping(indent) {
    const obj = {};
    for (;;) {
      skip();
      if (pos >= lines.length) return obj;
      const { s, n } = lines[pos];
      const ind = indentOf(s);
      if (ind < indent) return obj;
      if (ind > indent) throw yamlError(n, 'unexpected indentation');
      const t = s.trim();
      if (t.startsWith('- ') || t === '-') throw yamlError(n, 'list item where a mapping key was expected');
      const [key, rest] = splitKey(stripComment(t) === t ? t : t, n);
      pos += 1;
      if (Object.prototype.hasOwnProperty.call(obj, key)) throw yamlError(n, `duplicate key: ${key}`);
      obj[key] = parseValueAfterKey(rest, indent, n);
    }
  }

  function parseList(indent) {
    const arr = [];
    for (;;) {
      skip();
      if (pos >= lines.length) return arr;
      const { s, n } = lines[pos];
      const ind = indentOf(s);
      if (ind < indent) return arr;
      const t = s.trim();
      if (ind > indent) throw yamlError(n, 'unexpected indentation');
      if (!(t.startsWith('- ') || t === '-')) return arr;
      const rest = t === '-' ? '' : t.slice(2);
      if (rest.trim() === '') {
        pos += 1;
        skip();
        if (pos < lines.length && indentOf(lines[pos].s) > indent) arr.push(parseNode(indentOf(lines[pos].s)));
        else arr.push(null);
        continue;
      }
      const stripped = stripComment(rest);
      const isKey = !/^["'\[{]/.test(stripped) && /^[^\s:#][^:#]*:(\s|$)/.test(stripped)
        || /^(["'])(?:\\.|[^\\])*?\1\s*:(\s|$)/.test(stripped);
      if (isKey) {
        // Re-read the item as an inline mapping start at the content column.
        const col = ind + (s.slice(ind + 1).length - s.slice(ind + 1).trimStart().length) + 1;
        lines[pos] = { s: ' '.repeat(col) + rest, n };
        arr.push(parseMapping(col));
      } else {
        pos += 1;
        arr.push(parseScalarText(stripped, n));
      }
    }
  }

  function parseNode(indent) {
    skip();
    const t = lines[pos].s.trim();
    return t.startsWith('- ') || t === '-' ? parseList(indent) : parseMapping(indent);
  }

  skip();
  if (pos >= lines.length) throw new Error('empty payload');
  const root = parseNode(indentOf(lines[pos].s));
  skip();
  if (pos < lines.length) throw yamlError(lines[pos].n, 'unexpected content');
  return root;
}

const REQUEST_TEXT_FIELDS = ['title', 'description'];

/**
 * Read a tool request: JSON when the first non-blank character is `{` (a JSON error is
 * the error shown), the YAML subset otherwise, whose errors name their line.
 */
function readRequest(text) {
  if (typeof text !== 'string') throw new Error('request text must be a string');
  if (text.trimStart()[0] === '{') return JSON.parse(text);
  const request = parseYaml(text.replace(/^\uFEFF/, ''));
  if (request === null || typeof request !== 'object' || Array.isArray(request)) throw new Error('request must be a mapping of keys to values');
  return request;
}

/**
 * The model-written text of a request: `title` and `description`, when present, must be
 * strings, and lose their trailing line breaks, so a YAML block scalar and the same
 * text in JSON bind and publish identically.
 */
function normalizeRequestText(request) {
  if (request === null || typeof request !== 'object' || Array.isArray(request)) return request;
  for (const field of REQUEST_TEXT_FIELDS) {
    const value = request[field];
    if (value === undefined) continue;
    if (typeof value !== 'string') {
      const kind = value === null ? 'null' : Array.isArray(value) ? 'a list' : typeof value;
      throw new Error(`Invalid request: "${field}" must be a string, got ${kind}`);
    }
    request[field] = value.replace(/[\r\n]+$/, '');
  }
  return request;
}

module.exports = { parseYaml, parseFlow, yamlError, readRequest, normalizeRequestText };
