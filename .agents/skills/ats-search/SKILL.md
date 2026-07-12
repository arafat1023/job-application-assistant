---
name: ats-search
version: 1.0.0
description: >
  Use this skill to list and search the open roles of specific companies whose
  careers pages run on Greenhouse, Lever, or Ashby — the ATS platforms behind
  most startup and scale-up job boards — via their public job-board JSON APIs,
  or to fetch one posting's full description. Company-first: you name the
  companies, it fetches their boards. Trigger phrases: what roles is <company>
  hiring for, check <company>'s careers page / job board, open positions at
  <company>, search these companies for <role> jobs, greenhouse/lever/ashby
  posting lookup, is <company> hiring <role>.
context: fork
allowed-tools: Bash(bun run .agents/skills/ats-search/cli/src/cli.ts *)
---

# ATS Search Skill

List and search company job boards hosted on **Greenhouse**, **Lever**, and
**Ashby** — the three ATS platforms that power most startup/scale-up careers
pages. Each exposes a public, unauthenticated JSON API per company board (the
same endpoints the companies' own careers pages call). No API key, no HTML
scraping, and **zero runtime dependencies** — it runs with just `bun`.

## ⚠️ Company-first, not keyword-first

There is **no cross-company keyword index** on these platforms — that is
inherent to the APIs, not a limitation of this tool. You always name the
companies (their board slugs); the CLI fetches every open role from each board
and filters client-side. Use it to:

- Track a **watchlist of target companies** and see new roles as they open
- Check whether a specific company is hiring for a role before applying
- Pull a posting's full description for a `/apply` evaluation

For keyword-first discovery across many unknown companies, use
`freehire-search` or `hn-hiring-search`, then bring the interesting companies
back here for their full, always-current board.

## Finding a company's board slug

It's the path segment of their careers URL:

| Platform | Careers URL pattern | Slug example |
|----------|--------------------|--------------|
| Greenhouse | `boards.greenhouse.io/<slug>` or `job-boards.greenhouse.io/<slug>` | `stripe` |
| Lever | `jobs.lever.co/<slug>` | `octoenergy` |
| Ashby | `jobs.ashbyhq.com/<slug>` | `linear` |

When unsure, just try the company name — the CLI probes all three platforms
(greenhouse → lever → ashby) and reports boards it could not find on any of
them in `meta.boards_not_found`.

## Commands

### Search / list open roles

```bash
bun run .agents/skills/ats-search/cli/src/cli.ts search --company <slugs> [-q "<keywords>"] [flags]
```

Flags:
- `--company <slugs>` / `-c` — comma-separated board slugs. **Required.**
- `--query <text>` / `-q` — keyword filter on title/department/location; all
  terms must match, case-insensitive. Optional — omit to list the whole board.
- `--ats greenhouse|lever|ashby` — probe only one platform (faster when known).
- `--remote` — only roles the board marks as remote.
- `--jobage <days>` — posted within N days (undated roles are kept, since ATS
  boards only list open positions).
- `--limit <n>` / `-n` — max results after filtering. Default 25.
- `--format json|table` — default `json`.

### Fetch full job detail

```bash
bun run .agents/skills/ats-search/cli/src/cli.ts detail <id> [--format json|plain]
```

`id` is a search result's `id` — self-contained, shaped
`<ats>:<company>:<jobId>` (e.g. `greenhouse:stripe:8055701`), so no extra
flags are needed. Returns the full plain-text description plus employment
type and, where the board publishes it (Ashby), a compensation summary.

## Usage examples

```bash
# Everything Stripe and Linear have open for "engineer", newest first
bun run .agents/skills/ats-search/cli/src/cli.ts search -c stripe,linear -q engineer --format table

# Is Anthropic hiring anything remote right now?
bun run .agents/skills/ats-search/cli/src/cli.ts search -c anthropic --remote --format table

# New roles at watchlist companies in the last two weeks
bun run .agents/skills/ats-search/cli/src/cli.ts search -c stripe,linear,octoenergy --jobage 14 --format table

# Known-Lever company: skip the greenhouse probe
bun run .agents/skills/ats-search/cli/src/cli.ts search -c octoenergy --ats lever -q backend --format table

# Full posting text for an /apply evaluation
bun run .agents/skills/ats-search/cli/src/cli.ts detail greenhouse:stripe:8055701 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing a result's `id` to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

Search JSON is `{ "meta": { "count", "total", "page", "boards_not_found" },
"results": [...] }`; each result carries at least `id`, `title`, `company`,
`location`, `date`, and `url` (missing values are `null`, never omitted), plus
`ats`, `remote`, and `department`. Errors go to **stderr** as
`{ "error": "...", "code": "..." }` with exit code `1`.

## Notes

- Reads are public and unauthenticated on all three platforms; this skill is
  **search + detail only** and never touches application endpoints.
- A slug that isn't on any platform is reported in `meta.boards_not_found`
  (exit 0) — a miss on one company shouldn't kill a multi-company sweep.
- `company` is the human name when the API provides one (Greenhouse), otherwise
  the slug (Lever, Ashby).
- `date` semantics differ slightly per platform: first-published (Greenhouse,
  Ashby) vs. created-at (Lever). All are ISO-8601 in results.
- `remote` is `true`/`false` when the board states it (Lever `workplaceType`,
  Ashby `isRemote`), inferred from the location text on Greenhouse, and `null`
  when undeterminable.
- Greenhouse double-escapes description HTML; the CLI decodes it to plain text.
- The API retries 429/5xx with exponential backoff; keep runs to a handful of
  boards, not a crawl of hundreds.
