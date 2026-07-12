// Data source: the monthly "Ask HN: Who is hiring?" thread on Hacker News,
// read through the public Algolia search API. No authentication, no API key,
// no rate limit worth worrying about at personal-use volume.
//
// Why this source: each top-level comment is one job posting written by the
// hiring company itself, and the community convention is a pipe-delimited
// header line, e.g.
//
//   Railway | Product Eng (full-stack) | REMOTE (Worldwide) | https://railway.com/careers
//
// Applications go straight to the company (email or their own ATS), so there
// is no job board in the middle and nothing to pay for. Crucially, postings
// state their remote scope explicitly ("REMOTE (Worldwide)", "Remote (Global)",
// "Remote (US only)"), which is what makes worldwide-remote eligibility
// filterable — the thing LinkedIn's country-anchored remote filter cannot do.

export const ALGOLIA = "https://hn.algolia.com/api/v1"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

/**
 * Write to stdout and wait for the kernel to accept it.
 *
 * A full thread serializes to ~400 KB of JSON. `process.stdout.write` returns
 * false once the pipe buffer (64 KB) is full and finishes the write
 * asynchronously — so calling `process.exit()` straight afterwards silently
 * truncates the output when stdout is a pipe. Awaiting `drain` first is what
 * makes `... | jq` see the whole document.
 */
export async function writeOut(text: string): Promise<void> {
  if (!process.stdout.write(text)) {
    await new Promise<void>((resolve) => process.stdout.once("drain", () => resolve()))
  }
}

/** Fetch JSON with exponential backoff on 429/5xx. */
export async function jsonFetch<T>(url: string): Promise<T> {
  const maxRetries = 5
  let delay = 400
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      redirect: "follow",
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 300)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 6000)
      continue
    }
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return (await response.json()) as T
  }
  throw new Error("Request failed after max retries")
}

// ---------------------------------------------------------------------------
// Text handling
// ---------------------------------------------------------------------------

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
}

/** HN comment HTML is shallow: <p>, <a>, <i>, <pre><code>. Keep paragraph breaks. */
export function htmlToText(html: string): string {
  const withBreaks = html.replace(/<\s*p\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n")
  return decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Collapse to a single line, for header parsing and table rendering. */
export function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

// ---------------------------------------------------------------------------
// Remote-scope classification
//
// The whole point of this skill for a candidate outside the US/EU: distinguish
// "remote, and they will hire you where you live" from "remote, but only if you
// already have the right to work in country X".
// ---------------------------------------------------------------------------

export type RemoteScope = "worldwide" | "restricted" | "remote-unspecified" | "onsite"

/**
 * Only ever classify from the posting's HEADER line, never the body prose.
 * Bodies routinely say things like "protects 500 million users worldwide" or
 * "financial inclusion globally" — matching those produces false positives.
 * The header is the pipe-delimited line the HN convention puts first.
 */
export function headerOf(text: string): string {
  const firstLine = oneLine(text.split("\n")[0] ?? "")
  // Some posters run the header straight into the body; the header is reliably
  // within the first few pipe-delimited fields, so cap the slice.
  const fields = firstLine.split("|")
  return (fields.length > 1 ? fields.slice(0, 6).join("|") : firstLine.slice(0, 200)).trim()
}

const WORLDWIDE_RE =
  /\b(?:remote\s*\(?\s*(?:worldwide|world[- ]?wide|global(?:ly)?|anywhere)|worldwide\s*remote|global(?:ly)?\s+remote|100%\s*remote\s*\(?\s*global|remote\s*[-–—]\s*(?:worldwide|global|anywhere)|anywhere\s+in\s+the\s+world|remote\s+almost\s+anywhere)/i

// "REMOTE (US)", "Remote (US, Canada)", "Remote (EU)", "Remote - UK only", etc.
const RESTRICTED_RE =
  /remote[^|]{0,40}?\b(?:us(?:a|-only| only)?|u\.s\.|united states|canada|ca\b|eu\b|europe|uk\b|united kingdom|emea|latam|apac|india|germany|australia|brazil)\b/i

const ONSITE_RE = /\b(?:onsite|on-site|hybrid)\b/i
const REMOTE_RE = /\bremote\b/i

export function classifyRemote(text: string): RemoteScope {
  const header = headerOf(text)
  if (WORLDWIDE_RE.test(header)) return "worldwide"
  if (REMOTE_RE.test(header)) {
    // A header can offer both, e.g. "REMOTE(Worldwide) or ONSITE" — worldwide
    // already returned above, so anything left that names a region is restricted.
    if (RESTRICTED_RE.test(header)) return "restricted"
    return "remote-unspecified"
  }
  if (ONSITE_RE.test(header)) return "onsite"
  return "onsite"
}

// ---------------------------------------------------------------------------
// Posting model
// ---------------------------------------------------------------------------

export interface Posting {
  id: string
  company: string | null
  /** Raw pipe-delimited header line, as written by the poster. */
  header: string
  remote: RemoteScope
  /** Contact emails found anywhere in the posting. */
  emails: string[]
  /** Apply / careers links found anywhere in the posting. */
  urls: string[]
  text: string
  url: string
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const URL_RE = /https?:\/\/[^\s<>"')]+/g

/**
 * The company is the first field of the header. The convention is a pipe
 * delimiter, but a minority of posters use an em/en dash or a bullet, so accept
 * whichever appears first rather than swallowing the whole line.
 */
function companyOf(header: string): string | null {
  const first = header.split(/[|—–•]/)[0]?.trim()
  if (!first) return null
  // Some posters inline the company URL here, e.g. "ProxyBase ( https://... )".
  // Strip the URL, then the brackets it leaves behind.
  const cleaned = first
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[([{]\s*[)\]}]/g, "")
    .replace(/\s*[([{]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim()
  return cleaned.slice(0, 80) || null
}

export function parsePosting(id: string, html: string): Posting {
  const text = htmlToText(html)
  const header = headerOf(text)
  return {
    id,
    company: companyOf(header),
    header,
    remote: classifyRemote(text),
    emails: [...new Set(text.match(EMAIL_RE) ?? [])],
    urls: [...new Set(text.match(URL_RE) ?? [])].map((u) => decodeHtmlEntities(u)),
    text,
    url: `https://news.ycombinator.com/item?id=${id}`,
  }
}

/** Case-insensitive OR-match of comma-separated keywords against the posting text. */
export function matchesKeywords(posting: Posting, query: string | undefined): boolean {
  if (!query) return true
  const terms = query
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  if (terms.length === 0) return true
  const hay = posting.text.toLowerCase()
  return terms.some((t) => hay.includes(t))
}

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------

export interface Thread {
  id: string
  title: string
  createdAt: string
  numComments: number
}

interface AlgoliaHit {
  objectID: string
  title: string
  created_at: string
  num_comments: number | null
}

/**
 * List recent "Ask HN: Who is hiring?" threads, newest first. They are always
 * posted by the `whoishiring` account on the first of the month, so filtering
 * by author is exact — a title search alone also matches "Who wants to be hired?".
 */
export async function listThreads(count: number): Promise<Thread[]> {
  const url = `${ALGOLIA}/search_by_date?tags=story,author_whoishiring&hitsPerPage=${Math.max(count * 3, 12)}`
  const data = await jsonFetch<{ hits: AlgoliaHit[] }>(url)
  return data.hits
    .filter((h) => /who is hiring/i.test(h.title))
    .slice(0, count)
    .map((h) => ({
      id: h.objectID,
      title: h.title,
      createdAt: h.created_at.slice(0, 10),
      numComments: h.num_comments ?? 0,
    }))
}

interface AlgoliaItem {
  id: number
  text: string | null
  children?: AlgoliaItem[]
}

/** Fetch every top-level posting in a thread. */
export async function fetchPostings(threadId: string): Promise<Posting[]> {
  const data = await jsonFetch<AlgoliaItem>(`${ALGOLIA}/items/${threadId}`)
  return (data.children ?? [])
    .filter((c) => c.text)
    .map((c) => parsePosting(String(c.id), c.text as string))
}
