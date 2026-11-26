/**
 * Normalizes Vietnamese text for accent-insensitive, case-insensitive search.
 * Mirrors Swift `String.searchNormalized`: NFC -> lowercase -> đ/Đ -> d -> strip diacritics -> alphanumeric/spaces collapsed.
 */
export function searchNormalized(input: string): string {
  const noD = input
    .normalize('NFC')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');

  const stripped = noD
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC');

  return stripped
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

/**
 * Normalizes Vietnamese text while preserving accents, lowering case,
 * removing punctuation, and collapsing whitespace.
 */
export function accentPreservedNormalized(input: string): string {
  const lower = input.normalize('NFC').toLowerCase();
  return lower
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

export function splitPoemLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function isLucBatLineSix(line: string): boolean {
  return line.trim().split(/\s+/).filter(Boolean).length === 6;
}

/**
 * Indent 6-syllable lines only inside multi-line lục-bát stanzas
 * (so single-line tục ngữ/thành ngữ with 6 words stay flush-left).
 */
export function shouldIndentVerseLine(lines: string[], idx: number): boolean {
  if (lines.length < 2) return false;
  const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount(lines[idx] ?? '') !== 6) return false;
  const nextLen = idx + 1 < lines.length ? wordCount(lines[idx + 1]) : 0;
  const prevLen = idx > 0 ? wordCount(lines[idx - 1]) : 0;
  return nextLen === 8 || prevLen === 8 || nextLen >= 7 || prevLen >= 7;
}
