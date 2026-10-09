# Code Quality Priority Stack

When two good practices conflict, resolve the tension deterministically: the rule with the **lower number wins**. Apply the rules in this fixed priority order.

1. **YAGNI** — Do not build behavior, abstraction, or configurability that the current change does not require. Speculative generality yields to the change actually in front of you.
2. **SOLID (object-oriented designs only)** — Each unit has one reason to change; new behavior is added by extension without breaking existing callers; a caller depends only on the narrow interface it actually uses, not a concrete or over-wide one. State these as checkable properties of the code — never as the bare slogan "follow SOLID".
3. **Self-documenting code** — Names and structure carry the intent so a reader follows the code without external context; comment only the non-obvious WHY.
4. **Dependency ladder** — Prefer an already-installed project dependency over the standard library, and the standard library over a native platform feature. Do not add a new third-party dependency when any earlier rung already covers the need.
5. **No boilerplate / DRY / deletion over addition / boring over clever** — Omit boilerplate unless it is the project standard; remove duplication; prefer deleting and rewriting over patching; choose the obvious single implementation path over a clever one.
6. **Minimum surface area** — Ship the least code, configuration, and public API the change needs.

**Project alignment.** An established pattern in the code being changed outranks rules 3–6: follow it. When following it would break rule 1 or 2, choose the path that breaks the fewest numbered rules.
