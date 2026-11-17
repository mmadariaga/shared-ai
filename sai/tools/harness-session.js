'use strict';

/**
 * harness-session — the one reader of a subagent's own harness session.
 *
 * `skills/sai-cache-warmer/wait.js` (subagent `begin`) and `transfer.js` (`put`, `live`) tell a revived worker from a live
 * one by the handle its coordinator captured when it created the worker: the `sessionID` on opencode
 * (`OPENCODE_SESSION_ID`), the agent ID on Claude Code (`CLAUDE_CODE_AGENT_ID`). Both variables are read from the
 * environment of the shell the agent runs in. A harness that does not expose its own handle there leaves the session
 * unreadable (`null`), and every caller then keeps its behavior from before the check existed.
 */

const VARIABLES = { claude: 'CLAUDE_CODE_AGENT_ID', opencode: 'OPENCODE_SESSION_ID' };
const SESSION = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

/** The agent's own harness session, or `null` when the harness or the environment does not give a usable one. */
function agentSession(harness, env = process.env) {
  const name = VARIABLES[harness];
  const value = name === undefined ? undefined : env[name];
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return SESSION.test(trimmed) ? trimmed : null;
}

module.exports = { VARIABLES, SESSION, agentSession };
