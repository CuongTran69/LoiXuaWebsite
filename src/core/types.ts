export type SayingType = 'ca-dao' | 'tuc-ngu' | 'thanh-ngu';

export interface GlossaryEntry {
  word: string;
  meaning: string;
}

export interface Saying {
  id: string;
  slug?: string;
  text: string;
  type: SayingType;
  categories: string[];
  keywords?: string[] | null;
  meaning?: string | null;
  origin?: string | null;
  example?: string | null;
  glossary?: GlossaryEntry[] | null;
  poeticForm?: string | null;
  isPopular?: boolean | null;
  region?: string | null;
  source?: string | null;
  sourceURL?: string | null;
  license?: string | null;
  dailyEligible?: boolean | null;
  variantGroupId?: string | null;
  normalizedText?: string | null;
}

export interface SayingCategory {
  slug: string;
  name: string;
  description: string;
  order: number;
  icon: string;
}

export interface ContentSource {
  id: string;
  name: string;
  author?: string | null;
  url?: string | null;
  license: string;
  licenseURL?: string | null;
  note: string;
}

export interface AudioFileEntry {
  v?: string;
  m?: string;
  vd?: number;
  md?: number;
}

export interface AudioManifest {
  version: number;
  datasetVersion: string;
  cdnBaseUrl: string;
  voice: string;
  files: Record<string, AudioFileEntry>;
}

export interface BGMPreset {
  id: string;
  title: string;
  subtitle: string;
  bpm?: number;
  meter?: number[];
  mood?: string;
  description?: string;
  loopSeconds: number;
  tracks: Array<{
    name: string;
    instrument: string;
    volume: number;
    pan: number;
    notes: Array<{
      t: number;
      n: number | string;
      d: number;
      v: number;
    }>;
  }>;
  mix?: {
    tape?: number;
    rain?: number;
    reverb?: number;
  };
}

export function hasMeaning(s: Saying): boolean {
  return Boolean(s.meaning && s.meaning.trim().length > 0);
}

export const TYPE_LABELS: Record<SayingType, string> = {
  'ca-dao': 'Ca dao',
  'tuc-ngu': 'Tục ngữ',
  'thanh-ngu': 'Thành ngữ',
};

export const REGION_LABELS: Record<string, string> = {
  'toan-quoc': 'Toàn quốc',
  'mien-bac': 'Miền Bắc',
  'mien-trung': 'Miền Trung',
  'mien-nam': 'Miền Nam',
  'bac-bo': 'Bắc Bộ',
  'trung-bo': 'Trung Bộ',
  'nam-bo': 'Nam Bộ',
};
