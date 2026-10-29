(() => {
"use strict";
const button = document.getElementById("exportGameButton");
const status = document.getElementById("exportStatus");
if (!button) return;

const enc = new TextEncoder();
const bytes = s => enc.encode(s);
const u16 = n => [n & 255, (n >>> 8) & 255];
const u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];

const crcTable = Array.from({length:256}, (_,n) => {
  let c = n;
  for (let k=0;k<8;k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function concat(parts) {
  const out = new Uint8Array(parts.reduce((n,p)=>n+p.length,0));
  let pos=0;
  for (const p of parts) {out.set(p,pos);pos+=p.length;}
  return out;
}
function makeZip(files) {
  const local=[], central=[];
  let offset=0;
  for (const file of files) {
    const name=bytes(file.name);
    const body=file.data;
    const crc=crc32(body);
    const localHead=new Uint8Array([
      ...u32(0x04034b50),...u16(20),...u16(0x0800),
      ...u16(0),...u16(0),...u16(0),
      ...u32(crc),...u32(body.length),...u32(body.length),
      ...u16(name.length),...u16(0)
    ]);
    const localPart=concat([localHead,name,body]);
    local.push(localPart);
    central.push(concat([
      new Uint8Array([
        ...u32(0x02014b50),...u16(20),...u16(20),
        ...u16(0x0800),...u16(0),...u16(0),...u16(0),
        ...u32(crc),...u32(body.length),...u32(body.length),
        ...u16(name.length),...u16(0),...u16(0),
        ...u16(0),...u16(0),...u32(0),...u32(offset)
      ]),name
    ]));
    offset+=localPart.length;
  }
  const c=concat(central);
  return new Blob([...local,c,new Uint8Array([
    ...u32(0x06054b50),...u16(0),...u16(0),
    ...u16(files.length),...u16(files.length),
    ...u32(c.length),...u32(offset),...u16(0)
  ])],{type:"application/zip"});
}
async function fileBytes(url) {
  const response=await fetch(url);
  if(!response.ok) throw new Error("โหลดไฟล์ตัวเล่นเกมไม่ได้: "+url);
  return new Uint8Array(await response.arrayBuffer());
}
button.addEventListener("click", async () => {
  if (!currentProject || !currentProject.scenes?.length) {
    alert("ยังไม่มีฉากสำหรับส่งออก");
    return;
  }
  saveCurrentSceneData();

  const validation = validateDreamStoryGame(currentProject);

  if (validation.errors.length) {
    renderGameValidation(validation);
    status.textContent =
      "❌ พบข้อผิดพลาด กรุณาตรวจสอบเกมก่อน Export";
    validateGameButton.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
    return;
  }

  if (validation.warnings.length) {
    renderGameValidation(validation);

    const proceed = confirm(
      `พบคำเตือน ${validation.warnings.length} รายการ\n\n` +
      "ต้องการส่งออกเกมต่อหรือไม่?"
    );

    if (!proceed) return;
  }

  button.disabled=true;
  status.textContent="กำลังสร้างไฟล์ ZIP...";
  try {
    saveCurrentSceneData();
    const project=JSON.parse(JSON.stringify(currentProject));
    const assets=await getProjectAssets(project.id);
    const used=new Set();
    for(const s of project.scenes) {
      if(s.backgroundId) used.add(s.backgroundId);
      for(const c of s.characters||[]) if(c.assetId) used.add(c.assetId);
    }
    const paths={};
    const files=[];
    let n=0;
    for(const asset of assets) {
      if(!used.has(asset.id)) continue;
      const ext=asset.file.type==="image/png"?"png":
        asset.file.type==="image/webp"?"webp":"jpg";
      const name=`assets/image_${++n}.${ext}`;
      paths[asset.id]=name;
      files.push({name,data:new Uint8Array(await asset.file.arrayBuffer())});
    }
    const game={
      name:project.name,
      aspectRatio:project.device === "mobile" ? "9:16" : "16:9",
      scenes:project.scenes,
      assetPaths:paths
    };
    files.push({
      name:"game-data.js",
      data:bytes("window.DREAM_STORY_GAME = "+JSON.stringify(game)+";")
    });
    for(const name of ["index.html","style.css","player.js"]) {
      files.push({name,data:await fileBytes("export/player/"+name)});
    }
    const zip=makeZip(files);
    const url=URL.createObjectURL(zip);
    const a=document.createElement("a");
    a.href=url;
    a.download=(project.name||"dream-story-game")
      .replace(/[\\/:*?"<>|]/g,"_")+".zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    status.textContent="✅ ส่งออกเกมสำเร็จ";
  } catch(error) {
    console.error("ส่งออกเกมไม่สำเร็จ:",error);
    status.textContent="❌ ส่งออกไม่สำเร็จ: "+error.message;
  } finally {
    button.disabled=false;
  }
});
})();
