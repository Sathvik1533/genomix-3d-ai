/**
 * SYNAPSE // ADVANCED GLSL COMPUTATIONAL NEURO-GENOMICS
 * 65,536 GPU Particles with Curl Noise, Action Potential Waves & Custom ShaderMaterial
 */

let scene, camera, renderer, controls;
let activeTopology = 'brain'; // 'brain' | 'dna' | 'flow'
let autoOrbit = true;
let isAudioActive = true;
let audioCtx = null;
let clock = new THREE.Clock();

// Shader Uniforms & Particle Mesh
let particleSystem, particleMaterial;
let count = 65536;
let originalPositions, dnaPositions, flowPositions;

// Parameters
let turbulenceVal = 1.25;
let speedMultiplier = 1.0;
let surgeActive = 0.0;

// Mouse Interaction
let mouseX = 0, mouseY = 0;
let mouseVector = new THREE.Vector2(0, 0);
let targetCameraX = 0, targetCameraY = 0;

// Telemetry Canvas
let telemCanvas, telemCtx;
let telemX = 0, lastTelemY = 42;

document.addEventListener('DOMContentLoaded', () => {
  initEngine();
  initCustomCursor();
  initTelemetryCanvas();
  animate();

  window.addEventListener('resize', onResize);
  document.addEventListener('mousemove', onMouseMove);
});

/* ==========================================================================
   GLSL SHADERS (CUSTOM VERTEX & FRAGMENT SHADER)
   ========================================================================== */

const vertexShader = `
  uniform float uTime;
  uniform float uTurbulence;
  uniform float uSpeed;
  uniform float uSurge;
  uniform vec2 uMouse;
  uniform float uMorphProgress; // 0.0: Brain, 1.0: Target

  attribute vec3 aTargetPos;
  attribute float aPhase;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vAlpha;

  // Simplex 3D Noise Functions
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
    // Morph between Base position and Target topology
    vec3 basePos = mix(position, aTargetPos, uMorphProgress);

    // Compute Organic Wave & Curl Noise
    float t = uTime * uSpeed * 0.6 + aPhase;
    vec3 noiseVec = vec3(
      snoise(basePos * 0.8 + vec3(t * 0.3, 0.0, 0.0)),
      snoise(basePos * 0.8 + vec3(0.0, t * 0.3, 0.0)),
      snoise(basePos * 0.8 + vec3(0.0, 0.0, t * 0.3))
    );

    vec3 finalPos = basePos + noiseVec * (0.15 * uTurbulence);

    // Action Potential Surge Expansion
    if (uSurge > 0.01) {
      float wave = sin(length(finalPos) * 4.0 - uTime * 12.0);
      finalPos += normalize(finalPos) * wave * (uSurge * 0.45);
    }

    // Mouse repulsion vector
    vec4 worldPos = modelMatrix * vec4(finalPos, 1.0);
    vec4 mvPosition = viewMatrix * worldPos;

    gl_Position = projectionMatrix * mvPosition;

    // Size Attenuation with Camera Distance
    float pSize = (14.0 / -mvPosition.z) * (1.0 + uSurge * 0.8);
    gl_PointSize = clamp(pSize, 1.5, 48.0);

    // Dynamic Spectral Shading
    vColor = aColor;
    if (uSurge > 0.01) {
      vColor = mix(vColor, vec3(1.0, 1.0, 1.0), uSurge);
    }

    vAlpha = clamp(1.2 / (-mvPosition.z * 0.18), 0.2, 0.95);
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Soft circular biophoton particle falloff
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);

    if (dist > 0.5) discard;

    // Radial exponential glow
    float intensity = exp(-dist * 5.0);
    gl_FragColor = vec4(vColor, vAlpha * intensity);
  }
`;

/* ==========================================================================
   INITIALIZE ENGINE & PARTICLES
   ========================================================================== */

function initEngine() {
  const container = document.getElementById('webgl-viewport');
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070a, 0.032);

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0.2, 8.5);

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

  // Generate Topological Coordinate Sets
  generateTopologies();

  // Create GPU Particle System with Custom ShaderMaterial
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(originalPositions, 3));
  geometry.setAttribute('aTargetPos', new THREE.BufferAttribute(dnaPositions, 3));

  // Particle phases & colors
  const phases = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    phases[i] = Math.random() * Math.PI * 2;
    
    // Spectral palette: Cyan (#00f0ff), Emerald (#00e676), Rose (#ff2d55), Purple (#a855f7)
    const pz = originalPositions[i * 3 + 2];
    const py = originalPositions[i * 3 + 1];

    let c = new THREE.Color(0x00f0ff);
    if (pz > 0.4) c = new THREE.Color(0x00f0ff);
    else if (pz <= 0.4 && pz > -0.4 && py > 0.1) c = new THREE.Color(0xa855f7);
    else if (py <= 0.1 && pz > -0.6) c = new THREE.Color(0x00e676);
    else c = new THREE.Color(0xff2d55);

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

  particleMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
      uTime: { value: 0.0 },
      uTurbulence: { value: turbulenceVal },
      uSpeed: { value: speedMultiplier },
      uSurge: { value: 0.0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uMorphProgress: { value: 0.0 }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  particleSystem = new THREE.Points(geometry, particleMaterial);
  particleSystem.position.set(1.4, 0, 0); // Positioned for editorial balance
  scene.add(particleSystem);
}

/* ==========================================================================
   TOPOLOGY MATHEMATICS GENERATION
   ========================================================================== */

function generateTopologies() {
  originalPositions = new Float32Array(count * 3); // Brain
  dnaPositions = new Float32Array(count * 3);       // DNA
  flowPositions = new Float32Array(count * 3);      // Flow Vortex

  for (let i = 0; i < count; i++) {
    // 1. BRAIN MANIFOLD (Dual hemisphere with gyri/sulci modulation)
    const hem = Math.random() > 0.5 ? 1 : -1;
    const u = Math.random() * Math.PI;
    const v = Math.random() * Math.PI * 2;

    let bx = 1.35 * Math.sin(u) * Math.cos(v);
    let by = 1.05 * Math.cos(u);
    let bz = 1.65 * Math.sin(u) * Math.sin(v);

    bx = hem * (Math.abs(bx) * 0.85 + 0.15);
    if (by < -0.3 && bz < -0.4) { bx *= 0.85; bz -= 0.2; by -= 0.2; }

    const gyri = Math.sin(bx * 6.5) * Math.cos(by * 6.5) * Math.sin(bz * 6.5) * 0.09;
    bx += gyri; by += gyri; bz += gyri;

    originalPositions[i * 3] = bx;
    originalPositions[i * 3 + 1] = by;
    originalPositions[i * 3 + 2] = bz;

    // 2. DNA DOUBLE HELIX (Dual intertwined spirals with bridging rungs)
    const t = (i / count) * 36.0;
    const strand = (i % 2 === 0) ? 0 : Math.PI;
    const radius = 1.25 + (Math.random() - 0.5) * 0.15;
    const y = ((i / count) - 0.5) * 8.5;

    // Strands + bridging rungs
    let dx = Math.cos(t + strand) * radius;
    let dz = Math.sin(t + strand) * radius;

    if (i % 7 === 0) {
      const interp = Math.random();
      dx = (Math.cos(t) * radius) * interp + (Math.cos(t + Math.PI) * radius) * (1.0 - interp);
      dz = (Math.sin(t) * radius) * interp + (Math.sin(t + Math.PI) * radius) * (1.0 - interp);
    }

    dnaPositions[i * 3] = dx;
    dnaPositions[i * 3 + 1] = y;
    dnaPositions[i * 3 + 2] = dz;

    // 3. MOLECULAR FLOW VORTEX (Logarithmic Fibonacci torus)
    const phi = i * 0.1;
    const rad = Math.sqrt(i / count) * 2.2;
    flowPositions[i * 3] = Math.cos(phi) * rad;
    flowPositions[i * 3 + 1] = Math.sin(phi * 2.0) * 0.65;
    flowPositions[i * 3 + 2] = Math.sin(phi) * rad;
  }
}

/* ==========================================================================
   RENDER & ANIMATION LOOP
   ========================================================================== */

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (particleMaterial) {
    particleMaterial.uniforms.uTime.value = time;
    particleMaterial.uniforms.uTurbulence.value = turbulenceVal;
    particleMaterial.uniforms.uSpeed.value = speedMultiplier;

    // Decay surge effect smoothly
    if (surgeActive > 0.001) {
      surgeActive = THREE.MathUtils.lerp(surgeActive, 0.0, 0.05);
      particleMaterial.uniforms.uSurge.value = surgeActive;
    }
  }

  // Smooth Orbit Rotation
  if (autoOrbit && particleSystem) {
    particleSystem.rotation.y += delta * 0.25 * speedMultiplier;
  }

  // Camera Parallax
  targetCameraX = mouseX * 0.35;
  targetCameraY = mouseY * 0.35;
  if (particleSystem) {
    particleSystem.rotation.x = THREE.MathUtils.lerp(particleSystem.rotation.x, targetCameraY * 0.2, 0.05);
    particleSystem.rotation.z = THREE.MathUtils.lerp(particleSystem.rotation.z, targetCameraX * 0.15, 0.05);
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
  mouseVector.set(mouseX, mouseY);
}

/* ==========================================================================
   TOPOLOGY TRANSITIONS
   ========================================================================== */

function setTopology(topology) {
  activeTopology = topology;
  playAcousticPing(540, 0.1);

  document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
  event.currentTarget.classList.add('active');

  const ind = document.getElementById('mode-indicator');
  const targetAttr = particleSystem.geometry.attributes.aTargetPos;

  if (topology === 'brain') {
    ind.textContent = 'NEURAL CONNECTOME MANIFOLD';
    targetAttr.copyArray(originalPositions);
    animateMorph(0.0);
    camera.position.set(0, 0.2, 8.5);
  } else if (topology === 'dna') {
    ind.textContent = 'QUANTUM DNA DOUBLE HELIX';
    targetAttr.copyArray(dnaPositions);
    animateMorph(1.0);
    camera.position.set(0, 0.4, 9.2);
  } else if (topology === 'flow') {
    ind.textContent = 'MOLECULAR FLOW VORTEX';
    targetAttr.copyArray(flowPositions);
    animateMorph(1.0);
    camera.position.set(0, 0.2, 7.8);
  }

  targetAttr.needsUpdate = true;
}

function animateMorph(targetVal) {
  let cur = particleMaterial.uniforms.uMorphProgress.value;
  let t = 0;
  const interval = setInterval(() => {
    t += 0.05;
    particleMaterial.uniforms.uMorphProgress.value = THREE.MathUtils.lerp(cur, targetVal, t);
    if (t >= 1) clearInterval(interval);
  }, 20);
}

/* ==========================================================================
   INTERACTIVE SHADER CONTROLS
   ========================================================================== */

function updateTurbulence(val) {
  turbulenceVal = parseFloat(val);
  document.getElementById('turb-val').textContent = turbulenceVal.toFixed(2);
}

function updateSpeed(val) {
  speedMultiplier = parseFloat(val);
  document.getElementById('speed-val').textContent = `${speedMultiplier.toFixed(1)}x`;
}

function triggerElectricSurge() {
  surgeActive = 1.0;
  playAcousticPing(880, 0.25);

  document.getElementById('frequency-stat').innerHTML = '256.8 <span class="stat-unit">Hz (Surge)</span>';
  setTimeout(() => {
    document.getElementById('frequency-stat').innerHTML = '128.4 <span class="stat-unit">Hz (Gamma)</span>';
  }, 2000);
}

function resetParticleField() {
  playAcousticPing(440, 0.1);
  turbulenceVal = 1.25;
  speedMultiplier = 1.0;
  document.getElementById('slider-turb').value = 1.25;
  document.getElementById('slider-speed').value = 1.0;
  document.getElementById('turb-val').textContent = '1.25';
  document.getElementById('speed-val').textContent = '1.0x';
}

function toggleOrbit() {
  autoOrbit = !autoOrbit;
  document.getElementById('orbit-btn').textContent = autoOrbit ? 'Pause Orbit' : 'Resume Orbit';
}

function resetCamera() {
  camera.position.set(0, 0.2, 8.5);
  if (controls) controls.target.set(0, 0, 0);
  if (particleSystem) particleSystem.rotation.set(0, 0, 0);
}

/* ==========================================================================
   TELEMETRY CANVAS
   ========================================================================== */

function initTelemetryCanvas() {
  telemCanvas = document.getElementById('telemetry-canvas');
  if (!telemCanvas) return;
  telemCtx = telemCanvas.getContext('2d');
  telemCtx.lineWidth = 1.8;

  setInterval(drawTelemStep, 35);
}

function drawTelemStep() {
  if (!telemCtx) return;
  const w = telemCanvas.width;
  const h = telemCanvas.height;
  const midY = h / 2;

  telemCtx.clearRect(telemX, 0, 8, h);

  const t = Date.now() / 1000;
  const y = midY + Math.sin(t * 5 + telemX * 0.08) * 18 * Math.cos(telemX * 0.03);

  telemCtx.strokeStyle = '#00f0ff';
  telemCtx.shadowBlur = 6;
  telemCtx.shadowColor = '#00f0ff';

  telemCtx.beginPath();
  telemCtx.moveTo(telemX, lastTelemY);
  telemCtx.lineTo(telemX + 2, y);
  telemCtx.stroke();

  lastTelemY = y;
  telemX = (telemX + 2) % w;
}

/* ==========================================================================
   ACOUSTIC SOUND SYNTHESIZER
   ========================================================================== */

function playAcousticPing(freq, dur) {
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
  document.getElementById('audio-status-text').textContent = isAudioActive ? 'SOUND: ON' : 'SOUND: OFF';
}

function initCustomCursor() {
  const cursor = document.getElementById('cursor');
  const follower = document.getElementById('cursor-follower');
  let cx = 0, cy = 0, fx = 0, fy = 0;

  document.addEventListener('mousemove', e => {
    cx = e.clientX;
    cy = e.clientY;
    if (cursor) cursor.style.transform = `translate(${cx}px, ${cy}px)`;
  });

  function renderCursor() {
    fx += (cx - fx) * 0.15;
    fy += (cy - fy) * 0.15;
    if (follower) follower.style.transform = `translate(${fx}px, ${fy}px)`;
    requestAnimationFrame(renderCursor);
  }
  renderCursor();
}

function openPortal() {
  document.getElementById('portal-modal').classList.add('active');
}

function closePortal() {
  document.getElementById('portal-modal').classList.remove('active');
}

function handlePortalSubmit(e) {
  e.preventDefault();
  alert('Credential verification submitted. Biophysical HDF5 tensor coordinates dispatched to your institutional email.');
  closePortal();
}
