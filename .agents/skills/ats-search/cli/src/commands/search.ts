import {
  ALL_ATS,
  findBoard,
  matchesQuery,
  writeError,
  type Ats,
  type JobResult,
} from "../helpers.js"

export interface SearchOpts {
  companies: string[]
  query?: string
  ats?: Ats
  remote: boolean
  jobage?: number
  limit: number
  format: "json" | "table" | "plain"
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  const results: JobResult[] = []
  const misses: string[] = []

  for (const company of opts.companies) {
    let board
    try {
      board = await findBoard(company, opts.ats)
    } catch (e) {
      writeError(e instanceof Error ? e.message : String(e), "FETCH_FAILED")
      return 1
    }
    if (!board) {
      misses.push(company)
      continue
    }
    results.push(...board.jobs)
  }

  let filtered = results
  if (opts.query) filtered = filtered.filter((j) => matchesQuery(j, opts.query!))
  if (opts.remote) filtered = filtered.filter((j) => j.remote === true)
  if (opts.jobage !== undefined) {
    const cutoff = Date.now() - opts.jobage * 24 * 60 * 60 * 1000
    // Undated jobs are kept: an ATS board only lists open roles, so absence of
    // a date must not silently hide live postings from an age filter.
    filtered = filtered.filter((j) => !j.date || new Date(j.date).getTime() >= cutoff)
  }

  filtered.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
  const limited = filtered.slice(0, opts.limit)

  if (opts.format === "table" || opts.format === "plain") {
    if (misses.length) {
      process.stdout.write(
        `(no ${opts.ats ?? ALL_ATS.join("/")} board found for: ${misses.join(", ")})\n`,
      )
    }
    if (!limited.length) {
      process.stdout.write("No matching jobs.\n")
      return 0
    }
    const rows = limited.map((j) => [
      j.id,
      j.title.slice(0, 48),
      j.company,
      (j.location ?? "").slice(0, 32),
      j.date ? j.date.slice(0, 10) : "",
    ])
    const headers = ["ID", "TITLE", "COMPANY", "LOCATION", "DATE"]
    const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
    const line = (cells: string[]) =>
      cells.map((c, i) => c.padEnd(widths[i])).join("  ") + "\n"
    process.stdout.write(line(headers))
    process.stdout.write(line(widths.map((w) => "-".repeat(w))))
    for (const r of rows) process.stdout.write(line(r))
    return 0
  }

  process.stdout.write(
    JSON.stringify(
      {
        meta: {
          count: limited.length,
          total: filtered.length,
          page: 1,
          boards_not_found: misses,
        },
        results: limited,
      },
      null,
      2,
    ) + "\n",
  )
  return 0
}
