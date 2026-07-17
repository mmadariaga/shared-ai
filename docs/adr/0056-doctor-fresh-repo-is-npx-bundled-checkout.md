# ADR 0056: The doctor's "fresh repo from main" is its own npx-bundled checkout

## Status

Accepted

## Context

`bin/doctor.js` reports version skew and, when a harness has no `.version` marker, a file-diff of the installed files against the "fresh repo on `main`" (spec `doctor-version-skew`). The naive reading is that the doctor must download `main` to compare against it. But `raw.githubusercontent.com` serves individual files with no directory listing, so the expected-file *list* must come from the local `enumerate*` functions regardless; only file *content* could be fetched. Fetching content for every expected file would issue N HTTPS GETs for bytes that are already on disk: the only supported entry point is `npx github:mmadariaga/shared-ai doctor`, and `npx` fetches `main` HEAD to run the doctor in the first place — the doctor's own bundled source IS `main`.

## Decision

The file-diff fallback hash-compares each installed `dest` against its bundled `src` (the same `src` the `enumerate*` entries already carry) using `sha256File`, with **no second download**; the spec's "fresh repo fetched from `main`" is satisfied by the `npx` fetch that bootstrapped the doctor. A single real HTTPS GET to `raw.githubusercontent.com/mmadariaga/shared-ai/main/package.json` is retained solely for the numeric `.version`-marker-vs-latest comparison — the one signal that stays correct even if the doctor is ever run from a non-`npx` stale clone where bundled ≠ `main`. That fetch degrades to a `warn` ("latest version unknown") on any network failure and never changes the exit code.

## Alternatives Considered

- **Fetch every expected file's content from `raw.githubusercontent` in the fallback** — rejected: `raw` has no directory listing (the file list is local regardless), and it issues N GETs for content already present under `npx`, adding latency and N network failure modes to the offline-capable path.
- **Drop the remote `package.json` GET entirely and read the bundled `package.json.version` as "latest"** — rejected: redundant under `npx`, but the one cheap fetch is the only thing that reports true skew under a stale-clone invocation, and it keeps the spec's normative latest-version source literally satisfied.

## Consequences

- The common path performs exactly one network read (the latest `package.json` version); the file-diff never touches the network.
- Under a non-`npx` stale clone (bundled ≠ `main`), the file-diff compares against bundled bytes rather than true `main`; documented as a caveat, mitigated by `npx` being the only supported entry point. The numeric skew line stays correct because it uses the remote GET.
- The doctor depends on `uninstall-flow.js`'s `enumerate*` for the `{src, dest}` pairs the diff needs (see ADR 0057).

## Related

- `openspec/changes/add-sai-doctor/design.md` — Decision D5 (and D6 for the graceful-degradation contract)
- `openspec/changes/add-sai-doctor/specs/doctor-version-skew/spec.md` — "version skew via .version marker", "file-diff fallback", "network-read boundary"
- `bin/uninstall-flow.js` — `sha256File`, `enumerate*` (source of the `{src, dest}` pairs)
