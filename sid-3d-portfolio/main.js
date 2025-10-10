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
let knot, particlesNear, particlesFar, title3D, tagline3D, pointerGlow, pointerTrail, holoAvatar, orbitersInst, orbitersData, rings, clock;
let trailGeom, trailPositions, trailMax;
let bgVideoMesh = null, bgVideoTexture = null;
const canvas = document.getElementById("scene");
const dummy = new THREE.Object3D();
const heroEl = document.querySelector(".hero-content");
const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

function init() {
  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio)); // slightly lower for smoother start on mobile
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Make canvas transparent so HTML video shows through
  renderer.setClearColor(0x000000, 0);

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

  // Extra 3D elements
  createGlowRings();
  createOrbiters();
  createPointerTrail();

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

// Create a video texture background plane (uses the HTML video element as source)
function createVideoBackground() {
  try {
    const video = document.getElementById("bgVideo");
    if (!video) return;

    const localSrc = "./assets/video/background.mp4?v=" + Date.now(); // cache-bust local
    const fallbackSrc = "https://cdn.pixabay.com/video/2023/04/11/157267-817306769_large.mp4";

    // ensure playback on mobile
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;

    // explicitly prefer local upload and start loading
    video.src = localSrc;
    if (video.load) video.load();

    const tryPlay = () => {
      if (video.paused) {
        video.play().catch(() => {});
      }
    };

    // Attempt immediate playback and on user interaction/visibility changes
    tryPlay();
    document.addEventListener("pointerdown", tryPlay);
    document.addEventListener("touchstart", tryPlay, { passive: true });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) tryPlay(); });

    // Timeout fallback: if the local source doesn't become ready, switch to CDN
    const fallbackTimer = setTimeout(() => {
      if (video.readyState < 2) {
        video.crossOrigin = "anonymous";
        video.src = fallbackSrc;
        if (video.load) video.load();
        tryPlay();
      }
    }, 1500);

    const setupTexture = () => {
      if (bgVideoTexture) return;
      clearTimeout(fallbackTimer);
      tryPlay();

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
    };

    if (video.readyState >= 2) {
      setupTexture();
    } else {
      video.addEventListener("canplay", setupTexture, { once: true });
      video.addEventListener("canplaythrough", setupTexture, { once: true });
      video.addEventListener("playing", setupTexture, { once: true });
      video.addEventListener("loadeddata", setupTexture, { once: true });
      video.addEventListener("loadedmetadata", setupTexture, { once: true });
      // also catch error/stall and switch to fallback then set up texture
      const useFallbackAndSetup = () => {
        clearTimeout(fallbackTimer);
        video.crossOrigin = "anonymous";
        video.src = fallbackSrc;
        if (video.load) video.load();
        video.addEventListener("canplay", setupTexture, { once: true });
        tryPlay();
      };
      video.addEventListener("error", useFallbackAndSetup, { once: true });
      video.addEventListener("stalled", useFallbackAndSetup, { once: true });
      video.addEventListener("emptied", useFallbackAndSetup, { once: true });
    }
  } catch (e) {
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

  const sources = [
    "./assets/images/avatar.png",
    "./assets/images/avatar.jpg",
    "https://api.dicebear.com/7.x/bottts/png?seed=Sid&size=512&backgroundType=gradient&backgroundColor=6cf9ff,8a6cff"
  ];

  const buildMesh = (tex) => {
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
  };

  // Try local PNG, then local JPG, then DiceBear
  const tryLoad = (i = 0) => {
    if (i >= sources.length) return;
    texLoader.load(sources[i], (tex) => {
      buildMesh(tex);
    }, undefined, () => {
      tryLoad(i + 1);
    });
  };
  tryLoad(0);
}

// Glow rings around the centerpiece
function createGlowRings() {
  rings = [];
  const colors = [0x6cf9ff, 0x8a6cff, 0x9af0ff];
  const radii = [0.95, 1.25, 1.6];
  const thickness = [0.015, 0.012, 0.010];
  for (let i = 0; i < radii.length; i++) {
    const geo = new THREE.TorusGeometry(radii[i], thickness[i], 16, 100);
    const mat = new THREE.MeshBasicMaterial({
      color: colors[i],
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.5;
    rings.push(ring);
    scene.add(ring);
  }
}

// Instanced orbiting shapes for extra 3D motion
function createOrbiters() {
  const count = window.innerWidth < 640 ? 120 : 240;
  const geo = new THREE.IcosahedronGeometry(0.05, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x9af0ff,
    emissive: 0x223344,
    metalness: 0.7,
    roughness: 0.32
  });
  orbitersInst = new THREE.InstancedMesh(geo, mat, count);
  orbitersData = [];
  for (let i = 0; i < count; i++) {
    const radius = 1.1 + Math.random() * 0.9;
    const speed = 0.2 + Math.random() * 0.4;
    const yAmp = 0.12 + Math.random() * 0.22;
    const angle = Math.random() * Math.PI * 2;
    orbitersData.push({ radius, speed, yAmp, angle });
    dummy.position.set(
      Math.cos(angle) * radius,
      0.5 + Math.sin(angle) * yAmp,
      Math.sin(angle) * radius
    );
    dummy.rotation.set(Math.random() * 0.6, Math.random() * 0.6, Math.random() * 0.6);
    dummy.updateMatrix();
    orbitersInst.setMatrixAt(i, dummy.matrix);
  }
  scene.add(orbitersInst);
}

// Pointer trail particles
function createPointerTrail() {
  trailMax = window.innerWidth < 640 ? 48 : 80;
  trailPositions = new Float32Array(trailMax * 3);
  trailGeom = new THREE.BufferGeometry();
  trailGeom.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x88eaff,
    size: 0.035,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  pointerTrail = new THREE.Points(trailGeom, mat);
  pointerTrail.renderOrder = 3;
  scene.add(pointerTrail);
}

function pushTrail(x, y, z) {
  if (!trailPositions) return;
  for (let i = trailMax - 1; i > 0; i--) {
    trailPositions[i * 3] = trailPositions[(i - 1) * 3];
    trailPositions[i * 3 + 1] = trailPositions[(i - 1) * 3 + 1];
    trailPositions[i * 3 + 2] = trailPositions[(i - 1) * 3 + 2];
  }
  trailPositions[0] = x;
  trailPositions[1] = y;
  trailPositions[2] = z;
  if (trailGeom) trailGeom.attributes.position.needsUpdate = true;
}

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // centerpiece motion
  knot.rotation.y = t * 0.25;
  knot.rotation.x = Math.sin(t * 0.4) * 0.1;
  const s = 1 + Math.sin(t * 0.8) * 0.03;
  knot.scale.set(s, s, s);

  // glow rings animate
  if (rings && rings.length) {
    rings.forEach((ring, i) => {
      ring.rotation.y = t * (0.12 + i * 0.08);
      ring.rotation.z = Math.sin(t * (0.25 + i * 0.14)) * 0.25;
      ring.scale.setScalar(1 + Math.sin(t * (0.9 + i * 0.2)) * 0.02);
    });
  }

  // orbiters motion
  if (orbitersInst && orbitersData) {
    for (let i = 0; i < orbitersData.length; i++) {
      const d = orbitersData[i];
      const ang = d.angle + t * d.speed;
      dummy.position.set(
        Math.cos(ang) * d.radius,
        0.5 + Math.sin(t * 2.0 + i) * d.yAmp,
        Math.sin(ang) * d.radius
      );
      dummy.rotation.set(
        Math.sin(t + i) * 0.6,
        Math.cos(t * 0.7 + i) * 0.6,
        Math.sin(t * 0.5 + i) * 0.6
      );
      dummy.updateMatrix();
      orbitersInst.setMatrixAt(i, dummy.matrix);
    }
    orbitersInst.instanceMatrix.needsUpdate = true;
  }

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

  // pointer glow follows the cursor with slight depth and ripple
  const xWorld = mouse.x * 0.8;
  const yWorld = 0.8 + mouse.y * 0.4;
  gsap.to(pointerGlow.position, { x: xWorld, y: yWorld, z: 1.4, duration: 0.4, ease: "power2.out" });
  if (pointerGlow) {
    gsap.fromTo(pointerGlow.scale, { x: 1, y: 1, z: 1 }, { x: 1.2, y: 1.2, z: 1.2, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" });
  }

  // hero tilt based on cursor (desktop only)
  if (heroEl && !isTouchDevice) {
    const tiltY = mouse.x * 6;     // left/right
    const tiltX = mouse.y * -5;    // up/down
    heroEl.style.transform = `rotateY(${tiltY}deg) rotateX(${tiltX}deg) translateZ(0)`;
  }

  // leave a particle trail
  pushTrail(xWorld, yWorld, 1.4);
});
window.addEventListener("mouseleave", () => {
  if (heroEl) heroEl.style.transform = "none";
});

// Card hover glow + 3D tilt effect
document.querySelectorAll(".card").forEach(card => {
  const onMove = (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mx", `${x}px`);
    card.style.setProperty("--my", `${y}px`);

    // 3D tilt
    const nx = (x / rect.width) * 2 - 1;   // -1..1
    const ny = (y / rect.height) * 2 - 1;  // -1..1
    const rotY = nx * 6;   // left/right
    const rotX = -ny * 6;  // up/down
    card.style.transform = `rotateY(${rotY}deg) rotateX(${rotX}deg)`;
  };
  card.addEventListener("mousemove", onMove);
  card.addEventListener("mouseleave", () => {
    card.style.transform = "none";
  });
});

// Fallback: ensure sections are visible if IntersectionObserver does not trigger
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".section").forEach(s => s.classList.add("revealed"));
});

// Kick off
init();