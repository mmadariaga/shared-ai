**POC lane (uncertainty pause, pre-emission).** This step owns the viability-POC lane in full: the pause that fires when the technical-uncertainty judgment (4) fires, Ask 1, the POC execution, the verdict, and the post-POC menus. It is reached only through `next.follow` after the crystallization protocol emits the `poc-lane` intent to `explore-idea@1`; the stage stays `crystallize` while the lane runs. The lane is not a slice of the crystallized set, does not appear on the Idea Progress List, does not renumber friction or skeleton slices, and does not clear the stage TODO.

   **Uncertainty pause (viability POC pre-emission).** When the technical-uncertainty judgment (4) fires, do NOT emit feature `Ready to Propose` blocks yet. Instead, pause before emission and run **Ask 1** through the harness-native picker per `sai/policies/remember.md` (L10–15): `AskUserQuestion` on Claude Code, the `question` tool on opencode. The ask carries fixed informational context followed by exactly two options in this order:

    **Fixed info** (rendered as plain text before the picker, in the user's language per the crystallization language gate — crystallization-language-gates.md step-local item 8): state that the idea depends on an unused third party with insufficient docs for the specific integration case, that a disposable viability POC can prove the approach cheap and dirty before committing the full change set, that the POC runs via Direct Build with `--no-specs` (no backfill, no OpenSpec specs, no artifact archive — implementer only, dirty OK, minimal tests or human review), and that the POC is not a slice of the final set and does not renumber friction or skeleton slices.

    **Options** (exactly two, in this fixed order):
    - `Yes, create a POC before continuing` — runs the POC via Direct Build + `--no-specs` before any feature emission.
    - `No. Crystallize the full change` — crystallizes the full change without a POC; technical risk is accepted. Do not re-litigate this choice.

    `--fast-track` does NOT auto-approve Ask 1 or bypass this pause; the ask is always presented.

    **Ask 1 No branch**: proceed to the applicable crystallization protocol (the single-change protocol or the sliced protocol) using the size and friction assessments from the initial slicing assessment, re-entering it through the lane-return route below. The uncertainty axis fired but the user declined the POC; this is not revisited.

    **Ask 1 Yes branch**: run the POC via the **Direct Build (unattended) `--no-specs` profile** (see `pipeline-direct-build.md`). The POC is a separate, prior change/execution before feature set emission; it is not on the feature Idea Progress List and does not shift slice numbers. The POC runs the implementer only (no backfill, no OpenSpec specs, no artifact archive); dirty code is acceptable, and minimal tests or human review are the verdict authority. After the POC completes, present the post-POC menu based on the verdict:

    - **Viable** (POC tests green or human confirms it works): present a picker with three options:
      - A) `Crystallize full` — resume crystallization on the post-POC repo through the lane-return route below; re-run size and friction assessments (the POC may have changed the integration site), then emit feature blocks via the applicable protocol (the single-change protocol or the sliced protocol).
      - B) `Exit` — exit explore without crystallizing; the idea is not marked `discarded` and no feature blocks are emitted. Closure State remains `active-uncrystallized` (or `crystallized` only if blocks were emitted earlier in this session); Exit alone does not invent a crystallized transition.
      - C) `Free text` — the user provides additional input; re-ask or adjust the POC scope; does not advance alone.

    - **Not viable** (POC tests red or human says it fails): collect feedback from the user about what went wrong, then present a picker with two options:
      - A) `Re-explore with feedback` — return to exploration with the collected feedback as input; the idea may be revised or a different approach explored.
      - B) `Exit, idea dead` — exit explore and mark the idea `discarded` (Closure State transitions to `discarded`).

    `--fast-track` does NOT auto-approve post-POC menus; they are always presented. The POC code is disposable; on viable+crystallize, no mandatory auto-delete occurs (the user may keep or discard the POC code); on not-viable+re-explore, discarding code is an approach choice, not a silent fixed step. Multiple third-party uncertainties in one idea scope to one POC targeting the blocking risk, not one POC per library (unless free text asks).

    **Lane return (crystallization re-entry).** The two branches that resume crystallization — Ask 1 No, and `Crystallize full` after a viable POC — re-enter the crystallization protocol the same way the lane was entered: invoke `sai-state emit <id> explore-idea@1 '{"intent":"crystallize-resume"}'` per `@sai/policies/stage-machine.md` and follow the returned `next.follow` (`crystallization-protocol.md`, already in this chat's loaded-set after lane entry, so the fetch is skipped and its instructions are followed directly). The intent is routing-only: the stage stays `crystallize` and no list is recorded. Crystallization then continues at the applicable protocol — the single-change protocol (5) or the sliced protocol (6) — with the uncertainty pause already completed. The `Exit`, `Exit, idea dead`, `Free text`, and `Re-explore with feedback` branches do not emit this intent; they keep their own behavior.
