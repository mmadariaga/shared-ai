'use strict';

// Simulated benchmark backend: reproduces the outputs observed in the proof of concept,
// so the benchmark tests run without Docker or models.
//   Claude Code (headless): no AskUserQuestion; the model asks in text and the run ends with exit 0.
//   opencode (headless): `question` is cancelled with an error; the run still ends with exit 0.

const lines = (events) => `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;

function claudeOutput(finalText) {
  return lines([
    { type: 'system', subtype: 'init' },
    { type: 'assistant', message: { content: [{ type: 'text', text: finalText }] } },
    { type: 'result', subtype: 'success', is_error: false, result: finalText },
  ]);
}

function opencodeOutput(finalText, { cancelledQuestions = 0 } = {}) {
  const questions = Array.from({ length: cancelledQuestions }, () => ({
    type: 'tool_use',
    part: { type: 'tool', tool: 'question', state: { status: 'error', error: 'The user dismissed this question' } },
  }));
  return lines([
    { type: 'step_start', part: { type: 'step-start' } },
    ...questions,
    { type: 'tool_use', part: { type: 'tool', tool: 'bash', state: { status: 'completed' } } },
    { type: 'text', part: { type: 'text', text: finalText } },
    { type: 'step_finish', part: { type: 'step-finish' } },
  ]);
}

const outputFor = (harness, finalText, options) => (harness === 'claude' ? claudeOutput(finalText) : opencodeOutput(finalText, options));

/** `script(run)` returns the raw observation of one run; the default accepts every run. */
class SimulatedBackend {
  constructor(script) {
    this.calls = [];
    this.script = script || ((run) => ({
      output: outputFor(run.configuration.harness, 'All steps done.\nImplement done.'),
      wallMs: 1000,
      suite: { passed: 3, total: 3 },
    }));
  }

  async run(run) {
    this.calls.push(run);
    return this.script(run);
  }
}

module.exports = { claudeOutput, opencodeOutput, outputFor, SimulatedBackend };
