# Review Queue

A full-stack content moderation queue built with Laravel 11 and Vue 3. Reviewers approve, reject, or request changes on submitted items. An automated moderation heuristic flags risk signals at submission time and suggests a decision.

---

## How to Run

### Option A — Docker (recommended, no prerequisites)

```bash
docker compose up
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000/api |
| Health check | http://localhost:8000/api/health |

Everything starts in one command. PHP, Node, SQLite, **migrations, and seed data** are handled inside the containers (`php artisan migrate --seed` on API boot). The demo queue is populated — not an empty table.

### Option B — Local (requires PHP 8.4+ and Node 20+)

```bash
make install   # install deps + seed demo data
make dev       # start both servers
```

```bash
make test      # Pest (backend) + Vitest (frontend)
make lint      # Pint + ESLint
make typecheck # vue-tsc
```

**Demo identities** (switch in the header — no password needed):

| Name | Role |
|---|---|
| Alice Johnson | Submitter |
| Bob Smith | Reviewer |
| Carol Williams | Reviewer |

**Seed data** (same in Docker and `make install`): those three personas plus extra submitters (Tom, Sara, Maria, Nina, John, Paul) and the **eight mockup items** as golden heuristic fixtures (login 45, password 85, math quiz 12, safety guide 38, worksheet 8, delete-all 90, geography 5, secret lab 70). Reviewers can filter, open a panel, and see flag reasons without submitting first.

---

## Key Decisions

### Data Model

Three tables: `users`, `items`, `reviews`.

**Why not merge reviews into items:** Review is a command with a history. The same item can be reviewed multiple times in the `needs_work` cycle. Storing only the latest decision on the item would destroy that history. `reviews` is append-only — rows are never updated or deleted.

**Why heuristic fields live on items, not reviews:** The moderation score (`risk_score`), flags (`["keyword:password"]`), and suggested decision are set **once at submit time** and never overwritten. They represent what the system saw when the content arrived. If I rescored on every request, the flag reasons could change retroactively — that's not useful for an audit trail.

**Why `name_key` on users:** Name normalization (trim whitespace, lowercase, collapse runs) lets "Alice Johnson" and "alice  JOHNSON" resolve to the same person without storing duplicates. The key is the normalized form; the display name keeps the original casing.

### API Design

**Single `GET /api/items` endpoint for list and search.** Two routes for the same underlying query (a common pattern) create a subtle bug: query parameters can be silently dropped when the request hits the wrong route. One endpoint, one validation contract, one place to add filters.

**`POST /api/items/review` accepts an array of ids** — `ids: [5]` for a single review, `ids: [2,5,8]` for bulk. Same endpoint, same validation, same service loop. Response uses the same envelope as the list: `{ data: { updated, failed }, meta: { updated_count, failed_count } }`. **`200`** if nothing failed, **`207`** if `failed_count > 0`. Partial failures are per-item; the rest of the batch still succeeds.

**`GET /api/items/filters`** returns the available filter options (statuses, risk levels, submitter list) so the frontend never hard-codes backend enum values. The submitter dropdown refetches each time you open the queue — new submitters appear without a page reload.

**`GET` with query params for search**, not `POST` with a JSON body. Filters are simple scalars. The URL is the state: it's shareable, bookmarkable, and TanStack Query uses the serialized URL as the cache key so filter changes automatically invalidate the cache. Single endpoint — no `/items/search` split that silently drops the `q` parameter when the wrong route is matched.

### Persistence

**SQLite for the take-home**, behind Eloquent. A review is two writes (audit row + item status); they run in one database transaction. File-based or in-memory stores cannot give that guarantee without reinventing a database. Production is `DB_CONNECTION=pgsql` and the same migrations — see [Technical Design — Persistence](TECHNICAL_DESIGN.md#persistence).

### Moderation Heuristic

The heuristic is a **policy pipeline**, not a utility function. Each rule implements a `ModerationPolicy` interface. The pipeline runs all registered policies, aggregates a `risk_score` (0–100), derives a `RiskLevel`, and calculates a `confidence` level.

**Why a strategy interface:** Adding a new rule in the follow-up interview is a 2-minute live change — implement the interface, register in `config/moderation.php`, done. The service layer never changes.

**Why keyword + structural rules (not ML):** Deterministic, explainable, and unit-testable with zero infrastructure. The interface is designed so an ML scorer can replace or supplement these implementations later without changing the pipeline.

**How the scoring model works — thresholds first, weights derived:**

| Score | Risk | Suggestion |
|---|---|---|
| 0–29 | low | approve |
| 30–59 | medium | approve (review carefully) |
| 60–84 | high | reject |
| 85–100 | critical | reject |

A single `password` keyword scores 60 — exactly the high threshold. That is intentional: credential exposure in educational content is never borderline. `urgent` alone scores 25 — medium — because urgency appears in legitimate submissions too. Structural issues (caps, short title) max at 35 combined because formatting problems warrant review, not auto-rejection.

**Confidence** is deterministic (not ML): `high` when one flag alone is decisive or 3+ independent flags fired; `medium` for two flags; `low` for structural-only signals. The reviewer sees each flag with its weight and a plain-English reason — no black box.

The `suggested_decision` field is stored in the DB but **not surfaced in the UI**. The reviewer reads the evidence (score, flags, confidence, reasons) and decides independently. The heuristic informs, it does not decide.

Current policies:
- `KeywordPolicy` — weighted keyword scan (password, credentials, urgent, etc.)
- `StructuralPolicy` — excessive caps (>60% uppercase), very short title

**MCP readiness:** The API is resource-oriented with typed JSON responses and machine-readable error codes. A later tool layer could wrap the same endpoints with no API changes — see [Technical Design — API](TECHNICAL_DESIGN.md#api).

### State Machine

Status transitions are an explicit map in `ItemStateMachine`. Illegal transitions throw `InvalidTransitionException` — they never silently corrupt state.

```
pending → approved | rejected     (terminal)
       → needs_work → pending     (submitter resubmits; note required)
pending → cancelled               (terminal)
```

**6h:** ship `needs_work`, not `in_review`. Send-back is the product loop; a soft claim is not a lock and costs another status + UI. Production: `in_review` + `claimed_until` + a scheduled release — see [Technical Design §3](TECHNICAL_DESIGN.md#3-state-machine-6h-ship-needs_work-not-in_review).

---

## Assumptions

**Educational content context.** The brief says "items (e.g., short posts, tickets, reports)." I treated these as educational content submissions — the heuristic keywords and risk signals reflect that framing.

**Identity by name.** The brief allows this. Anyone can type any name; the self-review rule is a guard against honest mistakes, not a security control. See [Production Roadmap](#production-roadmap) for how this changes with real auth.

**One reviewer per decision.** The current model assumes one reviewer takes action on a pending item. Multi-reviewer consensus (e.g., two approvals required) is out of scope but the `reviews` table supports it — it's a service-layer rule change.

**`needs_work` requires a note.** Sending something back without explanation isn't useful. The API validates that `note` is present when `decision = needs_work`.

---

## Tradeoffs

### Optimized for

- **Correctness** — real transactions, explicit state machine, immutable audit trail
- **Extensibility** — every likely follow-up interview change (new rule, new state, new filter) is a 2-minute live edit
- **Reasoning clarity** — README explains why, not just what

### Stretch goal chosen: bulk review with optimistic UI

The brief says pick **at most one** stretch. I chose **bulk review** — the most visible and product-relevant feature for a moderation queue where reviewers process items at scale.

**How it works without blocking the user (optimistic UI):**
Clicking "Approve 5" immediately marks all 5 items as approved in the UI. The POST fires in the background. For a `207 Multi-Status` partial failure, only the failed items are rolled back — the successful ones stay. The reviewer never sees a spinner for common fast operations.

**HTTP 207 Multi-Status for partial failures:**
- `200` — all items succeeded
- `207` — some items succeeded, some failed (each with a `reason`)
- `422` — request body is invalid (never reaches the loop)

The response always returns `{ data: { updated, failed }, meta: { updated_count, failed_count } }` (same envelope as the paginated list). Full item objects in `updated` so the frontend hydrates cache without an extra refetch. **`200`** if `failed` is empty; **`207`** if `failed_count > 0`; **`422`** if the body is invalid (never reaches the loop).

**Quick actions for high-confidence items:**
When the heuristic `confidence` is `high`, a small inline action button appears in the table row (`[Reject]` for score ≥ 60, `[Approve]` for score < 30). Medium and low confidence items require the reviewer to open the panel and read the reasoning. This makes `confidence` do real UX work, not just display work.

**Side panel URL:** panel state lives in `?panel=5` query param — the link is shareable and deep-linkable while the queue URL and filter state are fully preserved.

**Row-click modes:** when 0 rows are selected, clicking a row opens the panel. When ≥1 rows are selected, clicking a row toggles its checkbox (selection mode). Opening the panel while in selection mode is a UX bug — this design prevents it.

**On pagination:** The API always returns paginated responses — `meta.total`, `meta.current_page`, and `meta.last_page` are always present. This is baseline, not the stretch. I chose basic prev/next for the take-home; a production review queue would use load-more + virtual windowing — reviewers are in triage mode (scroll, act), not audit mode. The API stays identical either way.

### Dark theme and responsive (in scope)

These are product requirements for the take-home, not follow-up extras.

**Dark theme:** Tailwind `class` strategy, semantic color tokens, Pinia `theme` store (`light | dark | system`) in `localStorage`. Toggle in the top toolbar; Settings uses the same store. Feature components do not hard-code light grays.

**Responsive:** desktop matches the mockup. Below `lg`, the sidebar becomes a drawer. Below `md`, the queue is stacked cards, the review panel is a full-screen sheet, and the bulk bar stays floating. Deep links (`?panel=`) work on all sizes.

**Production async path for large batches:** `202 Accepted` + job ID + SSE for progress. The service layer doesn't change — the controller decides inline vs enqueue based on batch size. For the take-home, optimistic UI is the right proxy for async behaviour on small batches.

### Intentionally not built

| Feature | Why skipped |
|---|---|
| Real auth (Sanctum/OIDC) | Optional stretch; localStorage personas demo different roles |
| Optimistic updates standalone | Implemented as part of bulk review — not a separate feature |
| Text diff / revision history | Not in brief; natural "next feature" to discuss |
| Soft `in_review` / claim TTL | 6h: `needs_work` instead; lock is a production add |
| Full Docker Compose for Postgres | SQLite needs no DB container; Docker is used for PHP/Node isolation only |
| Full E2E suite | 2h cost; Pest + Vitest cover the critical paths |
| File attachments | Not implied by brief; S3 path noted in production roadmap |
| BFF layer | No benefit with one frontend client |
| Assignment model ("assign to me") | Not in brief; natural next feature — needs `assigned_to` FK on items, new state transition, and filter. Data model supports it with one column addition. |

---

## Commit Plan

15 commits, each a vertical slice (backend + frontend together where applicable):

```
feat: scaffold — Laravel 11 + Vue 3 + SQLite + Makefile + docker-compose + seed
feat: domain — ItemStateMachine with explicit TRANSITIONS map
feat: domain — ModerationPipeline + KeywordPolicy + StructuralPolicy
feat: users — UserRepository + GET /api/users autocomplete
feat: submit — POST /api/items with heuristic (risk_score, flags, confidence)
feat: review — POST /api/items/review single+bulk, 200/207, state machine, audit
feat: audit — GET /api/items/{id}/audit paginated review history
feat: cancel + resubmit — POST cancel + resubmit endpoints
feat: list + filters — GET /api/items + GET /api/items/filters metadata
feat: frontend — atoms/tokens + theme store (Vitest) + identity
feat: frontend — composables TDD: useQueryState, useSelection, useBreakpoint
feat: frontend — AppShell responsive (drawer, toolbar, cards vs table)
feat: frontend — ItemsTable + QueueToolbar + pagination + quick-action buttons
feat: frontend — ReviewPanel with score bar, flag cards, confidence reasoning
feat: frontend — SubmitForm with user combobox
feat: stretch — BulkActionBar + useReviewMutation with optimistic UI + 207 rollback
test: StateMachine, ModerationPipeline, review API, bulk 207, same-person, theme store
```

---

## Testing

### What I tested and why

**Moderation pipeline unit tests** — the heuristic is the brief's main explicit requirement. I test each policy in isolation (keyword matching, caps threshold, title length) and the pipeline's score aggregation and risk derivation. If a rule is broken, these tests catch it before it affects any submission.

**State machine unit tests** — every legal transition asserts no exception; every illegal transition asserts `InvalidTransitionException`. Terminal states are verified to have no outgoing transitions.

**Review API feature tests** — happy path (single review, bulk review), error paths (self-review rejection, already-reviewed item, invalid transition), and validation contracts (missing fields, bad enum values).

**TanStack mutation rollback** — Vitest tests verify that an optimistic status update is reversed when the server returns a 422 or `invalid_transition` error, and that a 207 rolls back only `failed[]`.

**Composable (hook) unit tests** — `useQueryState`, `useSelection`, `useBreakpoint`, and the theme store are tested without mounting pages. Logic is in composables so the follow-up interview can fail a Vitest file first, then patch one function.

**Atomic UI** — atoms have no fetch/Pinia. Organisms (`ItemsTable`, `ReviewPanel`, `QueueToolbar`) call composables. Pages only compose.

### What I didn't test and why

**Full Playwright suite** — a complete submit → queue → review → audit browser matrix does not fit the 6h timebox. **One smoke spec** (submit appears in the queue, then a review) is in scope so the demo path is not only Pest. Filter combinations stay in Pest `ItemQuery` tests.

**`in_review` timeout** — not shipped in this timebox; nothing to test until the production claim job exists.

**Auth flows** — there is no auth server, so there are no auth tests.

---

## Production Roadmap

### Auth
Google Workspace SSO via Sanctum + OIDC. The service layer takes `reviewer_name` as a string — middleware sets it from the JWT claim. Zero domain logic changes.

### Storage
`DB_CONNECTION=pgsql` in `.env`. Run the same migrations. Add PgBouncer for connection pooling. No repository changes.

### `in_review` hard lock
Add `claimed_until TIMESTAMP` to items. Scheduled job releases stale claims every 5 minutes. Add `PATCH /api/items/{id}/claim` and `DELETE /api/items/{id}/claim`.

### Heuristic evolution
Replace hardcoded keyword weights with a `moderation_rules` table. Admin UI to manage rules without deploys. Add an ML scorer implementing the same `ModerationPolicy` interface — the pipeline doesn't change.

### Rate limiting
`throttle` middleware on submit and review endpoints. Per-IP limit on submit; per-user limit on review.

### Observability
Structured JSON logs with request IDs. Laravel Telescope in staging. Sentry for error tracking. Datadog APM for performance.

### Audit completeness
Add `item_revisions` table to track content changes in the `needs_work` cycle. Merge revisions and review decisions into a unified timeline endpoint with computed line-level diffs.

---

## Project Structure

```
backend/
  app/
    Domain/
      ItemStateMachine.php
      Moderation/
        Contracts/ModerationPolicy.php
        Policies/KeywordPolicy.php
        Policies/StructuralPolicy.php
        PolicyFlag.php
        ModerationResult.php
    Services/
      ItemService.php
      ReviewService.php
      ModerationPipeline.php
    Repositories/
      Contracts/          interfaces
      Eloquent/           implementations
    Http/
      Controllers/
      Requests/
      Resources/
    Enums/
      ItemStatus.php
      ReviewDecision.php
      RiskLevel.php
  database/
    migrations/
    seeders/

frontend/
  src/
    api/           typed API calls
    queries/       TanStack Query hooks
    components/
      queue/
      item/
      ui/          shadcn-vue primitives
    composables/   useQueryState, useSelection, useIdentity
    stores/        identity, theme
    views/
    types/
```

---

## API Reference

| Endpoint | Purpose |
|---|---|
| `GET  /api/health` | Liveness check |
| `GET  /api/items` | List + search + filter + sort + paginate |
| `POST /api/items` | Submit new item (triggers heuristic analysis) |
| `GET  /api/items/{id}` | Single item with latest review |
| `POST /api/items/review` | Review — single (`ids:[5]`) or bulk (`ids:[2,5,8]`) |
| `POST /api/items/{id}/cancel` | Submitter withdraws |
| `POST /api/items/{id}/resubmit` | Submitter edits + resubmits after needs_work |
| `GET  /api/items/{id}/audit` | Paginated review history |
| `GET  /api/items/filters` | Filter metadata — options + sort labels for UI |
| `GET  /api/users?q=` | Name autocomplete (min 2 chars, top 10) |

Error contract: every error returns `{ "message": "...", "code": "...", "errors"?: {} }`

**Review endpoint status codes:**
- `200` — `failed_count === 0` (both lists still present; `failed` is `[]`)
- `207 Multi-Status` — `failed_count > 0`
- `422` — request body invalid (bad `decision`, missing fields — never reaches the loop). Unknown list `filter[]` / `sort` keys are also `422`; `panel` is ignored (UI-only).

**Per-item failure reasons in `data.failed[]`:** `invalid_transition`, `same_person`, `already_reviewed`, `not_found`

**Other error codes:**

| Code | Status | Meaning |
|---|---|---|
| `validation_failed` | 422 | Invalid request body or params |
| `not_found` | 404 | Item does not exist |
| `server_error` | 500 | Unexpected error |
