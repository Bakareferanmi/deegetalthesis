import type {SubmissionReceipt} from '../components/SubmissionSuccess';

/** Upload progress comes from the browser; saving starts after the body is sent. */
export function submitThesis(body:FormData,onProgress:(percent:number|null)=>void,onUploaded:()=>void):Promise<SubmissionReceipt>{
 return new Promise((resolve,reject)=>{
  const request=new XMLHttpRequest();
  request.open('POST','/api/portal');
  request.upload.onprogress=event=>onProgress(event.lengthComputable?Math.min(100,Math.round(event.loaded/event.total*100)):null);
  request.upload.onload=onUploaded;
  request.onerror=()=>reject(new Error('Connection interrupted. Check your connection before trying again.'));
  request.onabort=()=>reject(new Error('Submission was interrupted. Please try again.'));
  request.onload=()=>{
   try{
    const result=JSON.parse(request.responseText);
    if(request.status<200||request.status>=300)throw new Error(result.error||'Your submission could not be saved. Please try again.');
    if(!result.receipt?.id)throw new Error('The server did not return a submission receipt. Contact your instructor before submitting again.');
    resolve(result.receipt);
   }catch(error){reject(error instanceof SyntaxError?new Error('The server response could not be read. Contact your instructor before submitting again.'):error);}
  };
  request.send(body);
 });
}
