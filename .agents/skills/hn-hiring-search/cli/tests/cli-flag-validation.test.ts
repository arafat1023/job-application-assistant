import { describe, expect, test } from "bun:test"
import { join } from "path"
import { runCLI } from "./helpers.js"

describe("cli flag validation", () => {
  test("no command prints help and exits 1", async () => {
    const r = await runCLI([])
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toContain("hn-hiring-cli")
  })

  test("unknown command exits 1 with a JSON error on stderr", async () => {
    const r = await runCLI(["frobnicate"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_CMD")
  })

  test("bad --remote mode is rejected", async () => {
    const r = await runCLI(["search", "--remote", "mars"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_ARG")
  })

  test("non-numeric --limit is rejected", async () => {
    const r = await runCLI(["search", "--limit", "many"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_ARG")
  })

  test("detail without an id exits 1", async () => {
    const r = await runCLI(["detail"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("NO_ID")
  })

  test("detail with an unparseable id exits 1", async () => {
    const r = await runCLI(["detail", "not-an-id"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_ID")
  })
})

describe("live smoke tests", () => {
  test("threads returns at least one Who is hiring thread", async () => {
    const r = await runCLI(["threads", "--limit", "2", "--format", "json"])
    expect(r.exitCode).toBe(0)
    const data = JSON.parse(r.stdout) as { results: { id: string; title: string }[] }
    expect(data.results.length).toBeGreaterThan(0)
    expect(data.results[0].title).toMatch(/who is hiring/i)
    expect(data.results[0].id).toBeTruthy()
  })

  test("search emits complete JSON through a real shell pipe (no 64KB truncation)", async () => {
    // The pipe must come from the shell. `Bun.spawn({stdout: "pipe"})` does not
    // truncate, so spawning the CLI directly would pass even against the unfixed
    // code. `| cat` reproduces what `cli … | jq` actually does.
    const cli = join(import.meta.dir, "../src/cli.ts")
    const proc = Bun.spawn(["sh", "-c", `bun run '${cli}' search --remote any --format json | cat`], {
      stdout: "pipe",
      stderr: "pipe",
    })
    const [stdout] = await Promise.all([new Response(proc.stdout).text(), proc.exited])

    expect(stdout.length).toBeGreaterThan(65536)
    // Would throw if stdout were cut off mid-string at the pipe buffer boundary.
    const data = JSON.parse(stdout) as { meta: { postingsInThread: number } }
    expect(data.meta.postingsInThread).toBeGreaterThan(50)
  })

  test("worldwide is a strict subset of all postings", async () => {
    const all = JSON.parse((await runCLI(["search", "--remote", "any", "--format", "json"])).stdout)
    const ww = JSON.parse((await runCLI(["search", "--format", "json"])).stdout)
    expect(ww.meta.matched).toBeLessThan(all.meta.matched)
    expect(ww.meta.matched).toBeGreaterThan(0)
    for (const p of ww.results) expect(p.remote).toBe("worldwide")
  })
})
