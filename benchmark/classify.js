'use strict';

const { ROUTES } = require('./corpus');

const OUTCOMES = Object.freeze(['accepted', 'rejected', 'escalated', 'timeout', 'error']);

function parseEvents(output) {
  const events = [];
  for (const line of String(output || '').split(/\r?\n/)) {
    const text = line.trim();
    if (!text.startsWith('{')) continue;
    try {
      events.push(JSON.parse(text));
    } catch {
      // A line that is not JSON is harness noise, never an event.
    }
  }
  return events;
}

function claudeText(event) {
  const content = event.message && Array.isArray(event.message.content) ? event.message.content : [];
  return content.filter((block) => block && block.type === 'text').map((block) => block.text).join('\n');
}

/** Claude Code stream-json: the final text is the `result` event, else the last assistant text. */
function summarizeClaude(events) {
  let finalText = '';
  let error = null;
  for (const event of events) {
    if (event.type === 'assistant') {
      const text = claudeText(event);
      if (text !== '') finalText = text;
    } else if (event.type === 'result') {
      if (typeof event.result === 'string' && event.result !== '') finalText = event.result;
      if (event.is_error === true) error = typeof event.result === 'string' && event.result !== '' ? event.result : `result ${event.subtype || 'error'}`;
    }
  }
  return { finalText, cancelledQuestions: 0, error };
}

/** opencode run --format json: the final text is the last `text` event; a cancelled question is a `question` tool_use that ended in error. */
function summarizeOpencode(events) {
  let finalText = '';
  let cancelledQuestions = 0;
  let error = null;
  for (const event of events) {
    const part = event.part || {};
    if (event.type === 'text' && typeof part.text === 'string' && part.text !== '') {
      finalText = part.text;
    } else if (event.type === 'tool_use' && part.tool === 'question' && part.state && part.state.status === 'error') {
      cancelledQuestions += 1;
    } else if (event.type === 'error') {
      const detail = event.error && (event.error.data && event.error.data.message || event.error.message || event.error.name);
      error = detail || 'opencode reported an error event';
    }
  }
  return { finalText, cancelledQuestions, error };
}

function summarizeOutput(harness, output) {
  const events = parseEvents(output);
  if (events.length === 0) return { finalText: '', cancelledQuestions: 0, error: 'the harness produced no event output' };
  return harness === 'claude' ? summarizeClaude(events) : summarizeOpencode(events);
}

function hasClosingLiteral(text, literal) {
  return text.split(/\r?\n/).some((line) => line.trim() === literal);
}

/**
 * Classify one finished run from what the backend observed. Order matters:
 * infrastructure causes first, then the time limit, then the closing literal,
 * then the hidden suite.
 *
 * raw: { infraError?, timedOut?, output?, suite?: { passed, total } | { error } }
 */
function classifyRun(raw, { harness, route }) {
  if (raw.infraError) return { outcome: 'error', detail: raw.infraError, cancelledQuestions: 0, suite: null };
  if (raw.timedOut) return { outcome: 'timeout', detail: 'the run exceeded its time limit and was stopped', cancelledQuestions: 0, suite: null };

  const summary = summarizeOutput(harness, raw.output);
  const { cancelledQuestions } = summary;
  if (summary.error) return { outcome: 'error', detail: `harness error: ${summary.error}`, cancelledQuestions, suite: null };

  const suite = raw.suite && Number.isInteger(raw.suite.total) && Number.isInteger(raw.suite.passed) ? { passed: raw.suite.passed, total: raw.suite.total } : null;
  if (!suite) {
    const reason = raw.suite && raw.suite.error ? raw.suite.error : 'no suite result';
    return { outcome: 'error', detail: `the hidden suite could not run: ${reason}`, cancelledQuestions, suite: null };
  }
  const suiteText = `hidden suite ${suite.passed}/${suite.total}`;
  if (!hasClosingLiteral(summary.finalText, ROUTES[route].closingLiteral)) {
    return { outcome: 'escalated', detail: `no closing literal "${ROUTES[route].closingLiteral}"; ${suiteText}`, cancelledQuestions, suite };
  }
  if (suite.total > 0 && suite.passed === suite.total) return { outcome: 'accepted', detail: suiteText, cancelledQuestions, suite };
  return { outcome: 'rejected', detail: suiteText, cancelledQuestions, suite };
}

module.exports = { OUTCOMES, parseEvents, summarizeOutput, hasClosingLiteral, classifyRun };
