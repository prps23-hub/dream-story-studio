"use strict";
/* Batch 59: preserve the original story panel, buttons and listeners. */
(()=>{
 function apply(){
   const right=document.querySelector('.properties-panel');
   const story=right&&right.querySelector('.story-panel');
   if(!right||!story||story.closest('.ds59-timeline'))return;
   right.classList.add('ds59-right');
   const wrapper=document.createElement('details');
   wrapper.className='ds59-timeline';
   const summary=document.createElement('summary');
   summary.textContent='📖 ลำดับเนื้อเรื่อง — แตะเพื่อเปิด';
   wrapper.append(summary);
   story.before(wrapper);
   wrapper.append(story);
   // Closed by default. All existing story controls retain their DOM nodes and handlers.
   wrapper.open=false;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
 else apply();
})();