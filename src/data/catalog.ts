import sayingsFile from './sayings.json';
import categoriesFile from './categories.json';
import sourcesFile from './sources.json';
import aliasesFile from './id_aliases.json';
import audioManifestFile from './audio_manifest.json';
import slugMapFile from './slug_map.json';
import bgmPresetsFile from './bgm_presets.json';
import {
  type AudioManifest,
  type BGMPreset,
  type ContentSource,
  type Saying,
  type SayingCategory,
  type SayingType,
} from '@/core/types';

export const datasetVersion: string = sayingsFile.datasetVersion;
export const sayings: Saying[] = (sayingsFile.sayings as Saying[]).map((s) => ({
  ...s,
  slug: (slugMapFile.idToSlug as Record<string, string>)[s.id],
}));
export const categories: SayingCategory[] = [...(categoriesFile.categories as SayingCategory[])].sort(
  (a, b) => a.order - b.order
);
export const sources: ContentSource[] = sourcesFile.sources as ContentSource[];
export const idAliases: Record<string, string | null> = aliasesFile.aliases as Record<string, string | null>;
export const audioManifest: AudioManifest = audioManifestFile as AudioManifest;
export const idToSlug: Record<string, string> = slugMapFile.idToSlug as Record<string, string>;
export const slugToId: Record<string, string> = slugMapFile.slugToId as Record<string, string>;
export const bgmPresets: Record<string, BGMPreset> = bgmPresetsFile as Record<string, BGMPreset>;

const sayingByIdMap = new Map<string, Saying>(sayings.map((s) => [s.id, s]));
const categoryBySlugMap = new Map<string, SayingCategory>(categories.map((c) => [c.slug, c]));

export function getSayingById(id: string): Saying | undefined {
  const canonical = idAliases[id] ?? id;
  return canonical ? sayingByIdMap.get(canonical) : undefined;
}

export function getSayingBySlug(slug: string): Saying | undefined {
  const id = slugToId[slug];
  return id ? sayingByIdMap.get(id) : undefined;
}

export function getSayingSlug(sayingOrId: Saying | string): string {
  const id = typeof sayingOrId === 'string' ? sayingOrId : sayingOrId.id;
  return idToSlug[id] ?? id;
}

export function getCategoryBySlug(slug: string): SayingCategory | undefined {
  return categoryBySlugMap.get(slug);
}

export function getSayingsByCategory(slug: string): Saying[] {
  return sayings.filter((s) => s.categories.includes(slug));
}

export function getSayingsByType(type: SayingType): Saying[] {
  return sayings.filter((s) => s.type === type);
}

export function getAudioUrl(sayingId: string, kind: 'verse' | 'meaning', manifest: AudioManifest = audioManifest): string | null {
  const entry = manifest.files[sayingId];
  if (!entry) return null;
  const hash = kind === 'verse' ? entry.v : entry.m;
  if (!hash) return null;
  const base = manifest.cdnBaseUrl.replace(/\/+$/, '');
  return `${base}/${manifest.voice}/${sayingId}_${kind}_${hash}.m4a`;
}

export function getRelatedSayings(saying: Saying, limit = 4): Saying[] {
  const catSet = new Set(saying.categories);
  const scored: Array<{ s: Saying; overlap: number; sameType: boolean; popular: boolean }> = [];
  for (const candidate of sayings) {
    if (candidate.id === saying.id) continue;
    let overlap = 0;
    for (const c of candidate.categories) {
      if (catSet.has(c)) overlap += 1;
    }
    const sameType = candidate.type === saying.type;
    if (overlap > 0 || sameType) {
      scored.push({
        s: candidate,
        overlap,
        sameType,
        popular: candidate.isPopular === true,
      });
    }
  }
  scored.sort((a, b) => {
    if (a.overlap !== b.overlap) return b.overlap - a.overlap;
    if (a.sameType !== b.sameType) return a.sameType ? -1 : 1;
    if (a.popular !== b.popular) return a.popular ? -1 : 1;
    return a.s.id < b.s.id ? -1 : a.s.id > b.s.id ? 1 : 0;
  });
  return scored.slice(0, limit).map((x) => x.s);
}
