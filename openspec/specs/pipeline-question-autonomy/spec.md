# pipeline-question-autonomy Specification

## Purpose
TBD - created by archiving change add-pipeline-autonomous-question-answering. Update Purpose after archive.
## Requirements
### Requirement: The permitted grounding sources are bounded

The permitted grounding sources for an auto-answer are exactly: the worker's own `needs_input` payload (its question and any offered options), the selected change's emitted crystallized block, and the artifacts the supervised spec phase has itself written so far (its `proposal.md` and `specs/**` in their current state). Wherever these specs say "the supervised context", they mean this bounded set and nothing wider. Explore MUST NOT ground an auto-answer on the surrounding explore conversation, the design discussion or reasoning that preceded crystallization, prior reviewer or review-loop state, the spec worker's internal reasoning history, other project files, or unrelated repository context. This preserves the context isolation the pipeline already enforces and ensures the objective grounding gate cannot be emptied by treating the whole conversation as a source. The prohibition on "inferring an answer from explore context" retired from `explore-pipeline-supervision` is NOT re-permitted here under a different name: the explore conversation is expressly excluded.

#### Scenario: grounding is limited to the crystallized block and phase artifacts
- **WHEN** explore evaluates whether an answer is grounded for auto-answering
- **THEN** it considers only the worker's question payload, the crystallized block, and the phase's own `proposal.md` and `specs/**`
- **AND** it does not treat the surrounding explore conversation or any other project or repository content as a grounding source

#### Scenario: a question answerable only from the explore conversation escalates
- **WHEN** a worker question could seemingly be answered from the design discussion or reasoning earlier in the explore chat but is not determined by the crystallized block or the phase artifacts
- **THEN** explore treats the answer as ungrounded and escalates the question to the user
- **AND** it does not auto-answer from the conversation

### Requirement: Confident supervised questions are auto-answered

When acting as the `start-pipeline` supervisor on Claude Code or opencode and the routed spec-proposal worker returns `needs_input`, `sai-explore` MAY answer the question itself and forward that answer to the same worker through the existing routed worker lifecycle, WITHOUT escalating to the user, but ONLY when its confidence in the answer is clearly above the qualitative confidence threshold. The answer explore forwards SHALL be grounded in the selected change's crystallized block and the supervised context; for a closed-choice question it SHALL be one of the worker's own offered option values, and explore SHALL NOT invent an option the worker did not offer. Every question answered this way SHALL be recorded for the autonomy audit log.

#### Scenario: high-confidence closed-choice question is auto-answered
- **WHEN** the supervised spec-proposal worker returns `needs_input` with a closed-choice question and explore is clearly above the confidence threshold on the answer
- **THEN** explore selects one of the worker's exact offered option values without escalating to the user
- **AND** it continues the same worker with that value through the existing routed worker lifecycle
- **AND** it records the question, the chosen answer, and the grounding citation — which permitted source and what within it determined the answer — for the autonomy audit log

#### Scenario: auto-answer stays within the worker's offered options
- **WHEN** explore auto-answers a closed-choice worker question
- **THEN** the forwarded value is one the worker itself offered
- **AND** explore does not invent or substitute a value the worker did not provide

### Requirement: The answer must be located in the permitted grounding sources

Felt confidence alone SHALL NOT authorize an auto-answer. Explore MAY auto-answer ONLY when the answer is actually located in — determinable from — the permitted grounding sources (the selected change's crystallized block and the supervised context), such that explore can point to what in those sources determines the answer. When the answer is not present in or determinable from those sources — for example a question that depends on a downstream plan, prior-change precedent, or diff that explore does not hold — explore SHALL treat its confidence as unclear and MUST escalate per the pipeline question-escalation capability, regardless of how confident it feels. This makes "unclear" an objective, checkable condition — the answer is not grounded — rather than only a felt state, so a model that merely feels confident cannot bypass escalation.

#### Scenario: answer is present in the crystallized block
- **WHEN** a worker question's answer is directly determined by the selected change's crystallized block or the supervised context
- **THEN** explore may treat its confidence as clear and is eligible to auto-answer

#### Scenario: answer is not derivable from the grounding sources
- **WHEN** a worker question's answer is not present in or determinable from the crystallized block and the supervised context
- **THEN** explore treats its confidence as unclear and escalates the question to the user
- **AND** it does so regardless of how confident it feels

#### Scenario: question depends on an artifact explore does not hold
- **WHEN** answering a worker question would require a downstream plan, prior-change precedent, or diff that is not part of the permitted grounding sources
- **THEN** explore escalates the question rather than auto-answering from felt confidence

### Requirement: Ambiguity resolves toward escalation

The confidence threshold is a qualitative model judgment, not a computed number; explore SHALL NOT require, compute, or fabricate a numeric confidence value to make the decision. Auto-answering is the narrow exception granted only by clear, above-threshold confidence — escalation is the default. Whenever confidence is not clearly above the threshold, including when it is borderline, unclear, unassessed, or the answer is not grounded in the permitted sources per the requirement above, explore MUST NOT auto-answer and MUST escalate the question per the pipeline question-escalation capability. Escalation SHALL NEVER silently degrade into auto-answering when confidence is unclear.

#### Scenario: borderline confidence escalates
- **WHEN** explore's confidence in an answer to a supervised worker question is borderline rather than clearly above the threshold
- **THEN** explore does not auto-answer
- **AND** it escalates the question to the user

#### Scenario: unclear confidence never auto-answers
- **WHEN** explore cannot clearly judge its confidence in an answer to a supervised worker question
- **THEN** explore resolves toward escalation and presents the question to the user
- **AND** it does not forward an answer of its own to the worker

#### Scenario: confidence is judged qualitatively
- **WHEN** explore decides whether to auto-answer a supervised worker question
- **THEN** it makes a qualitative judgment about the threshold
- **AND** it does not require or emit a numeric confidence score to gate the decision

### Requirement: Autonomy is scoped to supervised spec execution

Auto-answering SHALL apply only to spec-proposal worker `needs_input` questions raised during `start-pipeline` supervision on a harness where supervision is available. It SHALL NOT change the behavior of independently invoked `/sai-1-spec`, the standalone spec coordinator that escalates every `needs_input` question, or any harness where `start-pipeline` supervision is unavailable.

#### Scenario: direct sai-1 is unaffected
- **WHEN** `/sai-1-spec` is invoked outside `start-pipeline` supervision and its worker returns `needs_input`
- **THEN** the question is escalated to the user as before
- **AND** no autonomous answering occurs

#### Scenario: supervision-unavailable harness never auto-answers
- **WHEN** a harness does not support `start-pipeline` supervision
- **THEN** explore does not auto-answer worker questions there
- **AND** its existing behavior is preserved

