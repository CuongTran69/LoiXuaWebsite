import type { AudioManifest, BGMPreset, Saying, SayingCategory } from '@/core/types';

export interface ClientAppBundle {
  datasetVersion: string;
  count: number;
  categories: SayingCategory[];
  audio: AudioManifest;
  sayings: Saying[];
}

let cachedBundlePromise: Promise<ClientAppBundle> | null = null;
let cachedPresetsPromise: Promise<Record<string, BGMPreset>> | null = null;

export function loadClientBundle(): Promise<ClientAppBundle> {
  if (!cachedBundlePromise) {
    cachedBundlePromise = fetch('/data/app-bundle.json').then((res) => {
      if (!res.ok) throw new Error('Không thể tải dữ liệu Lời Xưa');
      return res.json() as Promise<ClientAppBundle>;
    });
  }
  return cachedBundlePromise;
}

export async function loadBgmPresets(): Promise<Record<string, BGMPreset>> {
  if (!cachedPresetsPromise) {
    cachedPresetsPromise = import('@/data/bgm_presets.json').then(
      (mod) => mod.default as Record<string, BGMPreset>
    );
  }
  return cachedPresetsPromise;
}
