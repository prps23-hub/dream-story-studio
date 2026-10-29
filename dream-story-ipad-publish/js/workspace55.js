"use strict";
/* Dream Story Batch 55 */
(()=>{
 const $=s=>document.querySelector(s);
 // Remove the redundant character summary in the right panel only.
 const right=$('.properties-panel');
 if(right){
  right.querySelectorAll('.ds-tool-group').forEach(group=>{
   const title=group.querySelector(':scope > summary');
   if(title && /ตัวละครในฉาก/.test(title.textContent)){
    // Keep all controls: move them to the existing scene toolbar if necessary.
    const body=group.querySelector('.ds-tool-group-body');
    const target=$('#ds54-chartools');
    if(body&&target) [...body.children].forEach(el=>{
     if(el.id==='characterSizeControls'||el.id==='removeStageCharacter')target.append(el);
    });
    group.remove();
   }
  });
  // Also hide duplicate current-character summaries created by earlier UI batches.
  right.querySelectorAll('.ds53-stage-characters').forEach(el=>el.remove());
 }
 // The asset name should occupy horizontal space instead of one character per line.
 function fixNames(){
  document.querySelectorAll('.character-library-row').forEach(row=>{
   const btn=row.querySelector(':scope > button:first-child');
   if(!btn)return;
   btn.style.setProperty('display','flex','important');
   btn.style.setProperty('flex-direction','row','important');
   btn.style.setProperty('align-items','center','important');
   btn.style.setProperty('min-width','0','important');
   btn.style.setProperty('width','auto','important');
   btn.style.setProperty('gap','8px','important');
   const label=btn.querySelector('span');
   if(label){
    label.style.setProperty('writing-mode','horizontal-tb','important');
    label.style.setProperty('overflow-wrap','normal','important');
    label.style.setProperty('word-break','normal','important');
    label.style.setProperty('white-space','normal','important');
    label.style.setProperty('flex','1 1 auto','important');
    label.style.setProperty('min-width','0','important');
   }
  });
 }
 const library=$('#characterLibrary');
 if(library){
  let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;fixNames();});}).observe(library,{childList:true,subtree:true});
  fixNames();
 }
})();