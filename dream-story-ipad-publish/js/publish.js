(() => {
  "use strict";

  const button = document.getElementById("publishGameButton");
  const status = document.getElementById("publishStatus");

  if (!button || !status) return;

  async function prepareGameFiles() {
    if (!currentProject || !currentProject.scenes?.length) {
      throw new Error("ยังไม่มีฉากสำหรับเผยแพร่");
    }

    saveCurrentSceneData();

    const validation = validateDreamStoryGame(currentProject);

    if (validation.errors.length) {
      renderGameValidation(validation);
      throw new Error("กรุณาแก้ไขข้อผิดพลาดของเกมก่อน");
    }

    if (validation.warnings.length) {
      renderGameValidation(validation);

      const proceed = confirm(
        `พบคำเตือน ${validation.warnings.length} รายการ\n\n` +
        "ต้องการเผยแพร่เกมต่อหรือไม่?"
      );

      if (!proceed) return null;
    }

    const project = JSON.parse(JSON.stringify(currentProject));
    const assets = await getProjectAssets(project.id);

    const used = new Set();

    for (const scene of project.scenes) {
      if (scene.backgroundId) used.add(scene.backgroundId);

      for (const character of scene.characters || []) {
        if (character.assetId) used.add(character.assetId);
      }
      if (scene.audioBgmId) used.add(scene.audioBgmId);
      if (scene.audioSfxId) used.add(scene.audioSfxId);
      for (const d of scene.dialogues || []) if (d.audioSfxId) used.add(d.audioSfxId);
      for (const c of scene.choices || []) if (c.audioSfxId) used.add(c.audioSfxId);
    }

    const paths = {};
    const files = [];
    let n = 0;

    for (const asset of assets) {
      if (!used.has(asset.id)) continue;
      if (asset.type === 'audio' || asset.kind === 'audio' || (asset.mimeType || '').startsWith('audio/')) {
        const raw = asset.blob || asset.file || asset.data;
        if (!(raw instanceof Blob)) throw new Error('ไม่พบไฟล์เสียง: ' + asset.name);
        const extension = (asset.name || '').split('.').pop().toLowerCase();
        const extAudio = ['mp3','m4a','aac','wav','ogg','webm'].includes(extension) ? extension : 'mp3';
        const name = `assets/audio_${++n}.${extAudio}`;
        paths[asset.id] = name;
        files.push({name, data: new Uint8Array(await raw.arrayBuffer())});
        continue;
      }

      const ext =
        asset.file.type === "image/png" ? "png" :
        asset.file.type === "image/webp" ? "webp" : "jpg";

      const name = `assets/image_${++n}.${ext}`;

      paths[asset.id] = name;

      files.push({
        name,
        data: new Uint8Array(await asset.file.arrayBuffer())
      });
    }

    const game = {
      name: project.name,
      aspectRatio:
        project.device === "mobile" ? "9:16" : "16:9",
      scenes: project.scenes,
      assetPaths: paths
    };

    const encoder = new TextEncoder();

    files.push({
      name: "game-data.js",
      data: encoder.encode(
        "window.DREAM_STORY_GAME = " +
        JSON.stringify(game) + ";"
      )
    });

    for (const name of [
      "index.html",
      "style.css",
      "player.js"
    ]) {
      const response = await fetch("export/player/" + name);

      if (!response.ok) {
        throw new Error("โหลดไฟล์เกมไม่สำเร็จ: " + name);
      }

      files.push({
        name,
        data: new Uint8Array(await response.arrayBuffer())
      });
    }

    return files;
  }


  const GITHUB_OWNER = "prps23-hub";
  const GITHUB_REPO = "dream-story-studio";

  function toBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return btoa(binary);
  }

  async function uploadFile(token, path, data) {
    const api = "https://api.github.com/repos/" +
      GITHUB_OWNER + "/" + GITHUB_REPO +
      "/contents/" + path.split("/").map(encodeURIComponent).join("/");

    const response = await fetch(api, {
      method: "PUT",
      headers: {
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Publish Dream Story game: " + path,
        content: toBase64(data),
        branch: "main"
      })
    });

    if (!response.ok) {
      throw new Error(
        "GitHub upload failed (" + response.status + "): " + path
      );
    }
  }
  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "กำลังเตรียมไฟล์เกม...";

    try {
      const files = await prepareGameFiles();

      if (!files) {
        status.textContent = "ยกเลิกการเผยแพร่";
        return;
      }

      const token = await new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.style.cssText =
          "position:fixed;inset:0;background:#000b;" +
          "display:flex;align-items:center;justify-content:center;" +
          "z-index:99999;padding:20px;";

        const box = document.createElement("div");
        box.style.cssText =
          "background:#222;color:white;padding:24px;" +
          "border-radius:12px;width:100%;max-width:400px;";

        const title = document.createElement("h3");
        title.textContent = "เผยแพร่เกมผ่าน GitHub";

        const info = document.createElement("p");
        info.textContent =
          "กรอก Fine-grained Token (ใช้ครั้งนี้เท่านั้น ไม่บันทึก)";

        const input = document.createElement("input");
        input.type = "password";
        input.autocomplete = "off";
        input.placeholder = "GitHub Token";
        input.style.cssText =
          "width:100%;box-sizing:border-box;padding:12px;" +
          "margin-bottom:16px;";

        const confirm = document.createElement("button");
        confirm.textContent = "เผยแพร่เกม";
        confirm.style.marginRight = "12px";

        const cancel = document.createElement("button");
        cancel.textContent = "ยกเลิก";

        function finish(value) {
          input.value = "";
          overlay.remove();
          resolve(value);
        }

        confirm.onclick = () => finish(input.value);
        cancel.onclick = () => finish(null);

        box.append(title, info, input, confirm, cancel);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        input.focus();
      });

      if (!token || !token.trim()) {
        status.textContent = "ยกเลิกการเผยแพร่";
        return;
      }

      const gameId = "game-" +
        new Date().toISOString().replace(/[-:.TZ]/g, "") +
        "-" + Math.random().toString(36).slice(2, 8);

      const basePath = "games/" + gameId;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        status.textContent =
          "กำลังอัปโหลด " + (i + 1) +
          "/" + files.length + " ไฟล์...";

        await uploadFile(
          token.trim(),
          basePath + "/" + file.name,
          file.data
        );
      }

      const url =
        "https://prps23-hub.github.io/dream-story-studio/" +
        basePath + "/";

      status.textContent = "✅ อัปโหลดครบแล้ว กำลังสร้างลิงก์เกม...";

      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "🎮 เปิดเกมที่เผยแพร่";

      status.replaceChildren(
        document.createTextNode(
          "✅ อัปโหลดเกมสำเร็จ! GitHub Pages อาจใช้เวลาสักครู่ในการเผยแพร่ "
        ),
        link
      );

    } catch (error) {
      console.error("Publish preparation failed:", error);
      status.textContent = "❌ " + error.message;
    } finally {
      button.disabled = false;
    }
  });

  button.disabled = false;
  status.textContent = "พร้อมทดสอบการเตรียมไฟล์เกม";
})();
