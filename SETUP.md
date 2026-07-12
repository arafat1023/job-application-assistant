# Setup Guide

Step-by-step instructions for getting the Job Application Assistant framework running.

## 1. Prerequisites

### Claude Code

Install Claude Code (Anthropic's CLI for Claude):

```bash
npm install -g @anthropic-ai/claude-code
```

You'll need an Anthropic API key or a Claude Pro/Team subscription. See the [Claude Code docs](https://docs.anthropic.com/en/docs/claude-code) for details.

### Python

Python 3.10+ is required for some tools. Check with:

```bash
python3 --version
```

On Windows, `py --version` is often the most reliable check. If your system exposes Python as `python` instead of `python3`, use `python` in the commands below.

### Bun (for job search tools)

The job portal CLIs are written in TypeScript and run with Bun. Install Bun first:

```bash
curl -fsSL https://bun.sh/installer | bash
# Then reload your shell (exec zsh or source ~/.zshrc) or run:
export PATH="$HOME/.bun/bin:$PATH"
```

Verify installation:

```bash
bun --version
```

## 2. Clone and Install

Clone the repository:

```bash
gh repo clone arafat1023/job-application-assistant
cd job-application-assistant
```

Install the TypeScript tools:

```bash
cd .agents/skills
for tool in hn-hiring-search freehire-search; do
    echo "=== installing $tool ==="
    cd "$tool" && bun install && cd ..
done
```

## 3. Configure

The framework is ready to use. For detailed configuration options, see the individual skill documentation.

## 4. Available Job Search Tools

The framework includes these job search skills:

- **hn-hiring-search**: Search Hacker News monthly hiring threads
- **freehire-search**: Search Freehire board for remote opportunities

You can add more job board integrations using the `/add-portal` command.

## 5. Documents Folder (Optional)

Add your CV, references, or past applications under `documents/`. Claude reads and cross-references them before proposing profile updates.

This is best when you have several source files.
