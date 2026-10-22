import {ArrowUpRight,BookOpen,FileText,MessageSquareText} from 'lucide-react';
export default function SubmissionGuidelines({instructions,loading,error,onRetry,onOpenGuide}:{instructions?:string;loading:boolean;error:string;onRetry:()=>void;onOpenGuide:()=>void}){
 return <section className="mobile-guidelines" aria-labelledby="mobile-guidelines-title">
  <div className="guidelines-heading"><BookOpen size={20}/><div><span>START HERE</span><h2 id="mobile-guidelines-title">Submission guidelines</h2></div></div>
  <p className="guidelines-assignment">{loading?'Loading your instructor’s guidelines…':error?'Your instructor’s guidelines could not be loaded.':instructions || 'Submit your assigned thesis as one complete document. Include a title page, your research, and references.'}</p>
  {error&&<button className="guidelines-retry" onClick={onRetry}>Retry loading guidelines</button>}
  <ul><li><FileText size={16}/><span>One PDF or Word document. Maximum <strong>10 MB</strong>.</span></li><li><MessageSquareText size={16}/><span>Explain what you learnt in <strong>1–299 words</strong>.</span></li></ul>
  <button className="guidelines-more" onClick={onOpenGuide}>Read the full submission guide<ArrowUpRight size={16}/></button>
 </section>;
}
