import {readFileSync,existsSync} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const configPath=existsSync('wrangler.local.jsonc')?'wrangler.local.jsonc':'wrangler.jsonc';
const config=JSON.parse(readFileSync(configPath,'utf8'));
const databaseName=config.d1_databases?.[0]?.database_name;
if(!databaseName||databaseName.startsWith('YOUR_')||config.d1_databases[0].database_id.startsWith('YOUR_')||config.r2_buckets?.[0]?.bucket_name.startsWith('YOUR_')){console.error('Copy wrangler.jsonc to wrangler.local.jsonc and fill in your D1 database and R2 bucket details before deploying.');process.exit(1);}
const tool=(path,args)=>{const result=spawnSync(process.execPath,[fileURLToPath(new URL('../node_modules/'+path,import.meta.url)),...args],{stdio:'inherit',env:process.env});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1)};
tool('vite/bin/vite.js',['build']);
tool('wrangler/bin/wrangler.js',['d1','execute',databaseName,'--remote','--file=schema.sql','--config',configPath]);
tool('wrangler/bin/wrangler.js',['deploy','--config',configPath]);
