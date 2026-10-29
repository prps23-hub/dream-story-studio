"use strict";
/* Dream Story Batch 56: adjustable dialogue text sizes (Editor preview) */
(()=>{
 const stage=document.querySelector("#gameStage");
 const controls=document.querySelector(".ds54-tools");
 if(!stage||!controls)return;
 const details=document.createElement("details");
 details.className="ds56-font-panel";
 const summary=document.createElement("summary");
 summary.textContent="🔠 ปรับขนาดชื่อและบทสนทนา";
 details.append(summary);
 const key="dreamStoryEditorFontSizesV56";
 let stored={};
 try{stored=JSON.parse(localStorage.getItem(key)||"{}")}catch(e){}
 function addSlider(label,target,property,initial){
   const row=document.createElement("label");row.className="ds56-font-row";
   const title=document.createElement("span");title.textContent=label;
   const value=document.createElement("output");
   const input=document.createElement("input");input.type="range";input.min="10";input.max="36";input.step="1";
   const n=Number(stored[property]);input.value=Number.isFinite(n)&&n>=10&&n<=36?n:initial;
   const apply=()=>{const el=stage.querySelector(target);if(el)el.style.fontSize=input.value+"px";value.textContent=input.value+" px";};
   input.addEventListener("input",()=>{stored[property]=Number(input.value);try{localStorage.setItem(key,JSON.stringify(stored))}catch(e){}apply();});
   row.append(title,input,value);details.append(row);apply();
 }
 addSlider("ชื่อผู้พูด","#speakerPreview","speaker",15);
 addSlider("ข้อความบทสนทนา","#textPreview","dialogue",13);
 controls.append(details);
})();
