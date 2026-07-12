// The same shape as bare-write.ts, but routed through `writeOut`, which awaits
// `drain` before returning. Exercised by stdout-flush.test.ts — do not import it.
import { writeOut } from "../../src/helpers.js"

const SIZE = Number(process.argv[2] ?? 300000)

async function main(): Promise<number> {
  await writeOut("x".repeat(SIZE))
  return 0
}

main().then((code) => process.exit(code))
