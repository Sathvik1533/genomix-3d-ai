/**
 * HELIX // PRECISION DNA PHARMACOGENOMICS & MOLECULAR DOCKING ENGINE
 * Sub-Angstrom 3D DNA Double Helix, Small-Molecule Ligand Kinematics & Web Audio Engine
 */

let scene, camera, renderer, controls;
let autoOrbit = true;
let isAudioActive = true;
let audioCtx = null;
let clock = new THREE.Clock();

// 3D Master Objects
let dnaRoot, strand1Tube, strand2Tube, rungsGroup, hydrationShellGroup, drugLigandMesh;
let isHydrationVisible = true;

// Active Sequence State
const BASES = ['A', 'T', 'G', 'C'];
const BASE_COLORS = {
  A: 0x00f0ff, // Spectral Cyan
  T: 0xff2d55, // Precision Rose
  G: 0x00e676, // Emerald
  C: 0xffd600  // Gold
};

let activeSequence = [
  'A', 'T', 'G', 'C', 'C', 'G', 'T', 'A', 'A', 'T', 'C', 'G', 'T', 'A', 'G', 'C', 'A', 'T', 'G', 'C', 'G', 'C', 'A', 'T'
];

// Active Drug Metadata
const DRUG_DATA = {
  trikafta: {
    name: 'Elexacaftor-01 (100mg Solid Oral Tablet)',
    desc: 'Dual-action cystic fibrosis transmembrane conductance regulator corrector that binds directly to the nucleotide-binding domain (NBD1) of mutant CFTR protein.',
    kd: 'Kd = 1.4 nM',
    energy: '-14.2 kcal/mol',
    res: 't1/2 = 4.8 hr',
    bio: '84.6% Oral',
    pk: 'LogP = 3.2',
    cl: 'Hepatic CYP3A4',
    color: 0x00f0ff
  },
  nusinersen: {
    name: 'Spinraza-X (Splice Modulator Oligonucleotide)',
    desc: 'Synthetic 2\'-O-methoxyethyl phosphorothioate antisense oligonucleotide that binds to SMN2 pre-mRNA to promote full-length SMN protein translation.',
    kd: 'Kd = 0.8 nM',
    energy: '-16.8 kcal/mol',
    res: 't1/2 = 135 days',
    bio: 'Intrathecal / IV',
    pk: 'Hydrophilic',
    cl: 'Renal Excretion',
    color: 0x00e676
  },
  crispr: {
    name: 'Prime-Edit 3.0 (Cas9-RT Lipid Nanoparticle)',
    desc: 'Engineered nickase fused to reverse transcriptase guided by prime editing guide RNA (pegRNA) to rewrite genetic mutations without double-strand breaks.',
    kd: 'Kd = 0.12 nM',
    energy: '-19.4 kcal/mol',
    res: 'Permanent Edit',
    bio: 'Lipid Nanocarrier',
    pk: 'Nanoscale 85nm',
    cl: 'Macrophage System',
    color: 0xa855f7
  },
  epigenetic: {
    name: 'Methyl-Silencer (BRCA Epigenetic Ligand)',
    desc: 'Selective allosteric DNA methyltransferase inhibitor that resets hypermethylated tumor suppressor promoters back to normal transcription levels.',
    kd: 'Kd = 2.1 nM',
    energy: '-12.6 kcal/mol',
    res: 't1/2 = 8.2 hr',
    bio: '78.2% Oral',
    pk: 'LogP = 2.8',
    cl: 'Glucuronidation',
    color: 0xffd600
  }
};

let currentDrugKey = 'trikafta';

// Telemetry Canvas
let bindingCanvas, bindingCtx;
let telemX = 0, lastTelemY = 42;

// Pointer Follower
let mouseX = 0, mouseY = 0;
let pointerX = 0, pointerY = 0;
let auraX = 0, auraY = 0;

document.addEventListener('DOMContentLoaded', () => {
  initEngine();
  initPointer();
  initBindingCanvas();
  renderCodonsTrack();
  animate();

  window.addEventListener('resize', onResize);
  document.addEventListener('mousemove', onMouseMove);
});

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

function initEngine() {
  const container = document.getElementById('webgl-canvas');
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04060a, 0.035);

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0.3, 8.8);

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

  // Dramatic Studio Lighting
  const ambient = new THREE.AmbientLight(0x0a101d, 3.2);
  scene.add(ambient);

  const cyanKey = new THREE.PointLight(0x00f0ff, 4.5, 24);
  cyanKey.position.set(5, 6, 4);
  scene.add(cyanKey);

  const emeraldFill = new THREE.PointLight(0x00e676, 3.2, 22);
  emeraldFill.position.set(-5, -3, 3);
  scene.add(emeraldFill);

  const goldRim = new THREE.DirectionalLight(0xffd600, 1.2);
  goldRim.position.set(0, 8, -5);
  scene.add(goldRim);

  // Build Master DNA & Hydration Systems
  buildQuantumDNASystem();
  buildHydrationShellSystem();
  buildDrugLigandMesh();
}

/* ==========================================================================
   3D QUANTUM DNA DOUBLE HELIX
   ========================================================================== */

function buildQuantumDNASystem() {
  if (dnaRoot) scene.remove(dnaRoot);

  dnaRoot = new THREE.Group();
  dnaRoot.position.set(1.4, 0, 0); // Positioned for right-side visual weight

  const pairCount = activeSequence.length;
  const height = 9.8;
  const radius = 1.3;
  const turns = 2.5;

  const strand1Pts = [];
  const strand2Pts = [];
  rungsGroup = new THREE.Group();

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
    const rGeo = new THREE.CylinderGeometry(0.06, 0.06, radius, 16);
    const rMat1 = new THREE.MeshPhysicalMaterial({
      color: BASE_COLORS[base1],
      emissive: BASE_COLORS[base1],
      emissiveIntensity: 0.5,
      metalness: 0.1,
      roughness: 0.25,
      clearcoat: 0.8
    });
    const rMesh1 = new THREE.Mesh(rGeo, rMat1);
    rMesh1.position.set((x1 + pMid.x) / 2, y, (z1 + pMid.z) / 2);
    rMesh1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x1 - pMid.x, 0, z1 - pMid.z).normalize());
    rungsGroup.add(rMesh1);

    // Half Rung 2
    const rMat2 = new THREE.MeshPhysicalMaterial({
      color: BASE_COLORS[base2],
      emissive: BASE_COLORS[base2],
      emissiveIntensity: 0.5,
      metalness: 0.1,
      roughness: 0.25,
      clearcoat: 0.8
    });
    const rMesh2 = new THREE.Mesh(rGeo, rMat2);
    rMesh2.position.set((x2 + pMid.x) / 2, y, (z2 + pMid.z) / 2);
    rMesh2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x2 - pMid.x, 0, z2 - pMid.z).normalize());
    rungsGroup.add(rMesh2);

    // Hydrogen Bonding Center Node
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.1 })
    );
    node.position.copy(pMid);
    rungsGroup.add(node);
  }

  // Sugar-Phosphate Helical Ribbons (Translucent Polymer Sheen)
  const curve1 = new THREE.CatmullRomCurve3(strand1Pts);
  const curve2 = new THREE.CatmullRomCurve3(strand2Pts);

  const ribbonMat = new THREE.MeshPhysicalMaterial({
    color: 0x00f0ff,
    emissive: 0x004753,
    metalness: 0.2,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transmission: 0.35,
    thickness: 0.6
  });

  strand1Tube = new THREE.Mesh(new THREE.TubeGeometry(curve1, 120, 0.11, 16, false), ribbonMat);
  strand2Tube = new THREE.Mesh(new THREE.TubeGeometry(curve2, 120, 0.11, 16, false), ribbonMat);

  dnaRoot.add(strand1Tube);
  dnaRoot.add(strand2Tube);
  dnaRoot.add(rungsGroup);

  scene.add(dnaRoot);
}

/* ==========================================================================
   HYDRATION SHELL & SOLVENT MOLECULES
   ========================================================================== */

function buildHydrationShellSystem() {
  hydrationShellGroup = new THREE.Group();
  hydrationShellGroup.position.set(1.4, 0, 0);

  const count = 1800;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 1.4 + Math.random() * 0.9;
    const y = (Math.random() - 0.5) * 10.0;

    pos[i * 3] = Math.cos(angle) * r;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = Math.sin(angle) * r;

    // Glowing cyan/blue solvent embers
    col[i * 3] = 0.0;
    col[i * 3 + 1] = 0.94;
    col[i * 3 + 2] = 1.0;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.038,
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geo, mat);
  hydrationShellGroup.add(points);
  scene.add(hydrationShellGroup);
}

/* ==========================================================================
   3D MOLECULAR DRUG TABLET / LIGAND MESH
   ========================================================================== */

function buildDrugLigandMesh() {
  drugLigandMesh = new THREE.Group();

  // Tablet / Small-Molecule Polyhedral Complex
  const coreGeo = new THREE.IcosahedronGeometry(0.35, 2);
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: 0x00f0ff,
    emissive: 0x00808c,
    emissiveIntensity: 1.2,
    metalness: 0.4,
    roughness: 0.15,
    clearcoat: 1.0,
    wireframe: true
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  drugLigandMesh.add(core);

  // Outer Pharmacophore Orbital Rings
  const ringGeo = new THREE.RingGeometry(0.42, 0.46, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  const ring2 = new THREE.Mesh(ringGeo, ringMat);
  ring2.rotation.x = Math.PI / 2;
  drugLigandMesh.add(ring1);
  drugLigandMesh.add(ring2);

  drugLigandMesh.position.set(3.6, 0.2, 1.2);
  drugLigandMesh.visible = false;
  dnaRoot.add(drugLigandMesh);
}

/* ==========================================================================
   ANIMATION LOOP
   ========================================================================== */

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (autoOrbit && dnaRoot) {
    dnaRoot.rotation.y += delta * 0.35;
  }

  // Camera Parallax
  const targetCamX = mouseX * 0.35;
  const targetCamY = mouseY * 0.35;
  if (dnaRoot) {
    dnaRoot.rotation.x = THREE.MathUtils.lerp(dnaRoot.rotation.x, targetCamY * 0.2, 0.05);
    dnaRoot.rotation.z = THREE.MathUtils.lerp(dnaRoot.rotation.z, targetCamX * 0.15, 0.05);
  }

  // Hydration Shell Brownian motion
  if (hydrationShellGroup && isHydrationVisible) {
    hydrationShellGroup.rotation.y = time * 0.03;
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
   DRUG MOLECULE SELECTOR
   ========================================================================== */

function selectDrugMolecule(key) {
  currentDrugKey = key;
  const data = DRUG_DATA[key];
  if (!data) return;

  playAcousticPing(580, 0.1);

  document.querySelectorAll('.drug-pill').forEach(p => p.classList.remove('active'));
  event.currentTarget.classList.add('active');

  // Update UI Cards
  document.getElementById('energy-stat').innerHTML = `${data.energy.split(' ')[0]} <span class="stat-unit">kcal/mol</span>`;
  document.getElementById('kd-val').textContent = data.kd;
  document.getElementById('res-val').textContent = data.res;

  document.getElementById('form-name').textContent = data.name;
  document.getElementById('form-desc').textContent = data.desc;
  document.getElementById('spec-bio').textContent = data.bio;
  document.getElementById('spec-pk').textContent = data.pk;
  document.getElementById('spec-cl').textContent = data.cl;

  executeMolecularDocking();
}

function executeMolecularDocking() {
  playAcousticPing(880, 0.2);
  if (!drugLigandMesh) return;

  const data = DRUG_DATA[currentDrugKey];
  drugLigandMesh.visible = true;

  document.getElementById('docking-badge').textContent = 'DOCKING IN PROGRESS...';
  document.getElementById('docking-badge').style.color = '#ffd600';

  let t = 0;
  const interval = setInterval(() => {
    t += 0.04;
    drugLigandMesh.position.x = THREE.MathUtils.lerp(3.6, 0.2, t);
    drugLigandMesh.position.z = THREE.MathUtils.lerp(1.2, 0.8, t);
    drugLigandMesh.rotation.y += 0.1;

    if (t >= 1) {
      clearInterval(interval);
      document.getElementById('docking-badge').textContent = 'BOUND (Kd = 1.4 nM)';
      document.getElementById('docking-badge').style.color = '#00e676';
      playAcousticPing(1040, 0.25);
    }
  }, 25);
}

/* ==========================================================================
   SEQUENCE WORKBENCH
   ========================================================================== */

function renderCodonsTrack() {
  const track = document.getElementById('codons-track');
  if (!track) return;
  track.innerHTML = '';

  let gcCount = 0;
  activeSequence.forEach((base, idx) => {
    if (base === 'G' || base === 'C') gcCount++;

    const item = document.createElement('div');
    item.className = `codon-item base-${base.toLowerCase()}`;
    item.innerHTML = `
      <span class="c-pos">${idx + 1}</span>
      <span class="c-char">${base}</span>
    `;
    item.title = `Position ${idx + 1}: ${base} (Click to toggle)`;
    item.onclick = () => cycleBase(idx);
    track.appendChild(item);
  });

  const gcPct = ((gcCount / activeSequence.length) * 100).toFixed(1);
  const gcElem = document.getElementById('gc-stat');
  if (gcElem) gcElem.textContent = `${gcPct}%`;
}

function cycleBase(idx) {
  const cur = activeSequence[idx];
  const next = BASES[(BASES.indexOf(cur) + 1) % BASES.length];
  activeSequence[idx] = next;

  playAcousticPing(520 + idx * 15, 0.05);
  renderCodonsTrack();
  buildQuantumDNASystem();
}

function induceTargetMutation() {
  playAcousticPing(340, 0.15);
  activeSequence[8] = 'T';
  activeSequence[9] = 'A';
  renderCodonsTrack();
  buildQuantumDNASystem();

  document.getElementById('docking-badge').textContent = 'VARIANT MUTATION DETECTED';
  document.getElementById('docking-badge').style.color = '#ff2d55';
  document.getElementById('energy-stat').innerHTML = '-8.4 <span class="stat-unit">kcal/mol</span>';
}

function resetWildtype() {
  playAcousticPing(640, 0.1);
  activeSequence = ['A', 'T', 'G', 'C', 'C', 'G', 'T', 'A', 'A', 'T', 'C', 'G', 'T', 'A', 'G', 'C', 'A', 'T', 'G', 'C', 'G', 'C', 'A', 'T'];
  renderCodonsTrack();
  buildQuantumDNASystem();

  document.getElementById('docking-badge').textContent = 'WILDTYPE RESTING';
  document.getElementById('docking-badge').style.color = '#00e676';
  document.getElementById('energy-stat').innerHTML = '-14.2 <span class="stat-unit">kcal/mol</span>';
}

function toggleHydrationShell() {
  isHydrationVisible = !isHydrationVisible;
  if (hydrationShellGroup) hydrationShellGroup.visible = isHydrationVisible;
}

function toggleOrbitRotation() {
  autoOrbit = !autoOrbit;
  document.getElementById('orbit-btn').textContent = autoOrbit ? 'Pause Orbit' : 'Resume Orbit';
}

function resetCameraPersp() {
  camera.position.set(0, 0.3, 8.8);
  if (controls) controls.target.set(0, 0, 0);
  if (dnaRoot) dnaRoot.rotation.set(0, 0, 0);
}

/* ==========================================================================
   2D BINDING KINETICS CANVAS
   ========================================================================== */

function initBindingCanvas() {
  bindingCanvas = document.getElementById('binding-canvas');
  if (!bindingCanvas) return;
  bindingCtx = bindingCanvas.getContext('2d');
  bindingCtx.lineWidth = 1.8;

  setInterval(drawBindingStep, 35);
}

function drawBindingStep() {
  if (!bindingCtx) return;
  const w = bindingCanvas.width;
  const h = bindingCanvas.height;
  const midY = h / 2;

  bindingCtx.clearRect(telemX, 0, 8, h);

  const t = Date.now() / 1000;
  const y = midY + Math.sin(t * 4.5 + telemX * 0.08) * 16 * Math.cos(telemX * 0.035);

  bindingCtx.strokeStyle = '#00f0ff';
  bindingCtx.shadowBlur = 6;
  bindingCtx.shadowColor = '#00f0ff';

  bindingCtx.beginPath();
  bindingCtx.moveTo(telemX, lastTelemY);
  bindingCtx.lineTo(telemX + 2, y);
  bindingCtx.stroke();

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

function toggleAudioEngine() {
  isAudioActive = !isAudioActive;
  document.getElementById('audio-label').textContent = isAudioActive ? 'AUDIO: ACTIVE' : 'AUDIO: MUTED';
}

function initPointer() {}

function openAccessSheet() {
  document.getElementById('access-modal').classList.add('active');
}

function closeAccessSheet() {
  document.getElementById('access-modal').classList.remove('active');
}

function handleAccessSubmit(e) {
  e.preventDefault();
  alert('Clinical pipeline verification submitted. Pharmacogenomic PDB ligand coordinate sets dispatched.');
  closeAccessSheet();
}
