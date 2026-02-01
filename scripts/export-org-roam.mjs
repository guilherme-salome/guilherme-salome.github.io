#!/usr/bin/env node
/**
 * Export org-mode files to Astro content collection markdown.
 *
 * Usage:
 *   node scripts/export-org-roam.mjs --in /path/to/org-roam --out src/content/writing
 *
 * Requires:
 *   pandoc on PATH
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = { inDir: null, outDir: null, glob: '.org', dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--in') args.inDir = argv[++i];
    else if (a === '--out') args.outDir = argv[++i];
    else if (a === '--ext') args.glob = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '-h' || a === '--help') {
      console.log(`\nExport org-mode files into Astro content markdown.\n\nOptions:\n  --in <dir>      Input directory containing .org files\n  --out <dir>     Output directory (e.g. src/content/writing)\n  --ext <ext>     File extension filter (default: .org)\n  --dry-run       Print what would change without writing\n`);
      process.exit(0);
    } else {
      throw new Error(`Unknown arg: ${a}`);
    }
  }
  if (!args.inDir || !args.outDir) throw new Error('Missing required args: --in and --out');
  return args;
}

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseOrgHeader(src) {
  // org keywords are typically #+KEY: value
  const lines = src.split(/\r?\n/);
  const header = {};
  for (const line of lines) {
    const m = line.match(/^#\+([A-Za-z_]+):\s*(.*)\s*$/);
    if (!m) continue;
    header[m[1].toUpperCase()] = m[2];
  }

  const title = header.TITLE?.trim();
  const description = header.DESCRIPTION?.trim();
  const dateRaw = (header.PUBDATE || header.PUBLISH_DATE || header.DATE || '').trim();
  const updatedRaw = (header.UPDATED || header.UPDATED_DATE || '').trim();

  // FILETAGS is often :tag1:tag2:
  const filetags = (header.FILETAGS || '').trim();
  const tags = filetags
    ? filetags
        .split(':')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const draft = /^(true|yes|1)$/i.test((header.DRAFT || '').trim()) || tags.includes('draft');

  return { title, description, dateRaw, updatedRaw, tags, draft };
}

function toIsoDateOrThrow(dateRaw, fallbackMtimeMs) {
  if (dateRaw) {
    // Accept either YYYY-MM-DD or full datetime; keep it simple.
    const d = new Date(dateRaw);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    // org often has <2026-01-31 Sat>
    const m = dateRaw.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) return new Date(m[1]).toISOString();
    throw new Error(`Could not parse date: ${dateRaw}`);
  }
  return new Date(fallbackMtimeMs).toISOString();
}

function yamlEscape(s) {
  if (s == null) return s;
  const needsQuotes = /[:\n\r\t#\-\[\]\{\},&\*\!\|>'"%@`]/.test(s);
  if (!needsQuotes) return s;
  return JSON.stringify(s); // JSON string is valid YAML
}

function buildFrontmatter(meta) {
  const lines = ['---'];
  lines.push(`title: ${yamlEscape(meta.title)}`);
  if (meta.description) lines.push(`description: ${yamlEscape(meta.description)}`);
  lines.push(`pubDate: ${yamlEscape(meta.pubDate)}`);
  if (meta.updatedDate) lines.push(`updatedDate: ${yamlEscape(meta.updatedDate)}`);
  lines.push(`tags: [${meta.tags.map((t) => yamlEscape(t)).join(', ')}]`);
  lines.push(`draft: ${meta.draft ? 'true' : 'false'}`);
  lines.push('---\n');
  return lines.join('\n');
}

function convertOrgToMarkdown(orgPath) {
  const res = spawnSync('pandoc', ['-f', 'org', '-t', 'gfm', '--wrap=preserve', orgPath], {
    encoding: 'utf8',
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`pandoc failed for ${orgPath}:\n${res.stderr || res.stdout}`);
  }
  return res.stdout;
}

function writeIfChanged(outPath, content, dryRun) {
  const prev = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : null;
  const changed = prev !== content;
  if (changed && !dryRun) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, content, 'utf8');
  }
  return { changed };
}

function main() {
  const { inDir, outDir, glob, dryRun } = parseArgs(process.argv);
  const inAbs = path.resolve(process.cwd(), inDir);
  const outAbs = path.resolve(process.cwd(), outDir);

  if (!fs.existsSync(inAbs)) throw new Error(`Input dir not found: ${inAbs}`);
  if (!fs.existsSync(outAbs)) fs.mkdirSync(outAbs, { recursive: true });

  const ext = glob.startsWith('.') ? glob : `.${glob}`;
  const orgFiles = fs
    .readdirSync(inAbs)
    .filter((f) => f.endsWith(ext))
    .map((f) => path.join(inAbs, f));

  if (orgFiles.length === 0) {
    console.log(`No ${ext} files found in ${inAbs}`);
    process.exit(0);
  }

  let changedCount = 0;
  for (const orgPath of orgFiles) {
    const orgSrc = fs.readFileSync(orgPath, 'utf8');
    const st = fs.statSync(orgPath);

    const hdr = parseOrgHeader(orgSrc);
    const title = hdr.title || path.basename(orgPath, ext);

    const pubDate = toIsoDateOrThrow(hdr.dateRaw, st.mtimeMs);
    const updatedDate = hdr.updatedRaw ? toIsoDateOrThrow(hdr.updatedRaw, st.mtimeMs) : undefined;

    const mdBody = convertOrgToMarkdown(orgPath).trimEnd() + '\n';

    const frontmatter = buildFrontmatter({
      title,
      description: hdr.description,
      pubDate,
      updatedDate,
      tags: hdr.tags,
      draft: hdr.draft,
    });

    const outName = `${slugify(path.basename(orgPath, ext))}.md`;
    const outPath = path.join(outAbs, outName);
    const final = frontmatter + mdBody;

    const { changed } = writeIfChanged(outPath, final, dryRun);
    if (changed) {
      changedCount++;
      console.log(`${dryRun ? '[dry-run] ' : ''}updated: ${path.relative(process.cwd(), outPath)}`);
    } else {
      console.log(`unchanged: ${path.relative(process.cwd(), outPath)}`);
    }
  }

  console.log(`\nDone. ${changedCount}/${orgFiles.length} file(s) updated.`);
}

main();
