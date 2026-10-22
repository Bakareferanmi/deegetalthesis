import {existsSync} from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
function hidden(prompt){
 if(!process.stdin.isTTY)throw Error('Run this setup from an interactive terminal.');
 process.stdout.write(prompt);process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');
 return new Promise((resolve,reject)=>{let value='';function done(){process.stdin.removeListener('data',input);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n')}
 function input(chunk){for(const c of chunk){if(c==='\u0003'){done();reject(Error('Setup cancelled.'));return}if(c==='\r'||c==='\n'){done();resolve(value);return}if(c==='\u007f'||c==='\b'){value=value.slice(0,-1)}else if(c>=' '){value+=c}}}process.stdin.on('data',input)});
}
try{
 console.log('Set the instructor password for deegeetalthesis. It stays in Cloudflare secrets.');
 const password=await hidden('Choose a password (at least 12 characters): ');
 if(password.length<12||password.length>1024)throw Error('Use a password from 12 to 1,024 characters.');
 if(password!==await hidden('Enter the password again: '))throw Error('The passwords do not match. Run setup again.');
 console.log('Saving instructor access…');
 const configPath=existsSync('wrangler.local.jsonc')?'wrangler.local.jsonc':'wrangler.jsonc';
 const wrangler=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
 const child=spawn(process.execPath,[wrangler,'secret','bulk','--config',configPath],{stdio:['pipe','inherit','inherit'],env:process.env});
 child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({INSTRUCTOR_PASSWORD:password,SESSION_SECRET:randomBytes(48).toString('base64url')}));
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)});
 if(code!==0)throw Error('The secret update did not finish. Make sure you deployed the Worker and logged into Cloudflare.');
 console.log('Instructor access is ready. Open /instructor-login on your new Cloudflare URL.');
}catch(error){console.error(error.message);process.exitCode=1}
