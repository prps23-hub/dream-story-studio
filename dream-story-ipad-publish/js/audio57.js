"use strict";
// Dream Story Audio 57: browser-local library, scene BGM/SFX and volume.
(() => {
  const $ = id => document.getElementById(id);
  const add=$('addAudio'), library=$('audioLibrary');
  if(!add || !library) return;
  add.disabled=false;
  add.textContent='＋ เพิ่มไฟล์เสียง';
  const fileInput=document.createElement('input');
  fileInput.type='file'; fileInput.multiple=true; fileInput.hidden=true;
  fileInput.accept='.mp3,.m4a,.aac,.wav,.ogg,.webm,audio/*';
  add.insertAdjacentElement('afterend',fileInput);
  const panel=document.createElement('div'); panel.className='ds57-audio-panel';
  const heading=document.createElement('h4'); heading.textContent='🎵 เสียงของฉากปัจจุบัน';
  const info=document.createElement('p'); info.className='ds57-note';
  info.textContent='ไฟล์ MP3, M4A/AAC, WAV รองรับทั่วไปทั้ง Safari บน iPad และคอมพิวเตอร์';
  const bgmLabel=document.createElement('label'); bgmLabel.textContent='เพลงพื้นหลัง (BGM)';
  const bgm=document.createElement('select');
  const sfxLabel=document.createElement('label'); sfxLabel.textContent='เสียงประกอบ (SFX)';
  const sfx=document.createElement('select');
  const volumeLabel=document.createElement('label');
  const volume=document.createElement('input'); volume.type='range'; volume.min='0'; volume.max='100'; volume.value='70';
  const volumeText=document.createElement('span'); volumeText.textContent='70%';
  volumeLabel.textContent='🔊 ระดับเสียง: '; volumeLabel.append(volumeText);
  const controls=document.createElement('div'); controls.className='ds57-actions';
  const play=document.createElement('button'); play.type='button'; play.textContent='▶ ฟังเพลง';
  const effect=document.createElement('button'); effect.type='button'; effect.textContent='🔔 ทดลองเสียง';
  const stop=document.createElement('button'); stop.type='button'; stop.textContent='■ หยุดเสียง';
  controls.append(play,effect,stop);
  const status=document.createElement('p'); status.className='ds57-note';
  panel.append(heading,info,bgmLabel,bgm,sfxLabel,sfx,volumeLabel,volume,controls,status);
  library.insertAdjacentElement('beforebegin',panel);
  const music=new Audio(); music.loop=true;
  const sound=new Audio();
  let assets=[],urls=new Map(),sceneKey='';
  function project(){ return typeof currentProject!=='undefined' ? currentProject : null; }
  function scene(){
    const p=project(); if(!p) return null;
    return (p.scenes||[]).find(s=>s.id===p.activeSceneId) || null;
  }
  function save(){
    const p=project(); if(!p)return;
    const all=JSON.parse(localStorage.getItem('dreamStoryProjects')||'[]');
    const idx=all.findIndex(x=>x.id===p.id);
    if(idx>=0){ all[idx]=p; localStorage.setItem('dreamStoryProjects',JSON.stringify(all)); }
  }
  function audioUrl(a){
    if(!a) return '';
    if(urls.has(a.id))return urls.get(a.id);
    const raw=a.blob||a.file||a.data||a.url;
    const url=raw instanceof Blob?URL.createObjectURL(raw):typeof raw==='string'?raw:'';
    if(url)urls.set(a.id,url);
    return url;
  }
  function selectOptions(select, selected){
    select.replaceChildren();
    const empty=document.createElement('option');empty.value='';empty.textContent='— ไม่ใช้เสียง —';select.append(empty);
    for(const a of assets){const o=document.createElement('option');o.value=a.id;o.textContent=a.name||'ไฟล์เสียง';select.append(o);}
    select.value=selected||'';
  }
  function stopAll(){music.pause();music.currentTime=0;sound.pause();sound.currentTime=0;}
  function sync(){
    const s=scene(); const key=s?.id||'';
    if(sceneKey!==key){stopAll();sceneKey=key;}
    selectOptions(bgm,s?.audioBgmId);
    selectOptions(sfx,s?.audioSfxId);
    const v=Number.isFinite(Number(s?.audioVolume))&&s?.audioVolume!=null?Number(s.audioVolume):70;
    volume.value=Math.min(100,Math.max(0,v));volumeText.textContent=volume.value+'%';
    music.volume=sound.volume=Number(volume.value)/100;
  }
  function render(){
    library.replaceChildren();
    for(const a of assets){
      const row=document.createElement('div');row.className='ds57-audio-row';
      const name=document.createElement('span');name.textContent=a.name||'ไฟล์เสียง';name.title=name.textContent;
      const listen=document.createElement('button');listen.type='button';listen.textContent='▶';listen.title='ฟังตัวอย่าง';
      listen.addEventListener('click',async()=>{try{sound.pause();sound.src=audioUrl(a);sound.volume=Number(volume.value)/100;await sound.play();}catch(e){status.textContent='⚠️ เล่นไฟล์นี้ไม่ได้ในเบราว์เซอร์นี้';}});
      const del=document.createElement('button');del.type='button';del.textContent='🗑';del.title='ลบไฟล์เสียง';
      del.addEventListener('click',async()=>{
        if(!confirm('ลบเสียง '+a.name+' ออกจากคลัง?'))return;
        try{
          stopAll();await deleteStudioAsset(a.id);
          const p=project(); for(const s of p?.scenes||[]){if(s.audioBgmId===a.id)s.audioBgmId='';if(s.audioSfxId===a.id)s.audioSfxId='';}
          save();const url=urls.get(a.id);if(url?.startsWith('blob:'))URL.revokeObjectURL(url);urls.delete(a.id);
          await load();
        }catch(e){status.textContent='⚠️ ลบเสียงไม่สำเร็จ';}
      });
      row.append(name,listen,del);library.append(row);
    }
    sync();
  }
  async function load(){
    const p=project();if(!p)return;
    try{
      const all=await getProjectAssets(p.id);
      assets=all.filter(a=>a.type==='audio'||a.kind==='audio'||(a.mimeType||'').startsWith('audio/'));
      render();
    }catch(e){status.textContent='⚠️ อ่านคลังเสียงไม่สำเร็จ';console.error(e);}
  }
  add.addEventListener('click',()=>fileInput.click());
  fileInput.addEventListener('change',async()=>{
    const files=Array.from(fileInput.files||[]);fileInput.value='';if(!files.length)return;
    status.textContent='กำลังบันทึกเสียง…';
    for(const f of files){
      const ext=f.name.split('.').pop().toLowerCase();
      if(!['mp3','m4a','aac','wav','ogg','webm'].includes(ext) && !f.type.startsWith('audio/')){
        status.textContent='⚠️ ข้ามไฟล์ที่ไม่ใช่เสียง: '+f.name;continue;
      }
      try{
        await saveAsset({id:crypto.randomUUID(),projectId:project().id,type:'audio',name:f.name,mimeType:f.type,blob:f,createdAt:new Date().toISOString()});
      }catch(e){status.textContent='⚠️ บันทึก '+f.name+' ไม่สำเร็จ (พื้นที่จัดเก็บอาจเต็ม)';console.error(e);}
    }
    await load();if(!status.textContent.startsWith('⚠️'))status.textContent='✓ เพิ่มเสียงเรียบร้อย';
  });
  for(const [el,key] of [[bgm,'audioBgmId'],[sfx,'audioSfxId']]){
    el.addEventListener('change',()=>{const s=scene();if(!s)return;s[key]=el.value;save();stopAll();});
  }
  volume.addEventListener('input',()=>{
    volumeText.textContent=volume.value+'%';music.volume=sound.volume=Number(volume.value)/100;
    const s=scene();if(s){s.audioVolume=Number(volume.value);save();}
  });
  play.addEventListener('click',async()=>{
    const a=assets.find(x=>x.id===bgm.value);if(!a){status.textContent='เลือกเพลงพื้นหลังก่อนครับ';return;}
    try{music.pause();music.src=audioUrl(a);music.volume=Number(volume.value)/100;await music.play();status.textContent='♪ กำลังเล่นเพลง';}
    catch(e){status.textContent='⚠️ ไฟล์นี้เล่นไม่ได้ใน Safari/เบราว์เซอร์ปัจจุบัน';}
  });
  effect.addEventListener('click',async()=>{
    const a=assets.find(x=>x.id===sfx.value);if(!a){status.textContent='เลือกเสียงประกอบก่อนครับ';return;}
    try{sound.pause();sound.src=audioUrl(a);sound.volume=Number(volume.value)/100;await sound.play();}
    catch(e){status.textContent='⚠️ ไฟล์นี้เล่นไม่ได้ในเบราว์เซอร์ปัจจุบัน';}
  });
  stop.addEventListener('click',()=>{stopAll();status.textContent='หยุดเสียงแล้ว';});
  // Keep the controls aligned with the active scene without changing editor internals.
  setInterval(()=>{const id=scene()?.id||'';if(id!==sceneKey)sync();},450);
  window.addEventListener('pagehide',()=>{stopAll();for(const u of urls.values())if(u.startsWith('blob:'))URL.revokeObjectURL(u);});
  load();
})();
