/**
 * ENUMERA // ACETERNITY + SHADCN + REACT BITS 3D PHARMACOLOGY ENGINE
 * Full 360° Free Mouse Orbit • Dynamic Spotlight Physics • Raw Anatomical DNA PBR Model
 */

let scene, camera, renderer, controls;
let autoOrbit = true;
let isAudioActive = true;
let audioCtx = null;
let clock = new THREE.Clock();

// 3D Master Objects
let dnaGroup, ribbonMesh1, ribbonMesh2, rungsGroup, drugLigandGroup;

// Active Sequence State
const BASES = ['A', 'T', 'G', 'C'];
const BASE_COLORS = {
  A: 0x38bdf8, // Bioluminescent Phosphor Cyan
  T: 0xf43f5e, // Precision Crimson
  G: 0x10b981, // Cellular Emerald
  C: 0xf59e0b  // Amber Gold
};

let activeSequence = [
  'A', 'T', 'G', 'C', 'C', 'G', 'T', 'A', 'A', 'T', 'C', 'G', 'T', 'A', 'G', 'C', 'A', 'T', 'G', 'C', 'G', 'C', 'A', 'T'
];

// Drug Candidate Metadata
const DRUG_DATA = {
  trikafta: {
    energy: '-14.2 kcal/mol',
    kd: 'Kd = 1.4 nM',
    res: 't1/2 = 4.8 hr',
    status: 'BOUND (CFTR EXON 10)',
    color: 0x38bdf8
  },
  nusinersen: {
    energy: '-16.8 kcal/mol',
    kd: 'Kd = 0.8 nM',
    res: 't1/2 = 135 days',
    status: 'BOUND (SMN2 EXON 7)',
    color: 0x10b981
  },
  casgevy: {
    energy: '-19.4 kcal/mol',
    kd: '99.98% Fidelity',
    res: 'Permanent Edit',
    status: 'BOUND (BCL11A ENHANCER)',
    color: 0xc084fc
  },
  patisiran: {
    energy: '-12.6 kcal/mol',
    kd: 't1/2 = 4.8 hr',
    res: 't1/2 = 9.2 days',
    status: 'BOUND (TTR 3\' UTR)',
    color: 0xf59e0b
  }
};

let currentDrugKey = 'trikafta';

// Mouse Tracking
let mouseX = 0, mouseY = 0;

document.addEventListener('DOMContentLoaded', () => {
  initEngine();
  initCursorAndSpotlight();
  renderCodonStrip();
  animate();

  window.addEventListener('resize', onResize);
  document.addEventListener('mousemove', onMouseMove);
});

/* ==========================================================================
   INITIALIZE ENGINE & CONTROLS
   ========================================================================== */

function initEngine() {
  const container = document.getElementById('webgl-stage');
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0c1017, 0.035);

  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0.3, 8.8);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  container.appendChild(renderer.domElement);

  // Full 360° OrbitControls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxDistance = 14;
  controls.minDistance = 3.0;
  controls.enablePan = false;

  // Studio Lighting (Clean, Warm Laboratory Specular Highlights)
  const ambient = new THREE.AmbientLight(0xffffff, 2.0);
  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(0xffffff, 2.2);
  mainLight.position.set(5, 8, 5);
  scene.add(mainLight);

  const fillCyan = new THREE.PointLight(0x38bdf8, 2.8, 20);
  fillCyan.position.set(-5, 4, 3);
  scene.add(fillCyan);

  const warmRim = new THREE.PointLight(0xfef08a, 1.6, 20);
  warmRim.position.set(0, -6, -4);
  scene.add(warmRim);

  // Build Master DNA Structure
  buildRawRealisticDNA();
  build3DDrugLigand();
}

/* ==========================================================================
   RAW, REALISTIC 3D DNA DOUBLE HELIX
   ========================================================================== */

function buildRawRealisticDNA() {
  if (dnaGroup) scene.remove(dnaGroup);

  dnaGroup = new THREE.Group();
  dnaGroup.position.set(1.2, 0, 0); // Positioned for editorial balance

  const pairCount = activeSequence.length;
  const height = 10.5;
  const radius = 1.35;
  const turns = 2.8;

  const strand1Pts = [];
  const strand2Pts = [];
  rungsGroup = new THREE.Group();

  const atomGeo = new THREE.SphereGeometry(0.09, 16, 16);
  const hydrogenBondGeo = new THREE.CylinderGeometry(0.045, 0.045, radius, 12);

  for (let i = 0; i < pairCount; i++) {
    const t = i / (pairCount - 1);
    const angle = t * Math.PI * 2 * turns;
    const y = (t - 0.5) * height;

    const x1 = Math.cos(angle) * radius;
    const z1 = Math.sin(angle) * radius;
    const x2 = Math.cos(angle + Math.PI) * radius;
    const z2 = Math.sin(angle + Math.PI) * radius;

    strand1Pts.push(new THREE.Vector3(x1, y, z1));
    strand2Pts.push(new THREE.Vector3(x2, y, z2));

    const base1 = activeSequence[i];
    const base2 = (base1 === 'A') ? 'T' : (base1 === 'T') ? 'A' : (base1 === 'G') ? 'C' : 'G';
    const pMid = new THREE.Vector3((x1 + x2) / 2, y, (z1 + z2) / 2);

    // Half Rung 1
    const rMat1 = new THREE.MeshPhysicalMaterial({
      color: BASE_COLORS[base1],
      roughness: 0.22,
      metalness: 0.15,
      clearcoat: 0.9
    });
    const rMesh1 = new THREE.Mesh(hydrogenBondGeo, rMat1);
    rMesh1.position.set((x1 + pMid.x) / 2, y, (z1 + pMid.z) / 2);
    rMesh1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x1 - pMid.x, 0, z1 - pMid.z).normalize());
    rungsGroup.add(rMesh1);

    const a1 = new THREE.Mesh(atomGeo, rMat1);
    a1.position.set(x1, y, z1);
    rungsGroup.add(a1);

    // Half Rung 2
    const rMat2 = new THREE.MeshPhysicalMaterial({
      color: BASE_COLORS[base2],
      roughness: 0.22,
      metalness: 0.15,
      clearcoat: 0.9
    });
    const rMesh2 = new THREE.Mesh(hydrogenBondGeo, rMat2);
    rMesh2.position.set((x2 + pMid.x) / 2, y, (z2 + pMid.z) / 2);
    rMesh2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x2 - pMid.x, 0, z2 - pMid.z).normalize());
    rungsGroup.add(rMesh2);

    const a2 = new THREE.Mesh(atomGeo, rMat2);
    a2.position.set(x2, y, z2);
    rungsGroup.add(a2);

    // Central Hydrogen-Bond Bridging Node
    const centerNode = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.8 })
    );
    centerNode.position.copy(pMid);
    rungsGroup.add(centerNode);
  }

  // Sugar-Phosphate Helical Ribbons (Physical Pearlescent Material)
  const curve1 = new THREE.CatmullRomCurve3(strand1Pts);
  const curve2 = new THREE.CatmullRomCurve3(strand2Pts);

  const ribbonMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.25,
    roughness: 0.18,
    metalness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transmission: 0.22,
    thickness: 0.5
  });

  ribbonMesh1 = new THREE.Mesh(new THREE.TubeGeometry(curve1, 140, 0.11, 16, false), ribbonMat);
  ribbonMesh2 = new THREE.Mesh(new THREE.TubeGeometry(curve2, 140, 0.11, 16, false), ribbonMat);

  dnaGroup.add(ribbonMesh1);
  dnaGroup.add(ribbonMesh2);
  dnaGroup.add(rungsGroup);

  scene.add(dnaGroup);
}

/* ==========================================================================
   3D MOLECULAR DRUG LIGAND (BALL-AND-STICK CHEMICAL STRUCTURE)
   ========================================================================== */

function build3DDrugLigand() {
  drugLigandGroup = new THREE.Group();

  const ringGeo = new THREE.IcosahedronGeometry(0.36, 1);
  const ringMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
    metalness: 0.4,
    roughness: 0.2,
    clearcoat: 1.0,
    wireframe: true
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  drugLigandGroup.add(ring);

  const atomMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.5, roughness: 0.2 });
  const bondMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3 });

  const atomOffsets = [
    new THREE.Vector3(0.35, 0.2, 0.0),
    new THREE.Vector3(-0.35, -0.2, 0.0),
    new THREE.Vector3(0.0, 0.35, 0.25),
    new THREE.Vector3(0.0, -0.35, -0.25)
  ];

  atomOffsets.forEach(pt => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), atomMat);
    s.position.copy(pt);
    drugLigandGroup.add(s);

    const bond = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, pt.length(), 8), bondMat);
    bond.position.set(pt.x / 2, pt.y / 2, pt.z / 2);
    bond.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pt.clone().normalize());
    drugLigandGroup.add(bond);
  });

  drugLigandGroup.position.set(3.8, 0.2, 1.2);
  drugLigandGroup.visible = false;
  dnaGroup.add(drugLigandGroup);
}

/* ==========================================================================
   ANIMATION & KINEMATICS LOOP
   ========================================================================== */

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (autoOrbit && dnaGroup) {
    dnaGroup.rotation.y += delta * 0.35;
  }

  // Smooth Camera Orbit Damping
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

  document.documentElement.style.setProperty('--mouse-screen-x', `${e.clientX}px`);
  document.documentElement.style.setProperty('--mouse-screen-y', `${e.clientY}px`);
}

/* ==========================================================================
   ACETERNITY SPOTLIGHT & CURSOR SYSTEM
   ========================================================================== */

function initCursorAndSpotlight() {
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  let cx = 0, cy = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    cx = e.clientX;
    cy = e.clientY;
    if (dot) dot.style.transform = `translate(${cx}px, ${cy}px)`;

    // Aceternity Spotlight position tracking per card
    document.querySelectorAll('.spotlight-card').forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  function updateRing() {
    rx += (cx - rx) * 0.15;
    ry += (cy - ry) * 0.15;
    if (ring) ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(updateRing);
  }
  updateRing();
}

/* ==========================================================================
   DRUG SELECTION & DOCKING ANIMATION
   ========================================================================== */

function selectTherapeutic(key, cardElem) {
  currentDrugKey = key;
  const d = DRUG_DATA[key];
  if (!d) return;

  playAcousticTone(580, 0.1);

  document.querySelectorAll('.bento-card').forEach(c => c.classList.remove('active'));
  if (cardElem) cardElem.classList.add('active');

  // Update Telemetry Bar
  document.getElementById('telem-energy').textContent = d.energy;
  document.getElementById('telem-kd').textContent = d.kd;
  document.getElementById('telem-res').textContent = d.res;
  document.getElementById('telem-status').textContent = d.status;

  triggerDockingAnimation();
}

function triggerDockingAnimation() {
  playAcousticTone(880, 0.2);
  if (!drugLigandGroup) return;

  drugLigandGroup.visible = true;
  document.getElementById('telem-status').textContent = 'DOCKING IN PROGRESS...';
  document.getElementById('telem-status').style.color = '#f59e0b';

  let t = 0;
  const interval = setInterval(() => {
    t += 0.04;
    drugLigandGroup.position.x = THREE.MathUtils.lerp(3.8, 0.2, t);
    drugLigandGroup.position.z = THREE.MathUtils.lerp(1.2, 0.7, t);
    drugLigandGroup.rotation.y += 0.12;

    if (t >= 1) {
      clearInterval(interval);
      document.getElementById('telem-status').textContent = DRUG_DATA[currentDrugKey].status;
      document.getElementById('telem-status').style.color = '#10b981';
      playAcousticTone(1040, 0.25);
    }
  }, 25);
}

/* ==========================================================================
   SEQUENCE TRACK & CODONS
   ========================================================================== */

function renderCodonStrip() {
  const strip = document.getElementById('codons-strip');
  if (!strip) return;
  strip.innerHTML = '';

  let gcCount = 0;
  activeSequence.forEach((base, idx) => {
    if (base === 'G' || base === 'C') gcCount++;

    const pill = document.createElement('div');
    pill.className = `codon-pill base-${base.toLowerCase()}`;
    pill.innerHTML = `
      <span class="c-pos">${idx + 1}</span>
      <span class="c-base">${base}</span>
    `;
    pill.title = `Codon Pos ${idx + 1}: ${base} (Click to toggle)`;
    pill.onclick = () => cycleBase(idx);
    strip.appendChild(pill);
  });

  const gcPct = ((gcCount / activeSequence.length) * 100).toFixed(1);
  const gcElem = document.getElementById('gc-val');
  if (gcElem) gcElem.textContent = `${gcPct}%`;
}

function cycleBase(idx) {
  const cur = activeSequence[idx];
  const next = BASES[(BASES.indexOf(cur) + 1) % BASES.length];
  activeSequence[idx] = next;

  playAcousticTone(520 + idx * 15, 0.05);
  renderCodonStrip();
  buildRawRealisticDNA();
}

function injectMutation() {
  playAcousticTone(340, 0.15);
  activeSequence[8] = 'T';
  activeSequence[9] = 'A';
  renderCodonStrip();
  buildRawRealisticDNA();

  document.getElementById('telem-status').textContent = 'PATHOGENIC VARIANT DETECTED';
  document.getElementById('telem-status').style.color = '#f43f5e';
  document.getElementById('telem-energy').textContent = '-8.4 kcal/mol';
}

function restoreWildtype() {
  playAcousticTone(640, 0.1);
  activeSequence = ['A', 'T', 'G', 'C', 'C', 'G', 'T', 'A', 'A', 'T', 'C', 'G', 'T', 'A', 'G', 'C', 'A', 'T', 'G', 'C', 'G', 'C', 'A', 'T'];
  renderCodonStrip();
  buildRawRealisticDNA();

  document.getElementById('telem-status').textContent = 'WILDTYPE RESTING';
  document.getElementById('telem-status').style.color = '#10b981';
  document.getElementById('telem-energy').textContent = '-14.2 kcal/mol';
}

function toggleAutoOrbit() {
  autoOrbit = !autoOrbit;
  document.getElementById('orbit-btn').textContent = autoOrbit ? 'Pause Orbit' : 'Resume Orbit';
}

function resetPerspective() {
  camera.position.set(0, 0.3, 8.8);
  if (controls) controls.target.set(0, 0, 0);
  if (dnaGroup) dnaGroup.rotation.set(0, 0, 0);
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
  document.getElementById('sound-label').textContent = isAudioActive ? 'AUDIO: ON' : 'AUDIO: OFF';
}

function openAccessModal() {
  document.getElementById('access-modal').classList.add('active');
}

function closeAccessModal() {
  document.getElementById('access-modal').classList.remove('active');
}

function handleAccessSubmit(e) {
  e.preventDefault();
  alert('Clinical access verification submitted. Raw PDB/SDF coordinate keys dispatched to your institutional address.');
  closeAccessModal();
}
