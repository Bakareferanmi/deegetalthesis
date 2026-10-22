import {PDFDocument} from 'pdf-lib';
export const MIN_THESIS_PAGES=5;
export const MAX_THESIS_BYTES=10*1024*1024;
export type PdfCheck={pageCount:number;error:string|null};
export async function inspectThesisPdf(file:File):Promise<PdfCheck>{
 if(!/\.pdf$/i.test(file.name))return {pageCount:0,error:'Submit a PDF so we can verify its page count. In Word, use Save As or Export → PDF.'};
 if(!file.size||file.size>MAX_THESIS_BYTES)return {pageCount:0,error:'Choose a PDF between 1 byte and 10 MB.'};
 try{
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(!new TextDecoder().decode(bytes.slice(0,1024)).includes('%PDF-'))throw new Error('Invalid PDF');
  const document=await PDFDocument.load(bytes,{updateMetadata:false,throwOnInvalidObject:true});
  // Count real page-tree leaves, never a client-supplied count or text markers.
  const pageCount=document.getPages().length;
  if(pageCount<MIN_THESIS_PAGES)return {pageCount,error:`Your thesis has ${pageCount} ${pageCount===1?'page':'pages'}. At least ${MIN_THESIS_PAGES} pages are required.`};
  return {pageCount,error:null};
 }catch{return {pageCount:0,error:'We could not verify this PDF. Export it again as a readable, unprotected PDF and retry.'};}
}
