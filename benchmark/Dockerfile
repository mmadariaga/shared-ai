# Image of one outcome-benchmark run: Node, git, the openspec CLI, and both harness CLIs.
# The runner builds it once per benchmark (`docker build -t sai-benchmark benchmark/`) and
# starts one fresh container per run from it. The shared-ai checkout is mounted read-only
# at /opt/shared-ai when a run starts; nothing of it is baked into the image.

FROM ubuntu:26.04

ARG NODE_MAJOR=24

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    TERM=xterm-256color

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl git gnupg \
 && curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && npm install -g npm@latest @fission-ai/openspec @anthropic-ai/claude-code opencode-ai \
 && rm -rf /var/lib/apt/lists/*

# Unprivileged user: Claude Code refuses to skip permission prompts as root.
RUN useradd -m -s /bin/bash dev \
 && mkdir /work \
 && chown dev:dev /work
USER dev
WORKDIR /work
