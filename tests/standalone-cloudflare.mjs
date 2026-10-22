import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {AsyncLocalStorage} from 'node:async_hooks';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import ts from 'typescript';
const root=resolve(process.argv[2]||resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const schema=await readFile(resolve(root,'schema.sql'),'utf8');
const migration=await readFile(resolve(root,'migrations/0001_student_ids.sql'),'utf8');
const migrationCheck=new DatabaseSync(':memory:');migrationCheck.exec(schema);
migrationCheck.prepare('INSERT INTO submissions VALUES (?,?,?,?,?,?,?,?,?,?)').run('legacy-id','Legacy Student','Existing thesis','SS2','Art','Existing reflection','documents/legacy-id','legacy.pdf',50,'2026-01-01T00:00:00Z');
migrationCheck.exec(migration);assert.equal(migrationCheck.prepare('SELECT student_name FROM submissions').get().student_name,'Legacy Student');assert.equal(migrationCheck.prepare('SELECT student_id FROM submissions').get().student_id,null);migrationCheck.close();
const sqlite=new DatabaseSync(':memory:');sqlite.exec(schema);sqlite.exec(migration);
let forcedNumbers=[];
const testCrypto={subtle:crypto.subtle,randomUUID:()=>crypto.randomUUID(),getRandomValues(array){if(forcedNumbers.length){array[0]=forcedNumbers.shift();return array;}return crypto.getRandomValues(array);}};
const DB={prepare(query){let args=[];return{bind(...values){args=values;return this},async first(){return sqlite.prepare(query).get(...args)||null},async all(){return{success:true,results:sqlite.prepare(query).all(...args)}},async run(){sqlite.prepare(query).run(...args);return{success:true}}}}};
const files=new Map();
const BUCKET={async get(key){const x=files.get(key);return x?{...x,body:x.bytes,json:async()=>JSON.parse(new TextDecoder().decode(x.bytes))}:null},async put(key,value,opts={}){if(opts.onlyIf&&files.has(key))return null;const bytes=typeof value==='string'?new TextEncoder().encode(value):value instanceof ReadableStream?new Uint8Array(await new Response(value).arrayBuffer()):new Uint8Array(value);files.set(key,{bytes,...opts});return{key}},async delete(key){files.delete(key)},async list({prefix}){return{truncated:false,objects:[...files.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}}};
const env={DB,BUCKET,ASSETS:{fetch:async()=>new Response('<html>student portal</html>',{headers:{'Content-Type':'text/html'}})},INSTRUCTOR_PASSWORD:'test-only-password-long',SESSION_SECRET:'test-only-session-secret-at-least-32-characters',INSTRUCTOR_EMAIL:'instructor@example.test'};
const context=vm.createContext({URL,Response,Request,File,FormData,TextDecoder,TextEncoder,Uint8Array,Date,crypto:testCrypto,ReadableStream,console,atob,btoa});
const envModule=new vm.SyntheticModule(['env'],function(){this.setExport('env',env)},{context});
const alsModule=new vm.SyntheticModule(['AsyncLocalStorage'],function(){this.setExport('AsyncLocalStorage',AsyncLocalStorage)},{context});
const modules=new Map();
async function make(path){if(modules.has(path))return modules.get(path);const pending=(async()=>{const source=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;const mod=new vm.SourceTextModule(source,{context,identifier:path});return mod;})();modules.set(path,pending);return pending;}
const module=await make(resolve(root,'worker/index.ts'));
await module.link((spec,parent)=>spec==='cloudflare:workers'?envModule:spec==='node:async_hooks'?alsModule:make(resolve(dirname(parent.identifier),spec+'.ts')));
await module.evaluate();const worker=module.namespace.default;
const origin='https://portal.example';
async function request(path,options={},expected){const r=await worker.fetch(new Request(origin+path,options),env);if(expected!==undefined)assert.equal(r.status,expected,await r.clone().text());return r;}
const json=(body,cookie='')=>({method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
async function login(password,ip='192.0.2.1',expected=303){const fd=new FormData();fd.set('password',password);return request('/api/instructor-login',{method:'POST',headers:{Origin:origin,'cf-connecting-ip':ip},body:fd},expected)}
const spoof={'oai-authenticated-user-id':'cloudflare-instructor','oai-authenticated-user-email':'instructor@example.test'};
assert.equal((await(await request('/api/portal',{headers:spoof},200)).json()).canSetup,false);
await request('/api/portal',json({action:'setup'}),401);
await request('/api/portal?view=instructor',{headers:spoof},403);
await request('/api/export',{headers:spoof},403);
await request('/api/instructor-login',{method:'POST',body:new FormData()},403);
await login('wrong-password','192.0.2.1',401);
const signed=await login(env.INSTRUCTOR_PASSWORD);
const fullCookie=signed.headers.get('Set-Cookie');assert.match(fullCookie,/HttpOnly/);assert.match(fullCookie,/Secure/);assert.match(fullCookie,/SameSite=Strict/);const cookie=fullCookie.split(';')[0];
assert.equal(signed.headers.get('Location'),'/?instructor=1');
assert.equal((await(await request('/api/portal',{headers:{Cookie:cookie}},200)).json()).canSetup,true);
const corrupt=cookie.slice(0,-3)+'xyz';assert.equal((await(await request('/api/portal',{headers:{Cookie:corrupt}},200)).json()).canSetup,false);
// An otherwise correctly signed token must still expire.
const payload=Buffer.from(JSON.stringify({role:'instructor',iat:Date.now()-7200000,exp:Date.now()-3600000})).toString('base64url');
const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SESSION_SECRET+':'+env.INSTRUCTOR_PASSWORD),{name:'HMAC',hash:'SHA-256'},false,['sign']);
const mac=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload))).toString('base64url');
assert.equal((await(await request('/api/portal',{headers:{Cookie:'__Host-deegeetal-instructor='+payload+'.'+mac}},200)).json()).canSetup,false);
await request('/api/portal',json({action:'setup'},cookie),200);
const settings={action:'settings',deadline:new Date(Date.now()+86400000).toISOString(),instructions:'A test research assignment.',accepting:true};
await request('/api/portal',json(settings),403);await request('/api/portal',json(settings,cookie),200);
const input=(reflection,level='SS1',stream='Science')=>{const fd=new FormData();for(const [k,v] of Object.entries({name:'Test Student',title:'Solar energy in schools',level,stream,reflection}))fd.set(k,v);fd.set('file',new File(['%PDF-1.4\n%%EOF'],'thesis.pdf'));return{method:'POST',headers:{Origin:origin},body:fd}};
await request('/api/portal',input(''),400);await request('/api/portal',input(Array(300).fill('learning').join(' ')),400);
forcedNumbers=[42];
const submitted=await(await request('/api/portal',input(Array(299).fill('learning').join(' ')),201)).json();const id=submitted.receipt.id;assert.equal(submitted.receipt.studentId,'DEEGEETAL-SS1-SCI-0042');
const row=sqlite.prepare('SELECT * FROM submissions WHERE id = ?').get(id);assert.equal(row.student_name,'Test Student');assert.equal(row.reflection.split(' ').length,299);assert.equal(row.document_key,'documents/'+id);assert.equal(row.student_id,'DEEGEETAL-SS1-SCI-0042');
await request('/api/files/'+id,{headers:spoof},403);assert.equal(await(await request('/api/files/'+id,{headers:{Cookie:cookie}},200)).text(),'%PDF-1.4\n%%EOF');
assert.equal((await(await request('/api/portal?view=instructor',{headers:{Cookie:cookie}},200)).json()).submissions.length,1);
forcedNumbers=[42,42,7001];
const retried=await(await request('/api/portal',input('I learnt to explain my research clearly.'),201)).json();assert.equal(retried.receipt.studentId,'DEEGEETAL-SS1-SCI-7001');
forcedNumbers=[99,99,100];
const concurrent=await Promise.all([request('/api/portal',input('I learnt how solar energy works.'),201),request('/api/portal',input('I learnt how to compare energy sources.'),201)]);
const ids=await Promise.all(concurrent.map(async r=>(await r.json()).receipt.studentId));assert.equal(new Set(ids).size,2);ids.forEach(id=>assert.match(id,/^DEEGEETAL-SS1-SCI-\d{4}$/));
const beforeFailure=files.size;forcedNumbers=Array(12).fill(42);const busy=await(await request('/api/portal',input('I learnt how to write references.'),503)).json();assert.match(busy.error,/student ID/);assert.equal(files.size,beforeFailure);
const inbox=await(await request('/api/portal?view=instructor',{headers:{Cookie:cookie}},200)).json();assert.equal(new Set(inbox.submissions.map(r=>r.studentId)).size,4);assert.equal(inbox.submissions.find(r=>r.id===id).studentId,'DEEGEETAL-SS1-SCI-0042');

// Each class/department gets its own random-number space.
for(const [level,stream,code] of [['SS1','Art','ART'],['SS1','Commercial','COM'],['SS2','Science','SCI'],['SS2','Art','ART'],['SS2','Commercial','COM']]){
 forcedNumbers=[42];
 const result=await(await request('/api/portal',input('I learnt to present my findings.',level,stream),201)).json();
 assert.equal(result.receipt.studentId,`DEEGEETAL-${level}-${code}-0042`);
 assert.equal(sqlite.prepare('SELECT student_id FROM submissions WHERE id = ?').get(result.receipt.id).student_id,result.receipt.studentId);
}
// CSV exports preserve Unicode/multiline reflections, quote special characters,
// neutralise formulas, and use the same class/search filters as the inbox.
const csvResponse=await request('/api/export',{headers:{Cookie:cookie}},200);
assert.match(csvResponse.headers.get('Content-Type'),/text\/csv/);assert.match(csvResponse.headers.get('Cache-Control'),/no-store/);
const exportBytes=new Uint8Array(await csvResponse.arrayBuffer());assert.deepEqual([...exportBytes.slice(0,3)],[239,187,191]);
function parseCsv(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if(c==='\r'&&text[i+1]==='\n'&&!quoted){row.push(cell);rows.push(row);row=[];cell='';i++;}else cell+=c;}return rows;}
const allRows=parseCsv(new TextDecoder().decode(exportBytes));assert.equal(allRows.length,10);assert.equal(allRows[0][0],'Student ID');assert.ok(allRows.some(r=>r[0]==='DEEGEETAL-SS1-SCI-0042'));
const exportBy=async(query)=>parseCsv(await(await request('/api/export?'+new URLSearchParams(query),{headers:{Cookie:cookie}},200)).text());

await request('/api/export?type=students',{headers:spoof},403);
const studentResponse=await request('/api/export?type=students',{headers:{Cookie:cookie}},200);
assert.match(studentResponse.headers.get('Content-Disposition'),/deegeetalthesis-students-/);
const studentRows=parseCsv(await studentResponse.text());
assert.deepEqual(studentRows[0],['Student ID','Student name','Class','Department']);
assert.equal(studentRows.length,10);studentRows.forEach(row=>assert.equal(row.length,4));
const knownStudent=studentRows.find(row=>row[0]==='DEEGEETAL-SS1-SCI-0042');assert.deepEqual(knownStudent,['DEEGEETAL-SS1-SCI-0042','Test Student','SS1','Science']);
assert.equal((await exportBy({type:'students',class:'SS2 Commercial'})).length,2);
assert.equal((await exportBy({type:'students',query:'DEEGEETAL-SS1-SCI-0042'})).length,2);
assert.equal((await exportBy({type:'students',query:'missing-student'})).length,1);
assert.equal((await exportBy({class:'SS2 Art'})).length,2);
assert.equal((await exportBy({query:'DEEGEETAL-SS1-SCI-0042'})).length,2);
assert.equal((await exportBy({class:'SS2 Art',query:'DEEGEETAL-SS1-SCI-0042'})).length,1);
const trickyTitle='=HYPERLINK("https://example.test","click")';const trickyReflection='I learnt about ₦ costs, "quotes",\nand new lines.';
sqlite.prepare('UPDATE submissions SET thesis_title=?, reflection=? WHERE id=?').run(trickyTitle,trickyReflection,id);
const trickyRows=await exportBy({query:'DEEGEETAL-SS1-SCI-0042'});assert.equal(trickyRows[1][4],"'"+trickyTitle);assert.equal(trickyRows[1][5],trickyReflection);
await request('/api/export',{method:'POST',headers:{Origin:origin,Cookie:cookie}},405);
// Model Vercel's external rewrite: URL is the Worker, Origin is the frontend.
const frontend='https://thesis.example.test';
const proxied=()=>({method:'POST',headers:{Origin:frontend,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(settings)});
await request('/api/portal',proxied(),403);
env.PUBLIC_APP_ORIGIN=frontend;
await request('/api/portal',proxied(),200);
const proxyLoginForm=new FormData();proxyLoginForm.set('password',env.INSTRUCTOR_PASSWORD);
const proxyLogin=await request('/api/instructor-login',{method:'POST',headers:{Origin:frontend,'cf-connecting-ip':'192.0.2.123'},body:proxyLoginForm},303);
assert.match(proxyLogin.headers.get('Set-Cookie'),/SameSite=Strict/);assert.equal(proxyLogin.headers.get('Location'),'/?instructor=1');
await request('/api/instructor-logout',{method:'POST',headers:{Origin:frontend,Cookie:cookie}},200);
const hostile=json(settings,cookie);hostile.headers.Origin='https://attacker.example.test';hostile.headers['x-forwarded-host']='thesis.example.test';await request('/api/portal',hostile,403);
const missingOrigin=proxied();delete missingOrigin.headers.Origin;await request('/api/portal',missingOrigin,403);
// Some mobile form submissions omit Origin. Referer is a fallback only when
// Origin is absent, and must match the exact Worker or configured frontend.
const referrerOnly=proxied();delete referrerOnly.headers.Origin;referrerOnly.headers.Referer=frontend+'/instructor-login';await request('/api/portal',referrerOnly,200);
const evilReferrer=proxied();delete evilReferrer.headers.Origin;evilReferrer.headers.Referer='https://attacker.example.test/instructor-login';await request('/api/portal',evilReferrer,403);
const conflicting=proxied();conflicting.headers.Origin='https://attacker.example.test';conflicting.headers.Referer=frontend+'/instructor-login';await request('/api/portal',conflicting,403);
const nullOrigin=proxied();nullOrigin.headers.Origin='null';nullOrigin.headers.Referer=frontend+'/instructor-login';await request('/api/portal',nullOrigin,403);
const mobileForm=new FormData();mobileForm.set('password',env.INSTRUCTOR_PASSWORD);
const mobileLogin=await request('/api/instructor-login',{method:'POST',headers:{Referer:origin+'/instructor-login','User-Agent':'Mozilla/5.0 (Linux; Android 11) Mobile','cf-connecting-ip':'192.0.2.124'},body:mobileForm},303);
const mobileCookie=mobileLogin.headers.get('Set-Cookie').split(';')[0];assert.equal((await(await request('/api/portal',{headers:{Cookie:mobileCookie}},200)).json()).isInstructor,true);
const rejectedForm=new FormData();rejectedForm.set('password',env.INSTRUCTOR_PASSWORD);
const rejectedLogin=await request('/api/instructor-login',{method:'POST',headers:{Origin:'https://unconfigured.vercel.app'},body:rejectedForm},403);
assert.match(await rejectedLogin.text(),new RegExp('href="'+origin+'/instructor-login"'));
const loginPage=await request('/instructor-login',{},200);const loginHtml=await loginPage.text();assert.match(loginHtml,/autocapitalize="none"/);assert.match(loginHtml,/aria-label="Show password"/);const nonce=loginHtml.match(/<script nonce="([a-z0-9]+)"/)[1];assert.ok(loginPage.headers.get('Content-Security-Policy').includes("script-src 'nonce-"+nonce+"'"));
const vercelConfig=JSON.parse(await readFile(resolve(root,'vercel.json'),'utf8'));const loginRedirect=vercelConfig.redirects.find(r=>r.source==='/instructor-login');assert.ok(loginRedirect);assert.equal(loginRedirect.permanent,false);assert.equal(new URL(loginRedirect.destination).pathname,'/instructor-login');assert.equal(new URL(loginRedirect.destination).origin,new URL(vercelConfig.rewrites.find(r=>r.source==='/api/:path*').destination).origin);
env.PUBLIC_APP_ORIGIN='https://thesis.example.test/path';await request('/api/portal',proxied(),403);delete env.PUBLIC_APP_ORIGIN;

for(let i=0;i<8;i++)await login('wrong-password','192.0.2.99',401);await login(env.INSTRUCTOR_PASSWORD,'192.0.2.99',429);
const out=await request('/api/instructor-logout',{method:'POST',headers:{Origin:origin,Cookie:cookie}},200);assert.match(out.headers.get('Set-Cookie'),/Max-Age=0/);
const saved=env.SESSION_SECRET;env.SESSION_SECRET='short';assert.equal((await(await request('/api/portal',{headers:{Cookie:cookie}},200)).json()).isInstructor,false);await login(env.INSTRUCTOR_PASSWORD,'192.0.2.5',503);env.SESSION_SECRET=saved;
assert.equal(await(await request('/',{},200)).text(),'<html>student portal</html>');await request('/api/unknown',{},404);
console.log('PASS: authenticated CSV exports, class/search filtering, Unicode/quotes/multiline text, spreadsheet formula protection, explicit frontend origin trust and untrusted-origin rejection; student ID format, leading zeros, collision retries, simultaneous submissions, saved IDs and non-destructive migration;  standalone instructor sign-in, spoofed identity rejection, tampered/expired sessions, rate limiting, setup, D1 submission rows, 299-word enforcement, private file downloads, logout and unconfigured-auth rejection.');
