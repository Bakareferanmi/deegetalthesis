import { findSubmission } from '../../../../lib/submissions';
import { bucket, settings, instructor, json } from '../../../../lib/portal';
export const dynamic = 'force-dynamic';
export async function GET(req:Request, {params}:{params:Promise<{id:string}>}) {
 try {
 if(!await instructor(await settings())) return json({error:'Instructor access is required.'},403);
 const {id} = await params; if(!/^[a-f0-9-]{36}$/.test(id)) return json({error:'Document not found.'},404);
 const record = await findSubmission(id); if(!record) return json({error:'Document not found.'},404);
 const f = await bucket().get(record.documentKey || 'documents/'+id); if(!f) return json({error:'Document not found.'},404);
 const inline=new URL(req.url).searchParams.get('view')==='inline';
 const pdf=/\.pdf$/i.test(record.filename);
 if(inline&&!pdf)return json({error:'This older Word file cannot be previewed here. Download it to view, or request a PDF copy.'},415);
 return new Response(f.body,{headers:{'Content-Type':pdf?'application/pdf':f.httpMetadata?.contentType || 'application/octet-stream','Content-Disposition':(inline?'inline':'attachment')+"; filename*=UTF-8''"+encodeURIComponent(record.filename),'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}});
 } catch{return json({error:'The document is temporarily unavailable.'},503);}
}
