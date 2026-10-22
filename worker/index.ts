import { GET as exportSubmissions } from '../app/api/export/route';
import { requests } from '../lib/request-context';
import { signIn,signOut,page } from '../lib/standalone-auth';
import { GET, POST } from '../app/api/portal/route';
import { GET as download } from '../app/api/files/[id]/route';
export default {
 async fetch(request:Request, env:Cloudflare.Env){
  return requests.run(request,async()=>{
   const path=new URL(request.url).pathname;
   try{
    if(path==='/instructor-login')return request.method==='GET'?page():new Response('Method not allowed',{status:405});
    if(path==='/api/instructor-login')return request.method==='POST'?await signIn(request):new Response('Method not allowed',{status:405});
    if(path==='/api/instructor-logout')return request.method==='POST'?signOut(request):new Response('Method not allowed',{status:405});
    if(path==='/api/portal'){
     if(!env.DB || !env.BUCKET)return Response.json({error:'Database or document storage is not connected.'},{status:503});
     if(request.method==='GET')return GET(request);
     if(request.method==='POST')return POST(request);
     return new Response('Method not allowed',{status:405});
    }
    if(path==='/api/export')return request.method==='GET'?exportSubmissions(request):new Response('Method not allowed',{status:405});
    if(path.startsWith('/api/files/'))return request.method==='GET'?download(request,{params:Promise.resolve({id:path.slice('/api/files/'.length)})}):new Response('Method not allowed',{status:405});
    if(path.startsWith('/api/'))return Response.json({error:'Not found.'},{status:404});
    return env.ASSETS.fetch(request);
   }catch{return Response.json({error:'The workspace is temporarily unavailable. Please try again.'},{status:503,headers:{'Cache-Control':'no-store'}})}
  });
 }
};
