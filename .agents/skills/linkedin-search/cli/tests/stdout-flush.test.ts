import { describe, expect, test } from "bun:test"
import { join } from "path"

const FIXTURES = join(import.meta.dir, "fixtures")

/** Comfortably larger than the 64 KB pipe buffer. */
const SIZE = 300_000

/**
 * Run a fixture with its stdout connected to a real shell pipe.
 *
 * The pipe has to come from the shell, not from `Bun.spawn({stdout: "pipe"})`.
 * A Bun-created pipe does not truncate — so a test that spawns the CLI directly
 * and inspects its stdout passes even against the unfixed code, and proves
 * nothing. Piping into `cat` reproduces what `cli … | jq` actually does.
 */
async function throughShellPipe(fixture: string): Promise<number> {
  const script = join(FIXTURES, fixture)
  const proc = Bun.spawn(["sh", "-c", `bun run '${script}' ${SIZE} | cat`], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout] = await Promise.all([new Response(proc.stdout).text(), proc.exited])
  return stdout.length
}

describe("stdout flushing through a shell pipe", () => {
  test("a bare stdout.write before process.exit truncates at the pipe buffer", async () => {
    // Guards the fix: this is the hazard writeOut exists to avoid. If a future
    // Bun release makes the bare write safe, this fails loudly and prompts a
    // review — writeOut should not be dropped on an untested assumption.
    expect(await throughShellPipe("bare-write.ts")).toBeLessThan(SIZE)
  })

  test("writeOut delivers the whole payload before exit", async () => {
    expect(await throughShellPipe("write-out.ts")).toBe(SIZE)
  })
})
