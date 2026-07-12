import { ALGOLIA, jsonFetch, parsePosting, writeError, writeOut } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

/** Accept a bare comment id, or an HN item URL. */
function normalizeId(raw: string): string | null {
  const m = raw.match(/(?:id=)?(\d{5,})/)
  return m ? m[1] : null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`could not parse an HN item id from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const item = await jsonFetch<{ id: number; text: string | null }>(`${ALGOLIA}/items/${id}`)
    if (!item.text) {
      writeError(`item ${id} has no text (is it a story rather than a posting?)`, "NO_TEXT")
      return 1
    }
    const posting = parsePosting(String(item.id), item.text)

    if (opts.format === "plain") {
      const lines = [
        posting.company ?? "(unknown company)",
        `Remote scope: ${posting.remote}`,
        "",
        posting.text,
        "",
      ]
      if (posting.emails.length) lines.push(`Email: ${posting.emails.join(", ")}`)
      if (posting.urls.length) lines.push(`Links: ${posting.urls.join("\n       ")}`)
      lines.push(`HN:    ${posting.url}`)
      await writeOut(lines.join("\n") + "\n")
      return 0
    }
    await writeOut(JSON.stringify(posting, null, 2) + "\n")
    return 0
  } catch (err) {
    writeError(err instanceof Error ? err.message : String(err), "FETCH_FAILED")
    return 1
  }
}
