export const MAX_REFLECTION_WORDS = 299;
export function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}
export function reflectionError(text: string) {
  const words = countWords(text);
  if (!words) return 'Write what you learnt before submitting your thesis.';
  if (words > MAX_REFLECTION_WORDS) return 'Keep what you learnt below 300 words (299 words maximum).';
  if (text.length > 10000) return 'Your reflection is too long. Shorten it to 10,000 characters or fewer.';
  return null;
}
