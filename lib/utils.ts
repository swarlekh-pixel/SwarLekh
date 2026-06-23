/**
 * Shared utility functions used across multiple screens
 */

export interface WordToken {
  word: string;
  start: number;
  end: number;
}

export interface StrikethroughRange {
  start: number;
  end: number;
}

/** Split text into word tokens with position info for strikethrough */
export function tokenizeWords(text: string): WordToken[] {
  const tokens: WordToken[] = [];
  const regex = /\S+|\s+/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    tokens.push({ word: match[0], start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

/** Check if a word token falls within any strikethrough range */
export function isWordStruck(token: { start: number; end: number }, ranges: StrikethroughRange[]): boolean {
  const mid = Math.floor((token.start + token.end) / 2);
  return ranges.some(r => mid >= r.start && mid < r.end);
}

/** Format date string to Indian locale */
export function formatDate(dateString: string, includeTime = false): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  };
  return date.toLocaleDateString('en-IN', options);
}

/** Format short date */
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
