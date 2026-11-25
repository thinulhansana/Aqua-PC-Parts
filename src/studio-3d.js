import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

// Pre-allocated scratch math helpers (zero GC in render loop)
const _dummy = new THREE.Object3D();
const _vec3 = new THREE.Vector3();
const _pointer = new THREE.Vector2();

// Hardware catalog metadata for click-to-inspect raycasting
const PART_SPECS = {
  gpu: {
    kicker: "GRAPHICS PROCESSOR",
    title: "Triple-Fan RTX-Class GPU",
    desc: "Die-cast shroud with 36-fin vapor-chamber heatsink, exposed copper heatpipes, brushed backplate, and 24-hour FurMark thermal verification at Aqua PC Parts.",
    warranty: "06-Month FurMark Verified",
    price: "From Rs. 28,500",
    link: "./used-parts.html#vga-cards",
  },
  motherboard: {
    kicker: "SYSTEM BOARD & MEMORY",
    title: "ATX Motherboard + Quad DDR5 RGB",
    desc: "Multi-layer black matte PCB with brushed VRM heatsinks, steel-armored PCIe x16 slot, NVMe M.2 thermal shield, and matched dual-channel RAM kits.",
    warranty: "06-Month Lab Tested",
    price: "From Rs. 16,500",
    link: "./used-parts.html#motherboards",
  },
  cooling: {
    kicker: "THERMAL ARCHITECTURE",
    title: "360mm AIO Liquid Cooler",
    desc: "42-fin triple radiator with braided coolant tubes and lathe-turned anodized IPS telemetry pump head keeping boost clocks locked in Sri Lanka's climate.",
    warranty: "Brand New / Sealed",
    price: "From Rs. 24,000",
    link: "./brand-new-parts.html",
  },
  fans: {
    kicker: "FRONT INTAKE ARRAY",
    title: "3x 120mm ARGB High-Airflow Fans",
    desc: "Whisper-quiet hydraulic bearing intake array mounted behind a chamfered aluminum mesh front bezel for positive-pressure dust filtration.",
    warranty: "Brand New / Sealed",
    price: "From Rs. 4,500",
    link: "./brand-new-parts.html",
  },
  psu: {
    kicker: "POWER DELIVERY",
    title: "850W 80+ Gold Modular PSU",
    desc: "Isolated bottom PSU chamber with sleeved 24-pin ATX and 12VHPWR GPU harnesses, load-tested for clean voltage ripple before workshop handover.",
    warranty: "06-Month / Brand Warranty",
    price: "From Rs. 14,500",
    link: "./used-parts.html#power-supply",
  },
  chassis: {
    kicker: "TEMPERED GLASS ENCLOSURE",
    title: "Aqua Pro Airflow ATX Chassis",
    desc: "Beveled powder-coated steel and brushed anodized aluminum mid-tower featuring optical tempered glass and machined lathe-turned isolation feet.",
    warranty: "Workshop Fitted",
    price: "From Rs. 18,500",
    link: "./index.html#pc-combo-builder",
  },
};

const FINISH_THEMES = {
  aqua: {
    label: "Obsidian & Aqua Cyan",
    chassisColor: 0x1b2230,
    trimColor: 0x2c384d,
    accentHex: 0x00e5ff,
    secondaryHex: 0x14b8a6,
    metalness: 0.78,
    roughness: 0.3,
  },
  arctic: {
    label: "Arctic White & Ice Blue",
    chassisColor: 0xe6edf6,
    trimColor: 0xcbd5e1,
    accentHex: 0x38bdf8,
    secondaryHex: 0x0ea5e9,
    metalness: 0.28,
    roughness: 0.26,
  },
  gold: {
    label: "Stealth Graphite & Gold",
    chassisColor: 0x20232b,
    trimColor: 0x383e4b,
    accentHex: 0xf59e0b,
    secondaryHex: 0xfbbf24,
    metalness: 0.82,
    roughness: 0.28,
  },
  crimson: {
    label: "Matte Carbon & Crimson",
    chassisColor: 0x16181f,
    trimColor: 0x272b38,
    accentHex: 0xf43f5e,
    secondaryHex: 0xff6b00,
    metalness: 0.72,
    roughness: 0.36,
  },
};

const CAMERA_PRESETS = {
  hero: { pos: new THREE.Vector3(3.35, 1.92, 3.85), target: new THREE.Vector3(0.0, 1.06, 0.0) },
  gpu: { pos: new THREE.Vector3(1.88, 0.98, 1.48), target: new THREE.Vector3(-0.04, 0.88, 0.06) },
  board: { pos: new THREE.Vector3(1.92, 1.45, 0.94), target: new THREE.Vector3(-0.18, 1.24, -0.08) },
  cooling: { pos: new THREE.Vector3(2.08, 1.88, 1.62), target: new THREE.Vector3(0.04, 1.48, 0.1) },
  rear: { pos: new THREE.Vector3(-3.18, 1.62, -2.55), target: new THREE.Vector3(0.0, 1.04, 0.0) },
};

// Detect software WebGL rasterizers (SwiftShader, llvmpipe, WARP) and immediately free probe context
const isSoftwareGl = (() => {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch (_) {
    return false;
  }
})();

// ───────── Procedural CanvasTextures (100% self-contained, zero 404s) ─────────
function createBrushedMetalRoughnessTexture(maxAniso) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#525252";
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y++) {
    const tone = 62 + ((y * 17) % 38);
    ctx.fillStyle = `rgb(${tone},${tone},${tone})`;
    ctx.fillRect(0, y, 256, 1);
  }
  // Fine horizontal brushed grain streaks
  for (let i = 0; i < 420; i++) {
    const x = (i * 59) % 256;
    const y = (i * 31) % 256;
    const len = 18 + (i % 64);
    const v = 46 + (i % 56);
    ctx.fillStyle = `rgba(${v},${v},${v},0.45)`;
    ctx.fillRect(x, y, len, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  // Roughness map stays in linear NoColorSpace
  tex.anisotropy = maxAniso;
  return tex;
}

function createPcbTexture(maxAniso) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0e151f";
  ctx.fillRect(0, 0, 512, 512);

  // Fiberglass weave micro-grid
  ctx.strokeStyle = "rgba(44, 68, 96, 0.25)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 512; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Routed PCB copper/silver signal traces + solder pads
  ctx.strokeStyle = "rgba(92, 148, 194, 0.46)";
  ctx.lineWidth = 2;
  for (let t = 0; t < 48; t++) {
    const x1 = 26 + ((t * 37) % 452);
    const y1 = 24 + ((t * 53) % 446);
    const midX = x1 + ((t % 2 === 0 ? 1 : -1) * (34 + (t % 5) * 14));
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(midX, y1);
    ctx.lineTo(midX + 22, y1 + 22);
    ctx.stroke();

    ctx.fillStyle = "#d1b97f";
    ctx.beginPath();
    ctx.arc(x1, y1, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Silkscreen workshop markings
  ctx.fillStyle = "rgba(220, 238, 255, 0.62)";
  ctx.font = "bold 20px monospace";
  ctx.fillText("AQUA PRO Z790-LAB", 34, 466);
  ctx.font = "12px monospace";
  ctx.fillText("24H BENCH VERIFIED · REV 3.0", 34, 488);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createMeshGrillTexture(maxAniso) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#192230";
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = "#06090f";
  for (let y = 6; y < 256; y += 12) {
    const offset = (Math.floor(y / 12) % 2) * 6;
    for (let x = 6; x < 256; x += 12) {
      ctx.beginPath();
      ctx.arc(x + offset, y, 3.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createContactShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 124);
  grad.addColorStop(0, "rgba(0, 0, 0, 0.72)");
  grad.addColorStop(0.55, "rgba(0, 0, 0, 0.34)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

function createPumpFaceTexture(accentHex, maxAniso) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#080d18";
  ctx.fillRect(0, 0, 256, 256);

  const hexStr = "#" + accentHex.toString(16).padStart(6, "0");
  ctx.strokeStyle = hexStr;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(128, 128, 102, 0, Math.PI * 2);
  ctx.stroke();

  // Inner telemetry ticks
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(ang) * 84, 128 + Math.sin(ang) * 84);
    ctx.lineTo(128 + Math.cos(ang) * 92, 128 + Math.sin(ang) * 92);
    ctx.stroke();
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px monospace";
  ctx.textAlign = "center";
  ctx.fillText("37°C", 128, 134);

  ctx.fillStyle = hexStr;
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("AQUA LIQUID", 128, 170);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

// ───────── Sculpted Procedural Geometries (ExtrudeGeometry & LatheGeometry) ─────────
function createBeveledFrontFrameGeometry(width, height, border) {
  const hw = width / 2;
  const hh = height / 2;
  const outer = new THREE.Shape();
  outer.moveTo(-hw, -hh);
  outer.lineTo(hw, -hh);
  outer.lineTo(hw, hh);
  outer.lineTo(-hw, hh);
  outer.closePath();

  const ihw = hw - border;
  const ihh = hh - border;
  const hole = new THREE.Path();
  hole.moveTo(-ihw, -ihh);
  hole.lineTo(ihw, -ihh);
  hole.lineTo(ihw, ihh);
  hole.lineTo(-ihw, ihh);
  hole.closePath();
  outer.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(outer, {
    depth: 0.048,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.014,
    bevelSegments: 3,
  });
  geo.center();
  return geo;
}

function createTurnedFootGeometry() {
  // Lathe profile for a machined knurled aluminum chassis isolation foot (bottom-center pivot y=0)
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.092, 0.0),
    new THREE.Vector2(0.095, 0.018),
    new THREE.Vector2(0.082, 0.024),
    new THREE.Vector2(0.088, 0.056),
    new THREE.Vector2(0.08, 0.072),
    new THREE.Vector2(0.074, 0.09),
    new THREE.Vector2(0.0, 0.09),
  ];
  return new THREE.LatheGeometry(pts, 28);
}

function createTurnedPumpCrownGeometry() {
  // Lathe profile for a stepped anodized AIO pump block housing
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.156, 0.0),
    new THREE.Vector2(0.156, 0.08),
    new THREE.Vector2(0.146, 0.098),
    new THREE.Vector2(0.146, 0.132),
    new THREE.Vector2(0.132, 0.146),
    new THREE.Vector2(0.0, 0.146),
  ];
  return new THREE.LatheGeometry(pts, 32);
}

function tagPartGroup(group, partId) {
  group.traverse((child) => {
    if (child.isMesh || child.isInstancedMesh) {
      child.userData.partId = partId;
    }
  });
}

// Builds a single 120mm ARGB fan with outer frame, LED ring, hub, and 7 pitched blades
function buildArgbFan(radius, materials, rotorList, sharedBladeGeo) {
  const fanGroup = new THREE.Group();
  const frameSize = radius * 2.08;
  const thickness = 0.065;

  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(thickness, frameSize, frameSize),
    materials.darkMetal
  );
  housing.castShadow = !isSoftwareGl;
  fanGroup.add(housing);

  // Luminous ARGB halo ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.88, 0.015, 12, 36),
    materials.accentEmissive
  );
  ring.rotation.y = Math.PI / 2;
  ring.position.x = thickness * 0.48;
  fanGroup.add(ring);

  // Rotating rotor (hub + 7 pitched blades)
  const rotor = new THREE.Group();
  rotor.position.x = thickness * 0.25;

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.28, radius * 0.28, 0.045, 20),
    materials.brushedAluminum
  );
  hub.rotation.z = Math.PI / 2;
  rotor.add(hub);

  const bladeGeo = sharedBladeGeo || new THREE.BoxGeometry(0.012, radius * 0.56, radius * 0.24);
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.rotation.x = angle;
    const blade = new THREE.Mesh(bladeGeo, materials.fanBlade);
    blade.position.y = radius * 0.48;
    blade.rotation.y = 0.46;
    pivot.add(blade);
    rotor.add(pivot);
  }

  fanGroup.add(rotor);
  rotorList.push(rotor);
  return fanGroup;
}

// ───────── Core Reusable Studio PBR Rig Scene Factory ─────────
function mountPcRigStage(container, options = {}) {
  const isEmbedded = Boolean(options.embedded);
  const initialTheme = options.initialTheme || "aqua";

  const scene = new THREE.Scene();
  const bgHex = 0x0b1220;
  scene.background = new THREE.Color(bgHex);
  scene.fog = new THREE.FogExp2(bgHex, 0.032);

  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  const camera = new THREE.PerspectiveCamera(isEmbedded ? 38 : 40, width / height, 0.1, 100);
  camera.position.copy(CAMERA_PRESETS.hero.pos);
  if (isEmbedded) {
    camera.position.set(3.65, 1.98, 4.1);
  }

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: "high-performance",
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);

  // Mandatory Studio Environment Reflection via RoomEnvironment + PMREMGenerator
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmrem.dispose();

  // Balanced 3-Point Studio Lighting Rig + GPU RectAreaLight Softboxes
  const hemiLight = new THREE.HemisphereLight(0xb8d4f0, 0x161f30, 0.92);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff3e2, 2.45);
  keyLight.position.set(4.5, 6.5, 4.2);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 18;
  keyLight.shadow.camera.left = -3.4;
  keyLight.shadow.camera.right = 3.4;
  keyLight.shadow.camera.top = 3.4;
  keyLight.shadow.camera.bottom = -3.4;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(FINISH_THEMES[initialTheme].accentHex, 1.15);
  rimLight.position.set(-4.2, 2.8, -3.5);
  scene.add(rimLight);

  // Studio Overhead & Side Softboxes (RectAreaLight — skipped on software WebGL per skill)
  if (!isSoftwareGl) {
    RectAreaLightUniformsLib.init();
    const overheadSoftbox = new THREE.RectAreaLight(0xeef6ff, 2.2, 3.6, 1.8);
    overheadSoftbox.position.set(0.4, 4.1, 0.6);
    overheadSoftbox.lookAt(0, 1.0, 0);
    scene.add(overheadSoftbox);

    const sideSoftbox = new THREE.RectAreaLight(0xcfe8ff, 1.4, 2.4, 2.2);
    sideSoftbox.position.set(3.6, 1.8, -0.8);
    sideSoftbox.lookAt(0, 1.05, 0);
    scene.add(sideSoftbox);
  }

  // Grounded Studio Floor & Circular Display Plinth
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(48, 48),
    new THREE.MeshStandardMaterial({
      color: 0x0f1829,
      roughness: 0.86,
      metalness: 0.12,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = !isSoftwareGl;
  scene.add(floor);

  const plinthGroup = new THREE.Group();
  const plinthBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.74, 1.86, 0.09, 56),
    new THREE.MeshStandardMaterial({
      color: 0x162135,
      roughness: 0.38,
      metalness: 0.58,
    })
  );
  plinthBase.position.y = 0.045;
  plinthBase.receiveShadow = !isSoftwareGl;
  plinthGroup.add(plinthBase);

  const plinthRingMat = new THREE.MeshStandardMaterial({
    color: FINISH_THEMES[initialTheme].accentHex,
    emissive: FINISH_THEMES[initialTheme].accentHex,
    emissiveIntensity: 1.35,
    roughness: 0.22,
    metalness: 0.1,
  });
  const plinthRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.75, 0.012, 12, 72),
    plinthRingMat
  );
  plinthRing.rotation.x = Math.PI / 2;
  plinthRing.position.y = 0.09;
  plinthGroup.add(plinthRing);

  // Soft radial contact shadow plane directly beneath chassis (polygonOffset prevents Z-fighting)
  const contactShadowTex = createContactShadowTexture();
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.18, 2.38),
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.82,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.095;
  plinthGroup.add(contactShadow);
  scene.add(plinthGroup);

  // Procedural PBR Materials with high roughness/metalness contrast across adjacent parts
  const brushedTex = createBrushedMetalRoughnessTexture(maxAniso);
  const pcbTex = createPcbTexture(maxAniso);
  const grillTex = createMeshGrillTexture(maxAniso);
  let pumpFaceTex = createPumpFaceTexture(FINISH_THEMES[initialTheme].accentHex, maxAniso);

  const materials = {
    chassis: new THREE.MeshPhysicalMaterial({
      color: FINISH_THEMES[initialTheme].chassisColor,
      metalness: FINISH_THEMES[initialTheme].metalness,
      roughness: FINISH_THEMES[initialTheme].roughness,
      roughnessMap: brushedTex,
      clearcoat: 0.25,
      clearcoatRoughness: 0.35,
    }),
    trim: new THREE.MeshStandardMaterial({
      color: FINISH_THEMES[initialTheme].trimColor,
      metalness: 0.72,
      roughness: 0.34,
      roughnessMap: brushedTex,
    }),
    darkMetal: new THREE.MeshStandardMaterial({
      color: 0x131924,
      metalness: 0.55,
      roughness: 0.56,
    }),
    brushedAluminum: new THREE.MeshPhysicalMaterial({
      color: 0xa7b6ca,
      metalness: 0.94,
      roughness: 0.18,
      anisotropy: 0.75,
      roughnessMap: brushedTex,
    }),
    copper: new THREE.MeshStandardMaterial({
      color: 0xd07b47,
      metalness: 0.95,
      roughness: 0.22,
    }),
    pcb: new THREE.MeshStandardMaterial({
      map: pcbTex,
      roughness: 0.62,
      metalness: 0.16,
    }),
    meshGrill: new THREE.MeshStandardMaterial({
      map: grillTex,
      roughness: 0.74,
      metalness: 0.42,
    }),
    fanBlade: new THREE.MeshStandardMaterial({
      color: 0xd0e0f2,
      roughness: 0.28,
      metalness: 0.12,
    }),
    accentEmissive: new THREE.MeshStandardMaterial({
      color: FINISH_THEMES[initialTheme].accentHex,
      emissive: FINISH_THEMES[initialTheme].accentHex,
      emissiveIntensity: 1.7,
      roughness: 0.18,
      metalness: 0.1,
    }),
    secondaryEmissive: new THREE.MeshStandardMaterial({
      color: FINISH_THEMES[initialTheme].secondaryHex,
      emissive: FINISH_THEMES[initialTheme].secondaryHex,
      emissiveIntensity: 1.5,
      roughness: 0.22,
      metalness: 0.1,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xd9ecff,
      metalness: 0.04,
      roughness: 0.06,
      transmission: isSoftwareGl ? 0 : 0.85,
      transparent: true,
      opacity: isSoftwareGl ? 0.28 : 1.0,
      thickness: 0.06,
      ior: 1.52,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      depthWrite: false,
    }),
    cable: new THREE.MeshStandardMaterial({
      color: 0x1d2536,
      roughness: 0.88,
      metalness: 0.06,
    }),
    pumpFace: new THREE.MeshStandardMaterial({
      map: pumpFaceTex,
      emissive: 0xffffff,
      emissiveMap: pumpFaceTex,
      emissiveIntensity: 0.78,
      roughness: 0.16,
      metalness: 0.1,
    }),
  };

  // ───────── Composite Multi-Part Custom PC Rig Assembly ─────────
  const rigRoot = new THREE.Group();
  rigRoot.position.y = 0.09; // Bottom-center pivot grounded flush on plinth top
  scene.add(rigRoot);

  const fanRotors = [];
  const gpuFanRotors = [];
  const explodeTargets = [];

  function registerExplode(obj, offsetVec) {
    explodeTargets.push({
      obj,
      base: obj.position.clone(),
      offset: offsetVec.clone(),
    });
  }

  // 1. CHASSIS STRUCTURAL ASSEMBLY (Beveled ExtrudeGeometry + Turned Lathe Feet + Instanced Screws)
  const chassisGroup = new THREE.Group();
  const caseW = 0.82;
  const caseH = 1.92;
  const caseD = 1.78;
  const baseY = 0.09;

  // Four machined LatheGeometry isolation feet resting flush at y=0
  const turnedFootGeo = createTurnedFootGeometry();
  [
    [-caseW * 0.36, 0, -caseD * 0.4],
    [caseW * 0.36, 0, -caseD * 0.4],
    [-caseW * 0.36, 0, caseD * 0.4],
    [caseW * 0.36, 0, caseD * 0.4],
  ].forEach(([fx, fy, fz]) => {
    const foot = new THREE.Mesh(turnedFootGeo, materials.brushedAluminum);
    foot.position.set(fx, fy, fz);
    foot.castShadow = !isSoftwareGl;
    chassisGroup.add(foot);
  });

  // Bottom floor plate & Top roof plate + magnetic dust mesh
  const bottomPlate = new THREE.Mesh(new THREE.BoxGeometry(caseW, 0.05, caseD), materials.chassis);
  bottomPlate.position.set(0, baseY + 0.025, 0);
  bottomPlate.castShadow = !isSoftwareGl;
  bottomPlate.receiveShadow = !isSoftwareGl;
  chassisGroup.add(bottomPlate);

  const topPlate = new THREE.Mesh(new THREE.BoxGeometry(caseW, 0.055, caseD), materials.chassis);
  topPlate.position.set(0, baseY + caseH - 0.027, 0);
  topPlate.castShadow = !isSoftwareGl;
  chassisGroup.add(topPlate);

  const topMesh = new THREE.Mesh(
    new THREE.BoxGeometry(caseW * 0.72, 0.014, caseD * 0.74),
    materials.meshGrill
  );
  topMesh.position.set(0, baseY + caseH + 0.006, 0.04);
  chassisGroup.add(topMesh);

  // Solid right panel (-X) + internal motherboard steel tray
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.045, caseH, caseD), materials.chassis);
  backWall.position.set(-caseW / 2 + 0.022, baseY + caseH / 2, 0);
  backWall.castShadow = !isSoftwareGl;
  backWall.receiveShadow = !isSoftwareGl;
  chassisGroup.add(backWall);

  const mbTray = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, caseH - 0.42, caseD - 0.18),
    materials.darkMetal
  );
  mbTray.position.set(-caseW / 2 + 0.14, baseY + caseH / 2 + 0.14, -0.02);
  chassisGroup.add(mbTray);

  // Rear I/O steel bulkhead (-Z) + PCIe expansion slot brackets
  const rearPanel = new THREE.Mesh(new THREE.BoxGeometry(caseW, caseH, 0.04), materials.chassis);
  rearPanel.position.set(0, baseY + caseH / 2, -caseD / 2 + 0.02);
  rearPanel.castShadow = !isSoftwareGl;
  chassisGroup.add(rearPanel);

  for (let slot = 0; slot < 6; slot++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.022, 0.048), materials.brushedAluminum);
    bar.position.set(0.06, baseY + 0.52 + slot * 0.065, -caseD / 2 + 0.015);
    chassisGroup.add(bar);
  }

  // Open glass-side corner pillars (+X)
  const frontPillar = new THREE.Mesh(new THREE.BoxGeometry(0.05, caseH, 0.065), materials.trim);
  frontPillar.position.set(caseW / 2 - 0.025, baseY + caseH / 2, caseD / 2 - 0.032);
  chassisGroup.add(frontPillar);

  const rearPillar = new THREE.Mesh(new THREE.BoxGeometry(0.05, caseH, 0.065), materials.trim);
  rearPillar.position.set(caseW / 2 - 0.025, baseY + caseH / 2, -caseD / 2 + 0.032);
  chassisGroup.add(rearPillar);

  // Beveled ExtrudeGeometry Front Intake Frame (+Z) + Recessed Mesh Grill
  const beveledFrontFrame = new THREE.Mesh(
    createBeveledFrontFrameGeometry(caseW - 0.02, caseH - 0.04, 0.075),
    materials.chassis
  );
  beveledFrontFrame.position.set(0, baseY + caseH / 2, caseD / 2 + 0.018);
  beveledFrontFrame.castShadow = !isSoftwareGl;
  chassisGroup.add(beveledFrontFrame);

  const frontMeshInsert = new THREE.Mesh(
    new THREE.BoxGeometry(caseW - 0.14, caseH - 0.16, 0.024),
    materials.meshGrill
  );
  frontMeshInsert.position.set(0, baseY + caseH / 2, caseD / 2 + 0.012);
  chassisGroup.add(frontMeshInsert);

  // Dual vertical front ARGB light pipes
  const frontStripL = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, caseH - 0.18, 0.024),
    materials.accentEmissive
  );
  frontStripL.position.set(-caseW / 2 + 0.04, baseY + caseH / 2, caseD / 2 + 0.044);
  chassisGroup.add(frontStripL);

  const frontStripR = frontStripL.clone();
  frontStripR.position.x = caseW / 2 - 0.04;
  chassisGroup.add(frontStripR);

  // InstancedMesh: 24 precision machined thumbscrews & motherboard standoffs
  const screwGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.018, 10);
  const screwPositions = [];
  // 8 rear panel screws
  for (let i = 0; i < 4; i++) {
    screwPositions.push([-caseW * 0.44, baseY + 0.25 + i * 0.46, -caseD / 2 - 0.004, Math.PI / 2, 0]);
    screwPositions.push([caseW * 0.44, baseY + 0.25 + i * 0.46, -caseD / 2 - 0.004, Math.PI / 2, 0]);
  }
  // 16 top & side structural rivets
  for (let i = 0; i < 8; i++) {
    const zPos = -caseD * 0.42 + i * (caseD * 0.12);
    screwPositions.push([-caseW * 0.44, baseY + caseH + 0.004, zPos, 0, 0]);
    screwPositions.push([caseW * 0.44, baseY + caseH + 0.004, zPos, 0, 0]);
  }
  const screwInstances = new THREE.InstancedMesh(screwGeo, materials.brushedAluminum, screwPositions.length);
  screwPositions.forEach(([x, y, z, rx, rz], idx) => {
    _dummy.position.set(x, y, z);
    _dummy.rotation.set(rx, 0, rz);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    screwInstances.setMatrixAt(idx, _dummy.matrix);
  });
  screwInstances.instanceMatrix.needsUpdate = true;
  screwInstances.computeBoundingSphere();
  chassisGroup.add(screwInstances);

  tagPartGroup(chassisGroup, "chassis");
  rigRoot.add(chassisGroup);

  // 2. REMOVABLE OPTICAL TEMPERED GLASS SIDE PANEL (+X)
  const glassGroup = new THREE.Group();
  const glassPane = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, caseH - 0.14, caseD - 0.14),
    materials.glass
  );
  glassPane.position.set(caseW / 2 - 0.01, baseY + caseH / 2, 0);
  glassPane.renderOrder = 10;
  glassGroup.add(glassPane);

  const borderTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.026, 0.045, caseD - 0.14),
    materials.darkMetal
  );
  borderTop.position.set(caseW / 2 - 0.01, baseY + caseH - 0.092, 0);
  glassGroup.add(borderTop);

  const borderBot = borderTop.clone();
  borderBot.position.y = baseY + 0.092;
  glassGroup.add(borderBot);

  // Four corner glass thumbscrews
  [
    [baseY + 0.12, -caseD / 2 + 0.12],
    [baseY + 0.12, caseD / 2 - 0.12],
    [baseY + caseH - 0.12, -caseD / 2 + 0.12],
    [baseY + caseH - 0.12, caseD / 2 - 0.12],
  ].forEach(([gy, gz]) => {
    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.026, 16),
      materials.brushedAluminum
    );
    knob.rotation.z = Math.PI / 2;
    knob.position.set(caseW / 2 + 0.008, gy, gz);
    glassGroup.add(knob);
  });

  tagPartGroup(glassGroup, "chassis");
  rigRoot.add(glassGroup);
  registerExplode(glassGroup, new THREE.Vector3(0.95, 0, 0));

  // 3. FRONT 3x 120MM ARGB INTAKE FANS GROUP
  const frontFansGroup = new THREE.Group();
  const frontBladeGeo = new THREE.BoxGeometry(0.012, 0.22 * 0.56, 0.22 * 0.24);
  [baseY + 0.42, baseY + 0.94, baseY + 1.46].forEach((fy) => {
    const fan = buildArgbFan(0.22, materials, fanRotors, frontBladeGeo);
    fan.rotation.y = Math.PI / 2;
    fan.position.set(0.04, fy, caseD / 2 - 0.07);
    frontFansGroup.add(fan);
  });
  tagPartGroup(frontFansGroup, "fans");
  rigRoot.add(frontFansGroup);
  registerExplode(frontFansGroup, new THREE.Vector3(0, 0, 0.58));

  // 4. PSU SHROUD & 850W GOLD UNIT + BRAIDED HARNESS
  const psuGroup = new THREE.Group();
  const shroudH = 0.42;
  const shroud = new THREE.Mesh(
    new THREE.BoxGeometry(caseW - 0.1, shroudH, caseD - 0.24),
    materials.trim
  );
  shroud.position.set(-0.02, baseY + 0.05 + shroudH / 2, -0.06);
  shroud.castShadow = !isSoftwareGl;
  shroud.receiveShadow = !isSoftwareGl;
  psuGroup.add(shroud);

  const psuPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.2, 0.56),
    materials.darkMetal
  );
  psuPlate.position.set(caseW / 2 - 0.06, baseY + 0.24, -0.44);
  psuGroup.add(psuPlate);

  const psuStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.026, 0.44),
    materials.secondaryEmissive
  );
  psuStripe.position.set(caseW / 2 - 0.058, baseY + 0.24, -0.44);
  psuGroup.add(psuStripe);

  const cableCurve24 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.22, baseY + 1.16, 0.24),
    new THREE.Vector3(-0.04, baseY + 1.15, 0.36),
    new THREE.Vector3(-0.18, baseY + 1.12, 0.44),
  ]);
  const cable24 = new THREE.Mesh(
    new THREE.TubeGeometry(cableCurve24, 18, 0.024, 10, false),
    materials.cable
  );
  psuGroup.add(cable24);

  tagPartGroup(psuGroup, "psu");
  rigRoot.add(psuGroup);
  registerExplode(psuGroup, new THREE.Vector3(0, -0.35, -0.25));

  // 5. ATX MOTHERBOARD + VRM HEATSINKS + 4x DDR5 RGB RAM DIMMS
  const moboGroup = new THREE.Group();
  const mbX = -caseW / 2 + 0.175;
  const mbY = baseY + 1.14;
  const mbZ = -0.18;

  const pcb = new THREE.Mesh(new THREE.BoxGeometry(0.024, 1.18, 1.02), materials.pcb);
  pcb.position.set(mbX, mbY, mbZ);
  pcb.castShadow = !isSoftwareGl;
  pcb.receiveShadow = !isSoftwareGl;
  moboGroup.add(pcb);

  const ioShroud = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.44, 0.18),
    materials.trim
  );
  ioShroud.position.set(mbX + 0.08, mbY + 0.32, mbZ - 0.39);
  moboGroup.add(ioShroud);

  const vrmTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.1, 0.36),
    materials.brushedAluminum
  );
  vrmTop.position.set(mbX + 0.065, mbY + 0.49, mbZ - 0.08);
  moboGroup.add(vrmTop);

  const pcieSlot = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.032, 0.42),
    materials.brushedAluminum
  );
  pcieSlot.position.set(mbX + 0.03, mbY - 0.18, mbZ - 0.16);
  moboGroup.add(pcieSlot);

  const m2Shield = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.075, 0.34),
    materials.trim
  );
  m2Shield.position.set(mbX + 0.028, mbY - 0.06, mbZ - 0.14);
  moboGroup.add(m2Shield);

  for (let r = 0; r < 4; r++) {
    const rz = mbZ + 0.16 + r * 0.046;
    const dimm = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.42, 0.022),
      materials.darkMetal
    );
    dimm.position.set(mbX + 0.065, mbY + 0.22, rz);
    moboGroup.add(dimm);

    const diffuser = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.41, 0.024),
      materials.accentEmissive
    );
    diffuser.position.set(mbX + 0.125, mbY + 0.22, rz);
    moboGroup.add(diffuser);
  }

  tagPartGroup(moboGroup, "motherboard");
  rigRoot.add(moboGroup);
  registerExplode(moboGroup, new THREE.Vector3(-0.34, 0, 0));

  // 6. FLAGSHIP TRIPLE-FAN RTX-CLASS GPU WITH 36-FIN INSTANCED HEATSINK ARRAY
  const gpuGroup = new THREE.Group();
  const gpuX = mbX + 0.27;
  const gpuY = mbY - 0.2;
  const gpuZ = mbZ + 0.08;
  const gpuLen = 1.06;
  const gpuWidth = 0.46;
  const gpuThick = 0.15;

  // InstancedMesh: 36 precision aluminum cooling fins inside the GPU heatsink
  const gpuFinCount = 36;
  const gpuFinGeo = new THREE.BoxGeometry(gpuWidth - 0.02, gpuThick - 0.032, 0.008);
  const gpuFins = new THREE.InstancedMesh(gpuFinGeo, materials.brushedAluminum, gpuFinCount);
  for (let i = 0; i < gpuFinCount; i++) {
    const fz = gpuZ - (gpuLen * 0.45) + (i / (gpuFinCount - 1)) * (gpuLen * 0.9);
    _dummy.position.set(gpuX, gpuY, fz);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    gpuFins.setMatrixAt(i, _dummy.matrix);
  }
  gpuFins.instanceMatrix.needsUpdate = true;
  gpuFins.computeBoundingSphere();
  gpuGroup.add(gpuFins);

  // Split upper & lower die-cast shroud leaving cooling fins visible along the side
  const gpuShroudBottom = new THREE.Mesh(
    new THREE.BoxGeometry(gpuWidth, 0.044, gpuLen),
    materials.darkMetal
  );
  gpuShroudBottom.position.set(gpuX, gpuY - gpuThick / 2 + 0.012, gpuZ);
  gpuShroudBottom.castShadow = !isSoftwareGl;
  gpuGroup.add(gpuShroudBottom);

  const gpuShroudCapF = new THREE.Mesh(
    new THREE.BoxGeometry(gpuWidth + 0.006, gpuThick, 0.08),
    materials.darkMetal
  );
  gpuShroudCapF.position.set(gpuX, gpuY, gpuZ + gpuLen / 2 - 0.04);
  gpuGroup.add(gpuShroudCapF);

  const gpuShroudCapR = gpuShroudCapF.clone();
  gpuShroudCapR.position.z = gpuZ - gpuLen / 2 + 0.04;
  gpuGroup.add(gpuShroudCapR);

  // Brushed aluminum backplate
  const backplate = new THREE.Mesh(
    new THREE.BoxGeometry(gpuWidth + 0.012, 0.018, gpuLen + 0.012),
    materials.trim
  );
  backplate.position.set(gpuX, gpuY + gpuThick / 2 + 0.008, gpuZ);
  backplate.receiveShadow = !isSoftwareGl;
  gpuGroup.add(backplate);

  // Exposed copper heatpipes along GPU spine
  [-0.028, 0.022].forEach((hy) => {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.013, gpuLen - 0.14, 14),
      materials.copper
    );
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(gpuX + gpuWidth / 2 - 0.006, gpuY + hy, gpuZ);
    gpuGroup.add(pipe);
  });

  // Glowing side lightbar
  const gpuLightbar = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.024, gpuLen * 0.78),
    materials.accentEmissive
  );
  gpuLightbar.position.set(gpuX + gpuWidth / 2 + 0.008, gpuY + 0.046, gpuZ);
  gpuGroup.add(gpuLightbar);

  // 3 underneath axial cooling fans
  const gpuBladeGeo = new THREE.BoxGeometry(0.11, 0.008, 0.036);
  [-0.32, 0, 0.32].forEach((fzOffset) => {
    const rotor = new THREE.Group();
    rotor.position.set(gpuX, gpuY - gpuThick / 2 - 0.014, gpuZ + fzOffset);
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.018, 16),
      materials.brushedAluminum
    );
    rotor.add(hub);
    for (let b = 0; b < 7; b++) {
      const bladePivot = new THREE.Group();
      bladePivot.rotation.y = (b / 7) * Math.PI * 2;
      const blade = new THREE.Mesh(gpuBladeGeo, materials.darkMetal);
      blade.position.x = 0.072;
      blade.rotation.x = 0.35;
      bladePivot.add(blade);
      rotor.add(bladePivot);
    }
    gpuGroup.add(rotor);
    gpuFanRotors.push(rotor);
  });

  // 12VHPWR curved GPU power harness down to PSU shroud
  const gpuCableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(gpuX + gpuWidth / 2 - 0.04, gpuY + 0.02, gpuZ + 0.28),
    new THREE.Vector3(gpuX + gpuWidth / 2 + 0.08, gpuY - 0.14, gpuZ + 0.3),
    new THREE.Vector3(gpuX + 0.08, baseY + 0.45, gpuZ + 0.24),
  ]);
  const gpuCable = new THREE.Mesh(
    new THREE.TubeGeometry(gpuCableCurve, 18, 0.018, 8, false),
    materials.cable
  );
  gpuGroup.add(gpuCable);

  tagPartGroup(gpuGroup, "gpu");
  rigRoot.add(gpuGroup);
  registerExplode(gpuGroup, new THREE.Vector3(0.56, -0.1, 0.16));

  // 7. 360MM AIO LIQUID COOLER (Lathe-Turned IPS Pump + 42-Fin Instanced Radiator + TubeGeometry Hoses)
  const coolingGroup = new THREE.Group();

  const pumpCrown = new THREE.Mesh(createTurnedPumpCrownGeometry(), materials.darkMetal);
  pumpCrown.rotation.z = -Math.PI / 2;
  pumpCrown.position.set(mbX + 0.016, mbY + 0.24, mbZ - 0.08);
  pumpCrown.castShadow = !isSoftwareGl;
  coolingGroup.add(pumpCrown);

  // Machined anodized accent collar around IPS pump face
  const pumpRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.136, 0.009, 12, 36),
    materials.brushedAluminum
  );
  pumpRing.rotation.y = Math.PI / 2;
  pumpRing.position.set(mbX + 0.16, mbY + 0.24, mbZ - 0.08);
  coolingGroup.add(pumpRing);

  const pumpFace = new THREE.Mesh(new THREE.CircleGeometry(0.128, 32), materials.pumpFace);
  pumpFace.rotation.y = Math.PI / 2;
  pumpFace.position.set(mbX + 0.164, mbY + 0.24, mbZ - 0.08);
  coolingGroup.add(pumpFace);

  // Top 360mm Radiator frame + 42-fin InstancedMesh core
  const radSideL = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.095, 1.32), materials.darkMetal);
  radSideL.position.set(0.04 - 0.21, baseY + caseH - 0.11, 0.02);
  coolingGroup.add(radSideL);

  const radSideR = radSideL.clone();
  radSideR.position.x = 0.04 + 0.21;
  coolingGroup.add(radSideR);

  const radFinCount = 42;
  const radFinGeo = new THREE.BoxGeometry(0.4, 0.084, 0.008);
  const radFins = new THREE.InstancedMesh(radFinGeo, materials.brushedAluminum, radFinCount);
  for (let i = 0; i < radFinCount; i++) {
    const fz = -0.6 + (i / (radFinCount - 1)) * 1.24;
    _dummy.position.set(0.04, baseY + caseH - 0.11, fz);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    radFins.setMatrixAt(i, _dummy.matrix);
  }
  radFins.instanceMatrix.needsUpdate = true;
  radFins.computeBoundingSphere();
  coolingGroup.add(radFins);

  // 3 Top Exhaust ARGB Fans mounted beneath radiator
  const topBladeGeo = new THREE.BoxGeometry(0.012, 0.185 * 0.56, 0.185 * 0.24);
  [-0.42, 0.0, 0.42].forEach((fz) => {
    const fan = buildArgbFan(0.185, materials, fanRotors, topBladeGeo);
    fan.rotation.z = -Math.PI / 2;
    fan.position.set(0.04, baseY + caseH - 0.19, fz + 0.02);
    coolingGroup.add(fan);
  });

  // Dual braided coolant hoses via CatmullRomCurve3 + TubeGeometry
  const hose1Curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(mbX + 0.14, mbY + 0.18, mbZ + 0.04),
    new THREE.Vector3(0.24, mbY + 0.24, 0.24),
    new THREE.Vector3(0.22, baseY + caseH - 0.44, 0.46),
    new THREE.Vector3(0.12, baseY + caseH - 0.14, 0.56),
  ]);
  const hose2Curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(mbX + 0.14, mbY + 0.28, mbZ + 0.04),
    new THREE.Vector3(0.2, mbY + 0.38, 0.28),
    new THREE.Vector3(0.16, baseY + caseH - 0.38, 0.52),
    new THREE.Vector3(0.02, baseY + caseH - 0.14, 0.58),
  ]);
  [hose1Curve, hose2Curve].forEach((curve) => {
    const hose = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 28, 0.021, 10, false),
      materials.cable
    );
    hose.castShadow = !isSoftwareGl;
    coolingGroup.add(hose);
  });

  tagPartGroup(coolingGroup, "cooling");
  rigRoot.add(coolingGroup);
  registerExplode(coolingGroup, new THREE.Vector3(0, 0.48, 0));

  // Rear 120mm exhaust fan
  const rearFan = buildArgbFan(0.2, materials, fanRotors);
  rearFan.rotation.y = Math.PI / 2;
  rearFan.position.set(0.02, baseY + 1.38, -caseD / 2 + 0.075);
  tagPartGroup(rearFan, "fans");
  rigRoot.add(rearFan);

  // Pre-warm shaders once on GPU devices
  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // ───────── OrbitControls & Smooth Exponential Damping ─────────
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = isEmbedded ? 2.1 : 1.65;
  controls.maxDistance = isEmbedded ? 6.8 : 8.2;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.target.copy(CAMERA_PRESETS.hero.target);
  controls.update();

  let activeCamTarget = null;
  let activeLookTarget = null;
  let explodeGoal = 0;
  let explodeCurrent = 0;
  let fansSpinning = true;
  let glassVisible = true;
  let currentThemeId = initialTheme;
  let isVisibleInViewport = true;
  let isDisposed = false;

  controls.addEventListener("start", () => {
    // Yield scripted camera fly-to immediately on user interaction
    activeCamTarget = null;
    activeLookTarget = null;
  });

  // ───────── Software-WebGL Paced Loop (afterDraw fenceSync) + GPU 60fps Loop ─────────
  const clock = new THREE.Clock();
  let frameId = 0;
  let loopActive = false;

  function afterDraw(cb) {
    const gl = renderer.getContext();
    if (!gl || typeof gl.fenceSync !== "function") {
      frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (isDisposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  function scheduleNext() {
    if (isDisposed || !isVisibleInViewport) {
      loopActive = false;
      return;
    }
    loopActive = true;
    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }
  }

  function wakeRender() {
    if (isDisposed || !isVisibleInViewport || loopActive) return;
    loopActive = true;
    clock.getDelta();
    frameId = requestAnimationFrame(tick);
  }

  function tick() {
    if (isDisposed || !isVisibleInViewport) {
      loopActive = false;
      return;
    }

    const dt = Math.min(clock.getDelta(), 0.08);
    let keepAnimating = false;

    // Smooth exploded-view exponential damping
    if (Math.abs(explodeCurrent - explodeGoal) > 0.001) {
      explodeCurrent = THREE.MathUtils.damp(explodeCurrent, explodeGoal, 6.5, dt);
      for (let i = 0; i < explodeTargets.length; i++) {
        const item = explodeTargets[i];
        _vec3.copy(item.base).addScaledVector(item.offset, explodeCurrent);
        item.obj.position.copy(_vec3);
      }
      keepAnimating = true;
    }

    // Smooth camera preset fly-to damping
    if (activeCamTarget && activeLookTarget) {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, activeCamTarget.x, 5.5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, activeCamTarget.y, 5.5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, activeCamTarget.z, 5.5, dt);

      controls.target.x = THREE.MathUtils.damp(controls.target.x, activeLookTarget.x, 5.5, dt);
      controls.target.y = THREE.MathUtils.damp(controls.target.y, activeLookTarget.y, 5.5, dt);
      controls.target.z = THREE.MathUtils.damp(controls.target.z, activeLookTarget.z, 5.5, dt);

      if (
        camera.position.distanceTo(activeCamTarget) < 0.015 &&
        controls.target.distanceTo(activeLookTarget) < 0.015
      ) {
        camera.position.copy(activeCamTarget);
        controls.target.copy(activeLookTarget);
        activeCamTarget = null;
        activeLookTarget = null;
      } else {
        keepAnimating = true;
      }
    }

    // Fan blade spin kinematics (elapsed-time driven, identical logic on GPU and software WebGL)
    if (fansSpinning) {
      const spin = dt * 6.8;
      for (let i = 0; i < fanRotors.length; i++) {
        fanRotors[i].rotation.x += spin;
      }
      for (let i = 0; i < gpuFanRotors.length; i++) {
        gpuFanRotors[i].rotation.y += spin * 1.15;
      }
      keepAnimating = true;
    }

    // Subtle slow turntable sway on embedded homepage preview only when user isn't dragging
    if (isEmbedded && !activeCamTarget && !isSoftwareGl) {
      rigRoot.rotation.y += dt * 0.14;
      keepAnimating = true;
    }

    const controlsUpdated = controls.update();
    if (controlsUpdated) keepAnimating = true;

    renderer.render(scene, camera);

    if (keepAnimating) {
      scheduleNext();
    } else {
      loopActive = false;
    }
  }

  controls.addEventListener("change", wakeRender);

  // Pause rendering automatically when scrolled out of viewport (especially for embedded homepage stage)
  let observer = null;
  if (typeof IntersectionObserver !== "undefined") {
    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        isVisibleInViewport = entry.isIntersecting;
        if (isVisibleInViewport) {
          wakeRender();
        } else {
          cancelAnimationFrame(frameId);
          clearTimeout(frameId);
          loopActive = false;
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(container);
  }

  // Click-to-Inspect Raycasting
  const raycaster = new THREE.Raycaster();
  let pointerDownPos = { x: 0, y: 0 };

  renderer.domElement.addEventListener("pointerdown", (e) => {
    pointerDownPos = { x: e.clientX, y: e.clientY };
  });

  renderer.domElement.addEventListener("pointerup", (e) => {
    if (typeof options.onPartSelect !== "function") return;
    const dx = e.clientX - pointerDownPos.x;
    const dy = e.clientY - pointerDownPos.y;
    if (Math.hypot(dx, dy) > 6) return;

    const rect = renderer.domElement.getBoundingClientRect();
    _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(_pointer, camera);
    const hits = raycaster.intersectObjects(rigRoot.children, true);
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      const pid = hit.object && hit.object.userData && hit.object.userData.partId;
      if (pid && PART_SPECS[pid]) {
        if (pid === "chassis" && hits.length > 1) {
          const innerHit = hits.find(
            (h) => h.object && h.object.userData && h.object.userData.partId && h.object.userData.partId !== "chassis"
          );
          if (innerHit) {
            options.onPartSelect(innerHit.object.userData.partId, PART_SPECS[innerHit.object.userData.partId]);
            return;
          }
        }
        options.onPartSelect(pid, PART_SPECS[pid]);
        return;
      }
    }
  });

  // Resize Handler
  function handleResize() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    wakeRender();
  }
  window.addEventListener("resize", handleResize);

  // Clean GPU resource disposal on page unload
  function dispose() {
    isDisposed = true;
    cancelAnimationFrame(frameId);
    clearTimeout(frameId);
    window.removeEventListener("resize", handleResize);
    if (observer) observer.disconnect();
    controls.dispose();
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
    if (envTex) envTex.dispose();
    if (brushedTex) brushedTex.dispose();
    if (pcbTex) pcbTex.dispose();
    if (grillTex) grillTex.dispose();
    if (contactShadowTex) contactShadowTex.dispose();
    if (pumpFaceTex) pumpFaceTex.dispose();
    renderer.dispose();
  }
  window.addEventListener("pagehide", dispose, { once: true });

  // Public controller API for UI wiring
  const api = {
    setCameraPreset(key) {
      const preset = CAMERA_PRESETS[key];
      if (!preset) return;
      activeCamTarget = preset.pos.clone();
      activeLookTarget = preset.target.clone();
      wakeRender();
    },
    setExplode(fraction) {
      explodeGoal = Math.max(0, Math.min(1, Number(fraction) || 0));
      wakeRender();
    },
    setTheme(themeId) {
      const theme = FINISH_THEMES[themeId];
      if (!theme) return;
      currentThemeId = themeId;
      materials.chassis.color.setHex(theme.chassisColor);
      materials.chassis.metalness = theme.metalness;
      materials.chassis.roughness = theme.roughness;
      materials.trim.color.setHex(theme.trimColor);

      materials.accentEmissive.color.setHex(theme.accentHex);
      materials.accentEmissive.emissive.setHex(theme.accentHex);
      materials.secondaryEmissive.color.setHex(theme.secondaryHex);
      materials.secondaryEmissive.emissive.setHex(theme.secondaryHex);
      plinthRingMat.color.setHex(theme.accentHex);
      plinthRingMat.emissive.setHex(theme.accentHex);
      rimLight.color.setHex(theme.accentHex);

      const nextPumpTex = createPumpFaceTexture(theme.accentHex, maxAniso);
      if (pumpFaceTex) pumpFaceTex.dispose();
      pumpFaceTex = nextPumpTex;
      materials.pumpFace.map = pumpFaceTex;
      materials.pumpFace.emissiveMap = pumpFaceTex;
      materials.pumpFace.needsUpdate = true;
      wakeRender();
    },
    toggleGlass() {
      glassVisible = !glassVisible;
      glassGroup.visible = glassVisible;
      wakeRender();
      return glassVisible;
    },
    toggleFans() {
      fansSpinning = !fansSpinning;
      wakeRender();
      return fansSpinning;
    },
    getThemeId() {
      return currentThemeId;
    },
    dispose,
  };

  wakeRender();
  return api;
}

// ───────── 1. Fullscreen 3D PC Hardware Studio (studio-3d.html) ─────────
function initFullscreenStudio() {
  const container = document.getElementById("studio-canvas-wrap");
  if (!container) return;

  const inspectCard = document.getElementById("s3d-inspect-card");
  const partKicker = document.getElementById("s3d-part-kicker");
  const partTitle = document.getElementById("s3d-part-title");
  const partDesc = document.getElementById("s3d-part-desc");
  const partWarranty = document.getElementById("s3d-part-warranty");
  const partPrice = document.getElementById("s3d-part-price");
  const partShopLink = document.getElementById("s3d-part-shop-link");
  const inspectClose = document.getElementById("s3d-inspect-close");

  const toastEl = document.getElementById("s3d-toast");
  let toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }

  const stage = mountPcRigStage(container, {
    embedded: false,
    onPartSelect(_partId, spec) {
      if (!inspectCard || !spec) return;
      if (partKicker) partKicker.textContent = spec.kicker;
      if (partTitle) partTitle.textContent = spec.title;
      if (partDesc) partDesc.textContent = spec.desc;
      if (partWarranty) partWarranty.textContent = spec.warranty;
      if (partPrice) partPrice.textContent = spec.price;
      if (partShopLink) partShopLink.setAttribute("href", spec.link);
      inspectCard.hidden = false;
    },
  });

  if (inspectClose && inspectCard) {
    inspectClose.addEventListener("click", () => {
      inspectCard.hidden = true;
    });
  }

  // Collapsible bottom dock + Keyboard shortcut "H" (Cinema / Zen Mode)
  const dockEl = document.getElementById("s3d-dock");
  const dockToggle = document.getElementById("s3d-dock-toggle");
  const dockChevron = document.getElementById("s3d-dock-chevron");
  const dockLabel = document.getElementById("s3d-dock-label");
  function toggleDock() {
    if (!dockEl || !dockToggle) return;
    const collapsed = dockEl.classList.toggle("is-collapsed");
    dockToggle.setAttribute("aria-expanded", String(!collapsed));
    if (dockChevron) dockChevron.textContent = collapsed ? "keyboard_arrow_up" : "keyboard_arrow_down";
    if (dockLabel) dockLabel.textContent = collapsed ? "Show Controls (H)" : "Hide Controls (H)";
  }
  if (dockToggle) dockToggle.addEventListener("click", toggleDock);
  window.addEventListener("keydown", (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === "h" || e.key === "H") toggleDock();
  });

  // Camera Presets
  const camButtons = document.querySelectorAll("[data-cam]");
  camButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-cam");
      camButtons.forEach((b) => b.classList.toggle("active", b === btn));
      stage.setCameraPreset(key);
    });
  });

  // Exploded View Slider
  const explodeSlider = document.getElementById("s3d-explode-slider");
  const explodeValEl = document.getElementById("s3d-explode-val");
  if (explodeSlider) {
    explodeSlider.addEventListener("input", () => {
      const pct = Number(explodeSlider.value) || 0;
      stage.setExplode(pct / 100);
      if (explodeValEl) explodeValEl.textContent = pct + "%";
    });
  }

  // Finish Theme Swatches
  const swatches = document.querySelectorAll("[data-theme-id]");
  swatches.forEach((s) => {
    s.addEventListener("click", () => {
      const id = s.getAttribute("data-theme-id");
      if (!FINISH_THEMES[id]) return;
      stage.setTheme(id);
      swatches.forEach((b) => b.classList.toggle("active", b === s));
      showToast("Theme: " + FINISH_THEMES[id].label);
    });
  });

  // Glass & Fan Toggles
  const glassBtn = document.getElementById("s3d-toggle-glass");
  if (glassBtn) {
    glassBtn.addEventListener("click", () => {
      const visible = stage.toggleGlass();
      glassBtn.classList.toggle("active", visible);
    });
  }

  const fansBtn = document.getElementById("s3d-toggle-fans");
  if (fansBtn) {
    fansBtn.classList.add("active");
    fansBtn.addEventListener("click", () => {
      const spinning = stage.toggleFans();
      fansBtn.classList.toggle("active", spinning);
    });
  }

  // Quote This Rig button — persists directly to Firestore when signed in via Google
  const quoteRigBtn = document.getElementById("s3d-order-rig-btn");
  if (quoteRigBtn) {
    quoteRigBtn.addEventListener("click", async () => {
      const themeLabel = FINISH_THEMES[stage.getThemeId()].label;
      const summary =
        "3D Studio Custom Rig (" +
        themeLabel +
        "):\n" +
        "1. Aqua Pro Airflow ATX Chassis (" + themeLabel + ") — Rs. 18,500\n" +
        "2. Triple-Fan RTX-Class GPU (FurMark Verified) — Rs. 42,000\n" +
        "3. ATX Motherboard + Quad DDR5 RGB Kit — Rs. 36,500\n" +
        "4. 360mm AIO Liquid Cooler + 3x ARGB Intake Fans — Rs. 28,500\n" +
        "5. 850W 80+ Gold Modular PSU — Rs. 16,500";
      try {
        localStorage.setItem("aqua-3d-rig-preset", summary);
      } catch (_) {}

      if (window.AquaAuth && typeof window.AquaAuth.getUser === "function") {
        if (window.AquaAuth.getUser() && typeof window.AquaAuth.saveCustomQuote === "function") {
          try {
            const ok = await window.AquaAuth.saveCustomQuote({
              title: "3D Studio Custom Rig — " + themeLabel,
              itemCount: 5,
              totalLkr: 142000,
              summary,
              fulfillment: "install",
            });
            if (ok) {
              showToast("3D Rig saved to your Firebase account!");
              window.AquaAuth.openPortal("quotes");
              return;
            }
          } catch (_) {
            showToast("Saved locally. Could not sync to cloud right now.");
          }
        } else {
          showToast("Sign in with Google to save this 3D Rig quote to your account.");
          window.AquaAuth.openLogin("signin");
          return;
        }
      }

      showToast("Rig configuration saved! Opening PC Combo Builder...");
      setTimeout(() => {
        window.location.href = "./index.html#pc-combo-builder";
      }, 650);
    });
  }
}

// ───────── 2. Embedded Interactive 3D Hardware Stage on Storefront (index.html) ─────────
function initHomeEmbeddedStage() {
  const container = document.getElementById("home-3d-stage");
  if (!container) return;

  const badgeTitle = document.getElementById("home-3d-part-title");
  const badgeDesc = document.getElementById("home-3d-part-desc");
  const badgePrice = document.getElementById("home-3d-part-price");
  const badgeLink = document.getElementById("home-3d-part-link");

  const stage = mountPcRigStage(container, {
    embedded: true,
    onPartSelect(_partId, spec) {
      if (!spec) return;
      if (badgeTitle) badgeTitle.textContent = spec.title;
      if (badgeDesc) badgeDesc.textContent = spec.desc;
      if (badgePrice) badgePrice.textContent = spec.price;
      if (badgeLink) badgeLink.setAttribute("href", spec.link);
    },
  });

  // Camera buttons
  document.querySelectorAll("[data-home-cam]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-home-cam");
      document.querySelectorAll("[data-home-cam]").forEach((b) => b.classList.toggle("active", b === btn));
      stage.setCameraPreset(key);
    });
  });

  // Explode toggle
  let exploded = false;
  const explodeBtn = document.getElementById("home-3d-explode-btn");
  if (explodeBtn) {
    explodeBtn.addEventListener("click", () => {
      exploded = !exploded;
      stage.setExplode(exploded ? 0.85 : 0);
      explodeBtn.classList.toggle("active", exploded);
      explodeBtn.textContent = exploded ? "Assemble Rig" : "Exploded View";
    });
  }

  // Theme swatches
  const homeSwatches = document.querySelectorAll("[data-home-theme]");
  homeSwatches.forEach((s) => {
    s.addEventListener("click", () => {
      const id = s.getAttribute("data-home-theme");
      if (!FINISH_THEMES[id]) return;
      stage.setTheme(id);
      homeSwatches.forEach((b) => b.classList.toggle("active", b === s));
    });
  });
}

function boot() {
  initFullscreenStudio();
  initHomeEmbeddedStage();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
