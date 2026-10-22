import type { Submission } from './submissions';

// Quote every cell, preserve multiline reflections, and neutralise spreadsheet formulas.
function cell(value:unknown){
 let text=String(value ?? '').replace(/\0/g,'');
 if(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
export function submissionsCsv(records:Submission[]){
 const rows:unknown[][]=[['Student ID','Student name','Class','Department','Thesis title','What I learnt','Document filename','File size (bytes)','Submitted at (UTC)','Submission reference']];
 for(const r of records)rows.push([r.studentId || 'Not assigned (older submission)',r.name,r.level,r.stream,r.title,r.reflection || '',r.filename,r.size,r.submittedAt,r.id]);
 return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
