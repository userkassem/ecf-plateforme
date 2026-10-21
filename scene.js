import * as THREE from "three";

/* ============================================================
   Vue en direct — agence ECF Montgeron (poids lourds)
   3D isométrique low-poly : semi-remorque, porteurs, plateau
   ============================================================ */

const COLORS = {
  ground: 0xe9eef6,
  road: 0xd8dfec,
  sidewalk: 0xf5f8fd,
  line: 0xffffff,
  building: 0xffffff,
  glass: 0xc0d9f6,
  ecfBlue: 0x124483,
  ecfRed: 0xda1f26,
  cone: 0xf36f30,
  tree: 0x8fce6e,
  treeDark: 0x6fb455,
  trunk: 0x9c7b5f,
  bush: 0xa5d98a,
  skin: 0xf2c9a0,
};

const ECF_BLUE = "#124483";
const ECF_RED = "#DA1F26";

/* ---------- helpers ---------- */

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, ...opts });
}

function box(w, h, d, color, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rTop, rBottom, h, color, radial = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, radial), mat(color));
  m.castShadow = true;
  return m;
}

function canvasTexture(draw, w = 512, h = 256) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function addWheels(group, positions, r = 0.3) {
  const geo = new THREE.CylinderGeometry(r, r, 0.24, 16);
  const m = mat(0x2b3440, { roughness: 0.9 });
  const wheels = [];
  positions.forEach(([x, z]) => {
    const w = new THREE.Mesh(geo, m);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, r, z);
    w.castShadow = true;
    group.add(w);
    wheels.push(w);
  });
  group.userData.wheels = wheels;
}

/* phares avant (blancs) + feux arrière (rouges) */
function addLights(group, frontX, rearX, y, halfWidth) {
  const frontMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffedb0, emissiveIntensity: 1.1 });
  const rearMat = new THREE.MeshStandardMaterial({ color: 0xd6454d, emissive: 0xff2d20, emissiveIntensity: 0.9 });
  [-halfWidth, halfWidth].forEach((z) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.22), frontMat);
    f.position.set(frontX, y, z);
    group.add(f);
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.22), rearMat);
    r.position.set(rearX, y, z);
    group.add(r);
  });
}

/* ---------- semi-remorque ---------- */

function makeSemi({ cabColor = 0xffffff, ecf = false } = {}) {
  const g = new THREE.Group();

  // cabine
  const cab = box(1.7, 1.5, 1.5, cabColor, { roughness: 0.55 });
  cab.position.set(2.55, 1.05, 0);
  g.add(cab);
  const windshield = box(0.6, 0.55, 1.3, 0x1c2b3a, { roughness: 0.3 });
  windshield.position.set(3.05, 1.45, 0);
  g.add(windshield);
  const spoiler = box(0.9, 0.35, 1.35, cabColor, { roughness: 0.55 });
  spoiler.position.set(2.35, 1.95, 0);
  g.add(spoiler);

  // remorque (avec livrée ECF sur les flancs)
  let trailerMat;
  if (ecf) {
    const sideTex = canvasTexture((ctx, w, h) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.font = "900 130px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = ECF_BLUE;
      ctx.fillText("ECF", w / 2, h * 0.48);
      ctx.fillStyle = ECF_RED;
      ctx.fillRect(w / 2 - 120, h * 0.54, 240, 14);
      ctx.fillStyle = "#5b7ba6";
      ctx.font = "600 34px Arial";
      ctx.fillText("FORMATION POIDS LOURDS", w / 2, h * 0.78);
    }, 1024, 256);
    const side = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.6 });
    const plain = mat(0xffffff, { roughness: 0.6 });
    trailerMat = [plain, plain, plain, plain, side, side]; // faces ±z = flancs
  } else {
    trailerMat = mat(0xf2f5fa, { roughness: 0.6 });
  }
  const trailer = new THREE.Mesh(new THREE.BoxGeometry(4.9, 1.9, 1.55), trailerMat);
  trailer.position.set(-0.85, 1.5, 0);
  trailer.castShadow = true;
  g.add(trailer);
  const trailerChassis = box(4.7, 0.25, 1.2, 0x39404d);
  trailerChassis.position.set(-0.85, 0.5, 0);
  g.add(trailerChassis);

  addWheels(g, [
    [3.1, 0.72], [3.1, -0.72],
    [1.7, 0.72], [1.7, -0.72],
    [-2.1, 0.72], [-2.1, -0.72],
    [-2.9, 0.72], [-2.9, -0.72],
  ], 0.32);
  addLights(g, 3.42, -3.32, 0.85, 0.55);
  return g;
}

/* ---------- porteur (camion rigide) ---------- */

function makePorteur({ cabColor = 0x124483, bodyColor = 0xf2f5fa } = {}) {
  const g = new THREE.Group();
  const cab = box(1.3, 1.25, 1.45, cabColor, { roughness: 0.55 });
  cab.position.set(2.15, 0.92, 0);
  g.add(cab);
  const windshield = box(0.45, 0.45, 1.25, 0x1c2b3a, { roughness: 0.3 });
  windshield.position.set(2.55, 1.25, 0);
  g.add(windshield);
  const cargo = box(3.4, 1.7, 1.5, bodyColor, { roughness: 0.6 });
  cargo.position.set(-0.35, 1.25, 0);
  g.add(cargo);
  const chassis = box(4.6, 0.25, 1.15, 0x39404d);
  chassis.position.set(0, 0.42, 0);
  g.add(chassis);
  addWheels(g, [
    [1.9, 0.68], [1.9, -0.68],
    [-1.3, 0.68], [-1.3, -0.68],
  ], 0.3);
  addLights(g, 2.82, -2.07, 0.75, 0.5);
  return g;
}

/* ---------- plot de manœuvre ---------- */

function makeCone() {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.48, 12), mat(COLORS.cone, { roughness: 0.6 }));
  cone.position.y = 0.24;
  cone.castShadow = true;
  g.add(cone);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.15, 0.1, 12), mat(0xffffff));
  stripe.position.y = 0.26;
  g.add(stripe);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), mat(COLORS.cone));
  base.position.y = 0.03;
  g.add(base);
  return g;
}

/* ---------- personnage ---------- */

function makePerson(shirt = 0x124483, pants = 0x39404d) {
  const p = new THREE.Group();
  const body = cyl(0.22, 0.26, 0.62, shirt, 12);
  body.position.y = 0.75;
  p.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), mat(COLORS.skin));
  head.position.y = 1.28;
  head.castShadow = true;
  p.add(head);
  const legL = box(0.14, 0.45, 0.16, pants);
  legL.position.set(0, 0.225, 0.09);
  const legR = legL.clone();
  legR.position.z = -0.09;
  p.add(legL, legR);
  p.userData.legs = [legL, legR];
  return p;
}

/* ---------- arbre ---------- */

function makeTree(scale = 1, color = COLORS.tree) {
  const t = new THREE.Group();
  const trunk = cyl(0.09, 0.12, 0.55, COLORS.trunk, 8);
  trunk.position.y = 0.28;
  t.add(trunk);
  const fol = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), mat(color, { roughness: 0.9, flatShading: true }));
  fol.position.y = 0.95;
  fol.castShadow = true;
  t.add(fol);
  t.scale.setScalar(scale);
  return t;
}

/* ============================================================
   Initialisation
   ============================================================ */

export function initLiveScene(container, tooltipEl) {
  const scene = new THREE.Scene();
  scene.background = null;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  /* ----- caméra orthographique (isométrique) ----- */
  const FRUSTUM = 11.5;
  let aspect = 1;
  const camera = new THREE.OrthographicCamera(-FRUSTUM, FRUSTUM, FRUSTUM, -FRUSTUM, 1, 200);
  const camTarget = new THREE.Vector3(0.5, 0, 1);

  const CAM_PRESETS = [
    new THREE.Vector3(16, 14, 16),
    new THREE.Vector3(-16, 14, 16),
    new THREE.Vector3(0, 20, 12),
    new THREE.Vector3(15, 11, -14),
  ];
  let presetPos = CAM_PRESETS[0].clone();
  let azimuthOffset = 0;
  camera.position.copy(presetPos);
  camera.lookAt(camTarget);

  function applyFrustum() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    aspect = w / h;
    camera.left = -FRUSTUM * aspect;
    camera.right = FRUSTUM * aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  applyFrustum();
  new ResizeObserver(applyFrustum).observe(container);

  /* ----- lumières ----- */
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdde6f2, 0.85));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.6);
  sun.position.set(14, 22, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.radius = 5;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  /* ----- socle diorama (île flottante) ----- */
  function roundedRectShape(w, d, r) {
    const s = new THREE.Shape();
    const x = -w / 2;
    const y = -d / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x + w, y + d - r);
    s.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2, false);
    s.lineTo(x + r, y + d);
    s.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x, y + r);
    s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  }
  const slabGeo = new THREE.ExtrudeGeometry(roundedRectShape(38, 20, 2.5), { depth: 1.1, bevelEnabled: false });
  slabGeo.rotateX(-Math.PI / 2);
  const slab = new THREE.Mesh(slabGeo, [
    mat(0xeef2f8, { roughness: 1 }),   // dessus / dessous
    mat(0xc7d3e6, { roughness: 1 }),   // tranche
  ]);
  slab.position.y = -1.1;
  slab.receiveShadow = true;
  scene.add(slab);

  // ombre portée douce sous l'île
  const blobTex = canvasTexture((ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(20,40,80,0.32)");
    g.addColorStop(1, "rgba(20,40,80,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, 256, 256);
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(54, 30),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = -1.6;
  scene.add(blob);

  /* ----- nuages bas-poly qui dérivent ----- */
  const clouds = [];
  function makeCloud(scale = 1) {
    const g = new THREE.Group();
    const m = mat(0xffffff, { roughness: 1, flatShading: true });
    const puff1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), m);
    puff1.scale.set(1.5, 0.65, 1);
    const puff2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), m);
    puff2.position.set(0.95, 0.18, 0.15);
    puff2.scale.set(1.2, 0.7, 1);
    const puff3 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), m);
    puff3.position.set(-0.9, 0.1, -0.1);
    puff3.scale.set(1.1, 0.65, 1);
    g.add(puff1, puff2, puff3);
    g.scale.setScalar(scale);
    return g;
  }
  [
    { pos: [-13, 6.8, -7], s: 1.25, v: 0.35 },
    { pos: [4, 7.6, -9], s: 0.9, v: 0.5 },
    { pos: [13, 6.2, -5], s: 0.7, v: 0.42 },
    { pos: [-4, 8.2, -11], s: 1.05, v: 0.28 },
  ].forEach((d) => {
    const c = makeCloud(d.s);
    c.position.set(...d.pos);
    scene.add(c);
    clouds.push({ obj: c, v: d.v });
  });

  const hoverables = [];
  function registerHover(obj, label, sub = "") {
    obj.userData.hoverLabel = label;
    obj.userData.hoverSub = sub;
    hoverables.push(obj);
  }

  /* ----- route principale (2 voies, axe X) ----- */
  const road = new THREE.Mesh(new THREE.PlaneGeometry(38, 4.6), mat(COLORS.road, { roughness: 1 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.01, 6.4);
  road.receiveShadow = true;
  scene.add(road);

  for (let x = -17; x <= 17; x += 2.2) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.14), mat(COLORS.line));
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x, 0.02, 6.4);
    scene.add(dash);
  }

  const sidewalk = new THREE.Mesh(new THREE.PlaneGeometry(38, 2.4), mat(COLORS.sidewalk, { roughness: 1 }));
  sidewalk.rotation.x = -Math.PI / 2;
  sidewalk.position.set(0, 0.015, 3.1);
  sidewalk.receiveShadow = true;
  scene.add(sidewalk);

  /* ----- parc PL (4 places, 2 occupées) ----- */
  const parking = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 6.2), mat(0xe3e9f4, { roughness: 1 }));
  parking.rotation.x = -Math.PI / 2;
  parking.position.set(-9.2, 0.012, -0.9);
  parking.receiveShadow = true;
  scene.add(parking);

  for (let i = 0; i <= 4; i++) {
    const spot = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 5.6), mat(COLORS.line));
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(-13.4 + i * 2.6, 0.02, -0.9);
    scene.add(spot);
  }

  const parked1 = makePorteur({ cabColor: 0x124483 });
  parked1.position.set(-12.1, 0, -0.9);
  parked1.rotation.y = -Math.PI / 2;
  scene.add(parked1);
  const parked2 = makePorteur({ cabColor: 0xda1f26 });
  parked2.position.set(-9.5, 0, -0.9);
  parked2.rotation.y = -Math.PI / 2;
  scene.add(parked2);
  registerHover(parking, "🚛 Parc poids lourds", "2/4 places dispo");

  /* ----- bâtiment ECF ----- */
  const school = new THREE.Group();

  const mainBlock = box(9, 3.4, 5.4, COLORS.building);
  mainBlock.position.set(0, 1.7, 0);
  school.add(mainBlock);

  const glass = box(8.2, 1.5, 0.15, COLORS.glass, { roughness: 0.15, metalness: 0.4 });
  glass.position.set(0, 1.05, 2.72);
  school.add(glass);

  const door = box(1.3, 1.9, 0.1, 0x2b3440, { roughness: 0.4 });
  door.position.set(-2.9, 0.95, 2.76);
  school.add(door);

  const signTex = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = ECF_BLUE;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 120px Arial";
    ctx.textAlign = "center";
    ctx.fillText("ECF", w / 2, h * 0.52);
    ctx.fillStyle = ECF_RED;
    ctx.fillRect(w / 2 - 120, h * 0.58, 240, 16);
    ctx.fillStyle = "#cfe1f7";
    ctx.font = "600 30px Arial";
    ctx.fillText("ÉCOLE DE CONDUITE FRANÇAISE", w / 2, h * 0.85);
  }, 1024, 320);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.35, 0.25), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5 }));
  sign.position.set(0, 2.85, 2.62);
  sign.castShadow = true;
  school.add(sign);

  const matRed = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), mat(ECF_RED));
  matRed.rotation.x = -Math.PI / 2;
  matRed.position.set(-2.9, 0.03, 3.6);
  school.add(matRed);

  school.position.set(3.2, 0, -3.4);
  scene.add(school);
  registerHover(school, "🏢 Agence ECF Montgeron", "Accueil · Sarah & Mehdi");

  /* ----- accueil : 2 personnes devant ----- */
  const staff1 = makePerson(0xffffff, 0x124483);
  staff1.position.set(1.2, 0, 3.3);
  const staff2 = makePerson(0xda1f26, 0x39404d);
  staff2.position.set(2.1, 0, 3.6);
  staff2.rotation.y = -0.5;
  school.add(staff1, staff2);
  registerHover(staff1, "👋 Sarah", "Accueil & inscriptions");
  registerHover(staff2, "👋 Mehdi", "Moniteur PL · Permis C/CE");

  /* ----- plateau de manœuvres (6 plots) ----- */
  const plateau = new THREE.Group();
  const conePositions = [
    [-4.4, 1.7], [-2.4, 1.7], [-0.4, 1.7],
    [-4.4, 3.0], [-2.4, 3.0], [-0.4, 3.0],
  ];
  conePositions.forEach(([x, z]) => {
    const c = makeCone();
    c.position.set(x, 0, z);
    plateau.add(c);
  });
  scene.add(plateau);
  registerHover(plateau, "🟠 Plateau manœuvres", "6 plots · créneaux & quais");

  // porteur qui s'entraîne sur le plateau (navette lente)
  const traineeTruck = makePorteur({ cabColor: 0x98c0f1 });
  scene.add(traineeTruck);
  registerHover(traineeTruck, "🚛 Emma · manœuvres", "Permis C · quai de déchargement");

  /* ----- camions en circulation ----- */
  const ecfTruck = makeSemi({ ecf: true });
  scene.add(ecfTruck);
  registerHover(ecfTruck, "🚛 Semi école ECF", "Léa · Permis CE · leçon en cours");

  const blueTruck = makePorteur({ cabColor: 0x124483, bodyColor: 0xc0d9f6 });
  scene.add(blueTruck);

  // trajectoire : boucle avec demi-tours arrondis
  const path = new THREE.CurvePath();
  path.add(new THREE.LineCurve3(new THREE.Vector3(-15, 0, 5.2), new THREE.Vector3(15, 0, 5.2)));
  path.add(new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(15, 0, 5.2),
    new THREE.Vector3(16.4, 0, 6.4),
    new THREE.Vector3(15, 0, 7.6)
  ));
  path.add(new THREE.LineCurve3(new THREE.Vector3(15, 0, 7.6), new THREE.Vector3(-15, 0, 7.6)));
  path.add(new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-15, 0, 7.6),
    new THREE.Vector3(-16.4, 0, 6.4),
    new THREE.Vector3(-15, 0, 5.2)
  ));

  function drive(vehicle, t) {
    const u = ((t % 1) + 1) % 1;
    const pos = path.getPointAt(u);
    const tan = path.getTangentAt(u);
    vehicle.position.set(pos.x, 0, pos.z);
    vehicle.rotation.y = Math.atan2(tan.x, tan.z) - Math.PI / 2;
  }

  /* ----- piétons ----- */
  const walkers = [];
  const walkerDefs = [
    { from: new THREE.Vector3(-6, 0, 3.6), to: new THREE.Vector3(6, 0, 3.6), shirt: 0x98c0f1, speed: 0.9, label: "🚶 Yanis", sub: "Permis C · leçon 15h30" },
    { from: new THREE.Vector3(9, 0, 3.6), to: new THREE.Vector3(-2, 0, 3.6), shirt: 0x7fb069, speed: 0.7, label: "🚶 Lucas", sub: "FCO · salle 2 · 18h15" },
    { from: new THREE.Vector3(5, 0, 4.2), to: new THREE.Vector3(1, 0, 1.6), shirt: 0xf2a65a, speed: 0.55, label: "🚶 Inès", sub: "Examen permis D le 25/10 🤞" },
  ];
  walkerDefs.forEach((d) => {
    const p = makePerson(d.shirt);
    scene.add(p);
    registerHover(p, d.label, d.sub);
    walkers.push({ ...d, obj: p, t: Math.random() });
  });

  /* ----- végétation ----- */
  const trees = [];
  [
    [-14.5, -5.5, 1.1],
    [-14.2, 2.8, 0.85],
    [9.5, 2.2, 0.95],
    [12.8, -6.2, 1.25],
    [-2.5, -7.8, 1.0],
  ].forEach(([x, z, s], i) => {
    const t = makeTree(s, i % 2 ? COLORS.treeDark : COLORS.tree);
    t.position.set(x, 0, z);
    scene.add(t);
    trees.push(t);
  });

  [-0.4, 5.6, 7.9].forEach((x) => {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), mat(COLORS.bush, { flatShading: true, roughness: 0.9 }));
    b.position.set(x, 0.3, 0.2);
    b.castShadow = true;
    scene.add(b);
  });

  /* ----- caméra de surveillance (décor) ----- */
  const camPole = cyl(0.05, 0.05, 2.6, 0x9aa4b5, 8);
  camPole.position.set(-5.8, 1.3, 4.4);
  const camHead = box(0.4, 0.18, 0.18, 0x39404d);
  camHead.position.set(-5.8, 2.65, 4.4);
  scene.add(camPole, camHead);
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0xff2d20, emissive: 0xff2d20, emissiveIntensity: 2 });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), beaconMat);
  beacon.position.set(-5.8, 2.82, 4.4);
  scene.add(beacon);

  /* ============================================================
     Interactions : hover tooltip + drag orbit
     ============================================================ */

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-2, -2);
  let mouseX = 0;
  let mouseY = 0;
  let dragging = false;
  let lastX = 0;

  container.addEventListener("pointermove", (e) => {
    const rect = container.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    if (dragging) {
      azimuthOffset += (e.clientX - lastX) * 0.004;
      lastX = e.clientX;
    }
  });

  container.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
  });
  window.addEventListener("pointerup", () => (dragging = false));
  container.addEventListener("pointerleave", () => {
    pointer.set(-2, -2);
    tooltipEl.classList.remove("visible");
  });

  function findHoverRoot(obj) {
    let cur = obj;
    while (cur) {
      if (cur.userData.hoverLabel) return cur;
      cur = cur.parent;
    }
    return null;
  }

  /* ============================================================
     Boucle d'animation
     ============================================================ */

  const clock = new THREE.Clock();
  const desiredPos = new THREE.Vector3();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // camions sur la route
    drive(ecfTruck, t * 0.011);
    drive(blueTruck, t * 0.011 + 0.5);
    [ecfTruck, blueTruck].forEach((v) =>
      v.userData.wheels?.forEach((w) => (w.rotation.y -= 0.08))
    );

    // nuages : dérive lente avec boucle
    clouds.forEach((c) => {
      c.obj.position.x += c.v * 0.016;
      if (c.obj.position.x > 26) c.obj.position.x = -26;
    });

    // arbres : léger balancement
    trees.forEach((tr, i) => {
      tr.rotation.z = Math.sin(t * 0.9 + i * 1.3) * 0.035;
    });

    // balise de la caméra : clignotement
    beaconMat.emissiveIntensity = 1.6 + Math.sin(t * 4.5) * 1.4;

    // porteur en manœuvre : navette lente entre les plots
    const shuttle = (Math.sin(t * 0.35) + 1) / 2;
    traineeTruck.position.set(THREE.MathUtils.lerp(-3.9, -0.9, shuttle), 0, 2.35);
    traineeTruck.rotation.y = Math.cos(t * 0.35) >= 0 ? Math.PI : 0;
    traineeTruck.userData.wheels?.forEach((w) => (w.rotation.y -= 0.04));

    // piétons (aller-retour + balancement des jambes)
    walkers.forEach((w, i) => {
      const k = (Math.sin(t * w.speed + i * 2) + 1) / 2;
      w.obj.position.lerpVectors(w.from, w.to, k);
      w.obj.position.y = Math.abs(Math.sin(t * 6 + i)) * 0.04;
      const dir = Math.cos(t * w.speed + i * 2) >= 0 ? 1 : -1;
      const look = dir > 0 ? w.to : w.from;
      w.obj.rotation.y = Math.atan2(look.x - w.obj.position.x, look.z - w.obj.position.z);
      const [l, r] = w.obj.userData.legs;
      l.rotation.x = Math.sin(t * 7 + i) * 0.55;
      r.rotation.x = -Math.sin(t * 7 + i) * 0.55;
    });

    staff1.rotation.y = Math.sin(t * 0.8) * 0.25;
    staff2.rotation.y = -0.5 + Math.sin(t * 0.7 + 1) * 0.2;

    // caméra : preset + offset azimuthal (drag)
    desiredPos.copy(presetPos).sub(camTarget);
    desiredPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), azimuthOffset);
    desiredPos.add(camTarget);
    camera.position.lerp(desiredPos, 0.06);
    camera.lookAt(camTarget);

    // hover
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(hoverables, true);
    const root = hits.length ? findHoverRoot(hits[0].object) : null;
    if (root) {
      tooltipEl.innerHTML = `${root.userData.hoverLabel}${root.userData.hoverSub ? `<small>${root.userData.hoverSub}</small>` : ""}`;
      tooltipEl.style.left = mouseX + "px";
      tooltipEl.style.top = mouseY + "px";
      tooltipEl.classList.add("visible");
      container.style.cursor = dragging ? "grabbing" : "pointer";
    } else {
      tooltipEl.classList.remove("visible");
      container.style.cursor = dragging ? "grabbing" : "grab";
    }

    renderer.render(scene, camera);
  }
  animate();

  /* ----- API ----- */
  return {
    setCameraPreset(i) {
      presetPos = CAM_PRESETS[i % CAM_PRESETS.length].clone();
      azimuthOffset = 0;
    },
  };
}
