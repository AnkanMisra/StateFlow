# Docker Support

> **Status: Not Yet Supported**
> 
> Motia framework currently uses an embedded Redis Memory Server that doesn't work in Docker containers.
> This is a Motia framework limitation, not a project issue.

## Current Status

Motia's `motia dev` and `motia start` commands always start Redis Memory Server internally.
This fails in Docker Alpine/Slim containers because Redis Memory Server requires:
- Build tools (make, gcc)
- Full glibc (not musl)

## Workaround: Run Locally

For now, run the project directly:

```bash
pnpm install
pnpm dev
```

## Future Docker Usage

When Motia adds external Redis support, use:

```bash
# Development
docker-compose up dev

# Production (with Redis)
docker-compose --profile production up
```

## Files Included

| File | Purpose |
|------|---------|
| `Dockerfile` | Production multi-stage build |
| `Dockerfile.dev` | Development build |
| `docker-compose.yml` | Service orchestration |
| `.dockerignore` | Build context optimization |

## Tracking

Watch Motia releases for Docker support:
- https://github.com/motiadev/motia
