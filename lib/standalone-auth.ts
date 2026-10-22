import { trustedOrigin } from './request-origin';
import { env } from 'cloudflare:workers';
import { requests } from './request-context';

const cookieName='__Host-deegeetal-instructor';
const encoder=new TextEncoder();
function config(){return env as unknown as {INSTRUCTOR_PASSWORD?:string;SESSION_SECRET?:string;INSTRUCTOR_EMAIL?:string;DB?:D1Database}}
function ready(){const c=config();return !!(c.INSTRUCTOR_PASSWORD && c.INSTRUCTOR_PASSWORD.length>=12 && c.SESSION_SECRET && c.SESSION_SECRET.length>=32)}
function base64(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unbase64(text:string){const value=text.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(value+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0))}
async function key(){const c=config();return crypto.subtle.importKey('raw',encoder.encode(c.SESSION_SECRET+':'+c.INSTRUCTOR_PASSWORD),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
async function signature(value:string){return new Uint8Array(await crypto.subtle.sign('HMAC',await key(),encoder.encode(value)))}
export async function getChatGPTUser(){
 if(!ready())return null;
 const request=requests.getStore();if(!request)return null;
 const token=request.headers.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(!token || token.length>2048)return null;
 try{
  const [payload,mac,extra]=token.split('.');if(!payload||!mac||extra)return null;
  if(!await crypto.subtle.verify('HMAC',await key(),unbase64(mac),encoder.encode(payload)))return null;
  const value=JSON.parse(new TextDecoder().decode(unbase64(payload)));
  if(value.role!=='instructor'||!Number.isFinite(value.exp)||!Number.isFinite(value.iat)||value.exp<=Date.now()||value.iat>Date.now()+30000||value.exp-value.iat>8*3600000)return null;
  return {userId:'cloudflare-instructor',email:config().INSTRUCTOR_EMAIL || 'instructor',displayName:'Instructor',fullName:null};
 }catch{return null;}
}
export async function signIn(request:Request):Promise<Response>{
 if(!trustedOrigin(request))return page('This website address could not be verified. Open the secure instructor sign-in page below and enter your password there.',403,new URL('/instructor-login',request.url).href);
 if(!ready()||!config().DB)return page('Instructor access is not configured yet. Run npm run instructor:setup in the project folder.',503);
 if(Number(request.headers.get('content-length')||0)>4096)return page('This request is too large.',413);
 const ip=request.headers.get('cf-connecting-ip')||'local-preview';
 const window=Math.floor(Date.now()/900000);const rateKey=base64(await signature('login:'+ip+':'+window));
 // The increment happens before authentication and is atomic, including concurrent attempts.
 const attempt=await config().DB!.prepare(`INSERT INTO instructor_login_attempts (attempt_key, attempts, expires_at)
 VALUES (?,1,?) ON CONFLICT(attempt_key) DO UPDATE SET attempts=attempts+1 RETURNING attempts`).bind(rateKey,Date.now()+900000).first<{attempts:number}>();
 await config().DB!.prepare('DELETE FROM instructor_login_attempts WHERE expires_at < ?').bind(Date.now()).run();
 if(!attempt||attempt.attempts>8)return page('Too many sign-in attempts. Wait 15 minutes and try again.',429);
 let password:string;
 try{const form=await request.formData();password=String(form.get('password')||'')}catch{return page('Enter your instructor password.',400)}
 if(password.length>1024)return page('Incorrect password.',401);
 const expected=await signature('password:'+config().INSTRUCTOR_PASSWORD);
 const matches=await crypto.subtle.verify('HMAC',await key(),expected,encoder.encode('password:'+password));
 if(!matches)return page('Incorrect password. Please try again.',401);
 const iat=Date.now();const payload=base64(encoder.encode(JSON.stringify({role:'instructor',iat,exp:iat+8*3600000,nonce:crypto.randomUUID()})));
 const token=payload+'.'+base64(await signature(payload));
 return new Response(null,{status:303,headers:{Location:'/?instructor=1','Set-Cookie':cookieName+'='+token+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800','Cache-Control':'no-store'}});
}
export function signOut(request:Request){
 if(!trustedOrigin(request))return Response.json({error:'Unverified request.'},{status:403});
 return Response.json({ok:true},{headers:{'Set-Cookie':cookieName+'=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0','Cache-Control':'no-store'}});
}
export function page(message='',status=200,recoveryUrl=''){
 const escape=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 const recovery=recoveryUrl?'<a class="recovery" href="'+escape(recoveryUrl)+'">Open secure instructor sign-in →</a>':'';
 const nonce=crypto.randomUUID().replace(/-/g,'');
 const safe=message.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Instructor sign in — deegeetalthesis</title><link rel="icon" href="/favicon.svg"><style>*{box-sizing:border-box}body{margin:0;background:#f7f8f3;color:#19283d;font:14px/1.7 Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:100%;max-width:430px;padding:32px;background:white;border:1px solid #dce1d6;border-radius:12px}.brand{font-size:23px;letter-spacing:-1px;font-weight:600;margin-bottom:32px}.brand span{color:#496b2b}h1{font-size:29px;letter-spacing:-1px;line-height:1.2}p{color:#4b5943;font-size:14px}label{display:block;font-weight:600;margin:24px 0 8px;font-size:12px}input{width:100%;padding:13px;border:1px solid #78856f;border-radius:5px;font-size:16px;background:#fcfdf9}input:focus{outline:2px solid #3d5c20;outline-offset:2px}button{width:100%;padding:14px;background:#19283d;color:#fff;border:0;border-radius:5px;cursor:pointer;font-size:13px;margin:22px 0 14px}.back{display:block;text-align:center;font-size:12px;color:#526442;text-decoration:none}.password-field{position:relative}.password-field input{padding-right:78px}.password-field .password-toggle{position:absolute;right:5px;top:5px;width:66px;height:38px;min-height:38px;padding:0;margin:0;background:#e8efdd;color:#304820;border:1px solid #78856f;font-size:12px}.recovery{display:block;color:#304820;font-weight:600;text-decoration:underline;margin:12px 0;min-height:44px}.sign-in-help{font-size:12px}button{min-height:44px}button:focus-visible,a:focus-visible{outline:3px solid #3d5c20;outline-offset:3px}.error{padding:12px;background:#fff1ed;border:1px solid #f4d3ca;color:#9b4233;border-radius:4px;overflow-wrap:anywhere}</style></head><body><main class="card"><div class="brand">deegeetalthesis<span>.</span></div><h1>Instructor sign in.</h1><p>Your assignment settings and student submissions.</p>${safe?'<p class="error" role="alert">'+safe+'</p>':''}${recovery}<form method="post" action="/api/instructor-login"><label for="password">Instructor password</label><div class="password-field"><input id="password" name="password" type="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false" required maxlength="1024"><button type="button" class="password-toggle" id="password-toggle" aria-controls="password" aria-pressed="false" aria-label="Show password">Show</button></div><button>Sign in</button></form><p class="sign-in-help">Use your instructor password. You can show it to check what you typed.</p><a class="back" href="/">Back to student portal</a></main><script nonce="${nonce}">const toggle=document.getElementById("password-toggle"),password=document.getElementById("password");toggle.addEventListener("click",()=>{const show=password.type==="password";password.type=show?"text":"password";toggle.textContent=show?"Hide":"Show";toggle.setAttribute("aria-pressed",String(show));toggle.setAttribute("aria-label",show?"Hide password":"Show password");});</script></body></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'nonce-"+nonce+"'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}});
}
