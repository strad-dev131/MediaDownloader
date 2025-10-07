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
let knot, particlesNear, particlesFar, title3D, tagline3D, pointerGlow, holoAvatar, clock;
let bgVideoMesh = null, bgVideoTexture = null;
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

  // Background 3D video plane (behind everything)
  createVideoBackground();

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
  const nearCount = window.innerWidth < 640 ? 700 : 1400;
  particlesNear = makeStarfield(nearCount, 3.2, 0x77ffff, 0.024);
  scene.add(particlesNear);

  // Starfield - far layer
  const farCount = window.innerWidth < 640 ? 1200 : 2200;
  particlesFar = makeStarfield(farCount, 8.0, 0x88bbff, 0.018);
  scene.add(particlesFar);

  // 3D Title and Tagline
  buildTitle3D();
  buildTagline3D();

  // Holographic avatar plane
  buildHologramAvatar();

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
      window.innerWidth < 640 ? 0.75 : 0.95,
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
  const pts = new THREE.Points(g, m);
  pts.renderOrder = 0; // ensure background layer
  return pts;
}

// Create a video texture background plane
function createVideoBackground() {
  try {
    const video = document.createElement("video");
    video.src = "https://cdn.pixabay.com/video/2023/04/11/157267-817306769_large.mp4";
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.style.display = "none";
    document.body.appendChild(video);

    video.addEventListener("canplay", () => {
      video.play().catch(() => {});
      bgVideoTexture = new THREE.VideoTexture(video);
      bgVideoTexture.colorSpace = THREE.SRGBColorSpace;
      bgVideoTexture.minFilter = THREE.LinearFilter;
      bgVideoTexture.magFilter = THREE.LinearFilter;
      const mat = new THREE.MeshBasicMaterial({ map: bgVideoTexture, depthWrite: false });
      const geo = new THREE.PlaneGeometry(1, 1);
      bgVideoMesh = new THREE.Mesh(geo, mat);
      bgVideoMesh.position.set(0, 0.5, -5);
      bgVideoMesh.renderOrder = -1; // behind everything
      scene.add(bgVideoMesh);
      onResize(); // fit to viewport
    });
  } catch (e) {
    // if video fails, we simply rely on the starfields
    bgVideoMesh = null;
  }
}

function buildTitle3D() {
  try {
    const loader = new THREE.FontLoader();
    loader.load("https://unpkg.com/three@0.162.0/examples/fonts/helvetiker_bold.typeface.json", (font) => {
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
        metalness: 0.85,
        roughness: 0.12
      });
      title3D = new THREE.Mesh(textGeo, textMat);
      title3D.position.set(0, 1.28, -0.2);
      scene.add(title3D);
    });
  } catch (e) {
    title3D = null;
  }
}

function buildTagline3D() {
  try {
    const loader = new THREE.FontLoader();
    loader.load("https://unpkg.com/three@0.162.0/examples/fonts/helvetiker_regular.typeface.json", (font) => {
      const tg = new THREE.TextGeometry("Team Leadership • Web Bot Dev • Ethical Hacking", {
        font,
        size: 0.12,
        height: 0.02,
        curveSegments: 6,
        bevelEnabled: false
      });
      tg.center();
      const mat = new THREE.MeshStandardMaterial({
        color: 0x88eaff,
        emissive: 0x123344,
        metalness: 0.6,
        roughness: 0.35
      });
      tagline3D = new THREE.Mesh(tg, mat);
      tagline3D.position.set(0, 0.98, 0.1);
      tagline3D.renderOrder = 2;
      scene.add(tagline3D);
    });
  } catch (e) {
    tagline3D = null;
  }
}

function buildHologramAvatar() {
  const texLoader = new THREE.TextureLoader();
  texLoader.setCrossOrigin("anonymous");
  texLoader.load("https://aboutsid.netlify.app/avatar.svg", (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    const plane = new THREE.PlaneGeometry(0.9, 0.9, 1, 1);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: tex },
        time: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vFresnel;
        void main() {
          vUv = uv;
          vec3 N = normalize(normalMatrix * normal);
          vec3 I = normalize(normalMatrix * (vec3(0.0, 0.0, 1.0)));
          vFresnel = pow(1.0 - dot(N, I), 3.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        varying vec2 vUv;
        varying float vFresnel;

        // simple rgb shift
        vec3 rgbShift(vec2 uv, float amt) {
          float a = amt;
          float r = texture2D(tDiffuse, uv + vec2(a, 0.0)).r;
          float g = texture2D(tDiffuse, uv).g;
          float b = texture2D(tDiffuse, uv - vec2(a, 0.0)).b;
          return vec3(r, g, b);
        }

        void main() {
          float scan = 0.06 * sin((vUv.y * 60.0) + time * 6.0);
          float flicker = 0.05 * sin(time * 12.0);
          float noise = fract(sin(dot(vUv.xy ,vec2(12.9898,78.233))) * 43758.5453) * 0.03;

          vec3 col = rgbShift(vUv, 0.003 + 0.002 * sin(time * 4.0));
          col += scan + flicker + noise;

          // holographic tint
          vec3 tint = vec3(0.6, 1.0, 1.0);
          col = mix(col, col * tint, 0.35);

          // fresnel rim glow
          col += vFresnel * vec3(0.3, 0.5, 0.8);

          gl_FragColor = vec4(col, 0.92);
        }
      `,
      transparent: true,
      depthWrite: false
    });
    holoAvatar = new THREE.Mesh(plane, mat);
    holoAvatar.position.set(-1.2, 0.95, 0.2);
    holoAvatar.rotation.y = 0.12;
    scene.add(holoAvatar);
  });
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
  if (particlesNear) {
    particlesNear.rotation.y = t * 0.015;
    particlesNear.rotation.x = Math.sin(t * 0.04) * 0.015;
  }
  if (particlesFar) {
    particlesFar.rotation.y = -t * 0.008;
  }

  // title shimmer
  if (title3D) {
    title3D.rotation.y = Math.sin(t * 0.2) * 0.08;
    title3D.position.y = 1.28 + Math.sin(t * 0.6) * 0.02;
  }
  // tagline pulsing and hue shift effect
  if (tagline3D) {
    tagline3D.rotation.z = Math.sin(t * 0.3) * 0.02;
    tagline3D.position.y = 0.98 + Math.sin(t * 0.9) * 0.01;
    const hue = (Math.sin(t * 0.5) * 0.5 + 0.5); // 0..1
    const c = new THREE.Color().setHSL(0.55 + hue * 0.1, 0.8, 0.6);
    tagline3D.material.color.copy(c);
  }

  // pointer glow breathing
  if (pointerGlow) pointerGlow.scale.setScalar(1 + Math.sin(t * 2.0) * 0.08);

  // hologram shader time
  if (holoAvatar && holoAvatar.material && holoAvatar.material.uniforms) {
    holoAvatar.material.uniforms.time.value = t;
  }

  // update background video texture if present
  if (bgVideoTexture) {
    bgVideoTexture.needsUpdate = true;
  }

  if (composer) composer.render();
  else renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);

  // fit bg video plane to viewport aspect
  if (bgVideoMesh) {
    const aspect = window.innerWidth / window.innerHeight;
    const height = 10; // fixed height in world units
    const width = height * aspect;
    bgVideoMesh.scale.set(width, height, 1);
    bgVideoMesh.position.set(0, 0.5, -5);
  }

  // responsive positioning
  const isMobile = window.innerWidth < 640;
  if (title3D) title3D.position.set(0, isMobile ? 1.18 : 1.28, -0.2);
  if (tagline3D) tagline3D.position.set(0, isMobile ? 0.92 : 0.98, 0.1);
  if (holoAvatar) {
    holoAvatar.position.set(isMobile ? -0.6 : -1.2, isMobile ? 0.85 : 0.95, 0.2);
    holoAvatar.scale.setScalar(isMobile ? 0.8 : 1);
  }
}
window.addEventListener("resize", onResize);

// Parallax based on scroll
let lastScroll = window.scrollY;
window.addEventListener("scroll", () => {
  const y = window.scrollY;
  lastScroll = y;
  camera.position.y = 0.6 + Math.min(0.7, y * 0.0006);
  camera.position.z = 3.2 + Math.min(1.2, y * 0.0008);

  // subtle bg video parallax
  if (bgVideoMesh) {
    bgVideoMesh.position.z = -5 - Math.min(1.0, y * 0.0006);
  }
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