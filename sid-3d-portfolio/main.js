// Year
document.getElementById("year").textContent = new Date().getFullYear();

// Smooth anchor scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener("click", e => {
    const id = a.getAttribute("href");
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    window.scrollTo({ top: el.offsetTop - 60, behavior: "smooth" });
  });
});

// Reveal sections on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add("revealed");
  });
}, { threshold: 0.12 });
document.querySelectorAll(".section").forEach(s => io.observe(s));

// Theme toggle (light/dark accent)
const themeToggle = document.getElementById("themeToggle");
let isAlt = false;
themeToggle.addEventListener("click", () => {
  isAlt = !isAlt;
  document.documentElement.style.setProperty("--accent", isAlt ? "#ffae6c" : "#6cf9ff");
  document.documentElement.style.setProperty("--accent-2", isAlt ? "#ff6cff" : "#8a6cff");
});

// THREE.JS SCENE
let renderer, scene, camera, composer;
let knot, particlesNear, particlesFar, title3D, pointerGlow, clock;
const canvas = document.getElementById("scene");

function init() {
  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Scene and camera
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0b10, 0.06);
  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 0.6, 3.2);

  // Lights
  const hemi = new THREE.HemisphereLight(0x88ccff, 0x223344, 0.7);
  const dir = new THREE.DirectionalLight(0xaaccff, 0.9);
  dir.position.set(2.5, 3, 2.5);
  scene.add(hemi, dir);

  // Torus Knot (hero centerpiece)
  const geo = new THREE.TorusKnotGeometry(0.62, 0.18, 320, 32, 2, 3);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x77ddff,
    metalness: 0.75,
    roughness: 0.22,
    emissive: 0x112233,
    envMapIntensity: 1.0
  });
  knot = new THREE.Mesh(geo, mat);
  knot.position.set(0, 0.5, 0);
  scene.add(knot);

  // Starfield - near layer
  particlesNear = makeStarfield(1400, 3.2, 0x77ffff, 0.024);
  scene.add(particlesNear);

  // Starfield - far layer
  particlesFar = makeStarfield(2200, 8.0, 0x88bbff, 0.018);
  scene.add(particlesFar);

  // 3D Title
  buildTitle3D();

  // Pointer glow (small emissive sphere that follows cursor)
  const glowGeo = new THREE.SphereGeometry(0.06, 24, 24);
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xff66ff,
    emissive: 0xff33aa,
    emissiveIntensity: 1.5,
    metalness: 0.2,
    roughness: 0.4
  });
  pointerGlow = new THREE.Mesh(glowGeo, glowMat);
  pointerGlow.position.set(0, 0.8, 1.4);
  scene.add(pointerGlow);

  // Post-processing bloom
  try {
    const renderPass = new THREE.RenderPass(scene, camera);
    const unrealBloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.9,
      0.65,
      0.02
    );
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(unrealBloomPass);
  } catch (e) {
    composer = null;
  }

  // Subtle entrance animation
  gsap.from(".hero .avatar", { y: 20, opacity: 0, duration: 0.8, ease: "power2.out" });
  gsap.from(".hero h1", { y: 20, opacity: 0, duration: 0.9, delay: 0.1, ease: "power2.out" });
  gsap.from(".hero .subtitle", { y: 20, opacity: 0, duration: 0.9, delay: 0.2, ease: "power2.out" });
  gsap.from(".hero .cta", { y: 20, opacity: 0, duration: 0.9, delay: 0.3, ease: "power2.out" });

  clock = new THREE.Clock();
  animate();
}

function makeStarfield(count, radius, color, size) {
  const g = new THREE.BufferGeometry();
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = radius * (0.6 + Math.random() * 0.6);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = r * Math.cos(theta) * Math.sin(phi);
    const y = r * Math.cos(phi) * 0.7;
    const z = r * Math.sin(theta) * Math.sin(phi);
    arr.set([x, y, z], i * 3);
  }
  g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const m = new THREE.PointsMaterial({
    size,
    color,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });
  return new THREE.Points(g, m);
}

function buildTitle3D() {
  try {
    const loader = new THREE.FontLoader();
    loader.load("https://unpkg.com/three@0.162.0/examples/fonts/helvetiker_regular.typeface.json", (font) => {
      const textGeo = new THREE.TextGeometry("SID", {
        font,
        size: 0.42,
        height: 0.08,
        curveSegments: 8,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelOffset: 0,
        bevelSegments: 2
      });
      textGeo.center();
      const textMat = new THREE.MeshStandardMaterial({
        color: 0x6cf9ff,
        emissive: 0x224455,
        metalness: 0.8,
        roughness: 0.15
      });
      title3D = new THREE.Mesh(textGeo, textMat);
      title3D.position.set(0, 1.35, -0.2);
      scene.add(title3D);
    });
  } catch (e) {
    title3D = null;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // centerpiece motion
  knot.rotation.y = t * 0.25;
  knot.rotation.x = Math.sin(t * 0.4) * 0.1;
  const s = 1 + Math.sin(t * 0.8) * 0.03;
  knot.scale.set(s, s, s);

  // starfields drift parallax
  particlesNear.rotation.y = t * 0.015;
  particlesNear.rotation.x = Math.sin(t * 0.04) * 0.015;
  particlesFar.rotation.y = -t * 0.008;

  // title shimmer
  if (title3D) {
    title3D.rotation.y = Math.sin(t * 0.2) * 0.08;
    title3D.position.y = 1.35 + Math.sin(t * 0.6) * 0.02;
  }

  // pointer glow breathing
  pointerGlow.scale.setScalar(1 + Math.sin(t * 2.0) * 0.08);

  if (composer) composer.render();
  else renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onResize);

// Parallax based on scroll
let lastScroll = window.scrollY;
window.addEventListener("scroll", () => {
  const y = window.scrollY;
  lastScroll = y;
  camera.position.y = 0.6 + Math.min(0.7, y * 0.0006);
  camera.position.z = 3.2 + Math.min(1.2, y * 0.0008);
});

// Mouse interaction
const mouse = new THREE.Vector2();
window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  gsap.to(knot.rotation, { x: mouse.y * 0.2, y: mouse.x * 0.3, duration: 0.6, ease: "power2.out" });

  // pointer glow follows the cursor with slight depth
  const xWorld = mouse.x * 0.8;
  const yWorld = 0.8 + mouse.y * 0.4;
  gsap.to(pointerGlow.position, { x: xWorld, y: yWorld, z: 1.4, duration: 0.4, ease: "power2.out" });
});

// Card hover glow effect
document.querySelectorAll(".card").forEach(card => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mx", `${x}px`);
    card.style.setProperty("--my", `${y}px`);
  });
});

// Kick off
init();