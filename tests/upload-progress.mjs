import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const instances=[];
class Request {
 upload={};status=200;responseText='';
 constructor(){instances.push(this);}
 open(method,url){this.method=method;this.url=url;}
 send(body){this.body=body;}
}
const exports={};
const source=ts.transpileModule(readFileSync(new URL('../src/lib/submitThesis.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
vm.runInNewContext(source,{exports,XMLHttpRequest:Request,Error,SyntaxError,JSON,Math});
const events=[],body={file:'sample.pdf'};
const pending=exports.submitThesis(body,p=>events.push(p),()=>events.push('saving'));
const request=instances.at(-1);
assert.equal(request.method,'POST');assert.equal(request.url,'/api/portal');assert.equal(request.body,body);
request.upload.onprogress({lengthComputable:true,loaded:4,total:10});
request.upload.onprogress({lengthComputable:false});
request.upload.onprogress({lengthComputable:true,loaded:10,total:10});
request.upload.onload();
assert.deepEqual(events,[40,null,100,'saving']);
let saved=false;pending.then(()=>saved=true);await Promise.resolve();assert.equal(saved,false,'Upload completion must not count as a saved submission');
request.responseText=JSON.stringify({receipt:{id:'record-1',studentId:'DEEGEETAL-SS1-SCI-4827'}});request.onload();
assert.equal((await pending).studentId,'DEEGEETAL-SS1-SCI-4827');
for(const [status,response,error] of [[400,'{"error":"At least 5 pages required"}',/At least 5 pages/],[200,'not json',/response could not be read/],[200,'{}',/did not return a submission receipt/]]){
 const attempt=exports.submitThesis(body,()=>{},()=>{});const r=instances.at(-1);r.status=status;r.responseText=response;r.onload();await assert.rejects(attempt,error);
}
for(const [event,message] of [['onerror',/Connection interrupted/],['onabort',/Submission was interrupted/]]){
 const attempt=exports.submitThesis(body,()=>{},()=>{});instances.at(-1)[event]();await assert.rejects(attempt,message);
}
console.log('Upload progress, confirmed receipts, server errors and interrupted requests passed.');
