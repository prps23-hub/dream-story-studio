"use strict";
/* Dream Story Workspace 53 V1 */
(function(){
 const $=s=>document.querySelector(s);
 const left=$('.asset-panel'),right=$('.properties-panel'),stage=$('#gameStage'),holder=$('.stage-container');
 if(!left||!right||!stage||!holder)return;
 // The previous compact script has already grouped some controls. Reuse their nodes without cloning.
 const existing=[...right.querySelectorAll('.ds-tool-group')];
 existing.forEach(g=>{const body=g.querySelector('.ds-tool-group-body');if(body)while(body.firstChild)right.appendChild(body.firstChild);g.remove()});
 function group(title,selectors,open,container=right,klass='ds-tool-group'){
   const d=document.createElement('details');d.className=klass;d.open=open;
   const s=document.createElement('summary');s.textContent=title;d.append(s);
   const b=document.createElement('div');b.className=container===left?'ds-asset-body':'ds-tool-group-body';d.append(b);
   for(const selector of selectors){const el=container.querySelector(selector);if(!el)continue;
     if(el.id==='speakerInput'||el.id==='dialogueInput'){
       const label=container.querySelector('label[for="'+el.id+'"]');if(label)b.append(label);
     }
     b.append(el);
   }
   container.append(d);return d;
 }
 // Left panel: current items remain visible; the large libraries stay closed until needed.
 const current=document.createElement('div');current.className='ds-current-assets';left.querySelector('h2')?.after(current);
 const sections=[...left.querySelectorAll(':scope > section')];
 const titles=['🏞️ คลังฉากพื้นหลัง','👤 คลังตัวละคร','🎵 คลังเสียง (ยังไม่พร้อม)'];
 sections.forEach((section,i)=>{
   const d=document.createElement('details');d.className='ds-asset-group';
   const s=document.createElement('summary');s.textContent=titles[i]||'คลังไฟล์';
   const b=document.createElement('div');b.className='ds-asset-body';
   section.querySelector('h3')?.remove();b.append(section);d.append(s,b);left.append(d);
 });
 // Move background transform controls to the background library, character size to the character panel.
 group('👤 ตัวละครในฉาก / ขนาด',['#characterSizeControls','#removeStageCharacter'],true);
 group('💬 บทสนทนา',['#speakerInput','#dialogueInput','.dialogue-test-controls'],true);
 group('🔀 ตัวเลือกและเส้นทาง',['.choice-editor'],false);
 group('🏁 ตอนจบ',['.ending-editor'],false);
 group('🧪 ตรวจสอบและส่งออก',['.game-validator-panel','.export-editor'],false);
 [...right.children].forEach(el=>{
   if(el.matches('h2,p')&&!el.closest('details'))el.classList.add('ds-hide-old-intro');
   if(el.tagName==='DIV'&&!el.matches('.ds-tool-group')&&!el.children.length&&!el.textContent.trim())el.classList.add('ds-hide-old-intro');
 });
 const save=$('#saveButton'),preview=$('#previewButton'),test=$('#testDialogue'),stop=$('#stopDialogue');
 if(save){save.disabled=false;save.title='บันทึกการแก้ไขฉากปัจจุบัน';save.addEventListener('click',()=>{
   try{if(typeof currentProject==='undefined'||!currentProject){alert('ยังไม่ได้เลือกโปรเจกต์');return;}
     if(typeof saveCurrentSceneData==='function')saveCurrentSceneData();
     if(typeof saveProjectRecord==='function')saveProjectRecord();
     const old=save.textContent;save.textContent='✓ บันทึกแล้ว';setTimeout(()=>save.textContent=old,1600);
   }catch(e){console.error(e);alert('บันทึกไม่สำเร็จ กรุณาตรวจสอบ Console');}
 });}
 if(preview){preview.disabled=false;preview.title='ทดลองเล่นจากฉากปัจจุบัน';preview.addEventListener('click',()=>{
   if(typeof currentProject==='undefined'||!currentProject){alert('ยังไม่ได้เลือกโปรเจกต์');return;}
   if(stop&&!stop.disabled){stop.click();preview.textContent='▶ ทดลองเล่น';return;}
   if(test&&!test.disabled){test.click();preview.textContent='■ หยุดทดลอง';}
 });}
 if(stop)stop.addEventListener('click',()=>{if(preview)preview.textContent='▶ ทดลองเล่น'});
 // Fit the real game-stage element, preserving its native coordinates and aspect ratio.
 function fit(){const w=holder.clientWidth-16,h=holder.clientHeight-16;if(w<60||h<60)return;
   const mobile=stage.classList.contains('mobile'),ratio=mobile?9/16:16/9;
   let width=Math.min(w,h*ratio);let height=width/ratio;
   stage.style.width=Math.floor(width)+'px';stage.style.height=Math.floor(height)+'px';
 }
 if(window.ResizeObserver)new ResizeObserver(fit).observe(holder);
 window.addEventListener('resize',fit);setTimeout(fit,0);setTimeout(fit,250);
 const observer=new MutationObserver(()=>{
   const chars=[...document.querySelectorAll('#characterLayer img')];
   const names=chars.map(img=>img.alt||'ตัวละคร').join(', ');
   const bg=document.querySelector('#backgroundLibrary .selected, #backgroundLibrary .active');
   current.innerHTML='<strong>กำลังจัดฉาก</strong><br>'+ (chars.length?'👤 '+chars.length+' ตัว: '+names:'👤 ยังไม่มีตัวละครในฉาก')+'<br>🏞️ เลือกพื้นหลังจากคลังด้านล่าง';
 });
 observer.observe($('.scene-content')||stage,{childList:true,subtree:true});
 function refreshCurrentCharacters(){
   const chars=[...document.querySelectorAll('#characterLayer img')];
   current.replaceChildren();

   const title=document.createElement('strong');
   title.textContent='กำลังจัดฉาก';
   current.append(title,document.createElement('br'));

   const info=document.createElement('span');
   info.textContent=chars.length
     ? '👤 ตัวละครในฉาก '+chars.length+' ตัว'
     : '👤 ยังไม่มีตัวละครในฉาก';
   current.append(info);

   chars.forEach((img,index)=>{
     const row=document.createElement('div');
     row.style.padding='4px 0';
     row.style.overflowWrap='anywhere';

     const button=document.createElement('button');
     button.type='button';
     button.textContent='👤 '+(img.alt||'ตัวละคร '+(index+1));
     button.style.width='100%';
     button.style.textAlign='left';

     button.addEventListener('click',()=>{
       img.dispatchEvent(new PointerEvent('pointerdown',{
         bubbles:true,
         pointerId:1,
         pointerType:'mouse'
       }));
     });

     row.append(button);
     current.append(row);
   });
 }

 observer.disconnect();
 observer.observe(stage,{childList:true,subtree:true});
 refreshCurrentCharacters();

})();
