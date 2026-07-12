# ATS API Reference

The endpoints, parameters, and response-structure notes a maintainer needs when
one of the platforms changes its API. All three are public and unauthenticated;
verified live 2026-07-12.

## Greenhouse (Job Board API)

Docs: https://developers.greenhouse.io/job-board.html

| Endpoint | Purpose |
|----------|---------|
| `GET https://boards-api.greenhouse.io/v1/boards/<slug>/jobs` | All open jobs (list shape) |
| `GET https://boards-api.greenhouse.io/v1/boards/<slug>/jobs?content=true` | List including descriptions (large!) |
| `GET https://boards-api.greenhouse.io/v1/boards/<slug>/jobs/<id>` | One job with description |

- List envelope: `{ "jobs": [...], "meta": { "total": n } }`.
- Job fields used: `id` (numeric), `title`, `absolute_url`, `location.name`,
  `first_published`, `updated_at`, `company_name`, `departments[].name`;
  detail adds `content`.
- **`content` is double-escaped HTML** (`&lt;p&gt;...`): decode entities first,
  then strip tags, then decode the text's own entities again.
- Unknown slug → HTTP 404.
- No department/office filter params worth using; filter client-side.

## Lever (Postings API)

Docs: https://github.com/lever/postings-api

| Endpoint | Purpose |
|----------|---------|
| `GET https://api.lever.co/v0/postings/<slug>?mode=json` | All published postings |
| `GET https://api.lever.co/v0/postings/<slug>/<id>` | One posting |

- List shape: a bare JSON **array** (no envelope).
- **Unknown slug returns HTTP 200 with `{"ok": false, "error": "Document not found"}`**,
  while a real-but-empty board returns `[]` — distinguish with `Array.isArray`.
- Posting fields used: `id` (UUID), `text` (title), `hostedUrl`, `createdAt`
  (epoch millis), `workplaceType` (`remote|hybrid|on-site|unspecified`),
  `categories.{location, allLocations[], commitment, department, team}`,
  `descriptionPlain`.
- Supported query params: `skip`, `limit`, `location`, `commitment`, `team`,
  `department`, `level`. We fetch all and filter client-side for consistency
  across platforms.

## Ashby (Posting API)

Docs: https://developers.ashbyhq.com/docs/public-job-posting-api

| Endpoint | Purpose |
|----------|---------|
| `GET https://api.ashbyhq.com/posting-api/job-board/<slug>` | All listed jobs **including** `descriptionPlain`/`descriptionHtml` |
| `...?includeCompensation=true` | Adds `compensation.compensationTierSummary` |

- Envelope: `{ "jobs": [...] }`. **No per-job endpoint** — `detail` refetches
  the board and picks the job out by `id`.
- Job fields used: `id` (UUID), `title`, `jobUrl`, `applyUrl`, `location`,
  `secondaryLocations[].location`, `publishedAt`, `isRemote`, `isListed`
  (filter out `false`), `employmentType`, `department`, `team`,
  `descriptionPlain`, `compensation.compensationTierSummary`.
- Unknown slug → HTTP 404 with a JSON error body.

## Contract id scheme

`<ats>:<company>:<jobId>` — e.g. `greenhouse:stripe:8055701`,
`lever:octoenergy:4936169c-...`, `ashby:linear:d3bc1ced-...`. Self-contained so
`detail` needs no flags; parsed by `parseId` in `cli/src/helpers.ts`.

## Live test slugs (used in development)

- Greenhouse: `stripe` (~500 jobs)
- Lever: `octoenergy`
- Ashby: `linear` (~24 jobs; some have compensation)
