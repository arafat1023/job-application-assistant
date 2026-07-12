import { describe, expect, test } from "bun:test"
import { classifyRemote, htmlToText, parsePosting } from "../src/helpers.js"

describe("classifyRemote", () => {
  test("recognizes worldwide remote in its common spellings", () => {
    const worldwide = [
      "Railway | Product Eng | REMOTE (Worldwide) | railway.com/careers",
      "MixRank (YC S11) | Software Engineers | 100% Remote (Global) | Full-Time",
      "Enveritas | Backend Software Engineer | Remote (Global)",
      "ALBERT | REMOTE ALMOST ANYWHERE IN THE WORLD | principal engineers",
      "FUTO | Austin, TX | REMOTE(Worldwide) or ONSITE | Full Time",
      "Acme | Engineer | Remote - Worldwide",
      "Acme | Engineer | worldwide remote",
      "Acme | Engineer | Remote (Anywhere)",
    ]
    for (const h of worldwide) expect(classifyRemote(h)).toBe("worldwide")
  })

  test("treats a named region as restricted, not worldwide", () => {
    const restricted = [
      "Nova Credit | Remote (US, Canada) | Full-time",
      "Acme | Engineer | REMOTE (US)",
      "Acme | Engineer | Remote - UK only",
      "Acme | Engineer | Remote (EU)",
      "Acme | Engineer | Remote (LATAM)",
    ]
    for (const h of restricted) expect(classifyRemote(h)).toBe("restricted")
  })

  test("does not read remote scope out of body prose", () => {
    // The body brags about a worldwide user base; the header says Hybrid.
    const hiya =
      "Hiya | Seattle/London | Full-time | Hybrid\nHiya protects over 500 million users worldwide from spam and fraud, globally."
    expect(classifyRemote(hiya)).toBe("onsite")

    const novaCredit =
      "Nova Credit | Remote (US, Canada)\nWe power financial inclusion globally, unlocking opportunity worldwide."
    expect(classifyRemote(novaCredit)).toBe("restricted")
  })

  test("classifies a bare 'remote' as unspecified, and no remote at all as onsite", () => {
    expect(classifyRemote("Acme | Engineer | Remote | Full-time")).toBe("remote-unspecified")
    expect(classifyRemote("Acme | Engineer | Boston, MA | Full-time")).toBe("onsite")
    expect(classifyRemote("Acme | Engineer | Onsite")).toBe("onsite")
  })

  test("worldwide wins when a header offers both worldwide and onsite", () => {
    expect(classifyRemote("FUTO | Austin, TX | REMOTE(Worldwide) or ONSITE")).toBe("worldwide")
    expect(classifyRemote("ArtCraft | Remote (Global) / Onsite (SF Bay Area)")).toBe("worldwide")
  })
})

describe("htmlToText", () => {
  test("decodes entities and keeps paragraph breaks", () => {
    const html = "<p>Rust &amp; TypeScript</p><p>Email us at <a href=\"x\">a@b.co</a></p>"
    const text = htmlToText(html)
    expect(text).toContain("Rust & TypeScript")
    expect(text).toContain("a@b.co")
    expect(text.split("\n").length).toBeGreaterThan(1)
  })

  test("decodes decimal and hex numeric entities", () => {
    expect(htmlToText("caf&#233;")).toBe("café")
    expect(htmlToText("caf&#xE9;")).toBe("café")
  })
})

describe("parsePosting", () => {
  test("extracts company, emails and links", () => {
    const html =
      "<p>Sequent Tech | Senior Fullstack Engineer | REMOTE (Global) | sequentech.io</p>" +
      "<p>Stack: Rust, TypeScript. Reach out: team@sequentech.io or https://sequentech.io/jobs</p>"
    const p = parsePosting("123", html)
    expect(p.company).toBe("Sequent Tech")
    expect(p.remote).toBe("worldwide")
    expect(p.emails).toContain("team@sequentech.io")
    expect(p.urls).toContain("https://sequentech.io/jobs")
    expect(p.url).toBe("https://news.ycombinator.com/item?id=123")
  })

  test("strips an inlined company URL and its leftover brackets", () => {
    const p = parsePosting("1", "<p>ProxyBase ( https://proxybase.xyz ) | Rust | Remote (Global)</p>")
    expect(p.company).toBe("ProxyBase")
  })

  test("handles em-dash headers instead of pipes", () => {
    const p = parsePosting("1", "<p>PrairieLearn — Full-Stack Engineer — Remote US</p>")
    expect(p.company).toBe("PrairieLearn")
    expect(p.remote).toBe("restricted")
  })
})
