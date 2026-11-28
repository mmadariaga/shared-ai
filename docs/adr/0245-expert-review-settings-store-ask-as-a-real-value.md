# ADR 0245: Expert review settings store ask as a real value

## Status

Accepted.

## Context

`ask` is the absence marker for every project setting: a stored `ask` keeps the normal question, so the reader drops it and the command asks as if no key existed. The three `expertReview.*` keys need a real `ask` mode that is distinct from an unset key, because a project that configured "ask me before keeping corrections" must not be indistinguishable from a project that never configured anything.

## Decision

The `sai/tools/project-settings.js` catalogue carries an `askIsValue` flag. For the three `expertReview.explore`, `expertReview.plan`, and `expertReview.build` entries, the flag makes `ask` a stored value: the reader returns it, the writer saves it and normalizes the input to trimmed lowercase, and the post-setup screen shows it as the row's value. An absent key keeps the command's previous behavior, so an upgrade changes nothing. Every other key keeps the global `ask` sentinel.

## Alternatives Considered

- **Reuse the global `ask` sentinel for the new keys.** Rejected because `ask` would be unrepresentable as a value: a configured ask mode and an unset key would read the same.
- **Default an absent key to `no`.** Rejected because it would silently disable the checkpoint on upgrade instead of preserving the command's current behavior.

## Consequences

- The settings reader, writer, and screen carry a per-key exception, and the catalogue is the single place that declares it.
- Existing non-expert keys keep the sentinel unchanged.
- The three keys accept `no`, `auto`, and `ask`, and an invalid value is dropped with a warning that names the key.

## Provenance

Change `expert-review-configuration`, decision "`ask` is a stored value, not the absence marker".
