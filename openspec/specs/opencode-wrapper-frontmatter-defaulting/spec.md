# opencode-wrapper-frontmatter-defaulting Specification

## Purpose

Keeps opencode wrapper frontmatter minimal: a wrapper that relies on the default variant declares no `variant: default`.

## Requirements

### Requirement: Opencode wrappers SHALL omit explicit default variant declarations

When a wrapper uses the platform's default variant behavior, the frontmatter MUST omit `variant: default` to avoid redundant configuration.

#### Scenario: wrappers rely on implicit default variant
- **WHEN** an opencode wrapper such as `commands/opencode/sai-4-review.md` is defined with standard model configuration
- **THEN** its frontmatter includes `model` and omits `variant: default`
