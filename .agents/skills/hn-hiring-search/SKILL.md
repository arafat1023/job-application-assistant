---
name: hn-hiring-search
version: 1.0.0
description: >
  Use this skill to find worldwide-remote software jobs that hire across borders —
  the postings a country-anchored board like LinkedIn cannot surface. Searches the
  monthly "Ask HN: Who is hiring?" thread, where hiring companies post directly and
  you apply by email or their own ATS (never a paid job board). Trigger phrases:
  remote jobs, worldwide remote, global remote, jobs that hire from anywhere,
  who is hiring, hacker news jobs, find remote work, international remote roles.
context: fork
allowed-tools: Bash(bun run .agents/skills/hn-hiring-search/cli/src/cli.ts *)
---

# HN "Who is hiring?" Search Skill

Search the monthly **Ask HN: Who is hiring?** thread from Hacker News. No authentication,
no API key, and **zero runtime dependencies** — it runs with just `bun`.

## Why this source

Most job boards anchor "remote" to a country. A role tagged *Remote — Germany* still
requires German work authorization, which is useless if you are hiring-eligible somewhere
else. The HN thread is different in three ways that matter for an internationally-based
candidate:

1. **Companies post for themselves**, and the community convention puts the remote scope
   in a pipe-delimited header line: `Railway | Product Eng | REMOTE (Worldwide) | …`.
   That makes *worldwide* eligibility machine-filterable.
2. **You apply directly** — by email, or on the company's own ATS. There is no board in
   the middle, nothing gated, and nothing to pay for.
3. **It is fresh.** A new thread lands on the 1st of each month with several hundred
   postings, all under 30 days old by construction.

The tradeoff is honest: worldwide-remote postings are a **small minority** of any thread
(typically 10–15 out of 250–500). This skill's job is to find that minority reliably
rather than to bury it.

## Commands

### Search this month's thread

```bash
bun run .agents/skills/hn-hiring-search/cli/src/cli.ts search [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — comma-separated keywords, **OR-matched** against the
  full posting text. e.g. `-q "typescript,node,vue"`.
- `--remote <mode>` — `worldwide` (**default**), `restricted`, `remote-unspecified`,
  `onsite`, or `any`.
- `--thread <id>` / `-t <id>` — a specific month's thread id. Defaults to the newest.
- `--limit <n>` / `-n <n>` — cap results emitted (client-side).
- `--format json|table|plain` — default `json`.

### List recent monthly threads

```bash
bun run .agents/skills/hn-hiring-search/cli/src/cli.ts threads [--limit <n>]
```

### Read one posting in full

```bash
bun run .agents/skills/hn-hiring-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the HN comment id from `search` results (e.g. `48754441`). A full
`news.ycombinator.com/item?id=…` URL works too. Returns the posting text plus every
contact email and apply link found in it.

## Remote-scope classification

The `remote` field is derived **only from the posting's header line**, never its body.
This is deliberate: bodies routinely say things like *"protects 500 million users
worldwide"* or *"financial inclusion globally"*, and matching those produces
false positives on companies that are in fact hybrid-onsite.

| Scope | Means | Example header |
|-------|-------|----------------|
| `worldwide` | Hires anywhere; **start here** | `REMOTE (Worldwide)`, `100% Remote (Global)`, `REMOTE ALMOST ANYWHERE IN THE WORLD` |
| `restricted` | Remote, but only within a named country/region | `Remote (US, Canada)`, `Remote — UK only`, `Remote (EU)` |
| `remote-unspecified` | Says remote, names no region — **worth an email to ask** | `Acme \| Engineer \| Remote` |
| `onsite` | Onsite or hybrid | `Seattle/London \| Hybrid` |

When a header offers both, e.g. `REMOTE(Worldwide) or ONSITE`, `worldwide` wins.

## Usage examples

```bash
# Worldwide-remote roles matching your stack (the default, and the one you want)
bun run .agents/skills/hn-hiring-search/cli/src/cli.ts search -q "typescript,node,vue,react" --format table

# Widen to postings that say "remote" without naming a region — ask them directly
bun run .agents/skills/hn-hiring-search/cli/src/cli.ts search -q "typescript,node" --remote remote-unspecified --format table

# Search last month's thread instead
bun run .agents/skills/hn-hiring-search/cli/src/cli.ts search -t 48357725 --format table

# Read one posting, with its apply email and links
bun run .agents/skills/hn-hiring-search/cli/src/cli.ts detail 48754441 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing ids to `detail`, feeding `/rank` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a posting's full text (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the
process exits with code `1`.

## Notes

- Data comes from Hacker News' public **Algolia API** (`hn.algolia.com/api/v1`) — no
  credentials, no key, no account.
- Threads are posted by the `whoishiring` account on the 1st of each month. The skill
  filters on that author, because a title search alone also matches the companion
  "Who wants to be hired?" thread.
- A full thread is ~400 KB of JSON. The CLI waits for stdout to drain before exiting, so
  piping into `jq` or a file is safe.
- The CLI retries 429/5xx with exponential backoff. Volume is trivial (one request per
  thread), so rate limits are not a practical concern.
