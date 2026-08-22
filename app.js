/**
 * AURA // BIOKINETIC CARDIAC & NEURAL HEMODYNAMICS
 * Multi-Layered Volumetric WebGL Engine with Subsurface Transmission & Fluid Kinematics
 */

let scene, camera, renderer, controls;
let activeMode = 'heart'; // 'heart' | 'brain'
let autoOrbit = true;
let isPulsing = true;
let isWireframe = false;
let bpm = 64;
let clock = new THREE.Clock();

// Clipping Plane for Live Ultrasound Cross-Section
let localClippingPlane;

// 3D Objects
let heartRoot, outerMyocardium, innerBloodFlowParticles, purkinjeNetwork, aorticArch, coronaryMesh;
let brainRoot, neuralPoints, tractographyMesh;
let atmosphericSparks;

// Web Audio API Cardiac Sound Engine
let audioCtx = null;
let isAudioMuted = false;
let lastThumpTime = 0;

// Dynamic Doppler Waveform Canvas
let dopplerCanvas, dopplerCtx;
let dopplerX = 0, lastDopplerY = 45;

// Mouse Tracking
let mouseX = 0, mouseY = 0;
let pointerX = 0, pointerY = 0;
let auraX = 0, auraY = 0;

document.addEventListener('DOMContentLoaded', () => {
  initEngine();
  initPointer();
  initDopplerWave();
  animate();

  window.addEventListener('resize', onResize);
  document.addEventListener('mousemove', onMouseMove);
});

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

function initEngine() {
  const container = document.getElementById('canvas-container');
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030508, 0.035);

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0.3, 8.5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.localClippingEnabled = true;
  container.appendChild(renderer.domElement);

  // Setup Clipping Plane (Z-axis cut)
  localClippingPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 2.5);

  if (typeof THREE.OrbitControls !== 'undefined') {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.maxDistance = 14;
    controls.minDistance = 3.2;
    controls.enablePan = false;
  }

  // Dramatic Studio Lighting
  const ambient = new THREE.AmbientLight(0x0b111e, 3.0);
  scene.add(ambient);

  const crimsonKey = new THREE.PointLight(0xff1744, 4.5, 25);
  crimsonKey.position.set(5, 6, 4);
  scene.add(crimsonKey);

  const cyanFill = new THREE.PointLight(0x00f0ff, 3.8, 25);
  cyanFill.position.set(-5, -3, 3);
  scene.add(cyanFill);

  const goldRim = new THREE.DirectionalLight(0xffd600, 1.2);
  goldRim.position.set(0, 8, -5);
  scene.add(goldRim);

  // Build Master Models
  buildOrganicHeartSystem();
  buildNeuralConnectomeSystem();
  buildAtmosphericSparks();

  updateModelVisibility();
}

/* ==========================================================================
   MODEL 1: ORGANIC VOLUMETRIC CARDIAC SYSTEM
   ========================================================================== */

function buildOrganicHeartSystem() {
  heartRoot = new THREE.Group();
  heartRoot.position.set(1.4, 0, 0);

  // 1. Outer Translucent Myocardium with Subsurface Sheen
  const myoGeo = new THREE.SphereGeometry(1.68, 64, 64);
  const pos = myoGeo.attributes.position;
  
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Anatomical apex taper & ventricular notch
    if (y < 0) {
      x *= (1 + y * 0.28);
      z *= (1 + y * 0.28);
    }
    if (x < 0) y += Math.sin(z * 1.5) * 0.16;

    pos.setXYZ(i, x * 1.08, y * 1.28, z * 0.95);
  }
  myoGeo.computeVertexNormals();

  const myoMat = new THREE.MeshPhysicalMaterial({
    color: 0xd91438,
    emissive: 0x4a000f,
    emissiveIntensity: 0.4,
    roughness: 0.25,
    metalness: 0.1,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    transmission: 0.35,
    thickness: 0.8,
    clippingPlanes: [localClippingPlane],
    clipShadows: true,
    side: THREE.DoubleSide
  });

  outerMyocardium = new THREE.Mesh(myoGeo, myoMat);
  heartRoot.add(outerMyocardium);

  // 2. Ascending Aorta & Brachiocephalic Vessels
  const aortaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.1, 1.2, 0.1),
    new THREE.Vector3(-0.2, 2.3, 0.2),
    new THREE.Vector3(0.55, 2.7, 0.0),
    new THREE.Vector3(0.95, 1.9, -0.45),
    new THREE.Vector3(0.85, 0.2, -0.65)
  ]);
  const aortaGeo = new THREE.TubeGeometry(aortaCurve, 48, 0.38, 20, false);
  const aortaMat = new THREE.MeshPhysicalMaterial({
    color: 0xcc1f32,
    emissive: 0x330008,
    roughness: 0.2,
    clearcoat: 0.8,
    clippingPlanes: [localClippingPlane]
  });
  aorticArch = new THREE.Mesh(aortaGeo, aortaMat);
  heartRoot.add(aorticArch);

  // Branch vessels
  const b1 = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.05, 2.5, 0.1), new THREE.Vector3(0.1, 3.2, 0.15)]), 12, 0.11, 12, false),
    aortaMat
  );
  const b2 = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.35, 2.55, 0.05), new THREE.Vector3(0.45, 3.3, 0.1)]), 12, 0.1, 12, false),
    aortaMat
  );
  heartRoot.add(b1);
  heartRoot.add(b2);

  // 3. Bioluminescent Coronary Artery Tree
  coronaryMesh = new THREE.Group();
  const paths = [
    [new THREE.Vector3(-0.3, 1.0, 0.95), new THREE.Vector3(-0.65, 0.3, 1.15), new THREE.Vector3(-0.45, -0.6, 0.95), new THREE.Vector3(-0.1, -1.5, 0.45)],
    [new THREE.Vector3(0.1, 0.9, 0.98), new THREE.Vector3(0.55, 0.2, 1.1), new THREE.Vector3(0.75, -0.4, 0.85), new THREE.Vector3(0.45, -1.3, 0.55)],
    [new THREE.Vector3(-0.65, 0.3, 1.15), new THREE.Vector3(-1.15, 0.0, 0.75), new THREE.Vector3(-1.05, -0.7, 0.45)],
    [new THREE.Vector3(0.55, 0.2, 1.1), new THREE.Vector3(0.95, 0.1, 0.65), new THREE.Vector3(0.85, -0.65, 0.35)]
  ];

  const artMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 1.6,
    roughness: 0.15,
    clippingPlanes: [localClippingPlane]
  });

  paths.forEach(pts => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.048, 8, false), artMat);
    coronaryMesh.add(tube);
  });
  heartRoot.add(coronaryMesh);

  // 4. Internal Swirling Blood Flow Particle Streamlines
  const pCount = 1800;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(pCount * 3);
  const pCol = new Float32Array(pCount * 3);

  for (let i = 0; i < pCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.85;
    pPos[i * 3] = Math.cos(angle) * r;
    pPos[i * 3 + 1] = (Math.random() - 0.5) * 2.8;
    pPos[i * 3 + 2] = Math.sin(angle) * r;

    // Glowing cyan to gold particles
    pCol[i * 3] = 0.0;
    pCol[i * 3 + 1] = 0.94;
    pCol[i * 3 + 2] = 1.0;
  }

  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));

  const pMat = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    clippingPlanes: [localClippingPlane]
  });

  innerBloodFlowParticles = new THREE.Points(pGeo, pMat);
  heartRoot.add(innerBloodFlowParticles);

  scene.add(heartRoot);
}

/* ==========================================================================
   MODEL 2: HOLOGRAPHIC NEURAL CONNECTOME
   ========================================================================== */

function buildNeuralConnectomeSystem() {
  brainRoot = new THREE.Group();
  brainRoot.position.set(1.4, 0, 0);

  const count = 16000;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);

  let idx = 0;
  for (let i = 0; i < count; i++) {
    const hem = Math.random() > 0.5 ? 1 : -1;
    const u = Math.random() * Math.PI;
    const v = Math.random() * Math.PI * 2;

    let rx = 1.38 * Math.sin(u) * Math.cos(v);
    let ry = 1.08 * Math.cos(u);
    let rz = 1.68 * Math.sin(u) * Math.sin(v);

    rx = hem * (Math.abs(rx) * 0.85 + 0.15);
    if (ry < -0.3 && rz < -0.4) { rx *= 0.85; rz -= 0.2; ry -= 0.2; }

    const gyri = Math.sin(rx * 6) * Math.cos(ry * 6) * Math.sin(rz * 6) * 0.08;
    rx += gyri; ry += gyri; rz += gyri;

    pos[idx * 3] = rx;
    pos[idx * 3 + 1] = ry;
    pos[idx * 3 + 2] = rz;

    let c = new THREE.Color(0x00f0ff);
    if (rz > 0.3) c = new THREE.Color(0x00f0ff);
    else if (rz <= 0.3 && rz > -0.6 && ry > 0.1) c = new THREE.Color(0xff1744);
    else if (ry <= 0.1 && rz > -0.5 && rz < 0.4) c = new THREE.Color(0xffd600);
    else c = new THREE.Color(0x00e676);

    col[idx * 3] = c.r;
    col[idx * 3 + 1] = c.g;
    col[idx * 3 + 2] = c.b;
    idx++;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.044,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });

  neuralPoints = new THREE.Points(geo, mat);
  brainRoot.add(neuralPoints);

  tractographyMesh = new THREE.Group();
  const tractMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 30; i++) {
    const p1 = new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.0, 1.0);
    const p2 = new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.5, 0.0);
    const p3 = new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.0, -1.0);
    const curve = new THREE.QuadraticBezierCurve3(p1, p2, p3);
    tractographyMesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(20)), tractMat));
  }
  brainRoot.add(tractographyMesh);

  scene.add(brainRoot);
}

function buildAtmosphericSparks() {
  const count = 150;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 18;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.04,
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending
  });

  atmosphericSparks = new THREE.Points(geo, mat);
  scene.add(atmosphericSparks);
}

/* ==========================================================================
   ANIMATION & KINEMATICS LOOP
   ========================================================================== */

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // Natural Dual-Peak Cardiac Rhythm Math (Lub-Dub)
  const pulsePhase = (time * (bpm / 60)) % 1;

  let contraction = 0;
  if (pulsePhase < 0.25) {
    contraction = Math.sin((pulsePhase / 0.25) * Math.PI) * 0.15; // Ventricular Systole
  } else if (pulsePhase >= 0.35 && pulsePhase < 0.5) {
    contraction = Math.sin(((pulsePhase - 0.35) / 0.15) * Math.PI) * 0.07; // Atrial contraction
  }

  // Audio Trigger for Organic Heartbeat
  if (isPulsing && !isAudioMuted && (pulsePhase < 0.08) && (time - lastThumpTime > 0.6)) {
    lastThumpTime = time;
    playOrganicHeartbeatAudio();
  }

  if (activeMode === 'heart' && heartRoot) {
    if (autoOrbit) heartRoot.rotation.y += delta * 0.35;

    if (isPulsing && outerMyocardium) {
      outerMyocardium.scale.set(1 + contraction, 1 - contraction * 0.6, 1 + contraction);

      // Scrubber UI Update
      const scrubber = document.getElementById('cycle-scrubber');
      if (scrubber) scrubber.value = Math.round(pulsePhase * 100);

      const phaseElem = document.getElementById('phase-name');
      if (phaseElem) {
        if (pulsePhase < 0.3) phaseElem.textContent = 'VENTRICULAR SYSTOLE';
        else if (pulsePhase < 0.6) phaseElem.textContent = 'ISOVOLUMETRIC RELAXATION';
        else phaseElem.textContent = 'DIASTOLIC VENTRICULAR FILLING';
      }
    }

    // Animate inner blood particles
    if (innerBloodFlowParticles) {
      const pos = innerBloodFlowParticles.geometry.attributes.position;
      const speed = (1.0 + contraction * 4.0) * delta * 1.5;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + speed;
        if (y > 2.0) y = -1.6;
        pos.setY(i, y);
      }
      innerBloodFlowParticles.geometry.attributes.position.needsUpdate = true;
    }
  } else if (activeMode === 'brain' && brainRoot) {
    if (autoOrbit) brainRoot.rotation.y += delta * 0.3;
    if (neuralPoints) {
      const col = neuralPoints.geometry.attributes.color;
      const pos = neuralPoints.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 30) {
        if (Math.sin(time * 5.0 + pos.getX(i) * 4.0) > 0.85) {
          col.setXYZ(i, 1.0, 1.0, 1.0);
        }
      }
      col.needsUpdate = true;
    }
  }

  // Atmospheric dust
  if (atmosphericSparks) {
    atmosphericSparks.rotation.y = time * 0.02;
  }

  // Pointer Lerp
  pointerX += (mouseX * window.innerWidth / 2 + window.innerWidth / 2 - pointerX) * 0.25;
  pointerY += (-mouseY * window.innerHeight / 2 + window.innerHeight / 2 - pointerY) * 0.25;
  auraX += (pointerX - auraX) * 0.15;
  auraY += (pointerY - auraY) * 0.15;

  const dot = document.getElementById('pointer-dot');
  const aura = document.getElementById('pointer-aura');
  if (dot && aura) {
    dot.style.transform = `translate(${pointerX}px, ${pointerY}px)`;
    aura.style.transform = `translate(${auraX}px, ${auraY}px)`;
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
   MODEL SWITCHER
   ========================================================================== */

function switchOrganModel(model) {
  activeMode = model;
  document.querySelectorAll('.deck-btn').forEach(btn => btn.classList.remove('active'));
  event.currentTarget.classList.add('active');

  const backdrop = document.getElementById('backdrop-text');
  const scrubberCard = document.getElementById('cardiac-scrubber-card');

  if (model === 'heart') {
    backdrop.textContent = 'HEMODYNAMICS';
    scrubberCard.style.display = 'block';
    camera.position.set(0, 0.3, 8.5);
  } else {
    backdrop.textContent = 'CONNECTOME';
    scrubberCard.style.display = 'none';
    camera.position.set(0, 0.5, 7.8);
  }

  updateModelVisibility();
}

function updateModelVisibility() {
  if (heartRoot) heartRoot.visible = (activeMode === 'heart');
  if (brainRoot) brainRoot.visible = (activeMode === 'brain');
}

/* ==========================================================================
   ULTRASOUND CLIPPING PLANE CONTROLS
   ========================================================================== */

function adjustClippingPlane(val) {
  const zVal = parseFloat(val);
  localClippingPlane.constant = zVal;
  document.getElementById('slice-pos-val').textContent = `SAGITTAL: ${(zVal * 10).toFixed(1)} mm`;
  document.querySelectorAll('.tool-action-btn').forEach(b => b.classList.remove('active'));
}

function resetClippingPlane() {
  localClippingPlane.constant = 2.5;
  document.getElementById('slice-slider').value = 2.0;
  document.getElementById('slice-pos-val').textContent = 'FULL VOLUME';
  document.querySelectorAll('.tool-action-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-full-mesh').classList.add('active');
}

function setClipPreset(preset) {
  document.querySelectorAll('.tool-action-btn').forEach(b => b.classList.remove('active'));
  event.currentTarget.classList.add('active');

  if (preset === 'bicuspid') {
    localClippingPlane.constant = 0.4;
    document.getElementById('slice-slider').value = 0.4;
    document.getElementById('slice-pos-val').textContent = 'AORTIC VALVE PLANE (+4.0 mm)';
  } else if (preset === 'chamber') {
    localClippingPlane.constant = -0.15;
    document.getElementById('slice-slider').value = -0.15;
    document.getElementById('slice-pos-val').textContent = '4-CHAMBER CROSS (-1.5 mm)';
  }
}

function toggleWireframeMode() {
  isWireframe = !isWireframe;
  if (outerMyocardium) outerMyocardium.material.wireframe = isWireframe;
  if (aorticArch) aorticArch.material.wireframe = isWireframe;
}

function manualScrub(val) {
  isPulsing = false;
  document.getElementById('play-state-icon').textContent = '▶';
  document.getElementById('play-state-txt').textContent = 'Resume Rhythm';

  const phase = val / 100;
  const contraction = Math.sin(phase * Math.PI) * 0.15;
  if (outerMyocardium) {
    outerMyocardium.scale.set(1 + contraction, 1 - contraction * 0.6, 1 + contraction);
  }
}

function togglePulsePlay() {
  isPulsing = !isPulsing;
  document.getElementById('play-state-icon').textContent = isPulsing ? '⏸' : '▶';
  document.getElementById('play-state-txt').textContent = isPulsing ? 'Live Rhythm' : 'Resume Rhythm';
}

function triggerArrhythmiaDemo() {
  bpm = 140;
  document.getElementById('systolic-val').innerHTML = '154 <small>mmHg</small>';
  document.getElementById('stress-val').innerHTML = '38.6 <small>kPa</small>';
  document.getElementById('doppler-vel').innerHTML = '2.14 <small>m/s</small>';

  setTimeout(() => {
    bpm = 64;
    document.getElementById('systolic-val').innerHTML = '118 <small>mmHg</small>';
    document.getElementById('stress-val').innerHTML = '18.2 <small>kPa</small>';
    document.getElementById('doppler-vel').innerHTML = '1.28 <small>m/s</small>';
  }, 4500);
}

/* ==========================================================================
   2D DOPPLER ULTRASOUND CANVAS
   ========================================================================== */

function initDopplerWave() {
  dopplerCanvas = document.getElementById('doppler-canvas');
  if (!dopplerCanvas) return;
  dopplerCtx = dopplerCanvas.getContext('2d');
  dopplerCtx.lineWidth = 2.0;

  setInterval(drawDopplerStep, 35);
}

function drawDopplerStep() {
  if (!dopplerCtx) return;
  const w = dopplerCanvas.width;
  const h = dopplerCanvas.height;
  const midY = h / 2 + 10;

  dopplerCtx.clearRect(dopplerX, 0, 8, h);

  const t = Date.now() / 1000;
  const phase = (t * (bpm / 60)) % 1;

  let y = midY;
  if (phase < 0.28) {
    const jet = Math.sin((phase / 0.28) * Math.PI);
    y -= jet * 38;
  } else if (phase >= 0.45 && phase < 0.65) {
    const dJet = Math.sin(((phase - 0.45) / 0.2) * Math.PI);
    y -= dJet * 12;
  }

  dopplerCtx.strokeStyle = '#00f0ff';
  dopplerCtx.shadowBlur = 8;
  dopplerCtx.shadowColor = '#00f0ff';

  dopplerCtx.beginPath();
  dopplerCtx.moveTo(dopplerX, lastDopplerY);
  dopplerCtx.lineTo(dopplerX + 2, y);
  dopplerCtx.stroke();

  lastDopplerY = y;
  dopplerX = (dopplerX + 2) % w;
}

/* ==========================================================================
   ORGANIC WEB AUDIO SYNTHESIZER
   ========================================================================== */

function playOrganicHeartbeatAudio() {
  if (isAudioMuted) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Lub (Deep sub-harmonic thump)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(68, audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.12);
    gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start();
    osc1.stop(audioCtx.currentTime + 0.12);

    // Dub (Secondary thump after 0.14s)
    setTimeout(() => {
      if (!audioCtx) return;
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(84, audioCtx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(36, audioCtx.currentTime + 0.1);
      gain2.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start();
      osc2.stop(audioCtx.currentTime + 0.1);
    }, 140);
  } catch (e) {}
}

function toggleAudioEngine() {
  isAudioMuted = !isAudioMuted;
  document.getElementById('sound-label').textContent = isAudioMuted ? 'AUDIO: MUTED' : 'AUDIO: ACTIVE';
}

function resetCameraAngle() {
  camera.position.set(0, 0.3, 8.5);
  if (controls) controls.target.set(0, 0, 0);
  if (heartRoot) heartRoot.rotation.set(0, 0, 0);
}

function toggleAutoRotation() {
  autoOrbit = !autoOrbit;
  document.getElementById('orbit-btn-text').textContent = autoOrbit ? 'Pause Rotation' : 'Resume Rotation';
}

function initPointer() {}

function openContactSheet() {
  document.getElementById('contact-modal').classList.add('active');
}

function closeContactSheet() {
  document.getElementById('contact-modal').classList.remove('active');
}

function handleInquirySubmit(e) {
  e.preventDefault();
  alert('Clinical access inquiry received. Our biokinetics engineering team will verify your medical DICOM integration keys.');
  closeContactSheet();
}
