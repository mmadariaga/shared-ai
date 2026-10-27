> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Cache warming ships off by default, and before this change the only way to enable or tune it was to edit the `warming` value of `.sai/settings.jsonc` by hand (`docs/project-settings.md` stated that the project behavior settings screen does not edit it). Users need a guided place beside the existing model selection to enable warming per provider, model, and role. In addition, on Claude Code a command declares a model alias such as `opus` while the running main session reports a full runtime id such as `claude-opus-5-5`, and the warming resolver compared models by exact equality, so a rule written for the alias never applied to the running session.

## What Changes

- The post-setup menu of `npx github:mmadariaga/shared-ai setup` gains a `Cache warming` action before `Exit`. It opens a new section (`bin/warming-setup.js`) and returns to the menu afterwards.
- The section shows one default per role (`Default for agent`, `Default for subagent`) and, per role, one guided rule row for each (provider, model) pair that an installed SAI file declares in its effective `model` frontmatter. The `agent` role lists the pairs of installed commands and utilities; the `subagent` role lists those of installed workers and helpers, across both harnesses. Effort and variant suffixes are removed, each pair appears once, and a file without a usable `model` value contributes no pair (`guidedWarmingPairs` in `bin/model-customization.js`).
- Stored rules that match no installed pair stay listed with the note `(no installed file uses it)` and can be edited or removed; a save never drops them.
- A row can be enabled, set off (`false` for a default, `"enabled": false` for a rule), or, for a rule, removed. Enabling asks for interval and maximum in minutes, pre-filled with the current value or `4` and `30`, and asks again until both are positive and the maximum is at least the interval.
- Leaving with `Done` saves only when the edits changed the value, and writes only the `warming` key of `.sai/settings.jsonc` through the settings writer, keeping other keys and comments. No edit, an interrupt, or an unparseable base file leaves the file byte-identical. An invalid stored value is reported and the section starts from empty values; a `warming` value in `.sai/settings.local.jsonc` is reported as overriding the written value.
- `saveSettings` in `bin/project-settings-writer.js` gains a `baseOnly` option that sends every key to `.sai/settings.jsonc` and leaves the local file out of the save, including its parse check.
- `resolveWarmingValue` in `sai/tools/project-settings.js` gains a model-family step for provider `anthropic`: after the exact model rule and before the provider rule, a rule whose model is the family derived from a runtime id of the form `claude-<family>-...` applies, reported with origin `family`. Ids of another shape and other providers skip the step.
- The `warming` catalogue entry declares `label` `Cache warming`, `section` `Cache warming`, and `absent` `off`, which the new section uses for its prompt title and off text.
- `docs/project-settings.md` describes the family step, the `family` origin, and a new Cache warming section of the setup flow.
- Scope drift (not an implementation error): `saveSettings` with `baseOnly` no longer refuses a save when `.sai/settings.local.jsonc` cannot be parsed. The selected diff evidences this behavior, but the supplied intent statement did not name it.

## Capabilities

### New Capabilities

- `warming-setup`: the install-time Cache warming section that views and edits the warming role defaults and the guided provider, model, and role rules, and saves only the `warming` key of `.sai/settings.jsonc`.

### Modified Capabilities

- `cache-warming-settings`: warming resolution gains a model-family step between the exact model rule and the provider rule, with origin `family`, and the documentation describes the step and the new section.
- `model-customization-menu`: the post-setup menu gains the `Cache warming` action before `Exit`.
- `project-settings`: the `warming` catalogue entry declares presentation fields for the Cache warming section.
- `project-settings-writer`: `saveSettings` accepts `baseOnly` to write every key to the base file only.

## Impact

- New: `bin/warming-setup.js`.
- Modified: `bin/model-customization.js`, `bin/project-settings-writer.js`, `sai/tools/project-settings.js`, `docs/project-settings.md`.
- Tests: `test/project-settings.test.js`, `test/project-settings-screen.test.js`, `test/model-customization-menu.test.js`.
- Agent and command frontmatter stay unchanged; the section only reads `model` values. The shipped warming defaults stay off for both roles.
- Known limitations: a target without a `model` key contributes no guided rule, so provider rules and defaults cover it; the family step applies to provider `anthropic` only, because opencode ids already match their frontmatter values exactly.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

The prerequisite slice `subagent-cache-warming-core` (https://github.com/mmadariaga/shared-ai/issues/268) is already delivered and archived as `openspec/changes/archive/2026-10-26-subagent-cache-warming-core/`, so this block declares no dependency. The family step in `resolveWarmingValue` extends the resolver that slice delivered; issue #269 did not include it, and the exploration agreed to add it here.
