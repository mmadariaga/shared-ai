# ADR 0208: Fetch resolves several subpaths in path mode

<!-- adr-index: amends 0203 -->

## Status

Accepted. Amends ADR 0203: its rejected alternative "A path-only resolver" is partly reversed for calls with two or more subpaths. ADR 0203 and archived changes stay unedited.

## Context

ADR 0203 made `Fetch @<subpath>` resolution a deterministic tool, `skills/universal/fetch/fetch.js`, that takes one subpath and prints a header and the file content. It rejected a path-only resolver because that form adds a tool call per fetch.

The fetch skills told the agent to call the tool "once per directive" and to recurse "one call at a time". Agents followed that wording literally and loaded one file per turn. The `/sai-explore` load in the exploring session took about 19 turns for 19 files (about 128 KB, through `fetch.js`), plus 8 skills through the Skill tool, across about 4 levels of nested directives. An improvised shell loop that concatenated the content overflowed the shell output limit twice and left three policies unread.

The latency of a load is the number of model turns. The depth of the nested directives bounds it from below, not the number of files.

## Decision

1. **One subpath keeps today's output.** `fetch.js` prints the header (`path:`, `root:`), one blank line, and the unchanged content, or the `too-large` line when the file exceeds the output cap. A failing subpath prints its error on stderr and exits 1.
2. **Two or more subpaths run in path mode.** The tool prints one block per subpath argument, in argument order, on stdout, and never prints file content. A resolved subpath prints a resolution block (`subpath:`, `path:`, `root:`). A subpath that is out of scope, names a skill, or is found in no root prints an error block (`subpath:`, `error:`), and the other subpaths still resolve. One blank line separates the blocks. A repeated subpath prints one block per occurrence. The exit code is 0 when every subpath resolved, 1 when at least one error block was printed, and 2 on a usage error.
3. **The scope check covers the whole batch first.** Every subpath passes the scope check before any filesystem access. On opencode, `opencode debug paths` runs at most once per call, whatever the number of subpaths that reach it.
4. **Both fetch skills batch and read in parallel.** The Claude Code and opencode fetch skills collect the unconditional directives known at that moment that have no loaded copy, send the subpaths in one call, load the `Fetch @skills/<name>/SKILL.md` directives with the skill tool in the same turn, and then read every returned `path` in parallel in a single turn (`Read` on Claude Code, `read` on opencode). A conditional directive joins a batch only once its condition holds. The directives found in the files of one batch form the next batch. A full read of a returned `path` counts as a loaded copy. An error block stops only that subpath's directive. A failed read of a returned `path` stops that directive, and the agent never composes or guesses another path.
5. **The surrounding rules are unchanged.** The tool still returns directives inside content as text and never follows them. The capability profiles, permission rules, and install manifest stay as they are, because the generated rule `node "<root>/fetch.js" *` already covers extra arguments. `sai/policies/explore-agent.md` § Shell restriction admits the multi-subpath form.

## Alternatives Considered

- **A cumulative output cap that serves whole files until a budget is reached and returns the remaining ones as paths** — rejected: a mixed answer adds complexity and invites the agent to skip a file it should load.
- **Keep one subpath per call and only ask for parallel calls in the skill text** — rejected: a multi-subpath call makes batching structural instead of depending on the agent's parallel-call habit.
- **A recursive preload that follows the directives inside the returned content** — rejected: conditional directives ("When ...", "Before ...") must load only when their condition holds.

## Consequences

- A batch costs one resolution call plus one read per file. The gain depends on the agent reading the returned paths in parallel: an agent that reads them one per turn is slower than before. For the measured load the expected turns fall from about 19 to about 8 to 9 with parallel reads, and rise to about 23 with one read per turn.
- Two or more subpaths never return content, so the agent never has to tell which files arrived with content and which did not. That confusion left three policies unread in the exploring session.
- Path mode relies on reading files outside the project (the global harness root), which may ask for a read permission on Claude Code, as the `too-large` case already does.
- The single-directive case stays at one call, which was the reason ADR 0203 rejected a path-only resolver.
- Published specs under `openspec/specs/` that state the one-subpath tool stay unedited until backfill and archive sync them.

## Provenance

Change `fetch-multi-path-resolution`, decision "Two or more subpaths always return resolution blocks only, never content".
