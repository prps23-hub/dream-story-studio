
// Dream Story Studio - Project Backup / Restore V1
(() => {
  "use strict";

  const select = document.getElementById("backupProjectSelect");
  const backupButton = document.getElementById("backupProjectButton");
  const restoreButton = document.getElementById("restoreProjectButton");
  const fileInput = document.getElementById("restoreProjectFile");
  const status = document.getElementById("projectBackupStatus");

  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });

  const encode = value => encoder.encode(value);
  const u16 = value => [value & 255, (value >>> 8) & 255];
  const u32 = value => [
    value & 255,
    (value >>> 8) & 255,
    (value >>> 16) & 255,
    (value >>> 24) & 255
  ];

  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    return c >>> 0;
  });

  function crc32(data) {
    let c = 0xffffffff;
    for (const byte of data) {
      c = crcTable[(c ^ byte) & 255] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function concat(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(total);
    let offset = 0;

    for (const part of parts) {
      output.set(part, offset);
      offset += part.length;
    }
    return output;
  }

  function createZip(files) {
    const local = [];
    const central = [];
    let offset = 0;

    if (files.length > 65535) {
      throw new Error("มีไฟล์มากเกินขีดจำกัด ZIP");
    }

    for (const file of files) {
      const name = encode(file.name);
      const body = file.data;
      const checksum = crc32(body);

      const header = new Uint8Array([
        ...u32(0x04034b50),
        ...u16(20),
        ...u16(0x0800),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u32(checksum),
        ...u32(body.length),
        ...u32(body.length),
        ...u16(name.length),
        ...u16(0)
      ]);

      const part = concat([header, name, body]);
      local.push(part);

      central.push(concat([
        new Uint8Array([
          ...u32(0x02014b50),
          ...u16(20),
          ...u16(20),
          ...u16(0x0800),
          ...u16(0),
          ...u16(0),
          ...u16(0),
          ...u32(checksum),
          ...u32(body.length),
          ...u32(body.length),
          ...u16(name.length),
          ...u16(0),
          ...u16(0),
          ...u16(0),
          ...u16(0),
          ...u32(0),
          ...u32(offset)
        ]),
        name
      ]));

      offset += part.length;
    }

    const directory = concat(central);

    return new Blob([
      ...local,
      directory,
      new Uint8Array([
        ...u32(0x06054b50),
        ...u16(0),
        ...u16(0),
        ...u16(files.length),
        ...u16(files.length),
        ...u32(directory.length),
        ...u32(offset),
        ...u16(0)
      ])
    ], { type: "application/zip" });
  }

  function readZip(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const entries = new Map();

    const read16 = offset => view.getUint16(offset, true);
    const read32 = offset => view.getUint32(offset, true);

    if (bytes.length < 22) {
      throw new Error("ไฟล์ ZIP ไม่สมบูรณ์");
    }

    // ค้นหา End of Central Directory
    let eocd = -1;
    const start = Math.max(0, bytes.length - 65557);

    for (let i = bytes.length - 22; i >= start; i--) {
      if (read32(i) === 0x06054b50) {
        eocd = i;
        break;
      }
    }

    if (eocd < 0) {
      throw new Error("ไม่พบโครงสร้าง ZIP");
    }

    if (read16(eocd + 4) !== 0 ||
        read16(eocd + 6) !== 0) {
      throw new Error("ไม่รองรับ ZIP หลายส่วน");
    }

    const count = read16(eocd + 10);
    const directorySize = read32(eocd + 12);
    const directoryOffset = read32(eocd + 16);

    if (count > 10000) {
      throw new Error("ZIP มีไฟล์มากเกินไป");
    }

    if (directoryOffset + directorySize > eocd) {
      throw new Error("โครงสร้าง ZIP ไม่ถูกต้อง");
    }

    let pointer = directoryOffset;

    for (let i = 0; i < count; i++) {
      if (pointer + 46 > bytes.length ||
          read32(pointer) !== 0x02014b50) {
        throw new Error("รายการไฟล์ ZIP เสียหาย");
      }

      const flags = read16(pointer + 8);
      const method = read16(pointer + 10);
      const checksum = read32(pointer + 16);
      const compressed = read32(pointer + 20);
      const uncompressed = read32(pointer + 24);
      const nameLength = read16(pointer + 28);
      const extraLength = read16(pointer + 30);
      const commentLength = read16(pointer + 32);
      const localOffset = read32(pointer + 42);

      const nameStart = pointer + 46;
      const nameEnd = nameStart + nameLength;

      if (nameEnd > bytes.length) {
        throw new Error("ชื่อไฟล์ ZIP ไม่สมบูรณ์");
      }

      const name = decoder.decode(bytes.slice(nameStart, nameEnd));

      pointer = nameEnd + extraLength + commentLength;

      if (pointer > directoryOffset + directorySize) {
        throw new Error("รายการไฟล์ ZIP เกินขอบเขต");
      }

      if (flags & 1 || method !== 0) {
        throw new Error(
          "รองรับเฉพาะ Backup ZIP ที่โปรแกรมสร้างขึ้น"
        );
      }

      if (compressed !== uncompressed) {
        throw new Error("ขนาดไฟล์ ZIP ไม่ถูกต้อง");
      }

      if (localOffset + 30 > bytes.length ||
          read32(localOffset) !== 0x04034b50) {
        throw new Error("ข้อมูลไฟล์ ZIP ไม่สมบูรณ์");
      }

      const localNameLength = read16(localOffset + 26);
      const localExtraLength = read16(localOffset + 28);

      const dataStart =
        localOffset + 30 + localNameLength + localExtraLength;

      const dataEnd = dataStart + compressed;

      if (dataEnd > bytes.length) {
        throw new Error("ข้อมูลไฟล์ ZIP เกินขอบเขต");
      }

      const data = bytes.slice(dataStart, dataEnd);

      if (crc32(data) !== checksum) {
        throw new Error("ตรวจสอบความถูกต้องของไฟล์ไม่ผ่าน");
      }

      if (entries.has(name)) {
        throw new Error("ZIP มีชื่อไฟล์ซ้ำ");
      }

      entries.set(name, data);
    }

    return entries;
  }

  function getProjects() {
    const projects = JSON.parse(
      localStorage.getItem("dreamStoryProjects") || "[]"
    );

    if (!Array.isArray(projects)) {
      throw new Error("รายการโปรเจกต์ไม่ถูกต้อง");
    }

    return projects;
  }

  async function refreshProjects() {
    const previous = select.value;
    select.replaceChildren();

    const projects = getProjects();

    for (const project of projects) {
      const option = document.createElement("option");
      option.value = project.id;

      let imageCount = "?";

      try {
        const assets = await getProjectAssets(project.id);
        imageCount = assets.length;
      } catch (error) {
        console.warn("อ่านจำนวนภาพไม่ได้:", error);
      }

      const sceneCount = project.scenes?.length || 0;
      const shortId = String(project.id || "").slice(0, 8);

      option.textContent =
        `${project.name || "ไม่มีชื่อ"} | ` +
        `${sceneCount} ฉาก | ` +
        `${imageCount} ภาพ | ` +
        `${shortId}`;

      select.appendChild(option);
    }

    if (projects.some(project => project.id === previous)) {
      select.value = previous;
    }

    backupButton.disabled = projects.length === 0;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  backupButton.addEventListener("click", async () => {
    backupButton.disabled = true;
    status.textContent = "กำลังสำรองโปรเจกต์...";

    try {
      const project = getProjects().find(
        item => item.id === select.value
      );

      if (!project) {
        throw new Error("ไม่พบโปรเจกต์ที่เลือก");
      }

      const assets = await getProjectAssets(project.id);
      const manifest = [];
      const files = [];

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];

        if (!(asset.file instanceof Blob)) {
          throw new Error("พบไฟล์ภาพที่ไม่ถูกต้อง");
        }

        const filename = `assets/${i + 1}.bin`;

        manifest.push({
          id: asset.id,
          projectId: asset.projectId,
          name: asset.name || "",
          type: asset.type || "",
          mime: asset.file.type,
          path: filename
        });

        files.push({
          name: filename,
          data: new Uint8Array(
            await asset.file.arrayBuffer()
          )
        });
      }

      const archive = {
        format: "dream-story-project-backup",
        version: 1,
        exportedAt: new Date().toISOString(),
        project,
        assets: manifest
      };

      files.unshift({
        name: "project.json",
        data: encode(JSON.stringify(archive))
      });

      const zip = createZip(files);

      downloadBlob(
        zip,
        (project.name || "dream-story-project")
          .replace(/[\\/:*?"<>|]/g, "_") +
        "-backup.zip"
      );

      status.textContent =
        `✅ สำรองสำเร็จ (${assets.length} ไฟล์ภาพ)`;

    } catch (error) {
      console.error(error);
      status.textContent = "❌ " + error.message;
    } finally {
      refreshProjects();
    }
  });

  restoreButton.addEventListener("click", async () => {
    const file = fileInput.files?.[0];

    if (!file) {
      status.textContent = "กรุณาเลือกไฟล์ Backup ZIP";
      return;
    }

    restoreButton.disabled = true;
    status.textContent = "กำลังตรวจสอบ Backup...";

    try {
      if (file.size > 500 * 1024 * 1024) {
        throw new Error("Backup มีขนาดเกิน 500 MB");
      }

      const entries = readZip(await file.arrayBuffer());
      const projectBytes = entries.get("project.json");

      if (!projectBytes) {
        throw new Error("ไม่พบ project.json ใน Backup");
      }

      const archive = JSON.parse(decoder.decode(projectBytes));

      if (archive.format !== "dream-story-project-backup" ||
          archive.version !== 1 ||
          !archive.project ||
          !Array.isArray(archive.assets)) {
        throw new Error("ไฟล์นี้ไม่ใช่ Backup ที่รองรับ");
      }

      if (!Array.isArray(archive.project.scenes)) {
        throw new Error("ข้อมูลฉากไม่ถูกต้อง");
      }

      if (typeof archive.project.name !== "string") {
        throw new Error("ชื่อโปรเจกต์ไม่ถูกต้อง");
      }

      const oldProjectId = archive.project.id;

      if (typeof oldProjectId !== "string") {
        throw new Error("รหัสโปรเจกต์ไม่ถูกต้อง");
      }

      const newProjectId = crypto.randomUUID();
      const assetIdMap = new Map();
      const restoredAssets = [];

      for (const item of archive.assets) {
        if (!item ||
            typeof item.id !== "string" ||
            typeof item.path !== "string" ||
            !/^assets\/[0-9]+\.bin$/.test(item.path)) {
          throw new Error("รายการไฟล์ภาพไม่ถูกต้อง");
        }

        const bytes = entries.get(item.path);

        if (!bytes) {
          throw new Error("ไฟล์ภาพใน Backup ไม่ครบ");
        }

        if (assetIdMap.has(item.id)) {
          throw new Error("รหัสภาพซ้ำกัน");
        }

        const newAssetId = crypto.randomUUID();
        assetIdMap.set(item.id, newAssetId);

        restoredAssets.push({
          id: newAssetId,
          projectId: newProjectId,
          name: item.name || "",
          type: item.type || "",
          file: new Blob([bytes], {
            type: item.mime || "application/octet-stream"
          })
        });
      }

      const project = JSON.parse(
        JSON.stringify(archive.project)
      );

      project.id = newProjectId;
      project.name = `${project.name} (กู้คืน)`;
      project.createdAt = new Date().toISOString();

      function remap(value) {
        if (typeof value === "string") {
          return assetIdMap.get(value) || value;
        }

        if (Array.isArray(value)) {
          return value.map(remap);
        }

        if (value && typeof value === "object") {
          for (const key of Object.keys(value)) {
            value[key] = remap(value[key]);
          }
        }

        return value;
      }

      remap(project);

      // ตรวจสอบว่ามีพื้นที่จัดเก็บเพียงพอ
      const projects = getProjects();

      if (projects.some(item => item.id === project.id)) {
        throw new Error("รหัสโปรเจกต์ซ้ำ");
      }

      // บันทึกภาพก่อน แล้วจึงเพิ่มโปรเจกต์
      for (const asset of restoredAssets) {
        await saveAsset(asset);
      }

      projects.push(project);

      localStorage.setItem(
        "dreamStoryProjects",
        JSON.stringify(projects)
      );

      refreshProjects();

      status.textContent =
        `✅ กู้คืนสำเร็จ: ${project.name} ` +
        `(${restoredAssets.length} ไฟล์ภาพ)`;

      fileInput.value = "";

    } catch (error) {
      console.error(error);
      status.textContent = "❌ " + error.message;
    } finally {
      restoreButton.disabled = false;
    }
  });



  // Dream Story Project Manager V1

  const openProjectButton =
    document.getElementById("openSelectedProject");

  const renameProjectButton =
    document.getElementById("renameSelectedProject");

  const deleteProjectButton =
    document.getElementById("deleteSelectedProject");

  function selectedProject() {
    return getProjects().find(
      project => project.id === select.value
    );
  }

  openProjectButton.addEventListener("click", () => {
    const project = selectedProject();

    if (!project) {
      status.textContent = "กรุณาเลือกโปรเจกต์";
      return;
    }

    window.location.href =
      "editor.html?project=" +
      encodeURIComponent(project.id);
  });

  renameProjectButton.addEventListener("click", async () => {
    const project = selectedProject();

    if (!project) {
      status.textContent = "กรุณาเลือกโปรเจกต์";
      return;
    }

    const name = prompt(
      "ตั้งชื่อโปรเจกต์ใหม่:",
      project.name || ""
    );

    if (name === null) return;

    const trimmed = name.trim();

    if (!trimmed) {
      status.textContent = "❌ ชื่อโปรเจกต์ห้ามว่าง";
      return;
    }

    if (trimmed.length > 80) {
      status.textContent = "❌ ชื่อยาวเกิน 80 ตัวอักษร";
      return;
    }

    const projects = getProjects();
    const target = projects.find(
      item => item.id === project.id
    );

    target.name = trimmed;

    localStorage.setItem(
      "dreamStoryProjects",
      JSON.stringify(projects)
    );

    await refreshProjects();

    select.value = project.id;

    status.textContent =
      "✅ เปลี่ยนชื่อเป็น " + trimmed;
  });

  deleteProjectButton.addEventListener("click", async () => {
    const project = selectedProject();

    if (!project) {
      status.textContent = "กรุณาเลือกโปรเจกต์";
      return;
    }

    const sceneCount = project.scenes?.length || 0;
    const assets = await getProjectAssets(project.id);

    const approved = confirm(
      "ต้องการลบโปรเจกต์นี้ออกจากรายการใช่หรือไม่?\n\n" +
      "ชื่อ: " + project.name + "\n" +
      "รหัส: " + project.id.slice(0, 8) + "\n" +
      "ฉาก: " + sceneCount + "\n" +
      "ภาพ: " + assets.length + "\n\n" +
      "การลบจะนำโปรเจกต์ออกจากรายการ\n" +
      "แต่ยังเก็บไฟล์ภาพในฐานข้อมูลไว้"
    );

    if (!approved) return;

    const projects = getProjects();

    const remaining = projects.filter(
      item => item.id !== project.id
    );

    localStorage.setItem(
      "dreamStoryProjects",
      JSON.stringify(remaining)
    );

    await refreshProjects();

    status.textContent =
      "✅ นำโปรเจกต์ออกจากรายการแล้ว: " +
      project.name;
  });


  refreshProjects();
})();


// Dream Story Asset Diagnostic V1
window.checkDreamStoryAssets = async function () {
  const projects = JSON.parse(
    localStorage.getItem("dreamStoryProjects") || "[]"
  );

  const db = await openStudioDatabase();

  const allAssets = await new Promise((resolve, reject) => {
    const tx = db.transaction("assets", "readonly");
    const request = tx.objectStore("assets").getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  db.close();

  const report = projects.map(project => {
    const matching = allAssets.filter(
      asset => asset.projectId === project.id
    );

    return {
      project: project.name,
      projectId: project.id,
      scenes: project.scenes?.length || 0,
      backgrounds: project.backgrounds?.length || 0,
      characters: project.characters?.length || 0,
      storedImages: matching.length
    };
  });

  console.table(report);

  console.log(
    "จำนวนภาพทั้งหมดใน IndexedDB:",
    allAssets.length
  );

  console.log(
    "จำนวนภาพที่ไม่ตรงกับโปรเจกต์ใด:",
    allAssets.filter(asset =>
      !projects.some(project => project.id === asset.projectId)
    ).length
  );

  return report;
};
