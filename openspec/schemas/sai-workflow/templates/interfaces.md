## Target State

<!-- The finished shape the change converges on, as ONE concrete artifact, emitted before any ## Step N.
     For code changes: the final payload / public signature / schema / file layout / config shape.
     For prose/instruction/doc changes: the final section + field structure of each document touched.
     Must be readable on its own, without the step sections. Write None + a one-line reason if no finished shape is expressible. -->

## Step 1: <!-- Title (mirror the Step N key from tasks.md) -->

**Interfaces**: <!-- new or modified public signatures introduced in this step — signatures only, no implementation body -->

**Test assertions**: <!-- exact expected input → output/behavior assertions; anchor each to a specs/**/*.md requirement or scenario by path -->

## Step 2: <!-- Title -->

**Interfaces**: <!-- new or modified public signatures introduced in this step — signatures only, no implementation body -->

**Test assertions**: <!-- exact expected input → output/behavior assertions; anchor each to a specs/**/*.md requirement or scenario by path -->

<!-- Omit any Step N that introduces no new/modified public interface and no testable assertion — do not emit an empty section. -->
<!-- Do NOT add a testing-stack, setup, or ## Implementation Context section: the testing stack stays single-sourced in tasks.md. -->
