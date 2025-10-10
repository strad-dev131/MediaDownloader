// Year in footer or wherever #year exists
(function () {
  var yEl = document.getElementById("year");
  if (yEl) yEl.textContent = String(new Date().getFullYear());
})();

// Anchor navigation: smooth scroll respecting CSS scroll-margin-top
(function () {
  var links = document.querySelectorAll('.site-header nav a[href^="#"]');
  links.forEach(function (a) {
    a.addEventListener(
      "click",
      function (e) {
        var id = a.getAttribute("href");
        var el = id && document.querySelector(id);
        if (!el) return;
        e.preventDefault();
        if (el.scrollIntoView) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          var header = document.querySelector(".site-header");
          var headerH = header ? header.offsetHeight : 64;
          var rect = el.getBoundingClientRect();
          var targetY = rect.top + window.pageYOffset - headerH - 8;
          window.scrollTo({ top: targetY, behavior: "smooth" });
        }
      },
      { passive: false }
    );
  });
})();

// Reveal sections on scroll
(function () {
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add("revealed");
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".section").forEach(function (s) {
    io.observe(s);
  });
})();

// Theme toggle with persistence
var themeToggle = document.getElementById("themeToggle");

function updateAccentVisuals() {
  // Sync glow material to current accent; trail stays strictly blue
  try {
    var accent = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim();
    if (accent && pointerGlow && pointerGlow.material) {
      var c = new THREE.Color(accent);
      pointerGlow.material.color = c;
      pointerGlow.material.emissive = c;
    }
  } catch (_) {}
}

function applyTheme(theme) {
  var isAlt = theme === "alt";
  if (isAlt) document.documentElement.setAttribute("data-theme", "alt");
  else document.documentElement.removeAttribute("data-theme");

  // inline accents for immediate feedback (CSS handles rest)
  document.documentElement.style.setProperty("--accent", isAlt ? "#ffae6c" : "#6cf9ff");
  document.documentElement.style.setProperty("--accent-2", isAlt ? "#ff6cff" : "#8a6cff");

  if (themeToggle) themeToggle.textContent = isAlt ? "Theme: Alt" : "Theme";
  updateAccentVisuals();
}

// Initialize theme from localStorage
(function () {
  try {
    var stored = localStorage.getItem("theme");
    applyTheme(stored === "alt" ? "alt" : "default");
  } catch (_) {
    applyTheme("default");
  }
})();

// Toggle and persist
if (themeToggle) {
  themeToggle.addEventListener("click", function () {
    var isAltNow = document.documentElement.getAttribute("data-theme") === "alt";
    var next = isAltNow ? "default" : "alt";
    applyTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch (_) {}
  });
}

// THREE.JS SCENE
var renderer, scene, camera, composer;
var knot, particlesNear, particlesFar, title3D, tagline3D, pointerGlow, pointerTrail, holoAvatar, orbitersInst, orbitersData, rings, clock;
var trailGeom, trailPositions, trailMax;
var cursorParticles, cursorGeom, cursorMat, cursorMax = 180, cursorList = [];
var bgVideoMesh = null, bgVideoTexture = null;
var canvas = document.getElementById("scene");
var dummy = new THREE.Object3D();
var heroEl = document.querySelector(".hero-content");
var isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
var paused = false;
var firstRenderDone = false;
var lastT = 0;
document.addEventListener("visibilitychange", function () {
  paused = document.hidden;
});

function init() {
  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  var isMobileViewport = window.matchMedia("(max-width: 640px)").matches || isTouchDevice;
  var basePR = isMobileViewport ? 1.0 : Math.min(1.5, window.devicePixelRatio);
  renderer.setPixelRatio(basePR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0); // transparent

  // Scene and camera
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0b10, 0.06);
  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 0.6, 3.2);

  // Background 3D video plane (behind everything)
  createVideoBackground();

  // Lights
  var hemi = new THREE.HemisphereLight(0x88ccff, 0x223344, 0.7);
  var dir = new THREE.DirectionalLight(0xaaccff, 0.9);
  dir.position.set(2.5, 3, 2.5);
  scene.add(hemi, dir);

  // Torus Knot (hero centerpiece)
  var geo = new THREE.TorusKnotGeometry(0.62, 0.18, 320, 32, 2, 3);
  var mat = new THREE.MeshStandardMaterial({
    color: 0x77ddff,
    metalness: 0.75,
    roughness: 0.22,
    emissive: 0x112233,
    envMapIntensity: 1.0,
  });
  knot = new THREE.Mesh(geo, mat);
  knot.position.set(0, 0.5, 0);
  scene.add(knot);

  // Starfield - near layer
  var nearCount = isMobileViewport ? 300 : 900;
  particlesNear = makeStarfield(nearCount, 3.2, 0x77ffff, 0.022);
  scene.add(particlesNear);

  // Starfield - far layer
  var farCount = isMobileViewport ? 600 : 1400;
  particlesFar = makeStarfield(farCount, 8.0, 0x88bbff, 0.016);
  scene.add(particlesFar);

  // Pointer glow (small emissive sphere that follows cursor)
  var glowGeo = new THREE.SphereGeometry(0.06, 24, 24);
  var glowMat = new THREE.MeshStandardMaterial({
    color: 0x6cf9ff,
    emissive: 0x2a7bff,
    emissiveIntensity: 1.5,
    metalness: 0.2,
    roughness: 0.4,
  });
  pointerGlow = new THREE.Mesh(glowGeo, glowMat);
  pointerGlow.position.set(0, 0.8, 1.4);
  scene.add(pointerGlow);

  // Glow rings
  createGlowRings();

  // Heavier extras after first paint
  scheduleHeavy();

  // Post-processing
  schedulePostProcessing();

  // Entrance animations (if gsap available)
  if (typeof gsap !== "undefined") {
    gsap.from(".hero .avatar", { y: 20, opacity: 0, duration: 0.8, ease: "power2.out" });
    gsap.from(".hero h1", { y: 20, opacity: 0, duration: 0.9, delay: 0.1, ease: "power2.out" });
    gsap.from(".hero .subtitle", { y: 20, opacity: 0, duration: 0.9, delay: 0.2, ease: "power2.out" });
    gsap.from(".hero .cta", { y: 20, opacity: 0, duration: 0.9, delay: 0.3, ease: "power2.out" });
  }

  clock = new THREE.Clock();
  animate();
}

function makeStarfield(count, radius, color, size) {
  var g = new THREE.BufferGeometry();
  var arr = new Float32Array(count * 3);
  for (var i = 0; i < count; i++) {
    var r = radius * (0.6 + Math.random() * 0.6);
    var theta = Math.random() * Math.PI * 2;
    var phi = Math.acos(2 * Math.random() - 1);
    var x = r * Math.cos(theta) * Math.sin(phi);
    var y = r * Math.cos(phi) * 0.7;
    var z = r * Math.sin(theta) * Math.sin(phi);
    arr[i * 3] = x;
    arr[i * 3 + 1] = y;
    arr[i * 3 + 2] = z;
  }
  g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  var m = new THREE.PointsMaterial({
    size: size,
    color: color,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  var pts = new THREE.Points(g, m);
  pts.renderOrder = 0; // background layer
  return pts;
}

// Create a video texture background plane (uses the HTML video element as source)
function createVideoBackground() {
  try {
    var video = document.getElementById("bgVideo");
    if (!video) return;

    var fallbackSrc = "https://cdn.pixabay.com/video/2023/04/11/157267-817306769_large.mp4";

    // mobile-friendly autoplay
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute("webkit-playsinline", "true");
    if (video.load) video.load();

    var tryPlay = function () {
      if (video.paused) {
        video.play().catch(function () {});
      }
    };

    tryPlay();
    document.addEventListener("pointerdown", tryPlay, { once: true });
    document.addEventListener("touchstart", tryPlay, { passive: true, once: true });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) tryPlay();
    });
    video.addEventListener("playing", function () {
      document.body.classList.add("video-playing");
    }, { once: true });

    var fallbackTimer = setTimeout(function () {
      if (video.readyState < 2) {
        video.crossOrigin = "anonymous";
        video.src = fallbackSrc;
        if (video.load) video.load();
        tryPlay();
      }
    }, 600);

    var setupTexture = function () {
      if (bgVideoTexture) return;
      clearTimeout(fallbackTimer);
      tryPlay();

      bgVideoTexture = new THREE.VideoTexture(video);
      bgVideoTexture.colorSpace = THREE.SRGBColorSpace;
      bgVideoTexture.minFilter = THREE.LinearFilter;
      bgVideoTexture.magFilter = THREE.LinearFilter;

      var mat = new THREE.MeshBasicMaterial({ map: bgVideoTexture, depthWrite: false });
      var geo = new THREE.PlaneGeometry(1, 1);
      bgVideoMesh = new THREE.Mesh(geo, mat);
      bgVideoMesh.position.set(0, 0.5, -5);
      bgVideoMesh.renderOrder = -1; // behind everything
      scene.add(bgVideoMesh);
      onResize(); // fit to viewport
    };

    if (video.readyState >= 2) {
      setupTexture();
    } else {
      ["canplay", "canplaythrough", "playing", "loadeddata", "loadedmetadata"].forEach(function (evt) {
        video.addEventListener(evt, setupTexture, { once: true });
      });
      var useFallbackAndSetup = function () {
        clearTimeout(fallbackTimer);
        video.crossOrigin = "anonymous";
        video.src = fallbackSrc;
        if (video.load) video.load();
        video.addEventListener("canplay", setupTexture, { once: true });
        tryPlay();
      };
      ["error", "stalled", "emptied"].forEach(function (evt) {
        video.addEventListener(evt, useFallbackAndSetup, { once: true });
      });
    }
  } catch (e) {
    bgVideoMesh = null;
  }
}

function buildTitle3D() {
  try {
    var loader = new THREE.FontLoader();
    loader.load("https://unpkg.com/three@0.162.0/examples/fonts/helvetiker_bold.typeface.json", function (font) {
      var textGeo = new THREE.TextGeometry("SID", {
        font: font,
        size: 0.42,
        height: 0.08,
        curveSegments: 8,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelOffset: 0,
        bevelSegments: 2,
      });
      textGeo.center();
      var textMat = new THREE.MeshStandardMaterial({
        color: 0x6cf9ff,
        emissive: 0x224455,
        metalness: 0.85,
        roughness: 0.12,
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
    var loader = new THREE.FontLoader();
    loader.load("https://unpkg.com/three@0.162.0/examples/fonts/helvetiker_regular.typeface.json", function (font) {
      var tg = new THREE.TextGeometry("Team Leadership • Web Bot Dev • Ethical Hacking", {
        font: font,
        size: 0.12,
        height: 0.02,
        curveSegments: 6,
        bevelEnabled: false,
      });
      tg.center();
      var mat = new THREE.MeshStandardMaterial({
        color: 0x88eaff,
        emissive: 0x123344,
        metalness: 0.6,
        roughness: 0.35,
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
  var texLoader = new THREE.TextureLoader();
  texLoader.setCrossOrigin("anonymous");

  var sources = [
    "./assets/images/avatar.png",
    "./assets/images/avatar.jpg",
    "https://api.dicebear.com/7.x/bottts/png?seed=Sid&size=512&backgroundType=gradient&backgroundColor=6cf9ff,8a6cff",
  ];

  function buildMesh(tex) {
    tex.colorSpace = THREE.SRGBColorSpace;
    var plane = new THREE.PlaneGeometry(0.9, 0.9, 1, 1);
    var mat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: tex }, time: { value: 0.0 } },
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

          vec3 tint = vec3(0.6, 1.0, 1.0);
          col = mix(col, col * tint, 0.35);

          col += vFresnel * vec3(0.3, 0.5, 0.8);

          gl_FragColor = vec4(col, 0.92);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    holoAvatar = new THREE.Mesh(plane, mat);
    holoAvatar.position.set(-1.2, 0.95, 0.2);
    holoAvatar.rotation.y = 0.12;
    scene.add(holoAvatar);
  }

  function tryLoad(i) {
    if (i >= sources.length) return;
    texLoader.load(sources[i], function (tex) { buildMesh(tex); }, undefined, function () { tryLoad(i + 1); });
  }
  tryLoad(0);
}

// Glow rings around the centerpiece
function createGlowRings() {
  rings = [];
  var colors = [0x6cf9ff, 0x8a6cff, 0x9af0ff];
  var radii = [0.95, 1.25, 1.6];
  var thickness = [0.014, 0.011, 0.009];
  for (var i = 0; i < radii.length; i++) {
    var geo = new THREE.TorusGeometry(radii[i], thickness[i], 16, 60);
    var mat = new THREE.MeshBasicMaterial({
      color: colors[i],
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    var ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.5;
    rings.push(ring);
    scene.add(ring);
  }
}

// Instanced orbiting shapes
function createOrbiters() {
  var count = (window.matchMedia("(max-width: 640px)").matches || isTouchDevice) ? 70 : 160;
  var geo = new THREE.IcosahedronGeometry(0.05, 0);
  var mat = new THREE.MeshStandardMaterial({
    color: 0x9af0ff,
    emissive: 0x223344,
    metalness: 0.7,
    roughness: 0.32,
  });
  orbitersInst = new THREE.InstancedMesh(geo, mat, count);
  orbitersData = [];
  for (var i = 0; i < count; i++) {
    var radius = 1.1 + Math.random() * 0.9;
    var speed = 0.2 + Math.random() * 0.4;
    var yAmp = 0.12 + Math.random() * 0.22;
    var angle = Math.random() * Math.PI * 2;
    orbitersData.push({ radius: radius, speed: speed, yAmp: yAmp, angle: angle });
    dummy.position.set(Math.cos(angle) * radius, 0.5 + Math.sin(angle) * yAmp, Math.sin(angle) * radius);
    dummy.rotation.set(Math.random() * 0.6, Math.random() * 0.6, Math.random() * 0.6);
    dummy.updateMatrix();
    orbitersInst.setMatrixAt(i, dummy.matrix);
  }
  scene.add(orbitersInst);
}

// Pointer trail particles (fixed neon blue)
function createPointerTrail() {
  var isMobile = window.innerWidth < 640 || isTouchDevice;
  trailMax = isMobile ? 48 : 90;
  trailPositions = new Float32Array(trailMax * 3);
  trailGeom = new THREE.BufferGeometry();
  trailGeom.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
  var mat = new THREE.PointsMaterial({
    color: new THREE.Color(0x66ccff),
    size: isMobile ? 0.035 : 0.06,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  pointerTrail = new THREE.Points(trailGeom, mat);
  pointerTrail.renderOrder = 3;
  scene.add(pointerTrail);
}

function pushTrail(x, y, z) {
  if (!trailPositions) return;
  for (var i = trailMax - 1; i > 0; i--) {
    trailPositions[i * 3] = trailPositions[(i - 1) * 3];
    trailPositions[i * 3 + 1] = trailPositions[(i - 1) * 3 + 1];
    trailPositions[i * 3 + 2] = trailPositions[(i - 1) * 3 + 2];
  }
  trailPositions[0] = x;
  trailPositions[1] = y;
  trailPositions[2] = z;
  if (trailGeom) trailGeom.attributes.position.needsUpdate = true;
}

// Blue cursor particle bursts (ephemeral)
function createCursorParticles() {
  cursorGeom = new THREE.BufferGeometry();
  cursorGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(cursorMax * 3), 3));
  cursorGeom.setDrawRange(0, 0);

  cursorMat = new THREE.PointsMaterial({
    color: 0x56b7ff,
    size: (window.innerWidth < 640 || isTouchDevice) ? 0.025 : 0.04,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  cursorParticles = new THREE.Points(cursorGeom, cursorMat);
  cursorParticles.renderOrder = 4;
  scene.add(cursorParticles);
}

function spawnCursorParticles(x, y, z, count) {
  for (var i = 0; i < count; i++) {
    var speed = 0.5 + Math.random() * 1.1;
    var vx = (Math.random() - 0.5) * 0.6 * speed;
    var vy = (Math.random() - 0.5) * 0.6 * speed;
    var vz = (Math.random() - 0.5) * 0.8 * speed;
    cursorList.push({ x: x, y: y, z: z, vx: vx, vy: vy, vz: vz, life: 0.8 + Math.random() * 0.6 });
    if (cursorList.length > cursorMax) cursorList.shift();
  }
}

function updateCursorParticles(dt) {
  if (!cursorGeom) return;
  var pos = cursorGeom.attributes.position.array;
  var alive = 0;
  for (var i = 0; i < cursorList.length; i++) {
    var p = cursorList[i];
    p.life -= dt;
    if (p.life <= 0) continue;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.vz *= 0.96;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;

    pos[alive * 3] = p.x;
    pos[alive * 3 + 1] = p.y;
    pos[alive * 3 + 2] = p.z;
    alive++;
  }
  cursorGeom.setDrawRange(0, alive);
  cursorGeom.attributes.position.needsUpdate = true;

  if (cursorList.length && alive < cursorList.length) {
    cursorList = cursorList.filter(function (p) { return p.life > 0; });
  }
}

// Schedule bloom post-processing after initial paint for faster load
function schedulePostProcessing() {
  var cb = function () {
    var lowPower = window.matchMedia("(max-width: 640px)").matches || isTouchDevice;
    if (lowPower) { composer = null; return; }
    try {
      var renderPass = new THREE.RenderPass(scene, camera);
      var unrealBloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.8,
        0.6,
        0.02
      );
      composer = new THREE.EffectComposer(renderer);
      composer.addPass(renderPass);
      composer.addPass(unrealBloomPass);
    } catch (e) {
      composer = null;
    }
  };
  if ("requestIdleCallback" in window) requestIdleCallback(cb, { timeout: 1000 });
  else setTimeout(cb, 250);
}

// Heavier assets after first paint
function scheduleHeavy() {
  var exec = function () {
    try {
      buildTitle3D();
      buildTagline3D();
      buildHologramAvatar();
      createOrbiters();
      createPointerTrail();
      createCursorParticles();
    } catch (_) {}
  };
  if ("requestIdleCallback" in window) requestIdleCallback(exec, { timeout: 700 });
  else setTimeout(exec, 100);
}

function animate() {
  requestAnimationFrame(animate);
  if (paused) return;
  var t = clock.getElapsedTime();
  var dt = Math.min(0.05, t - lastT);
  lastT = t;

  // centerpiece motion
  var baseRotY = t * 0.25;
  var baseRotX = Math.sin(t * 0.4) * 0.1;
  knot.rotation.y = THREE.MathUtils.lerp(knot.rotation.y, baseRotY + (mouse.x || 0) * 0.18, 0.08);
  knot.rotation.x = THREE.MathUtils.lerp(knot.rotation.x, baseRotX + (mouse.y || 0) * 0.12, 0.08);
  var s = 1 + Math.sin(t * 0.8) * 0.03;
  knot.scale.set(s, s, s);

  // rings animate (every other frame)
  if (rings && rings.length && (Math.floor(t * 60) % 2 === 0)) {
    rings.forEach(function (ring, i) {
      ring.rotation.y = t * (0.12 + i * 0.08);
      ring.rotation.z = Math.sin(t * (0.25 + i * 0.14)) * 0.25;
      ring.scale.setScalar(1 + Math.sin(t * (0.9 + i * 0.2)) * 0.02);
    });
  }

  // orbiters motion (every other frame)
  if (orbitersInst && orbitersData && (Math.floor(t * 60) % 2 === 0)) {
    for (var i = 0; i < orbitersData.length; i++) {
      var d = orbitersData[i];
      var ang = d.angle + t * d.speed;
      dummy.position.set(Math.cos(ang) * d.radius, 0.5 + Math.sin(t * 2.0 + i) * d.yAmp, Math.sin(ang) * d.radius);
      dummy.rotation.set(Math.sin(t + i) * 0.6, Math.cos(t * 0.7 + i) * 0.6, Math.sin(t * 0.5 + i) * 0.6);
      dummy.updateMatrix();
      orbitersInst.setMatrixAt(i, dummy.matrix);
    }
    orbitersInst.instanceMatrix.needsUpdate = true;
  }

  // starfields drift
  if (particlesNear) {
    particlesNear.rotation.y = t * 0.012;
    particlesNear.rotation.x = Math.sin(t * 0.04) * 0.012;
  }
  if (particlesFar) {
    particlesFar.rotation.y = -t * 0.007;
  }

  // title and tagline subtle motion
  if (title3D) {
    title3D.rotation.y = Math.sin(t * 0.2) * 0.08;
    title3D.position.y = 1.28 + Math.sin(t * 0.6) * 0.02;
  }
  if (tagline3D) {
    tagline3D.rotation.z = Math.sin(t * 0.3) * 0.02;
    tagline3D.position.y = 0.98 + Math.sin(t * 0.9) * 0.01;
    var hue = (Math.sin(t * 0.5) * 0.5 + 0.5);
    var c = new THREE.Color().setHSL(0.55 + hue * 0.1, 0.8, 0.6);
    tagline3D.material.color.copy(c);
  }

  // pointer glow follow
  if (pointerGlow) {
    pointerGlow.scale.setScalar(1 + Math.sin(t * 2.0) * 0.06);
    if (typeof mouseWorld !== "undefined") {
      pointerGlow.position.lerp(mouseWorld, 0.12);
    }
  }

  // hologram shader time
  if (holoAvatar && holoAvatar.material && holoAvatar.material.uniforms) {
    holoAvatar.material.uniforms.time.value = t;
  }

  // video texture update
  if (bgVideoTexture && (Math.floor(t * 60) % 2 === 0)) {
    bgVideoTexture.needsUpdate = true;
  }

  // update blue cursor particles
  updateCursorParticles(dt);

  // parallax based on scroll
  var camTy = 0.6 + Math.min(0.7, scrollTargetY * 0.0006);
  var camTz = 3.2 + Math.min(1.2, scrollTargetY * 0.0008);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, camTy, 0.08);
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, camTz, 0.08);
  if (bgVideoMesh) {
    var targetZ = -5 - Math.min(1.0, scrollTargetY * 0.0006);
    bgVideoMesh.position.z = THREE.MathUtils.lerp(bgVideoMesh.position.z, targetZ, 0.08);
  }

  if (composer) composer.render();
  else renderer.render(scene, camera);

  // hide loader after first frame
  if (!firstRenderDone) {
    firstRenderDone = true;
    if (window.hideLoader) window.hideLoader();
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);

  var pr = (window.innerWidth < 640 || isTouchDevice) ? 1.0 : Math.min(1.5, window.devicePixelRatio);
  renderer.setPixelRatio(pr);

  // video plane fit
  if (bgVideoMesh) {
    var aspect = window.innerWidth / window.innerHeight;
    var height = 10;
    var width = height * aspect;
    bgVideoMesh.scale.set(width, height, 1);
    bgVideoMesh.position.set(0, 0.5, -5);
  }

  // responsive positions
  var isMobile = window.innerWidth < 640;
  if (title3D) title3D.position.set(0, isMobile ? 1.18 : 1.28, -0.2);
  if (tagline3D) tagline3D.position.set(0, isMobile ? 0.92 : 0.98, 0.1);
  if (holoAvatar) {
    holoAvatar.position.set(isMobile ? -0.6 : -1.2, isMobile ? 0.85 : 0.95, 0.2);
    holoAvatar.scale.setScalar(isMobile ? 0.8 : 1);
  }
}
window.addEventListener("resize", onResize);

// Scroll parallax smoothing
var scrollTargetY = window.scrollY || 0;
window.addEventListener("scroll", function () {
  scrollTargetY = window.scrollY || 0;
}, { passive: true });

// Mouse interaction
var mouse = new THREE.Vector2();
var mouseWorld = new THREE.Vector3();
window.addEventListener("mousemove", function (e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  mouseWorld.set(mouse.x * 0.8, 0.8 + mouse.y * 0.4, 1.4);

  // hero tilt (desktop only)
  if (heroEl && !isTouchDevice) {
    var tiltY = mouse.x * 6;
    var tiltX = mouse.y * -5;
    heroEl.style.transform = "rotateY(" + tiltY + "deg) rotateX(" + tiltX + "deg) translateZ(0)";
  }

  // neon blue trail
  pushTrail(mouseWorld.x, mouseWorld.y, mouseWorld.z);

  // spawn blue cursor particles
  var burst = isTouchDevice ? 3 : 8;
  spawnCursorParticles(mouseWorld.x, mouseWorld.y, mouseWorld.z, burst);
}, { passive: true });
window.addEventListener("mouseleave", function () {
  if (heroEl) heroEl.style.transform = "none";
});

// Card hover glow + 3D tilt
document.querySelectorAll(".card").forEach(function (card) {
  function onMove(e) {
    var rect = card.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    card.style.setProperty("--mx", x + "px");
    card.style.setProperty("--my", y + "px");

    var nx = (x / rect.width) * 2 - 1;
    var ny = (y / rect.height) * 2 - 1;
    var rotY = nx * 6;
    var rotX = -ny * 6;
    card.style.transform = "rotateY(" + rotY + "deg) rotateX(" + rotX + "deg)";
  }
  card.addEventListener("mousemove", onMove);
  card.addEventListener("mouseleave", function () { card.style.transform = "none"; });
});

// Fallback reveal on DOM ready
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".section").forEach(function (s) { s.classList.add("revealed"); });
});

// Kick off
init();