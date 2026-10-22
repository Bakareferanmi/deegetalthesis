export const MIN_REFLECTION_WORDS = 300;
export const MAX_REFLECTION_WORDS = 500;
export function countWords(text: string) {
 const trimmed=text.trim();
 return trimmed?trimmed.split(/\s+/u).length:0;
}
export function reflectionError(text: string) {
 const words=countWords(text);
 if(words<MIN_REFLECTION_WORDS)return `Write at least ${MIN_REFLECTION_WORDS} words about what you learnt (${MIN_REFLECTION_WORDS-words} more needed).`;
 if(words>MAX_REFLECTION_WORDS)return `Keep what you learnt to ${MAX_REFLECTION_WORDS} words maximum (${words-MAX_REFLECTION_WORDS} too many).`;
 if(text.length>10000)return 'Your reflection is too long. Use 10,000 characters or fewer.';
 return null;
}
