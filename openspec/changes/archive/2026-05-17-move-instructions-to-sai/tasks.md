## 1. Mover archivos de instrucciones

- [x] 1.1 Crear directorio `instructions/sai/`
- [x] 1.2 Mover los 12 archivos de `instructions/*.md` a `instructions/sai/`: `accessibility.md`, `caveman.md`, `commit.md`, `glossary-format.md`, `implement.md`, `performance.md`, `plan.md`, `pr.md`, `remember.md`, `review.md`, `security.md`, `spec.propose.md`
- [x] 1.3 Verificar que `instructions/` no contiene archivos `.md` en su raíz

## 2. Actualizar script de instalación y documentación de instalación

- [x] 2.1 Actualizar `INSTALL.claude.md`: cambiar `cp instructions/*.md ~/.claude/instructions/` por `mkdir -p ~/.claude/instructions/sai && cp instructions/sai/*.md ~/.claude/instructions/sai/`
- [x] 2.2 Actualizar `README.md`: cambiar todas las referencias `cp instructions/*.md ~/.claude/instructions/` y `cp instructions/*.md ~/.config/opencode/instructions/` a las nuevas rutas con subdirectorio `sai/`
- [x] 2.3 Actualizar `README.md`: cambiar referencias en la tabla de estructura de directorios (`instructions/` → `instructions/sai/`)

## 3. Actualizar wrappers de Claude Code (claude/commands/)

- [x] 3.1 En `claude/commands/sai-1-spec.md`: cambiar `@~/.claude/instructions/caveman.md`, `@~/.claude/instructions/glossary-format.md`, `@~/.claude/instructions/spec.propose.md`, `@~/.claude/instructions/remember.md` → rutas con `/sai/`
- [x] 3.2 En `claude/commands/sai-2-implement.md`: cambiar `@~/.claude/instructions/caveman.md`, `@~/.claude/instructions/glossary-format.md`, `@~/.claude/instructions/plan.md`, `@~/.claude/instructions/remember.md` → rutas con `/sai/`
- [x] 3.3 En `claude/commands/sai-3-apply.md`: cambiar `@~/.claude/instructions/caveman.md`, `@~/.claude/instructions/implement.md`, `@~/.claude/instructions/remember.md` → rutas con `/sai/`
- [x] 3.4 En `claude/commands/sai-4-review.md`: cambiar `@~/.claude/instructions/caveman.md`, `@~/.claude/instructions/glossary-format.md`, `@~/.claude/instructions/review.md`, `@~/.claude/instructions/remember.md` → rutas con `/sai/`
- [x] 3.5 En `claude/commands/sai-5-security.md`: cambiar `@~/.claude/instructions/caveman.md`, `@~/.claude/instructions/security.md`, `@~/.claude/instructions/remember.md` → rutas con `/sai/`
- [x] 3.6 En `claude/commands/sai-6-performance.md`: cambiar `@~/.claude/instructions/caveman.md`, `@~/.claude/instructions/performance.md`, `@~/.claude/instructions/remember.md` → rutas con `/sai/`
- [x] 3.7 En `claude/commands/sai-7-accessibility.md`: cambiar `@~/.claude/instructions/caveman.md`, `@~/.claude/instructions/accessibility.md`, `@~/.claude/instructions/remember.md` → rutas con `/sai/`
- [x] 3.8 En `claude/commands/sai-archive.md`: cambiar `@~/.claude/instructions/caveman.md`, `@~/.claude/instructions/remember.md` → rutas con `/sai/`
- [x] 3.9 En `claude/commands/sai-commit.md`: cambiar `@~/.claude/instructions/caveman.md`, `@~/.claude/instructions/commit.md`, `@~/.claude/instructions/remember.md` → rutas con `/sai/`
- [x] 3.10 En `claude/commands/sai-explore.md`: cambiar `@~/.claude/instructions/caveman.md`, `@~/.claude/instructions/remember.md` → rutas con `/sai/`
- [x] 3.11 En `claude/commands/sai-pr.md`: cambiar `@~/.claude/instructions/caveman.md`, `@~/.claude/instructions/pr.md`, `@~/.claude/instructions/remember.md` → rutas con `/sai/`

## 4. Actualizar wrappers de OpenCode (opencode/commands/)

- [x] 4.1 En `opencode/commands/sai-1-spec.md`: cambiar `@~/.config/opencode/instructions/caveman.md`, `@~/.config/opencode/instructions/glossary-format.md`, `@~/.config/opencode/instructions/spec.propose.md` → rutas con `/sai/`
- [x] 4.2 En `opencode/commands/sai-2-implement.md`: cambiar `@~/.config/opencode/instructions/caveman.md`, `@~/.config/opencode/instructions/glossary-format.md`, `@~/.config/opencode/instructions/plan.md`, `@~/.config/opencode/instructions/remember.md` → rutas con `/sai/`
- [x] 4.3 En `opencode/commands/sai-3-apply.md`: cambiar `@~/.config/opencode/instructions/caveman.md`, `@~/.config/opencode/instructions/implement.md`, `@~/.config/opencode/instructions/remember.md` → rutas con `/sai/`
- [x] 4.4 En `opencode/commands/sai-4-review.md`: cambiar `@~/.config/opencode/instructions/caveman.md`, `@~/.config/opencode/instructions/glossary-format.md`, `@~/.config/opencode/instructions/review.md` → rutas con `/sai/`
- [x] 4.5 En `opencode/commands/sai-5-security.md`: cambiar `@~/.config/opencode/instructions/caveman.md`, `@~/.config/opencode/instructions/security.md` → rutas con `/sai/`
- [x] 4.6 En `opencode/commands/sai-6-performance.md`: cambiar `@~/.config/opencode/instructions/caveman.md`, `@~/.config/opencode/instructions/performance.md` → rutas con `/sai/`
- [x] 4.7 En `opencode/commands/sai-7-accessibility.md`: cambiar `@~/.config/opencode/instructions/caveman.md`, `@~/.config/opencode/instructions/accessibility.md` → rutas con `/sai/`
- [x] 4.8 En `opencode/commands/sai-archive.md`: cambiar `@~/.config/opencode/instructions/caveman.md`, `@~/.config/opencode/instructions/remember.md` → rutas con `/sai/`
- [x] 4.9 En `opencode/commands/sai-commit.md`: cambiar `@~/.config/opencode/instructions/caveman.md`, `@~/.config/opencode/instructions/commit.md`, `@~/.config/opencode/instructions/remember.md` → rutas con `/sai/`
- [x] 4.10 En `opencode/commands/sai-explore.md`: cambiar `@~/.config/opencode/instructions/caveman.md`, `@~/.config/opencode/instructions/remember.md` → rutas con `/sai/`
- [x] 4.11 En `opencode/commands/sai-pr.md`: cambiar `@~/.config/opencode/instructions/caveman.md`, `@~/.config/opencode/instructions/pr.md`, `@~/.config/opencode/instructions/remember.md` → rutas con `/sai/`

## 5. Actualizar documentación AGENTS.md

- [x] 5.1 Actualizar `AGENTS.md`: cambiar referencias `instructions/` → `instructions/sai/` en descripciones de estructura y flujo de instalación

## 6. Actualizar specs de OpenSpec activos

- [x] 6.1 Actualizar `openspec/specs/install-script/spec.md`: cambiar el escenario de copia de `instructions/*.md → ~/.claude/instructions/` a `instructions/sai/*.md → ~/.claude/instructions/sai/`
- [x] 6.2 Actualizar `openspec/specs/command-wrappers/spec.md`: cambiar rutas `~/.claude/instructions/<file>.md` → `~/.claude/instructions/sai/<file>.md` en los escenarios afectados
