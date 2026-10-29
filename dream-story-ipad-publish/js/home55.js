"use strict";
/* Dream Story Batch 55: collapse project management on homepage */
(()=>{
 const panel=document.querySelector('.project-backup-panel');
 if(!panel || panel.querySelector('.ds55-project-details'))return;
 const details=document.createElement('details');details.className='ds55-project-details';
 const summary=document.createElement('summary');summary.textContent='📂 โปรเจกต์ของฉัน · เปิด / เปลี่ยนชื่อ / สำรองข้อมูล';
 const inner=document.createElement('div');inner.className='ds55-project-content';
 while(panel.firstChild)inner.append(panel.firstChild);
 details.append(summary,inner);panel.append(details);
})();