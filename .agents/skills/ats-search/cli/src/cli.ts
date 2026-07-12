#!/usr/bin/env bun
// Self-contained CLI for searching companies' job boards on the three dominant
// startup ATS platforms — Greenhouse, Lever, and Ashby — via their public,
// unauthenticated job-board JSON APIs. Zero runtime dependencies.
//
// Unlike keyword-first portals, ATS boards are company-first: you name the
// companies (their board slugs), the CLI fetches every open role from each
// board, and filters client-side. There is no cross-company keyword index —
// that's inherent to how these APIs work, not a limitation of this tool.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"
import { ALL_ATS, type Ats } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

const ALIAS: Record<string, string> = { q: "query", n: "limit", c: "company" }

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("-")) {
      ;(flags._ as string[]).push(a)
      continue
    }
    const name = a.replace(/^-+/, "")
    const key = ALIAS[name] ?? name
    const next = argv[i + 1]
    let value: string | boolean = true
    if (next !== undefined && !next.startsWith("-")) {
      value = next
      i++
    }
    flags[key] = value
  }
  return flags
}

const HELP = `ats-cli — search company job boards on Greenhouse, Lever, and Ashby

These ATS platforms host the careers pages of most startups and scale-ups, and
each exposes a public JSON API per company board (no API key). Boards are
company-first: name the companies, get their open roles, filter locally.

USAGE
  bun run src/cli.ts search --company <slugs> [-q "<keywords>"] [flags]
  bun run src/cli.ts detail <ats>:<company>:<jobId> [--format json|plain]

SEARCH FLAGS
  --company, -c <slugs>   Comma-separated board slugs (usually the company name
                          as it appears in its careers URL), e.g. -c stripe,linear.
                          REQUIRED — there is no cross-company keyword index.
  --query, -q <text>      Keyword filter on title/department/location (all terms
                          must match, case-insensitive). Optional.
  --ats <name>            Probe only one platform: greenhouse | lever | ashby.
                          Default: try all three per company (greenhouse first).
  --remote                Only roles the board marks/labels as remote.
  --jobage <days>         Posted within N days (undated roles are kept).
  --limit, -n <n>         Max results after filtering. Default 25.
  --format <fmt>          json (default) | table.

DETAIL
  <id>                    A search result's id, e.g. greenhouse:stripe:7954688
                          or ashby:linear:d3bc1ced-....

FINDING A COMPANY'S SLUG
  It's the path segment of their careers page:
    boards.greenhouse.io/<slug>     jobs.lever.co/<slug>     jobs.ashbyhq.com/<slug>
  When unsure, just try the company name — the CLI probes all three platforms
  and reports boards it could not find.

EXAMPLES
  bun run src/cli.ts search -c stripe,linear -q "backend engineer" --format table
  bun run src/cli.ts search -c anthropic --remote --format table
  bun run src/cli.ts search -c octoenergy --ats lever --jobage 14 --format table
  bun run src/cli.ts detail greenhouse:stripe:7954688 --format plain

No credentials required; these are the same endpoints the companies' own
careers pages call. Keep request volume polite — a handful of boards per run.
`

async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const flags = parseFlags(argv)
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  if (cmd === "search") {
    const companiesRaw = typeof flags.company === "string" ? flags.company : ""
    const companies = companiesRaw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    if (!companies.length) {
      process.stderr.write(
        JSON.stringify({
          error: "search requires --company <slugs> (ATS boards are per-company; see --help)",
          code: "NO_COMPANY",
        }) + "\n",
      )
      return 1
    }

    let ats: Ats | undefined
    if (typeof flags.ats === "string") {
      if (!ALL_ATS.includes(flags.ats as Ats)) {
        process.stderr.write(
          JSON.stringify({ error: `--ats must be one of ${ALL_ATS.join(", ")}`, code: "BAD_ARG" }) + "\n",
        )
        return 1
      }
      ats = flags.ats as Ats
    }

    let jobage: number | undefined
    if (flags.jobage !== undefined) {
      jobage = parseInt(flags.jobage as string, 10)
      if (isNaN(jobage) || jobage < 0) {
        process.stderr.write(
          JSON.stringify({ error: `--jobage must be a non-negative number, got "${flags.jobage}"`, code: "BAD_ARG" }) + "\n",
        )
        return 1
      }
    }

    let limit = 25
    if (flags.limit !== undefined) {
      limit = parseInt(flags.limit as string, 10)
      if (isNaN(limit) || limit < 1) {
        process.stderr.write(
          JSON.stringify({ error: `--limit must be a positive number, got "${flags.limit}"`, code: "BAD_ARG" }) + "\n",
        )
        return 1
      }
    }

    const fmt = (flags.format as string) || "json"
    const opts: SearchOpts = {
      companies,
      query: typeof flags.query === "string" ? flags.query : undefined,
      ats,
      remote: flags.remote === true,
      jobage,
      limit,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const id = (flags._ as string[])[1]
    if (!id) {
      process.stderr.write(
        JSON.stringify({ error: "detail requires an <ats>:<company>:<jobId> id", code: "NO_ID" }) + "\n",
      )
      return 1
    }
    const fmt = (flags.format as string) || "json"
    const opts: DetailOpts = { id, format: fmt === "plain" ? "plain" : "json" }
    return runDetail(opts)
  }

  process.stderr.write(JSON.stringify({ error: `Unknown command "${cmd}"`, code: "BAD_CMD" }) + "\n")
  return 1
}

main().then((code) => process.exit(code))
