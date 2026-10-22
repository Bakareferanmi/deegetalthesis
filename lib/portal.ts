import {inspectThesisPdf} from './pdf-validation';
import { trustedOrigin } from './request-origin';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';
export type Settings = { ownerId: string; deadline: string | null; instructions: string; accepting: boolean };
export function bucket() { if (!env.BUCKET) throw new Error('Document storage is unavailable. Please try again later.'); return env.BUCKET; }
export async function settings(): Promise<Settings | null> { const o = await bucket().get('workspace/settings.json'); return o ? o.json<Settings>() : null; }
export async function instructor(s: Settings | null) { const u = await getChatGPTUser(); return !!(u && s && u.userId === s.ownerId); }
export function json(data: unknown, status = 200) { return Response.json(data, {status, headers:{'Cache-Control':'no-store'}}); }
export const sameOrigin=trustedOrigin;
export async function validateFile(file:File){return (await inspectThesisPdf(file)).error;}
