/**
 * GENOMIX AI 3D - Flagship Three.js WebGL Interactive Biotechnology Engine
 * Award-winning 3D DNA Double Helix, Neural Connectome & CRISPR Simulation
 */

// Global 3D State
let scene, camera, renderer, controls;
let activeMode = 'dna'; // 'dna' | 'brain' | 'cell'
let autoRotate = true;
let isAudioMuted = false;
let audioCtx = null;
let clock = new THREE.Clock();

// 3D Objects
let dnaGroup, rungsGroup, backbone1, backbone2, crisprTool;
let brainGroup, synapticPoints, axonTracts;
let cellGroup, rbcList = [], targetCell, nanobotFleet = [];

// Base Pair Sequence State
const BASE_TYPES = ['A', 'T', 'G', 'C'];
const BASE_COLORS = {
  A: 0x00f2fe, // Cyan
  T: 0xff2a5f, // Rose / Pulse Red
  G: 0x00f5a0, // Emerald Green
  C: 0xffb703  // Amber
};
let currentSequence = ['A', 'T', 'G', 'C', 'C', 'G', 'T', 'A', 'A', 'T', 'C', 'G', 'T', 'A', 'G', 'C', 'A', 'T', 'G', 'C'];

// Telemetry Canvas
let telemetryCanvas, telemetryCtx;
let teleX = 0, lastTeleY = 48;

// Mouse Parallax
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;

document.addEventListener('DOMContentLoaded', () => {
  initThree();
  initTelemetryCanvas();
  renderSequenceRow();
  animate();

  window.addEventListener('resize', onWindowResize);
  document.addEventListener('mousemove', onMouseMove);
});

/* ==========================================================================
   THREE.JS SCENE SETUP
   ========================================================================== */

function initThree() {
  const container = document.getElementById('webgl-canvas');
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x040711, 0.032);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0.5, 8.2);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  container.appendChild(renderer.domElement);

  if (typeof THREE.OrbitControls !== 'undefined') {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 14;
    controls.minDistance = 3.2;
    controls.enablePan = false;
  }

  // Dynamic Lighting
  const ambient = new THREE.AmbientLight(0x0a1428, 2.2);
  scene.add(ambient);

  const keyLight = new THREE.PointLight(0x00f2fe, 4.0, 25);
  keyLight.position.set(4, 5, 4);
  scene.add(keyLight);

  const purpleLight = new THREE.PointLight(0xa855f7, 3.5, 25);
  purpleLight.position.set(-4, -2, 3);
  scene.add(purpleLight);

  const emeraldLight = new THREE.PointLight(0x00f5a0, 2.5, 20);
  emeraldLight.position.set(0, 6, -3);
  scene.add(emeraldLight);

  // Build 3D Models
  buildDNAHelix();
  buildNeuralBrain();
  buildCellularImmuno();

  // Set initial visibility
  updateModelVisibility();
}

/* ==========================================================================
   MODEL 1: 3D QUANTUM DNA DOUBLE HELIX & CRISPR ENGINE
   ========================================================================== */

function buildDNAHelix() {
  if (dnaGroup) scene.remove(dnaGroup);

  dnaGroup = new THREE.Group();
  dnaGroup.position.set(1.4, 0, 0); // Positioned for split hero layout

  const numPairs = currentSequence.length;
  const height = 9.5;
  const radius = 1.3;
  const turns = 2.8;

  const pts1 = [];
  const pts2 = [];
  rungsGroup = new THREE.Group();

  for (let i = 0; i < numPairs; i++) {
    const t = i / (numPairs - 1);
    const angle = t * Math.PI * 2 * turns;
    const y = (t - 0.5) * height;

    const x1 = Math.cos(angle) * radius;
    const z1 = Math.sin(angle) * radius;
    const x2 = Math.cos(angle + Math.PI) * radius;
    const z2 = Math.sin(angle + Math.PI) * radius;

    pts1.push(new THREE.Vector3(x1, y, z1));
    pts2.push(new THREE.Vector3(x2, y, z2));

    const base1 = currentSequence[i];
    const base2 = (base1 === 'A') ? 'T' : (base1 === 'T') ? 'A' : (base1 === 'G') ? 'C' : 'G';

    // Rung segment 1
    const pMid = new THREE.Vector3((x1 + x2) / 2, y, (z1 + z2) / 2);
    const rungGeo1 = new THREE.CylinderGeometry(0.065, 0.065, radius, 14);
    const rungMat1 = new THREE.MeshStandardMaterial({
      color: BASE_COLORS[base1],
      emissive: BASE_COLORS[base1],
      emissiveIntensity: 0.7,
      roughness: 0.2
    });
    const rungMesh1 = new THREE.Mesh(rungGeo1, rungMat1);
    rungMesh1.position.set((x1 + pMid.x) / 2, y, (z1 + pMid.z) / 2);
    rungMesh1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x1 - pMid.x, 0, z1 - pMid.z).normalize());
    rungsGroup.add(rungMesh1);

    // Rung segment 2
    const rungMat2 = new THREE.MeshStandardMaterial({
      color: BASE_COLORS[base2],
      emissive: BASE_COLORS[base2],
      emissiveIntensity: 0.7,
      roughness: 0.2
    });
    const rungMesh2 = new THREE.Mesh(rungGeo1, rungMat2);
    rungMesh2.position.set((x2 + pMid.x) / 2, y, (z2 + pMid.z) / 2);
    rungMesh2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x2 - pMid.x, 0, z2 - pMid.z).normalize());
    rungsGroup.add(rungMesh2);

    // Hydrogen bonding central node
    const hNode = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 })
    );
    hNode.position.copy(pMid);
    rungsGroup.add(hNode);
  }

  // Sugar-phosphate glowing ribbons
  const curve1 = new THREE.CatmullRomCurve3(pts1);
  const curve2 = new THREE.CatmullRomCurve3(pts2);

  const backboneMat = new THREE.MeshPhysicalMaterial({
    color: 0x00f5a0,
    emissive: 0x00472e,
    metalness: 0.2,
    roughness: 0.15,
    clearcoat: 1.0,
    transmission: 0.3
  });

  backbone1 = new THREE.Mesh(new THREE.TubeGeometry(curve1, 100, 0.11, 16, false), backboneMat);
  backbone2 = new THREE.Mesh(new THREE.TubeGeometry(curve2, 100, 0.11, 16, false), backboneMat);

  dnaGroup.add(backbone1);
  dnaGroup.add(backbone2);
  dnaGroup.add(rungsGroup);

  // CRISPR-Cas9 Laser Molecular Cleavage Tool
  buildCrisprModel();

  scene.add(dnaGroup);
}

function buildCrisprModel() {
  crisprTool = new THREE.Group();

  const envelope = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.85, 2),
    new THREE.MeshStandardMaterial({
      color: 0xff2a5f,
      wireframe: true,
      emissive: 0xff2a5f,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.75
    })
  );
  crisprTool.add(envelope);

  const laser = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 3.2, 8),
    new THREE.MeshBasicMaterial({ color: 0x00f2fe })
  );
  laser.rotation.z = Math.PI / 2;
  laser.position.x = -1.6;
  crisprTool.add(laser);

  crisprTool.position.set(4.0, 0, 0);
  crisprTool.visible = false;
  dnaGroup.add(crisprTool);
}

/* ==========================================================================
   MODEL 2: 3D HOLOGRAPHIC NEURAL CONNECTOME BRAIN
   ========================================================================== */

function buildNeuralBrain() {
  brainGroup = new THREE.Group();
  brainGroup.position.set(1.4, 0, 0);

  const count = 14000;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const lobes = new Float32Array(count);

  let idx = 0;
  for (let i = 0; i < count; i++) {
    const hem = Math.random() > 0.5 ? 1 : -1;
    const u = Math.random() * Math.PI;
    const v = Math.random() * Math.PI * 2;

    let rx = 1.35 * Math.sin(u) * Math.cos(v);
    let ry = 1.1 * Math.cos(u);
    let rz = 1.65 * Math.sin(u) * Math.sin(v);

    rx = hem * (Math.abs(rx) * 0.85 + 0.15);

    if (ry < -0.3 && rz < -0.4) {
      rx *= 0.9; rz -= 0.2; ry -= 0.2;
    }

    const noise = Math.sin(rx * 6) * Math.cos(ry * 6) * Math.sin(rz * 6) * 0.08;
    rx += noise; ry += noise; rz += noise;

    pos[idx * 3] = rx;
    pos[idx * 3 + 1] = ry;
    pos[idx * 3 + 2] = rz;

    let c = new THREE.Color(0xa855f7);
    let lId = 0;
    if (rz > 0.3) { c = new THREE.Color(0xa855f7); lId = 0; } // Frontal
    else if (rz <= 0.3 && rz > -0.6 && ry > 0.1) { c = new THREE.Color(0x00f2fe); lId = 1; } // Parietal
    else if (ry <= 0.1 && rz > -0.5 && rz < 0.4) { c = new THREE.Color(0x00f5a0); lId = 2; } // Temporal
    else if (rz <= -0.6 && ry > -0.2) { c = new THREE.Color(0xff2a5f); lId = 3; } // Occipital
    else { c = new THREE.Color(0xffb703); lId = 4; } // Cerebellum

    col[idx * 3] = c.r;
    col[idx * 3 + 1] = c.g;
    col[idx * 3 + 2] = c.b;
    lobes[idx] = lId;
    idx++;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('lobeIndex', new THREE.BufferAttribute(lobes, 1));

  const mat = new THREE.PointsMaterial({
    size: 0.046,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });

  synapticPoints = new THREE.Points(geo, mat);
  brainGroup.add(synapticPoints);

  // Axon Tractography Curves
  axonTracts = new THREE.Group();
  const tractMat = new THREE.LineBasicMaterial({
    color: 0x00f2fe,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending
  });

  for (let i = 0; i < 30; i++) {
    const p1 = new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.0, 1.0);
    const p2 = new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.5, 0.0);
    const p3 = new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.0, -1.0);
    const curve = new THREE.QuadraticBezierCurve3(p1, p2, p3);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(20)), tractMat);
    axonTracts.add(line);
  }
  brainGroup.add(axonTracts);

  scene.add(brainGroup);
}

/* ==========================================================================
   MODEL 3: 3D CELLULAR IMMUNO-ONCOLOGY & NANOBOTS
   ========================================================================== */

function buildCellularImmuno() {
  cellGroup = new THREE.Group();
  cellGroup.position.set(1.4, 0, 0);

  // Red blood cells
  const rbcGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.16, 24);
  const rbcMat = new THREE.MeshPhysicalMaterial({
    color: 0xcc1835,
    emissive: 0x4a000e,
    roughness: 0.3,
    clearcoat: 0.7
  });

  for (let i = 0; i < 15; i++) {
    const rbc = new THREE.Mesh(rbcGeo, rbcMat);
    rbc.position.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
    rbc.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    cellGroup.add(rbc);
    rbcList.push(rbc);
  }

  // Pathogen target cell with spikes
  const targetGeo = new THREE.SphereGeometry(1.1, 24, 24);
  const targetMat = new THREE.MeshPhysicalMaterial({
    color: 0x3d0c24,
    emissive: 0xff2a5f,
    emissiveIntensity: 0.4,
    roughness: 0.4
  });
  targetCell = new THREE.Mesh(targetGeo, targetMat);
  targetCell.position.set(-0.4, 0, 0);

  for (let i = 0; i < 30; i++) {
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.3, 8),
      new THREE.MeshStandardMaterial({ color: 0xff2a5f, emissive: 0xff2a5f })
    );
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    spike.position.copy(dir.clone().multiplyScalar(1.2));
    spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    targetCell.add(spike);
  }
  cellGroup.add(targetCell);

  scene.add(cellGroup);
}

/* ==========================================================================
   ANIMATION & RENDER LOOP
   ========================================================================== */

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // Smooth inertial mouse parallax
  targetX = mouseX * 0.4;
  targetY = mouseY * 0.4;

  // Active Model Animation
  if (activeMode === 'dna' && dnaGroup) {
    if (autoRotate) dnaGroup.rotation.y += delta * 0.45;
    dnaGroup.rotation.x = THREE.MathUtils.lerp(dnaGroup.rotation.x, targetY * 0.3, 0.05);
    dnaGroup.rotation.z = THREE.MathUtils.lerp(dnaGroup.rotation.z, targetX * 0.2, 0.05);
  } else if (activeMode === 'brain' && brainGroup) {
    if (autoRotate) brainGroup.rotation.y += delta * 0.35;
    // Synaptic sparkle
    if (synapticPoints) {
      const colors = synapticPoints.geometry.attributes.color;
      const pos = synapticPoints.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 25) {
        if (Math.sin(time * 6.0 + pos.getX(i) * 5.0) > 0.85) {
          colors.setXYZ(i, 1.0, 1.0, 1.0);
        }
      }
      colors.needsUpdate = true;
    }
  } else if (activeMode === 'cell' && cellGroup) {
    if (autoRotate) cellGroup.rotation.y += delta * 0.25;
    rbcList.forEach((rbc, idx) => {
      rbc.position.x -= delta * (0.5 + (idx % 2) * 0.2);
      if (rbc.position.x < -3.5) rbc.position.x = 3.5;
    });
    if (targetCell) {
      const p = 1.0 + Math.sin(time * 2.5) * 0.04;
      targetCell.scale.set(p, p, p);
    }
  }

  if (controls) controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(e) {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
}

/* ==========================================================================
   MODE SWITCHING & VISIBILITY
   ========================================================================== */

function switch3DMode(mode) {
  activeMode = mode;
  playSynthBeep(440, 0.08);

  // Update tabs UI
  document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
  event.currentTarget.classList.add('active');

  // Toggle controls card visibility
  const dnaCard = document.getElementById('dna-controls');
  const brainCard = document.getElementById('brain-controls');
  const waveTitle = document.getElementById('wave-title');

  if (mode === 'dna') {
    dnaCard.style.display = 'block';
    brainCard.style.display = 'none';
    waveTitle.textContent = 'Real-Time Gene Expression & Bio-Signal';
    camera.position.set(0, 0.5, 8.2);
  } else if (mode === 'brain') {
    dnaCard.style.display = 'none';
    brainCard.style.display = 'block';
    waveTitle.textContent = 'Synchronized Multi-Band EEG Frequency (128ch)';
    camera.position.set(0, 0.8, 7.5);
  } else {
    dnaCard.style.display = 'none';
    brainCard.style.display = 'none';
    waveTitle.textContent = 'Micro-Vascular Flow & Pathogen Density';
    camera.position.set(0, 0.5, 8.0);
  }

  updateModelVisibility();
}

function updateModelVisibility() {
  if (dnaGroup) dnaGroup.visible = (activeMode === 'dna');
  if (brainGroup) brainGroup.visible = (activeMode === 'brain');
  if (cellGroup) cellGroup.visible = (activeMode === 'cell');
}

/* ==========================================================================
   DNA SEQUENCE MATRIX & CRISPR INTERACTION
   ========================================================================== */

function renderSequenceRow() {
  const row = document.getElementById('sequence-row');
  if (!row) return;
  row.innerHTML = '';

  currentSequence.forEach((base, idx) => {
    const pill = document.createElement('div');
    pill.className = `seq-pill pill-${base.toLowerCase()}`;
    pill.textContent = base;
    pill.title = `Position ${idx + 1}: ${base} (Click to cycle nucleotide)`;
    pill.onclick = () => cycleBaseAt(idx);
    row.appendChild(pill);
  });
}

function cycleBaseAt(idx) {
  const cur = currentSequence[idx];
  const nextIdx = (BASE_TYPES.indexOf(cur) + 1) % BASE_TYPES.length;
  currentSequence[idx] = BASE_TYPES[nextIdx];
  playSynthBeep(600 + idx * 25, 0.06);

  renderSequenceRow();
  buildDNAHelix();
}

function triggerCrisprCleavage() {
  playSynthBeep(880, 0.25);
  if (!crisprTool) return;
  crisprTool.visible = true;

  let t = 0;
  const interval = setInterval(() => {
    t += 0.05;
    crisprTool.position.x = THREE.MathUtils.lerp(4.0, 0.0, t);

    if (t >= 1) {
      clearInterval(interval);
      // Correct central base pair
      currentSequence[8] = 'G';
      currentSequence[9] = 'C';
      renderSequenceRow();
      buildDNAHelix();

      document.getElementById('locus-id').textContent = 'CFTR Exon 10 (Repaired ✓)';
      document.getElementById('fidelity-val').textContent = '99.99%';
      document.getElementById('risk-stat').textContent = '<0.0001%';

      setTimeout(() => {
        crisprTool.visible = false;
        crisprTool.position.x = 4.0;
      }, 1500);
    }
  }, 30);
}

function introduceMutation() {
  playSynthBeep(320, 0.15);
  const randIdx = Math.floor(Math.random() * currentSequence.length);
  const cur = currentSequence[randIdx];
  const choices = BASE_TYPES.filter(b => b !== cur);
  currentSequence[randIdx] = choices[Math.floor(Math.random() * choices.length)];

  renderSequenceRow();
  buildDNAHelix();
  document.getElementById('risk-stat').textContent = (Math.random() * 0.4 + 0.1).toFixed(3) + '%';
}

function resetSequence() {
  currentSequence = ['A', 'T', 'G', 'C', 'C', 'G', 'T', 'A', 'A', 'T', 'C', 'G', 'T', 'A', 'G', 'C', 'A', 'T', 'G', 'C'];
  renderSequenceRow();
  buildDNAHelix();
  document.getElementById('locus-id').textContent = 'CFTR Exon 10';
  document.getElementById('risk-stat').textContent = '<0.001%';
}

/* ==========================================================================
   BRAIN CONTROLLERS
   ========================================================================== */

function selectCorticalLobe(lobe) {
  playSynthBeep(520, 0.08);
  document.querySelectorAll('.lobe-pill').forEach(p => p.classList.remove('active'));
  event.currentTarget.classList.add('active');

  const names = {
    all: 'Full Connectome',
    frontal: 'Frontal (Executive & Cognition)',
    parietal: 'Parietal (Sensory Integration)',
    temporal: 'Temporal (Memory & Auditory)',
    occipital: 'Occipital (Visual Cortex)',
    cerebellum: 'Cerebellum (Motor Precision)'
  };
  document.getElementById('active-lobe-name').textContent = names[lobe] || lobe;

  if (lobe === 'frontal') camera.position.set(0, 0.6, 6.5);
  else if (lobe === 'occipital') camera.position.set(0, 0.6, -6.5);
  else if (lobe === 'cerebellum') camera.position.set(0, -1.8, -5.5);
  else camera.position.set(0, 0.8, 7.5);
}

function triggerSynapticSparks() {
  playSynthBeep(950, 0.3);
  if (synapticPoints) {
    const col = synapticPoints.geometry.attributes.color;
    for (let i = 0; i < col.count; i++) {
      col.setXYZ(i, 1.0, 1.0, 1.0);
    }
    col.needsUpdate = true;
    setTimeout(() => {
      buildNeuralBrain();
    }, 400);
  }
}

function toggleTractography() {
  if (axonTracts) axonTracts.visible = !axonTracts.visible;
}

/* ==========================================================================
   DYNAMIC 2D TELEMETRY CANVAS PLOTTER
   ========================================================================== */

function initTelemetryCanvas() {
  telemetryCanvas = document.getElementById('telemetry-canvas');
  if (!telemetryCanvas) return;
  telemetryCtx = telemetryCanvas.getContext('2d');
  telemetryCtx.lineWidth = 2.0;

  setInterval(drawTelemetryStep, 35);
}

function drawTelemetryStep() {
  if (!telemetryCtx) return;
  const w = telemetryCanvas.width;
  const h = telemetryCanvas.height;
  const midY = h / 2;

  telemetryCtx.clearRect(teleX, 0, 10, h);

  const t = Date.now() / 1000;
  let y = midY;

  if (activeMode === 'dna') {
    // Helical harmonic expression curve
    y += Math.sin(t * 5 + teleX * 0.08) * 22 * Math.cos(teleX * 0.04);
    telemetryCtx.strokeStyle = '#00f2fe';
    telemetryCtx.shadowBlur = 6;
    telemetryCtx.shadowColor = '#00f2fe';
  } else if (activeMode === 'brain') {
    // Multi-band EEG wave
    const alpha = Math.sin(teleX * 0.15 + t * 6) * 14;
    const beta = Math.sin(teleX * 0.3 + t * 12) * 6;
    y += alpha + beta;
    telemetryCtx.strokeStyle = '#a855f7';
    telemetryCtx.shadowBlur = 6;
    telemetryCtx.shadowColor = '#a855f7';
  } else {
    // Vascular flow pulses
    y += Math.sin(t * 3 + teleX * 0.1) * 18;
    telemetryCtx.strokeStyle = '#00f5a0';
    telemetryCtx.shadowBlur = 6;
    telemetryCtx.shadowColor = '#00f5a0';
  }

  telemetryCtx.beginPath();
  telemetryCtx.moveTo(teleX, lastTeleY);
  telemetryCtx.lineTo(teleX + 2, y);
  telemetryCtx.stroke();

  lastTeleY = y;
  teleX = (teleX + 2) % w;
}

/* ==========================================================================
   VIEWPORT DOCK ACTIONS
   ========================================================================== */

function reset3DCamera() {
  camera.position.set(0, 0.5, 8.2);
  if (controls) controls.target.set(0, 0, 0);
  if (dnaGroup) dnaGroup.rotation.set(0, 0, 0);
  if (brainGroup) brainGroup.rotation.set(0, 0, 0);
}

function toggleAutoRotate() {
  autoRotate = !autoRotate;
  document.getElementById('rotate-txt').textContent = autoRotate ? 'Pause Orbit' : 'Auto Orbit';
}

function zoomIn3D() {
  camera.position.z = Math.max(3.5, camera.position.z - 1.0);
}

function zoomOut3D() {
  camera.position.z = Math.min(13.0, camera.position.z + 1.0);
}

function explode3DView() {
  playSynthBeep(680, 0.12);
  if (activeMode === 'dna') {
    backbone1.position.x = backbone1.position.x === 0 ? 0.6 : 0;
    backbone2.position.x = backbone2.position.x === 0 ? -0.6 : 0;
  } else if (activeMode === 'brain' && axonTracts) {
    axonTracts.scale.set(1.4, 1.4, 1.4);
    setTimeout(() => axonTracts.scale.set(1, 1, 1), 1200);
  }
}

/* ==========================================================================
   AUDIO SYNTHESIS ENGINE (WEB AUDIO API)
   ========================================================================== */

function playSynthBeep(freq = 440, duration = 0.1) {
  if (isAudioMuted) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Audio context may require user gesture
  }
}

function toggleAudio() {
  isAudioMuted = !isAudioMuted;
  const icon = document.getElementById('audio-icon');
  if (icon) {
    icon.setAttribute('data-lucide', isAudioMuted ? 'volume-x' : 'volume-2');
    if (window.lucide) lucide.createIcons();
  }
}

/* ==========================================================================
   CALCULATOR & MODAL LOGIC
   ========================================================================== */

function updateCalculator() {
  const sub = parseFloat(document.querySelectorAll('.calc-inputs input')[0].value);
  const gc = parseInt(document.querySelectorAll('.calc-inputs input')[1].value);
  const syn = parseInt(document.querySelectorAll('.calc-inputs input')[2].value);

  document.getElementById('calc-sub-val').textContent = sub.toFixed(1) + '%';
  document.getElementById('calc-gc-val').textContent = gc + '%';
  document.getElementById('calc-syn-val').textContent = syn;

  const score = (99.8 - (sub * 0.15) + (gc > 45 && gc < 65 ? 0.3 : -0.5)).toFixed(1);
  document.getElementById('calc-score').textContent = score + '%';
}

function openEnrollModal() {
  playSynthBeep(580, 0.1);
  document.getElementById('enroll-modal').classList.add('active');
}

function closeEnrollModal() {
  document.getElementById('enroll-modal').classList.remove('active');
}

function handleEnrollSubmit(e) {
  e.preventDefault();
  playSynthBeep(880, 0.2);
  alert('Genomic trial registration submitted. Our principal clinical coordinator will verify your protocol credentials.');
  closeEnrollModal();
}
