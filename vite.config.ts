import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {cpSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
export default defineConfig({plugins:[react(),{
 name:'private-pdf-viewer-assets',
 closeBundle(){
  for(const name of ['cmaps','standard_fonts','wasm']){
   const target=resolve('dist/client/pdfjs',name);mkdirSync(target,{recursive:true});
   cpSync(resolve('node_modules/pdfjs-dist',name),target,{recursive:true});
  }
 }
}],build:{outDir:'dist/client',emptyOutDir:true}});
