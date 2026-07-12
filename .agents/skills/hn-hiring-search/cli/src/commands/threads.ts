import { listThreads, writeError, writeOut } from "../helpers.js"

export interface ThreadsOpts {
  limit: number
  format: "json" | "table" | "plain"
}

export async function runThreads(opts: ThreadsOpts): Promise<number> {
  try {
    const threads = await listThreads(opts.limit)
    if (opts.format === "json") {
      await writeOut(JSON.stringify({ results: threads }, null, 2) + "\n")
      return 0
    }
    if (threads.length === 0) {
      await writeOut("No threads found.\n")
      return 0
    }
    const header = "ID".padEnd(10) + " " + "DATE".padEnd(12) + " " + "POSTS".padEnd(7) + " TITLE"
    const rows = threads.map(
      (t) =>
        `${t.id.padEnd(10)} ${t.createdAt.padEnd(12)} ${String(t.numComments).padEnd(7)} ${t.title}`,
    )
    await writeOut([header, "-".repeat(header.length), ...rows].join("\n") + "\n")
    return 0
  } catch (err) {
    writeError(err instanceof Error ? err.message : String(err), "FETCH_FAILED")
    return 1
  }
}
