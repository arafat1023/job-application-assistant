// Data source: the public, unauthenticated job-board JSON APIs of the three
// dominant startup ATS platforms — Greenhouse, Lever, and Ashby. Every company
// hosting its careers page on one of them exposes its open roles at a
// predictable URL keyed by a "board slug" (usually the company name):
//
//   greenhouse: https://boards-api.greenhouse.io/v1/boards/<slug>/jobs
//   lever:      https://api.lever.co/v0/postings/<slug>?mode=json
//   ashby:      https://api.ashbyhq.com/posting-api/job-board/<slug>
//
// No API key, no scraping — these are the same endpoints the companies' own
// careers pages call. The skill normalizes all three into the portal-skill
// contract's result shape.

export type Ats = "greenhouse" | "lever" | "ashby"
export const ALL_ATS: Ats[] = ["greenhouse", "lever", "ashby"]

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "ats-search-skill/1.0"

/**
 * GET JSON from an ATS endpoint. Retries 429/5xx with exponential backoff;
 * returns null on 404 (the usual "this company is not on this ATS" signal).
 * Connection failures fail fast with a clear message.
 */
export async function apiGet(url: string): Promise<unknown | null> {
  const maxRetries = 5
  let delay = 500

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        redirect: "follow",
      })
    } catch (e) {
      throw new Error(`could not reach ${new URL(url).host} (${e instanceof Error ? e.message : String(e)})`)
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`request failed: ${response.status} ${response.statusText} (${url})`)
      }
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return null

    const body = await response.json().catch(() => null)
    if (!response.ok) return null
    return body
  }
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * A job in the portal-skill contract shape. `id` is `<ats>:<company>:<jobId>`,
 * self-contained so `detail <id>` needs no other flags. Missing values are
 * `null`, never omitted.
 */
export interface JobResult {
  id: string
  title: string
  company: string
  location: string | null
  date: string | null
  url: string
  ats: Ats
  remote: boolean | null
  department: string | null
}

export interface JobDetailResult extends JobResult {
  employment_type: string | null
  compensation: string | null
  description: string | null
}

export function makeId(ats: Ats, company: string, jobId: string | number): string {
  return `${ats}:${company}:${jobId}`
}

/** Parse `<ats>:<company>:<jobId>` (jobId may itself contain colons — UUIDs don't, but be safe). */
export function parseId(id: string): { ats: Ats; company: string; jobId: string } | null {
  const m = id.trim().match(/^(greenhouse|lever|ashby):([^:]+):(.+)$/)
  if (!m) return null
  return { ats: m[1] as Ats, company: m[2], jobId: m[3] }
}

// ---------- Greenhouse ----------

interface GreenhouseJob {
  id: number
  title: string
  absolute_url: string
  location?: { name?: string } | null
  updated_at?: string | null
  first_published?: string | null
  company_name?: string | null
  departments?: { name?: string }[] | null
  content?: string | null
  metadata?: unknown
}

export function greenhouseListUrl(slug: string): string {
  return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs`
}

export function greenhouseDetailUrl(slug: string, jobId: string): string {
  return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs/${encodeURIComponent(jobId)}`
}

export function fromGreenhouse(slug: string, j: GreenhouseJob): JobResult {
  const location = j.location?.name || null
  return {
    id: makeId("greenhouse", slug, j.id),
    title: j.title || "(untitled)",
    company: j.company_name || slug,
    location,
    date: j.first_published || j.updated_at || null,
    url: j.absolute_url,
    ats: "greenhouse",
    remote: location ? /remote/i.test(location) : null,
    department: j.departments?.[0]?.name || null,
  }
}

export function fromGreenhouseDetail(slug: string, j: GreenhouseJob): JobDetailResult {
  return {
    ...fromGreenhouse(slug, j),
    employment_type: null,
    compensation: null,
    // Greenhouse double-escapes the HTML content (&lt;p&gt;...), so decode
    // entities first, then strip the revealed tags.
    description: cleanHtml(decodeHtmlEntities(j.content || "")),
  }
}

// ---------- Lever ----------

interface LeverPosting {
  id: string
  text: string
  hostedUrl: string
  createdAt?: number | null
  workplaceType?: string | null
  descriptionPlain?: string | null
  categories?: {
    location?: string | null
    allLocations?: string[] | null
    commitment?: string | null
    department?: string | null
    team?: string | null
  } | null
}

export function leverListUrl(slug: string): string {
  return `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`
}

export function leverDetailUrl(slug: string, jobId: string): string {
  return `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}/${encodeURIComponent(jobId)}`
}

export function fromLever(slug: string, j: LeverPosting): JobResult {
  const c = j.categories || {}
  const location = c.allLocations?.length ? c.allLocations.join("; ") : c.location || null
  return {
    id: makeId("lever", slug, j.id),
    title: j.text || "(untitled)",
    company: slug,
    location,
    date: j.createdAt ? new Date(j.createdAt).toISOString() : null,
    url: j.hostedUrl,
    ats: "lever",
    remote: j.workplaceType ? j.workplaceType === "remote" : location ? /remote/i.test(location) : null,
    department: c.team || c.department || null,
  }
}

export function fromLeverDetail(slug: string, j: LeverPosting): JobDetailResult {
  return {
    ...fromLever(slug, j),
    employment_type: j.categories?.commitment || null,
    compensation: null,
    description: (j.descriptionPlain || "").trim() || null,
  }
}

// ---------- Ashby ----------

interface AshbyJob {
  id: string
  title: string
  jobUrl: string
  location?: string | null
  secondaryLocations?: { location?: string }[] | null
  publishedAt?: string | null
  isRemote?: boolean | null
  isListed?: boolean
  employmentType?: string | null
  department?: string | null
  team?: string | null
  descriptionPlain?: string | null
  compensation?: { compensationTierSummary?: string | null } | null
}

export function ashbyListUrl(slug: string): string {
  return `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`
}

export function fromAshby(slug: string, j: AshbyJob): JobResult {
  const secondaries = (j.secondaryLocations || []).map((s) => s.location).filter(Boolean)
  const location = [j.location, ...secondaries].filter(Boolean).join("; ") || null
  return {
    id: makeId("ashby", slug, j.id),
    title: j.title || "(untitled)",
    company: slug,
    location,
    date: j.publishedAt || null,
    url: j.jobUrl,
    ats: "ashby",
    remote: j.isRemote ?? null,
    department: j.team || j.department || null,
  }
}

export function fromAshbyDetail(slug: string, j: AshbyJob): JobDetailResult {
  return {
    ...fromAshby(slug, j),
    employment_type: j.employmentType || null,
    compensation: j.compensation?.compensationTierSummary || null,
    description: (j.descriptionPlain || "").trim() || null,
  }
}

// ---------- Board fetching ----------

/** All open jobs for one company on one ATS, or null when the board doesn't exist there. */
export async function fetchBoard(ats: Ats, slug: string): Promise<JobResult[] | null> {
  if (ats === "greenhouse") {
    const body = (await apiGet(greenhouseListUrl(slug))) as { jobs?: GreenhouseJob[] } | null
    if (!body?.jobs) return null
    return body.jobs.map((j) => fromGreenhouse(slug, j))
  }
  if (ats === "lever") {
    const body = (await apiGet(leverListUrl(slug))) as LeverPosting[] | { ok: false } | null
    // Lever returns {"ok":false,...} for unknown boards and [] for real-but-empty
    // boards; both mean "nothing here", but only the array means the board exists.
    if (!Array.isArray(body)) return null
    return body.map((j) => fromLever(slug, j))
  }
  const body = (await apiGet(ashbyListUrl(slug))) as { jobs?: AshbyJob[] } | null
  if (!body?.jobs) return null
  return body.jobs.filter((j) => j.isListed !== false).map((j) => fromAshby(slug, j))
}

/**
 * Find a company's board, probing the given ATS or all three (greenhouse →
 * lever → ashby). Returns the jobs plus which ATS matched, or null if the slug
 * isn't a board on any of them.
 */
export async function findBoard(
  slug: string,
  ats?: Ats,
): Promise<{ ats: Ats; jobs: JobResult[] } | null> {
  const candidates = ats ? [ats] : ALL_ATS
  for (const candidate of candidates) {
    const jobs = await fetchBoard(candidate, slug)
    if (jobs !== null) return { ats: candidate, jobs }
  }
  return null
}

/** Fetch one job's detail using a parsed contract id. */
export async function fetchDetail(ats: Ats, company: string, jobId: string): Promise<JobDetailResult | null> {
  if (ats === "greenhouse") {
    const body = (await apiGet(greenhouseDetailUrl(company, jobId))) as GreenhouseJob | null
    return body?.id ? fromGreenhouseDetail(company, body) : null
  }
  if (ats === "lever") {
    const body = (await apiGet(leverDetailUrl(company, jobId))) as LeverPosting | { ok: false } | null
    return body && "id" in body ? fromLeverDetail(company, body) : null
  }
  // Ashby has no per-job endpoint; fetch the board and pick the job out.
  const body = (await apiGet(ashbyListUrl(company))) as { jobs?: AshbyJob[] } | null
  const job = body?.jobs?.find((j) => j.id === jobId)
  return job ? fromAshbyDetail(company, job) : null
}

// ---------- Text utilities ----------

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
}

/**
 * Strip HTML into readable prose: block tags become newlines, tags removed,
 * remaining entities decoded (needed for Greenhouse's double-escaped content,
 * where one decode reveals the markup and the text's own entities still need
 * a second pass after tag-stripping).
 */
export function cleanHtml(html: string | null | undefined): string | null {
  if (!html) return null
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  const text = decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return text || null
}

/** Case-insensitive keyword match against a job's searchable text. */
export function matchesQuery(job: JobResult, query: string): boolean {
  const haystack = `${job.title} ${job.department ?? ""} ${job.location ?? ""}`.toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term))
}
