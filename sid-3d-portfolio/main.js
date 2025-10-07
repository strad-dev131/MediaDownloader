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

// Theme toggle (light/dark accent)
const themeToggle = document.getElementById("themeToggle");
let isAlt = false;
themeToggle.addEventListener("click", () => {
  isAlt = !isAlt;
  document.documentElement.style.setProperty("--accent", isAlt ? "#ffae6c" : "#6cf9ff");
  document.documentElement.style.setProperty("--accent-2", isAlt ? "#ff6cff" : "#8a6cff");
});

// THREE.JS SCENE
let renderer, scene, camera, composer, knot, particles, clock;
const canvas = document.getElementById("scene");

function init() {
  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Scene and camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.6, 3);

  // Lights
  const hemi = new THREE.HemisphereLight(0x88ccff, 0x223344, 0.6);
  const dir = new THREE.DirectionalLight(0xaaccff, 0.8);
  dir.position.set(2, 3, 2);
  scene.add(hemi, dir);

  // Torus Knot (hero centerpiece)
  const geo = new THREE.TorusKnotGeometry(0.6, 0.18, 256, 32, 2, 3);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x77ddff,
    metalness: 0.6,
    roughness: 0.25,
    emissive: 0x223344,
    envMapIntensity: 0.8
  });
  knot = new THREE.Mesh(geo, mat);
  knot.position.set(0, 0.5, 0);
  scene.add(knot);

  // Particle field
  const pCount = 1200;
  const pGeom = new THREE.BufferGeometry();
  const positions = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const r = 5 * Math.random() + 1.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = r * Math.cos(theta) * Math.sin(phi);
    const y = r * Math.cos(phi) * 0.7;
    const z = r * Math.sin(theta) * Math.sin(phi);
    positions.set([x, y, z], i * 3);
  }
  pGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({
    size: 0.02,
    color: 0x66ffff,
    transparent: true,
    opacity: 0.8
  });
  particles = new THREE.Points(pGeom, pMat);
  scene.add(particles);

  // Post-processing bloom
  try {
    const renderPass = new THREE.RenderPass(scene, camera);
    const unrealBloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8, // strength
      0.6, // radius
      0.01 // threshold
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

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  knot.rotation.y = t * 0.25;
  knot.rotation.x = Math.sin(t * 0.4) * 0.1;

  // gentle breathing scale
  const s = 1 + Math.sin(t * 0.8) * 0.03;
  knot.scale.set(s, s, s);

  // particles drift
  particles.rotation.y = t * 0.02;
  particles.rotation.x = Math.sin(t * 0.05) * 0.02;

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
  const delta = y - lastScroll;
  lastScroll = y;
  camera.position.y = 0.6 + Math.min(0.6, y * 0.0006);
  camera.position.z = 3 + Math.min(1.2, y * 0.0008);
});

// Mouse interaction
const mouse = new THREE.Vector2();
window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  gsap.to(knot.rotation, { x: mouse.y * 0.2, y: mouse.x * 0.3, duration: 0.6, ease: "power2.out" });
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