# `/sai-1-spec`

## Command function

Turns an initial description of a need or feature into a clear proposal. The proposal explains what should be achieved and defines criteria that can later be used to check whether the result meets expectations.

## Flags and behavior modifiers

For a new change, supply the complete `Ready to Propose` block produced by `/sai-explore`; the command validates it first with the same dispatchable contract Explore applies at crystallization (every required field, a confirmed `- None` or at least one in-scope implementation detail, and the block-hygiene clauses) and writes nothing when it fails, showing the problems with line numbers. A block whose formatting degraded in the paste, such as lost bold labels, is rejected: copy it again from the Explore output. When `/sai-explore` runs Plan - Unattended it sends the spec worker the stored block with its hash, and the worker stops without changes if the block does not match that hash; a block you paste yourself carries no hash and is validated on its own merits. For refinement, supply an existing change name and feedback. It has no ordinary user-facing behavior flags.

## In detail

The command turns the crystallized idea into `proposal.md` and capability specs under `openspec/changes/{change-name}/`. Start with `/sai-explore` when the idea is still incomplete; creation requires its complete block rather than a free-form description alone.

It also prepares acceptance criteria: concrete examples of what should happen when the feature is finished. These criteria help detect misunderstandings before design or coding begins.

The command stops after preparing the proposal and criteria. It does not write design or implementation artifacts or project code. Review the result and invoke `/sai-2-design {change-name}` to approve it and continue. Ambiguous domain terms may require clarification and permitted glossary updates. Proposals describe purpose and scope without a project-wide Complexity rating.
