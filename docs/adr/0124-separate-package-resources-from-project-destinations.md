# ADR 0124: Resolve package resources separately from project destinations

## Status

Accepted

## Context

The post-setup agent customizer runs from the installed shared-ai package but
writes project-local agent extension points for a configured consumer project.
Using one `repoRoot` for both concerns makes manifest discovery depend on the
consumer project's contents and prevents isolated tests from supplying the
three independent filesystem roots.

## Decision

Keep the installed package root, configured project root, and harness-specific
global agent root as separate inputs. Read `sai/install-manifest.json` only
from the package root to discover the agent roster. Resolve installed agent
bytes only from the selected harness's global agent root, and write local
overrides only below the configured project root.

## Alternatives Considered

- Reuse the project root for manifest lookup: rejected because consumer
  projects do not contain the shared-ai package manifest.
- Derive test roots from the process working directory: rejected because it
  prevents isolated fixtures.
- Use package-bundled agent files as a fallback source: rejected because the
  project-local override contract requires the harness-specific installed
  source.

## Consequences

Adapters carry explicit roots, making deployment resolution and filesystem
tests correct. Package discovery cannot accidentally read the consumer
project, and project-local customization cannot mutate global installation
files.

## Related

- `openspec/changes/persist-project-agent-overrides/design.md` — Decision
  “Package resources and project destinations use separate roots”.
