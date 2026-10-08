# Open decisions (Crystallize entry)

This step asks every open decision (defined in `crystallization-protocol.md`, **Open decisions first**) again while the user is still present. It is complete when every open decision is answered or explicitly left open; the slicing assessment starts only then, so every `Ready to Propose` block is printed after it.

**Notice.** Before the first question, show this notice once per idea as plain text, in the conversation language:

> Some decisions are still open. Each decision you leave open will be asked during planning or implementation, and that question stops an unattended route until you answer it.

**Questions.** Ask each open decision once, one decision per question, as a closed-choice prompt through the native picker, per the "Closed-choice prompts" rule in `sai/policies/remember.md` and the content rules of `@sai/policies/question-context.md`. The text before the picker quotes the open decision as the exploration left it and names where it sits: its `E<n>` or `I<n>` identifier, or the conversation. The options are that decision's own concrete answers, followed by `Leave it open` as the last option.

**Outcomes.** Each open decision ends in exactly one of two outcomes, held in the conversation only: `explore-idea@1` receives no event for this step and the panel gains no entry.

- **Answered**: the user chose one of the decision's answers, or stated one clearly in free text. The answer becomes a decision of the block: write it with its rationale to `Decisions & Rationale`, and rewrite the `Edge Cases` or `Implementation Details` item that held the open decision so that the item states the decided behavior. The item keeps its identifier and position, and both agreed lists stay agreed with no second review.
- **Left open**: the user chose `Leave it open` for that decision. Write it to `Request Additional Notes` in the `Undecided:` form that `sai/policies/ready-to-propose-format.md` owns.

Any other reply — ambiguous, missing, or a dismissed picker — leaves the open decision without an outcome: ask that same decision again. A reply that materially changes the idea follows **Material change** in `common.md`: the progression returns to `Explore change` and no block is printed.

**Sliced ideas.** The step runs once per idea. When the slicing assessment then cuts the idea, attribute each answered decision and each `Undecided:` entry to the block of the change it belongs to.

**Resumed crystallization.** When crystallization is interrupted and resumed with the idea unchanged, the recorded outcomes stand: ask only the open decisions that have no outcome yet, without repeating the notice.

`--fast-track` leaves this step unchanged (`sai/policies/fast-track-flag.md`).
