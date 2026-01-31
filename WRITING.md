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

## Org-mode → Markdown (planned)

Goal: keep org-mode as the source of truth and export to `src/content/writing/`.

Two good options:

1) **ox-hugo** (Emacs): export org subtree(s) to Markdown on save / command.
2) **Pandoc**: `pandoc post.org -f org -t gfm -o src/content/writing/post.md`

Next step: add a small script (plus Makefile target) to export from your org-roam directory into this repo.
