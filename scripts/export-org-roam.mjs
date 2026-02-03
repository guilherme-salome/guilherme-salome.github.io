#!/usr/bin/env node
/**
 * Export org-mode files to Astro content collection markdown.
 *
 * Safety: by default, this script will ONLY export files that are explicitly
 * marked for publishing (tagged with :publish: or containing #+PUBLISH: true).
 * This prevents accidentally exporting private org-roam notes into a public site.
 *
 * Usage:
 *   node scripts/export-org-roam.mjs --in /path/to/org --out src/content/writing
 *   node scripts/export-org-roam.mjs --in /path/to/org --out src/content/writing --all
 *
 * Or via .env (recommended):
 *   ORG_ROAM_DIR=/path/to/your/org
 *   ORG_OUT_DIR=src/content/writing
 *   ORG_PUBLISH_TAG=publish
 *   npm run export:org
 *
 * Requires:
 *   pandoc on PATH
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function loadDotEnv(dotEnvPath) {
  if (!fs.existsSync(dotEnvPath)) return;
  const src = fs.readFileSync(dotEnvPath, 'utf8');
  for (const line of src.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    // Strip surrounding quotes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = val;
  }
}

function parseArgs(argv) {
  // Load .env from the current working directory if present.
  loadDotEnv(path.join(process.cwd(), '.env'));

  const args = {
    inDir: process.env.ORG_ROAM_DIR || null,
    outDir: process.env.ORG_OUT_DIR || 'src/content/writing',
    glob: process.env.ORG_EXT || '.org',
    dryRun: false,
    recursive: false,
    requirePublish: true,
    publishTag: process.env.ORG_PUBLISH_TAG || 'publish',
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--in') args.inDir = argv[++i];
    else if (a === '--out') args.outDir = argv[++i];
    else if (a === '--ext') args.glob = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--recursive') args.recursive = true;
    else if (a === '--no-recursive') args.recursive = false;
    else if (a === '--publish-tag') args.publishTag = argv[++i];
    else if (a === '--all') args.requirePublish = false;
    else if (a === '--require-publish') args.requirePublish = true;
    else if (a === '-h' || a === '--help') {
      console.log(`\nExport org-mode files into Astro content markdown.\n\nOptions:\n  --in <dir>           Input directory containing .org files (or set ORG_ROAM_DIR in .env)\n  --out <dir>          Output directory (default: src/content/writing; or set ORG_OUT_DIR)\n  --ext <ext>          File extension filter (default: .org; or set ORG_EXT)\n  --recursive          Recurse into subdirectories (default: off)\n  --dry-run            Print what would change without writing\n\nPublishing safety (default ON):\n  --require-publish    Only export files tagged :publish: or with #+PUBLISH: true (default)\n  --publish-tag <tag>  Tag name to require (default: publish; or set ORG_PUBLISH_TAG)\n  --all                Export all matching files (DANGEROUS if pointed at full org-roam)\n`);
      process.exit(0);
    } else {
      throw new Error(`Unknown arg: ${a}`);
    }
  }

  if (!args.inDir) throw new Error('Missing required input: --in <dir> (or set ORG_ROAM_DIR in .env)');
  if (!args.outDir) throw new Error('Missing required output: --out <dir> (or set ORG_OUT_DIR in .env)');
  if (!args.publishTag) throw new Error('Missing publish tag (set ORG_PUBLISH_TAG or pass --publish-tag)');

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

function parseOrgHeader(src, publishTag) {
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
  const tagsRaw = filetags
    ? filetags
        .split(':')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const draft = /^(true|yes|1)$/i.test((header.DRAFT || '').trim()) || tagsRaw.includes('draft');

  const publishKeyword = /^(true|yes|1)$/i.test((header.PUBLISH || '').trim());
  const publish = publishKeyword || tagsRaw.includes(publishTag);

  // Do not leak control tags into public-facing tags.
  const tags = tagsRaw.filter((t) => t !== 'draft' && t !== publishTag);

  return { title, description, dateRaw, updatedRaw, tags, draft, publish };
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

function listFiles(dirAbs, ext, recursive) {
  const out = [];
  for (const ent of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    const p = path.join(dirAbs, ent.name);
    if (ent.isDirectory()) {
      if (recursive) out.push(...listFiles(p, ext, recursive));
      continue;
    }
    if (ent.isFile() && ent.name.endsWith(ext)) out.push(p);
  }
  return out;
}

function main() {
  const { inDir, outDir, glob, dryRun, recursive, requirePublish, publishTag } = parseArgs(process.argv);
  const inAbs = path.resolve(process.cwd(), inDir);
  const outAbs = path.resolve(process.cwd(), outDir);

  if (!fs.existsSync(inAbs)) throw new Error(`Input dir not found: ${inAbs}`);
  if (!fs.existsSync(outAbs)) fs.mkdirSync(outAbs, { recursive: true });

  const ext = glob.startsWith('.') ? glob : `.${glob}`;
  const orgFiles = listFiles(inAbs, ext, recursive);

  if (orgFiles.length === 0) {
    console.log(`No ${ext} files found in ${inAbs}`);
    process.exit(0);
  }

  let changedCount = 0;
  let exportedCount = 0;
  let skippedCount = 0;

  for (const orgPath of orgFiles) {
    const orgSrc = fs.readFileSync(orgPath, 'utf8');
    const st = fs.statSync(orgPath);

    const hdr = parseOrgHeader(orgSrc, publishTag);
    if (requirePublish && !hdr.publish) {
      skippedCount++;
      continue;
    }
    exportedCount++;

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

  if (requirePublish) {
    console.log(`\nDone. ${changedCount}/${exportedCount} exported file(s) updated. (${skippedCount} skipped; missing :${publishTag}: or #+PUBLISH: true)`);
  } else {
    console.log(`\nDone. ${changedCount}/${exportedCount} exported file(s) updated.`);
  }
}

main();
