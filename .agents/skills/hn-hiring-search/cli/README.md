# hn-hiring-cli

CLI for searching the monthly **"Ask HN: Who is hiring?"** thread via Hacker News'
public Algolia API. No authentication, no API key, zero runtime dependencies.

Built for a candidate hiring-eligible outside the US/EU: the default `--remote worldwide`
filter keeps only postings whose header advertises worldwide/global remote — the subset
that will actually hire across borders. You apply directly to the company, by email or on
its own ATS.

## Install

Nothing to install beyond [`bun`](https://bun.sh). Dev dependencies (TypeScript types)
are only needed to run `typecheck` and the tests:

```bash
bun install
```

## Usage

```bash
# Worldwide-remote roles matching your stack (default scope)
bun run src/cli.ts search -q "typescript,node,vue,react" --format table

# Every posting in the thread, as JSON
bun run src/cli.ts search --remote any --format json

# Recent monthly threads
bun run src/cli.ts threads --limit 6

# One posting in full, with apply email and links
bun run src/cli.ts detail 48754441 --format plain
```

Run `bun run src/cli.ts` with no arguments for the full flag reference.

## Remote scopes

`worldwide` (default) · `restricted` · `remote-unspecified` · `onsite` · `any`

Scope is classified from the posting's **header line only** — see `../url-reference.md`
for why reading the body produces false positives.

## Development

```bash
bun run typecheck   # tsc --noEmit
bun test            # unit tests + live smoke tests against the current thread
```

The test suite covers the remote-scope classifier (including the body-prose false
positives it must reject), HTML entity decoding, header parsing for non-conventional
posters, CLI flag validation, and a regression test that a full ~400 KB thread survives
being piped without truncation.

That last test spawns `sh -c "… | cat"` rather than using `Bun.spawn({stdout: "pipe"})`,
because a Bun-created pipe does not truncate — a test that reads the child's stdout
directly would pass even against the unfixed code.

## Errors

All errors go to **stderr** as `{ "error": "...", "code": "..." }` with exit code `1`.

| Code | Meaning |
|------|---------|
| `BAD_CMD` | Unknown subcommand |
| `BAD_ARG` | A flag value failed validation |
| `NO_ID` / `BAD_ID` | `detail` called without, or with an unparseable, id |
| `NO_THREAD` | No recent "Who is hiring?" thread found |
| `NO_TEXT` | The item exists but has no text (deleted, or a story not a posting) |
| `FETCH_FAILED` | Network/API failure after retries |
