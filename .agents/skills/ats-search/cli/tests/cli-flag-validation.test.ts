import { describe, expect, test } from "bun:test"
import { runCLI } from "./helpers.ts"

// Flag-validation tests: no network, every case must fail fast with a JSON
// error on stderr and exit code 1.
describe("cli flag validation", () => {
  test("search without --company exits 1 with NO_COMPANY", async () => {
    const r = await runCLI(["search", "-q", "engineer"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("NO_COMPANY")
  })

  test("bad --ats exits 1 with BAD_ARG", async () => {
    const r = await runCLI(["search", "-c", "acme", "--ats", "workday"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_ARG")
  })

  test("non-numeric --jobage exits 1 with BAD_ARG", async () => {
    const r = await runCLI(["search", "-c", "acme", "--jobage", "soon"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_ARG")
  })

  test("non-numeric --limit exits 1 with BAD_ARG", async () => {
    const r = await runCLI(["search", "-c", "acme", "--limit", "many"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_ARG")
  })

  test("detail without id exits 1 with NO_ID", async () => {
    const r = await runCLI(["detail"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("NO_ID")
  })

  test("detail with malformed id exits 1 with BAD_ID", async () => {
    const r = await runCLI(["detail", "not-a-contract-id"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_ID")
  })

  test("unknown command exits 1 with BAD_CMD", async () => {
    const r = await runCLI(["frobnicate"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_CMD")
  })

  test("no command prints help and exits 1", async () => {
    const r = await runCLI([])
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toContain("USAGE")
  })
})
