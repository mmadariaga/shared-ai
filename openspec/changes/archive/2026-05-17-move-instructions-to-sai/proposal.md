## Why

Las instrucciones en `instructions/*.md` viven en un directorio plano compartido con cualquier otro conjunto de comandos que el usuario instale. Esto genera riesgo de colisión de nombres cuando otra herramienta o integración también deposita archivos en `instructions/`. Moverlas a `instructions/sai/` las agrupa bajo el mismo espacio de nombres `sai` que ya usan los comandos (`/sai-*`) y las habilidades OpenSpec.

## What Changes

- Todos los archivos `instructions/*.md` se mueven a `instructions/sai/*.md` (12 archivos).
- Cualquier referencia a rutas `instructions/<file>.md` en comandos, habilidades, scripts o documentación se actualiza a `instructions/sai/<file>.md`.
- El directorio `instructions/` deja de contener archivos `.md` en su raíz.

## Capabilities

### New Capabilities
- `sai-instructions-namespace`: Subdirectorio `instructions/sai/` que agrupa todas las instrucciones del proyecto bajo el espacio de nombres `sai`, evitando conflictos con otras integraciones.

### Modified Capabilities

## Impact

- Archivos movidos: `instructions/*.md` → `instructions/sai/*.md` (12 ficheros).
- Referencias en: comandos Claude Code (`claude/commands/`), comandos OpenCode (`opencode/commands/`), habilidades (`.claude/skills/`), scripts de instalación, `README.md`, `AGENTS.md`, y cualquier otra documentación que mencione rutas de instrucciones.
