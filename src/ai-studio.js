// Aqua PC Parts — AI Video & Reel Studio (Image-to-Video & Text-to-Video)
// Calls server-side /api/gemini/video-director (Gemini 4 Hydrogen) + renders real playable 16:9 / 9:16 video via Canvas + MediaRecorder.

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function initAiStudio() {
  const modeTabs = document.querySelectorAll("[data-studio-mode]");
  const imageField = document.getElementById("studio-image-field");
  const fileInput = document.getElementById("studio-file-input");
  const dropzone = document.getElementById("studio-dropzone");
  const previewImg = document.getElementById("studio-img-preview");
  const sampleBtns = document.querySelectorAll("[data-sample-img]");
  const promptEl = document.getElementById("studio-prompt");
  const promptLabel = document.getElementById("studio-prompt-label");
  const ratioBtns = document.querySelectorAll("[data-aspect]");
  const styleSelect = document.getElementById("studio-style");
  const generateBtn = document.getElementById("studio-generate-btn");
  const btnLabel = document.getElementById("studio-btn-label");
  const statusMsg = document.getElementById("studio-status-msg");
  const placeholder = document.getElementById("studio-placeholder");
  const renderCanvas = document.getElementById("studio-render-canvas");
  const videoPlayer = document.getElementById("studio-video-player");
  const progressWrap = document.getElementById("studio-progress-wrap");
  const progressFill = document.getElementById("studio-progress-fill");
  const outputActions = document.getElementById("studio-output-actions");
  const outputMeta = document.getElementById("studio-output-meta");
  const downloadLink = document.getElementById("studio-download-link");
  const storyboardEl = document.getElementById("studio-storyboard");

  if (!generateBtn || !renderCanvas) return;

  let currentMode = "image";
  let aspectRatio = "16:9";
  let selectedImageObj = null;
  let selectedImageBase64 = "";
  let selectedImageMime = "image/jpeg";
  let lastObjectUrl = null;
  let rendering = false;

  function setStatus(txt, isError) {
    if (!statusMsg) return;
    statusMsg.textContent = txt;
    statusMsg.style.color = isError ? "#fca5a5" : "var(--text-muted)";
  }

  function loadSourceImageFromDataUrl(dataUrl, mime) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      selectedImageObj = img;
      selectedImageBase64 = dataUrl;
      selectedImageMime = mime || "image/jpeg";
      if (previewImg) {
        previewImg.src = dataUrl;
        previewImg.hidden = false;
      }
      setStatus("Photo loaded (" + img.naturalWidth + "×" + img.naturalHeight + "). Ready to animate!", false);
    };
    img.onerror = () => {
      setStatus("Could not load that image. Please pick a JPG, PNG, or WebP file.", true);
    };
    img.src = dataUrl;
  }

  async function loadSampleImage(relPath) {
    try {
      const res = await fetch(relPath);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        loadSourceImageFromDataUrl(String(reader.result || ""), blob.type || "image/webp");
      };
      reader.readAsDataURL(blob);
    } catch (_) {
      setStatus("Could not load sample hardware image.", true);
    }
  }

  // Load default GPU image for immediate 1-click testing
  loadSampleImage("assets/parts/gpu-prime.webp");

  modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      currentMode = tab.getAttribute("data-studio-mode") || "image";
      modeTabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", String(active));
      });
      if (imageField) imageField.hidden = currentMode !== "image";
      if (promptLabel) {
        promptLabel.textContent =
          currentMode === "image"
            ? "Motion & Scene Direction Prompt"
            : "Text-to-Video Hardware Scene Prompt";
      }
      if (promptEl) {
        promptEl.placeholder =
          currentMode === "image"
            ? "e.g. Slow studio zoom across the GPU fans with electric cyan light sweeps and 24h FurMark callout..."
            : "e.g. Cinematic RTX 4070 custom gaming rig reveal with glowing cyan liquid cooling and Embilipitiya workshop specs...";
      }
    });
  });

  ratioBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      aspectRatio = btn.getAttribute("data-aspect") || "16:9";
      ratioBtns.forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        loadSourceImageFromDataUrl(String(reader.result || ""), file.type || "image/jpeg");
      };
      reader.readAsDataURL(file);
    });
  }

  if (dropzone) {
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragover"));
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        loadSourceImageFromDataUrl(String(reader.result || ""), file.type || "image/jpeg");
      };
      reader.readAsDataURL(file);
    });
  }

  sampleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const src = btn.getAttribute("data-sample-img");
      if (src) loadSampleImage(src);
    });
  });

  function renderStoryboardCards(plan) {
    if (!storyboardEl || !plan || !Array.isArray(plan.scenes)) return;
    storyboardEl.innerHTML = plan.scenes
      .map(
        (sc, idx) =>
          '<div class="scene-pill">' +
          "<small>SCENE 0" + (idx + 1) + " &middot; " + esc(sc.motion.toUpperCase()) + "</small>" +
          "<strong>" + esc(sc.heading) + "</strong>" +
          "<p>" + esc(sc.caption) + "</p>" +
          "</div>"
      )
      .join("");
    storyboardEl.hidden = false;
  }

  async function renderCanvasVideo(plan, mode, ratio) {
    const W = ratio === "9:16" ? 540 : 960;
    const H = ratio === "9:16" ? 960 : 540;
    renderCanvas.width = W;
    renderCanvas.height = H;
    renderCanvas.hidden = false;
    if (placeholder) placeholder.hidden = true;
    if (videoPlayer) videoPlayer.hidden = true;
    if (outputActions) outputActions.hidden = true;
    if (progressWrap) progressWrap.hidden = false;

    const ctx = renderCanvas.getContext("2d");
    const totalMs = 7500; // 3 scenes x 2.5s = 7.5s crisp reel
    const sceneMs = totalMs / 3;

    // Seed deterministic floating dust/airflow sparks
    const particles = Array.from({ length: 42 }, (_, i) => ({
      x: ((i * 97) % 1000) / 1000,
      y: ((i * 53) % 1000) / 1000,
      r: 1.5 + (i % 4),
      speed: 0.04 + (i % 5) * 0.015,
    }));

    const mimeCandidates = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    let chosenMime = "";
    if (typeof MediaRecorder !== "undefined") {
      for (const m of mimeCandidates) {
        if (MediaRecorder.isTypeSupported(m)) {
          chosenMime = m;
          break;
        }
      }
    }

    const chunks = [];
    let recorder = null;
    if (chosenMime && typeof renderCanvas.captureStream === "function") {
      const stream = renderCanvas.captureStream(30);
      recorder = new MediaRecorder(stream, {
        mimeType: chosenMime,
        videoBitsPerSecond: 3200000,
      });
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.start(100);
    }

    const startTime = performance.now();

    function drawFrame(now) {
      const elapsed = Math.min(totalMs, now - startTime);
      const progress = elapsed / totalMs;
      const sceneIdx = Math.min(2, Math.floor(elapsed / sceneMs));
      const localT = (elapsed - sceneIdx * sceneMs) / sceneMs; // 0..1 within scene
      const scene = plan.scenes[sceneIdx] || plan.scenes[0];

      if (progressFill) progressFill.style.width = Math.round(progress * 100) + "%";

      // 1. Studio Backdrop
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, plan.backdropHex || "#071124");
      bgGrad.addColorStop(1, "#030712");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // 2. Animated Photo Layer (Image-to-Video) OR Procedural Hardware Schematic (Text-to-Video)
      if (mode === "image" && selectedImageObj) {
        const img = selectedImageObj;
        const baseScale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
        let zoom = 1.08;
        let panX = 0;
        let panY = 0;
        if (scene.motion === "zoom-in") {
          zoom = 1.04 + localT * 0.16;
        } else if (scene.motion === "zoom-out") {
          zoom = 1.2 - localT * 0.14;
        } else if (scene.motion === "pan-right") {
          zoom = 1.16;
          panX = (localT - 0.5) * W * 0.09;
        } else {
          zoom = 1.16;
          panX = (0.5 - localT) * W * 0.09;
        }

        const drawW = img.naturalWidth * baseScale * zoom;
        const drawH = img.naturalHeight * baseScale * zoom;
        const dx = (W - drawW) / 2 + panX;
        const dy = (H - drawH) / 2 + panY;

        ctx.save();
        ctx.globalAlpha = 0.88;
        ctx.drawImage(img, dx, dy, drawW, drawH);
        ctx.restore();

        // Dark studio gradient vignette so typography pops
        const vig = ctx.createLinearGradient(0, 0, 0, H);
        vig.addColorStop(0, "rgba(4, 9, 20, 0.58)");
        vig.addColorStop(0.45, "rgba(4, 9, 20, 0.18)");
        vig.addColorStop(1, "rgba(4, 9, 20, 0.92)");
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
      } else {
        // Text-to-Video procedural 3D wireframe grid + hardware silhouette pulse
        ctx.save();
        ctx.strokeStyle = plan.accentHex + "26";
        ctx.lineWidth = 1;
        const gridStep = 44;
        const shift = (elapsed * 0.04) % gridStep;
        for (let gx = -gridStep; gx < W + gridStep; gx += gridStep) {
          ctx.beginPath();
          ctx.moveTo(gx + shift, 0);
          ctx.lineTo(gx + shift, H);
          ctx.stroke();
        }
        for (let gy = -gridStep; gy < H + gridStep; gy += gridStep) {
          ctx.beginPath();
          ctx.moveTo(0, gy + shift * 0.5);
          ctx.lineTo(W, gy + shift * 0.5);
          ctx.stroke();
        }

        // Animated geometric hardware turbine rings
        const cx = W * 0.5;
        const cy = H * 0.43;
        const maxR = Math.min(W, H) * 0.27;
        for (let k = 0; k < 3; k++) {
          const r = maxR * (0.52 + k * 0.24) + Math.sin(elapsed * 0.003 + k) * 6;
          ctx.strokeStyle = k === 1 ? plan.secondaryHex : plan.accentHex;
          ctx.globalAlpha = 0.55 - k * 0.14;
          ctx.lineWidth = 3 - k * 0.6;
          ctx.beginPath();
          ctx.arc(cx, cy, r, elapsed * 0.0014 * (k % 2 ? -1 : 1), elapsed * 0.0014 * (k % 2 ? -1 : 1) + Math.PI * 1.35);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 3. Volumetric Studio Light Sweep
      ctx.save();
      const sweepX =
        scene.sweepDir === "rtl"
          ? W * (1.2 - localT * 1.4)
          : W * (-0.2 + localT * 1.4);
      const glow = ctx.createRadialGradient(sweepX, H * 0.32, 10, sweepX, H * 0.32, W * 0.55);
      glow.addColorStop(0, plan.accentHex + "44");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // 4. Floating Airflow Particles
      ctx.save();
      ctx.fillStyle = plan.accentHex;
      for (const p of particles) {
        const px = ((p.x + progress * p.speed * 4) % 1) * W;
        const py = ((p.y + Math.sin(elapsed * 0.002 + p.x * 10) * 0.02 + 1) % 1) * H;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 5. Top Brand Header Strip
      const pad = Math.round(W * 0.055);
      ctx.save();
      ctx.fillStyle = "rgba(7, 15, 30, 0.78)";
      drawRoundedRect(ctx, pad, pad * 0.75, Math.min(W - pad * 2, 340), 38, 10);
      ctx.fill();
      ctx.strokeStyle = plan.accentHex + "80";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = plan.accentHex;
      ctx.font = "bold 13px JetBrains Mono, monospace";
      ctx.fillText("AQUA PC PARTS · SRI LANKA", pad + 14, pad * 0.75 + 24);

      // Scene Badge on Top Right
      const badgeW = 175;
      ctx.fillStyle = plan.secondaryHex;
      drawRoundedRect(ctx, W - pad - badgeW, pad * 0.75, badgeW, 34, 8);
      ctx.fill();
      ctx.fillStyle = "#04111d";
      ctx.font = "bold 12px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(scene.badge.toUpperCase(), W - pad - badgeW / 2, pad * 0.75 + 21);
      ctx.textAlign = "left";
      ctx.restore();

      // 6. Lower-Third Animated Title & Spec Caption
      const enterAlpha = Math.min(1, localT * 4.5);
      const slideY = (1 - enterAlpha) * 20;
      ctx.save();
      ctx.globalAlpha = enterAlpha;

      const cardH = ratio === "9:16" ? 210 : 158;
      const cardY = H - pad - cardH + slideY;
      ctx.fillStyle = "rgba(6, 13, 28, 0.84)";
      drawRoundedRect(ctx, pad, cardY, W - pad * 2, cardH, 16);
      ctx.fill();
      ctx.strokeStyle = plan.accentHex + "66";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Accent Left Bar
      ctx.fillStyle = plan.accentHex;
      drawRoundedRect(ctx, pad + 16, cardY + 20, 5, cardH - 40, 3);
      ctx.fill();

      ctx.fillStyle = plan.accentHex;
      ctx.font = "bold 13px JetBrains Mono, monospace";
      ctx.fillText(plan.tagline.toUpperCase(), pad + 34, cardY + 38);

      ctx.fillStyle = "#ffffff";
      ctx.font = ratio === "9:16" ? "800 28px Syne, sans-serif" : "800 30px Syne, sans-serif";
      ctx.fillText(scene.heading, pad + 34, cardY + 74);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "500 16px Plus Jakarta Sans, sans-serif";
      const capLines = wrapText(ctx, scene.caption, W - pad * 2 - 58);
      capLines.forEach((ln, li) => {
        ctx.fillText(ln, pad + 34, cardY + 106 + li * 23);
      });
      ctx.restore();

      // Timeline thin scrubber bar at very bottom
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(0, H - 5, W, 5);
      ctx.fillStyle = plan.accentHex;
      ctx.fillRect(0, H - 5, W * progress, 5);
    }

    return new Promise((resolve) => {
      function step(now) {
        drawFrame(now);
        if (now - startTime < totalMs) {
          requestAnimationFrame(step);
        } else {
          if (recorder && recorder.state !== "inactive") {
            recorder.onstop = () => {
              const blob = new Blob(chunks, { type: chosenMime || "video/webm" });
              resolve(blob);
            };
            recorder.stop();
          } else {
            resolve(null);
          }
        }
      }
      requestAnimationFrame(step);
    });
  }

  generateBtn.addEventListener("click", async () => {
    if (rendering) return;
    const promptVal = (promptEl && promptEl.value ? promptEl.value : "").trim();

    if (currentMode === "image" && !selectedImageObj) {
      setStatus("Please upload a hardware photo or pick a quick sample first.", true);
      return;
    }
    if (currentMode === "text" && !promptVal) {
      setStatus("Please enter a text prompt describing your PC hardware video.", true);
      return;
    }

    rendering = true;
    generateBtn.disabled = true;
    if (btnLabel) btnLabel.textContent = "Gemini 4 Directing Storyboard...";
    setStatus("Asking Gemini 4 Hydrogen to direct your 3-scene motion choreography...", false);

    try {
      const payload = {
        mode: currentMode,
        prompt: promptVal || "Animate this PC hardware with smooth studio camera motion and glowing tech callouts",
        aspectRatio,
        style: styleSelect ? styleSelect.value : "cyber-studio",
      };
      if (currentMode === "image" && selectedImageBase64) {
        payload.imageBase64 = selectedImageBase64;
        payload.mimeType = selectedImageMime;
      }

      const res = await fetch("/api/gemini/video-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.plan) {
        throw new Error(data.error || "Failed to generate storyboard.");
      }

      renderStoryboardCards(data.plan);
      if (btnLabel) btnLabel.textContent = "Rendering " + aspectRatio + " Video...";
      setStatus("Rendering 7.5s " + aspectRatio + " showcase video in real time...", false);

      const videoBlob = await renderCanvasVideo(data.plan, currentMode, aspectRatio);

      if (progressWrap) progressWrap.hidden = true;
      if (videoBlob && videoPlayer && downloadLink) {
        if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
        lastObjectUrl = URL.createObjectURL(videoBlob);
        renderCanvas.hidden = true;
        videoPlayer.src = lastObjectUrl;
        videoPlayer.hidden = false;
        videoPlayer.play().catch(() => {});
        downloadLink.href = lastObjectUrl;
        downloadLink.download = `aqua-pc-${currentMode}-${aspectRatio.replace(":", "x")}.webm`;
        if (outputMeta) {
          outputMeta.textContent = `7.5s · ${aspectRatio} · Directed by ${data.model}`;
        }
        if (outputActions) outputActions.hidden = false;
        setStatus("Video ready! Watch above or download your .webm showcase clip.", false);
      } else {
        setStatus("Preview rendered on canvas (MediaRecorder not supported in this browser).", false);
      }
    } catch (err) {
      setStatus(err && err.message ? err.message : "Could not create video right now.", true);
    } finally {
      rendering = false;
      generateBtn.disabled = false;
      if (btnLabel) btnLabel.textContent = "Direct & Render Showcase Video";
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAiStudio);
} else {
  initAiStudio();
}
