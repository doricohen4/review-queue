# Review Queue

BrainPOP take-home. People submit classroom copy; someone else reviews it — approve, reject, or send it back with a note. A small heuristic scores the text when it comes in. A human still decides.

I built this with Laravel 13, PHP 8.4, Vue 3, TypeScript, and SQLite. Tests are Pest, Vitest, and one Playwright smoke.

I put the model, the API, and the trade-offs in [docs/TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md). This file is how I run the demo.

You can run it two ways. I use PHP and Node on my machine when I am changing code. I use Docker when I want the whole stack without installing PHP.

## Option 1 — PHP and Node on your machine

You need PHP 8.4+ and Node 22+.

```bash
make install
make dev
```

That starts the API and the Vue app.

| | |
|---|---|
| App | http://localhost:5173 |
| API | http://localhost:8000/api |
| Health | http://localhost:8000/api/health |

```bash
make test        # Pest + Vitest
make e2e         # Playwright (needs the API and Vite; fine if `make dev` is already up)
make lint
make typecheck
make fresh       # empty DB + seed
```

## Option 2 — Docker

You do not need PHP or Node installed. Docker Compose builds the API and the frontend.

```bash
docker compose up --build
```

Same URLs as above. The API container migrates and seeds on boot. SQLite sits in a named volume so the queue survives a restart of the containers.

## Who to click in the sidebar

I did not add passwords. These names only exist in the UI.

| Name | Roles |
|---|---|
| Alice Johnson | Submitter |
| Bob Smith | Reviewer |
| Carol Williams | Reviewer |
| Dana Cole | Both |

The API still takes the submitter and reviewer as names on the body. I still block you from reviewing your own item.

Seed already fills a queue, so you can filter and review without submitting first.
