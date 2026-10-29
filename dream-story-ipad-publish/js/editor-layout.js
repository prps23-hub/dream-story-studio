
"use strict";

// Dream Story Editor Layout V1
// ปรับเฉพาะการแสดงผล ไม่แก้ข้อมูลเกม

(function () {
  const workspace = document.querySelector(".workspace");

  if (!workspace) return;

  const toolbar = document.createElement("div");
  toolbar.className = "ds-layout-toolbar";

  const leftButton = document.createElement("button");
  leftButton.type = "button";
  leftButton.textContent = "📁 คลังภาพและตัวละคร";

  const rightButton = document.createElement("button");
  rightButton.type = "button";
  rightButton.textContent = "⚙️ เครื่องมือปรับแต่ง";

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.textContent = "↺ คืนค่าหน้าจอ";

  toolbar.append(leftButton, rightButton, resetButton);

  workspace.parentNode.insertBefore(toolbar, workspace);

  function updateButtons() {
    const leftVisible =
      !workspace.classList.contains("ds-hide-left");

    const rightVisible =
      !workspace.classList.contains("ds-hide-right");

    leftButton.setAttribute(
      "aria-pressed",
      String(leftVisible)
    );

    rightButton.setAttribute(
      "aria-pressed",
      String(rightVisible)
    );
  }

  leftButton.addEventListener("click", () => {
    workspace.classList.toggle("ds-hide-left");
    updateButtons();
  });

  rightButton.addEventListener("click", () => {
    workspace.classList.toggle("ds-hide-right");
    updateButtons();
  });

  resetButton.addEventListener("click", () => {
    workspace.classList.remove(
      "ds-hide-left",
      "ds-hide-right"
    );

    updateButtons();
  });

  updateButtons();
})();
