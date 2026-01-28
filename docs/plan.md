# Website Polishing Plan (Revised)

## Snapshot (current site)
- Single-page home at `src/pages/index.astro` with timeline, blog list, academic list, and footer links.
- Individual posts live in `src/pages/blog/` and `src/pages/academic/` using `src/layouts/Post.astro`.
- Styles duplicated in `src/styles/global.css` and `public/styles/global.css`.
- Logos in `public/logos/` include `company-placeholder.svg` and `duke.svg`.

## Inputs needed (blockers)
- Final timeline entries: role title, company/university name, dates, and 1-2 sentence descriptions.
- Logos (SVG preferred) for each timeline entry; confirm desired background treatment.
- Short intro sentence below the name (optional) and preferred wording.
- Social targets: GitHub, LinkedIn, email address, and whether to include a resume link.
- Preferred typography: keep current fonts or switch to a specific Google Font.

## Phase 1 - Content (highest priority)
1. **Timeline real data**
   - Replace placeholder roles in `src/pages/index.astro` with real positions and dates.
   - Order entries most recent -> oldest.
   - Add concise, compelling descriptions (1-2 sentences each).
2. **Intro blurb**
   - Add a short paragraph under the name in `src/pages/index.astro`.
   - Use this text to update the meta description for consistency.

## Phase 2 - Visual polish
3. **Logos**
   - Add SVG logos to `public/logos/` for each timeline entry.
   - Replace `company-placeholder.svg` references in `src/pages/index.astro`.
   - Keep consistent size (48x48) and padding; ensure alt text is accurate.
4. **Typography adjustments**
   - Decide single source of truth for CSS (prefer `src/styles/global.css`) and remove duplication.
   - If switching fonts, add import and update `--font-serif` / `--font-sans`.
   - Revisit line-height and spacing to keep timeline readable on mobile.
5. **Social links with icons (optional)**
   - Add lightweight SVG icons or styled text links in header or footer.
   - Include a `mailto:` link and keep visual hierarchy subtle.
6. **Favicon**
   - Create `public/favicon.svg` (simple initials "GS" or monogram) and add `<link rel="icon">`.

## Phase 3 - Technical/SEO
7. **Meta tags**
   - Add Open Graph and Twitter card tags in `src/pages/index.astro` and `src/layouts/Post.astro`.
   - Decide on an OG image (e.g., `public/og.png`) and add it if desired.
8. **404 page**
   - Add `src/pages/404.astro` with a minimal layout and link back home.

## Phase 4 - QA / Mobile
9. **Mobile layout checks**
   - Verify timeline stacks cleanly on narrow screens.
   - Confirm nav anchor scrolling works and doesn't hide headings.
   - Test blog/academic lists for spacing and link tap targets.

## Phase 5 - Cleanup (conditional)
10. **Legacy Hugo files**
    - Remove `themes/`, `content/`, `hugo.toml`, `archetypes/`, `layouts/`, `assets/` if they exist after Astro is confirmed in production.
11. **Duplicate PDFs**
    - Keep only `public/` versions and remove any `static/` or `research/` duplicates if present.

## Deliverables (expected file touchpoints)
- `src/pages/index.astro`
- `src/layouts/Post.astro`
- `src/pages/404.astro`
- `src/styles/global.css`
- `public/logos/*`
- `public/favicon.svg`
- `public/og.png` (optional)
