# Setup Guide

Step-by-step instructions for getting the Job Application Assistant framework running.

## 1. Prerequisites

### Claude Code

Install Claude Code (Anthropic's CLI for Claude):

```bash
npm install -g @anthropic-ai/claude-code
```

You'll need an Anthropic API key or a Claude Pro/Team subscription. See the [Claude Code docs](https://docs.anthropic.com/en/docs/claude-code) for details.

### Bun (for the job-board CLIs)

The job portal CLIs are written in TypeScript and run with Bun:

```bash
curl -fsSL https://bun.sh/install | bash
# Then reload your shell (exec zsh / source ~/.bashrc) or run:
export PATH="$HOME/.bun/bin:$PATH"

bun --version   # verify
```

### LaTeX (for CV and cover-letter generation)

The CV template compiles with `lualatex` and the cover letter with `xelatex`. Any full TeX distribution works (TeX Live, MacTeX, MiKTeX). Verify:

```bash
lualatex --version
xelatex --version
```

If you only want the job-search side of the framework, you can skip LaTeX and generate documents elsewhere.

### Python 3.10+ (optional)

Only needed for the optional salary-benchmark tool (`salary_lookup.py`). Check with `python3 --version` (`py --version` on Windows).

## 2. Clone and Install

```bash
git clone https://github.com/arafat1023/job-application-assistant.git
cd job-application-assistant
```

Install dev types for the TypeScript tools:

```bash
for tool in hn-hiring-search freehire-search linkedin-search ats-search; do
    echo "=== installing $tool ==="
    (cd .agents/skills/$tool/cli && bun install)
done
```

All three CLIs have zero runtime dependencies — `bun install` only pulls TypeScript dev types, so this step is strictly for `typecheck` support.

## 3. Personalize with /setup

Start Claude Code in the repo and run the onboarding command:

```bash
claude
# then, inside the session:
/setup
```

`/setup` interviews you (or reads files you drop into `documents/`) and replaces every `[PLACEHOLDER]` in `CLAUDE.md`, the skill files, and the example CV/cover letter with your actual profile. Nothing works well until this step is done — the evaluation, ranking, and document generation all read from that profile.

## 4. Available Job Search Tools

- **hn-hiring-search** — the monthly "Ask HN: Who is hiring?" threads on Hacker News
- **freehire-search** — the freehire.dev remote-job aggregator
- **linkedin-search** — LinkedIn job listings (personal use only; see its SKILL.md for the ToS note)
- **ats-search** — the open roles of named companies on Greenhouse, Lever, and Ashby (company watchlists, posting lookups)

Add more boards with `/add-portal` — it scaffolds the CLI, test-runs a live query, and registers the skill.

## 5. Documents Folder (Optional)

Add your CV, references, or past applications under `documents/`. That folder is gitignored, and `/setup` reads and cross-references the files before proposing profile updates. This is the best path when you have several source files.

## 6. Salary Benchmark (Optional)

If you have company salary data (union statistics, personal research), convert it to `salary_data.json` — see [tools/README_SALARY_TOOL.md](tools/README_SALARY_TOOL.md). The `/apply` workflow uses it when present and silently skips it otherwise.
