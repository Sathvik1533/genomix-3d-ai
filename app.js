/**
 * AURA // BIOKINETIC HEMODYNAMICS & ORGAN FLUID DYNAMICS
 * Studio-Grade WebGL 3D Engine • Three.js Clipping Planes & Biomechanical Shaders
 */

// Scene Globals
let scene, camera, renderer, controls;
let activeModel = 'heart'; // 'heart' | 'brain'
let autoRotate = true;
let isPlaying = true;
let isWireframe = false;
let bpm = 60;
let clock = new THREE.Clock();

// Clipping Plane for Volumetric Ultrasound Slicing
let localClippingPlane;

// 3D Objects
let heartGroup, myocardiumMesh, aortaMesh, coronaryTree, internalChamberCore;
let brainGroup, synapticMesh, axonMeshGroup;
let ambientBioField;

// Web Audio API Cardiac Sound Synthesizer
let audioContext = null;
let isAudioActive = true;
let lastHeartBeatTime = 0;

// Dynamic Doppler Canvas
let dopplerCanvas, dopplerCtx;
let dopplerX = 0, lastDopplerY = 45;

// Pointer Follower
let mouseX = 0, mouseY = 0;
let pointerX = 0, pointerY = 0;
let auraX = 0, auraY = 0;

document.addEventListener('DOMContentLoaded', () => {
  initEngine();
  initPointer();
  initDopplerCanvas();
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
  scene.fog = new THREE.FogExp2(0x030508, 0.038);

  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0.4, 8.2);

  // Enable WebGL Local Clipping Planes
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.localClippingEnabled = true;
  container.appendChild(renderer.domElement);

  // Setup Clipping Plane (Z-axis cut)
  localClippingPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 2.0);

  if (typeof THREE.OrbitControls !== 'undefined') {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.maxDistance = 14;
    controls.minDistance = 3.2;
    controls.enablePan = false;
  }

  // Atmospheric Studio Lighting
  const ambient = new THREE.AmbientLight(0x0a0e1a, 2.8);
  scene.add(ambient);

  const crimsonKey = new THREE.PointLight(0xff1744, 4.2, 22);
  crimsonKey.position.set(4, 5, 4);
  scene.add(crimsonKey);

  const cyanFill = new THREE.PointLight(0x00f0ff, 3.2, 22);
  cyanFill.position.set(-4, -3, 3);
  scene.add(cyanFill);

  const rimDirectional = new THREE.DirectionalLight(0xffffff, 1.2);
  rimDirectional.position.set(0, 6, -5);
  scene.add(rimDirectional);

  // Build Models
  build4ChamberHeart();
  buildNeuralConnectome();
  buildAtmosphericField();

  updateModelVisibility();
}

/* ==========================================================================
   MODEL 1: 4-CHAMBER CARDIAC MYOCARDIUM & CORONARY TREE
   ========================================================================== */

function build4ChamberHeart() {
  heartGroup = new THREE.Group();
  heartGroup.position.set(1.4, 0, 0);

  // 1. Myocardium Ventricular Mass
  const myoGeo = new THREE.SphereGeometry(1.65, 64, 64);
  const pos = myoGeo.attributes.position;
  
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Anatomical apex taper & cardiac groove
    if (y < 0) {
      x *= (1 + y * 0.28);
      z *= (1 + y * 0.28);
    }
    if (x < 0) y += Math.sin(z * 1.6) * 0.18;

    pos.setXYZ(i, x * 1.08, y * 1.28, z * 0.95);
  }
  myoGeo.computeVertexNormals();

  const myoMat = new THREE.MeshPhysicalMaterial({
    color: 0xcc1438,
    emissive: 0x3d000d,
    roughness: 0.32,
    metalness: 0.12,
    clearcoat: 0.85,
    clearcoatRoughness: 0.15,
    clippingPlanes: [localClippingPlane],
    clipShadows: true,
    side: THREE.DoubleSide
  });

  myocardiumMesh = new THREE.Mesh(myoGeo, myoMat);
  heartGroup.add(myocardiumMesh);

  // 2. Internal Ventricular Chamber Cavity (Visible upon cross-section slice)
  const cavityGeo = new THREE.SphereGeometry(1.2, 32, 32);
  const cavityMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    wireframe: true,
    transparent: true,
    opacity: 0.6,
    clippingPlanes: [localClippingPlane]
  });
  internalChamberCore = new THREE.Mesh(cavityGeo, cavityMat);
  internalChamberCore.position.set(0, -0.2, 0);
  heartGroup.add(internalChamberCore);

  // 3. Ascending Aorta & Major Arch
  const aortaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.1, 1.2, 0.1),
    new THREE.Vector3(-0.2, 2.3, 0.2),
    new THREE.Vector3(0.55, 2.7, 0.0),
    new THREE.Vector3(0.95, 1.9, -0.45),
    new THREE.Vector3(0.85, 0.2, -0.65)
  ]);
  const aortaGeo = new THREE.TubeGeometry(aortaCurve, 48, 0.4, 20, false);
  const aortaMat = new THREE.MeshPhysicalMaterial({
    color: 0xd62828,
    emissive: 0x2b040a,
    roughness: 0.28,
    clearcoat: 0.7,
    clippingPlanes: [localClippingPlane]
  });
  aortaMesh = new THREE.Mesh(aortaGeo, aortaMat);
  heartGroup.add(aortaMesh);

  // 4. Branching Coronary Arteries (Bioluminescent network)
  coronaryTree = new THREE.Group();
  const coronaryPaths = [
    [new THREE.Vector3(-0.3, 1.0, 0.95), new THREE.Vector3(-0.65, 0.3, 1.15), new THREE.Vector3(-0.45, -0.6, 0.95), new THREE.Vector3(-0.1, -1.5, 0.45)],
    [new THREE.Vector3(0.1, 0.9, 0.98), new THREE.Vector3(0.55, 0.2, 1.1), new THREE.Vector3(0.75, -0.4, 0.85), new THREE.Vector3(0.45, -1.3, 0.55)],
    [new THREE.Vector3(-0.65, 0.3, 1.15), new THREE.Vector3(-1.15, 0.0, 0.75), new THREE.Vector3(-1.05, -0.7, 0.45)]
  ];

  const arteryMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00d2df,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    clippingPlanes: [localClippingPlane]
  });

  coronaryPaths.forEach(pts => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.05, 8, false), arteryMat);
    coronaryTree.add(tube);
  });
  heartGroup.add(coronaryTree);

  scene.add(heartGroup);
}

/* ==========================================================================
   MODEL 2: HOLOGRAPHIC CORTICAL CONNECTOME (BRAIN)
   ========================================================================== */

function buildNeuralConnectome() {
  brainGroup = new THREE.Group();
  brainGroup.position.set(1.4, 0, 0);

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

    const noise = Math.sin(rx * 6) * Math.cos(ry * 6) * Math.sin(rz * 6) * 0.08;
    rx += noise; ry += noise; rz += noise;

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

  synapticMesh = new THREE.Points(geo, mat);
  brainGroup.add(synapticMesh);

  axonMeshGroup = new THREE.Group();
  const lineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 30; i++) {
    const p1 = new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.0, 1.0);
    const p2 = new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.5, 0.0);
    const p3 = new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.0, -1.0);
    const curve = new THREE.QuadraticBezierCurve3(p1, p2, p3);
    axonMeshGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(20)), lineMat));
  }
  brainGroup.add(axonMeshGroup);

  scene.add(brainGroup);
}

function buildAtmosphericField() {
  const count = 140;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.038,
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending
  });

  ambientBioField = new THREE.Points(geo, mat);
  scene.add(ambientBioField);
}

/* ==========================================================================
   ANIMATION & RENDER LOOP
   ========================================================================== */

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // Natural Cardiac Cycle Math
  const cycleFreq = (bpm / 60) * Math.PI * 2;
  const pulsePhase = (time * (bpm / 60)) % 1;

  // Dual-peak ventricular contraction profile (Lub-Dub)
  let contraction = 0;
  if (pulsePhase < 0.25) {
    contraction = Math.sin((pulsePhase / 0.25) * Math.PI) * 0.14; // Systole
  } else if (pulsePhase >= 0.35 && pulsePhase < 0.5) {
    contraction = Math.sin(((pulsePhase - 0.35) / 0.15) * Math.PI) * 0.06; // Secondary atria
  }

  // Audio Trigger for Organic Heartbeat
  if (isPlaying && isAudioActive && (pulsePhase < 0.08) && (time - lastHeartBeatTime > 0.6)) {
    lastHeartBeatTime = time;
    playOrganicHeartbeatSound();
  }

  if (activeModel === 'heart' && heartGroup) {
    if (autoRotate) heartGroup.rotation.y += delta * 0.35;
    
    if (isPlaying && myocardiumMesh) {
      myocardiumMesh.scale.set(1 + contraction, 1 - contraction * 0.6, 1 + contraction);
      
      // Update scrubber UI
      const scrubber = document.getElementById('cycle-scrubber');
      if (scrubber) scrubber.value = Math.round(pulsePhase * 100);

      // Phase title
      const phaseElem = document.getElementById('phase-name');
      if (phaseElem) {
        if (pulsePhase < 0.3) phaseElem.textContent = 'VENTRICULAR SYSTOLE';
        else if (pulsePhase < 0.6) phaseElem.textContent = 'ISOVOLUMETRIC RELAXATION';
        else phaseElem.textContent = 'DIASTOLIC VENTRICULAR FILLING';
      }
    }
  } else if (activeModel === 'brain' && brainGroup) {
    if (autoRotate) brainGroup.rotation.y += delta * 0.3;
    if (synapticMesh) {
      const col = synapticMesh.geometry.attributes.color;
      const pos = synapticMesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 28) {
        if (Math.sin(time * 5.0 + pos.getX(i) * 4.0) > 0.85) {
          col.setXYZ(i, 1.0, 1.0, 1.0);
        }
      }
      col.needsUpdate = true;
    }
  }

  // Ambient dust rotation
  if (ambientBioField) {
    ambientBioField.rotation.y = time * 0.02;
  }

  // Pointer Follower Smooth Lerp
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
  activeModel = model;
  document.querySelectorAll('.deck-btn').forEach(btn => btn.classList.remove('active'));
  event.currentTarget.classList.add('active');

  const backdrop = document.getElementById('backdrop-text');
  const scrubberCard = document.getElementById('cardiac-scrubber-card');

  if (model === 'heart') {
    backdrop.textContent = 'HEMODYNAMICS';
    scrubberCard.style.display = 'block';
    camera.position.set(0, 0.4, 8.2);
  } else {
    backdrop.textContent = 'CONNECTOME';
    scrubberCard.style.display = 'none';
    camera.position.set(0, 0.6, 7.6);
  }

  updateModelVisibility();
}

function updateModelVisibility() {
  if (heartGroup) heartGroup.visible = (activeModel === 'heart');
  if (brainGroup) brainGroup.visible = (activeModel === 'brain');
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
  localClippingPlane.constant = 2.0;
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
    localClippingPlane.constant = -0.1;
    document.getElementById('slice-slider').value = -0.1;
    document.getElementById('slice-pos-val').textContent = '4-CHAMBER CROSS (-1.0 mm)';
  }
}

function toggleWireframeMode() {
  isWireframe = !isWireframe;
  if (myocardiumMesh) myocardiumMesh.material.wireframe = isWireframe;
  if (aortaMesh) aortaMesh.material.wireframe = isWireframe;
}

function manualScrub(val) {
  isPlaying = false;
  document.getElementById('play-state-icon').textContent = '▶';
  document.getElementById('play-state-txt').textContent = 'Resume Rhythm';

  const phase = val / 100;
  const contraction = Math.sin(phase * Math.PI) * 0.15;
  if (myocardiumMesh) {
    myocardiumMesh.scale.set(1 + contraction, 1 - contraction * 0.6, 1 + contraction);
  }
}

function togglePulsePlay() {
  isPlaying = !isPlaying;
  document.getElementById('play-state-icon').textContent = isPlaying ? '⏸' : '▶';
  document.getElementById('play-state-txt').textContent = isPlaying ? 'Live Rhythm' : 'Resume Rhythm';
}

function triggerArrhythmiaDemo() {
  bpm = 140;
  document.getElementById('systolic-val').innerHTML = '154 <small>mmHg</small>';
  document.getElementById('stress-val').innerHTML = '38.6 <small>kPa</small>';
  document.getElementById('doppler-vel').innerHTML = '2.14 <small>m/s</small>';

  setTimeout(() => {
    bpm = 60;
    document.getElementById('systolic-val').innerHTML = '118 <small>mmHg</small>';
    document.getElementById('stress-val').innerHTML = '18.2 <small>kPa</small>';
    document.getElementById('doppler-vel').innerHTML = '1.28 <small>m/s</small>';
  }, 4000);
}

/* ==========================================================================
   2D DOPPLER ULTRASOUND CANVAS
   ========================================================================== */

function initDopplerCanvas() {
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
  // Authentic Parabolic Systolic Jet Flow Waveform
  if (phase < 0.28) {
    const jet = Math.sin((phase / 0.28) * Math.PI);
    y -= jet * 38; // Systolic flow velocity spike
  } else if (phase >= 0.45 && phase < 0.65) {
    const dJet = Math.sin(((phase - 0.45) / 0.2) * Math.PI);
    y -= dJet * 12; // Early diastolic fill
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

function playOrganicHeartbeatSound() {
  if (!isAudioActive) return;
  try {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Lub (Low thump)
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(68, audioContext.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(32, audioContext.currentTime + 0.12);
    gain1.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.start();
    osc1.stop(audioContext.currentTime + 0.12);

    // Dub (Secondary thump after 0.15s)
    setTimeout(() => {
      if (!audioContext) return;
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(82, audioContext.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(38, audioContext.currentTime + 0.1);
      gain2.gain.setValueAtTime(0.05, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.start();
      osc2.stop(audioContext.currentTime + 0.1);
    }, 150);
  } catch (e) {}
}

function toggleAudioEngine() {
  isAudioActive = !isAudioActive;
  document.getElementById('sound-label').textContent = isAudioActive ? 'AUDIO: ACTIVE' : 'AUDIO: MUTED';
}

function resetCameraAngle() {
  camera.position.set(0, 0.4, 8.2);
  if (controls) controls.target.set(0, 0, 0);
  if (heartGroup) heartGroup.rotation.set(0, 0, 0);
}

function toggleAutoRotation() {
  autoRotate = !autoRotate;
  document.getElementById('orbit-btn-text').textContent = autoRotate ? 'Pause Rotation' : 'Resume Rotation';
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
