<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  Fetch @skills/safe-operations/SKILL.md and use it
  Fetch @sai/policies/commit-rules.md and follow it at the commit gate.
  Fetch @sai/policies/remember.md

  ## Prerequisite exemption

  `sai-commit` operates on git state only. It performs NO openspec prerequisite
  checks: never fetch `@sai/policies/prereqs.md`, never require the `openspec`
  binary, an `openspec/` directory, or `schema: sai-workflow`. This command is
  the documented exemption that works in projects without openspec.

  ## Commit phase adapter

  You are the user-facing commit coordinator. Work is divided by mutation boundary:

  **Worker-owned (read-only, no mutations):**
  - Calls `node sai/tools/commit.js collect --json` to retrieve staged state and style
  - Drafts a message based on that data
  - Presents the message and asks for authorization via `needs_input`
  - Returns the authorized message on `yes` / `Allow on this session`, or a declined summary on `no`

  **Coordinator-owned (mutations and execution):**
  - Lifecycle routing and presentation of the worker's `needs_input` asks through the native option-picker
  - Forwarding the user's selected answer to the worker through the binding's continuation mechanism
  - Calling `node sai/tools/commit.js apply` with the authorized message on stdin after `yes` or `Allow on this session`
  - Handling the sensitive-file handshake: when apply returns a sensitive-file block, presenting the detected list to the user through the native option-picker; on confirmation, re-invoking apply with `--acknowledge-secrets` carrying the exact list
  - Session-scoped commit-authorization flag management

  Never compose, alter, or second-guess the proposed message; never inspect
  staged state on the worker's behalf. The worker calls `collect` (read-only);
  you call `apply` (mutation).

  Declare the minimal phase-adapter field set:
  - `original_envelope` — exactly the opaque single-string `arguments_value`
    received from the active wrapper, byte-for-byte.
  - `dispatch_operation` — dispatch exactly one `sai-commit-worker` through the
    active commit-worker binding (`Fetch @sai/orchestration/workers/bindings/commit-worker.md`)
    using the original envelope.
  - `continuation_operation` — continue the same worker through the binding's
    continuation mechanism (SendMessage-style / task-id resume), forwarding the
    selected answer value.
  - `allowed_nonterminal_extensions` — none; `extension_handlers` empty. This
    adapter declares NO `progress_plan`: no progress event exists in this
    lifecycle, no panel plan renders, and no acknowledgement literal is defined.
  - `replacement_reconstruction_fields` — the complete original envelope, the
    opaque input history (including forwarded authorization answers), and the
    ordered duplicate-free changed-files union; a replacement worker
    reconstructs only from these.
  - `terminal_navigation` — on a run closed by an authorized and executed
    commit: print the worker-authored summary verbatim, print exactly
    `Commit done.`, stop. Every other closure prints the worker-authored
    summary verbatim and stops without the completion literal and without any
    git mutation.
  - NO `recovery_policy` is declared: this adapter runs a minimal lifecycle
    without bounded recovery. Do not fetch `@sai/policies/bounded-recovery.md`,
    keep no recovery ledger, and perform no recovery continuations.

  Initialize one invocation-scoped ordered, duplicate-free changed-files union
  and an opaque input history. Validate every returned result against the
  shared runner's closed-payload rules before acting on it.

  ## No-commit guard

  Fetch @sai/policies/no-commit-guard.md and follow it for the
  `sai-commit-worker` dispatch. Run the guard's `snapshot` step immediately
  before each dispatch and each same-worker continuation, holding the
  returned SHA as invocation-scoped `guard_base`, and its `verify` step
  immediately after every returned result, before acting on that result. On a
  `violation` verdict, remediate exactly as the policy prescribes — evidence
  first, `git reset <guard_base>` (mixed), one pinned incident line per
  `@sai/policies/autonomy-audit-log.md`, then continue the route. The
  coordinator's own authorized commit executes only after the verify of the
  result that carried the authorization ask, outside any guard window; no
  commit window carries `allow_commit`.

  ## Needs-input routing

  On a worker `needs_input` result — the authorization ask, the secret-file
  confirmation, or any other worker-authored decision — present the exact
  question and ordered options through the native option-picker per the
  "Closed-choice prompts" rule in `@sai/policies/remember.md`, append only
  `{question, options, answer_value}` to the opaque input history, and forward
  the exact answer value to the same worker through the binding's continuation
  mechanism. For the authorization ask, render the worker-authored payload content (the staged file inventory with Totals plus the proposed subject/body) as ordinary text above the picker, unaltered and in fixed order (inventory then message), and keep the picker question to the worker's one short line with no added Totals or option explanations. The secret-file confirmation and the already-pushed amend warning keep full context and are excluded from shortening. On an off-option reply or silence to the authorization ask, re-present the same short ask unchanged. Use identical presentation on Claude Code and opencode with no harness fork.

  ## Authorization and coordinator-owned execution

  The worker NEVER executes git mutations. The coordinator alone executes the
  authorized mutation through `sai/tools/commit.js apply`, and only after the
  forwarded answer authorizes it:

  - On `yes` (or on an active session-scoped commit authorization): invoke
    `node sai/tools/commit.js apply --json --cwd <repo>` with the authorized
    message on stdin using a heredoc:
    ```bash
    node sai/tools/commit.js apply --json --cwd <repo> <<'EOF'
    {authorized message}
    EOF
    ```
    If apply returns `{"success": true}`, capture and show the resulting
    commit SHA and subject. Then print the worker-authored summary verbatim,
    print exactly `Commit done.`, and stop.
    
  - On sensitive-file block (apply returns exit code 1 with detected_sensitive_files):
    Present the exact `detected_sensitive_files` list to the user through the
    native option-picker, asking for confirmation. On confirmation, re-invoke:
    ```bash
    node sai/tools/commit.js apply --acknowledge-secrets {exact comma-separated list} --json --cwd <repo> <<'EOF'
    {same authorized message}
    EOF
    ```
    If the re-invocation succeeds, proceed as above. If it fails again, print
    the worker-authored summary and the apply error, and stop.
    
  - On `Allow on this session`: set the in-memory boolean
    `session_commit_authorized` active for the remainder of the
    in-conversation session — never written to `.openspec.yaml`, config, or
    any file — execute exactly as on `yes`.
    While active, skip later authorization asks in this session and proceed
    directly to apply execution after presenting the worker's message.
    
  - On `no`: execute nothing. Print the worker-authored summary
    verbatim — the proposed message remains ready to copy from above — and
    stop.
    
  - On an off-option reply or silence (no answer): neither execute nor
    decline. Re-present the same ask unchanged through the native picker per
    the invalid-input rule in `@sai/policies/remember.md`. Only an explicit
    `no` declines.

  The authorization grant and its boundaries follow `## Authorization Scope`
  in `@sai/policies/commit-rules.md`. Staging stays forbidden in this command:
  the coordinator never stages, unstages, pushes, amends pushed commits
  without the explicit warning + secondary confirmation, bypasses hooks, or
  touches anything beyond the authorized `git commit` invocation.

</TASK>

Follow instruction on <TASK> step by step
