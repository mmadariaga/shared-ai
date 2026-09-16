# apply-dispatch-wiring Specification

## Purpose
Define how the apply runner loads its RED and GREEN worker bindings through neutral, harness-agnostic Fetch resolution so standalone and chained dispatches always run the active binding.

## Requirements

### Requirement: Runner loads RED worker binding
The apply runner SHALL load the RED worker binding through a neutral Fetch that resolves on both harnesses with no harness token, so every RED dispatch runs through its active binding on standalone and chained paths.

#### Scenario: Standalone and chained RED dispatches use the active binding
- **WHEN** a RED dispatch runs on the standalone path or the chained build segment
- **THEN** it runs through the runner-loaded RED worker binding

### Requirement: Runner loads GREEN worker binding
The apply runner SHALL load the GREEN worker binding through a neutral Fetch that resolves on both harnesses with no harness token, so every GREEN dispatch runs through its active binding on standalone and chained paths.

#### Scenario: Standalone and chained GREEN dispatches use the active binding
- **WHEN** a GREEN dispatch runs on the standalone path or the chained build segment
- **THEN** it runs through the runner-loaded GREEN worker binding
