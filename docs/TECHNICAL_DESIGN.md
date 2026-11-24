# Technical Design — Review Queue

Laravel 13 API · Vue 3 SPA · SQLite (Postgres later). How to run: [README](../README.md). Timebox: **6 hours**.

This file is the writeup for the brief: **data model, API, and persistence — choices and trade-offs**. Persistence §1. Model §2. State machine §3. List query and HTTP API §4. Controllers vs services §5. Cuts §6. Tests §7. Build tasks §8. What we skipped on purpose is not duplicated here.

---

## 1. Persistence

**Choice:** SQLite behind Eloquent. Same migrations in Pest (`:memory:`), local, and Docker. Jobs/cache stay `sync` / `file` for the demo.

A **single** review action is two writes (insert `reviews` + update `items.status`). They share **one ACID transaction**: both commit or neither does. Analogy: one person’s restaurant check — you don’t charge the meal without the drink, or the reverse.

**Bulk (`ids[]`):** like **separate checks**, not one bill for the table.

- Loop each id. **Try/catch** so a failure on #5 does not abort the PHP request (so #8 still runs).
- **Transaction per id.** Commit #2 before you even look at #5. One outer `BEGIN` around the whole loop is one check: `COMMIT`/`ROLLBACK` is all-or-nothing, so you cannot keep four successes and drop one failure.
- **When rollback actually runs:** only if SQL already started (insert review, then update status throws). If the id is illegal *before* any write (`not_found`, `invalid_transition`, `same_person`), skip it, push `{ id, reason }` to `failed[]`, **no rollback** (nothing was written).
- **HTTP:** `200` when `failed_count === 0`; **`207` when `failed_count > 0`**; `422` only if the body never reaches the loop. Pest asserts those three. Body **always** has both lists (empty `failed` on full success).
- **Envelope:** `{ data: { updated, failed }, meta: { updated_count, failed_count } }` — same `data`/`meta` shape as paginated `GET /api/items`, so the client has one unwrap rule. Flattened `{ updated, failed }` would work; wrapping is for consistency, not extra meaning.

| Alternative | Trade-off |
|---|---|
| JSON / files | Simple demo, **no** transaction across entities |
| Postgres in the demo | Right for prod, extra service for a 6h run |
| One outer bulk tx | All-or-nothing — fights partial `failed[]` |
| Memory only | Demo queue dies on restart |

---

## 2. Data model

Three tables. A **review is not an item.** Everyday parallel: **student / homework / grade**.

| Table | What it is | What it is not |
|---|---|---|
| **`users`** | A person (Alice submitted, Bob reviews). `name` + unique `name_key`. | Not a login account in the 6h demo. |
| **`items`** | One piece of **content in the queue** — title, description, current `status`, heuristic snapshot. The row the table/list shows. | Not a decision. Status changes; the content is the homework. |
| **`reviews`** | One **human decision** on an item (approve / reject / needs_work + note). Append-only. The audit timeline. | Not a second copy of the content. Many reviews can point at **one** item (`needs_work` cycle). |

```
users     id, name, name_key UNIQUE
items     title (120), description (5000), submitter_id, status,
          risk, risk_score, flags, confidence, suggested_decision
reviews   item_id, reviewer_id, decision, risk, note (2000), created_at
```

**Indexes** (Eloquent uses them; they do not replace `ItemQuery`): `items(status)`, `items(submitter_id)`, `items(created_at)`, `reviews(item_id)`.

**Hash maps (O(1) by key):** PHP associative arrays, not a special library. (1) `TRANSITIONS[$from]` — legal next statuses without scanning every rule. (2) Heuristic `keyword => weight` so each token is a lookup, not a loop over the whole dictionary. (3) Bulk review: `Item::findMany($ids)->keyBy('id')` so each id is O(1), not “scan the collection for every id.” List filtering is SQL + **indexes**, not an in-memory map.

| Choice | Why / trade-off |
|---|---|
| Separate `reviews` | `needs_work` can happen more than once; a column on `items` would wipe history |
| Heuristic on `items` | Snapshot replaced on submit, pending revise, and resubmit. Old scores are not kept. Mixing the score into reviews looks like the human invented the flags |
| `name_key` | Dedup names without a login system |

---

## 3. State machine (6h: ship `needs_work`, not `in_review`)

Brief minimum is **pending vs reviewed**. Split reviewed into `approved` / `rejected`, and add **`needs_work`** so “no” is not only reject (required note; resubmit re-runs the heuristic).

**Timebox:** ship **either** `needs_work` **or** `in_review`, not both. `needs_work` has more product value. Soft claim is a later add (`claimed_until` + job). There is **no** `cancelled` status and no withdraw endpoint.

```
pending ──► approved | rejected     terminal
        └──► needs_work ──► pending  POST resubmit (note already on the review)
```

Illegal moves **throw**. One `TRANSITIONS` **hash map**: key = current status (O(1) lookup), value = allowed next statuses (a tiny list). Empty value `[]` = **terminal** — zero legal moves, not “anything goes.” `needs_work → pending` is the only reopen. No `in_review`. `PUT /api/items/{id}` is **pending content revise**, not a review decision and not a reopen.

---

## 4. API + list query (do not thin this)

**Choice:** REST under `/api`. Queue is **one GET**; **URL is the view** (`q`, `filter[]`, dates, `sort`, `page`, `item`). Review is **one POST command** (`ids[]`) — not `PUT` for the decision. `PUT` and `POST .../resubmit` are both author writes, with different verbs:

- **`PUT /api/items/{id}`** — edit **pending** copy in place (stay pending, re-score).
- **`POST /api/items/{id}/resubmit`** — **needs_work → pending** (the only reopen). PUT on `needs_work` is **422**.

```
GET  /api/items                 see ItemQuery below
POST /api/items                 submit (heuristic)
GET  /api/items/filters         options for the toolbar (not hard-coded in Vue)
POST /api/items/review          { ids, decision, risk, note, reviewer_name }
GET  /api/items/{id}            panel row (+ latest_comment)
PUT  /api/items/{id}            author revise pending copy in place
POST /api/items/{id}/resubmit   needs_work → pending (PUT cannot do this)
GET  /api/items/{id}/audit      append-only review notes
```

**Cut:** withdraw/cancel, `GET /api/users?q=`. Personas are client-side names, not a users search API.

**`ItemQuery` (filter registry):** Eloquent + indexes are the engine; **allow-listed filters** are the contract. Unknown `filter[]` / `sort` keys → **`422`** (safer to test than silent ignore). Ignore only UI-only params (`item`). Do not ad-hoc `if ($request->has)` in the controller.

| Param | Meaning |
|---|---|
| `q` | Title/description search. The page writes it 300ms after the last keystroke |
| `filter[status]`, `filter[risk]`, `filter[submitter]` | One value or comma-OR (`pending,needs_work`) / ids. `filter[status]=-` is explicit empty (no rows). Omitted means all |
| `filter[created_after]`, `filter[created_before]` | Inclusive calendar-day range on `items.created_at` |
| `sort` | Allow-listed columns only (e.g. `-created_at`, `-updated_at`) |
| `page` | Pagination; `meta.total`, `current_page`, `last_page` always present |
| `item` | UI-only (open panel); not a SQL filter |

Adding a filter = register it on `ItemQuery` + a Pest list test + toolbar control. Same registry feeds `GET /api/items/filters`.

Bulk: `data.updated` / `data.failed` (tx-per-id). Reasons: `not_found`, `invalid_transition`, `same_person`. `207` iff `failed_count > 0`.

Heuristic: small policy classes, score 0–100, not ML. `latest_comment` is the newest review whose note is non-empty, eager-loaded with the reviewer on list, show, submit, and revise.

**Client after a write.** The URL stays the source of truth for the list. TanStack holds server payloads.

| Write | What the client does next |
|---|---|
| Author edit (`PUT` or `POST .../resubmit`) | Seed the open item and the matching list row from the response. Invalidate **only** `['items']`, so a status or risk filter can drop the row. Do not refetch the item, `/audit`, or `/filters`. |
| Review (`POST .../review`) | Paint optimistic rows, then invalidate list, item, audit, and filters. **422** restores every painted id. **207** restores only `failed[]`. |
| Submit | Open the new row and invalidate the queue caches. |

The edit dialog reads audit through the same `['audit', id]` query as the panel, so opening Update does not start a second uncached GET.

**Page, checked against this design.** One queue screen. Search, filters, sort, page, and the open id are the query string. Status shortcuts (**To review** = pending, **Needs work**, **Approved**, **Rejected**) write `filter[status]` the same way as the column menu. Pending and needs_work stay separate: one is the reviewer inbox, the other is the author loop. Selection is in-memory. Update is shown for exactly one selected row the actor can edit (`pending` for PUT, `needs_work` for resubmit, author only). The table region scrolls; the header row does not. Empty `filter[status]=-` keeps the table and says no results. Dark theme includes the sticky header. Toasts come in from the top right and stay 5 seconds.

---

## 5. Controllers vs services vs ItemQuery

```
Route → FormRequest → Controller
          ├ list:     ItemQuery (registry) → Eloquent → Resource
          └ write:    Service → state machine / pipeline → Model
```

**Controller:** HTTP only — validated input in, Resource or `{ updated, failed }` out. No scoring, no `TRANSITIONS`, no `DB::transaction`.

**`ItemQuery`:** read model. Allow-list `filter[]` / dates / sort; apply indexes via Eloquent. List does **not** go through `ItemService`.

**Service** (`ItemService::submit` / `revise` / `resubmit`, `ReviewService::review`): user by `name_key`, pipeline, `assertTransition`, `same_person`, **tx-per-id** for bulk.

---

## 6. Trade-offs (6 hours)

| Ship | Cut in this timebox | Why |
|---|---|---|
| SQLite + tx-per-id bulk | Postgres in Compose | `.env` swap later |
| `needs_work` | `in_review` / claim TTL / withdraw | Send-back > lock > cancel |
| `ItemQuery` registry + URL state | Thinner `?status=` only list | Interview + real queue UX |
| Pest + Vitest + one Playwright smoke | Broader UI suite | See tests below |
| Bulk `ids[]` + optimistic UI | Auth, attachments, ML | Stretch **shipped** |

---

## 7. Tests — TDD

Every §8 task is **red → green → refactor**.

1. **Red** — write the Pest/Vitest in the “Red first” column; run it; it **fails**.
2. **Green** — implement only enough to pass.
3. **Refactor** — tidy with tests still green; then commit.

Pest for domain + HTTP. Vitest for URL/composable logic. **One** Playwright spec (task 11) after the UI exists — not instead of unit/feature tests.

---

## 8. Build tasks (one git commit each)

About **11** commits. **Red test first** for 2–11, then green, then commit. Skip the Playwright smoke if the clock dies.

| # | Commit | Red first (failing test) | Then build | Done when |
|---|---|---|---|---|
| 1 | `feat: scaffold` | — | Already on `main` | ✅ |
| 2 | `feat: domain — ItemStatus + transitions` | Pest: `pending → approved` OK; `approved → pending` throws. No `in_review`. | Enum + `ItemStateMachine` | Illegal edges throw |
| 3 | `feat: domain — ModerationPipeline` | Pest: text with `password` scores ≥ 60 + a flag | Policies + `evaluate()` | Score, flags, suggestion |
| 4 | `feat: list — ItemQuery + GET /api/items` | Pest: `filter[status]=pending`; unknown `filter[foo]` → **422**; `panel` OK | Registry, Resource, `GET /filters` | Pagination `data`/`meta` |
| 5 | `feat: submit — POST /api/items` | Pest: 201; item has `risk_score` / `flags` from pipeline | FormRequest + `ItemService::submit` | Heuristic snapshot stored |
| 6 | `feat: review — POST /api/items/review` | Pest: one id → **200**, `failed=[]`; mixed ids → **207** + `failed[]`; `same_person` | Tx-per-id, try/catch | Envelope `data` + `meta` |
| 7 | `feat: needs_work — note + resubmit + audit` | Pest: `needs_work` without note → **422**; with note + resubmit → two audit rows | Required note, resubmit, `GET .../audit` | Comments per cycle |
| 8 | `feat: frontend — queue + URL state` | Vitest: `useQueryState` parse/serialize `q` + `filter[status]` | Queue, panel, `getJson<T>` | Filter URL + open panel |
| 9 | `feat: frontend — submit + personas` | Vitest or component: submit posts `submitter_name` | Form + Alice/Bob/Carol | Submit as Alice, review as Bob | ✅ |
| 10 | `feat: stretch — bulk + optimistic UI` | Vitest: 207 rolls back **only** `failed[]` | Multi-select; same review endpoint | One stretch only | ✅ |
| 11 | `test: Playwright smoke` | Spec: submit appears, reviewer can approve | `frontend/e2e/queue-smoke.spec.ts` | ✅ |

**Landed after 9–10 (QA):** `GET /api/items/{id}`, `PUT` pending revise vs `POST` resubmit, comma-OR filters, `latest_comment`, dual-role persona (Dana), editor modal, toasts, TanStack Query keys, split queue helpers. Same rules: no `in_review`, no `cancelled`, URL is the view, review stays `POST .../review`.

**Not separate commits:** Docker, pagination-as-stretch, `in_review`, withdraw/cancel, atoms-only folders.

After 7 the API matches the brief. After 9 the UI does. 10 (bulk + optimistic) and 11 (smoke) shipped.
