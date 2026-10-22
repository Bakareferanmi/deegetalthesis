import { trustedOrigin } from './request-origin';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';
export type Settings = { ownerId: string; deadline: string | null; instructions: string; accepting: boolean };
export function bucket() { if (!env.BUCKET) throw new Error('Document storage is unavailable. Please try again later.'); return env.BUCKET; }
export async function settings(): Promise<Settings | null> { const o = await bucket().get('workspace/settings.json'); return o ? o.json<Settings>() : null; }
export async function instructor(s: Settings | null) { const u = await getChatGPTUser(); return !!(u && s && u.userId === s.ownerId); }
export function json(data: unknown, status = 200) { return Response.json(data, {status, headers:{'Cache-Control':'no-store'}}); }
export const sameOrigin=trustedOrigin;
export async function validateFile(file: File) {
 const ext = file.name.split('.').pop()?.toLowerCase();
 if (!['pdf','doc','docx'].includes(ext || '')) return 'Use a PDF or Word document (.pdf, .doc, .docx).';
 if (!file.size || file.size > 10 * 1024 * 1024) return 'Choose a file between 1 byte and 10 MB.';
 const b = new Uint8Array(await file.arrayBuffer());
 const starts = (...v: number[]) => v.every((n,i)=>b[i]===n);
 if (ext === 'pdf' && !new TextDecoder().decode(b.slice(0,1024)).includes('%PDF-')) return 'This file is not a valid PDF. Export it again and retry.';
 if (ext === 'doc' && !starts(0xD0,0xCF,0x11,0xE0,0xA1,0xB1,0x1A,0xE1)) return 'This file does not appear to be a Word document.';
 if (ext === 'docx') { const raw = new TextDecoder('latin1').decode(b); if (!starts(0x50,0x4B,0x03,0x04) || !raw.includes('[Content_Types].xml') || !raw.includes('word/document.xml')) return 'This file does not appear to be a Word .docx document.'; }
 return null;
}
