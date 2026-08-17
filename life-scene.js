import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
const mix = (from, to, amount) => from + (to - from) * amount;
const ease = value => {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
};

const PALETTES = {
  morning: {
    metal: 0xdde8f0,
    darkMetal: 0x253343,
    accent: 0x2a90ff,
    secondary: 0x7a5cff,
    core: 0x8edcff,
    light: 0xffffff
  },
  night: {
    metal: 0x737284,
    darkMetal: 0x11111a,
    accent: 0xb07cff,
    secondary: 0xff8b68,
    core: 0x8e72ff,
    light: 0xd9e4ff
  }
};

function materialSet(mode) {
  const palette = PALETTES[mode] || PALETTES.morning;
  return {
    palette,
    metal: new THREE.MeshPhysicalMaterial({
      color: palette.metal,
      metalness: .94,
      roughness: .2,
      clearcoat: 1,
      clearcoatRoughness: .16
    }),
    darkMetal: new THREE.MeshPhysicalMaterial({
      color: palette.darkMetal,
      metalness: .88,
      roughness: .24,
      clearcoat: .72,
      clearcoatRoughness: .2
    }),
    accent: new THREE.MeshPhysicalMaterial({
      color: palette.accent,
      emissive: palette.accent,
      emissiveIntensity: .62,
      metalness: .48,
      roughness: .2,
      clearcoat: 1
    }),
    secondary: new THREE.MeshPhysicalMaterial({
      color: palette.secondary,
      emissive: palette.secondary,
      emissiveIntensity: .28,
      metalness: .62,
      roughness: .22,
      clearcoat: 1
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: palette.light,
      metalness: 0,
      roughness: .08,
      transmission: .94,
      thickness: .7,
      ior: 1.46,
      transparent: true,
      opacity: .48,
      depthWrite: false,
      clearcoat: 1,
      clearcoatRoughness: .08
    }),
    core: new THREE.MeshPhysicalMaterial({
      color: palette.core,
      emissive: palette.core,
      emissiveIntensity: 1.22,
      metalness: .12,
      roughness: .18,
      transparent: true,
      opacity: .9
    })
  };
}

function createDisc(radius, depth, material, segments = 96) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, depth, segments, 1, false),
    material
  );
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function createRing(radius, tube, material) {
  return new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 18, 128),
    material
  );
}

function createTimepiece(materials) {
  const root = new THREE.Group();
  const parts = {};

  parts.case = createDisc(2.62, .42, materials.darkMetal);
  parts.case.position.z = -.19;
  root.add(parts.case);

  parts.back = createDisc(2.36, .18, materials.metal);
  parts.back.position.z = -.44;
  root.add(parts.back);

  parts.outerBezel = createRing(2.48, .17, materials.metal);
  parts.outerBezel.position.z = .12;
  root.add(parts.outerBezel);

  parts.accentBezel = createRing(2.22, .035, materials.accent);
  parts.accentBezel.position.z = .26;
  root.add(parts.accentBezel);

  parts.phaseGroup = new THREE.Group();
  const phaseMaterials = [];
  const phaseCount = 6;
  const gap = .055;
  const segmentLength = Math.PI * 2 / phaseCount - gap;
  for (let index = 0; index < phaseCount; index += 1) {
    const material = materials.secondary.clone();
    material.transparent = true;
    material.opacity = index < 5 ? .48 : .24;
    phaseMaterials.push(material);
    const segment = new THREE.Mesh(
      new THREE.RingGeometry(1.72, 2.08, 48, 1, index * Math.PI * 2 / phaseCount + gap / 2, segmentLength),
      material
    );
    segment.position.z = .29;
    parts.phaseGroup.add(segment);
  }
  parts.phaseMaterials = phaseMaterials;
  root.add(parts.phaseGroup);

  const tickGeometry = new THREE.BoxGeometry(.045, .18, .05);
  const ticks = new THREE.InstancedMesh(tickGeometry, materials.metal, 20);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const rotation = new THREE.Euler();
  for (let index = 0; index < 20; index += 1) {
    const angle = index / 20 * Math.PI * 2;
    position.set(Math.sin(angle) * 1.9, Math.cos(angle) * 1.9, .36);
    rotation.set(0, 0, -angle);
    quaternion.setFromEuler(rotation);
    scale.set(index % 5 === 0 ? 1.5 : .8, index % 5 === 0 ? 1.5 : .78, 1);
    matrix.compose(position, quaternion, scale);
    ticks.setMatrixAt(index, matrix);
  }
  ticks.instanceMatrix.needsUpdate = true;
  parts.ticks = ticks;
  root.add(ticks);

  parts.innerRing = createRing(1.28, .075, materials.darkMetal);
  parts.innerRing.position.z = .38;
  root.add(parts.innerRing);

  parts.coreHalo = createRing(.73, .055, materials.accent);
  parts.coreHalo.position.z = .45;
  root.add(parts.coreHalo);

  parts.core = createDisc(.57, .24, materials.core, 72);
  parts.core.position.z = .48;
  root.add(parts.core);

  parts.minuteHand = new THREE.Mesh(new THREE.BoxGeometry(.085, 1.48, .055), materials.metal);
  parts.minuteHand.geometry.translate(0, .61, 0);
  parts.minuteHand.position.z = .62;
  parts.minuteHand.rotation.z = -.72;
  root.add(parts.minuteHand);

  parts.phaseHand = new THREE.Mesh(new THREE.BoxGeometry(.11, 1.04, .075), materials.accent);
  parts.phaseHand.geometry.translate(0, .43, 0);
  parts.phaseHand.position.z = .66;
  parts.phaseHand.rotation.z = 1.86;
  root.add(parts.phaseHand);

  parts.pin = createDisc(.13, .12, materials.metal, 48);
  parts.pin.position.z = .76;
  root.add(parts.pin);

  parts.glass = createDisc(2.24, .04, materials.glass);
  parts.glass.position.z = .79;
  parts.glass.renderOrder = 12;
  root.add(parts.glass);

  parts.orbitGroup = new THREE.Group();
  const orbitGeometry = new THREE.SphereGeometry(.12, 24, 18);
  for (let index = 0; index < 7; index += 1) {
    const node = new THREE.Mesh(orbitGeometry, index % 2 ? materials.accent : materials.secondary);
    const angle = index / 7 * Math.PI * 2;
    node.position.set(Math.cos(angle) * 3.3, Math.sin(angle) * 3.3, Math.sin(angle * 2) * .42);
    node.userData.baseZ = node.position.z;
    parts.orbitGroup.add(node);
  }
  parts.orbitGroup.visible = false;
  root.add(parts.orbitGroup);

  parts.allMaterials = materials;
  return { root, parts };
}

export function createLifeScene({ canvas, page = 'home', mode = 'morning', reducedMotion = false }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = mode === 'night' ? 1.08 : 1.18;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  camera.position.set(0, 0, 9.2);

  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(environment, .035).texture;
  environment.dispose();
  pmrem.dispose();

  const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
  keyLight.position.set(-4, 5, 8);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(PALETTES[mode].accent, 42, 18, 1.6);
  rimLight.position.set(4, -2, 5);
  scene.add(rimLight);
  const fillLight = new THREE.PointLight(PALETTES[mode].secondary, 25, 16, 1.7);
  fillLight.position.set(-4, -3, 2);
  scene.add(fillLight);

  let materials = materialSet(mode);
  const timepiece = createTimepiece(materials);
  const world = timepiece.root;
  scene.add(world);

  const state = {
    page,
    mode,
    progress: reducedMotion ? 0 : 0,
    targetProgress: reducedMotion ? 0 : 0,
    pointerX: 0,
    pointerY: 0,
    targetPointerX: 0,
    targetPointerY: 0,
    activePhase: 0,
    flowIndex: 0,
    visible: true,
    dirty: true,
    running: true,
    reducedMotion,
    mobile: false,
    lastRenderTime: 0,
    frame: 0
  };

  function disposeMaterialSet(set) {
    Object.values(set).forEach(value => {
      if (value?.isMaterial) value.dispose();
    });
  }

  function swapMaterials(nextMode) {
    if (nextMode === state.mode) return;
    state.mode = nextMode;
    const next = materialSet(nextMode);
    const { parts } = timepiece;
    parts.case.material = next.darkMetal;
    parts.back.material = next.metal;
    parts.outerBezel.material = next.metal;
    parts.accentBezel.material = next.accent;
    parts.ticks.material = next.metal;
    parts.innerRing.material = next.darkMetal;
    parts.coreHalo.material = next.accent;
    parts.core.material = next.core;
    parts.minuteHand.material = next.metal;
    parts.phaseHand.material = next.accent;
    parts.pin.material = next.metal;
    parts.glass.material = next.glass;
    parts.phaseMaterials.forEach((material, index) => {
      material.dispose();
      const replacement = next.secondary.clone();
      replacement.transparent = true;
      replacement.opacity = index < 5 ? .48 : .24;
      parts.phaseGroup.children[index].material = replacement;
      parts.phaseMaterials[index] = replacement;
    });
    parts.orbitGroup.children.forEach((node, index) => {
      node.material = index % 2 ? next.accent : next.secondary;
    });
    rimLight.color.setHex(next.palette.accent);
    fillLight.color.setHex(next.palette.secondary);
    renderer.toneMappingExposure = nextMode === 'night' ? 1.08 : 1.18;
    disposeMaterialSet(materials);
    materials = next;
    state.dirty = true;
    requestFrame();
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const mobile = width < 720;
    state.mobile = mobile;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    state.dirty = true;
    requestFrame();
  }

  function updatePhaseMaterials() {
    timepiece.parts.phaseMaterials.forEach((material, index) => {
      const active = index === state.activePhase;
      material.opacity = active ? .96 : index < (state.mode === 'night' ? 6 : 5) ? .42 : .16;
      material.emissiveIntensity = active ? .86 : .18;
    });
  }

  function compose(time = 0) {
    const progress = state.progress;
    const intro = ease(progress / .24);
    const explodeIn = ease((progress - .16) / .36);
    const reassemble = ease((progress - .72) / .28);
    const separation = explodeIn * (1 - reassemble);
    const pass = ease((progress - .56) / .34);
    const cameraPass = pass * (1 - reassemble);
    const pointerScale = state.reducedMotion ? 0 : 1;
    const pageScale = state.page === 'security' ? .9 : state.page === 'menu' ? .82 : 1;
    const motionTime = state.reducedMotion ? 0 : time;
    const pageOffset = state.mobile ? 0 : state.page === 'security' ? 2.08 : state.page === 'menu' ? 2.34 : 2.26;
    const driftX = Math.sin(motionTime * .31) * .1;
    const driftY = Math.sin(motionTime * .43 + .8) * .1;
    const pulse = .5 + Math.sin(motionTime * 1.18) * .5;

    world.position.x = pageOffset + driftX;
    world.position.y = driftY;
    world.rotation.x = mix(.5, .15, intro) + state.pointerY * .09 * pointerScale + Math.sin(motionTime * .37) * .045;
    world.rotation.y = mix(-.62, .2, intro) + state.pointerX * .13 * pointerScale + progress * .3 + Math.sin(motionTime * .29 + .6) * .09;
    world.rotation.z = mix(-.18, .02, intro) + Math.sin(motionTime * .24) * .025;
    world.scale.setScalar(pageScale * mix(.84, 1, intro) * mix(1, .9, cameraPass) * mix(1, .8, reassemble));

    const { parts } = timepiece;
    parts.back.position.z = -.44 - separation * 1.38;
    parts.case.position.z = -.19 - separation * .92;
    parts.outerBezel.position.z = .12 - separation * .34;
    parts.accentBezel.position.z = .26 + separation * .18;
    parts.phaseGroup.position.z = separation * .48;
    parts.ticks.position.z = separation * .72;
    parts.innerRing.position.z = .38 + separation * .88;
    parts.coreHalo.position.z = .45 + separation * 1.08;
    parts.core.position.z = .48 + separation * 1.24;
    parts.minuteHand.position.z = .62 + separation * 1.56;
    parts.phaseHand.position.z = .66 + separation * 1.68;
    parts.pin.position.z = .76 + separation * 1.8;
    parts.glass.position.z = .79 + separation * 1.81;

    parts.outerBezel.rotation.z = progress * .46 + state.flowIndex * .11 + motionTime * .055;
    parts.accentBezel.rotation.z = -progress * .8 - motionTime * .09;
    parts.phaseGroup.rotation.z = progress * .54 + state.flowIndex * .22 + motionTime * .026 + Math.sin(motionTime * .35) * .06;
    parts.innerRing.rotation.z = -progress * 1.2 + motionTime * .13;
    parts.coreHalo.rotation.z = progress * 1.6 - motionTime * .21;
    parts.minuteHand.rotation.z = -.72 + progress * Math.PI * 2.2 + motionTime * .15;
    parts.phaseHand.rotation.z = 1.86 + state.activePhase / 6 * Math.PI * 2 + progress * .3 + motionTime * .045;
    parts.core.scale.setScalar(1 + pulse * .045);
    parts.core.material.emissiveIntensity = 1.08 + pulse * .42;

    parts.orbitGroup.visible = state.page === 'menu';
    parts.orbitGroup.rotation.z = progress * 1.22 + motionTime * .17;
    parts.orbitGroup.rotation.x = .38 + separation * .28;
    parts.orbitGroup.scale.setScalar(mix(.7, 1.06, intro));
    parts.orbitGroup.children.forEach((node, index) => {
      node.position.z = node.userData.baseZ + Math.sin(motionTime * .72 + index * .9) * .13;
      node.scale.setScalar(.9 + (.5 + Math.sin(motionTime * .9 + index) * .5) * .24);
    });

    if (state.page === 'return') {
      world.rotation.z += state.flowIndex * -.34;
      parts.phaseHand.rotation.z = state.flowIndex * -.58 + motionTime * .05;
    }

    if (state.page === 'security') {
      const unlocked = clamp(state.flowIndex / 3);
      parts.outerBezel.rotation.z += unlocked * Math.PI * .5;
      parts.accentBezel.rotation.z -= unlocked * Math.PI * .75;
      parts.innerRing.rotation.z += unlocked * Math.PI;
      parts.core.material.emissiveIntensity = .84 + unlocked * 1.18 + pulse * .28;
    }

    keyLight.intensity = 3.8 + pulse * .75;
    rimLight.position.x = 4 + Math.sin(motionTime * .42) * .75;
    rimLight.position.y = -2 + Math.cos(motionTime * .34) * .52;
    fillLight.position.x = -4 + Math.cos(motionTime * .3) * .55;

    camera.position.z = mix(9.2, 7.05, cameraPass) + reassemble * .8;
    camera.position.x = state.pointerX * .2 * pointerScale;
    camera.position.y = state.pointerY * -.14 * pointerScale;
    camera.lookAt(0, 0, separation * .24);
    updatePhaseMaterials();
  }

  function draw(timestamp = 0) {
    state.frame = 0;
    if (!state.running || !state.visible) return;
    if (!state.reducedMotion && state.mobile && timestamp - state.lastRenderTime < 32) {
      requestFrame();
      return;
    }
    state.lastRenderTime = timestamp;
    const progressDelta = state.targetProgress - state.progress;
    const pointerDeltaX = state.targetPointerX - state.pointerX;
    const pointerDeltaY = state.targetPointerY - state.pointerY;
    state.progress += progressDelta * (state.reducedMotion ? 1 : .11);
    state.pointerX += pointerDeltaX * .1;
    state.pointerY += pointerDeltaY * .1;
    compose(timestamp * .001);
    renderer.render(scene, camera);
    const moving = Math.abs(progressDelta) > .0004 || Math.abs(pointerDeltaX) > .001 || Math.abs(pointerDeltaY) > .001;
    state.dirty = false;
    if (!state.reducedMotion || moving) requestFrame();
  }

  function requestFrame() {
    if (!state.frame && state.running && state.visible) state.frame = window.requestAnimationFrame(draw);
  }

  function setProgress(progress) {
    state.targetProgress = state.reducedMotion ? 0 : clamp(progress);
    requestFrame();
  }

  function setPointer(x, y) {
    state.targetPointerX = clamp(x, -1, 1);
    state.targetPointerY = clamp(y, -1, 1);
    requestFrame();
  }

  function setActivePhase(index) {
    const next = Math.max(0, Number(index) || 0);
    if (next === state.activePhase) return;
    state.activePhase = next;
    requestFrame();
  }

  function setFlowState(flowState) {
    const stateOrder = {
      setup: 0,
      focus: 1,
      reason: 2,
      action: 3,
      checkpoint: 4,
      timeup: 5,
      returned: 6,
      summary: 7,
      '1': 0,
      '2': 1,
      '3': 2,
      '4': 3
    };
    state.flowIndex = stateOrder[String(flowState)] ?? 0;
    requestFrame();
  }

  function setVisible(visible) {
    state.visible = Boolean(visible);
    if (state.visible) requestFrame();
  }

  function setRunning(running) {
    state.running = Boolean(running);
    if (!state.running && state.frame) {
      window.cancelAnimationFrame(state.frame);
      state.frame = 0;
    }
    if (state.running) requestFrame();
  }

  function destroy() {
    setRunning(false);
    scene.traverse(object => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
      else object.material?.dispose?.();
    });
    renderer.dispose();
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    setRunning(false);
    document.documentElement.classList.remove('has-life-webgl');
    document.documentElement.classList.add('no-life-webgl');
  });

  canvas.addEventListener('webglcontextrestored', () => {
    document.documentElement.classList.remove('no-life-webgl');
    document.documentElement.classList.add('has-life-webgl');
    setRunning(true);
    resize();
  });

  resize();
  compose();
  renderer.render(scene, camera);

  return {
    resize,
    setProgress,
    setPointer,
    setMode: swapMaterials,
    setActivePhase,
    setFlowState,
    setVisible,
    setRunning,
    destroy
  };
}
