# Adversarial expert review brief

The coordinator sends one task message to `sai-adversarial-expert-review-worker`: the `--report-dir <dir>` line, then the brief below with the values of this run and the procedure of the product's mode. Send the fields and the one applicable procedure as message text; the `Chat language` field names the language of the worker's summary, question, and findings. The worker reads no SAI policy or command file, so everything it needs beyond its own prompt travels in this message.

## The brief

```
Mode: document | mutations
Product: <one line per change document as "<absolute path> <sha256>", or the working-tree paths>
Approved scope: <the files and sections that bound the product, or "none — the product is the agreement">
Allowed write paths: <the paths the corrections may touch>
Transfer path: <absolute path of transfer.js>
Document tool path: <absolute path of change-document.js; document mode only>
Verdicts file: <absolute path of a verdicts file for change-document.js check; document mode only, when a flagged line needs a verdict>
Report name: <the base name of the report files>
Scratch folder: <the folder for drafts and long-command output>
Chat language: <the language of the review>
Procedure: <the procedure below for the mode>
```

## Approved scope

Name what the reviewed product was asked to deliver: in `/sai-explore`, the Goal, Scope, Non-goals, and Edge cases agreed in the conversation; in `/sai-plan`, the change document or the approved `proposal.md` and `specs/`; in `/sai-build`, `proposal.md`, `specs/`, `design.md`, and `tasks.md`; in Direct Build, the change document. A change document's `## Scope`, `## Capabilities`, and `## Edge cases` bound what an implementation of it must do. A product that is itself the agreement carries `none — the product is the agreement`.

## Procedure for both modes

Read the brief and the product. Review adversarially. Do not confirm what the producer already said; look for what it missed: a behavior the approved scope requires that the product does not deliver, an edge case with no answer, a contradiction between two statements, an instruction no reader can follow, a convention the product breaks. A defect is a defect even when the producer's own review passed it.

Form each finding with the shape, severity, and identifier scheme of your prompt, and classify every observation against the approved scope before assigning it a severity.

Correct the findings you can correct within the allowed write paths, following the procedure of the mode below. A finding you cannot correct stays reported without a correction: say in its `correction` what a later run must do.

When the product is, or contains, text an agent will read, load the `writing-for-agents` skill through the harness skill mechanism first and review that text against it. When the skill is unavailable, say so in one line of `summary` and continue.

## Procedure for document mode

Verify each product file against its hash first, and treat a missing, unreadable, or mismatched file as `failed` with no changes.

Write a corrected copy of each change document you changed to a new file in the report directory, never over the product file. Keep every unchanged section verbatim and change only what the finding needs. Run:

```
node "<document tool path>" check --document-file <corrected file> --slice
```

and, when this brief carries a `Verdicts file`, pass `--verdicts-file <that path>` too: the coordinator supplies it when the check flags a line and the line takes a `context` verdict. Return a corrected copy only when its reply is `ok: true` and `dispatchable: true`; otherwise report that finding without a correction, naming the failed check in the finding's issue. List every corrected copy you returned in `corrected_documents`, with its path, its sha256, and its document's `Change name:` value.

## Procedure for mutations mode

Edit the product files in place, minimally, in the product's own conventions, and list in the finding's `paths` every working-tree path the correction changed. A finding whose correction would touch a path outside the allowed write paths, such as a test file under `/sai-build`, stays reported without a correction: say in its `correction` what a later run must do.
