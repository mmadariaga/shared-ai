# Implementation Plan — <!-- change name -->

**Source:** `openspec/changes/<change-name>/`  
**Tasks ref:** `tasks.md`  
**Design ref:** `design.md`

---

## Step 1 — <!-- step title (from tasks.md X.Y) -->

**Task ref:** <!-- tasks.md item, e.g. 1.1 -->

### RED — Failing Test

```
<!-- Write the failing test first. Run it and confirm it fails with a valid
     assertion error (not a setup error). Paste the failure output here. -->
```

**Expected failure:** <!-- what error/assertion failure you expect to see -->

### GREEN — Minimal Implementation

```
<!-- Write the minimal code that makes the RED test pass.
     Do not implement more than needed to make this specific test green. -->
```

**Verify:** run the test — it must pass now.

### STOP & COMMIT

Propose the commit message and ask the user for explicit approval before running `git commit`. See `sai/instructions/apply.md` for the full 4-step STOP & COMMIT checklist.

---

## Step 2 — <!-- step title -->

**Task ref:** <!-- tasks.md item -->

### RED — Failing Test

```
<!-- failing test -->
```

**Expected failure:** <!-- assertion error expected -->

### GREEN — Minimal Implementation

```
<!-- minimal implementation -->
```

**Verify:** run the test — it must pass now.

### STOP & COMMIT

Propose the commit message and ask the user for explicit approval before running `git commit`. See `sai/instructions/apply.md` for the full 4-step STOP & COMMIT checklist.

---

<!-- Repeat the Step N / RED / GREEN / STOP & COMMIT pattern for every task. -->
