"use strict";
/* Dream Story Batch 56: place My Projects below Create Project */
(()=>{
 const create=document.querySelector(".project-panel");
 const projects=document.querySelector(".project-backup-panel");
 if(!create||!projects)return;
 create.insertAdjacentElement("afterend",projects);
})();
