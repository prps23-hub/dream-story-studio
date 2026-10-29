
"use strict";

// Dream Story Compact Editor V1

(function () {
  const panel = document.querySelector(".properties-panel");

  if (!panel) return;

  if (panel.querySelector(".ds-tool-group")) return;

  const definitions = [
    {
      title: "💬 บทสนทนาและตัวละคร",
      selectors: [
        "#speakerInput",
        "#dialogueInput",
        "#characterSizeControls",
        "#removeStageCharacter"
      ]
    },
    {
      title: "🔀 ตัวเลือกและเส้นทาง",
      selectors: [
        ".choice-editor"
      ]
    },
    {
      title: "🏁 ตอนจบเกม",
      selectors: [
        ".ending-editor"
      ]
    },
    {
      title: "🧪 ทดสอบและส่งออก",
      selectors: [
        ".dialogue-test-controls",
        ".game-validator-panel",
        ".export-editor"
      ]
    }
  ];

  const groups = [];

  definitions.forEach((definition, index) => {
    const group = document.createElement("details");
    group.className = "ds-tool-group";

    const summary = document.createElement("summary");
    summary.textContent = definition.title;

    const body = document.createElement("div");
    body.className = "ds-tool-group-body";

    group.append(summary, body);

    definition.selectors.forEach(selector => {
      const element = panel.querySelector(selector);

      if (!element) return;

      if (element.id === "speakerInput" ||
          element.id === "dialogueInput") {

        const label = panel.querySelector(
          `label[for="${element.id}"]`
        );

        if (label) body.appendChild(label);
      }

      body.appendChild(element);
    });

    panel.appendChild(group);
    groups.push(group);

    // เปิดหมวดบทสนทนาเป็นค่าเริ่มต้น
    if (index === 0) group.open = true;
  });

  // เก็บสถานะเปิด/ปิดเฉพาะในหน้านี้
  // ไม่เปลี่ยนข้อมูลเกม
  groups.forEach(group => {
    group.addEventListener("toggle", () => {
      // แต่ละหมวดเปิด/ปิดได้อย่างอิสระ
    });
  });
})();
