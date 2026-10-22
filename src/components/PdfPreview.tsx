import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Download,FileText,Loader2,X,ZoomIn,ZoomOut} from 'lucide-react';
import type {PDFDocumentProxy,RenderTask} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
type PreviewRecord={id:string;filename:string;name:string;title:string;studentId?:string};
export default function PdfPreview({record,onClose}:{record:PreviewRecord;onClose:()=>void}){
 const [document,setDocument]=useState<PDFDocumentProxy|null>(null),[page,setPage]=useState(1),[zoom,setZoom]=useState(1),[width,setWidth]=useState(700),[error,setError]=useState(''),[loading,setLoading]=useState(true),[rendering,setRendering]=useState(false),[text,setText]=useState('');
 const canvas=useRef<HTMLCanvasElement>(null),surface=useRef<HTMLDivElement>(null),dialog=useRef<HTMLElement>(null),close=useRef<HTMLButtonElement>(null),renderTask=useRef<RenderTask|null>(null);
 const pdf=/\.pdf$/i.test(record.filename);
 useEffect(()=>{
  const active=window.document.activeElement as HTMLElement|null,overflow=window.document.body.style.overflow;
  window.document.body.style.overflow='hidden';close.current?.focus();
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){onClose();return;}if(event.key==='Tab'){const controls=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],summary,[tabindex="0"]')||[]);const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&window.document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&window.document.activeElement===last){event.preventDefault();first?.focus();}}};
  window.document.addEventListener('keydown',key);
  return()=>{window.document.removeEventListener('keydown',key);window.document.body.style.overflow=overflow;active?.focus();};
 },[onClose]);
 useEffect(()=>{const observer=new ResizeObserver(entries=>setWidth(Math.max(200,entries[0].contentRect.width-32)));if(surface.current)observer.observe(surface.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{
  if(!pdf){setLoading(false);return;}
  let cancelled=false;let task:{destroy:()=>Promise<void>}|undefined;
  (async()=>{try{
   const engine=await import('pdfjs-dist/legacy/build/pdf.mjs');
   if(cancelled)return;
   engine.GlobalWorkerOptions.workerSrc=workerUrl;
   const loadingTask=engine.getDocument({url:'/api/files/'+record.id+'?view=inline',withCredentials:true,enableXfa:false,disableAutoFetch:true,disableStream:true,cMapUrl:'/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/'});
   task=loadingTask;
   const loaded=await loadingTask.promise;if(cancelled){await loadingTask.destroy();return;}setDocument(loaded);setLoading(false);
  }catch{if(!cancelled){setError('This PDF could not be opened. Your session may have expired. Close the preview, refresh the inbox and sign in again if needed.');setLoading(false);}}})();
  return()=>{cancelled=true;renderTask.current?.cancel();void task?.destroy().catch(()=>{});};
 },[record.id,pdf]);
 useEffect(()=>{
  if(!document||!canvas.current)return;let cancelled=false;setRendering(true);setError('');setText('');
  (async()=>{try{
   const pdfPage=await document.getPage(page);if(cancelled)return;
   const base=pdfPage.getViewport({scale:1});const viewport=pdfPage.getViewport({scale:Math.min(width/base.width,1.7)*zoom});
   const target=canvas.current;if(!target||cancelled)return;
   const outputScale=Math.min(window.devicePixelRatio||1,2);target.width=Math.ceil(viewport.width*outputScale);target.height=Math.ceil(viewport.height*outputScale);target.style.width=viewport.width+'px';target.style.height=viewport.height+'px';
   const task=pdfPage.render({canvas:target,viewport,transform:outputScale===1?undefined:[outputScale,0,0,outputScale,0,0]});renderTask.current=task;await task.promise;
   const content=await pdfPage.getTextContent();if(!cancelled)setText(content.items.map(item=>'str' in item?item.str:'').join(' '));
  }catch(e){if(!cancelled&&(e as Error).name!=='RenderingCancelledException')setError('This page could not be rendered. Try another page, or use the optional download.');}finally{if(!cancelled)setRendering(false);}})();
  return()=>{cancelled=true;renderTask.current?.cancel();};
 },[document,page,width,zoom]);
 return <div className="pdf-preview-backdrop"><section ref={dialog} className="pdf-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title">
  <header className="pdf-preview-heading"><FileText size={21}/><div><h2 id="pdf-preview-title">{record.filename}</h2><p>{record.name}{record.studentId?' · '+record.studentId:''}</p></div><button ref={close} onClick={onClose} aria-label="Close document preview"><X size={22}/></button></header>
  <p className="pdf-preview-thesis">{record.title}</p>
  {document&&<div className="pdf-preview-toolbar"><button disabled={page<=1||rendering} onClick={()=>setPage(p=>p-1)} aria-label="Previous page"><ArrowLeft size={17}/></button><span aria-live="polite">Page {page} of {document.numPages}</span><button disabled={page>=document.numPages||rendering} onClick={()=>setPage(p=>p+1)} aria-label="Next page"><ArrowRight size={17}/></button><div className="pdf-zoom-tools"><button disabled={zoom<=.75||rendering} onClick={()=>setZoom(z=>Math.max(.75,z-.25))} aria-label="Zoom out"><ZoomOut size={17}/></button><span>{Math.round(zoom*100)}%</span><button disabled={zoom>=2||rendering} onClick={()=>setZoom(z=>Math.min(2,z+.25))} aria-label="Zoom in"><ZoomIn size={17}/></button></div></div>}
  <div className="pdf-preview-surface" ref={surface} aria-busy={loading||rendering}>
   {loading&&<p className="pdf-preview-status" role="status"><Loader2 size={18} className="spin"/>Opening private PDF…</p>}
   {!pdf&&<p className="pdf-preview-status">This older Word document was submitted before the PDF requirement. Browser preview supports PDFs. Use Download for this file or request a PDF copy.</p>}
   {error&&<p className="error" role="alert">{error}</p>}
   {pdf&&<canvas ref={canvas} aria-label={'PDF page '+page} role="img"/>}
   {rendering&&<p className="pdf-preview-status" role="status">Rendering page {page}…</p>}
  </div>
  {text&&<details className="pdf-page-text"><summary>Read page text</summary><p>{text}</p></details>}
  <footer className="pdf-preview-footer"><span>Private instructor preview</span><a href={'/api/files/'+record.id}><Download size={15}/>Download a copy</a></footer>
 </section></div>;
}
