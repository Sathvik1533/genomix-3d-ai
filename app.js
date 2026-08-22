/**
 * ENUMERA // 60,000 GPU PARTICLE QUANTUM DNA NEBULA & DRUG KINETICS ENGINE
 * Custom GLSL ShaderMaterial • Simplex 3D Curl Noise • Real-Time Pharmacogenomics
 */

let scene, camera, renderer, controls;
let autoOrbit = true;
let isAudioActive = true;
let audioCtx = null;
let clock = new THREE.Clock();

// Master 3D Objects
let dnaParticleMesh, dnaShaderMaterial;
let drugLigandGroup;
let particleCount = 60000;

// Drug Formulation Metadata
const DRUG_DATA = {
  trikafta: {
    energy: '-14.2 kcal/mol',
    kd: 'Kd = 1.4 nM',
    res: 't1/2 = 4.8 hr',
    status: 'BOUND (CFTR Exon 10)',
    color: 0x38bdf8
  },
  nusinersen: {
    energy: '-16.8 kcal/mol',
    kd: 'Kd = 0.8 nM',
    res: 't1/2 = 135 days',
    status: 'BOUND (SMN2 Exon 7)',
    color: 0x34d399
  },
  casgevy: {
    energy: '-19.4 kcal/mol',
    kd: '99.98% Fidelity',
    res: 'Permanent Edit',
    status: 'BOUND (BCL11A Enhancer)',
    color: 0xc084fc
  },
  patisiran: {
    energy: '-12.6 kcal/mol',
    kd: 't1/2 = 4.8 hr',
    res: 't1/2 = 9.2 days',
    status: 'BOUND (TTR 3\' UTR)',
    color: 0xfbbf24
  }
};

let currentDrugKey = 'trikafta';

// Mouse Tracking
let mouseX = 0, mouseY = 0;
let targetCamX = 0, targetCamY = 0;

/* ==========================================================================
   GLSL SHADERS (60,000 GPU PARTICLES)
   ========================================================================== */

const vertexShader = `
  uniform float uTime;
  uniform float uTurbulence;
  uniform float uDockSurge;
  uniform vec2 uMouse;

  attribute float aPhase;
  attribute vec3 aBaseColor;

  varying vec3 vColor;
  varying float vAlpha;

  // Simplex 3D Noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    float t = uTime * 0.4 + aPhase;

    // Organic Curl Undulation
    vec3 noiseVec = vec3(
      snoise(position * 0.5 + vec3(t * 0.2, 0.0, 0.0)),
      snoise(position * 0.5 + vec3(0.0, t * 0.2, 0.0)),
      snoise(position * 0.5 + vec3(0.0, 0.0, t * 0.2))
    );

    vec3 finalPos = position + noiseVec * (0.15 * uTurbulence);

    // Ligand Docking Particle Ripple
    if (uDockSurge > 0.01) {
      float ripple = sin(length(finalPos.xz) * 5.0 - uTime * 8.0);
      finalPos += normalize(finalPos) * ripple * (uDockSurge * 0.3);
    }

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Depth-of-Field Size Attenuation
    float pSize = (18.0 / -mvPosition.z) * (1.0 + uDockSurge * 0.6);
    gl_PointSize = clamp(pSize, 1.5, 45.0);

    vColor = aBaseColor;
    if (uDockSurge > 0.01) {
      vColor = mix(vColor, vec3(1.0, 1.0, 1.0), uDockSurge * 0.7);
    }

    vAlpha = clamp(1.4 / (-mvPosition.z * 0.15), 0.25, 0.95);
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Exponential anti-aliased biophoton particle falloff
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);

    if (dist > 0.5) discard;

    float intensity = exp(-dist * 5.2);
    gl_FragColor = vec4(vColor, vAlpha * intensity);
  }
`;

/* ==========================================================================
   INITIALIZE ENGINE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initEngine();
  initCursor();
  animate();

  window.addEventListener('resize', onResize);
  document.addEventListener('mousemove', onMouseMove);
});

function initEngine() {
  const container = document.getElementById('webgl-canvas');
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x08090d, 0.03);

  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0.2, 8.8);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  container.appendChild(renderer.domElement);

  if (typeof THREE.OrbitControls !== 'undefined') {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.maxDistance = 14;
    controls.minDistance = 3.2;
    controls.enablePan = false;
  }

  // Build GPU Particle DNA Helix
  buildParticleDNAHelix();
  build3DDrugLigand();
}

/* ==========================================================================
   60,000 GPU PARTICLE QUANTUM DNA HELIX
   ========================================================================== */

function buildParticleDNAHelix() {
  if (dnaParticleMesh) scene.remove(dnaParticleMesh);

  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const phases = new Float32Array(particleCount);

  const turns = 3.2;
  const radius = 1.4;
  const height = 11.0;

  for (let i = 0; i < particleCount; i++) {
    const t = i / particleCount;
    const y = (t - 0.5) * height;
    const angle = t * Math.PI * 2 * turns;

    let x, z;
    let c = new THREE.Color(0x38bdf8);

    // 70% of particles form the dual intertwined helical strands
    if (i < particleCount * 0.7) {
      const strand = (i % 2 === 0) ? 0 : Math.PI;
      const strandRad = radius + (Math.random() - 0.5) * 0.18;

      x = Math.cos(angle + strand) * strandRad;
      z = Math.sin(angle + strand) * strandRad;

      if (strand === 0) c = new THREE.Color(0x38bdf8); // Strand 1: Spectral Cyan
      else c = new THREE.Color(0x34d399);              // Strand 2: Emerald
    }
    // 20% form bridging nucleotide base pairs
    else if (i < particleCount * 0.9) {
      const interp = Math.random();
      const rad1 = Math.cos(angle) * radius;
      const rad2 = Math.cos(angle + Math.PI) * radius;
      const zrad1 = Math.sin(angle) * radius;
      const zrad2 = Math.sin(angle + Math.PI) * radius;

      x = rad1 * interp + rad2 * (1.0 - interp);
      z = zrad1 * interp + zrad2 * (1.0 - interp);

      const r = Math.random();
      if (r < 0.25) c = new THREE.Color(0x38bdf8);
      else if (r < 0.5) c = new THREE.Color(0xf43f5e);
      else if (r < 0.75) c = new THREE.Color(0x34d399);
      else c = new THREE.Color(0xfbbf24);
    }
    // 10% form ambient solvent hydration cloud
    else {
      const solAngle = Math.random() * Math.PI * 2;
      const solR = radius + 0.4 + Math.random() * 1.4;
      x = Math.cos(solAngle) * solR;
      z = Math.sin(solAngle) * solR;
      c = new THREE.Color(0xc084fc);
    }

    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;

    phases[i] = Math.random() * Math.PI * 2;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aBaseColor', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  dnaShaderMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
      uTime: { value: 0.0 },
      uTurbulence: { value: 1.2 },
      uDockSurge: { value: 0.0 },
      uMouse: { value: new THREE.Vector2(0, 0) }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  dnaParticleMesh = new THREE.Points(geo, dnaShaderMaterial);
  dnaParticleMesh.position.set(1.5, 0, 0); // Positioned for editorial balance
  scene.add(dnaParticleMesh);
}

/* ==========================================================================
   3D MOLECULAR DRUG LIGAND
   ========================================================================== */

function build3DDrugLigand() {
  drugLigandGroup = new THREE.Group();

  const coreGeo = new THREE.IcosahedronGeometry(0.36, 2);
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    emissive: 0x0369a1,
    emissiveIntensity: 1.2,
    metalness: 0.5,
    roughness: 0.15,
    clearcoat: 1.0,
    wireframe: true
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  drugLigandGroup.add(core);

  const atomMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.1 });
  const offsets = [
    new THREE.Vector3(0.38, 0.2, 0.0),
    new THREE.Vector3(-0.38, -0.2, 0.0),
    new THREE.Vector3(0.0, 0.38, 0.28),
    new THREE.Vector3(0.0, -0.38, -0.28)
  ];
  offsets.forEach(pt => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16), atomMat);
    s.position.copy(pt);
    drugLigandGroup.add(s);
  });

  drugLigandGroup.position.set(3.8, 0.2, 1.2);
  drugLigandGroup.visible = false;
  dnaParticleMesh.add(drugLigandGroup);
}

/* ==========================================================================
   ANIMATION LOOP
   ========================================================================== */

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (dnaShaderMaterial) {
    dnaShaderMaterial.uniforms.uTime.value = time;

    const surge = dnaShaderMaterial.uniforms.uDockSurge.value;
    if (surge > 0.001) {
      dnaShaderMaterial.uniforms.uDockSurge.value = THREE.MathUtils.lerp(surge, 0.0, 0.05);
    }
  }

  if (autoOrbit && dnaParticleMesh) {
    dnaParticleMesh.rotation.y += delta * 0.25;
  }

  // Smooth Camera Parallax Lerp
  targetCamX = mouseX * 0.35;
  targetCamY = mouseY * 0.35;
  if (dnaParticleMesh) {
    dnaParticleMesh.rotation.x = THREE.MathUtils.lerp(dnaParticleMesh.rotation.x, targetCamY * 0.18, 0.05);
    dnaParticleMesh.rotation.z = THREE.MathUtils.lerp(dnaParticleMesh.rotation.z, targetCamX * 0.15, 0.05);
  }

  if (controls) controls.update();
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(e) {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
}

/* ==========================================================================
   DRUG SELECTION & DOCKING
   ========================================================================== */

function selectTherapeutic(key) {
  currentDrugKey = key;
  const d = DRUG_DATA[key];
  if (!d) return;

  playAcousticTone(580, 0.1);

  document.querySelectorAll('.tray-card').forEach(c => c.classList.remove('active'));
  event.currentTarget.classList.add('active');

  // Update Telemetry Bar
  document.getElementById('telem-energy').textContent = d.energy;
  document.getElementById('telem-kd').textContent = d.kd;
  document.getElementById('telem-res').textContent = d.res;
  document.getElementById('telem-status').textContent = d.status;

  triggerDockingAnimation();
}

function triggerDockingAnimation() {
  playAcousticTone(880, 0.2);
  if (!drugLigandGroup || !dnaShaderMaterial) return;

  drugLigandGroup.visible = true;
  dnaShaderMaterial.uniforms.uDockSurge.value = 1.0;

  document.getElementById('telem-status').textContent = 'DOCKING IN PROGRESS...';
  document.getElementById('telem-status').style.color = '#fbbf24';

  let t = 0;
  const interval = setInterval(() => {
    t += 0.04;
    drugLigandGroup.position.x = THREE.MathUtils.lerp(3.8, 0.2, t);
    drugLigandGroup.position.z = THREE.MathUtils.lerp(1.2, 0.7, t);
    drugLigandGroup.rotation.y += 0.12;

    if (t >= 1) {
      clearInterval(interval);
      document.getElementById('telem-status').textContent = DRUG_DATA[currentDrugKey].status;
      document.getElementById('telem-status').style.color = '#34d399';
      playAcousticTone(1040, 0.25);
    }
  }, 25);
}

/* ==========================================================================
   ACOUSTIC SOUND SYNTHESIZER
   ========================================================================== */

function playAcousticTone(freq, dur) {
  if (!isAudioActive) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}

function toggleAudio() {
  isAudioActive = !isAudioActive;
  document.getElementById('sound-text').textContent = isAudioActive ? 'AUDIO: ON' : 'AUDIO: OFF';
}

function initCursor() {
  const dot = document.getElementById('cursor-dot');
  const circle = document.getElementById('cursor-circle');
  let cx = 0, cy = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    cx = e.clientX;
    cy = e.clientY;
    if (dot) dot.style.transform = `translate(${cx}px, ${cy}px)`;
  });

  function updateCircle() {
    rx += (cx - rx) * 0.15;
    ry += (cy - ry) * 0.15;
    if (circle) circle.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(updateCircle);
  }
  updateCircle();
}

function openPortal() {
  document.getElementById('portal-modal').classList.add('active');
}

function closePortal() {
  document.getElementById('portal-modal').classList.remove('active');
}

function handlePortalSubmit(e) {
  e.preventDefault();
  alert('Credential verification submitted. Raw PDB/SDF coordinate keys dispatched to your institutional address.');
  closePortal();
}
