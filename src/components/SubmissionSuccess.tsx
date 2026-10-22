import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Check,CheckCheck,Copy,Download,FileText,GraduationCap,ShieldCheck} from 'lucide-react';
export type SubmissionReceipt={id:string;studentId?:string;name:string;title:string;reflection?:string;level:string;stream:string;filename:string;size:string;submittedAt:string};
const date=(value:string)=>new Date(value).toLocaleString('en-GB',{timeZone:'Africa/Lagos',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})+' WAT';
export default function SubmissionSuccess({receipt,onDownload,onBack}:{receipt:SubmissionReceipt;onDownload:()=>void;onBack:()=>void}){
 const [copied,setCopied]=useState(false),[copyError,setCopyError]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});},[]);
 async function copyId(){
  try{
   try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(receipt.studentId!);}
   catch{
    const active=document.activeElement as HTMLElement|null;
    const text=document.createElement('textarea');text.value=receipt.studentId!;text.readOnly=true;text.setAttribute('aria-hidden','true');text.style.cssText='position:fixed;left:0;top:0;opacity:0;pointer-events:none';document.body.appendChild(text);
    try{text.select();text.setSelectionRange(0,text.value.length);if(!document.execCommand('copy'))throw Error('Copy unavailable');}finally{text.remove();active?.focus({preventScroll:true});}
   }
   setCopied(true);setCopyError(false);
  }catch{setCopyError(true)}
 }
 return <div className="success-view submission-complete">
  <div className="receipt-celebration" aria-hidden="true">{Array.from({length:14},(_,i)=><i key={i} style={{'--particle':i} as React.CSSProperties}/>)}</div>
  <div className="success-heading-row"><div className="success-symbol"><CheckCheck size={31}/></div><span className="received-badge"><Check size={12}/>Successfully received</span></div>
  <span className="eyebrow">SUBMISSION COMPLETE</span>
  <h2 ref={heading} tabIndex={-1}>Consider it submitted.</h2>
  <p>Your research has landed, {receipt.name.split(' ')[0]}. Here’s your record of a job well done.</p>
  {receipt.studentId&&<section className="student-id-card" aria-label="Your student ID">
   <div className="id-card-orbit" aria-hidden="true"/><div className="id-card-orbit second" aria-hidden="true"/>
   <div className="id-card-top"><span><GraduationCap size={16}/>STUDENT RECORD</span><ShieldCheck size={18}/></div>
   <span className="id-card-label">YOUR STUDENT ID</span>
   <strong className="student-id-value" tabIndex={0}>{receipt.studentId.slice(0,-4)}<span>{receipt.studentId.slice(-4)}</span></strong>
   <div className="id-card-bottom"><div><strong>{receipt.name}</strong><span>{receipt.level} · {receipt.stream}</span></div><button type="button" onClick={copyId} aria-label="Copy student ID">{copied?<Check size={15}/>:<Copy size={15}/>}<span>{copied?'Copied':'Copy ID'}</span></button></div>
  </section>}
  <p className="id-save-hint" role="status">{copyError?'Select the ID above to copy it manually.':copied?'Student ID copied. Keep it with your submission receipt.':'Keep your student ID. It identifies this submission in your instructor’s records.'}</p>
  <div className="submission-milestones" aria-label="Submission status"><span><Check size={12}/>Document received</span><span><Check size={12}/>Reflection saved</span><span><Check size={12}/>Record created</span></div>
  <details className="receipt-details" open><summary>Your submission details <span>View record</span></summary><div className="receipt-card"><div><span>THESIS TITLE</span><strong>{receipt.title}</strong></div><div className="receipt-grid"><div><span>STUDENT</span><strong>{receipt.name}</strong></div><div><span>CLASS</span><strong>{receipt.level} · {receipt.stream}</strong></div></div><div><span>DOCUMENT</span><strong className="filename"><FileText size={15}/>{receipt.filename}</strong></div><div><span>WHAT I LEARNT</span><strong className="reflection-text">{receipt.reflection}</strong></div><div><span>RECEIVED</span><strong>{date(receipt.submittedAt)}</strong></div><div className="receipt-reference">REF / {receipt.id}</div></div></details>
  <button className="primary" onClick={onDownload}><Download size={17}/>Save your receipt<ArrowRight size={17}/></button>
  <button className="text-button" onClick={onBack}>Back to submission portal <ArrowRight size={15}/></button>
 </div>;
}
