import { env } from 'cloudflare:workers';

// Trust only the Worker origin and an explicitly configured production frontend.
// Forwarded Host headers are caller-controlled and must not grant access.
export function trustedOrigin(request:Request){
 let origin=request.headers.get('origin');
 if(origin===null){
  try{const referrer=new URL(request.headers.get('referer') || '');if(referrer.protocol!=='https:'&&referrer.protocol!=='http:')return false;origin=referrer.origin;}catch{return false;}
 }
 if(!origin || origin==='null')return false;
 if(origin===new URL(request.url).origin)return true;
 const configured=(env as unknown as {PUBLIC_APP_ORIGIN?:string}).PUBLIC_APP_ORIGIN?.trim();
 if(!configured)return false;
 try{
  const url=new URL(configured);
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)return false;
  return origin===url.origin;
 }catch{return false;}
}
