"use strict";
// Dream Story Batch 54: scene-side controls + asset display-name editing
(()=>{
 const $=s=>document.querySelector(s);
 const panel=$('.stage-panel'), stage=$('#gameStage'), libraryBg=$('#backgroundLibrary'), libraryChar=$('#characterLibrary');
 if(!panel||!stage||!libraryBg||!libraryChar)return;
 const wrap=document.createElement('section');wrap.className='ds54-tools';
 wrap.innerHTML=`<div class="ds54-top"><strong>🎨 กำลังจัดฉาก</strong><span id="ds54-current">เลือกภาพหรือตัวละครจากคลัง</span></div><div class="ds54-tabs"><button type="button" data-tab="background" aria-pressed="true">🏞️ พื้นหลัง</button><button type="button" data-tab="character" aria-pressed="false">👤 ตัวละคร</button></div><div class="ds54-tab" data-content="background"><div class="ds54-current-name">ภาพพื้นหลัง: <b id="ds54-bgname">ยังไม่เลือก</b></div><div id="ds54-bgtools"></div></div><div class="ds54-tab" data-content="character" hidden><div class="ds54-current-name" id="ds54-characters">เลือกตัวละครบนฉากเพื่อปรับขนาด</div><div id="ds54-chartools"></div></div>`;
 const container=$('.stage-container');
 if(container) container.insertAdjacentElement('afterend',wrap);else panel.append(wrap);
 const bgtools=$('#ds54-bgtools'),chartools=$('#ds54-chartools');
 const bgControls=$('.background-position-controls');if(bgControls)bgtools.append(bgControls);
 const size=$('#characterSizeControls'),remove=$('#removeStageCharacter');
 if(size)chartools.append(size);
 if(remove){const parent=remove.parentElement;chartools.append(remove);if(parent&&parent!==chartools&&!parent.children.length)parent.remove();}
 wrap.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
  const tab=button.dataset.tab;
  wrap.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  wrap.querySelectorAll('[data-content]').forEach(content=>content.hidden=content.dataset.content!==tab);
 }));
 function currentProjectId(){try{return typeof currentProject!=='undefined'&&currentProject?currentProject.id:null;}catch(e){return null;}}
 async function renameAsset(type,row){
  const id=row.dataset.ds54AssetId;
  if(!id)return;
  const projectId=currentProjectId();if(!projectId)return alert('กรุณาเปิดโปรเจกต์ก่อน');
  try{
   const assets=await getProjectAssets(projectId);
   const asset=assets.find(a=>String(a.id)===id&&a.type===type);
   if(!asset)return alert('ไม่พบภาพนี้ในคลัง');
   const next=prompt('เปลี่ยนชื่อภาพที่แสดงในคลัง',asset.name||'');
   if(next===null)return;
   const clean=next.trim();if(!clean)return alert('กรุณาใส่ชื่อ');
   if(clean.length>100)return alert('ชื่อยาวเกินไป (สูงสุด 100 ตัวอักษร)');
   asset.name=clean;
   await saveAsset(asset);
   const select=row.querySelector('button:not(.background-library-delete):not(.character-library-delete):not(.ds54-rename)');
   if(type==='background'){
    if(select){select.textContent=clean;select.title='คลิกเพื่อใช้ภาพนี้';}
    if(typeof currentProject!=='undefined'&&currentProject&&String(currentProject.selectedBackgroundId)===id)$('#ds54-bgname').textContent=clean;
   }else{
    if(select){select.title=clean;const span=select.querySelector('span');if(span)span.textContent=clean;const img=select.querySelector('img');if(img)img.alt=clean;}
    // Existing character instances retain their original stored name until placed again.
   }
   update();
  }catch(err){console.error(err);alert('เปลี่ยนชื่อไม่สำเร็จ: '+err.message);}
 }
 function addRenameButtons(library,type){
  const rows=library.querySelectorAll(type==='background'?'.background-library-row':'.character-library-row');
  const projectId=currentProjectId();if(!projectId)return;
  getProjectAssets(projectId).then(assets=>{
   const candidates=assets.filter(a=>a.type===type);
   // Match rendered row by asset name and image URL order; stable ID is then saved on row.
   rows.forEach((row,index)=>{
    if(row.dataset.ds54AssetId)return;
    const item=row.querySelector(type==='background'?'.background-library-select':'.character-library-row > button:first-child');
    const name=type==='background'?(item?.textContent||'').trim():(item?.querySelector('span')?.textContent||'').trim();
    const used=new Set([...library.querySelectorAll('[data-ds54-asset-id]')].map(x=>x.dataset.ds54AssetId));
    const asset=candidates.find(a=>a.name===name&&!used.has(String(a.id)));
    if(!asset)return;
    row.dataset.ds54AssetId=String(asset.id);
    const button=document.createElement('button');button.type='button';button.className='ds54-rename';button.textContent='✏️';button.title='เปลี่ยนชื่อภาพ';button.setAttribute('aria-label','เปลี่ยนชื่อภาพ '+name);
    button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();renameAsset(type,row);});
    row.append(button);
   });
  }).catch(console.error);
 }
 let pending=false;
 function update(){
  if(pending)return;pending=true;
  requestAnimationFrame(()=>{pending=false;
   const project=typeof currentProject!=='undefined'?currentProject:null;
   const bgId=project?.selectedBackgroundId;
   const bgrow=bgId?[...libraryBg.querySelectorAll('[data-ds54-asset-id]')].find(r=>r.dataset.ds54AssetId===String(bgId)):null;
   const label=bgrow?.querySelector('.background-library-select')?.textContent?.trim()||'ยังไม่เลือก';
   $('#ds54-bgname').textContent=label;
   const chars=project?.sceneCharacters||[];
   $('#ds54-characters').textContent=chars.length?'ตัวละครในฉาก '+chars.length+' ตัว · คลิกตัวละครเพื่อปรับขนาด':'ยังไม่มีตัวละครในฉาก · เปิดคลังตัวละครด้านซ้ายเพื่อเพิ่ม';
   addRenameButtons(libraryBg,'background');addRenameButtons(libraryChar,'character');
  });
 }
 // Rebuilds from original asset loaders do not lose rename buttons.
 const observer=new MutationObserver(update);
 observer.observe(libraryBg,{childList:true});observer.observe(libraryChar,{childList:true});
 stage.addEventListener('click',()=>setTimeout(update,0));
 libraryBg.addEventListener('click',()=>setTimeout(update,0));
 libraryChar.addEventListener('click',()=>setTimeout(update,0));
 update();
})();