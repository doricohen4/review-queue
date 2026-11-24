# Review Queue

BrainPOP take-home: an educational content moderation queue. Submitters send classroom copy; reviewers approve, reject, or send work back. A heuristic scores the text at submit time; a human decides.

**Stack:** Laravel 13 · PHP 8.4+ · Vue 3 · TypeScript · SQLite · Pest · Vitest · Playwright (one smoke)

---

## Documentation

There is **one** writeup. This README is only how to run the demo.

| File | What it is |
|---|---|
| This README | Install, `make dev`, demo personas |
| [docs/TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md) | The full picture: persistence, data model, state machine, API, list query, HTTP layers, trade-offs, and the build tasks from the brief |

Data model, endpoints, filters, transactions, cuts (`needs_work` vs `in_review`, PUT vs resubmit), and the task list live in the technical design — not duplicated here — so the choices stay in one organized place.

---

## How to run

### Local (PHP 8.4+ / Node 22+)

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
make e2e         # Playwright smoke (needs API + Vite; reuses `make dev` if already up)
make lint        # Pint + ESLint
make typecheck   # vue-tsc
make fresh       # migrate:fresh --seed
```

### Docker

```bash
docker compose up --build
```

The API container runs `migrate --seed` on boot. SQLite lives in a named volume.

### Demo identities

No password. Switch in the sidebar.

| Name | Roles |
|---|---|
| Alice Johnson | Submitter |
| Bob Smith | Reviewer |
| Carol Williams | Reviewer |
| Dana Cole | Both |

Personas are client-only. The API still trusts `submitter_name` / `reviewer_name`. `same_person` blocks reviewing your own item.

Seed loads a mock queue so you can filter, open a panel, and review without submitting first.
