# ADR 0250: Install the expert review worker from a self-contained prompt

## Status

Accepted.

## Context

The adversarial expert review worker started from a chain of SAI instruction files: its worker card, `worker-common.md`, `worker-report-transport.md` (36 KB), `worker-lifecycle.md` (15 KB), `issue-format.md` (22 KB), and several policies. The chain costs roughly 100–120 KB of context, about 25–30k tokens, before the worker sees the product, and the review needs only the communication protocol: the ready handshake, the report file and hash, and the findings shape. The cost was paid on every review in explore, plan, build, and Direct Build.

## Decision

`sai-adversarial-expert-review-worker` is installed from a self-contained prompt with no `Fetch @` directive, and it reads no SAI policy or command file at review time. Its contract `sai/commands/adversarial-expert-review/worker.md` carries the role, the `event: ready` handshake, the report protocol, the closed `findings` and `corrected_documents` schema with the `High`/`Medium`/`Low` criteria and the scope-observation rule, the write boundaries, and the liveness guard (`transfer.js live` before the first write after a shell command and before saving a report). It declares no warming chain: it arms no wait, ignores a `Warming:` line, and returns no `warming:` line; the shared standalone binding still ends task messages with the switch, and the report transport tolerates the missing diagnostic.

The matrix entry declares `selfContained: true` and a ready-only `dispatchPrompt`. The installer inlines `workerContract` between the rendered frontmatter and the user-customizations marker, refuses an empty contract or one that still fetches an SAI file, and renders the create prompt from the entry's `dispatchPrompt` instead of the canonical contract fetch. Every other matrix entry renders exactly as before: the other fourteen managed agents keep their canonical `Fetch @` chain, and every binding keeps the canonical create prompt byte for byte. `bin/install-flow.js` reads the per-entry `dispatchPrompt` when it validates installed bindings.

The review procedure lives in `sai/commands/adversarial-expert-review/brief.md`, which the coordinator sends as message text after the `--report-dir` line: the mode, the product (document files with their hashes, or the working-tree paths), the approved scope, the allowed write paths, the `transfer.js` path, the `change-document.js` path and the optional verdicts file in document mode, the report name, the scratch folder, the chat language, and the procedure of the mode. The report schema stays `--command adversarial-expert-review`, and the coordinator still validates every reference with `transfer.js receive` and decides keep-or-revert.

## Alternatives Considered

- **Keep the fetch chain and trim individual policies.** Rejected: the worker would still import SAI files, and the chain would grow again.
- **Put the whole procedure in the worker prompt.** Rejected: the document and mutations procedures would live in one large prompt and duplicate the coordinator's contract.
- **Put everything in the caller's brief.** Rejected: the protocol would drift across four callers.
- **Keep warming.** Rejected: the review is one-shot, and the warming chain adds context and shell work.

## Consequences

- Each review starts from a prompt of a few kilobytes instead of the 100–120 KB chain, and the protocol plus the severity text are single-sourced in the prompt: a change to `artifact-review-contract.md` or to the validator schema needs a matching prompt edit.
- The worker loses the shared policy safety net, and the coordinator keeps the validated transport; the installer gains one special case (`selfContained` with `dispatchPrompt`) while the other fourteen agents and all bindings render unchanged, which the installer and projection suites pin.
- The caller must send a complete brief; a missing field costs a worker question or a failed dispatch, and document mode needs the optional verdicts file when `change-document.js check` flags a line.

## Provenance

Change `self-contained-expert-review-worker`, decision "The worker's useful contract is the communication protocol, not the shared policy chain; a self-contained prompt plus a caller brief keeps the protocol and drops the rest".
