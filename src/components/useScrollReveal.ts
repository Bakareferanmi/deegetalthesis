import {useEffect} from 'react';

export default function useScrollReveal(view:string,hasReceipt:boolean,loaded:boolean){
 useEffect(()=>{
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(motion.matches||!('IntersectionObserver' in window))return;
  const targets=Array.from(document.querySelectorAll<HTMLElement>('.workspace .field-block,.countdown,.mobile-guidelines,.admin-card,.receipt-details,.footer-credits'));
  const reveal=(el:HTMLElement)=>{el.dataset.reveal='visible';observer.unobserve(el);};
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)reveal(entry.target as HTMLElement);}),{threshold:0,rootMargin:'0px 0px -24px 0px'});
  targets.forEach(el=>{
   if(el.getBoundingClientRect().top<window.innerHeight-24){el.dataset.reveal='visible';return;}
   el.dataset.reveal='pending';observer.observe(el);
  });
  const onFocus=(event:FocusEvent)=>{const target=(event.target as HTMLElement).closest<HTMLElement>('[data-reveal]');if(target)reveal(target);};
  const onMotion=()=>{if(motion.matches){observer.disconnect();targets.forEach(el=>delete el.dataset.reveal);}};
  document.addEventListener('focusin',onFocus);motion.addEventListener('change',onMotion);
  return()=>{observer.disconnect();targets.forEach(el=>delete el.dataset.reveal);document.removeEventListener('focusin',onFocus);motion.removeEventListener('change',onMotion);};
 },[view,hasReceipt,loaded]);
}
