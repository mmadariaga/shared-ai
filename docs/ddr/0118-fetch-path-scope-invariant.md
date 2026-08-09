# DDR 0118: Every resolved fetch path begins with `sai/`, `commands/`, or `skills/` and the harness root is never named

## Status

Accepted

## Context

Prompt-free fetch resolution requires that directive content can never reach the filesystem outside the subtrees the shipped opencode `external_directory` allowlist permits. Both fetch skills encode resolution scope as a positive invariant: every resolved path begins with `sai/`, `commands/`, or `skills/` under the project-local or user-global root, and the harness root itself is never named. The guard is keyed on the resolved path, not the directive's literal token, so the absolute user-global directive form (`Fetch @~/.config/opencode/skills/fetch/SKILL.md`, pinned by `thin-wrappers`) resolves under `skills/` and stays in namespace.

## Decision

A directive whose resolved path would land outside the three prefixes — a fourth top-level segment such as `@vendor/notes.md`, or a root-naming directive such as `@sai/` — is rejected before any filesystem access, naming the directive and the three permitted prefixes. No directory listing of the root, no root-level existence probe, and no glob are ever performed. Guard and template allowlist together make prompt-free operation a structural property: directive content can never reach the filesystem outside the three permitted subtrees.

## Alternatives Considered

- **Denylist (reject known-bad prefixes)** — rejected: non-exhaustive; a new bad prefix slips through until it is added.
- **Guard on the directive's literal token** — rejected: the absolute user-global directive form would be misclassified as out of namespace.
- **Positive whitelist of three prefixes, guard on the resolved path** — chosen: exhaustive over the namespace, and the absolute directive form stays in namespace.

## Consequences

Directive content can never trigger an external-directory permission prompt, because no out-of-namespace path is ever read. The guard and the opencode template's three-entry allowlist must stay in sync; extending the fetch namespace requires updating both. The decision states a property of the pipeline's fetch behavior that must hold at all times — every resolved path begins with one of the three prefixes and the root is never named — which is why this record is a DDR.

## Provenance

User — the decision was directed by the change request and recorded as Decision 2 in `design.md` with the `ddr` family marker.
