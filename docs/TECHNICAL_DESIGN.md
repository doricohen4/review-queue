# Technical Design — Review Queue

Laravel 13 API · Vue 3 SPA · SQLite (Postgres later). Runbook: [README](../README.md). Product/stretch UI: [PRODUCT_README](PRODUCT_README.md). Timebox: **6 hours**.

The brief asks for **data model, API, and persistence — choices and trade-offs**. Those are §1–2 and §4. List query is §4. HTTP layers §5. Production §8. Build order is §9 (~12 commits).

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
items     title, description, submitter_id, status,
          risk, risk_score, flags, confidence, suggested_decision
reviews   item_id, reviewer_id, decision, risk, note, created_at
```

**Indexes** (Eloquent uses them; they do not replace `ItemQuery`): `items(status)`, `items(submitter_id)`, `items(created_at)`, `reviews(item_id)`.

**Hash maps (O(1) by key):** PHP associative arrays, not a special library. (1) `TRANSITIONS[$from]` — legal next statuses without scanning every rule. (2) Heuristic `keyword => weight` so each token is a lookup, not a loop over the whole dictionary. (3) Bulk review: `Item::findMany($ids)->keyBy('id')` so each id is O(1), not “scan the collection for every id.” List filtering is SQL + **indexes**, not an in-memory map.

| Choice | Why / trade-off |
|---|---|
| Separate `reviews` | `needs_work` can happen more than once; a column on `items` would wipe history |
| Heuristic on `items` | Snapshot at submit/resubmit. Mixing it into reviews looks like the human invented the flags |
| `name_key` | Dedup names without a login system |

---

## 3. State machine (6h: ship `needs_work`, not `in_review`)

Brief minimum is **pending vs reviewed**. Split reviewed into `approved` / `rejected`, and add **`needs_work`** so “no” is not only reject (required note; resubmit re-runs the heuristic).

**Timebox:** ship **either** `needs_work` **or** `in_review`, not both. `needs_work` has more product value. Soft claim is a production add (`claimed_until` + job) — drop it first if the clock is tight. If the clock bites after `needs_work`, **`cancelled` is the next cut** (withdraw can wait; send-back cannot).

```
pending ──► approved | rejected     terminal
        └──► needs_work ──► pending  resubmit (note required)
pending ──► cancelled               terminal (submitter withdraws)
```

Illegal moves **throw**. One `TRANSITIONS` **hash map**: key = current status (O(1) lookup), value = allowed next statuses (a tiny list). Empty value `[]` = **terminal** — zero legal moves, not “anything goes.” `needs_work → pending` is the only reopen. No `in_review` in the demo map.

---

## 4. API + list query (do not thin this)

**Choice:** REST under `/api`. Queue is **one GET**; **URL is the view** (`q`, `filter[]`, dates, `sort`, `page`, `panel`). Review is **one POST command** (`ids[]`) — not `PUT` on the item.

```
GET  /api/items                 see ItemQuery below
POST /api/items                 submit (heuristic)
GET  /api/items/filters         options for the toolbar (not hard-coded in Vue)
POST /api/items/review          { ids, decision, risk, note, reviewer_name }
POST /api/items/{id}/resubmit
POST /api/items/{id}/cancel
GET  /api/items/{id}/audit
GET  /api/users?q=
```

**`ItemQuery` (filter registry):** Eloquent + indexes are the engine; **allow-listed filters** are the contract. Unknown `filter[]` / `sort` keys → **`422`** (safer to test than silent ignore). Ignore only UI-only params (`panel`). Do not ad-hoc `if ($request->has)` in the controller.

| Param | Meaning |
|---|---|
| `q` | Title/description search |
| `filter[status]`, `filter[risk]`, `filter[submitter]` | Exact / id |
| `filter[created_after]`, `filter[created_before]` | Date range on `items.created_at` |
| `sort` | Allow-listed columns only (e.g. `-created_at`) |
| `page` | Pagination; `meta.total`, `current_page`, `last_page` always present |
| `panel` | UI-only (open item); not a SQL filter |

Adding a filter = register it on `ItemQuery` + a Pest list test + toolbar control. Same registry feeds `GET /api/items/filters`.

Bulk: `data.updated` / `data.failed` (tx-per-id). Reasons: `not_found`, `invalid_transition`, `same_person`. `207` iff `failed_count > 0`.

Heuristic: small policy classes, score 0–100, not ML.

---

## 5. Controllers vs services vs ItemQuery

```
Route → FormRequest → Controller
          ├ list:     ItemQuery (registry) → Eloquent → Resource
          └ write:    Service → state machine / pipeline → Model
```

**Controller:** HTTP only — validated input in, Resource or `{ updated, failed }` out. No scoring, no `TRANSITIONS`, no `DB::transaction`.

**`ItemQuery`:** read model. Allow-list `filter[]` / dates / sort; apply indexes via Eloquent. List does **not** go through `ItemService`.

**Service** (`ItemService::submit`, `ReviewService::review`): user by `name_key`, pipeline, `assertTransition`, `same_person`, **tx-per-id** for bulk.

---

## 6. Trade-offs (6 hours)

| Ship | Cut in this timebox | Why |
|---|---|---|
| SQLite + tx-per-id bulk | Postgres in Compose | `.env` swap later |
| `needs_work` (+ `cancelled` if time) | `in_review` / claim TTL; cancel is the next cut | Send-back > withdraw > soft claim |
| `ItemQuery` registry + URL state | Thinner `?status=` only list | Interview + real queue UX |
| Pest + Vitest + **one Playwright smoke** | Full Playwright suite | See tests below |
| Bulk `ids[]` | Auth, attachments, ML | One stretch |

---

## 7. Tests — TDD

Every §9 task is **red → green → refactor**.

1. **Red** — write the Pest/Vitest in the “Red first” column; run it; it **fails**.
2. **Green** — implement only enough to pass.
3. **Refactor** — tidy with tests still green; then commit.

Pest for domain + HTTP. Vitest for URL/composable logic. **One** Playwright spec (task 12) after the UI exists — not instead of unit/feature tests.

---

## 8. Moving to production

| Area | What changes |
|---|---|
| Database | `DB_CONNECTION=pgsql`, same migrations, pooling |
| Auth | SSO; middleware sets `reviewer_name` the service already takes |
| Queue claim (not a GitHub PR) | Later: `in_review` + `claimed_until` TTL so a stale “I’m looking at this” expires. **Not** in 6h. |
| Bulk | Large batches: `202` + job; still tx-per-id inside the worker |
| List | Same `ItemQuery` registry; extra filters register the same way |
| Heuristic | Rules table or extra policy class |
| Ops | Throttle; JSON logs; expand Playwright only if the UI stays the contract |

Out of scope until then: assignment (`assigned_to`), revision diffs, BFF.

---

## 9. Build tasks (one git commit each)

About **12** commits. **Red test first** for 2–12, then green, then commit. Skip 11–12 if the clock dies.

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
| 9 | `feat: frontend — submit + personas` | Vitest or component: submit posts `submitter_name` | Form + Alice/Bob/Carol | Submit as Alice, review as Bob |
| 10 | `feat: stretch — bulk + optimistic UI` | Vitest: 207 rolls back **only** `failed[]` | Multi-select; same review endpoint | One stretch only |
| 11 | `feat: cancel` | Pest: pending → cancelled | `POST .../cancel` or **cut** | Inbox drops the item |
| 12 | `test: Playwright smoke` | Spec written first; fails until UI exists | One path: submit → queue → review | Not a full E2E suite |

**Not separate commits:** Docker, pagination-as-stretch, `in_review`, atoms-only folders, extra README files.

After 7 the API matches the brief. After 9 the UI does. 10 is extra if 9 works. Fold brief README sections into root `README.md` in commit 10 or a small `docs:` commit — do **not** keep a long `PRODUCT_README`.
