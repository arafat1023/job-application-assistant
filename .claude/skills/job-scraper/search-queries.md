# Search Queries for Job Scraper

<!-- SETUP: Customize these queries based on your skills, target roles, and location -->

## Search Sites

Primary (bundled CLI skills — prefer these over Google queries where they cover the board):
- **Hacker News "Who is hiring?"** — monthly hiring threads; use the `hn-hiring-search` skill
- **freehire.dev** — remote-job aggregator; use the `freehire-search` skill
- **linkedin.com/jobs** — LinkedIn job listings; use the `linkedin-search` skill (personal use only, see its SKILL.md)
- **Company watchlist (Greenhouse / Lever / Ashby boards)** — use the `ats-search` skill to sweep named target companies' open roles

Secondary (via Google `site:` queries):
- **[YOUR_LOCAL_JOB_BOARD]** — your country's main job board (add a CLI skill for it with `/add-portal`)
- Company career pages on **Greenhouse / Lever / Ashby** (`boards.greenhouse.io`, `jobs.lever.co`, `jobs.ashbyhq.com`)
- Direct Google searches with `site:` filters for known target companies

## Query Categories

Queries are grouped by priority. Combine each query with your location or remote-work terms (e.g. "[YOUR_CITY]", "remote", "worldwide") where the site supports it.

### Priority 1: [YOUR_PRIMARY_ROLE_TYPE]

These match your strongest and most desired career direction.

```
site:linkedin.com/jobs "[YOUR_PRIMARY_JOB_TITLE]" [YOUR_LOCATION_OR_REMOTE]
site:boards.greenhouse.io "[YOUR_PRIMARY_JOB_TITLE]" [YOUR_LOCATION_OR_REMOTE]
site:jobs.lever.co "[YOUR_PRIMARY_JOB_TITLE]" [YOUR_LOCATION_OR_REMOTE]
site:[YOUR_LOCAL_JOB_BOARD] "[YOUR_PRIMARY_JOB_TITLE]" [YOUR_CITY]
```

### Priority 2: [YOUR_DOMAIN_EXPERTISE]

These match your domain expertise.

```
site:linkedin.com/jobs [YOUR_DOMAIN_KEYWORD_1] [YOUR_LOCATION_OR_REMOTE]
site:jobs.ashbyhq.com [YOUR_DOMAIN_KEYWORD_1] [YOUR_LOCATION_OR_REMOTE]
site:[YOUR_LOCAL_JOB_BOARD] [YOUR_DOMAIN_KEYWORD_2] [YOUR_CITY]
```

### Priority 3: [YOUR_ADJACENT_ROLE_TYPE]

Adjacent roles you could pivot into.

```
site:linkedin.com/jobs "[YOUR_ADJACENT_TITLE_1]" [YOUR_KEY_SKILL] [YOUR_LOCATION_OR_REMOTE]
site:[YOUR_LOCAL_JOB_BOARD] "[YOUR_ADJACENT_TITLE_2]" [YOUR_KEY_SKILL] [YOUR_CITY]
```

### Priority 4: Broader Technical / Consulting

Wider net for general technical roles.

```
site:linkedin.com/jobs "[YOUR_KEY_SKILL] developer" [YOUR_LOCATION_OR_REMOTE]
site:boards.greenhouse.io "[YOUR_KEY_SKILL]" [YOUR_LOCATION_OR_REMOTE]
site:[YOUR_LOCAL_JOB_BOARD] [YOUR_KEY_SKILL] developer [YOUR_CITY]
```

## Location Filter

When evaluating results, verify the job location fits your constraints. Define acceptable areas:
- For on-site/hybrid searches: [YOUR_CITY] and surrounding areas, [ACCEPTABLE_AREA_1], [ACCEPTABLE_AREA_2]
- For remote searches: acceptable time zones or regions (e.g. "remote, worldwide", "remote, [YOUR_TIMEZONE] ±3h"), and whether the posting hires in [YOUR_COUNTRY]

## Date Filter

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/scrape [focus_area]" -> relevant category queries + custom focus-specific queries
