"use strict";
/* Dream Story Layout 58: move EXISTING controls without cloning or changing game data. */
(()=>{
 const $=s=>document.querySelector(s);
 const left=$('.asset-panel'),right=$('.properties-panel'),stage=$('.stage-panel'),tools=$('.ds54-tools'),story=$('.story-panel');
 if(!left||!right||!stage||!story)return;
 // Reuse the original background/character controls and their event handlers.
 if(tools){
   tools.classList.add('ds58-left-tools');
   const heading=document.createElement('h3');heading.textContent='🎛️ ปรับภาพและตัวละคร';heading.className='ds58-heading';
   left.append(heading,tools);
 }
 // Move font-size settings to the properties panel, retaining saved settings.
 const font=$('.ds56-font-panel');if(font){font.open=true;right.prepend(font);}
 // Timeline is a single existing DOM element, with all listeners intact.
 story.classList.add('ds58-story');right.append(story);
 // Keep the preview focused on the game, not editing controls.
 stage.classList.add('ds58-preview');
 const mq=window.matchMedia('(max-width: 1100px)');
 function update(){document.documentElement.classList.toggle('ds58-tablet',mq.matches);}
 update();if(mq.addEventListener)mq.addEventListener('change',update);else mq.addListener(update);
})();


/* Dream Story: collapsible image tools */
(() => {
  function setup() {
    const tools = document.querySelector(".ds54-tools");
    if (!tools) return;

    if (tools.closest(".ds58-image-collapse")) return;

    const wrapper = document.createElement("details");
    wrapper.className = "ds58-image-collapse";

    const summary = document.createElement("summary");
    summary.textContent = "🎛️ ปรับภาพและตัวละคร";
    summary.style.cssText = `
      cursor:pointer;
      padding:12px;
      font-weight:bold;
      border-radius:10px;
      background:#292638;
      color:white;
      user-select:none;
      touch-action:manipulation;
    `;

    wrapper.appendChild(summary);
    tools.parentNode.insertBefore(wrapper, tools);
    wrapper.appendChild(tools);

    // เริ่มต้นแบบพับเก็บ
    wrapper.open = false;

    // ซ่อนหัวข้อเดิมที่ซ้ำกัน
    const oldHeading = document.querySelector(".ds58-heading");
    if (oldHeading) oldHeading.style.display = "none";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, {once:true});
  } else {
    setup();
  }
})();
