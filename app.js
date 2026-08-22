/**
 * PRISM GENOMICS — World-Class WebGL 3D Structural Biophysics Engine
 * Editorial Awwwards/FWA Standard • Real-Time DNA Kinetics & Cryo-EM Simulation
 */

// Scene Core
let scene, camera, renderer, controls;
let activeTarget = 'dna'; // 'dna' | 'brain' | 'cryo'
let autoOrbit = true;
let isAudioEnabled = true;
let audioContext = null;
let clock = new THREE.Clock();

// 3D Objects
let dnaGroup, rungsContainer, ribbon1, ribbon2, cleavageTargetMarker, particulateField;
let connectomeGroup, connectomePoints, axonCurves;
let cryoDensityGroup, cryoIsoMesh;

// Nucleotide Sequence
const BASES = ['A', 'T', 'G', 'C'];
const BASE_PALETTE = {
  A: 0x38bdf8, // Spectral Cyan
  T: 0xf43f5e, // Precision Rose
  G: 0x34d399, // Phosphor Emerald
  C: 0xfbbf24  // Warm Amber
};

let activeSequence = [
  'A', 'T', 'G', 'C', 'C', 'G', 'T', 'A', 'A', 'T', 'C', 'G', 'T', 'A', 'G', 'C', 'A', 'T', 'G', 'C', 'G', 'C', 'A', 'T'
];

// Telemetry Canvas
let waveCanvas, waveCtx;
let waveX = 0, lastWaveY = 37;

// Mouse Interaction & Custom Cursor
let mouseX = 0, mouseY = 0;
let targetCameraX = 0, targetCameraY = 0;
let cursorX = 0, cursorY = 0;
let ringX = 0, ringY = 0;

document.addEventListener('DOMContentLoaded', () => {
  initEngine();
  initCustomCursor();
  initTelemetryWave();
  renderSequenceTrack();
  animate();

  window.addEventListener('resize', onResize);
  document.addEventListener('mousemove', onPointerMove);
});

/* ==========================================================================
   THREE.JS SCENE INITIALIZATION
   ========================================================================== */

function initEngine() {
  const container = document.getElementById('webgl-canvas');
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07080b, 0.038);

  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0.4, 8.5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  container.appendChild(renderer.domElement);

  if (typeof THREE.OrbitControls !== 'undefined') {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.maxDistance = 13;
    controls.minDistance = 3.5;
    controls.enablePan = false;
  }

  // Atmospheric Lighting
  const ambient = new THREE.AmbientLight(0x090c14, 2.5);
  scene.add(ambient);

  const keyCyan = new THREE.PointLight(0x38bdf8, 3.8, 22);
  keyCyan.position.set(4.5, 5, 4);
  scene.add(keyCyan);

  const fillPurple = new THREE.PointLight(0xc084fc, 2.8, 20);
  fillPurple.position.set(-4.5, -2, 3);
  scene.add(fillPurple);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
  rimLight.position.set(0, 6, -4);
  scene.add(rimLight);

  // Build Procedural Models
  buildDNAHelixStructure();
  buildConnectomeStructure();
  buildCryoDensityStructure();
  buildAmbientParticulates();

  updateModelVisibility();
}

/* ==========================================================================
   MODEL 1: BESPOKE PROCEDURAL DNA DOUBLE HELIX
   ========================================================================== */

function buildDNAHelixStructure() {
  if (dnaGroup) scene.remove(dnaGroup);

  dnaGroup = new THREE.Group();
  dnaGroup.position.set(1.5, 0, 0); // Positioned for right-side visual weight

  const pairCount = activeSequence.length;
  const height = 9.8;
  const radius = 1.28;
  const pitchTurns = 2.6;

  const strand1Points = [];
  const strand2Points = [];
  rungsContainer = new THREE.Group();

  for (let i = 0; i < pairCount; i++) {
    const t = i / (pairCount - 1);
    const angle = t * Math.PI * 2 * pitchTurns;
    const y = (t - 0.5) * height;

    const x1 = Math.cos(angle) * radius;
    const z1 = Math.sin(angle) * radius;
    const x2 = Math.cos(angle + Math.PI) * radius;
    const z2 = Math.sin(angle + Math.PI) * radius;

    strand1Points.push(new THREE.Vector3(x1, y, z1));
    strand2Points.push(new THREE.Vector3(x2, y, z2));

    const base1 = activeSequence[i];
    const base2 = (base1 === 'A') ? 'T' : (base1 === 'T') ? 'A' : (base1 === 'G') ? 'C' : 'G';

    const pMid = new THREE.Vector3((x1 + x2) / 2, y, (z1 + z2) / 2);

    // Half Rung 1
    const rGeo = new THREE.CylinderGeometry(0.062, 0.062, radius, 16);
    const rMat1 = new THREE.MeshPhysicalMaterial({
      color: BASE_PALETTE[base1],
      emissive: BASE_PALETTE[base1],
      emissiveIntensity: 0.5,
      metalness: 0.1,
      roughness: 0.25,
      clearcoat: 0.8
    });
    const rMesh1 = new THREE.Mesh(rGeo, rMat1);
    rMesh1.position.set((x1 + pMid.x) / 2, y, (z1 + pMid.z) / 2);
    rMesh1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x1 - pMid.x, 0, z1 - pMid.z).normalize());
    rungsContainer.add(rMesh1);

    // Half Rung 2
    const rMat2 = new THREE.MeshPhysicalMaterial({
      color: BASE_PALETTE[base2],
      emissive: BASE_PALETTE[base2],
      emissiveIntensity: 0.5,
      metalness: 0.1,
      roughness: 0.25,
      clearcoat: 0.8
    });
    const rMesh2 = new THREE.Mesh(rGeo, rMat2);
    rMesh2.position.set((x2 + pMid.x) / 2, y, (z2 + pMid.z) / 2);
    rMesh2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x2 - pMid.x, 0, z2 - pMid.z).normalize());
    rungsContainer.add(rMesh2);

    // Hydrogen Bonding Center Node
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.1 })
    );
    node.position.copy(pMid);
    rungsContainer.add(node);
  }

  // Sugar-Phosphate Helical Ribbons
  const curve1 = new THREE.CatmullRomCurve3(strand1Points);
  const curve2 = new THREE.CatmullRomCurve3(strand2Points);

  const ribbonMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x34d399,
    emissive: 0x064e3b,
    metalness: 0.2,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transmission: 0.25
  });

  ribbon1 = new THREE.Mesh(new THREE.TubeGeometry(curve1, 120, 0.1, 16, false), ribbonMaterial);
  ribbon2 = new THREE.Mesh(new THREE.TubeGeometry(curve2, 120, 0.1, 16, false), ribbonMaterial);

  dnaGroup.add(ribbon1);
  dnaGroup.add(ribbon2);
  dnaGroup.add(rungsContainer);

  // Precision Targeting Laser Marker
  buildCleavageMarker();

  scene.add(dnaGroup);
}

function buildCleavageMarker() {
  cleavageTargetMarker = new THREE.Group();

  const ringGeo = new THREE.RingGeometry(0.4, 0.44, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  cleavageTargetMarker.add(ring);

  const laserGeo = new THREE.CylinderGeometry(0.015, 0.015, 3.5, 8);
  const laserMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });
  const laser = new THREE.Mesh(laserGeo, laserMat);
  laser.rotation.z = Math.PI / 2;
  laser.position.x = -1.75;
  cleavageTargetMarker.add(laser);

  cleavageTargetMarker.position.set(3.8, 0, 0);
  cleavageTargetMarker.visible = false;
  dnaGroup.add(cleavageTargetMarker);
}

/* ==========================================================================
   MODEL 2: 3D GENERATIVE CONNECTOME (BRAIN)
   ========================================================================== */

function buildConnectomeStructure() {
  connectomeGroup = new THREE.Group();
  connectomeGroup.position.set(1.5, 0, 0);

  const count = 15000;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);

  let idx = 0;
  for (let i = 0; i < count; i++) {
    const hem = Math.random() > 0.5 ? 1 : -1;
    const u = Math.random() * Math.PI;
    const v = Math.random() * Math.PI * 2;

    let rx = 1.35 * Math.sin(u) * Math.cos(v);
    let ry = 1.05 * Math.cos(u);
    let rz = 1.65 * Math.sin(u) * Math.sin(v);

    rx = hem * (Math.abs(rx) * 0.85 + 0.15);
    if (ry < -0.3 && rz < -0.4) { rx *= 0.85; rz -= 0.2; ry -= 0.2; }

    const gyri = Math.sin(rx * 6) * Math.cos(ry * 6) * Math.sin(rz * 6) * 0.08;
    rx += gyri; ry += gyri; rz += gyri;

    pos[idx * 3] = rx;
    pos[idx * 3 + 1] = ry;
    pos[idx * 3 + 2] = rz;

    let c = new THREE.Color(0x38bdf8);
    if (rz > 0.3) c = new THREE.Color(0x38bdf8);
    else if (rz <= 0.3 && rz > -0.6 && ry > 0.1) c = new THREE.Color(0xc084fc);
    else if (ry <= 0.1 && rz > -0.5 && rz < 0.4) c = new THREE.Color(0x34d399);
    else c = new THREE.Color(0xf43f5e);

    col[idx * 3] = c.r;
    col[idx * 3 + 1] = c.g;
    col[idx * 3 + 2] = c.b;
    idx++;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.042,
    vertexColors: true,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending
  });

  connectomePoints = new THREE.Points(geo, mat);
  connectomeGroup.add(connectomePoints);

  // Axon Tracts
  axonCurves = new THREE.Group();
  const tractMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending });

  for (let i = 0; i < 28; i++) {
    const p1 = new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.0, 1.0);
    const p2 = new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.5, 0.0);
    const p3 = new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.0, -1.0);
    const curve = new THREE.QuadraticBezierCurve3(p1, p2, p3);
    axonCurves.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(20)), tractMat));
  }
  connectomeGroup.add(axonCurves);

  scene.add(connectomeGroup);
}

/* ==========================================================================
   MODEL 3: CRYO-EM DENSITY SURFACE
   ========================================================================== */

function buildCryoDensityStructure() {
  cryoDensityGroup = new THREE.Group();
  cryoDensityGroup.position.set(1.5, 0, 0);

  const geo = new THREE.IcosahedronGeometry(1.6, 3);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const noise = Math.sin(v.x * 4) * Math.cos(v.y * 4) * 0.18;
    v.addScalar(noise);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b,
    emissive: 0x0f172a,
    wireframe: true,
    transparent: true,
    opacity: 0.6,
    metalness: 0.8,
    roughness: 0.2
  });

  cryoIsoMesh = new THREE.Mesh(geo, mat);
  cryoDensityGroup.add(cryoIsoMesh);

  scene.add(cryoDensityGroup);
}

/* ==========================================================================
   AMBIENT PARTICULATE DUST FIELD
   ========================================================================== */

function buildAmbientParticulates() {
  const count = 120;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.035,
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending
  });

  particulateField = new THREE.Points(geo, mat);
  scene.add(particulateField);
}

/* ==========================================================================
   ANIMATION & RENDER LOOP
   ========================================================================== */

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // Smooth Camera Lerp
  targetCameraX = mouseX * 0.35;
  targetCameraY = mouseY * 0.35;

  if (activeTarget === 'dna' && dnaGroup) {
    if (autoOrbit) dnaGroup.rotation.y += delta * 0.4;
    dnaGroup.rotation.x = THREE.MathUtils.lerp(dnaGroup.rotation.x, targetCameraY * 0.25, 0.05);
    dnaGroup.rotation.z = THREE.MathUtils.lerp(dnaGroup.rotation.z, targetCameraX * 0.2, 0.05);
  } else if (activeTarget === 'brain' && connectomeGroup) {
    if (autoOrbit) connectomeGroup.rotation.y += delta * 0.3;
    if (connectomePoints) {
      const col = connectomePoints.geometry.attributes.color;
      const pos = connectomePoints.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 30) {
        if (Math.sin(time * 5.0 + pos.getX(i) * 4.0) > 0.88) {
          col.setXYZ(i, 1.0, 1.0, 1.0);
        }
      }
      col.needsUpdate = true;
    }
  } else if (activeTarget === 'cryo' && cryoDensityGroup) {
    if (autoOrbit) cryoDensityGroup.rotation.y += delta * 0.25;
  }

  // Ambient dust drift
  if (particulateField) {
    particulateField.rotation.y = time * 0.02;
  }

  // Smooth Cursor Follower
  cursorX += (mouseX * window.innerWidth / 2 + window.innerWidth / 2 - cursorX) * 0.25;
  cursorY += (-mouseY * window.innerHeight / 2 + window.innerHeight / 2 - cursorY) * 0.25;
  ringX += (cursorX - ringX) * 0.15;
  ringY += (cursorY - ringY) * 0.15;

  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (dot && ring) {
    dot.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
  }

  if (controls) controls.update();
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(e) {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
}

/* ==========================================================================
   MODEL SWITCHER
   ========================================================================== */

function setVisualTarget(target) {
  activeTarget = target;
  playHarmonicTone(440, 0.08);

  document.querySelectorAll('.director-btn').forEach(btn => btn.classList.remove('active'));
  event.currentTarget.classList.add('active');

  updateModelVisibility();

  if (target === 'dna') camera.position.set(0, 0.4, 8.5);
  else if (target === 'brain') camera.position.set(0, 0.6, 7.8);
  else camera.position.set(0, 0.4, 7.0);
}

function updateModelVisibility() {
  if (dnaGroup) dnaGroup.visible = (activeTarget === 'dna');
  if (connectomeGroup) connectomeGroup.visible = (activeTarget === 'brain');
  if (cryoDensityGroup) cryoDensityGroup.visible = (activeTarget === 'cryo');
}

/* ==========================================================================
   SEQUENCE TRACK WORKBENCH
   ========================================================================== */

function renderSequenceTrack() {
  const track = document.getElementById('nucleotide-track');
  if (!track) return;
  track.innerHTML = '';

  let gcCount = 0;
  activeSequence.forEach((base, idx) => {
    if (base === 'G' || base === 'C') gcCount++;

    const pill = document.createElement('div');
    pill.className = `nt-pill nt-${base.toLowerCase()}`;
    pill.innerHTML = `
      <span class="nt-pos">${idx + 1}</span>
      <span class="nt-char">${base}</span>
    `;
    pill.title = `Codon Pos ${idx + 1}: ${base} (Click to toggle nucleotide)`;
    pill.onclick = () => cycleNucleotide(idx);
    track.appendChild(pill);
  });

  const gcPct = ((gcCount / activeSequence.length) * 100).toFixed(1);
  const gcElem = document.getElementById('gc-content');
  if (gcElem) gcElem.textContent = `${gcPct}%`;
}

function cycleNucleotide(idx) {
  const cur = activeSequence[idx];
  const next = BASES[(BASES.indexOf(cur) + 1) % BASES.length];
  activeSequence[idx] = next;

  playHarmonicTone(560 + idx * 20, 0.06);
  renderSequenceTrack();
  buildDNAHelixStructure();
}

function executeCleavageSequence() {
  playHarmonicTone(880, 0.2);
  if (!cleavageTargetMarker) return;
  cleavageTargetMarker.visible = true;

  let t = 0;
  const interval = setInterval(() => {
    t += 0.05;
    cleavageTargetMarker.position.x = THREE.MathUtils.lerp(3.8, 0, t);

    if (t >= 1) {
      clearInterval(interval);
      // Correct central locus
      activeSequence[8] = 'G';
      activeSequence[9] = 'C';
      renderSequenceTrack();
      buildDNAHelixStructure();

      document.getElementById('exon-name').textContent = 'CFTR Exon 10 (Edited ✓)';
      document.getElementById('locus-status').textContent = 'HOMOLOGY REPAIRED';
      document.getElementById('locus-status').style.color = '#34d399';
      document.getElementById('off-target').textContent = '< 0.00001%';

      setTimeout(() => {
        cleavageTargetMarker.visible = false;
        cleavageTargetMarker.position.x = 3.8;
      }, 1500);
    }
  }, 30);
}

function injectPathogenicVariant() {
  playHarmonicTone(320, 0.12);
  activeSequence[8] = 'T';
  activeSequence[9] = 'A';
  renderSequenceTrack();
  buildDNAHelixStructure();

  document.getElementById('exon-name').textContent = 'CFTR ΔF508 (rs77932196 Pathogenic)';
  document.getElementById('locus-status').textContent = 'VARIANT DETECTED';
  document.getElementById('locus-status').style.color = '#f43f5e';
  document.getElementById('off-target').textContent = '0.042%';
}

function restoreWildtypeSequence() {
  activeSequence = ['A', 'T', 'G', 'C', 'C', 'G', 'T', 'A', 'A', 'T', 'C', 'G', 'T', 'A', 'G', 'C', 'A', 'T', 'G', 'C', 'G', 'C', 'A', 'T'];
  renderSequenceTrack();
  buildDNAHelixStructure();

  document.getElementById('exon-name').textContent = 'CFTR Exon 10 (Reference)';
  document.getElementById('locus-status').textContent = 'WILDTYPE MATCH';
  document.getElementById('locus-status').style.color = '#34d399';
}

/* ==========================================================================
   2D TELEMETRY CANVAS PLOTTER
   ========================================================================== */

function initTelemetryWave() {
  waveCanvas = document.getElementById('wave-canvas');
  if (!waveCanvas) return;
  waveCtx = waveCanvas.getContext('2d');
  waveCtx.lineWidth = 1.8;

  setInterval(drawWaveStep, 35);
}

function drawWaveStep() {
  if (!waveCtx) return;
  const w = waveCanvas.width;
  const h = waveCanvas.height;
  const midY = h / 2;

  waveCtx.clearRect(waveX, 0, 8, h);

  const t = Date.now() / 1000;
  const y = midY + Math.sin(t * 4 + waveX * 0.08) * 18 * Math.cos(waveX * 0.03);

  waveCtx.strokeStyle = '#38bdf8';
  waveCtx.shadowBlur = 6;
  waveCtx.shadowColor = '#38bdf8';

  waveCtx.beginPath();
  waveCtx.moveTo(waveX, lastWaveY);
  waveCtx.lineTo(waveX + 2, y);
  waveCtx.stroke();

  lastWaveY = y;
  waveX = (waveX + 2) % w;
}

/* ==========================================================================
   AUDIO SYNTHESIZER
   ========================================================================== */

function playHarmonicTone(freq, dur) {
  if (!isAudioEnabled) return;
  try {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);

    gain.gain.setValueAtTime(0.04, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + dur);

    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + dur);
  } catch (e) {}
}

function toggleSound() {
  isAudioEnabled = !isAudioEnabled;
  document.getElementById('sound-indicator').textContent = isAudioEnabled ? 'AUDIO: ON' : 'AUDIO: OFF';
}

/* ==========================================================================
   VIEWPORT DOCK HELPERS
   ========================================================================== */

function resetViewport() {
  camera.position.set(0, 0.4, 8.5);
  if (controls) controls.target.set(0, 0, 0);
  if (dnaGroup) dnaGroup.rotation.set(0, 0, 0);
}

function toggleOrbit() {
  autoOrbit = !autoOrbit;
  document.getElementById('btn-orbit').textContent = autoOrbit ? 'Pause Orbit' : 'Resume Orbit';
}

function toggleLaserGrid() {
  if (ribbon1) {
    ribbon1.material.wireframe = !ribbon1.material.wireframe;
    ribbon2.material.wireframe = !ribbon2.material.wireframe;
  }
}

function initCustomCursor() {
  // Handled in mousemove
}

function openModal() {
  playHarmonicTone(520, 0.1);
  document.getElementById('access-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('access-modal').classList.remove('active');
}

function handleFormSubmit(e) {
  e.preventDefault();
  playHarmonicTone(880, 0.2);
  alert('Credential verification submitted. Cryo-EM coordinate keys dispatched via encrypted protocol.');
  closeModal();
}
