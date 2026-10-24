'use strict';

const { setTimeout: delay } = require('node:timers/promises');

function intervalMilliseconds(value) {
  const match = /^(\d+(?:\.\d+)?)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?)?$/i.exec(String(value ?? '').trim());
  if (!match) return null;
  const unit = (match[2] || 'm').toLowerCase()[0];
  const ms = Number(match[1]) * ({ s: 1000, m: 60000, h: 3600000 }[unit]);
  return ms >= 1 && Number.isSafeInteger(Math.round(ms)) ? Math.round(ms) : null;
}

function splitArguments(text = '') {
  text = String(text ?? '');
  const match = /^(.*?)\s*((?:\d{4}-\d{2}-\d{2}\s+)?\d{1,2}:\d{2}|now\s*\+\s*\d+(?:\.\d+)?\s*h)\s*$/i.exec(text.trim());
  if (match) return { interval: match[1].trim(), target: match[2] };
  const partial = /^(\d+(?:\.\d+)?\s*(?:seconds?|sec|s|minutes?|min|m|hours?|hr|h)?)\s+(.+)$/i.exec(text.trim());
  return partial ? { interval: partial[1], target: partial[2] } : { interval: text.trim(), target: '' };
}

const pad = value => String(value).padStart(2, '0');
const localDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const localTime = date => {
  const minutes = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (!date.getSeconds() && !date.getMilliseconds()) return minutes;
  const seconds = `${minutes}:${pad(date.getSeconds())}`;
  return date.getMilliseconds() ? `${seconds}.${String(date.getMilliseconds()).padStart(3, '0')}` : seconds;
};

function resolveTarget(value, date, now) {
  const relative = /^now\s*\+\s*(\d+(?:\.\d+)?)\s*h$/i.exec(value);
  if (relative) {
    const target = new Date(now.getTime() + Number(relative[1]) * 3600000);
    if (!Number.isFinite(target.getTime())) return null;
    if (date) {
      const dated = resolveTarget(`${pad(target.getHours())}:${pad(target.getMinutes())}`, date, now);
      if (!dated) return null;
      dated.target.setSeconds(target.getSeconds(), target.getMilliseconds());
      return dated;
    }
    return { target, explicit: false };
  }
  const match = /^(?:(\d{4}-\d{2}-\d{2})\s+)?(\d{1,2}):(\d{2})$/.exec(value);
  if (!match || +match[2] > 23 || +match[3] > 59) return null;
  const day = date || match[1] || localDate(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [year, month, dayOfMonth] = day.split('-').map(Number);
  const target = new Date(0);
  target.setFullYear(year, month - 1, dayOfMonth);
  target.setHours(+match[2], +match[3], 0, 0);
  if (localDate(target) !== day || target.getHours() !== +match[2] || target.getMinutes() !== +match[3]) return null;
  const explicit = Boolean(date || match[1]);
  if (!explicit && target.getTime() + 60000 <= now.getTime()) target.setDate(target.getDate() + 1);
  return { target, explicit };
}

function prepare(input, now = new Date()) {
  const supplied = splitArguments(input.arguments);
  const values = { interval: input.interval ?? supplied.interval, target: input.target ?? supplied.target };
  if (input.date !== undefined) values.date = input.date;
  const interval = intervalMilliseconds(values.interval);
  const targetValue = String(values.target).trim();
  const saved = input.resolved_target;
  const savedDate = new Date(saved?.instant_ms);
  const reusable = saved?.value === targetValue && Number.isSafeInteger(saved.instant_ms) &&
    Number.isFinite(savedDate.getTime()) && typeof saved.requires_confirmation === 'boolean' &&
    (input.date === undefined || input.date === localDate(savedDate));
  const resolved = reusable ? { target: savedDate, explicit: !saved.requires_confirmation || input.date !== undefined }
    : resolveTarget(targetValue, input.date, now);
  const requiresConfirmation = resolved && (reusable
    ? saved.requires_confirmation && input.date === undefined
    : !resolved.explicit && localDate(resolved.target) !== localDate(now));
  if (resolved) values.resolved_target = {
    value: targetValue, instant_ms: resolved.target.getTime(), requires_confirmation: Boolean(requiresConfirmation),
  };
  const fields = [];
  const reasons = {};
  if (interval === null) { fields.push('interval'); reasons.interval = 'Enter a positive interval in seconds, minutes or hours.'; }
  if (!resolved) { fields.push('target'); reasons.target = 'Enter a valid local HH:mm, YYYY-MM-DD HH:mm, or now + Nh target.'; }
  if (fields.length) {
    if (!resolved) delete values.date;
    return { status: 'needs_input', fields, reasons, values };
  }
  const { target } = resolved;
  if (requiresConfirmation) {
    return { status: 'confirm_date', values,
      proposed_date: localDate(target), target_local: `${localDate(target)} ${localTime(target)}` };
  }
  const closing = target.getTime() + 60000;
  if (!Number.isSafeInteger(closing) || !Number.isFinite(new Date(closing).getTime())) throw new Error('Closing time is outside the supported date range.');
  return { status: 'ready', state: { interval_ms: interval, closing_ms: closing },
    closing_local: `${localDate(new Date(closing))} ${localTime(new Date(closing))}` };
}

async function sleep(ms) {
  // Node timers overflow above 2^31-1 ms; chunk only this single logical wait.
  const end = Date.now() + ms;
  let remaining = ms;
  while (remaining > 0) {
    await delay(Math.min(remaining, 2147483647));
    remaining = end - Date.now();
  }
}

async function waitOnce(state, { now = Date.now, wait = sleep } = {}) {
  if (!Number.isSafeInteger(state.interval_ms) || state.interval_ms <= 0 ||
      !Number.isSafeInteger(state.closing_ms) || !Number.isFinite(new Date(state.closing_ms).getTime())) {
    throw new Error('Invalid fixed wait state.');
  }
  const remaining = state.closing_ms - now();
  const waited_ms = Math.max(0, Math.min(state.interval_ms, remaining));
  if (waited_ms > 0) await wait(waited_ms);
  return { status: now() >= state.closing_ms ? 'finished' : 'continue', waited_ms };
}

if (require.main === module) {
  (async () => {
    let text = '';
    for await (const chunk of process.stdin) text += chunk;
    const input = JSON.parse(text);
    const command = process.argv[2];
    if (!['prepare', 'wait'].includes(command)) throw new Error('Use prepare or wait with JSON on stdin.');
    console.log(JSON.stringify(command === 'prepare' ? prepare(input) : await waitOnce(input)));
  })().catch(error => {
    console.error(JSON.stringify({ status: 'failed', message: error.message }));
    process.exitCode = 1;
  });
}

module.exports = { intervalMilliseconds, splitArguments, prepare, waitOnce };
