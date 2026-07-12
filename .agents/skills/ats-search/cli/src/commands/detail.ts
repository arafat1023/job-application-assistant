import { fetchDetail, parseId, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const parsed = parseId(opts.id)
  if (!parsed) {
    writeError(
      `invalid id "${opts.id}" — want <ats>:<company>:<jobId> (from a search result's id)`,
      "BAD_ID",
    )
    return 1
  }

  let detail
  try {
    detail = await fetchDetail(parsed.ats, parsed.company, parsed.jobId)
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "FETCH_FAILED")
    return 1
  }
  if (!detail) {
    writeError(`job not found: ${opts.id}`, "NOT_FOUND")
    return 1
  }

  if (opts.format === "plain") {
    const lines = [
      `${detail.title} — ${detail.company}`,
      `Location:     ${detail.location ?? "n/a"}${detail.remote ? " (remote)" : ""}`,
      `Department:   ${detail.department ?? "n/a"}`,
      `Type:         ${detail.employment_type ?? "n/a"}`,
      `Compensation: ${detail.compensation ?? "n/a"}`,
      `Posted:       ${detail.date ?? "n/a"}`,
      `URL:          ${detail.url}`,
      "",
      detail.description ?? "(no description)",
    ]
    process.stdout.write(lines.join("\n") + "\n")
    return 0
  }

  process.stdout.write(JSON.stringify(detail, null, 2) + "\n")
  return 0
}
