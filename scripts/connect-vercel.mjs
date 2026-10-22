import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline/promises';
const rl=createInterface({input:process.stdin,output:process.stdout});
let supplied=process.argv[2];
try{if(!supplied)supplied=await rl.question('Your production Vercel URL (https://...): ');}finally{rl.close();}
let url;
try{url=new URL(supplied);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error();}catch{console.error('Enter your exact HTTPS frontend origin, without a path, query or password.');process.exit(1);}
const config=existsSync('wrangler.local.jsonc')?'wrangler.local.jsonc':'wrangler.jsonc';
const result=spawnSync(process.execPath,[fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url)),'secret','put','PUBLIC_APP_ORIGIN','--config',config],{input:url.origin+'\n',stdio:['pipe','inherit','inherit'],env:process.env});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status ?? 1);
console.log('Frontend connected: '+url.origin+'. Test instructor sign-in and a student submission from this URL.');
