const projectNameInput = document.getElementById("projectName");
const createButton = document.getElementById("createProject");
const statusMessage = document.getElementById("statusMessage");

createButton.addEventListener("click", () => {
  const projectName = projectNameInput.value.trim();
  const selectedDevice = document.querySelector(
    'input[name="device"]:checked'
  );

  if (!projectName) {
    statusMessage.textContent = "กรุณาตั้งชื่อเกมก่อนครับ";
    projectNameInput.focus();
    return;
  }

  const project = {
    id: crypto.randomUUID(),
    name: projectName,
    device: selectedDevice.value,
    aspectRatio: selectedDevice.value === "mobile" ? "9:16" : "16:9",
    scenes: [],
    characters: [],
    backgrounds: [],
    audio: [],
    createdAt: new Date().toISOString()
  };

  try {
    const projects = JSON.parse(
      localStorage.getItem("dreamStoryProjects") || "[]"
    );

    projects.push(project);

    localStorage.setItem(
      "dreamStoryProjects",
      JSON.stringify(projects)
    );

    statusMessage.textContent =
      `สร้างโปรเจกต์ "${project.name}" สำเร็จ! ` +
      `รูปแบบ ${project.aspectRatio}`;
      
    console.log("Dream Story Studio:", project);

    // เปิด Editor ของโปรเจกต์ที่เพิ่งสร้าง
    window.location.href =
      "editor.html?project=" + encodeURIComponent(project.id);
  } catch (error) {
    statusMessage.textContent =
      "ไม่สามารถบันทึกโปรเจกต์ได้ กรุณาตรวจสอบพื้นที่จัดเก็บ";
    console.error(error);
  }
});
