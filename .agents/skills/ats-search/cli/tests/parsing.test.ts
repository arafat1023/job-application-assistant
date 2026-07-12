import { describe, expect, test } from "bun:test"
import {
  cleanHtml,
  decodeHtmlEntities,
  fromAshby,
  fromGreenhouse,
  fromGreenhouseDetail,
  fromLever,
  makeId,
  matchesQuery,
  parseId,
} from "../src/helpers.ts"

describe("parseId / makeId", () => {
  test("round-trips a greenhouse id", () => {
    const id = makeId("greenhouse", "stripe", 7954688)
    expect(parseId(id)).toEqual({ ats: "greenhouse", company: "stripe", jobId: "7954688" })
  })

  test("parses an ashby UUID jobId", () => {
    const parsed = parseId("ashby:linear:d3bc1ced-3ce4-4086-a050-555055dbb1ff")
    expect(parsed?.ats).toBe("ashby")
    expect(parsed?.jobId).toBe("d3bc1ced-3ce4-4086-a050-555055dbb1ff")
  })

  test("rejects unknown ats and malformed ids", () => {
    expect(parseId("workday:acme:123")).toBeNull()
    expect(parseId("no-colons-here")).toBeNull()
    expect(parseId("greenhouse:stripe:")).toBeNull()
  })
})

describe("fromGreenhouse", () => {
  const wire = {
    id: 7954688,
    title: "Staff Engineer",
    absolute_url: "https://stripe.com/jobs/search?gh_jid=7954688",
    location: { name: "Remote — US" },
    first_published: "2026-07-01T00:00:00-04:00",
    company_name: "Stripe",
    departments: [{ name: "Platform" }],
  }

  test("maps the contract fields", () => {
    const r = fromGreenhouse("stripe", wire)
    expect(r.id).toBe("greenhouse:stripe:7954688")
    expect(r.title).toBe("Staff Engineer")
    expect(r.company).toBe("Stripe")
    expect(r.location).toBe("Remote — US")
    expect(r.date).toBe("2026-07-01T00:00:00-04:00")
    expect(r.remote).toBe(true)
    expect(r.department).toBe("Platform")
  })

  test("missing values become null, never undefined", () => {
    const r = fromGreenhouse("acme", { id: 1, title: "X", absolute_url: "u" })
    expect(r.location).toBeNull()
    expect(r.date).toBeNull()
    expect(r.department).toBeNull()
    expect(r.remote).toBeNull()
    expect(r.company).toBe("acme")
  })

  test("detail decodes greenhouse's double-escaped HTML content", () => {
    const d = fromGreenhouseDetail("acme", {
      id: 1,
      title: "X",
      absolute_url: "u",
      content: "&lt;h2&gt;Who we are&lt;/h2&gt;&lt;p&gt;A &amp;amp; B&lt;/p&gt;",
    })
    expect(d.description).toBe("Who we are\nA & B")
  })
})

describe("fromLever", () => {
  const wire = {
    id: "4936169c-7a8d-4db7-9024-a60757077849",
    text: "Backend Engineer II",
    hostedUrl: "https://jobs.lever.co/octoenergy/4936169c",
    createdAt: 1751814877292,
    workplaceType: "remote",
    categories: {
      location: "Houston (US)",
      allLocations: ["Houston (US)", "Austin (US)"],
      commitment: "Full-time",
      team: "Software Engineering",
    },
  }

  test("maps the contract fields", () => {
    const r = fromLever("octoenergy", wire)
    expect(r.id).toBe("lever:octoenergy:4936169c-7a8d-4db7-9024-a60757077849")
    expect(r.location).toBe("Houston (US); Austin (US)")
    expect(r.date).toBe(new Date(1751814877292).toISOString())
    expect(r.remote).toBe(true)
    expect(r.department).toBe("Software Engineering")
  })

  test("non-remote workplaceType is not remote", () => {
    const r = fromLever("x", { ...wire, workplaceType: "hybrid" })
    expect(r.remote).toBe(false)
  })
})

describe("fromAshby", () => {
  const wire = {
    id: "d3bc1ced",
    title: "Senior Fullstack Engineer",
    jobUrl: "https://jobs.ashbyhq.com/linear/d3bc1ced",
    location: "Europe",
    secondaryLocations: [{ location: "North America" }],
    publishedAt: "2021-04-27T20:13:45.158+00:00",
    isRemote: true,
    team: "Engineering",
  }

  test("maps the contract fields and joins secondary locations", () => {
    const r = fromAshby("linear", wire)
    expect(r.id).toBe("ashby:linear:d3bc1ced")
    expect(r.location).toBe("Europe; North America")
    expect(r.remote).toBe(true)
    expect(r.department).toBe("Engineering")
  })
})

describe("matchesQuery", () => {
  const job = fromAshby("linear", {
    id: "1",
    title: "Senior Backend Engineer",
    jobUrl: "u",
    location: "Europe",
    team: "Platform",
  })

  test("all terms must match, case-insensitive, across title/department/location", () => {
    expect(matchesQuery(job, "backend engineer")).toBe(true)
    expect(matchesQuery(job, "BACKEND europe")).toBe(true)
    expect(matchesQuery(job, "platform senior")).toBe(true)
    expect(matchesQuery(job, "backend frontend")).toBe(false)
  })
})

describe("text utilities", () => {
  test("decodeHtmlEntities handles named and numeric entities", () => {
    expect(decodeHtmlEntities("&lt;b&gt; &amp; &#8211; &#x2014; &nbsp;")).toBe("<b> & – —  ".replace(" ", " "))
  })

  test("cleanHtml strips tags and normalizes whitespace", () => {
    expect(cleanHtml("<p>One</p><p>Two</p>")).toBe("One\nTwo")
    expect(cleanHtml("")).toBeNull()
    expect(cleanHtml(null)).toBeNull()
  })
})
