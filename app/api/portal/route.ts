import { saveSubmission, listSubmissions } from '../../../lib/submissions';
import { reflectionError } from '../../../lib/reflection';
import { bucket, settings, instructor, json, sameOrigin, validateFile } from '../../../lib/portal';
import { getChatGPTUser } from '../../chatgpt-auth';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
 try {
  const s = await settings(); const user = await getChatGPTUser(); const admin = await instructor(s);
  const result: Record<string, unknown> = {deadline:s?.deadline || null,instructions:s?.instructions || '',accepting:s?.accepting || false,setupRequired:!s,canSetup:!s && !!user,isInstructor:admin,serverTime:Date.now()};
  if (new URL(req.url).searchParams.get('view') === 'instructor') {
   if (!admin) return json({error:'Instructor access is required.'},403);
   result.submissions = await listSubmissions();
  }
  return json(result);
 } catch { return json({error:'The workspace could not be loaded. Please retry.'},503); }
}
export async function POST(req: Request) {
 if (!sameOrigin(req)) return json({error:'This request could not be verified. Refresh the page and retry.'},403);
 if (Number(req.headers.get('content-length') || 0) > 11 * 1024 * 1024) return json({error:'The upload is too large. Maximum file size is 10 MB.'},413);
 try {
  const contentType = req.headers.get('content-type') || ''; const s = await settings();
  if(contentType.includes('application/json')) {
   const input = await req.json() as any;
   if(input.action === 'setup') {
    const user = await getChatGPTUser(); if (!user) return json({error:'Sign in to activate instructor access.'},401);
    if(s) return json({error:'This workspace already has an instructor.'},409);
    const created = await bucket().put('workspace/settings.json', JSON.stringify({ownerId:user.userId,deadline:null,instructions:'Submit your assigned thesis as one complete document. Include a title page, your research, and references.',accepting:false}),{onlyIf:{etagDoesNotMatch:'*'}});
    if(!created) return json({error:'This workspace has already been activated.'},409);
    return json({ok:true});
   }
   if (!await instructor(s)) return json({error:'Instructor access is required.'},403);
   if(input.action !== 'settings') return json({error:'Unknown action.'},400);
   const deadline = new Date(input.deadline); if(!Number.isFinite(deadline.getTime())) return json({error:'Choose a valid submission deadline.'},400);
   if(typeof input.instructions !== 'string' || input.instructions.length > 3000) return json({error:'Assignment instructions must be under 3,000 characters.'},400);
   await bucket().put('workspace/settings.json',JSON.stringify({...s,deadline:deadline.toISOString(),instructions:input.instructions.trim(),accepting:!!input.accepting}));
   return json({ok:true});
  }
  if(!contentType.includes('multipart/form-data')) return json({error:'Upload a document using the submission form.'},400);
  if(!s?.deadline || !s.accepting) return json({error:'Submissions are not open yet.'},409);
  if(Date.now() >= new Date(s.deadline).getTime()) return json({error:'The submission deadline has passed.'},409);
  const form = await req.formData(); const name = String(form.get('name') || '').trim(); const title = String(form.get('title') || '').trim(); const level = String(form.get('level') || ''); const stream = String(form.get('stream') || ''); const file = form.get('file'); const reflection = String(form.get('reflection') || '').trim();
  if(!name || name.length > 120 || !title || title.length > 240 || !['SS1','SS2'].includes(level) || !['Science','Art','Commercial'].includes(stream)) return json({error:'Complete your full name, thesis title, class, and department.'},400);
  const reflectionIssue = reflectionError(reflection); if(reflectionIssue) return json({error:reflectionIssue},400);
  if(!(file instanceof File)) return json({error:'Attach your thesis document.'},400);
  const issue = await validateFile(file); if(issue) return json({error:issue},400);
  const id = crypto.randomUUID(); const submittedAt = new Date().toISOString();
  if(Date.now() >= new Date(s.deadline).getTime()) return json({error:'The deadline passed before your upload was completed.'},409);
  const ext = file.name.split('.').pop()!.toLowerCase(); const filename = file.name.replace(/[\r\n\x00-\x1f]/g,'').slice(0,180);
  const record = {id,name,title,level,stream,reflection,filename,size:String(file.size),submittedAt,extension:ext};
  await bucket().put('documents/'+id, file.stream(), {httpMetadata:{contentType:ext === 'pdf'?'application/pdf':ext === 'doc'?'application/msword':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}});
  try { await saveSubmission(record); } catch(e) {await bucket().delete('documents/'+id); throw e;}
  return json({ok:true,receipt:record},201);
 } catch {return json({error:'Your submission could not be saved. Please try again. You will receive a receipt after a successful upload.'},503);}
}
