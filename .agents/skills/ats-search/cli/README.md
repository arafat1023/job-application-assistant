# ats-cli

CLI for listing and searching company job boards hosted on **Greenhouse**,
**Lever**, and **Ashby** via their public, unauthenticated job-board JSON APIs.
Zero runtime dependencies — runs with just `bun`.

```bash
bun install        # dev types only (typecheck support)
bun run typecheck
bun test

# list + filter roles from named company boards
bun run src/cli.ts search -c stripe,linear -q "backend engineer" --format table

# full posting text
bun run src/cli.ts detail greenhouse:stripe:8055701 --format plain
```

See `../SKILL.md` for the full command reference and `../url-reference.md` for
the underlying API notes.
