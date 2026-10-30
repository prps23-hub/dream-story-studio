(() => {
"use strict";
const data = window.DREAM_STORY_GAME || {};
const scenes = Array.isArray(data.scenes) ? data.scenes : [];
const assetPaths = data.assetPaths || {};
const $ = id => document.getElementById(id);
const game = $("game");
const sceneEl = $("scene");
const characters = $("characters");
const choices = $("choices");
const ending = $("ending");
const dialogue = $("dialogue");
const speaker = $("speaker");
const text = $("text");
let scene = null, index = 0, timer = null, complete = false;
let currentText = "";
// DS_AUDIO_V11_PATCH: independent music and one-shot sound channels.
const music = new Audio(); music.loop = true;
const effect = new Audio();
let activeMusicPath = '';
let soundEnabled = false;
function soundPath(id) { return id && data.assetPaths ? data.assetPaths[id] || '' : ''; }
// DS_AUDIO_SPLIT_V11_1: fall back to legacy audioVolume on old projects.
function audioVolume(s,kind) {
  const value=s?.[kind==='bgm'?'audioBgmVolume':'audioSfxVolume']??s?.audioVolume??70;
  const n=Number(value);
  return Number.isFinite(n)?Math.max(0,Math.min(1,n/100)):0.7;
}
function playEffect(id) {
  const src=soundPath(id);
  if (!src || !soundEnabled) return;
  effect.pause(); effect.src=src; effect.currentTime=0;
  effect.volume=audioVolume(scene,'sfx');
  effect.play().catch(()=>{});
}
function setSceneMusic(s) {
  const src=soundPath(s.audioBgmId);
  if (!src) { music.pause();music.removeAttribute('src');activeMusicPath='';return; }
  music.volume=audioVolume(s,'bgm');
  if (src!==activeMusicPath) { music.pause();music.src=src;activeMusicPath=src; }
  if(soundEnabled && music.paused) music.play().catch(()=>{});
}
function unlockSound() {
  if(soundEnabled)return;
  soundEnabled=true;
  if(scene) {setSceneMusic(scene);}
}
const soundButton=document.createElement('button');
soundButton.type='button';soundButton.textContent='🔇 เปิดเสียง';
soundButton.setAttribute('aria-label','เปิดหรือปิดเสียงเกม');
soundButton.style.cssText='align-self:flex-end;margin:3px 8px;padding:5px 10px;background:#292347;color:white;border:1px solid #a78bfa;border-radius:6px;cursor:pointer;';
game.insertBefore(soundButton,sceneEl);
soundButton.addEventListener('click',e=>{
  e.stopPropagation();
  if(!soundEnabled){unlockSound();soundButton.textContent='🔊 ปิดเสียง';}
  else {soundEnabled=false;music.pause();effect.pause();soundButton.textContent='🔇 เปิดเสียง';}
});

game.classList.toggle("mobile", data.aspectRatio === "9:16");

function stopTimer() {
  if (timer !== null) clearInterval(timer);
  timer = null;
}
function showLine() {
  stopTimer();
  const entry = (scene.dialogues || [])[index];
  if (!entry) return finishScene();
  playEffect(entry.audioSfxId);
  currentText = entry.text || "";
  speaker.textContent = entry.speaker || "ผู้บรรยาย";
  text.textContent = "";
  complete = currentText.length === 0;
  const letters = Array.from(currentText);
  let n = 0;
  if (complete) return;
  timer = setInterval(() => {
    n++;
    text.textContent = letters.slice(0,n).join("");
    if (n >= letters.length) {
      stopTimer();
      complete = true;
    }
  },35);
}
function loadScene(id) {
  stopTimer();
  scene = scenes.find(s => s.id === id);
  if (!scene) {
    alert("ไม่พบฉากปลายทาง");
    return;
  }
  index = 0;
  complete = false;
  setSceneMusic(scene);
  playEffect(scene.audioSfxId);
  choices.replaceChildren();
  choices.hidden = true;
  ending.hidden = true;
  dialogue.hidden = false;
  const bg = assetPaths[scene.backgroundId];
  sceneEl.style.backgroundImage = bg ? `url("${bg}")` : "none";

  const backgroundTransform = scene.backgroundTransform ||
    { x: 50, y: 50, zoom: 100 };

  const bx = Math.max(0, Math.min(100,
    Number(backgroundTransform.x) || 0));

  const by = Math.max(0, Math.min(100,
    Number(backgroundTransform.y) || 0));

  const bz = Math.max(100, Math.min(300,
    Number(backgroundTransform.zoom) || 100));

  sceneEl.style.backgroundSize = `${bz}% auto`;
  sceneEl.style.backgroundPosition = `${bx}% ${by}%`;
  sceneEl.style.backgroundRepeat = "no-repeat";
  characters.replaceChildren();
  for (const c of scene.characters || []) {
    const src = assetPaths[c.assetId];
    if (!src) continue;
    const img = document.createElement("img");
    img.src = src;
    // Preserve CSS units saved by the editor (px, %, etc.).
    for (const key of ["x","y","width","height"]) {
      const raw = c[key];
      if (raw === null || raw === undefined || raw === "") continue;

      const value = String(raw).trim();

      // Values with units are used as-is.
      // Plain numbers are treated as percentages for compatibility.
      const cssValue = /^-?\d+(?:\.\d+)?$/.test(value)
        ? value + "%"
        : value;

      if (!/^-?\d+(?:\.\d+)?(?:px|%|vw|vh)$/.test(cssValue)) {
        console.warn("Invalid character dimension:", key, raw);
        continue;
      }

      const property = key === "x" ? "left" :
                       key === "y" ? "top" : key;

      img.style[property] = cssValue;
    }
    characters.appendChild(img);
  }
  showLine();
}
function finishScene() {
  stopTimer();
  if (scene.isEnding) {
    dialogue.hidden = true;
    $("endingTitle").textContent = scene.endingTitle || "จบเรื่องราว";
    ending.hidden = false;
    return;
  }
  const options = scene.choices || [];
  if (!options.length) {
    dialogue.hidden = true;
    return;
  }
  choices.replaceChildren();
  for (const choice of options) {
    const button = document.createElement("button");
    button.textContent = choice.text || "ตัวเลือก";
    button.addEventListener("click", () => {
      unlockSound();
      playEffect(choice.audioSfxId);
      if (choice.targetSceneId) loadScene(choice.targetSceneId);
    });
    choices.appendChild(button);
  }
  choices.hidden = false;
}
sceneEl.addEventListener("click", (event) => {
  // อย่าให้การแตะปุ่มตัวเลือกหรือปุ่มจบเกม
  // กลายเป็นการข้ามบทสนทนาด้วย
  if (event.target.closest("#choices, #ending")) return;

  unlockSound();
  if (!scene || dialogue.hidden) return;
  if (!complete) {
    stopTimer();
    text.textContent = currentText;
    complete = true;
    return;
  }
  index++;
  showLine();
});
$("restart").addEventListener("click", () => {
  unlockSound();
  if (scenes.length) loadScene(scenes[0].id);
});
if (scenes.length) loadScene(scenes[0].id);
else {
  dialogue.hidden=true;
  const message=document.createElement('p');
  message.textContent='เกมนี้ยังไม่มีฉากให้เล่น';
  sceneEl.appendChild(message);
}
})();
