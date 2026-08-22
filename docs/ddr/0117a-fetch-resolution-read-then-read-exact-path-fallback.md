# DDR 0117a: Fetch resolution replaces the Glob existence probe with Read-then-Read exact-path fallback

## Status

Accepted

## Context

Both fetch skills taught a Glob-based existence probe before Read (`skills/opencode/fetch/SKILL.md`, `skills/claude/fetch/SKILL.md`). Agents generalize that probe from the project branch to the user-global branch, and a Glob named at the user-global root sits outside every allow-glob of the shipped opencode `external_directory` allowlist — so the opencode run stalls on a permission prompt. The interruption carries no safety value: every path a fetch directive can name is an exact file under an already-permitted subtree once the allowlist covers the fetch namespace. The surrounding contract surface (`claude-fetch-resolution`, `opencode-worker-system-prompt`, `doctor-fetch-resolution`, `cross-harness-path-stop-rule`) is already Read-first and probe-free; `fetch-existence-check-before-read` was the lone probe owner and is retired.

## Decision

Fetch resolution replaces the probe with Read-then-Read exact-path fallback in both harness skills: Read the project-local exact path (`.opencode/<subpath>` / `.claude/<subpath>`) first; when that read fails, Read the user-global exact path (`~/.config/opencode/<subpath>` / `~/.claude/<subpath>`) directly; when that also fails, stop and report `File not found: <subpath> (checked <project-root>/ and <user-global-root>/)`. No Glob, LS, or directory-based existence probe remains in either branch; resolution is complete after at most two Read attempts, one per root. A failed Read carries the same existence signal as a probe result.

## Alternatives Considered

- **Keep the Glob probe as-is** — rejected: the probe generalizes to the user-global branch, where it triggers the permission-prompt interruption the change exists to remove.
- **Hybrid (probe project-local only, read global directly)** — rejected: the invariant forbids any probe in either branch, and the user-global branch is precisely where the prompt interruption occurs.
- **Read-then-Read exact-path fallback** — chosen: no probe cost, the same existence signal, and prompt-free by construction.

## Consequences

The opencode run can no longer stall on a permission prompt caused by directive resolution; resolution is deterministic — at most two Read attempts, one per root. The adjacent `doctor-fetch-resolution` regex assertions anchor on the retained tokens `exists` (project-local branch) and `directly` (user-global branch), so the skill wording must keep them. The decision states a property of the pipeline's fetch behavior that must hold at all times — resolution is complete after at most two Read attempts with no directory-based probe — which is why this record is a DDR.

## Provenance

User — the decision was directed by the change request and recorded as Decision 1 in `design.md` with the `ddr` family marker.
