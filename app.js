import { initLiveScene } from "./scene.js";

/* ================= Données (démo) ================= */

const LESSONS = [
  { name: "Léa Martin",     detail: "Permis CE · semi-remorque · Mehdi · Volvo FH", time: "14:00", progress: 78, now: true,  initials: "LM", hue: 214 },
  { name: "Yanis Boudiaf",  detail: "Permis C · porteur · Sarah · Renault T", time: "15:30", progress: 45, now: false, initials: "YB", hue: 224 },
  { name: "Emma Roche",     detail: "Manœuvres plateau · Monssif · Iveco Daily", time: "17:00", progress: 62, now: false, initials: "ER", hue: 204 },
  { name: "Lucas Petit",    detail: "FCO marchandises · Mehdi · salle 2", time: "18:15", progress: 30, now: false, initials: "LP", hue: 234 },
  { name: "Inès Kaci",      detail: "Permis D · voyageurs · Sarah · Man Lion's", time: "19:30", progress: 88, now: false, initials: "IK", hue: 194 },
];

const EXAMS = [
  { day: "22", month: "oct", name: "Léa Martin",    place: "Centre d'examen PL · Évry",      time: "09:20", type: "ce" },
  { day: "23", month: "oct", name: "Hugo Lefèvre",  place: "Plateau PL · Corbeil-Essonnes",  time: "10:40", type: "c"  },
  { day: "24", month: "oct", name: "Sofia Amrani",  place: "Centre d'examen · Brétigny",     time: "14:00", type: "d"  },
  { day: "25", month: "oct", name: "Inès Kaci",     place: "Centre d'examen PL · Évry",      time: "11:10", type: "c"  },
];

const WEEK_HOURS = [
  { label: "lun", value: 24 },
  { label: "mar", value: 31 },
  { label: "mer", value: 28 },
  { label: "jeu", value: 35 },
  { label: "ven", value: 33 },
  { label: "sam", value: 27 },
  { label: "dim", value: 8  },
];

const DONUTS = [
  { label: "Permis C", value: 88, color: "#124483", track: "#e9f1fc" },
  { label: "Permis CE", value: 84, color: "#98c0f1", track: "#e9f1fc" },
  { label: "Permis D", value: 92, color: "#da1f26", track: "#fce9e9" },
];

/* ================= Horloges ================= */

function tickClocks() {
  const now = new Date();
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  document.getElementById("clock").textContent = time;
  document.getElementById("liveClock").textContent = time;
  document.getElementById("todayLabel").textContent = date;
}
tickClocks();
setInterval(tickClocks, 10_000);

/* ================= Compteurs animés ================= */

const fmt = new Intl.NumberFormat("fr-FR");

function animateCounters() {
  document.querySelectorAll(".stat-value").forEach((el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const start = performance.now();
    const dur = 1100;
    const step = (t) => {
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt.format(Math.round(target * eased)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ================= Sparklines ================= */

function renderSparks() {
  document.querySelectorAll(".spark").forEach((svg) => {
    const pts = svg.dataset.spark.split(",").map(Number);
    const max = Math.max(...pts);
    const min = Math.min(...pts);
    const W = 66;
    const H = 24;
    const step = W / (pts.length - 1);
    const coords = pts.map((v, i) => [
      (i * step).toFixed(1),
      (H - 3 - ((v - min) / (max - min || 1)) * (H - 6)).toFixed(1),
    ]);
    const line = coords.map((c) => c.join(",")).join(" ");
    const area = `0,${H} ${line} ${W},${H}`;
    const color = svg.dataset.color;
    const id = `sg-${Math.random().toString(36).slice(2, 8)}`;
    svg.innerHTML = `
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${color}" stop-opacity="0.28"/>
        <stop offset="1" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <polygon points="${area}" fill="url(#${id})"/>
      <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
}

/* ================= Listes ================= */

function renderLessons() {
  const ul = document.getElementById("lessonList");
  ul.innerHTML = LESSONS.map(
    (l) => `
    <li class="lesson-item">
      <div class="avatar" style="background:linear-gradient(135deg,hsl(${l.hue} 62% 38%),hsl(${l.hue} 70% 58%))">${l.initials}</div>
      <div class="lesson-info">
        <strong>${l.name}</strong>
        <small>${l.detail}</small>
        <div class="progress"><div style="width:${l.progress}%"></div></div>
      </div>
      <span class="lesson-time ${l.now ? "now" : ""}">${l.now ? "EN COURS" : l.time}</span>
    </li>`
  ).join("");
}

function renderExams() {
  const ul = document.getElementById("examList");
  ul.innerHTML = EXAMS.map(
    (e) => `
    <li class="exam-item">
      <div class="exam-day"><div><strong>${e.day}</strong><small>${e.month}</small></div></div>
      <div class="exam-info">
        <strong>${e.name}</strong>
        <small>${e.place} · ${e.time}</small>
      </div>
      <span class="exam-badge ${e.type}">Permis ${e.type.toUpperCase()}</span>
    </li>`
  ).join("");
  document.getElementById("examCount").textContent = EXAMS.length;
}

/* ================= Bar chart ================= */

function renderBars() {
  const wrap = document.getElementById("barChart");
  const max = Math.max(...WEEK_HOURS.map((d) => d.value));
  wrap.innerHTML = WEEK_HOURS.map(
    (d) => `
    <div class="bar-col">
      <span class="bar-val">${d.value} h</span>
      <div class="bar ${d.value === max ? "max" : ""}" style="height:0%" data-h="${(d.value / max) * 100}" title="${d.value} heures"></div>
      <span class="bar-label">${d.label}</span>
    </div>`
  ).join("");
  requestAnimationFrame(() =>
    document.querySelectorAll(".bar").forEach((b) => (b.style.height = b.dataset.h + "%"))
  );
}

/* ================= Donuts ================= */

function renderDonuts() {
  const row = document.getElementById("donutRow");
  const R = 52;
  const C = 2 * Math.PI * R;
  row.innerHTML = DONUTS.map((d) => {
    const filled = (d.value / 100) * C;
    return `
    <div class="donut">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r="${R}" fill="none" stroke="${d.track}" stroke-width="13"/>
        <circle cx="64" cy="64" r="${R}" fill="none" stroke="${d.color}" stroke-width="13"
          stroke-linecap="round" stroke-dasharray="0 ${C}" data-target="${filled} ${C - filled}"
          style="transition:stroke-dasharray 1.1s cubic-bezier(.22,1,.36,1)"/>
      </svg>
      <div class="donut-center"><strong>${d.value}%</strong><small>${d.label}</small></div>
    </div>`;
  }).join("");
  requestAnimationFrame(() =>
    row.querySelectorAll("circle[data-target]").forEach((c) =>
      c.setAttribute("stroke-dasharray", c.dataset.target)
    )
  );
}

/* ================= Objectif ================= */

function renderGoal() {
  requestAnimationFrame(() => (document.getElementById("goalFill").style.width = "78%"));
}

/* ================= Scène 3D + contrôles ================= */

let scene = { setCameraPreset() {} };
try {
  scene = initLiveScene(document.getElementById("sceneWrap"), document.getElementById("sceneTooltip"));
} catch (err) {
  console.error("Scène 3D indisponible :", err);
  const wrapEl = document.getElementById("sceneWrap");
  wrapEl.insertAdjacentHTML(
    "beforeend",
    '<div style="position:absolute;inset:0;display:grid;place-items:center;color:#667085;font-size:13px">La vue 3D nécessite WebGL.<br/>Le reste du tableau de bord fonctionne normalement.</div>'
  );
}

let camIndex = 0;
const CAM_COUNT = 4;
const camLabel = document.getElementById("camLabel");

function setCam(i) {
  camIndex = ((i % CAM_COUNT) + CAM_COUNT) % CAM_COUNT;
  camLabel.textContent = `${camIndex + 1}/${CAM_COUNT}`;
  scene.setCameraPreset(camIndex);
}
document.getElementById("camPrev").addEventListener("click", () => setCam(camIndex - 1));
document.getElementById("camNext").addEventListener("click", () => setCam(camIndex + 1));

const wrap = document.getElementById("sceneWrap");
document.getElementById("fullscreenBtn").addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else wrap.requestFullscreen?.();
});

/* ================= Init ================= */

renderLessons();
renderExams();
renderBars();
renderDonuts();
renderGoal();
renderSparks();
animateCounters();
