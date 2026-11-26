import { accentPreservedNormalized, searchNormalized } from './vietnamese';
import type { Saying, SayingType } from './types';

export type SearchMatchLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type SearchScope = 'all' | SayingType;

export interface SayingSearchResult {
  saying: Saying;
  matchLevel: SearchMatchLevel;
  isPrefix: boolean;
  isWholeWord: boolean;
  matchedWords: string[];
}

export interface SearchExecutionResult {
  sayings: Saying[];
  results: SayingSearchResult[];
  topMatchLevel: SearchMatchLevel | null;
  isFuzzyResult: boolean;
}

interface SearchRecord {
  saying: Saying;
  exactNormalized: string;
  noAccentText: string;
  paddedExact: string;
  paddedNoAccent: string;
  noSpaceText: string;
  words: string[];
  wordSet: Set<string>;
  consonantWords: string[];
  meaningNoAccent: string | null;
  meaningWordSet: Set<string>;
  keywordsNoAccent: string[];
  keywordsWordSet: Set<string>;
  isPopular: boolean;
  textLength: number;
}

const MIN_QUERY_LENGTH = 2;
const LOOSE_MATCH_THRESHOLD = 5;
const MIN_NO_SPACE_LENGTH = 6;

export function consonantNormalized(word: string): string {
  let w = word.replace(/y/g, 'i');
  if (w.startsWith('ngh')) {
    w = 'ng' + w.slice(3);
  } else if (w.startsWith('ng')) {
    // Keep "ng" intact
  } else if (w.startsWith('gh')) {
    w = 'g' + w.slice(2);
  } else if (w.startsWith('tr') || w.startsWith('ch')) {
    w = 'ch' + w.slice(2);
  } else if (w.startsWith('gi')) {
    w = 'd' + w.slice(2);
  } else if (w.startsWith('r') || w.startsWith('d')) {
    w = 'd' + w.slice(1);
  } else if (w.startsWith('x') || w.startsWith('s')) {
    w = 's' + w.slice(1);
  } else if (w.startsWith('n') || w.startsWith('l')) {
    w = 'l' + w.slice(1);
  } else if (w.startsWith('qu')) {
    w = 'cu' + w.slice(2);
  } else if (w.startsWith('k') || w.startsWith('c') || w.startsWith('q')) {
    w = 'c' + w.slice(1);
  }
  return w;
}

export function isEditDistanceAtMostOne(s1: string, s2: string): boolean {
  const a1 = Array.from(s1);
  const a2 = Array.from(s2);
  const len1 = a1.length;
  const len2 = a2.length;

  if (Math.abs(len1 - len2) > 1) return false;

  if (len1 === len2) {
    const diffIndices: number[] = [];
    for (let i = 0; i < len1; i++) {
      if (a1[i] !== a2[i]) {
        diffIndices.push(i);
        if (diffIndices.length > 2) return false;
      }
    }
    if (diffIndices.length <= 1) return true;
    const [i, j] = diffIndices;
    return j === i + 1 && a1[i] === a2[j] && a1[j] === a2[i];
  }

  const shorter = len1 < len2 ? a1 : a2;
  const longer = len1 < len2 ? a2 : a1;
  let i = 0;
  let j = 0;
  let skipped = false;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i += 1;
      j += 1;
    } else {
      if (skipped) return false;
      skipped = true;
      j += 1;
    }
  }
  return true;
}

function phraseMatch(query: string, padded: string): { whole: boolean; prefix: boolean } | null {
  const needle = ' ' + query;
  let best: { whole: boolean; prefix: boolean } | null = null;
  let idx = padded.indexOf(needle);
  while (idx !== -1) {
    const end = idx + needle.length;
    const whole = end === padded.length || padded[end] === ' ';
    const prefix = idx === 0;
    if (!best || (whole && !best.whole)) {
      best = { whole, prefix };
    }
    if (whole) break;
    idx = padded.indexOf(needle, idx + 1);
  }
  return best;
}

function coveredWords(rec: SearchRecord, queryWords: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < queryWords.length; i++) {
    const qw = queryWords[i];
    if (rec.wordSet.has(qw)) {
      out.push(qw);
    } else if (i === queryWords.length - 1) {
      const w = rec.words.find((word) => word.startsWith(qw));
      if (w) out.push(w);
    }
  }
  return out;
}

export class SayingSearchEngine {
  private records: SearchRecord[] = [];

  constructor(sayings: Saying[] = []) {
    this.index(sayings);
  }

  index(sayings: Saying[]) {
    this.records = sayings.map((saying) => {
      const exactNormalized = accentPreservedNormalized(saying.text);
      const noAccent = searchNormalized(saying.text);
      const words = noAccent.split(' ').filter(Boolean);
      const m = saying.meaning ? searchNormalized(saying.meaning) : null;
      const kws = (saying.keywords ?? []).map((k) => searchNormalized(k));
      const kwWords = new Set<string>();
      for (const kw of kws) {
        for (const w of kw.split(' ').filter(Boolean)) kwWords.add(w);
      }
      return {
        saying,
        exactNormalized,
        noAccentText: noAccent,
        paddedExact: ' ' + exactNormalized,
        paddedNoAccent: ' ' + noAccent,
        noSpaceText: noAccent.replace(/ /g, ''),
        words,
        wordSet: new Set(words),
        consonantWords: words.map((w) => consonantNormalized(w)),
        meaningNoAccent: m,
        meaningWordSet: new Set(m ? m.split(' ').filter(Boolean) : []),
        keywordsNoAccent: kws,
        keywordsWordSet: kwWords,
        isPopular: saying.isPopular === true,
        textLength: saying.text.length,
      };
    });
  }

  search(query: string, scope: SearchScope = 'all', categorySlug?: string | null): SearchExecutionResult {
    const trimmed = query.trim();
    let candidates = this.records;
    if (scope !== 'all') {
      candidates = candidates.filter((r) => r.saying.type === scope);
    }
    if (categorySlug) {
      candidates = candidates.filter((r) => r.saying.categories.includes(categorySlug));
    }

    if (trimmed.length < MIN_QUERY_LENGTH) {
      const browsing = Boolean(categorySlug);
      return {
        sayings: browsing ? candidates.map((c) => c.saying) : [],
        results: [],
        topMatchLevel: null,
        isFuzzyResult: false,
      };
    }

    const exactQuery = accentPreservedNormalized(trimmed);
    const noAccentQuery = searchNormalized(trimmed);
    const noSpaceQuery = noAccentQuery.replace(/ /g, '');
    const hasAccents = exactQuery !== noAccentQuery;
    const queryWords = noAccentQuery.split(' ').filter(Boolean);

    if (!noAccentQuery) {
      return { sayings: [], results: [], topMatchLevel: null, isFuzzyResult: false };
    }

    const matches = new Map<string, SayingSearchResult>();
    let textMatchCount = 0;

    for (const rec of candidates) {
      const res = this.matchLevel1to4(rec, exactQuery, noAccentQuery, noSpaceQuery, hasAccents, queryWords);
      if (res) {
        matches.set(rec.saying.id, res);
        textMatchCount += 1;
      }
    }

    const allowLoose = textMatchCount < LOOSE_MATCH_THRESHOLD;
    const queryConsonants = queryWords.map((w) => consonantNormalized(w));

    for (const rec of candidates) {
      if (matches.has(rec.saying.id)) continue;
      if (this.matchKeywordsOrMeaning(rec, noAccentQuery, queryWords)) {
        matches.set(rec.saying.id, {
          saying: rec.saying,
          matchLevel: 5,
          isPrefix: false,
          isWholeWord: true,
          matchedWords: [],
        });
        continue;
      }
      if (!allowLoose) continue;
      const fuzzy = this.matchFuzzy(rec, queryWords, queryConsonants);
      if (fuzzy) {
        matches.set(rec.saying.id, fuzzy);
      } else {
        const partial = this.matchPartial(rec, queryWords);
        if (partial) matches.set(rec.saying.id, partial);
      }
    }

    const allResults: SayingSearchResult[] = [];
    const lengths = new Map<string, number>();
    for (const rec of candidates) {
      const r = matches.get(rec.saying.id);
      if (r) {
        allResults.push(r);
        lengths.set(rec.saying.id, rec.textLength);
      }
    }

    allResults.sort((r1, r2) => {
      if (r1.matchLevel !== r2.matchLevel) return r1.matchLevel - r2.matchLevel;
      if (r1.isWholeWord !== r2.isWholeWord) return r1.isWholeWord ? -1 : 1;
      if (r1.isPrefix !== r2.isPrefix) return r1.isPrefix ? -1 : 1;
      const p1 = r1.saying.isPopular === true;
      const p2 = r2.saying.isPopular === true;
      if (p1 !== p2) return p1 ? -1 : 1;
      return (lengths.get(r1.saying.id) ?? 0) - (lengths.get(r2.saying.id) ?? 0);
    });

    const topLevel = allResults[0]?.matchLevel ?? null;
    return {
      sayings: allResults.map((r) => r.saying),
      results: allResults,
      topMatchLevel: topLevel,
      isFuzzyResult: topLevel === 6,
    };
  }

  private matchLevel1to4(
    rec: SearchRecord,
    exactQuery: string,
    noAccentQuery: string,
    noSpaceQuery: string,
    hasAccents: boolean,
    queryWords: string[]
  ): SayingSearchResult | null {
    if (hasAccents) {
      const m = phraseMatch(exactQuery, rec.paddedExact);
      if (m) {
        return {
          saying: rec.saying,
          matchLevel: 1,
          isPrefix: m.prefix,
          isWholeWord: m.whole,
          matchedWords: coveredWords(rec, queryWords),
        };
      }
    }

    if (queryWords.length > 1) {
      const m = phraseMatch(noAccentQuery, rec.paddedNoAccent);
      if (m) {
        return {
          saying: rec.saying,
          matchLevel: 2,
          isPrefix: m.prefix,
          isWholeWord: m.whole,
          matchedWords: coveredWords(rec, queryWords),
        };
      }
    }

    if (queryWords.length === 1 && rec.wordSet.has(queryWords[0])) {
      const single = queryWords[0];
      return {
        saying: rec.saying,
        matchLevel: 4,
        isPrefix: rec.words[0] === single,
        isWholeWord: true,
        matchedWords: [single],
      };
    }

    if (noSpaceQuery.length >= MIN_NO_SPACE_LENGTH) {
      const from = rec.noSpaceText.indexOf(noSpaceQuery);
      if (from !== -1) {
        const to = from + noSpaceQuery.length;
        const covered: string[] = [];
        let offset = 0;
        for (const w of rec.words) {
          const next = offset + w.length;
          if (next > from && offset < to) covered.push(w);
          offset = next;
        }
        return {
          saying: rec.saying,
          matchLevel: 3,
          isPrefix: from === 0,
          isWholeWord: true,
          matchedWords: covered,
        };
      }
    }

    if (queryWords.length > 1) {
      if (queryWords.every((w) => rec.wordSet.has(w))) {
        return {
          saying: rec.saying,
          matchLevel: 4,
          isPrefix: rec.words[0] === queryWords[0],
          isWholeWord: true,
          matchedWords: queryWords,
        };
      }
    } else if (queryWords.length === 1) {
      const single = queryWords[0];
      const matchedWord = rec.words.find((w) => w.startsWith(single));
      if (matchedWord) {
        return {
          saying: rec.saying,
          matchLevel: 4,
          isPrefix: rec.words[0]?.startsWith(single) === true,
          isWholeWord: false,
          matchedWords: [matchedWord],
        };
      }
    }

    return null;
  }

  private matchFuzzy(
    rec: SearchRecord,
    queryWords: string[],
    queryConsonants: string[]
  ): SayingSearchResult | null {
    if (queryWords.length === 0 || queryWords.length > rec.words.length) return null;
    const used = new Array<boolean>(rec.words.length).fill(false);
    const matched: string[] = [];
    let inexact = false;

    for (let qi = 0; qi < queryWords.length; qi++) {
      const qw = queryWords[qi];
      let found: number | null = null;
      let foundInexact = false;
      for (let idx = 0; idx < rec.words.length; idx++) {
        if (used[idx]) continue;
        const sw = rec.words[idx];
        if (qw === sw) {
          found = idx;
          foundInexact = false;
          break;
        }
        if (found === null) {
          if (
            queryConsonants[qi] === rec.consonantWords[idx] ||
            (qw.length >= 4 && sw.length >= 4 && isEditDistanceAtMostOne(qw, sw))
          ) {
            found = idx;
            foundInexact = true;
          }
        }
      }
      if (found === null) return null;
      used[found] = true;
      matched.push(rec.words[found]);
      if (foundInexact) inexact = true;
    }

    if (!inexact) return null;
    return {
      saying: rec.saying,
      matchLevel: 6,
      isPrefix: rec.words[0] === matched[0],
      isWholeWord: true,
      matchedWords: matched,
    };
  }

  private matchPartial(rec: SearchRecord, queryWords: string[]): SayingSearchResult | null {
    if (queryWords.length < 2) return null;
    const matched = queryWords.filter((w) => rec.wordSet.has(w));
    if (matched.length < Math.trunc((queryWords.length + 1) / 2)) return null;
    return {
      saying: rec.saying,
      matchLevel: 7,
      isPrefix: rec.words[0] === queryWords[0],
      isWholeWord: true,
      matchedWords: matched,
    };
  }

  private matchKeywordsOrMeaning(
    rec: SearchRecord,
    noAccentQuery: string,
    queryWords: string[]
  ): boolean {
    if (rec.meaningNoAccent && (' ' + rec.meaningNoAccent).includes(' ' + noAccentQuery)) {
      return true;
    }
    for (const kw of rec.keywordsNoAccent) {
      if ((' ' + kw).includes(' ' + noAccentQuery)) return true;
    }
    if (queryWords.length >= 2) {
      if (queryWords.every((w) => rec.meaningWordSet.has(w))) return true;
      if (queryWords.every((w) => rec.keywordsWordSet.has(w))) return true;
    }
    return false;
  }
}
