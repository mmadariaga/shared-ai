# syntax=docker/dockerfile:1
# Orca Environment — Ubuntu 24.04 image running a pinned Orca AppImage
# (extracted at build, no FUSE) headlessly as the non-root service user.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# --- system packages --------------------------------------------------------
# Git, a modern Node.js (NodeSource 22 LTS; Ubuntu 24.04 ships Node 18, which
# does not satisfy the pinned agent CLIs), Xvfb, software-rendering libraries,
# and the Linux libraries required by the Orca Electron runtime. libfuse2t64 is
# installed for AppImage tooling only; the runtime never requires FUSE.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl \
      git \
      xvfb \
      fontconfig fonts-liberation \
      libgl1 libegl1 \
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
      libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
      libgbm1 libasound2t64 libpango-1.0-0 libcairo2 libgtk-3-0t64 \
      libfuse2t64 \
      xz-utils \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get update && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && node --version && npm --version

# --- non-root service user with pre-created, orca-owned mount points ---------
# /run/orca is container-ephemeral image content (mode 0700) — deliberately NOT
# a Docker volume, so readiness/pairing artifacts cannot outlive the container.
RUN userdel ubuntu \
    && groupadd --gid 1000 orca \
    && useradd --uid 1000 --gid 1000 --create-home --home-dir /home/orca orca \
    && mkdir -p /workspace /home/orca /opt/state/claude /opt/state/opencode \
               /opt/state/credentials /run/orca /opt/orca /opt/orca/scripts \
               /opt/agent-cli \
    && chown -R orca:orca /workspace /home/orca /opt/state /run/orca \
    && chmod 0700 /run/orca

# --- Orca release pins (single source; validated; architecture-checked) ------
COPY checksums.env /opt/orca/pins/checksums.env

# --- pinned, integrity-verified Orca AppImage, extracted at build time --------
ARG TARGETARCH
# The build sources the committed pins, fails on a missing pin or a `latest`
# tag, verifies the SHA-256 before extraction, and fails BEFORE extraction when
# ORCA_ARCH does not match the build target's TARGETARCH mapping
# (amd64 -> x86_64, arm64 -> arm64) with a remediation message naming the pin
# update. The fixed production command is /opt/orca/AppRun serve (Decision 6).
RUN set -eux; \
    . /opt/orca/pins/checksums.env; \
    [ -n "${ORCA_VERSION:-}" ] || { echo "checksums.env: ORCA_VERSION is missing or empty" >&2; exit 1; }; \
    [ "$ORCA_VERSION" != "latest" ] || { echo "checksums.env: ORCA_VERSION must be an explicit release tag, never 'latest'" >&2; exit 1; }; \
    [ -n "${ORCA_ARCH:-}" ] || { echo "checksums.env: ORCA_ARCH is missing or empty" >&2; exit 1; }; \
    [ -n "${ORCA_SHA256:-}" ] || { echo "checksums.env: ORCA_SHA256 is missing or empty" >&2; exit 1; }; \
    case "$TARGETARCH" in \
      amd64) asset_arch=x86_64 ;; \
      arm64) asset_arch=arm64 ;; \
      *) echo "unsupported build target TARGETARCH=$TARGETARCH (supported: amd64, arm64)" >&2; exit 1 ;; \
    esac; \
    [ "$asset_arch" = "$ORCA_ARCH" ] || { \
      echo "architecture mismatch: ORCA_ARCH=$ORCA_ARCH but the build target is $TARGETARCH (asset arch $asset_arch). Update checksums.env: ORCA_ARCH=$asset_arch plus the matching ORCA_SHA256, then rebuild." >&2; \
      exit 1; }; \
    case "$ORCA_ARCH" in \
      x86_64) asset="orca-linux.AppImage" ;; \
      arm64)  asset="orca-linux-arm64.AppImage" ;; \
      *) echo "unsupported ORCA_ARCH=$ORCA_ARCH (supported: x86_64, arm64)" >&2; exit 1 ;; \
    esac; \
    url="https://github.com/stablyai/orca/releases/download/${ORCA_VERSION}/${asset}"; \
    echo "downloading $url"; \
    curl -fsSL -o /tmp/orca.AppImage "$url"; \
    echo "${ORCA_SHA256}  /tmp/orca.AppImage" | sha256sum -c -; \
    chmod +x /tmp/orca.AppImage; \
    cd /tmp && /tmp/orca.AppImage --appimage-extract >/dev/null; \
    cp -a /tmp/squashfs-root/. /opt/orca/; \
    chmod 0755 /opt/orca; \
    chmod -R a+rX /opt/orca; \
    rm -rf /tmp/squashfs-root /tmp/orca.AppImage; \
    [ -x /opt/orca/AppRun ] || { echo "extracted AppImage has no executable AppRun" >&2; exit 1; }; \
    printf '%s\n' "$ORCA_VERSION" > /opt/orca/VERSION; \
    [ "$(cat /opt/orca/VERSION)" = "$ORCA_VERSION" ] || { echo "VERSION file does not match the pinned tag" >&2; exit 1; }

# --- agent CLIs via npm ci from the committed lockfile -------------------------
# Real bins stay private at /opt/agent-cli/node_modules/.bin (NOT on the
# image-level PATH). Public command paths are the per-CLI launchers.
COPY package.json package-lock.json /opt/agent-cli/
# npm ci keeps --ignore-scripts (committed-lockfile integrity; no arbitrary
# lifecycle code from the registry). Both pinned CLIs' `bin/*.exe` targets are
# postinstall-written native binaries, so the postinstalls run explicitly
# afterwards (root, build-time), as the packages' own error messages instruct:
# `node install.cjs` (claude-code; copies the already-installed platform
# optional dependency) and `node postinstall.mjs` (opencode-ai; resolves its
# pinned platform package). The postinstalls must run here, at build time:
# node_modules stays root-owned, so uid 1000 cannot place them at runtime.
RUN npm ci --prefix /opt/agent-cli --ignore-scripts \
    && node /opt/agent-cli/node_modules/@anthropic-ai/claude-code/install.cjs \
    && cd /opt/agent-cli/node_modules/opencode-ai && node postinstall.mjs \
    && cd /opt/agent-cli \
    && npm ls --prefix /opt/agent-cli --depth=0 \
       | grep -q '@anthropic-ai/claude-code@2.1.226' \
    && npm ls --prefix /opt/agent-cli --depth=0 \
       | grep -q 'opencode-ai@1.18.15'

# --- runtime scripts and launchers --------------------------------------------
COPY entrypoint.sh /opt/orca/entrypoint.sh
COPY scripts/ /opt/orca/scripts/
RUN chmod 0755 /opt/orca/entrypoint.sh /opt/orca/scripts/*.sh

# Per-CLI credential-loading launchers at the public command paths (root-owned;
# reference the private bins by absolute path only).
COPY scripts/launcher-claude.sh /usr/local/bin/claude
COPY scripts/launcher-opencode.sh /usr/local/bin/opencode
RUN chmod 0755 /usr/local/bin/claude /usr/local/bin/opencode

USER orca
# Command pass-through: `docker run orca-environment <cmd...>` runs <cmd...> as
# the service user (throwaway checks, launcher probes); `docker run
# orca-environment` with no command starts the headless Orca server via the
# entrypoint (the fixed production contract). The entrypoint itself always
# starts the server, so pass-through lives here, at the image boundary.
ENTRYPOINT ["/bin/bash", "-c", "if [ $# -gt 0 ]; then exec \"$@\"; fi; exec /opt/orca/entrypoint.sh", "entrypoint"]
