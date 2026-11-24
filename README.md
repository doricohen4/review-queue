# Review Queue

Educational content moderation queue for a BrainPOP take-home. Reviewers approve, reject, or send items back. A heuristic flags risk at submit time.

**Stack:** Laravel 13 (current stable; Laravel 11 is blocked by Packagist security advisories) · Vue 3 · TypeScript · SQLite · Pest · Vitest

Frontend TypeScript is strict: no `any`; shared fetch/list helpers use generics (`Paginated<T>`, `getJson<T>`). See `frontend/src/types/` once those files land.

---

## Docs

| File | Role |
|---|---|
| This README | How to run, stack, current slice. Start here. |
| [docs/PRODUCT_README.md](docs/PRODUCT_README.md) | Submission-style product writeup (decisions, tradeoffs, stretch). Not a second how-to. |
| [docs/TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md) | Design record: persistence, data model, and API — each with choice and why. Not a README replacement. |

---

## How to run

### Local (PHP 8.4+ / Node 20+)

```bash
make install
make dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000/api |
| Health | http://localhost:8000/api/health |

```bash
make test        # Pest + Vitest
make lint        # Pint + ESLint
make typecheck   # vue-tsc
make fresh       # migrate:fresh --seed
```

### Docker

Requires Docker Desktop. This machine did not have the `docker` CLI during scaffold.

```bash
docker compose up --build
```

The API container runs `migrate --seed` on boot. SQLite lives in a named volume.

**Demo identities** (no password): Alice Johnson (submitter), Bob Smith / Carol Williams (reviewers). Seed also creates extra submitters and **eight mockup items**.

---

## Slice 1 status

Scaffold only: health check, schema, demo seed, Makefile, Compose, Vue shell with atomic folders.

Heuristic pipeline, review API, and the full queue UI land in later slices. Seeded `risk_score` / `flags` are fixtures until `ModerationPipeline` exists.

Production leftovers (auth, Postgres, claims, profanity list, sanitizer, …): [docs/TECHNICAL_DESIGN.md §8](docs/TECHNICAL_DESIGN.md#8-production-backlog-living).
