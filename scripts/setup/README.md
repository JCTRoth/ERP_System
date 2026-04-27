# scripts/setup — Developer Environment Setup

Scripts for provisioning a development machine.

## Scripts

| Script | Purpose |
|---|---|
| `ubuntu-dev-install.sh` | Install Docker, Docker Compose, and other dev dependencies on Debian/Ubuntu |

## Usage

Run from the **repository root**:

```bash
./scripts/setup/ubuntu-dev-install.sh
```

## What it installs

- Docker Engine + Docker Compose plugin
- Node.js (via nvm or apt)
- Java 21 (Temurin)
- .NET 8 SDK
- kubectl + helm
- Other common dev tools

> Run this once on a fresh machine. Re-running is safe (idempotent).
