import { generateStudentId, STUDENT_ID_ATTEMPTS, StudentIdUnavailableError } from './student-id';
import { env } from 'cloudflare:workers';
import { bucket } from './portal';

export type Submission = {
 id:string; name:string; title:string; level:string; stream:string;
 reflection?:string; filename:string; size:string; submittedAt:string;
 extension?:string; documentKey?:string; studentId?:string;
};
type SubmissionRow = {
 id:string; student_name:string; thesis_title:string; class:string;
 department:string; reflection:string; document_key:string; filename:string;
 file_size:number; submitted_at:string; student_id:string|null;
};
function fromRow(row:SubmissionRow):Submission {
 return {id:row.id,studentId:row.student_id || undefined,name:row.student_name,title:row.thesis_title,level:row.class,
  stream:row.department,reflection:row.reflection,documentKey:row.document_key,
  filename:row.filename,size:String(row.file_size),submittedAt:row.submitted_at,
  extension:row.filename.split('.').pop()?.toLowerCase()};
}

// D1 is used only when the deploying account attaches the DB binding.
// Existing Sites deployments continue using their current R2 receipt records.
export async function saveSubmission(record:Submission):Promise<Submission> {
 if(env.DB) {
  for(let attempt=0;attempt<STUDENT_ID_ATTEMPTS;attempt++){
   const studentId=generateStudentId(record.level,record.stream);
   // The unique index and INSERT are atomic, including simultaneous requests.
   const allocated=await env.DB.prepare(`INSERT INTO submissions
    (id, student_name, thesis_title, class, department, reflection,
     document_key, filename, file_size, submitted_at, student_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id) DO NOTHING RETURNING student_id`).bind(
     record.id,record.name,record.title,record.level,record.stream,
     record.reflection || '',record.documentKey || 'documents/'+record.id,
     record.filename,Number(record.size),record.submittedAt,studentId).first<{student_id:string}>();
   if(allocated)return {...record,studentId:allocated.student_id};
  }
  throw new StudentIdUnavailableError();
 }
 for(let attempt=0;attempt<STUDENT_ID_ATTEMPTS;attempt++){
  const studentId=generateStudentId(record.level,record.stream);
  const key='student-ids/'+studentId;
  const reservation=await bucket().put(key,record.id,{onlyIf:{etagDoesNotMatch:'*'}});
  if(!reservation)continue;
  const saved={...record,studentId};
  const {reflection, ...metadata}=saved;
  try{
   await bucket().put('receipts/'+record.id+'.json',JSON.stringify(saved),{
    customMetadata:Object.fromEntries(Object.entries(metadata).filter(([,v])=>v!==undefined).map(([k,v])=>[k,String(v)]))
   });
   return saved;
  }catch(error){await bucket().delete(key);throw error;}
 }
 throw new StudentIdUnavailableError();
}
export async function findSubmission(id:string):Promise<Submission|null> {
 if(env.DB) {
  const row=await env.DB.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first<SubmissionRow>();
  if(row) return fromRow(row);
 }
 const old=await bucket().get('receipts/'+id+'.json');
 return old ? old.json<Submission>() : null;
}
export async function listSubmissions():Promise<Submission[]> {
 const records=new Map<string,Submission>();
 // Include pre-D1 receipts so switching storage does not hide older submissions.
 let cursor:string|undefined;
 do {
  const page=await bucket().list({prefix:'receipts/',cursor});
  for(const o of page.objects){const receipt=await bucket().get(o.key);if(receipt){const record=await receipt.json<Submission>();records.set(record.id,record);}}
  cursor=page.truncated?page.cursor:undefined;
 }while(cursor);
 if(env.DB) {
  const result=await env.DB.prepare('SELECT * FROM submissions ORDER BY submitted_at DESC').all<SubmissionRow>();
  if(!result.success) throw new Error('The D1 submission inbox could not be loaded.');
  for(const row of result.results){const record=fromRow(row);records.set(record.id,record);}
 }
 return [...records.values()].sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt));
}
