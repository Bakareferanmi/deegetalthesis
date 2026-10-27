import type { Submission } from './submissions';

// Quote every cell, preserve multiline reflections, and neutralise spreadsheet formulas.
function cell(value:unknown){
 let text=String(value ?? '').replace(/\0/g,'');
 if(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
function csv(rows:unknown[][]){return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';}
export function studentListCsv(records:Submission[]){
 const rows:unknown[][]=[['Student name','Class','Student ID','Department','Submission date and time (UTC)']];
 for(const r of records)rows.push([r.name,r.level,r.studentId || 'Not assigned (older submission)',r.stream,r.submittedAt]);
 return csv(rows);
}
export function submissionsCsv(records:Submission[]){
 return studentListCsv(records);
}
