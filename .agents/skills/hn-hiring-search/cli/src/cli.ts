#!/usr/bin/env bun
// Self-contained CLI for searching the monthly "Ask HN: Who is hiring?" thread,
// read through Hacker News' public Algolia API. No authentication, no API key,
// zero runtime dependencies — it runs anywhere `bun` is available.
//
// Built for a candidate outside the US/EU: the --remote worldwide filter keeps
// only postings whose header advertises worldwide/global remote, which is the
// subset that will actually hire across borders. Applications go direct to the
// company by email or their own ATS, so nothing here is behind a paywall.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runThreads, type ThreadsOpts } from "./commands/threads.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"
import type { RemoteScope } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", n: "limit", t: "thread" }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("--") || a.startsWith("-")) {
      const key = alias[a.replace(/^-+/, "")] ?? a.replace(/^-+/, "")
      const next = argv[i + 1]
      if (next === undefined || next.startsWith("-")) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      ;(flags._ as string[]).push(a)
    }
  }
  return flags
}

const REMOTE_MODES = ["worldwide", "restricted", "remote-unspecified", "onsite", "any"] as const

const HELP = `hn-hiring-cli — search the monthly "Ask HN: Who is hiring?" thread

USAGE
  bun run src/cli.ts search [flags]
  bun run src/cli.ts threads [--limit <n>] [--format json|table]
  bun run src/cli.ts detail <id|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>   Comma-separated keywords, OR-matched against the full
                       posting text. e.g. -q "typescript,node,vue"
  --remote <mode>      worldwide (default) | restricted | remote-unspecified |
                       onsite | any. "worldwide" keeps only postings whose header
                       advertises worldwide/global remote — the ones that hire
                       across borders.
  --thread, -t <id>    HN thread id. Defaults to the most recent month's thread.
  --limit, -n <n>      Cap results emitted (client-side).
  --format <fmt>       json (default) | table | plain.

EXAMPLES
  # Worldwide-remote roles matching your stack, in this month's thread
  bun run src/cli.ts search -q "typescript,node,vue,react" --format table

  # Everything remote, including country-restricted, as JSON
  bun run src/cli.ts search --remote any --format json

  # Which monthly threads exist
  bun run src/cli.ts threads --limit 6

  # Read one posting in full, with its apply email/links
  bun run src/cli.ts detail 48754441 --format plain

Postings are written by the hiring companies themselves; you apply directly to
them. Data comes from HN's public Algolia API (no key, no account).
`

async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const flags = parseFlags(argv)
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  const parseIntFlag = (name: string, raw: string | boolean | string[]): number | null => {
    const val = parseInt(raw as string, 10)
    if (isNaN(val)) {
      process.stderr.write(
        JSON.stringify({ error: `--${name} must be a number, got "${raw}"`, code: "BAD_ARG" }) + "\n",
      )
      return null
    }
    return val
  }

  if (cmd === "search") {
    const fmt = (flags.format as string) || "json"
    const remoteRaw = typeof flags.remote === "string" ? flags.remote : "worldwide"
    if (!REMOTE_MODES.includes(remoteRaw as (typeof REMOTE_MODES)[number])) {
      process.stderr.write(
        JSON.stringify({
          error: `--remote must be one of ${REMOTE_MODES.join(", ")}; got "${remoteRaw}"`,
          code: "BAD_ARG",
        }) + "\n",
      )
      return 1
    }
    if (flags.limit !== undefined) {
      const v = parseIntFlag("limit", flags.limit)
      if (v === null) return 1
      flags.limit = String(v)
    }

    const opts: SearchOpts = {
      query: typeof flags.query === "string" ? flags.query : undefined,
      thread: typeof flags.thread === "string" ? flags.thread : undefined,
      remote: remoteRaw as RemoteScope | "any",
      limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "threads") {
    const fmt = (flags.format as string) || "table"
    if (flags.limit !== undefined) {
      const v = parseIntFlag("limit", flags.limit)
      if (v === null) return 1
      flags.limit = String(v)
    }
    const opts: ThreadsOpts = {
      limit: flags.limit ? Math.max(1, parseInt(flags.limit as string, 10)) : 6,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "table") as ThreadsOpts["format"],
    }
    return runThreads(opts)
  }

  if (cmd === "detail") {
    const id = (flags._ as string[])[1]
    if (!id) {
      process.stderr.write(JSON.stringify({ error: "detail requires an <id|url>", code: "NO_ID" }) + "\n")
      return 1
    }
    const fmt = (flags.format as string) || "json"
    const opts: DetailOpts = { id, format: (fmt === "plain" ? "plain" : "json") as DetailOpts["format"] }
    return runDetail(opts)
  }

  process.stderr.write(JSON.stringify({ error: `Unknown command "${cmd}"`, code: "BAD_CMD" }) + "\n")
  return 1
}

main().then((code) => process.exit(code))
