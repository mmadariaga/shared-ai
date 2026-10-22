# Clean end-user environment for testing shared-ai installs.
#
# Build: docker build -t sai-clean docker/
# Run:   docker run --rm -it sai-clean
#        then: npx github:mmadariaga/shared-ai
# Local checkout instead of GitHub:
#        docker run --rm -it -v "$PWD:/src:ro" sai-clean
#        then: sai-local-install-test, then sai-local-setup-test [dir]

FROM ubuntu:26.04

ARG NODE_MAJOR=24

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    TERM=xterm-256color

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl git gnupg \
 && curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && npm install -g npm@latest \
 && rm -rf /var/lib/apt/lists/*

# Helpers for the checkout mounted at /src: sai-local-install-test, sai-local-setup-test.
COPY --chmod=755 bin/ /usr/local/bin/

# Unprivileged user, like a real developer machine; global npm installs go to $HOME.
RUN useradd -m -s /bin/bash dev
USER dev
WORKDIR /home/dev
ENV NPM_CONFIG_PREFIX=/home/dev/.npm-global \
    PATH=/home/dev/.npm-global/bin:$PATH

CMD ["bash"]
