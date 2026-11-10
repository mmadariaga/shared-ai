'use strict';

/**
 * The `received_at` clock: the single source of the CLI reception timestamp that
 * opens every JSON response of `bin/sai-state.js` and `worker-report-validator.js`.
 * It lives in its own module so `sai-state` stamps every response without loading
 * the worker-report validator.
 */

/**
 * Received-at wire form: YYYY-MM-DDTHH:MM:SS±HH:MM
 * Local wall-clock time with numeric offset (never Z). This pattern describes
 * the response-envelope `received_at` only; it is never a payload field.
 */
const RECEIVED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Generate the CLI reception timestamp (`received_at`), the single clock of both CLIs.
 * Local wall-clock time with its numeric UTC offset, colon-separated, never Z.
 * Reception time substitutes emission time; the small transport delta is
 * accepted as a duration proxy. Time is observation, not claim.
 */
function generateReceivedAt(now = new Date()) {
  const year = now.getFullYear();
  const month = pad2(now.getMonth() + 1);
  const day = pad2(now.getDate());
  const hours = pad2(now.getHours());
  const minutes = pad2(now.getMinutes());
  const seconds = pad2(now.getSeconds());
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const offHours = pad2(Math.floor(abs / 60));
  const offMinutes = pad2(abs % 60);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offHours}:${offMinutes}`;
}

module.exports = { generateReceivedAt, RECEIVED_AT_PATTERN };
