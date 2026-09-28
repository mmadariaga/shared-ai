<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  Fetch @skills/safe-operations/SKILL.md and use it
  Fetch @sai/policies/commit-rules.md and follow it at the commit gate.
  Fetch @sai/policies/remember.md

  ## Prerequisite exemption

  `sai-commit` operates on git state only and is the documented exemption from
  the openspec prerequisites: it never fetches `@sai/policies/prereqs.md` and
  needs no `openspec` binary, `openspec/` directory, or `schema: sai-workflow`.

  ## Commit phase adapter

  You are the user-facing commit coordinator. The worker reads the staged state
  (`commit.js collect`), drafts the message, and asks for authorization
  (`@sai/commands/commit/instructions.md`). You present its questions, forward
  the answers, and run the only mutation, `commit.js apply`, after an authorized
  answer. The message is the worker's: present it unchanged and inspect nothing
  on its behalf.

  Declare the minimal phase-adapter field set:
  - `original_envelope` — exactly the opaque single-string `arguments_value`
    received from the active wrapper, byte-for-byte.
  - `dispatch_operation` — dispatch exactly one `sai-commit-worker` through the
    active commit-worker binding
    (`Fetch @sai/orchestration/workers/bindings/commit-worker.md`) with the
    original envelope.
  - `continuation_operation` — continue the same worker through the binding's
    continuation mechanism, forwarding the selected answer value.
  - `allowed_nonterminal_extensions` — none; `extension_handlers` empty. This
    adapter declares NO `progress_plan`: no progress event exists in this
    lifecycle, no panel plan renders, and no acknowledgement literal is defined.
  - `replacement_reconstruction_fields` — the original envelope, the opaque
    input history, and the ordered duplicate-free changed-files union; a
    replacement worker reconstructs only from these.
  - `terminal_navigation` — after an executed commit, print the
    worker-authored summary verbatim, then exactly `Commit done.`, and stop.
    Every other closure prints the worker-authored summary verbatim and stops
    without the completion literal and without any git mutation.
  - NO `recovery_policy` is declared: this adapter runs a minimal lifecycle
    without bounded recovery. Do not fetch `@sai/policies/bounded-recovery.md`,
    keep no recovery ledger, and perform no recovery continuations.

  Keep one invocation-scoped ordered, duplicate-free changed-files union and an
  opaque input history. Validate every worker result against the shared
  runner's closed-payload rules before acting on it.

  ## No-commit guard

  Fetch @sai/policies/no-commit-guard.md and follow its § Window pairing for
  every `sai-commit-worker` stretch: `snapshot` opens a window, holding the returned SHA as
  invocation-scoped `guard_base`, and `verify` closes it before each boundary. On a `violation` verdict,
  remediate exactly as the policy prescribes, then continue the route. Your
  authorized commit runs after the verify of the result that carried the
  authorization answer, outside every guard window; no commit window carries
  `allow_commit`.

  ## Needs-input routing

  For every worker `needs_input` (the pushed-amend confirmation, the
  sensitive-file confirmation, the authorization question), print the worker's
  summary as ordinary text, then present the exact question and ordered options
  through the native option-picker per "Closed-choice prompts" in
  `@sai/policies/remember.md`. For the authorization question the summary is the
  staged inventory with Totals followed by the proposed message, and the picker
  carries only the worker's one short line. Append
  `{question, options, answer_value}` to the opaque input history and forward
  the exact answer to the same worker. An off-option reply or silence re-presents
  the same question unchanged; only an explicit `no` declines. Claude Code and
  opencode present identically.

  ## Execution

  Resolve the `commit.js` path per `@sai/policies/tool-resolution.md`,
  substituting `commit.js` for `<name>`: the first existing candidate per
  harness, copied verbatim, with the opencode XDG fallback only when neither
  verbatim candidate exists. When none exists, name the tried candidates and
  stop. Every invocation passes `--json --cwd <repo>` and the authorized message
  on stdin through a quoted heredoc, so it reaches git byte-for-byte:

  ```bash
  node <tool-path> apply [--amend] [--acknowledge-secrets <list>] --json --cwd <repo> <<'EOF'
  {authorized message}
  EOF
  ```

  - `--amend` — exactly when the worker's completed summary reports an amend.
  - `--acknowledge-secrets <list>` — the comma-separated sensitive-file list
    the user confirmed at the worker's sensitive-file question, when there was
    one.

  On the worker's completed result after `yes` or `Allow on this session`, run
  `apply`:

  - `{"success": true}` — show the resulting commit SHA and subject, then run
    `terminal_navigation`.
  - A sensitive-file block (exit 1 with `detected_sensitive_files`,
    `unacknowledged`, `extra_acknowledged`) — present the exact
    `detected_sensitive_files` list through the native picker for
    confirmation; on `yes`, rerun `apply` once with exactly that list as
    `--acknowledge-secrets`. A second failure prints the worker summary and the
    error, and stops.
  - Validation violations (exit 1, format errors) — print them with the worker
    summary and stop without committing; the user edits and retries.

  `Allow on this session` also sets the in-memory `session_commit_authorized`
  flag, scoped as `## Authorization Scope` in `@sai/policies/commit-rules.md`
  defines (in-memory, never written, inactive at every new invocation); while it
  is active, answer a later authorization question with `yes` after printing the
  worker's summary. On `no`, execute nothing: print the worker summary and stop.

  The command's surface is the authorized `git commit` alone: never stage,
  unstage, push, or bypass hooks.

</TASK>

Follow instruction on <TASK> step by step
