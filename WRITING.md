# Writing workflow (draft)

This repo now supports a "Writing" section backed by Astro content collections.

## Where posts live

- `src/content/writing/*.md`

Frontmatter schema is defined in `src/content/config.ts`.

## Drafts

Set `draft: true` to keep a post from being published (it won't appear in listings, RSS, or static routes).

## Routes

- `/writing/` → list of published entries
- `/writing/<slug>/` → an individual entry
- `/rss.xml` → RSS feed (published entries only)

## Org-mode → Markdown

Goal: keep org-mode as the source of truth and export to `src/content/writing/`.

This repo includes a small exporter script that:
- scans a directory of `.org` files (optionally recursive)
- **by default only exports files explicitly marked for publishing** (to avoid accidentally exporting private notes)
- converts each file to GitHub-flavored Markdown via **pandoc**
- generates the required Astro frontmatter (`title`, `pubDate`, etc.)
- writes the result into `src/content/writing/*.md`

### Requirements

- `pandoc` installed and available on your PATH

### Usage

Recommended: set paths in a `.env` (see `.env.example`), then run:

```bash
# from repo root
npm run export:org

# dry-run (prints which files would be updated)
npm run export:org -- --dry-run
```

You can still pass explicit paths:

```bash
npm run export:org -- --in /path/to/your/org --out src/content/writing
```

If you want recursion:

```bash
npm run export:org -- --recursive
```

If you *really* want to export everything under the input directory (dangerous if you point at full org-roam):

```bash
npm run export:org -- --all
```

### Supported org header keywords

The exporter looks for org keywords like:

- `#+TITLE:` → maps to `title` (fallback: filename)
- `#+DESCRIPTION:` → maps to `description`
- `#+DATE:` (or `#+PUBLISH_DATE:` / `#+PUBDATE:`) → maps to `pubDate`
- `#+UPDATED:` (or `#+UPDATED_DATE:`) → maps to `updatedDate`
- `#+FILETAGS:` (e.g. `:publish:causal:llm:`) → maps to `tags`
- `#+DRAFT: true` (or include the `draft` tag) → maps to `draft: true`
- `#+PUBLISH: true` (or include the `publish` tag) → marks a file as eligible for export by default

If no date is provided, it falls back to the file mtime.

### Notes / next step

If you want this to run from your org-roam directory without typing paths every time, next step is a tiny wrapper Makefile target or `.env` file that stores your org-roam path.
