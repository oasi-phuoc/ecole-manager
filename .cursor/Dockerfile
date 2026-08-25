# Base image for the Oasis (Ecole Manager) Cloud Agent environment.
# Provides the stable system toolchain: Node.js 22 and a local PostgreSQL 16
# server. Repository dependencies and runtime services are handled by
# .cursor/install.sh, .cursor/start.sh and the environment "terminals".
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8

# System packages + PostgreSQL server. Installing postgresql creates the
# default "main" cluster; it is started at boot by .cursor/start.sh.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates curl gnupg git sudo openssl \
        postgresql postgresql-contrib \
    && install -d -m 0755 /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
        > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# The Cloud Agent runs as the "ubuntu" user; give it passwordless sudo so
# start.sh can manage the PostgreSQL service.
RUN if ! id ubuntu >/dev/null 2>&1; then useradd -m -u 1000 -s /bin/bash ubuntu; fi \
    && echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/ubuntu \
    && chmod 0440 /etc/sudoers.d/ubuntu

USER ubuntu
WORKDIR /workspace
