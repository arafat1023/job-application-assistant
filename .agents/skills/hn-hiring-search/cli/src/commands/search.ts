import {
  fetchPostings,
  listThreads,
  matchesKeywords,
  oneLine,
  writeError,
  writeOut,
  type Posting,
  type RemoteScope,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  thread?: string
  remote: RemoteScope | "any"
  limit?: number
  format: "json" | "table" | "plain"
}

function renderTable(postings: Posting[]): string {
  if (postings.length === 0) return "No results."
  const rows = postings.map((p) => {
    const id = p.id.padEnd(10)
    const company = (p.company || "—").slice(0, 24).padEnd(24)
    const scope = p.remote.slice(0, 18).padEnd(18)
    const contact = (p.emails[0] || p.urls[0] || "—").slice(0, 44)
    return `${id} ${company} ${scope} ${contact}`
  })
  const header =
    "ID".padEnd(10) + " " + "COMPANY".padEnd(24) + " " + "REMOTE".padEnd(18) + " CONTACT"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

function renderPlain(postings: Posting[]): string {
  if (postings.length === 0) return "No results."
  return postings
    .map((p) => {
      const lines = [
        `[${p.id}] ${p.company ?? "(unknown company)"}  —  ${p.remote}`,
        oneLine(p.header),
      ]
      if (p.emails.length) lines.push(`Email: ${p.emails.join(", ")}`)
      if (p.urls.length) lines.push(`Links: ${p.urls.slice(0, 3).join("  ")}`)
      lines.push(`HN:    ${p.url}`)
      return lines.join("\n")
    })
    .join("\n\n" + "-".repeat(80) + "\n\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    let threadId = opts.thread
    let threadTitle: string | undefined
    if (!threadId) {
      const threads = await listThreads(1)
      if (threads.length === 0) {
        writeError("could not find a recent 'Who is hiring?' thread", "NO_THREAD")
        return 1
      }
      threadId = threads[0].id
      threadTitle = threads[0].title
    }

    const all = await fetchPostings(threadId)
    let postings = all.filter((p) => matchesKeywords(p, opts.query))
    if (opts.remote !== "any") postings = postings.filter((p) => p.remote === opts.remote)
    const total = postings.length
    if (opts.limit && opts.limit > 0) postings = postings.slice(0, opts.limit)

    if (opts.format === "table") {
      await writeOut(renderTable(postings) + "\n")
      return 0
    }
    if (opts.format === "plain") {
      await writeOut(renderPlain(postings) + "\n")
      return 0
    }
    await writeOut(
      JSON.stringify(
        {
          meta: {
            thread: threadId,
            title: threadTitle,
            postingsInThread: all.length,
            matched: total,
            returned: postings.length,
          },
          results: postings,
        },
        null,
        2,
      ) + "\n",
    )
    return 0
  } catch (err) {
    writeError(err instanceof Error ? err.message : String(err), "FETCH_FAILED")
    return 1
  }
}
