# ADR 0031: Permit declared npm dependencies in the installer (jsonc-parser)

## Status

Accepted

## Context

ADR 0010 (readline over npm) and ADR 0011 (regex line-patch over a YAML library) established a zero-external-dependency policy for the installer, and the `npx-installer` capability spec codified it as `installer-shebang-and-no-deps` ("No external npm dependencies are permitted"). That policy rested on the premise that `npx github:mmadariaga/shared-ai` fetches the repo tarball but does NOT run `npm install`, so any external dependency would fail to load at runtime.

The `opencode-config-agent-merge` change needs `jsonc-parser` to merge the opencode `agent` block while preserving comments/formatting (ADR 0029). Hand-rolling a comment-preserving JSONC editor with built-ins is materially more code and edge cases than a purpose-built library.

## Decision

Relax the policy: permit npm packages declared in `package.json` `dependencies`, which `npx github:` installs when fetching the package. The `npx-installer` capability's `installer-shebang-and-no-deps` requirement is modified accordingly (change `opencode-config-agent-merge`, `specs/npx-installer/spec.md`). `jsonc-parser` is the first permitted dependency. The interactive tool-selection checklist and the file-copy paths continue to use only Node.js built-in modules.

To keep the installer robust if the dependency is not present at runtime, `jsonc-parser` is loaded through a guarded `require` (module-level `try/catch` → `null`); when unavailable, `copyOpencodeConfig` degrades to the printed verification message rather than throwing.

## Alternatives Considered

- **Built-in-only hand-rolled JSONC scanner + splice**: keeps zero dependencies but adds a fragile, edge-case-prone parser for a preservation-critical edit. Rejected.
- **Vendor a bundled copy of `jsonc-parser` into the repo**: commits third-party bundle code and still sidesteps the policy informally. Rejected.
- **Declared npm dependency + modified spec** (chosen): explicit, minimal, and recorded.

## Consequences

- Reverses the standing zero-dependency stance for declared dependencies; ADR 0010/0011 remain valid for their own decisions (they do not need a dependency).
- **Validation required**: whether `npx github:` actually installs declared `dependencies` MUST be confirmed against a real install run. The guarded `require` prevents a crash if it does not, but the feature only works when the module resolves.
- Future dependencies must be justified per this ADR and limited to genuine installer needs.

## Related

- ADR 0010 (readline over npm), ADR 0011 (regex line-patch over YAML library) — the policy this ADR relaxes
- `openspec/changes/opencode-config-agent-merge/design.md` — Decision D3
- `openspec/changes/opencode-config-agent-merge/specs/npx-installer/spec.md` — MODIFIED `installer-shebang-and-no-deps`
