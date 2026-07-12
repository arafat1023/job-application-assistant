# HN Algolia API — URL reference

Base: `https://hn.algolia.com/api/v1`

No authentication, no API key, no account. Public and CORS-open.

## Find the monthly threads

```
GET /search_by_date?tags=story,author_whoishiring&hitsPerPage=<n>
```

Returns stories by the `whoishiring` account, newest first. Filtering by **author** is
what makes this exact — a title search for "who is hiring" also matches the companion
"Ask HN: Who wants to be hired?" and "Freelancer? Seeking freelancer?" threads, which
have a different structure. The CLI additionally filters titles on `/who is hiring/i`.

Relevant fields per hit:

| Field | Meaning |
|-------|---------|
| `objectID` | Thread id — pass to `/items/<id>` or the CLI's `--thread` |
| `title` | e.g. `Ask HN: Who is hiring? (July 2026)` |
| `created_at` | ISO timestamp; threads land on the 1st of the month |
| `num_comments` | Rough posting count (includes replies, so it overcounts) |

## Fetch a thread's postings

```
GET /items/<thread_id>
```

Returns the story with a nested `children` array. **Top-level children are the job
postings**; their own `children` are discussion replies and are ignored.

Relevant fields per child:

| Field | Meaning |
|-------|---------|
| `id` | Comment id — the stable identifier for one posting |
| `text` | The posting, as HTML (`<p>`, `<a>`, `<i>`, `<pre><code>`) |
| `author` | Who posted it |

A deleted or dead comment has `text: null`; the CLI skips those.

## Fetch a single posting

```
GET /items/<comment_id>
```

Same shape as above. Used by `detail`.

## Posting format (community convention, not enforced)

The first line is a pipe-delimited header:

```
Company | Role(s) | Location / remote scope | Employment type | URL
```

Real examples from the July 2026 thread:

```
Railway | Infra Eng, Product Eng (full-stack) | REMOTE (Worldwide) | https://railway.com/careers
MixRank (YC S11) | Software Engineers | 100% Remote (Global) | Full-Time
Enveritas (YC S18, non-profit) | Backend Software Engineer | Remote (Global) | https://enveritas.org/jobs/
Nova Credit | Remote (US, Canada)
Hiya | Seattle/London | Full-time | Hybrid
```

Because it is a convention rather than a schema, expect deviations: some posters use
em-dashes instead of pipes, inline the company URL in the first field, or run the header
straight into the body. The parser tolerates all three.

**Never infer remote scope from the body.** Bodies advertise worldwide *user bases*
("protects 500 million users worldwide", "financial inclusion globally") while the header
says `Hybrid`. Header-only classification is what keeps that from producing false hits.

## Rate limits

Undocumented but generous; this skill makes one request per thread. The CLI retries
429/5xx with exponential backoff and jitter.
