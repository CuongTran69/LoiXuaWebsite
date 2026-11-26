#!/usr/bin/env node
/**
 * Syncs canonical dataset, categories, sources, aliases, audio manifest, presets and icons
 * from ../CaDaoViet into src/data/ and public/.
 * Preserves existing id <-> slug mappings in src/data/slug_map.json so SEO URLs never change.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '..');
const IOS_ROOT = path.resolve(WEB_ROOT, '../CaDaoViet');
const DATA_SRC = path.join(IOS_ROOT, 'CaDaoViet/CaDaoCore/Data');
const PRESETS_SRC = path.join(IOS_ROOT, 'CaDaoViet/Resources/presets');
const OUT_DATA = path.join(WEB_ROOT, 'src/data');
const OUT_PUBLIC_DATA = path.join(WEB_ROOT, 'public/data');
const OUT_ICONS = path.join(WEB_ROOT, 'public/icons');

fs.mkdirSync(OUT_DATA, { recursive: true });
fs.mkdirSync(OUT_PUBLIC_DATA, { recursive: true });
fs.mkdirSync(OUT_ICONS, { recursive: true });

function stripVietnameseForSlug(input) {
  return input
    .normalize('NFC')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
}

function makeBaseSlug(text) {
  const firstLine = text.split('\n')[0] || text;
  const words = stripVietnameseForSlug(firstLine).split('-').filter(Boolean);
  let slug = '';
  for (const w of words.slice(0, 8)) {
    const next = slug ? `${slug}-${w}` : w;
    if (next.length > 60 && slug) break;
    slug = next;
  }
  return slug || 'cau-ca-dao';
}

// 1. Copy core JSON files when ../CaDaoViet exists locally; in CI / standalone builds reuse committed src/data
const hasUpstreamData = fs.existsSync(path.join(DATA_SRC, 'sayings.json'));
for (const file of ['sayings.json', 'categories.json', 'sources.json', 'id_aliases.json', 'audio_manifest.json']) {
  const srcPath = path.join(DATA_SRC, file);
  const dstPath = path.join(OUT_DATA, file);
  if (hasUpstreamData && fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, dstPath);
  } else if (!fs.existsSync(dstPath)) {
    throw new Error(`Missing dataset file ${dstPath} and ../CaDaoViet is not present.`);
  }
}

// 2. Build / update immutable slug_map.json
const sayingsData = JSON.parse(fs.readFileSync(path.join(OUT_DATA, 'sayings.json'), 'utf8'));
const categoriesData = JSON.parse(fs.readFileSync(path.join(OUT_DATA, 'categories.json'), 'utf8'));
const audioManifest = JSON.parse(fs.readFileSync(path.join(OUT_DATA, 'audio_manifest.json'), 'utf8'));

const slugMapPath = path.join(OUT_DATA, 'slug_map.json');
let existingIdToSlug = {};
if (fs.existsSync(slugMapPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(slugMapPath, 'utf8'));
    existingIdToSlug = existing.idToSlug || {};
  } catch {
    existingIdToSlug = {};
  }
}

const idToSlug = {};
const usedSlugs = new Set();

// First preserve existing mappings for active IDs
for (const s of sayingsData.sayings) {
  const prev = existingIdToSlug[s.id];
  if (prev && !usedSlugs.has(prev)) {
    idToSlug[s.id] = prev;
    usedSlugs.add(prev);
  }
}

// Generate slugs for any new IDs
for (const s of sayingsData.sayings) {
  if (idToSlug[s.id]) continue;
  const base = makeBaseSlug(s.text);
  let candidate = base;
  if (usedSlugs.has(candidate)) {
    candidate = `${base}-${s.id.slice(0, 6)}`;
  }
  let counter = 2;
  while (usedSlugs.has(candidate)) {
    candidate = `${base}-${s.id.slice(0, 6)}-${counter++}`;
  }
  idToSlug[s.id] = candidate;
  usedSlugs.add(candidate);
}

const slugToId = {};
for (const [id, slug] of Object.entries(idToSlug)) {
  slugToId[slug] = id;
}

fs.writeFileSync(slugMapPath, JSON.stringify({ idToSlug, slugToId }, null, 2));

// 3. Parse BGM presets from CaDaoViet/Resources/presets/*.js when available; else reuse committed src/data/bgm_presets.json
const presetFiles = ['dem_trang.js', 'loi_ru_que.js', 'ben_hien_mua.js', 'som_tren_lang.js', 'trang_tho.js'];
const presetsOutPath = path.join(OUT_DATA, 'bgm_presets.json');
let presets = {};
if (fs.existsSync(path.join(PRESETS_SRC, presetFiles[0]))) {
  for (const file of presetFiles) {
    const raw = fs.readFileSync(path.join(PRESETS_SRC, file), 'utf8');
    const match = raw.match(/BGM_PRESETS\.([A-Za-z0-9_]+)\s*=\s*(\{[\s\S]*\});?\s*$/);
    if (!match) {
      throw new Error(`Cannot parse preset in ${file}`);
    }
    const id = match[1];
    presets[id] = JSON.parse(match[2].replace(/;\s*$/, ''));
  }
  fs.writeFileSync(presetsOutPath, JSON.stringify(presets));
} else if (fs.existsSync(presetsOutPath)) {
  presets = JSON.parse(fs.readFileSync(presetsOutPath, 'utf8'));
} else {
  throw new Error(`Missing ${presetsOutPath} and ../CaDaoViet/Resources/presets is not present.`);
}

// 4. Write compact client bundle (used by Search, Swipe, Quiz, Duel, Oracle, Wind-down, Favorites, Notebook)
const clientSayings = sayingsData.sayings.map((s) => ({
  id: s.id,
  slug: idToSlug[s.id],
  text: s.text,
  type: s.type,
  categories: s.categories,
  keywords: s.keywords ?? null,
  meaning: s.meaning ?? null,
  origin: s.origin ?? null,
  example: s.example ?? null,
  glossary: s.glossary ?? null,
  poeticForm: s.poeticForm ?? null,
  isPopular: s.isPopular ?? false,
  region: s.region ?? null,
  source: s.source ?? null,
  sourceURL: s.sourceURL ?? null,
  license: s.license ?? null,
  dailyEligible: s.dailyEligible ?? false,
  variantGroupId: s.variantGroupId ?? null,
}));

const appBundle = {
  datasetVersion: sayingsData.datasetVersion,
  count: clientSayings.length,
  categories: categoriesData.categories,
  audio: {
    cdnBaseUrl: audioManifest.cdnBaseUrl,
    voice: audioManifest.voice,
    files: audioManifest.files,
  },
  sayings: clientSayings,
};
fs.writeFileSync(path.join(OUT_PUBLIC_DATA, 'app-bundle.json'), JSON.stringify(appBundle));

// 5. Copy icons
const appIcon = path.join(IOS_ROOT, 'CaDaoViet/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png');
const tabLogo = path.join(IOS_ROOT, 'CaDaoViet/Resources/Assets.xcassets/AppLogo.imageset/logo@3x.png');
if (fs.existsSync(appIcon)) {
  fs.copyFileSync(appIcon, path.join(OUT_ICONS, 'app-icon.png'));
}
if (fs.existsSync(tabLogo)) {
  fs.copyFileSync(tabLogo, path.join(OUT_ICONS, 'logo.png'));
}

console.log(
  `Synced ${clientSayings.length} sayings (v${sayingsData.datasetVersion}), ` +
  `${categoriesData.categories.length} categories, ${Object.keys(presets).length} BGM presets.`
);
