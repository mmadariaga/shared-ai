## Context

Las instrucciones del proyecto (`instructions/*.md`) se copian durante la instalación a `~/.claude/instructions/` y `~/.config/opencode/instructions/`. Los wrappers de comandos las referencian como `@~/.claude/instructions/<file>.md`. Todo vive en un namespace plano: si otro conjunto de comandos también instala archivos en esos directorios, los nombres pueden colisionar.

El proyecto ya adoptó el prefijo `sai` para comandos (`/sai-*`). Esta decisión extiende esa convención al directorio fuente y al directorio instalado.

## Goals / Non-Goals

**Goals:**
- Mover los 12 archivos fuente de `instructions/*.md` → `instructions/sai/*.md`.
- Actualizar el script de instalación para copiar desde `instructions/sai/` y hacia `~/.claude/instructions/sai/` y `~/.config/opencode/instructions/sai/`.
- Actualizar todos los `Fetch` en los wrappers de Claude Code (`claude/commands/`) y OpenCode (`opencode/commands/`) para usar las nuevas rutas instaladas (`@~/.claude/instructions/sai/<file>.md`).
- Actualizar documentación (`README.md`, `AGENTS.md`) que mencione rutas de instrucciones.
- Actualizar los specs de OpenSpec que hagan referencia a rutas de instrucciones.

**Non-Goals:**
- Cambiar el contenido de los archivos `.md` de instrucciones.
- Renombrar los archivos de instrucciones (solo se mueven).
- Modificar las rutas de instalación de comandos u otros artefactos.

## Decisions

### Decisión: instalar en subdirectorio `sai/` en el destino, no solo en la fuente

**Alternativa A — solo mover la fuente, instalar destino sin cambios:**
`cp instructions/sai/*.md ~/.claude/instructions/` — los comandos no cambian.

**Alternativa B (elegida) — mover fuente Y subdirectorio de destino:**
`cp instructions/sai/*.md ~/.claude/instructions/sai/` — comandos actualizan sus `Fetch`.

**Rationale:** Si solo movemos la fuente pero instalamos en el directorio plano, el conflicto en el destino instalado persiste. La alternativa B resuelve el problema en su origen: el namespace `sai/` existe tanto en el repo como en el directorio instalado.

### Decisión: actualizar los specs de OpenSpec afectados en su lugar

Los specs activos (`command-wrappers`, `install-script`) mencionan rutas de instrucciones. Se actualizan en lugar de crear specs nuevos, porque los requisitos de negocio son los mismos — solo cambia la ruta.

## Risks / Trade-offs

- **Instalaciones existentes quedan obsoletas**: usuarios que hayan instalado previamente tendrán `~/.claude/instructions/*.md` pero no `~/.claude/instructions/sai/`. Deberán volver a ejecutar el script de instalación. → Mitigación: documentar en el CHANGELOG / README.
- **Muchos archivos a actualizar**: los wrappers de Claude Code son 10 archivos con múltiples líneas `Fetch` cada uno; lo mismo para OpenCode. → Mitigación: la tarea de implementación los agrupa por bloque para que el cambio sea mecánico y verificable.
- **Specs de OpenSpec referencian las rutas antiguas**: si no se actualizan, quedan desincronizados con el código real. → Mitigación: se incluye como tarea explícita.
