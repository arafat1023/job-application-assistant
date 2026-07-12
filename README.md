# Job Application Assistant

A [Claude Code](https://claude.com/claude-code) workspace for running your job search: scrape job boards, evaluate fit against your profile, generate tailored LaTeX CVs and cover letters, and prepare for interviews — all driven by slash commands.

## How it works

You describe yourself once (`/setup` populates `CLAUDE.md` with your profile), then work postings through a pipeline:

| Command | What it does |
|---------|--------------|
| `/setup` | Interactive onboarding — fills the profile placeholders from your documents |
| `/scrape` | Searches job boards using the bundled CLI skills and your query strategy |
| `/rank` | Cheap triage of scraped postings against your profile rubric |
| `/apply` | Full evaluation of one posting, then tailored CV + cover letter generation |
| `/interview` | Prep talking points, likely questions, and answers for a scheduled round |
| `/outcome` | Record how an application ended, to sharpen future targeting |
| `/add-portal` | Scaffold a search CLI for any public job portal not covered yet |

## Job board tools included

- **hn-hiring-search** — the monthly "Ask HN: Who is hiring?" threads on Hacker News
- **freehire-search** — the freehire.dev remote-job aggregator
- **linkedin-search** — LinkedIn job listings (personal use only; see its SKILL.md for the ToS note)

Each is a zero-runtime-dependency TypeScript CLI run with [Bun](https://bun.sh). Need another board? `/add-portal` generates the skill, test-runs a live query, and registers it.

## Requirements

- [Claude Code](https://claude.com/claude-code) (the whole workflow runs inside it)
- [Bun](https://bun.sh) for the job-board CLIs
- A LaTeX distribution (for CV/cover-letter generation; `lualatex` + `xelatex`)
- Python 3.10+ (optional salary-benchmark tool)

## Getting started

```bash
git clone https://github.com/arafat1023/job-application-assistant.git
cd job-application-assistant

# install dev types for the job-board CLIs
for tool in hn-hiring-search freehire-search linkedin-search; do
  (cd .agents/skills/$tool/cli && bun install)
done

claude   # then run /setup
```

See [SETUP.md](SETUP.md) for the full walkthrough.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](LICENSE).

Derived from [ai-job-search](https://github.com/MadsLorentzen/ai-job-search) by Mads Lorentzen, generalized from its original Danish-market focus to a worldwide job search.
