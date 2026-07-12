// Reproduces the truncation hazard: a bare `process.stdout.write` of a payload
// larger than the 64 KB pipe buffer, followed immediately by `process.exit`.
// This is the shape `main().then((code) => process.exit(code))` gives cli.ts.
// Exists only to be exercised by stdout-flush.test.ts — do not import it.
const SIZE = Number(process.argv[2] ?? 300000)

async function main(): Promise<number> {
  process.stdout.write("x".repeat(SIZE))
  return 0
}

main().then((code) => process.exit(code))
