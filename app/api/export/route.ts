import { listSubmissions } from '../../../lib/submissions';
import { submissionsCsv,studentListCsv } from '../../../lib/submission-csv';
import { settings,instructor,json } from '../../../lib/portal';
export async function GET(req:Request){
 try{
  if(!await instructor(await settings()))return json({error:'Instructor access is required.'},403);
  const params=new URL(req.url).searchParams;
  const studentList=params.get('type')==='students';
  const query=(params.get('query') || '').trim().toLowerCase();
  const classFilter=params.get('class') || '';
  const records=(await listSubmissions()).filter(r=>(!classFilter||r.level+' '+r.stream===classFilter)&&(!query||(r.name+' '+r.title+' '+(r.studentId || '')).toLowerCase().includes(query)));
  return new Response(studentList?studentListCsv(records):submissionsCsv(records),{headers:{
   'Content-Type':'text/csv; charset=utf-8',
   'Content-Disposition':'attachment; filename="deegeetalthesis-'+(studentList?'students':'submissions')+'-'+new Date().toISOString().slice(0,10)+'.csv"',
   'Cache-Control':'private, no-store',
   'X-Content-Type-Options':'nosniff'
  }});
 }catch{return json({error:'The export could not be created. Please try again.'},503);}
}
