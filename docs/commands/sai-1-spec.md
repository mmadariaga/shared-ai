# `/sai-1-spec`

## Command function

Turns an initial description of a need or feature into a clear proposal. The proposal explains what should be achieved and defines criteria that can later be used to check whether the result meets expectations.

## Flags and behavior modifiers

For a new change, supply the complete `Ready to Propose` block produced by `/sai-explore`, pasted or passed as `--block-file <path> --block-hash <sha256>`. The command validates it first with the same dispatchable contract Explore applies at crystallization (every required field, a confirmed `- None` or at least one in-scope implementation detail, and the block-hygiene clauses) and writes nothing when it fails, showing the problems with line numbers. A block whose formatting degraded in the paste, such as lost bold labels, is rejected: copy it again from the Explore output. A block file is verified against its hash before anything else; the command stops without changes if the file is missing, unreadable, or does not match, and never reconstructs the block from chat. A block you paste yourself carries no hash and is validated on its own merits. For refinement, supply an existing change name and feedback. `--fast-track` and `--supervised` are accepted and ignored.

## In detail

The command always runs unattended. It turns the crystallized idea into `proposal.md` and capability specs under `openspec/changes/{change-name}/`: a worker writes them, the command runs the mechanical checks, reviews the result in up to three incremental rounds, and commits the segment's own paths locally. The assumptions it made when it answered a worker question, and any review findings still open after the third round, are listed once in the closing report and are not written to the repository. Start with `/sai-explore` when the idea is still incomplete; creation requires its complete block rather than a free-form description alone.

It also prepares acceptance criteria: concrete examples of what should happen when the feature is finished. These criteria help detect misunderstandings before design or coding begins.

With a name and feedback, for example `/sai-1-spec my-change <feedback>`, the command runs the same cycle over the existing artifacts with the feedback as its input. Without a block and without an existing change, it stops before any dispatch and tells you what to pass. It does not write design or implementation artifacts or project code. Review the result and invoke `/sai-2-design {change-name}` to approve it and continue, or use [`/sai-plan`](sai-plan.md) to run both phases in one invocation. Ambiguous domain terms may require clarification and permitted glossary updates. Proposals describe purpose and scope without a project-wide Complexity rating.
