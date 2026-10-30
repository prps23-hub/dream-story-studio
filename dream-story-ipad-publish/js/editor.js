const projectTitle = document.getElementById("projectTitle");
const aspectRatioLabel = document.getElementById("aspectRatioLabel");
const gameStage = document.getElementById("gameStage");
const gameEnding = document.getElementById("gameEnding");

// Initialize controls before scene/background loading.
const choiceEditorList = document.getElementById("choiceEditorList");
const backgroundZoom = document.getElementById("backgroundZoom");
const backgroundZoomValue = document.getElementById("backgroundZoomValue");

const validateGameButton =
  document.getElementById("validateGameButton");

const gameValidationResults =
  document.getElementById("gameValidationResults");

const params = new URLSearchParams(window.location.search);
const projectId = params.get("project");

let currentProject = null;

function loadProject() {
  try {
    const projects = JSON.parse(
      localStorage.getItem("dreamStoryProjects") || "[]"
    );

    currentProject = projects.find(
      project => project.id === projectId
    );

    if (!currentProject) {
      projectTitle.textContent = "ไม่พบโปรเจกต์";
      aspectRatioLabel.textContent = "ยังไม่ได้เลือก";
      return;
    }

    projectTitle.textContent = currentProject.name;

    const isMobile = currentProject.device === "mobile";

    gameStage.classList.remove("mobile", "desktop");
    gameStage.classList.add(isMobile ? "mobile" : "desktop");

    aspectRatioLabel.textContent =
      isMobile ? "มือถือ 9:16" : "คอมพิวเตอร์ 16:9";

    console.log("Loaded project:", currentProject);

  } catch (error) {
    projectTitle.textContent = "เกิดข้อผิดพลาดในการโหลดโปรเจกต์";
    console.error(error);
  }
}

loadProject();


// ระบบคลังฉากหลังพร้อมบันทึกลง IndexedDB
const addBackgroundButton = document.getElementById("addBackground");
const backgroundFileInput = document.getElementById("backgroundFileInput");
const backgroundLibrary = document.getElementById("backgroundLibrary");
const sceneContent = document.querySelector(".scene-content");

const backgroundUrls = [];

function showBackground(url, assetId = null) {
  if (assetId && currentProject) {
    currentProject.selectedBackgroundId = assetId;
    saveCurrentSceneData();

    const projects = JSON.parse(
      localStorage.getItem("dreamStoryProjects") || "[]"
    );

    const index = projects.findIndex(
      project => project.id === currentProject.id
    );

    if (index !== -1) {
      projects[index] = currentProject;
      localStorage.setItem(
        "dreamStoryProjects",
        JSON.stringify(projects)
      );
    }
  }

  sceneContent.style.backgroundImage = `url("${url}")`;
  sceneContent.style.backgroundRepeat = "no-repeat";
  applyBackgroundTransform();

  const placeholder = document.querySelector(".stage-placeholder");
  if (placeholder) placeholder.hidden = true;
}

function addBackgroundToLibrary(asset) {
  const url = URL.createObjectURL(asset.file);
  backgroundUrls.push({ id: asset.id, url });

  const item = document.createElement("button");
  item.type = "button";
  item.textContent = asset.name;
  item.title = "คลิกเพื่อใช้ภาพนี้";
  item.style.width = "100%";
  item.style.marginBottom = "8px";

  item.addEventListener("click", () => {
    showBackground(url, asset.id);
  });

  const row = document.createElement("div");
  row.className = "background-library-row";

  item.classList.add("background-library-select");

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "background-library-delete";
  deleteButton.textContent = "🗑️";
  deleteButton.title = "ลบภาพนี้ออกจากคลัง";

  deleteButton.addEventListener("click", async () => {
    await deleteBackgroundFromLibrary(asset.id, asset.name, row);
  });

  row.append(item, deleteButton);
  backgroundLibrary.appendChild(row);

  return url;
}

async function loadSavedBackgrounds() {
  if (!currentProject) return;

  try {
    const assets = await getProjectAssets(currentProject.id);

    backgroundLibrary.replaceChildren();

    for (const asset of assets) {
      if (asset.type !== "background") continue;
      addBackgroundToLibrary(asset);
    }

    const selected = assets.find(
      asset => asset.id === currentProject.selectedBackgroundId &&
               asset.type === "background"
    );

    if (selected) {
      const url = backgroundUrls.find(
        entry => entry.id === selected.id
      );

      if (url) showBackground(url.url);
    }

    console.log("โหลดคลังฉากหลังสำเร็จ");
  } catch (error) {
    console.error("โหลดคลังฉากหลังไม่สำเร็จ:", error);
    alert("ไม่สามารถโหลดคลังฉากหลังได้");
  }
}

addBackgroundButton.addEventListener("click", () => {
  if (!currentProject) {
    alert("กรุณาเปิดโปรเจกต์ก่อน");
    return;
  }

  backgroundFileInput.click();
});


// Convert HEIC/HEIF to JPEG before saving to IndexedDB.
async function prepareImageFile(file) {
  const isHeif = ["image/heic", "image/heif"].includes(file.type.toLowerCase())
    || /\.(heic|heif)$/i.test(file.name);

  if (!isHeif) return file;

  if (typeof heic2any !== "function") {
    throw new Error("ไม่พบระบบแปลง HEIC/HEIF");
  }

  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.85
  });

  const blob = Array.isArray(converted) ? converted[0] : converted;

  if (!blob) {
    throw new Error("ไม่สามารถแปลงไฟล์ HEIC/HEIF ได้");
  }

  const name = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";

  return new File([blob], name, {
    type: "image/jpeg",
    lastModified: Date.now()
  });
}

backgroundFileInput.addEventListener("change", async () => {
  const file = backgroundFileInput.files[0];
  if (!file || !currentProject) return;

  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"];

  if (!allowedTypes.includes(file.type)) {
    alert("รองรับไฟล์ PNG, JPG, JPEG, WebP, HEIC และ HEIF");
    backgroundFileInput.value = "";
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert("กรุณาเลือกภาพขนาดไม่เกิน 10 MB");
    backgroundFileInput.value = "";
    return;
  }

  let preparedFile;
  try {
    preparedFile = await prepareImageFile(file);
  } catch (error) {
    console.error("แปลงภาพไม่สำเร็จ:", error);
    alert("ไม่สามารถแปลงภาพได้: " + (error?.message || error));
    return;
  }

  const asset = {
    id: crypto.randomUUID(),
    projectId: currentProject.id,
    type: "background",
    name: preparedFile.name,
    file: preparedFile,
    createdAt: new Date().toISOString()
  };

  try {
    try {
      await saveAsset(asset);
    } catch (error) {
      console.error("บันทึกภาพลง IndexedDB ไม่สำเร็จ:", error);
      alert("บันทึกไฟล์ภาพไม่สำเร็จ: " + (error?.message || error));
      return;
    }

    try {
      const url = addBackgroundToLibrary(asset);
      showBackground(url, asset.id);
      console.log("บันทึกและแสดงฉากหลังสำเร็จ:", asset.name);
    } catch (error) {
      console.error("บันทึกภาพแล้ว แต่แสดงภาพไม่สำเร็จ:", error);
      alert("บันทึกภาพแล้ว แต่แสดงภาพไม่สำเร็จ กรุณาลองเปิดโปรเจกต์อีกครั้ง");
    }
  } finally {
    backgroundFileInput.value = "";
  }
});

// โหลดภาพที่เคยบันทึกเมื่อเปิด Editor
loadSavedBackgrounds();

// คืนหน่วยความจำเมื่อปิดหน้า Editor
window.addEventListener("pagehide", () => {
  for (const entry of backgroundUrls) {
    URL.revokeObjectURL(entry.url);
  }
});

// ===== ระบบคลังตัวละคร =====
const addCharacterButton = document.getElementById("addCharacter");
const characterFileInput = document.getElementById("characterFileInput");
const characterLibrary = document.getElementById("characterLibrary");

const characterUrls = [];

function addCharacterToLibrary(asset) {
  const url = URL.createObjectURL(asset.file);
  characterUrls.push(url);

  const item = document.createElement("button");
  item.type = "button";
  item.title = asset.name;
  item.style.display = "flex";
  item.style.alignItems = "center";
  item.style.gap = "10px";
  item.style.width = "100%";
  item.style.marginBottom = "8px";
  item.style.textAlign = "left";

  const thumbnail = document.createElement("img");
  thumbnail.src = url;
  thumbnail.alt = asset.name;
  thumbnail.style.width = "45px";
  thumbnail.style.height = "60px";
  thumbnail.style.objectFit = "contain";

  const name = document.createElement("span");
  name.textContent = asset.name;
  name.style.overflowWrap = "anywhere";

  item.append(thumbnail, name);

  // คลิกตัวละครในคลังเพื่อวางลงบนฉาก
  item.addEventListener("click", () => {
    placeCharacterOnStage(url, asset.name, asset.id);
  });

  // เพิ่มปุ่มลบตัวละครจากคลัง
  const row = document.createElement("div");
  row.className = "character-library-row";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "character-library-delete";
  deleteButton.textContent = "🗑️";
  deleteButton.title = "ลบตัวละครออกจากคลังถาวร";

  deleteButton.addEventListener("click", async (event) => {
    event.stopPropagation();
    await deleteCharacterFromLibrary(asset.id, asset.name, row);
  });

  row.appendChild(item);
  row.appendChild(deleteButton);
  characterLibrary.appendChild(row);
}

async function loadSavedCharacters() {
  if (!currentProject) return;

  try {
    const assets = await getProjectAssets(currentProject.id);

    characterLibrary.replaceChildren();

    for (const asset of assets) {
      if (asset.type === "character") {
        addCharacterToLibrary(asset);
      }
    }

    console.log("โหลดคลังตัวละครสำเร็จ");
  } catch (error) {
    console.error(error);
    alert("ไม่สามารถโหลดคลังตัวละครได้");
  }
}

addCharacterButton.addEventListener("click", () => {
  if (!currentProject) {
    alert("กรุณาเปิดโปรเจกต์ก่อนเพิ่มตัวละคร");
    return;
  }

  characterFileInput.click();
});

characterFileInput.addEventListener("change", async () => {
  const file = characterFileInput.files[0];
  if (!file || !currentProject) return;

  if (!["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"].includes(file.type)) {
    alert("รองรับภาพตัวละคร PNG, JPG, JPEG, WebP, HEIC และ HEIF");
    characterFileInput.value = "";
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert("ไฟล์ตัวละครต้องมีขนาดไม่เกิน 10 MB");
    characterFileInput.value = "";
    return;
  }

  let preparedFile;
  try {
    preparedFile = await prepareImageFile(file);
  } catch (error) {
    console.error("แปลงภาพไม่สำเร็จ:", error);
    alert("ไม่สามารถแปลงภาพได้: " + (error?.message || error));
    return;
  }

  const asset = {
    id: crypto.randomUUID(),
    projectId: currentProject.id,
    type: "character",
    name: preparedFile.name,
    file: preparedFile,
    createdAt: new Date().toISOString()
  };

  try {
    await saveAsset(asset);
    addCharacterToLibrary(asset);
    console.log("บันทึกตัวละครสำเร็จ:", asset.name);
  } catch (error) {
    console.error(error);
    alert("ไม่สามารถบันทึกตัวละครได้");
  } finally {
    characterFileInput.value = "";
  }
});


// โหลดตัวละครและตำแหน่งที่บันทึกไว้กลับมาบนฉาก
async function restoreSceneCharacters() {
  if (!currentProject) return;

  const savedCharacters = currentProject.sceneCharacters || [];

  if (savedCharacters.length === 0) return;

  try {
    const assets = await getProjectAssets(currentProject.id);

    for (const saved of savedCharacters) {
      const asset = assets.find(
        item => item.id === saved.assetId &&
                item.type === "character"
      );

      if (!asset) continue;

      const url = characterUrls.find(
        item => item.assetId === asset.id
      );

      // ใช้ไฟล์ภาพจากฐานข้อมูลโดยตรง
      const imageUrl = URL.createObjectURL(asset.file);
      characterUrls.push(imageUrl);

      placeCharacterOnStage(imageUrl, asset.name, asset.id, false);

      const characters = document.querySelectorAll(
        "#characterLayer img"
      );

      const character = characters[characters.length - 1];

      if (!character) continue;

      character.style.transform = "none";
      character.style.bottom = "auto";
      character.style.left = saved.x || "0px";
      character.style.top = saved.y || "0px";
      character.style.width = saved.width || "45%";
      character.style.height = saved.height || "80%";
    }

    console.log("กู้คืนตำแหน่งตัวละครสำเร็จ");
  } catch (error) {
    console.error("กู้คืนตำแหน่งตัวละครไม่สำเร็จ:", error);
  }
}

// โหลดตัวละครที่บันทึกไว้เมื่อเปิด Editor
loadSavedCharacters();

// คืนหน่วยความจำเมื่อปิดหน้าเว็บ
window.addEventListener("pagehide", () => {
  for (const url of characterUrls) {
    URL.revokeObjectURL(url);
  }
});



// บันทึกข้อมูลตัวละครที่วางบนฉาก
function saveSceneCharacters() {
  if (!currentProject) return;

  const characters = [];

  document.querySelectorAll("#characterLayer img").forEach((img) => {
    characters.push({
      assetId: img.dataset.assetId,
      x: img.style.left,
      y: img.style.top,
      width: img.style.width,
      height: img.style.height
    });
  });

  currentProject.sceneCharacters = characters;
  saveCurrentSceneData();

  const projects = JSON.parse(
    localStorage.getItem("dreamStoryProjects") || "[]"
  );

  const index = projects.findIndex(
    project => project.id === currentProject.id
  );

  if (index === -1) return;

  projects[index] = currentProject;

  localStorage.setItem(
    "dreamStoryProjects",
    JSON.stringify(projects)
  );

  console.log("บันทึกตำแหน่งตัวละครสำเร็จ");
}


// ===== ระบบเลือกตัวละครและปรับขนาด =====
const characterSizeSlider = document.getElementById("characterSize");
const characterSizeValue = document.getElementById("characterSizeValue");

let selectedStageCharacter = null;

const removeStageCharacterButton =
  document.getElementById("removeStageCharacter");

function removeSelectedStageCharacter() {
  if (!selectedStageCharacter) return;

  selectedStageCharacter.remove();
  selectedStageCharacter = null;

  characterSizeSlider.disabled = true;
  characterSizeSlider.value = 45;
  characterSizeValue.textContent = "45%";

  removeStageCharacterButton.disabled = true;

  // บันทึกฉากหลังจากลบตัวละคร
  saveSceneCharacters();

  console.log("ลบตัวละครออกจากฉากสำเร็จ");
}

removeStageCharacterButton.addEventListener(
  "click",
  removeSelectedStageCharacter
);


function selectStageCharacter(character) {
  if (selectedStageCharacter) {
    selectedStageCharacter.style.outline = "none";
  }

  selectedStageCharacter = character;

  character.style.outline = "2px dashed #a78bfa";

  const size = parseFloat(character.style.width) || 45;

  characterSizeSlider.value = size;
  characterSizeValue.textContent = Math.round(size) + "%";
  characterSizeSlider.disabled = false;
  removeStageCharacterButton.disabled = false;
}

characterSizeSlider.addEventListener("input", () => {
  if (!selectedStageCharacter) return;

  const size = Number(characterSizeSlider.value);

  selectedStageCharacter.style.width = size + "%";
  selectedStageCharacter.style.height = "auto";
  selectedStageCharacter.style.maxHeight = "none";
  characterSizeValue.textContent = size + "%";

  // ปรับตำแหน่งไม่ให้ตัวละครล้นขอบฉาก
  const character = selectedStageCharacter;
  const layer = document.getElementById("characterLayer");

  if (layer) {
    const currentX = character.offsetLeft;
    const currentY = character.offsetTop;

    const rect = layer.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      character.style.left = (currentX / rect.width * 100) + "%";
      character.style.top = (currentY / rect.height * 100) + "%";
    }
    character.style.bottom = "auto";
    character.style.transform = "none";
  }
});

characterSizeSlider.addEventListener("change", () => {
  if (!selectedStageCharacter) return;

  saveSceneCharacters();
});

function placeCharacterOnStage(url, name, assetId, shouldSave = true) {
  if (!currentProject) return;

  let characterLayer = document.getElementById("characterLayer");

  if (!characterLayer) {
    characterLayer = document.createElement("div");
    characterLayer.id = "characterLayer";

    characterLayer.style.position = "absolute";
    characterLayer.style.inset = "0";
    characterLayer.style.pointerEvents = "none";
    characterLayer.style.zIndex = "2";

    sceneContent.style.position = "relative";
    sceneContent.appendChild(characterLayer);
  }

  const character = document.createElement("img");
  character.src = url;
  character.alt = name;
  character.dataset.assetId = assetId;

  character.style.position = "absolute";
  character.style.left = "50%";
  character.style.bottom = "0";
  character.style.transform = "translateX(-50%)";
  character.style.width = "45%";
  character.style.height = "80%";
  character.style.objectFit = "contain";
  character.style.pointerEvents = "auto";
  character.style.touchAction = "none";
  character.style.cursor = "grab";
  character.draggable = false;

  character.addEventListener("pointerdown", () => {
    selectStageCharacter(character);
  });

  characterLayer.appendChild(character);
  if (shouldSave) saveSceneCharacters();

  // ลากตัวละครด้วยเมาส์หรือหน้าจอสัมผัส
  character.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;

    event.preventDefault();

    const parentRect = characterLayer.getBoundingClientRect();
    const imageRect = character.getBoundingClientRect();

    const offsetX = event.clientX - imageRect.left;
    const offsetY = event.clientY - imageRect.top;

    character.style.left =
      ((imageRect.left - parentRect.left) / parentRect.width * 100) + "%";
    character.style.top =
      ((imageRect.top - parentRect.top) / parentRect.height * 100) + "%";
    character.style.bottom = "auto";
    character.style.transform = "none";
    character.style.cursor = "grabbing";

    character.setPointerCapture(event.pointerId);

    function moveCharacter(moveEvent) {
      if (moveEvent.pointerId !== event.pointerId) return;

      const rect = characterLayer.getBoundingClientRect();

      const x = moveEvent.clientX - rect.left - offsetX;
      const y = moveEvent.clientY - rect.top - offsetY;

      // ใช้พิกัดสัมพันธ์กับขนาดฉาก รองรับตำแหน่งนอกขอบ
      if (rect.width > 0 && rect.height > 0) {
        character.style.left = (x / rect.width * 100) + "%";
        character.style.top = (y / rect.height * 100) + "%";
      }
    }

    function stopDragging(endEvent) {
      if (endEvent.pointerId !== event.pointerId) return;

      character.style.cursor = "grab";
      saveSceneCharacters();
      window.removeEventListener("pointermove", moveCharacter);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    }

    window.addEventListener("pointermove", moveCharacter);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
  });

  console.log("วางตัวละครลงฉาก:", name);
}

// กู้คืนตัวละครหลังเปิดโปรเจกต์
restoreSceneCharacters();



// ===== Dream Story Multi Dialogue V1 =====

const speakerInput = document.getElementById("speakerInput");
const dialogueInput = document.getElementById("dialogueInput");
const speakerPreview = document.getElementById("speakerPreview");
const textPreview = document.getElementById("textPreview");
const testDialogueButton = document.getElementById("testDialogue");
const stopDialogueButton = document.getElementById("stopDialogue");
const addDialogueButton = document.getElementById("addDialogue");

let dialogueEntries = [];
let selectedDialogueIndex = 0;
let dialogueTimer = null;
let dialoguePlaying = false;
let dialogueComplete = false;
let playingDialogueIndex = 0;

const dialogueList = document.createElement("div");
dialogueList.id = "dialogueEntryList";
dialogueList.className = "dialogue-entry-list";

addDialogueButton.insertAdjacentElement("afterend", dialogueList);

function persistDialogueEntries() {
  if (!currentProject) return;

  currentProject.dialogueEntries = dialogueEntries;
  saveCurrentSceneData();

  const projects = JSON.parse(
    localStorage.getItem("dreamStoryProjects") || "[]"
  );

  const index = projects.findIndex(
    project => project.id === currentProject.id
  );

  if (index < 0) return;

  projects[index] = currentProject;

  localStorage.setItem(
    "dreamStoryProjects",
    JSON.stringify(projects)
  );
}

function updateDialoguePreview() {
  if (dialoguePlaying) return;

  speakerPreview.textContent =
    speakerInput.value || "ชื่อตัวละคร";

  textPreview.textContent =
    dialogueInput.value || "บทสนทนาจะแสดงตรงนี้";
}

function renderDialogueList() {
  dialogueList.replaceChildren();

  dialogueEntries.forEach((entry, index) => {
    const row = document.createElement("div");
    row.className = "dialogue-entry";

    if (index === selectedDialogueIndex) {
      row.classList.add("selected");
    }

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "dialogue-select";

    const speaker = entry.speaker || "ผู้บรรยาย";
    const preview = entry.text || "(ยังไม่มีข้อความ)";

    selectButton.textContent =
      `${index + 1}. ${speaker}: ${preview.slice(0, 40)}`;

    selectButton.addEventListener("click", () => {
      selectDialogue(index);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "dialogue-delete";
    deleteButton.textContent = "ลบ";

    deleteButton.addEventListener("click", () => {
      deleteDialogue(index);
    });

    // DS_AUDIO_V11_PATCH: attach one-shot SFX to this dialogue line.
    if (window.DS_audioChoices) {
      const audioSelect = window.DS_audioChoices(entry.audioSfxId || '', '🔔 เสียงเมื่อถึงบรรทัด');
      audioSelect.title = 'เสียงดังครั้งเดียวเมื่อบทสนทนาบรรทัดนี้เริ่ม';
      audioSelect.addEventListener('change', () => {
        entry.audioSfxId = audioSelect.value;
        persistDialogueEntries();
      });
      row.append(audioSelect);
    }
    row.append(selectButton, deleteButton);
    dialogueList.appendChild(row);
  });
}

function selectDialogue(index) {
  if (dialoguePlaying) return;

  selectedDialogueIndex = index;

  const entry = dialogueEntries[index];

  if (!entry) return;

  speakerInput.value = entry.speaker || "";
  dialogueInput.value = entry.text || "";

  renderDialogueList();
  updateDialoguePreview();
}

function saveDialogue() {
  if (dialoguePlaying) return;

  if (!dialogueEntries[selectedDialogueIndex]) return;

  dialogueEntries[selectedDialogueIndex] = {
    ...dialogueEntries[selectedDialogueIndex],
    speaker: speakerInput.value,
    text: dialogueInput.value
  };

  persistDialogueEntries();
  renderDialogueList();
  updateDialoguePreview();
}

function addDialogue() {
  if (dialoguePlaying) return;

  dialogueEntries.push({
    speaker: "",
    text: ""
  });

  selectedDialogueIndex = dialogueEntries.length - 1;

  persistDialogueEntries();
  selectDialogue(selectedDialogueIndex);
}

function deleteDialogue(index) {
  if (dialoguePlaying) return;

  if (dialogueEntries.length <= 1) {
    dialogueEntries = [{ speaker: "", text: "" }];
    selectedDialogueIndex = 0;
  } else {
    dialogueEntries.splice(index, 1);

    if (selectedDialogueIndex >= dialogueEntries.length) {
      selectedDialogueIndex = dialogueEntries.length - 1;
    } else if (index < selectedDialogueIndex) {
      selectedDialogueIndex -= 1;
    }
  }

  persistDialogueEntries();
  selectDialogue(selectedDialogueIndex);
}

function restoreDialogueInputs() {
  if (!currentProject) return;

  if (
    Array.isArray(currentProject.dialogueEntries) &&
    currentProject.dialogueEntries.length > 0
  ) {
    dialogueEntries = currentProject.dialogueEntries;
  } else {
    const old = currentProject.dialogue || {};

    dialogueEntries = [{
      speaker: old.speaker || "",
      text: old.text || ""
    }];

    persistDialogueEntries();
  }

  selectedDialogueIndex = 0;
  selectDialogue(0);
}

speakerInput.addEventListener("input", saveDialogue);
dialogueInput.addEventListener("input", saveDialogue);
addDialogueButton.addEventListener("click", addDialogue);

function stopDialogueTimer() {
  if (dialogueTimer !== null) {
    clearInterval(dialogueTimer);
    dialogueTimer = null;
  }
}

function showPlayingDialogue() {
  stopDialogueTimer();

  const entry = dialogueEntries[playingDialogueIndex];

  if (!entry) {
    stopDialoguePreview();
    return;
  }

  dialogueComplete = false;

  speakerPreview.textContent =
    entry.speaker || "ผู้บรรยาย";

  textPreview.textContent = "";

  const letters = Array.from(entry.text || "");

  if (letters.length === 0) {
    dialogueComplete = true;
    return;
  }

  let index = 0;

  dialogueTimer = setInterval(() => {
    index += 1;

    textPreview.textContent =
      letters.slice(0, index).join("");

    if (index >= letters.length) {
      stopDialogueTimer();
      dialogueComplete = true;
    }
  }, 35);
}

function finishDialogueTyping() {
  stopDialogueTimer();

  const entry = dialogueEntries[playingDialogueIndex];

  textPreview.textContent = entry ? entry.text : "";
  dialogueComplete = true;
}

function startDialoguePreview() {
  if (!currentProject) return;
  hideGameEnding();
  hideGameChoices();

  dialoguePlaying = true;
  playingDialogueIndex = 0;

  speakerInput.disabled = true;
  dialogueInput.disabled = true;
  addDialogueButton.disabled = true;

  testDialogueButton.disabled = true;
  stopDialogueButton.disabled = false;

  renderDialogueList();
  showPlayingDialogue();
}

function stopDialoguePreview() {
  hideGameEnding();
  hideGameChoices();
  stopDialogueTimer();

  dialoguePlaying = false;
  dialogueComplete = false;

  speakerInput.disabled = false;
  dialogueInput.disabled = false;
  addDialogueButton.disabled = false;

  testDialogueButton.disabled = false;
  stopDialogueButton.disabled = true;

  selectDialogue(selectedDialogueIndex);
}

testDialogueButton.addEventListener(
  "click",
  startDialoguePreview
);

stopDialogueButton.addEventListener(
  "click",
  stopDialoguePreview
);

document.querySelector(".dialogue-preview")
  .addEventListener("click", () => {
    if (!dialoguePlaying) return;

    if (!dialogueComplete) {
      finishDialogueTyping();
      return;
    }

    playingDialogueIndex += 1;

    if (playingDialogueIndex >= dialogueEntries.length) {
      const activeScene = getActiveScene();

      if (activeScene && activeScene.isEnding) {
        showGameEnding();
      } else if (sceneChoices.length > 0) {
        showGameChoices();
      } else {
        stopDialoguePreview();
      }
      return;
    }

    showPlayingDialogue();
  });

restoreDialogueInputs();


// ===== Dream Story Multi Scene V1 =====

const addSceneButton =
  document.getElementById("addSceneButton");

const renameSceneButton =
  document.getElementById("renameSceneButton");

const deleteSceneButton =
  document.getElementById("deleteSceneButton");

const sceneTimelineList =
  document.getElementById("sceneTimelineList");

let activeSceneId = null;
var sceneSwitching = false;

function saveProjectRecord() {
  if (!currentProject) return;

  const projects = JSON.parse(
    localStorage.getItem("dreamStoryProjects") || "[]"
  );

  const index = projects.findIndex(
    item => item.id === currentProject.id
  );

  if (index < 0) return;

  projects[index] = currentProject;

  localStorage.setItem(
    "dreamStoryProjects",
    JSON.stringify(projects)
  );
}

function createScene(name) {
  return {
    id: "scene-" + Date.now() + "-" +
      Math.random().toString(36).slice(2, 9),
    name,
    backgroundId: null,
    characters: [],
    choices: [],
    isEnding: false,
    endingTitle: "",
    dialogues: [
      { speaker: "", text: "" }
    ]
  };
}

function getActiveScene() {
  if (!currentProject || !currentProject.scenes) {
    return null;
  }

  return currentProject.scenes.find(
    scene => scene.id === activeSceneId
  ) || null;
}

function saveCurrentSceneData() {
  if (sceneSwitching || !currentProject) return;

  const scene = getActiveScene();

  if (!scene) return;

  scene.backgroundId =
    currentProject.selectedBackgroundId || null;

  scene.backgroundTransform =
    JSON.parse(JSON.stringify(
      currentProject.backgroundTransform ||
      { x: 50, y: 50, zoom: 100 }
    ));

  scene.characters =
    JSON.parse(JSON.stringify(
      currentProject.sceneCharacters || []
    ));

  scene.dialogues =
    JSON.parse(JSON.stringify(
      currentProject.dialogueEntries || []
    ));

  if (typeof sceneChoices !== "undefined") {
    scene.choices = JSON.parse(
      JSON.stringify(sceneChoices)
    );
  }

  saveProjectRecord();
}

function initializeScenes() {
  if (!currentProject) return;

  if (
    !Array.isArray(currentProject.scenes) ||
    currentProject.scenes.length === 0
  ) {
    const firstScene = createScene("ฉากที่ 1");

    firstScene.backgroundId =
      currentProject.selectedBackgroundId || null;

    firstScene.characters =
      JSON.parse(JSON.stringify(
        currentProject.sceneCharacters || []
      ));

    firstScene.dialogues =
      JSON.parse(JSON.stringify(
        currentProject.dialogueEntries || [
          { speaker: "", text: "" }
        ]
      ));

    currentProject.scenes = [firstScene];
    currentProject.activeSceneId = firstScene.id;

    saveProjectRecord();
  }

  activeSceneId =
    currentProject.activeSceneId ||
    currentProject.scenes[0].id;

  renderSceneTimeline();
}

function renderSceneTimeline() {
  if (!currentProject) return;

  sceneTimelineList.replaceChildren();

  currentProject.scenes.forEach((scene, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "scene-timeline-item";

    if (scene.id === activeSceneId) {
      button.classList.add("active");
    }

    button.textContent =
      `${index + 1}. ${scene.name}`;

    button.addEventListener("click", () => {
      switchToScene(scene.id);
    });

    sceneTimelineList.appendChild(button);
  });

  deleteSceneButton.disabled =
    currentProject.scenes.length <= 1;
}

async function switchToScene(sceneId, keepPlaying = false) {
  if (!currentProject || sceneSwitching) return;

  const target = currentProject.scenes.find(
    scene => scene.id === sceneId
  );

  if (!target) return;

  // บันทึกฉากเดิมก่อนสลับ
  saveCurrentSceneData();

  sceneSwitching = true;

  try {
    if (!keepPlaying) {
      stopDialoguePreview();
    } else {
      stopDialogueTimer();
    }

    activeSceneId = target.id;
    currentProject.activeSceneId = target.id;

    currentProject.selectedBackgroundId =
      target.backgroundId || null;

    currentProject.backgroundTransform =
      JSON.parse(JSON.stringify(
        target.backgroundTransform ||
        { x: 50, y: 50, zoom: 100 }
      ));

    currentProject.sceneCharacters =
      JSON.parse(JSON.stringify(
        target.characters || []
      ));

    currentProject.dialogueEntries =
      JSON.parse(JSON.stringify(
        target.dialogues || [
          { speaker: "", text: "" }
        ]
      ));

    // ล้างตัวละครบนฉากเดิม
    const layer = document.getElementById("characterLayer");

    if (layer) {
      layer.remove();
    }

    selectedStageCharacter = null;
    removeStageCharacterButton.disabled = true;
    characterSizeSlider.disabled = true;
    characterSizeSlider.value = 45;
    characterSizeValue.textContent = "45%";

    // ล้างฉากหลังเดิม
    sceneContent.style.backgroundImage = "none";

    const placeholder =
      document.querySelector(".stage-placeholder");

    if (placeholder) placeholder.hidden = false;

    // โหลดฉากหลังของฉากใหม่
    if (target.backgroundId) {
      const savedBackground = backgroundUrls.find(
        item => item.id === target.backgroundId
      );

      if (savedBackground) {
        showBackground(savedBackground.url);
      } else {
        const assets = await getProjectAssets(
          currentProject.id
        );

        const asset = assets.find(
          item => item.id === target.backgroundId
        );

        if (asset) {
          const url = URL.createObjectURL(asset.file);
          backgroundUrls.push({
            id: asset.id,
            url
          });
          showBackground(url);
        }
      }
    }

    // โหลดตัวละครของฉากใหม่
    await restoreSceneCharacters();

    // โหลดบทสนทนาของฉากใหม่
    dialogueEntries =
      JSON.parse(JSON.stringify(
        target.dialogues || [
          { speaker: "", text: "" }
        ]
      ));

    selectedDialogueIndex = 0;
    selectDialogue(0);

    loadChoicesForScene(target);
    loadEndingSettings(target);

    saveProjectRecord();
    renderSceneTimeline();

  } catch (error) {
    console.error("เปลี่ยนฉากไม่สำเร็จ:", error);
    alert("เกิดข้อผิดพลาดขณะเปลี่ยนฉาก");
  } finally {
    sceneSwitching = false;
  }
}

addSceneButton.addEventListener("click", async () => {
  if (!currentProject || sceneSwitching) return;

  saveCurrentSceneData();

  const scene = createScene(
    "ฉากที่ " + (currentProject.scenes.length + 1)
  );

  currentProject.scenes.push(scene);
  saveProjectRecord();

  await switchToScene(scene.id);
});

renameSceneButton.addEventListener("click", () => {
  const scene = getActiveScene();
  if (!scene) return;

  const name = prompt("ตั้งชื่อฉาก", scene.name);

  if (name === null || !name.trim()) return;

  scene.name = name.trim();
  saveProjectRecord();
  renderSceneTimeline();
});

deleteSceneButton.addEventListener("click", async () => {
  if (!currentProject || sceneSwitching) return;

  if (currentProject.scenes.length <= 1) {
    alert("ต้องมีอย่างน้อย 1 ฉาก");
    return;
  }

  const scene = getActiveScene();
  if (!scene) return;

  if (!confirm(`ลบฉาก "${scene.name}" หรือไม่?`)) {
    return;
  }

  currentProject.scenes =
    currentProject.scenes.filter(
      item => item.id !== scene.id
    );

  activeSceneId = null;

  const nextScene = currentProject.scenes[0];

  currentProject.activeSceneId = nextScene.id;

  saveProjectRecord();
  await switchToScene(nextScene.id);
});

let sceneChoices = [];




// ===== Dream Story Branching Choices V1 =====

const addChoiceButton =
  document.getElementById("addChoiceButton");



const gameChoices =
  document.getElementById("gameChoices");



function persistSceneChoices() {
  if (!currentProject || sceneSwitching) return;

  const scene = getActiveScene();
  if (!scene) return;

  scene.choices = JSON.parse(
    JSON.stringify(sceneChoices)
  );

  saveProjectRecord();
}

function renderChoiceEditor() {
  choiceEditorList.replaceChildren();

  sceneChoices.forEach((choice, index) => {
    const row = document.createElement("div");
    row.className = "choice-editor-row";

    const label = document.createElement("input");
    label.type = "text";
    label.placeholder = "ข้อความตัวเลือก";
    label.value = choice.text || "";

    label.addEventListener("input", () => {
      choice.text = label.value;
      persistSceneChoices();
    });

    const destination = document.createElement("select");

    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "-- เลือกฉากปลายทาง --";
    destination.appendChild(empty);

    currentProject.scenes.forEach(scene => {
      const option = document.createElement("option");
      option.value = scene.id;
      option.textContent = scene.name;
      destination.appendChild(option);
    });

    destination.value = choice.targetSceneId || "";

    destination.addEventListener("change", () => {
      choice.targetSceneId = destination.value;
      persistSceneChoices();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "ลบตัวเลือก";

    remove.addEventListener("click", () => {
      sceneChoices.splice(index, 1);
      persistSceneChoices();
      renderChoiceEditor();
    });

    // DS_AUDIO_V11_PATCH: optional SFX on selecting a choice.
    if (window.DS_audioChoices) {
      const audioSelect = window.DS_audioChoices(choice.audioSfxId || '', '🔔 เสียงเมื่อเลือก');
      audioSelect.addEventListener('change', () => {
        choice.audioSfxId = audioSelect.value;
        persistSceneChoices();
      });
      row.append(audioSelect);
    }
    row.append(label, destination, remove);
    choiceEditorList.appendChild(row);
  });
}

function loadChoicesForScene(scene) {
  if (!scene) return;
  sceneChoices = JSON.parse(
    JSON.stringify(scene.choices || [])
  );

  renderChoiceEditor();
}

addChoiceButton.addEventListener("click", () => {
  if (!currentProject || sceneSwitching) return;

  sceneChoices.push({
    text: "",
    targetSceneId: ""
  });

  persistSceneChoices();
  renderChoiceEditor();
});

function hideGameChoices() {
  gameChoices.hidden = true;
  gameChoices.replaceChildren();
}

function showGameChoices() {
  stopDialogueTimer();

  gameChoices.replaceChildren();

  sceneChoices.forEach(choice => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = choice.text || "ตัวเลือก";

    button.addEventListener("click", async () => {
      if (!choice.targetSceneId) {
        alert("ยังไม่ได้กำหนดฉากปลายทาง");
        return;
      }

      const target = currentProject.scenes.find(
        scene => scene.id === choice.targetSceneId
      );

      if (!target) {
        alert("ไม่พบฉากปลายทาง");
        return;
      }

      hideGameChoices();

      await switchToScene(target.id, true);

      dialoguePlaying = true;
      playingDialogueIndex = 0;
      dialogueComplete = false;

      speakerInput.disabled = true;
      dialogueInput.disabled = true;
      addDialogueButton.disabled = true;

      testDialogueButton.disabled = true;
      stopDialogueButton.disabled = false;

      showPlayingDialogue();
    });

    gameChoices.appendChild(button);
  });

  gameChoices.hidden = false;
}




// ===== Dream Story Background Management V1 =====

const clearSceneBackgroundButton =
  document.getElementById("clearSceneBackground");

function clearCurrentSceneBackground() {
  if (!currentProject || sceneSwitching) return;

  currentProject.selectedBackgroundId = null;

  const scene = getActiveScene();
  if (scene) {
    scene.backgroundId = null;
  }

  sceneContent.style.backgroundImage = "none";

  const placeholder =
    document.querySelector(".stage-placeholder");

  if (placeholder) {
    placeholder.hidden = false;
  }

  saveCurrentSceneData();
  saveProjectRecord();
}

clearSceneBackgroundButton.addEventListener("click", () => {
  if (!currentProject) return;

  if (!currentProject.selectedBackgroundId) {
    alert("ฉากนี้ไม่มีภาพพื้นหลัง");
    return;
  }

  clearCurrentSceneBackground();
});

async function deleteBackgroundFromLibrary(
  assetId,
  assetName,
  row
) {
  if (!currentProject || sceneSwitching) return;

  const affectedScenes = currentProject.scenes.filter(
    scene => scene.backgroundId === assetId
  );

  const count = affectedScenes.length;

  const message =
    `ต้องการลบ "${assetName}" ออกจากคลังถาวรหรือไม่?\n\n` +
    `ภาพนี้ถูกใช้ใน ${count} ฉาก\n` +
    `หากลบ ภาพจะหายจากทุกฉากที่ใช้งาน`;

  if (!confirm(message)) return;

  try {
    // Delete from IndexedDB before updating project references.
    await deleteStudioAsset(assetId);

    currentProject.scenes.forEach(scene => {
      if (scene.backgroundId === assetId) {
        scene.backgroundId = null;
      }
    });

    if (currentProject.selectedBackgroundId === assetId) {
      currentProject.selectedBackgroundId = null;
      sceneContent.style.backgroundImage = "none";

      const placeholder =
        document.querySelector(".stage-placeholder");

      if (placeholder) {
        placeholder.hidden = false;
      }
    }

    const index = backgroundUrls.findIndex(
      entry => entry.id === assetId
    );

    if (index !== -1) {
      URL.revokeObjectURL(backgroundUrls[index].url);
      backgroundUrls.splice(index, 1);
    }

    row.remove();

    saveProjectRecord();

    alert("ลบภาพออกจากคลังเรียบร้อยแล้ว");
  } catch (error) {
    console.error("ลบภาพไม่สำเร็จ:", error);
    alert("ลบภาพไม่สำเร็จ กรุณาตรวจสอบ Console");
  }
}

// ===== Background Delete Fix 46.5.1 =====

async function deleteStudioAsset(assetId) {
  const db = await openStudioDatabase();

  return new Promise((resolve, reject) => {
    let error = null;

    const transaction = db.transaction(
      "assets",
      "readwrite"
    );

    const store = transaction.objectStore("assets");

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      error = transaction.error;
    };

    transaction.onabort = () => {
      db.close();
      reject(error || transaction.error);
    };

    store.delete(assetId);
  });
}



// ===== Dream Story Endings V1 =====

const isEndingSceneInput =
  document.getElementById("isEndingScene");

const endingTitleInput =
  document.getElementById("endingTitle");



const gameEndingTitle =
  document.getElementById("gameEndingTitle");

const restartGameButton =
  document.getElementById("restartGameButton");

const exitEndingButton =
  document.getElementById("exitEndingButton");

function loadEndingSettings(scene) {
  const isEnding = Boolean(scene && scene.isEnding);

  isEndingSceneInput.checked = isEnding;
  endingTitleInput.disabled = !isEnding;

  endingTitleInput.value =
    scene && scene.endingTitle
      ? scene.endingTitle
      : "";
}

function saveEndingSettings() {
  if (!currentProject || sceneSwitching) return;

  const scene = getActiveScene();
  if (!scene) return;

  scene.isEnding = isEndingSceneInput.checked;
  scene.endingTitle = endingTitleInput.value.trim();

  endingTitleInput.disabled = !scene.isEnding;

  saveProjectRecord();
}

isEndingSceneInput.addEventListener(
  "change",
  saveEndingSettings
);

endingTitleInput.addEventListener(
  "input",
  saveEndingSettings
);

function hideGameEnding() {
  gameEnding.hidden = true;
}

function showGameEnding() {
  const scene = getActiveScene();
  if (!scene) return;

  stopDialogueTimer();
  hideGameChoices();

  gameEndingTitle.textContent =
    scene.endingTitle || "จบเรื่องราว";

  gameEnding.hidden = false;
}

restartGameButton.addEventListener(
  "click",
  async () => {
    if (!currentProject || sceneSwitching) return;

    const firstScene = currentProject.scenes[0];
    if (!firstScene) return;

    hideGameEnding();

    // ออกจากโหมดเล่นก่อน เพื่อคืนค่าตัวแก้ไข
    stopDialoguePreview();

    await switchToScene(firstScene.id);

    // เริ่มเล่นใหม่จากฉากแรก
    startDialoguePreview();
  }
);

exitEndingButton.addEventListener(
  "click",
  () => {
    stopDialoguePreview();
  }
);

if (currentProject) {
  loadEndingSettings(getActiveScene());
}


// ===== Dream Story Character Library Delete V1 =====

async function deleteCharacterFromLibrary(assetId, assetName, row) {
  if (!currentProject || sceneSwitching) return;

  // บันทึกฉากปัจจุบันก่อนตรวจสอบการใช้งาน
  saveCurrentSceneData();

  const affectedScenes = currentProject.scenes.filter(
    scene => (scene.characters || []).some(
      character => character.assetId === assetId
    )
  );

  const count = affectedScenes.length;

  const confirmed = confirm(
    `ต้องการลบตัวละคร "${assetName}" ออกจากคลังถาวรหรือไม่?\n\n` +
    `ตัวละครนี้ถูกใช้ใน ${count} ฉาก\n` +
    `หากลบ ตัวละครจะหายจากทุกฉากที่ใช้งาน`
  );

  if (!confirmed) return;

  try {
    // ลบไฟล์จาก IndexedDB
    await deleteStudioAsset(assetId);

    // ลบข้อมูลตัวละครจากทุกฉาก
    currentProject.scenes.forEach(scene => {
      scene.characters = (scene.characters || []).filter(
        character => character.assetId !== assetId
      );
    });

    // ลบจากข้อมูลฉากปัจจุบัน
    currentProject.sceneCharacters =
      (currentProject.sceneCharacters || []).filter(
        character => character.assetId !== assetId
      );

    // ลบตัวละครที่กำลังแสดงอยู่บนเวที
    document.querySelectorAll(
      "#characterLayer img"
    ).forEach(img => {
      if (img.dataset.assetId === assetId) {
        if (selectedStageCharacter === img) {
          selectedStageCharacter = null;
          characterSizeSlider.disabled = true;
          removeStageCharacterButton.disabled = true;
        }

        img.remove();
      }
    });

    row.remove();

    saveCurrentSceneData();
    saveProjectRecord();

    alert("✅ ลบตัวละครออกจากคลังเรียบร้อยแล้ว");

  } catch (error) {
    console.error("ลบตัวละครไม่สำเร็จ:", error);
    alert("❌ ลบตัวละครไม่สำเร็จ กรุณาตรวจสอบ Console");
  }
}


// ===== Dream Story Game Validator V1 =====

// V1.1.1: Validation DOM references initialized near the start of Editor.

function validateDreamStoryGame(project) {
  const errors = [];
  const warnings = [];

  const scenes = project.scenes || [];
  const sceneMap = new Map(scenes.map(scene => [scene.id, scene]));

  if (!scenes.length) {
    errors.push("โปรเจกต์ยังไม่มีฉาก");
    return { errors, warnings };
  }

  for (const scene of scenes) {
    const name = scene.name || "ฉากไม่มีชื่อ";
    const dialogues = scene.dialogues || [];
    const choices = scene.choices || [];

    const hasDialogue = dialogues.some(entry =>
      String(entry.text || "").trim() !== ""
    );

    if (!hasDialogue) {
      warnings.push(`"${name}" ไม่มีข้อความบทสนทนา`);
    }

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];

      if (!choice.targetSceneId) {
        errors.push(
          `"${name}" ตัวเลือกที่ ${i + 1} ยังไม่ได้กำหนดฉากปลายทาง`
        );
      } else if (!sceneMap.has(choice.targetSceneId)) {
        errors.push(
          `"${name}" ตัวเลือกที่ ${i + 1} เชื่อมไปยังฉากที่ไม่มีอยู่`
        );
      }

      if (!String(choice.text || "").trim()) {
        warnings.push(
          `"${name}" ตัวเลือกที่ ${i + 1} ยังไม่มีข้อความ`
        );
      }
    }

    if (!scene.isEnding && choices.length === 0) {
      warnings.push(
        `"${name}" ไม่มีทางไปต่อและไม่ได้กำหนดเป็นตอนจบ`
      );
    }

    if (scene.isEnding && choices.length > 0) {
      warnings.push(
        `"${name}" เป็นฉากจบ แต่ยังมีตัวเลือกที่ผู้เล่นจะไม่ได้ใช้`
      );
    }
  }

  // ตรวจสอบฉากที่ผู้เล่นสามารถเดินทางไปถึงได้
  const visited = new Set();
  const pending = [scenes[0].id];

  while (pending.length) {
    const id = pending.pop();

    if (visited.has(id)) continue;

    visited.add(id);

    const scene = sceneMap.get(id);
    if (!scene) continue;

    // เกมหยุดที่ฉากจบ จึงไม่เดินตามตัวเลือกต่อ
    if (scene.isEnding) continue;

    for (const choice of scene.choices || []) {
      if (sceneMap.has(choice.targetSceneId)) {
        pending.push(choice.targetSceneId);
      }
    }
  }

  for (const scene of scenes) {
    if (!visited.has(scene.id)) {
      warnings.push(
        `"${scene.name || "ฉากไม่มีชื่อ"}" ไม่สามารถเข้าถึงจากฉากแรก`
      );
    }
  }

  return { errors, warnings };
}

function renderGameValidation(result) {
  gameValidationResults.replaceChildren();

  const summary = document.createElement("p");
  summary.textContent =
    `ข้อผิดพลาด ${result.errors.length} รายการ | ` +
    `คำเตือน ${result.warnings.length} รายการ`;

  gameValidationResults.appendChild(summary);

  function addGroup(title, messages, className) {
    if (!messages.length) return;

    const heading = document.createElement("strong");
    heading.textContent = title;
    gameValidationResults.appendChild(heading);

    const list = document.createElement("ul");
    list.className = className;

    for (const message of messages) {
      const item = document.createElement("li");
      item.textContent = message;
      list.appendChild(item);
    }

    gameValidationResults.appendChild(list);
  }

  addGroup("❌ ข้อผิดพลาด", result.errors, "validation-errors");
  addGroup("⚠️ คำเตือน", result.warnings, "validation-warnings");

  if (!result.errors.length && !result.warnings.length) {
    const success = document.createElement("p");
    success.textContent = "✅ ไม่พบปัญหาจากรายการที่ตรวจสอบ";
    gameValidationResults.appendChild(success);
  }
}

validateGameButton.addEventListener("click", () => {
  if (!currentProject) return;

  saveCurrentSceneData();

  const result = validateDreamStoryGame(currentProject);

  renderGameValidation(result);
});


// ===== Dream Story Background Position V1 =====

const backgroundEditMode =
  document.getElementById("backgroundEditMode");





const resetBackgroundPosition =
  document.getElementById("resetBackgroundPosition");

function getBackgroundTransform() {
  if (!currentProject) {
    return { x: 50, y: 50, zoom: 100 };
  }

  if (!currentProject.backgroundTransform) {
    currentProject.backgroundTransform =
      { x: 50, y: 50, zoom: 100 };
  }

  return currentProject.backgroundTransform;
}

function applyBackgroundTransform() {
  const transform = getBackgroundTransform();

  const x = Math.max(0, Math.min(100, Number(transform.x) || 0));
  const y = Math.max(0, Math.min(100, Number(transform.y) || 0));
  const zoom = Math.max(
    100,
    Math.min(300, Number(transform.zoom) || 100)
  );

  sceneContent.style.backgroundSize = `${zoom}% auto`;
  sceneContent.style.backgroundPosition = `${x}% ${y}%`;

  if (backgroundZoom) {
    backgroundZoom.value = zoom;
    backgroundZoomValue.textContent = `${zoom}%`;
  }
}

function saveBackgroundTransform() {
  if (!currentProject || sceneSwitching) return;

  saveCurrentSceneData();
  saveProjectRecord();
}

backgroundZoom.addEventListener("input", () => {
  if (!currentProject) return;

  getBackgroundTransform().zoom = Number(backgroundZoom.value);
  applyBackgroundTransform();
  saveBackgroundTransform();
});

resetBackgroundPosition.addEventListener("click", () => {
  if (!currentProject) return;

  currentProject.backgroundTransform =
    { x: 50, y: 50, zoom: 100 };

  applyBackgroundTransform();
  saveBackgroundTransform();
});

backgroundEditMode.addEventListener("change", () => {
  sceneContent.classList.toggle(
    "background-editing",
    backgroundEditMode.checked
  );
});

let backgroundDrag = null;

sceneContent.addEventListener("pointerdown", event => {
  if (!backgroundEditMode.checked) return;
  if (!currentProject?.selectedBackgroundId) return;

  // ไม่ลากเมื่อกดบนตัวละครหรือปุ่ม
  if (event.target.closest(
    "#characterLayer img, button, input, #gameChoices, #gameEnding"
  )) return;

  event.preventDefault();

  const transform = getBackgroundTransform();

  backgroundDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    x: transform.x,
    y: transform.y
  };

  sceneContent.setPointerCapture(event.pointerId);
});

sceneContent.addEventListener("pointermove", event => {
  if (!backgroundDrag) return;
  if (event.pointerId !== backgroundDrag.pointerId) return;

  const rect = sceneContent.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const transform = getBackgroundTransform();

  const dx = event.clientX - backgroundDrag.startX;
  const dy = event.clientY - backgroundDrag.startY;

  const geometry = getBackgroundDragGeometry();

  const xRange = rect.width - geometry.width;
  const yRange = rect.height - geometry.height;

  // CSS background-position ใช้ระยะว่างระหว่างภาพกับกรอบ
  // จึงต้องหารด้วยระยะจริง ไม่ใช่ขนาดกรอบ
  if (Math.abs(xRange) > 0.5) {
    transform.x = Math.max(
      0,
      Math.min(
        100,
        backgroundDrag.x + dx / xRange * 100
      )
    );
  }

  if (Math.abs(yRange) > 0.5) {
    transform.y = Math.max(
      0,
      Math.min(
        100,
        backgroundDrag.y + dy / yRange * 100
      )
    );
  }

  applyBackgroundTransform();
});

function stopBackgroundDrag(event) {
  if (!backgroundDrag) return;
  if (event.pointerId !== backgroundDrag.pointerId) return;

  backgroundDrag = null;
  saveBackgroundTransform();
}

sceneContent.addEventListener("pointerup", stopBackgroundDrag);
sceneContent.addEventListener("pointercancel", stopBackgroundDrag);



// ===== Dream Story Tree V1 =====

const openStoryTreeButton =
  document.getElementById("openStoryTree");

const storyTreeModal =
  document.getElementById("storyTreeModal");

const closeStoryTreeButton =
  document.getElementById("closeStoryTree");

const storyTreeRefreshButton =
  document.getElementById("storyTreeRefresh");

const storyTreeViewport =
  document.getElementById("storyTreeViewport");

const storyTreeCanvas =
  document.getElementById("storyTreeCanvas");

const storyTreeNodes =
  document.getElementById("storyTreeNodes");

const storyTreeLines =
  document.getElementById("storyTreeLines");

const storyTreeZoomValue =
  document.getElementById("storyTreeZoomValue");

let storyTreeZoom = 1;

function storyTreeVisible() {
  return !storyTreeModal.hidden;
}

function closeStoryTree() {
  storyTreeModal.hidden = true;
}

function openStoryTree() {
  if (!currentProject) return;

  saveCurrentSceneData();
  saveProjectRecord();

  storyTreeModal.hidden = false;
  renderStoryTree();
}

function renderStoryTree() {
  if (!currentProject) return;

  const scenes = currentProject.scenes || [];
  const byId = new Map(scenes.map(scene => [scene.id, scene]));

  storyTreeNodes.replaceChildren();
  storyTreeLines.replaceChildren();

  if (!scenes.length) return;

  // คำนวณระดับความลึกของฉากจากฉากเริ่มต้น
  const depths = new Map([[scenes[0].id, 0]]);
  const queue = [scenes[0].id];

  while (queue.length) {
    const id = queue.shift();
    const scene = byId.get(id);

    if (!scene || scene.isEnding) continue;

    const depth = depths.get(id);

    for (const choice of scene.choices || []) {
      const target = choice.targetSceneId;

      if (!byId.has(target) || depths.has(target)) continue;

      depths.set(target, depth + 1);
      queue.push(target);
    }
  }

  // เก็บรายชื่อฉากที่เข้าไม่ถึง ก่อนจัดตำแหน่ง
  const unreachableSceneIds = new Set(
    scenes
      .filter(scene => !depths.has(scene.id))
      .map(scene => scene.id)
  );

  // ฉากที่เข้าไม่ถึงวางไว้ด้านท้าย
  let maxDepth = Math.max(...depths.values(), 0);

  for (const scene of scenes) {
    if (!depths.has(scene.id)) {
      depths.set(scene.id, maxDepth + 1);
    }
  }

  const groups = new Map();

  for (const scene of scenes) {
    const depth = depths.get(scene.id);

    if (!groups.has(depth)) groups.set(depth, []);
    groups.get(depth).push(scene);
  }

  const NODE_WIDTH = 190;
  const NODE_HEIGHT = 94;
  const GAP_X = 110;
  const GAP_Y = 55;
  const MARGIN = 70;

  const positions = new Map();

  const levels = [...groups.keys()].sort((a, b) => a - b);
  const maxColumns = Math.max(
    1,
    ...[...groups.values()].map(group => group.length)
  );

  const canvasWidth = Math.max(
    900,
    MARGIN * 2 +
    maxColumns * NODE_WIDTH +
    (maxColumns - 1) * GAP_X
  );

  for (const depth of levels) {
    const group = groups.get(depth);

    const groupWidth =
      group.length * NODE_WIDTH +
      (group.length - 1) * GAP_X;

    const startX = (canvasWidth - groupWidth) / 2;

    group.forEach((scene, index) => {
      positions.set(scene.id, {
        x: startX + index * (NODE_WIDTH + GAP_X),
        y: MARGIN + depth * (NODE_HEIGHT + GAP_Y)
      });
    });
  }

  const maxLevel = Math.max(...levels);

  const canvasHeight =
    MARGIN * 2 +
    (maxLevel + 1) * NODE_HEIGHT +
    maxLevel * GAP_Y;

  storyTreeCanvas.style.width = `${canvasWidth}px`;
  storyTreeCanvas.style.height = `${canvasHeight}px`;

  storyTreeLines.setAttribute("width", canvasWidth);
  storyTreeLines.setAttribute("height", canvasHeight);
  storyTreeLines.setAttribute(
    "viewBox",
    `0 0 ${canvasWidth} ${canvasHeight}`
  );

  const svgNS = "http://www.w3.org/2000/svg";

  const defs = document.createElementNS(svgNS, "defs");
  const arrow = document.createElementNS(svgNS, "marker");

  arrow.setAttribute("id", "story-tree-arrow");
  arrow.setAttribute("markerWidth", "10");
  arrow.setAttribute("markerHeight", "10");
  arrow.setAttribute("refX", "8");
  arrow.setAttribute("refY", "3");
  arrow.setAttribute("orient", "auto");
  arrow.setAttribute("markerUnits", "strokeWidth");

  const arrowPath = document.createElementNS(svgNS, "path");
  arrowPath.setAttribute("d", "M0,0 L0,6 L9,3 z");
  arrowPath.setAttribute("fill", "#a78bfa");

  arrow.appendChild(arrowPath);
  defs.appendChild(arrow);
  storyTreeLines.appendChild(defs);

  // สร้างเส้นเชื่อมก่อนสร้างโหนด
  for (const scene of scenes) {
    const from = positions.get(scene.id);
    if (!from) continue;

    for (const choice of scene.choices || []) {
      const to = positions.get(choice.targetSceneId);
      if (!to) continue;

      const startX = from.x + NODE_WIDTH / 2;
      const startY = from.y + NODE_HEIGHT;

      const endX = to.x + NODE_WIDTH / 2;
      const endY = to.y;

      const path = document.createElementNS(svgNS, "path");

      const offset = Math.max(
        40,
        Math.abs(endY - startY) / 2
      );

      path.setAttribute(
        "d",
        `M ${startX} ${startY} ` +
        `C ${startX} ${startY + offset}, ` +
        `${endX} ${endY - offset}, ` +
        `${endX} ${endY}`
      );

      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "#a78bfa");
      path.setAttribute("stroke-width", "2");
      path.setAttribute(
        "marker-end",
        "url(#story-tree-arrow)"
      );

      storyTreeLines.appendChild(path);

      if (choice.text) {
        const label = document.createElementNS(svgNS, "text");

        label.setAttribute(
          "x",
          (startX + endX) / 2
        );

        label.setAttribute(
          "y",
          (startY + endY) / 2 - 8
        );

        label.setAttribute("text-anchor", "middle");
        label.setAttribute("fill", "#e5e7eb");
        label.setAttribute("font-size", "11");
        label.setAttribute("paint-order", "stroke");
        label.setAttribute("stroke", "#171725");
        label.setAttribute("stroke-width", "4");

        label.textContent =
          choice.text.length > 22
            ? choice.text.slice(0, 22) + "…"
            : choice.text;

        storyTreeLines.appendChild(label);
      }
    }
  }

  // สร้างโหนดฉาก
  scenes.forEach((scene, index) => {
    const position = positions.get(scene.id);

    const node = document.createElement("button");
    node.type = "button";
    node.className = "story-tree-node";

    if (index === 0) node.classList.add("start");
    if (scene.isEnding) node.classList.add("ending");
    if (scene.id === activeSceneId) {
      node.classList.add("current");
    }

    if (unreachableSceneIds.has(scene.id)) {
      node.classList.add("unreachable");
    }

    const invalidChoices = (scene.choices || []).filter(
      choice =>
        !choice.targetSceneId ||
        !byId.has(choice.targetSceneId)
    );

    if (invalidChoices.length) {
      node.classList.add("problem");
    }

    node.style.left = `${position.x}px`;
    node.style.top = `${position.y}px`;

    const badge = document.createElement("span");
    badge.className = "story-tree-node-badge";

    badge.textContent =
      index === 0 ? "🟢 เริ่มต้น" :
      scene.isEnding ? "🏁 ฉากจบ" :
      `ฉาก ${index + 1}`;

    const name = document.createElement("strong");
    name.textContent = scene.name || "ฉากไม่มีชื่อ";

    const info = document.createElement("small");
    info.textContent =
      `ทางเลือก ${(scene.choices || []).length}` +
      (invalidChoices.length
        ? ` · ⚠️ ผิดพลาด ${invalidChoices.length}`
        : "");

    node.append(badge, name, info);

    node.addEventListener("click", async () => {
      closeStoryTree();
      await switchToScene(scene.id);
    });

    storyTreeNodes.appendChild(node);
  });

  applyStoryTreeZoom();
}

function applyStoryTreeZoom() {
  storyTreeCanvas.style.transform =
    `scale(${storyTreeZoom})`;

  storyTreeCanvas.style.transformOrigin = "top left";

  storyTreeZoomValue.textContent =
    `${Math.round(storyTreeZoom * 100)}%`;

  const width = parseFloat(storyTreeCanvas.style.width) || 900;
  const height = parseFloat(storyTreeCanvas.style.height) || 600;

  storyTreeViewport.style.setProperty(
    "--tree-width",
    `${width * storyTreeZoom}px`
  );

  storyTreeViewport.style.setProperty(
    "--tree-height",
    `${height * storyTreeZoom}px`
  );
}

openStoryTreeButton.addEventListener("click", openStoryTree);

closeStoryTreeButton.addEventListener("click", closeStoryTree);

storyTreeRefreshButton.addEventListener("click", () => {
  saveCurrentSceneData();
  renderStoryTree();
});

document.getElementById("storyTreeZoomIn")
  .addEventListener("click", () => {
    storyTreeZoom = Math.min(2, storyTreeZoom + 0.2);
    applyStoryTreeZoom();
  });

document.getElementById("storyTreeZoomOut")
  .addEventListener("click", () => {
    storyTreeZoom = Math.max(0.4, storyTreeZoom - 0.2);
    applyStoryTreeZoom();
  });

storyTreeModal.addEventListener("click", event => {
  if (event.target === storyTreeModal) {
    closeStoryTree();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && storyTreeVisible()) {
    closeStoryTree();
  }
});


// ===== Dream Story Tree V1.1 =====

(function setupStoryTreeNavigation() {
  const viewport = document.getElementById("storyTreeViewport");
  const modal = document.getElementById("storyTreeModal");
  const refresh = document.getElementById("storyTreeRefresh");
  const header = document.querySelector(".story-tree-actions");

  if (!viewport || !modal || !refresh || !header) return;

  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let scrollX = 0;
  let scrollY = 0;

  // ปุ่มจัดแผนผังให้อยู่กลางหน้าจอ
  const centerButton = document.createElement("button");
  centerButton.type = "button";
  centerButton.textContent = "◎ จัดมุมมอง";
  centerButton.title = "จัดแผนผังให้อยู่กลางหน้าจอ";

  header.insertBefore(centerButton, refresh);

  function centerStoryTree() {
    const canvas = document.getElementById("storyTreeCanvas");

    if (!canvas) return;

    const width =
      (parseFloat(canvas.style.width) || 900) * storyTreeZoom;

    viewport.scrollLeft = Math.max(
      0,
      (width - viewport.clientWidth) / 2
    );

    viewport.scrollTop = 0;
  }

  centerButton.addEventListener("click", centerStoryTree);

  // ลากพื้นที่ว่างเพื่อเลื่อนแผนผัง
  viewport.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;

    if (event.target.closest(".story-tree-node")) {
      return;
    }

    dragging = true;
    moved = false;

    startX = event.clientX;
    startY = event.clientY;

    scrollX = viewport.scrollLeft;
    scrollY = viewport.scrollTop;

    viewport.classList.add("story-tree-dragging");

    if (viewport.setPointerCapture) {
      viewport.setPointerCapture(event.pointerId);
    }
  });

  viewport.addEventListener("pointermove", event => {
    if (!dragging) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (Math.abs(dx) + Math.abs(dy) > 4) {
      moved = true;
    }

    viewport.scrollLeft = scrollX - dx;
    viewport.scrollTop = scrollY - dy;
  });

  function stopDragging() {
    dragging = false;
    viewport.classList.remove("story-tree-dragging");
  }

  viewport.addEventListener("pointerup", stopDragging);
  viewport.addEventListener("pointercancel", stopDragging);
  viewport.addEventListener("lostpointercapture", stopDragging);

  // แสดงจำนวนฉากที่เข้าไม่ถึง
  const footer = modal.querySelector(".story-tree-footer");

  const status = document.createElement("span");
  status.id = "storyTreeReachability";
  status.className = "story-tree-reachability";

  if (footer) {
    footer.appendChild(status);
  }

  function updateReachability() {
    if (!currentProject) return;

    const scenes = currentProject.scenes || [];
    const byId = new Map(
      scenes.map(scene => [scene.id, scene])
    );

    const visited = new Set();
    const queue = scenes.length ? [scenes[0].id] : [];

    while (queue.length) {
      const id = queue.shift();

      if (visited.has(id)) continue;
      visited.add(id);

      const scene = byId.get(id);
      if (!scene || scene.isEnding) continue;

      for (const choice of scene.choices || []) {
        if (
          byId.has(choice.targetSceneId) &&
          !visited.has(choice.targetSceneId)
        ) {
          queue.push(choice.targetSceneId);
        }
      }
    }

    const unreachable = scenes.filter(
      scene => !visited.has(scene.id)
    );

    status.textContent = unreachable.length
      ? ` | ⚠️ ฉากที่เข้าไม่ถึง ${unreachable.length} ฉาก`
      : " | ✅ ทุกฉากเข้าถึงได้";

    status.title = unreachable.map(
      scene => scene.name || "ฉากไม่มีชื่อ"
    ).join(", ");
  }

  // ทำงานหลัง Story Tree รุ่นเดิมสร้างแผนผังเสร็จ
  const originalRender = renderStoryTree;

  renderStoryTree = function (...args) {
    const result = originalRender.apply(this, args);

    updateReachability();

    requestAnimationFrame(() => {
      if (!modal.hidden) {
        centerStoryTree();
      }
    });

    return result;
  };

  // ซูมด้วย Ctrl + ล้อเมาส์
  viewport.addEventListener("wheel", event => {
    if (!event.ctrlKey) return;

    event.preventDefault();

    const next = Math.max(
      0.4,
      Math.min(
        2,
        storyTreeZoom + (event.deltaY < 0 ? 0.1 : -0.1)
      )
    );

    storyTreeZoom = Math.round(next * 10) / 10;
    applyStoryTreeZoom();
  }, { passive: false });
})();


// ===== Background Drag Geometry Fix V2 =====

function getBackgroundDragGeometry() {
  const rect = sceneContent.getBoundingClientRect();
  const style = getComputedStyle(sceneContent);

  const imageValue = style.backgroundImage;
  const sizeValue = style.backgroundSize;

  const fallback = {
    width: rect.width,
    height: rect.height
  };

  if (!imageValue || imageValue === "none") {
    return fallback;
  }

  const match = imageValue.match(
    /^url\(["']?(.*?)["']?\)$/
  );

  if (!match) return fallback;

  // ใช้ภาพที่โหลดไว้แล้วเมื่อเป็นไปได้
  if (!window.dreamStoryBackgroundGeometryCache) {
    window.dreamStoryBackgroundGeometryCache = new Map();
  }

  const cache = window.dreamStoryBackgroundGeometryCache;
  const url = match[1];

  let image = cache.get(url);

  if (!image) {
    image = new Image();
    cache.set(url, image);

    image.onload = () => {
      // ภาพโหลดแล้ว การลากครั้งถัดไปจะใช้ขนาดจริง
    };

    image.src = url;
  }

  if (!image.naturalWidth || !image.naturalHeight) {
    return fallback;
  }

  const parts = sizeValue.trim().split(/\s+/);

  let width;
  let height;

  if (parts[0] && parts[0].endsWith("%")) {
    width =
      rect.width * parseFloat(parts[0]) / 100;
  } else if (parts[0] && parts[0].endsWith("px")) {
    width = parseFloat(parts[0]);
  } else {
    return fallback;
  }

  if (parts[1] && parts[1].endsWith("%")) {
    height =
      rect.height * parseFloat(parts[1]) / 100;
  } else if (parts[1] && parts[1].endsWith("px")) {
    height = parseFloat(parts[1]);
  } else {
    height =
      width * image.naturalHeight / image.naturalWidth;
  }

  return {
    width: Number.isFinite(width) ? width : rect.width,
    height: Number.isFinite(height) ? height : rect.height
  };
}


// ===== Dream Story Studio: safe startup =====
initializeScenes();

if (activeSceneId && getActiveScene()) {
  sceneSwitching = true;
  try {
    loadChoicesForScene(getActiveScene());
  } finally {
    sceneSwitching = false;
  }

  switchToScene(activeSceneId).catch(error => {
    console.error("เริ่มต้นฉากไม่สำเร็จ:", error);
  });
}
