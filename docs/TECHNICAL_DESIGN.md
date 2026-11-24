# Technical Design — Review Queue

Laravel 13 API, Vue 3 SPA, SQLite. I would move to Postgres later; I did not wire it for the demo. How to run: [README](../README.md). I treated this as a **6 hour** slice.

The brief asked me for the **data model, the API, and persistence** — what I picked and what I gave up. That is this file. Persistence §1, model §2, state machine §3, list + HTTP §4, layers §5, assumptions §6, tradeoffs §7, tests §8, how I sequenced the work §9.

---

## 1. Persistence

I chose **SQLite + Eloquent** over Postgres in Compose because I wanted the same migrations in Pest, on my laptop, and in Docker, without a second service eating the clock. Jobs and cache stay local files. I would point the app at Postgres later; I did not want that to be the demo.

I chose a real database over JSON-on-disk because a review is two writes: a new review row and a new item status. Those two have to commit together or not at all. I think of that as one restaurant check: I do not charge the meal without the drink.

For bulk I chose **a transaction per id** over one outer transaction around the whole list. One bill for the table is all-or-nothing. I needed four successes and one failure in the same request — that is the failed list and HTTP **207**. So I loop, catch so #5 dying does not skip #8, and I commit #2 before I even look at #5.

Rollback only happens if SQL already started (insert the review, then the status update blows up). If the id is illegal before any write (missing, wrong status, same person), I record the reason and I have nothing to roll back.

HTTP: **200** when nothing failed, **207** when some ids failed, **422** only if the body never reaches the loop. I wrote Pest for those three. The body always has both lists (the failed list is empty on a clean run).

I wrapped the lists in the same data/meta shape as the paginated queue so the client unwraps bulk the same way. A flatter body would have worked. I picked the extra wrap for one client rule, not extra meaning.

I did not keep the queue in memory. Restart would wipe the demo.

---

## 2. Data model

I split this into four tables because a **review is not an item**, and a **history row is not a grade**. Student / homework / grade / timeline.

- **users** — a person (Alice submitted, Bob reviews). A name, plus a unique key I can look up. I did not turn this into login accounts.
- **items** — the row in the queue: title, description, current status, live heuristic. Status moves; the copy is still the homework.
- **reviews** — one human decision (approve / reject / needs_work + note). Append-only. No frozen copy here — mixing the heuristic into the grade makes it look like the reviewer invented the flags.
- **item_events** — submit, pending update, resubmit, and reviewed. Each row freezes copy + heuristic at that moment. `GET /audit` reads this table.

```
users        id, name, name_key UNIQUE
items        title (120), description (5000), submitter_id, status,
             risk, risk_score, flags, confidence, suggested_decision
reviews      item_id, reviewer_id, decision, risk, note (2000), created_at
item_events  item_id, actor_id, kind, decision, note, snapshot_*, created_at
```

I indexed status, submitter, created-at on items, and item_id on reviews. Eloquent uses those. They do not replace the list query.

I used plain PHP associative arrays as hash maps, not a fancy library. Legal next statuses are a lookup by current status. Keyword weights are a lookup by token. Bulk review loads the items once and keys them by id so I am not scanning the collection for every id. List filtering is SQL plus indexes, not an in-memory map.

I put reviews on their own table because needs_work can happen twice. A column on the item would overwrite the last note. I replace the **live** heuristic on the item on submit, pending edit, and resubmit. Old scores live on `item_events`, not on `reviews`. `latest_comment` is the newest reviewed note **after** the last author event — so the list matches “What needs to change.” The name key is how I dedup people without SSO.

---

## 3. State machine

The brief’s minimum is pending vs reviewed. I split reviewed into `approved` / `rejected`, and I added **`needs_work`** so “no” is not only reject. Send-back requires a note; resubmit runs the heuristic again.

I chose **`needs_work` over `in_review`** because I could not ship both in six hours and send-back is the product loop. A soft claim (`claimed_until` + a job) is a lock I did not have time to expire. I also **left `cancelled` out**. I was not going to build withdraw, so I did not keep a status sitting in the map with no endpoint.

```
pending ──► approved | rejected     terminal
        └──► needs_work ──► pending  POST resubmit (note already on the review)
```

Illegal moves throw. `TRANSITIONS` is a hash map: current status → allowed next statuses. Empty `[]` means terminal — zero legal moves, not “anything goes.” The only reopen is `needs_work → pending`. `PUT /api/items/{id}` edits pending copy. It is not a review and it is not a reopen.

---

## 4. API + list query

I chose REST under `/api`. I wanted the queue as **one GET**, and I wanted the **URL to be the view** (`q`, `filter[]`, dates, `sort`, `page`, `item`). I chose **POST for the review** over PUT, because PUT would overwrite the homework. Author writes use two verbs on purpose:

- **`PUT /api/items/{id}`** — I edit **pending** copy in place (stay pending, re-score).
- **`POST /api/items/{id}/resubmit`** — I reopen **needs_work → pending**. PUT on needs_work is **422**. One “save” button in the UI, two HTTP meanings.

```
GET  /api/items                 ItemQuery
POST /api/items                 submit (heuristic)
GET  /api/items/filters         toolbar options (I did not hard-code them in Vue)
POST /api/items/review          { ids, decision, risk, note, reviewer_name }
GET  /api/items/{id}            panel row (+ latest_comment)
PUT  /api/items/{id}            author revises pending copy
POST /api/items/{id}/resubmit   needs_work → pending
GET  /api/items/{id}/audit      submit / update / grade timeline
```

I cut withdraw and `GET /api/users?q=`. Personas are names in the client, not a users search API.

I built **`ItemQuery` as an allow-list** instead of a pile of `if ($request->has)` in the controller. Unknown `filter[]` / `sort` keys return **422**. I would rather fail a test than silently ignore a typo. `item` is UI-only; I do not send it to SQL.

| Param | Meaning |
|---|---|
| `q` | Title/description search. The page waits 300ms after the last keystroke |
| `filter[status]`, `filter[risk]`, `filter[submitter]` | One value or comma-OR (`pending,needs_work`). Omitted = all. `filter[status]=-` = none selected |
| `filter[created_after]`, `filter[created_before]` | Inclusive calendar days on `items.created_at` |
| `sort` | Allow-listed columns only |
| `page` | Pagination; `meta.total`, `current_page`, `last_page` always there |
| `item` | Open panel; not a SQL filter |

If I add a filter, I register it on `ItemQuery`, write a Pest list test, and add a toolbar control. The same registry feeds `GET /api/items/filters`.

Bulk reasons: `not_found`, `invalid_transition`, `same_person`. **207** only when `failed_count > 0`.

The heuristic is small policy classes, score 0–100. I did not pretend it is ML. `latest_comment` is the newest still-open reviewer note. I eager-load the actor on list, show, submit, and revise.

On the client I kept the URL as the list view and TanStack as the server cache.

After an author edit I seed the panel and the matching row from the PUT/resubmit body, then I invalidate only `['items']` so a status or risk filter can drop the row. I do not refetch the item, audit, or filters. After a review I paint optimistic statuses, then invalidate list, item, audit, and filters. **422** puts every painted id back. **207** puts back only `failed[]`. After submit I open the new row and invalidate the queue caches.

The edit dialog shares `['audit', id]` with the panel so Update does not fire a second uncached GET.

The page is one screen. Search, filters, sort, page, and the open id live in the query string. Shortcuts (**To review** = pending, **Needs work**, **Approved**, **Rejected**) write `filter[status]` the same way the column menu does. I kept pending and needs_work as two shortcuts: one is the reviewer inbox, the other is the author loop. I did not merge them. Checkboxes stay in memory. Update shows for exactly one selected row the actor can edit. The table body scrolls; the header does not. Empty `filter[status]=-` keeps the table and says no results. Toasts come in from the top right and stay five seconds.

---

## 5. Controllers vs services vs ItemQuery

```
Route → FormRequest → Controller
          ├ list:     ItemQuery (registry) → Eloquent → Resource
          └ write:    Service → state machine / pipeline → Model
```

I kept controllers as HTTP: validated input in, JSON out. I did not put scoring, the transition map, or transactions in them.

I kept **reads** on the list query and **writes** on the item/review services. I did not run the list through the write service. The services find the user by name, run the pipeline, assert the transition, block reviewing your own item, and use a transaction per id for bulk.

---

## 6. Assumptions

A typed name is a person. `name_key` treats Alice and alice as one user. I did not assume SSO or passwords. The heuristic is a hint on the row. Only a human decision changes status. One SQLite file: the same migrations run in Pest, on my laptop, and in Docker. I did not assume more than one app server.

---

## 7. Tradeoffs

**What I optimized for.** The two writes commit together, “no” is a send-back with a note, and the list URL is the view. I spent the clock on that instead of a second database, a claim lock, or a component library. Bulk `ids[]` is the stretch: four rows can commit while one comes back in `failed[]`.

**What I intentionally didn’t build.**

- **Auth.** Personas are names in the client. The body still sends `reviewer_name`. `same_person` is the guard. I did not add SSO.
- **`in_review` / claim.** A `claimed_until` lock needs a job to expire it. I shipped send-back instead. Two reviewers can still race one pending row.
- **Withdraw.** No cancel flow, so no `cancelled` status sitting in the map with no endpoint.
- **Attachments and ML.** The heuristic is keyword policy, score 0–100. A human still decides.
- **A large UI suite.** Pest and Vitest cover the rules. One Playwright smoke covers submit-then-approve. I did not browser-test every chip.

---

## 8. Tests

**What I tested.** The writes that can lie, and the client commands that paint them. Pest: illegal transitions, a keyword score, an unknown filter returning **422**, the submit snapshot, review **200** / **207** / `same_person`, needs_work without a note returning **422**, resubmit, a History row that stays frozen after a later edit, and `latest_comment` dropping after that edit. Vitest: parsing the list URL, restoring only ids in `failed[]`, and choosing PUT or resubmit from the status. One Playwright smoke: submit as Alice, approve as Bob.

**What I didn’t test.** Two browsers racing one pending row. That is the claim lock I did not build. Every chip, date range, and drawer state in a browser. The chips write the same URL Vitest already parses. Postgres. That would be these migrations on another driver, and it was not the demo.

---

## 9. How I sequenced it

Roughly eleven commits. Failing test first for 2–11, then the smallest pass. I would have dropped Playwright if the clock died.

| # | Commit | Red first | Then I built | Done when |
|---|---|---|---|---|
| 1 | scaffold | — | already on `main` | ✅ |
| 2 | `ItemStatus` + transitions | `pending → approved` OK; `approved → pending` throws. No `in_review` | Enum + `ItemStateMachine` | Illegal edges throw |
| 3 | `ModerationPipeline` | text with `password` scores ≥ 60 | Policy classes | Score, flags, suggestion |
| 4 | `ItemQuery` + `GET /api/items` | `filter[status]=pending`; unknown `filter[foo]` → 422 | Registry, Resource, `GET /filters` | Pagination `data`/`meta` |
| 5 | `POST /api/items` | 201 + snapshot | FormRequest + `ItemService::submit` | Heuristic stored |
| 6 | `POST /api/items/review` | 200 all ok; 207 mixed; `same_person` | Tx-per-id | Envelope `data` + `meta` |
| 7 | needs_work + resubmit + audit | needs_work without note → 422 | Required note, resubmit, audit GET | Comments per cycle |
| 8 | queue + URL state | parse/serialize `q` + `filter[status]` | Queue, panel | Filter URL + open panel |
| 9 | submit + personas | submit posts `submitter_name` | Form + Alice/Bob/Carol | Submit as Alice, review as Bob |
| 10 | bulk + optimistic | 207 rolls back only `failed[]` | Multi-select; same POST | One stretch |
| 11 | Playwright smoke | submit appears, reviewer can approve | `frontend/e2e/queue-smoke.spec.ts` | ✅ |

After that I added show-by-id, PUT vs resubmit, comma-OR filters, `latest_comment`, Dana, the editor, toasts, TanStack keys, min copy length, and `item_events` History (submit / update / grade with frozen copy). Same rules: no `in_review`, no `cancelled`, URL is the view, review stays `POST .../review`.

I did not make separate commits for Docker, pagination-as-stretch, claim, or withdraw.
