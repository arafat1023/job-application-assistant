#!/usr/bin/env python3
"""Render job-search CLI results as a self-contained HTML report.

Takes the JSON that any of the bundled portal skills emit (ats-search,
freehire-search, hn-hiring-search, linkedin-search) — from files or stdin —
and writes one HTML file you can open straight from the filesystem: no
server, no network, no dependencies. Client-side text filter, column
sorting, remote-only toggle, and light/dark theme via prefers-color-scheme.

Usage:
    bun run .agents/skills/ats-search/cli/src/cli.ts search -c stripe,linear -q engineer \
        | python3 tools/jobs_report.py -o jobs_report.html
    python3 tools/jobs_report.py results1.json results2.json -o jobs_report.html
    python3 tools/jobs_report.py *.json --title "Watchlist sweep, July" -o report.html

Accepts either the portal-skill envelope {"meta": ..., "results": [...]} or a
bare JSON array of results. Different skills carry different fields (the HN
skill has header/text instead of title, no date); missing fields render as "—".
"""

from __future__ import annotations

import argparse
import html
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


def load_results(raw: str, source: str) -> list[dict]:
    """Results from one JSON document (envelope or bare array), tagged with its source."""
    try:
        doc = json.loads(raw)
    except json.JSONDecodeError as e:
        raise SystemExit(f"error: {source}: not valid JSON ({e})")
    if isinstance(doc, dict):
        results = doc.get("results")
        if not isinstance(results, list):
            raise SystemExit(f'error: {source}: expected an object with a "results" array')
    elif isinstance(doc, list):
        results = doc
    else:
        raise SystemExit(f"error: {source}: expected a JSON object or array")
    out = []
    for r in results:
        if isinstance(r, dict):
            r = dict(r)
            r["_source"] = source
            out.append(r)
    return out


def normalize(r: dict) -> dict:
    """Map any portal skill's result shape onto the report's columns."""
    title = r.get("title") or r.get("header") or "(untitled)"
    date = r.get("date") or r.get("posted_at") or None
    if isinstance(date, str) and len(date) >= 10:
        date = date[:10]
    remote = r.get("remote")
    if remote is None and isinstance(r.get("work_mode"), str):
        remote = r["work_mode"] == "remote"
    source = r.get("ats") or r.get("_source") or ""
    # De-noise a filename source down to its stem ("results1.json" -> "results1").
    if "/" in source or source.endswith(".json"):
        source = Path(source).stem
    return {
        "title": str(title),
        "company": str(r.get("company") or "—"),
        "location": str(r.get("location") or "—"),
        "date": str(date) if date else "",
        "remote": bool(remote) if remote is not None else None,
        "url": str(r.get("url") or ""),
        "source": str(source),
        "extra": str(r.get("department") or r.get("category") or ""),
    }


def render(jobs: list[dict], title: str) -> str:
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    rows = []
    for j in jobs:
        remote_cell = "✓" if j["remote"] is True else ("✗" if j["remote"] is False else "—")
        link = (
            f'<a href="{html.escape(j["url"], quote=True)}" target="_blank" rel="noopener">'
            f'{html.escape(j["title"])}</a>'
            if j["url"]
            else html.escape(j["title"])
        )
        rows.append(
            "<tr>"
            f"<td>{link}</td>"
            f'<td>{html.escape(j["company"])}</td>'
            f'<td>{html.escape(j["location"])}</td>'
            f'<td data-remote="{remote_cell}">{remote_cell}</td>'
            f'<td>{html.escape(j["date"]) or "—"}</td>'
            f'<td>{html.escape(j["extra"]) or "—"}</td>'
            f'<td>{html.escape(j["source"]) or "—"}</td>'
            "</tr>"
        )
    table_rows = "\n".join(rows)
    esc_title = html.escape(title)

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc_title}</title>
<style>
  :root {{
    --bg: #ffffff; --fg: #1a1a1a; --muted: #666; --border: #d9d9d9;
    --row-alt: #f6f6f6; --accent: #0b62d6; --chip: #eef4fd;
  }}
  @media (prefers-color-scheme: dark) {{
    :root {{
      --bg: #14161a; --fg: #e6e6e6; --muted: #9a9a9a; --border: #333;
      --row-alt: #1c1f24; --accent: #6aa5f0; --chip: #1e2a3d;
    }}
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0; padding: 1.5rem; background: var(--bg); color: var(--fg);
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
  }}
  h1 {{ font-size: 1.3rem; margin: 0 0 0.25rem; }}
  .meta {{ color: var(--muted); font-size: 0.85rem; margin-bottom: 1rem; }}
  .controls {{ display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; margin-bottom: 1rem; }}
  #filter {{
    flex: 1 1 240px; max-width: 420px; padding: 0.45rem 0.6rem;
    border: 1px solid var(--border); border-radius: 6px;
    background: var(--bg); color: var(--fg); font-size: 0.95rem;
  }}
  label.toggle {{ user-select: none; cursor: pointer; font-size: 0.9rem; }}
  .count {{ color: var(--muted); font-size: 0.85rem; margin-left: auto; }}
  .tablewrap {{ overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; }}
  table {{ border-collapse: collapse; width: 100%; min-width: 720px; }}
  th, td {{ text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); }}
  th {{
    cursor: pointer; white-space: nowrap; position: sticky; top: 0;
    background: var(--bg); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.03em;
  }}
  th .arrow {{ opacity: 0.5; font-size: 0.8em; }}
  tbody tr:nth-child(even) {{ background: var(--row-alt); }}
  td a {{ color: var(--accent); text-decoration: none; }}
  td a:hover {{ text-decoration: underline; }}
  td:nth-child(4) {{ text-align: center; }}
  .hidden {{ display: none; }}
</style>
</head>
<body>
<h1>{esc_title}</h1>
<div class="meta">Generated {generated} · {len(jobs)} jobs</div>
<div class="controls">
  <input id="filter" type="search" placeholder="Filter: title, company, location…" autofocus>
  <label class="toggle"><input id="remoteonly" type="checkbox"> remote only</label>
  <span class="count" id="count"></span>
</div>
<div class="tablewrap">
<table id="jobs">
  <thead><tr>
    <th data-col="0">Title <span class="arrow"></span></th>
    <th data-col="1">Company <span class="arrow"></span></th>
    <th data-col="2">Location <span class="arrow"></span></th>
    <th data-col="3">Remote <span class="arrow"></span></th>
    <th data-col="4">Date <span class="arrow"></span></th>
    <th data-col="5">Dept/Category <span class="arrow"></span></th>
    <th data-col="6">Source <span class="arrow"></span></th>
  </tr></thead>
  <tbody>
{table_rows}
  </tbody>
</table>
</div>
<script>
(function () {{
  var tbody = document.querySelector("#jobs tbody");
  var rows = Array.prototype.slice.call(tbody.rows);
  var filter = document.getElementById("filter");
  var remoteOnly = document.getElementById("remoteonly");
  var count = document.getElementById("count");

  function apply() {{
    var q = filter.value.trim().toLowerCase().split(/\\s+/).filter(Boolean);
    var shown = 0;
    rows.forEach(function (tr) {{
      var text = tr.textContent.toLowerCase();
      var ok = q.every(function (term) {{ return text.indexOf(term) !== -1; }});
      if (ok && remoteOnly.checked) ok = tr.cells[3].dataset.remote === "✓";
      tr.classList.toggle("hidden", !ok);
      if (ok) shown++;
    }});
    count.textContent = shown + " / " + rows.length + " shown";
  }}
  filter.addEventListener("input", apply);
  remoteOnly.addEventListener("change", apply);

  var sortCol = -1, sortAsc = true;
  document.querySelectorAll("th").forEach(function (th) {{
    th.addEventListener("click", function () {{
      var col = +th.dataset.col;
      sortAsc = col === sortCol ? !sortAsc : true;
      sortCol = col;
      rows.sort(function (a, b) {{
        var x = a.cells[col].textContent.trim().toLowerCase();
        var y = b.cells[col].textContent.trim().toLowerCase();
        return (x < y ? -1 : x > y ? 1 : 0) * (sortAsc ? 1 : -1);
      }});
      rows.forEach(function (tr) {{ tbody.appendChild(tr); }});
      document.querySelectorAll("th .arrow").forEach(function (s) {{ s.textContent = ""; }});
      th.querySelector(".arrow").textContent = sortAsc ? "▲" : "▼";
    }});
  }});
  apply();
}})();
</script>
</body>
</html>
"""


def main() -> int:
    p = argparse.ArgumentParser(description="Render portal-skill JSON results as a standalone HTML report.")
    p.add_argument("files", nargs="*", help="JSON files from the portal CLIs (omit to read stdin)")
    p.add_argument("-o", "--output", default="jobs_report.html", help="output HTML path (default: jobs_report.html)")
    p.add_argument("--title", default="Job Search Results", help="report heading")
    args = p.parse_args()

    raw_results: list[dict] = []
    if args.files:
        for f in args.files:
            raw_results.extend(load_results(Path(f).read_text(encoding="utf-8"), f))
    else:
        if sys.stdin.isatty():
            p.error("no input: pass JSON files or pipe a CLI's JSON output to stdin")
        raw_results.extend(load_results(sys.stdin.read(), "stdin"))

    jobs = [normalize(r) for r in raw_results]
    jobs.sort(key=lambda j: j["date"], reverse=True)

    out = Path(args.output)
    out.write_text(render(jobs, args.title), encoding="utf-8")
    print(f"wrote {out} ({len(jobs)} jobs) — open it in a browser")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
