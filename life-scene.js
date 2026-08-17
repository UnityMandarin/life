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
    movementMetal: 0x8797a6,
    bridge: 0xb9c6d0,
    gear: 0xd8aa53,
    copper: 0xc9723d,
    circuit: 0x153c43,
    battery: 0xc9d3db,
    jewel: 0xe0447b,
    accent: 0x2a90ff,
    secondary: 0x7a5cff,
    core: 0x8edcff,
    light: 0xffffff
  },
  night: {
    metal: 0x737284,
    darkMetal: 0x11111a,
    movementMetal: 0x525362,
    bridge: 0x777586,
    gear: 0xc98b62,
    copper: 0xf0825e,
    circuit: 0x1b1730,
    battery: 0x7a7c8b,
    jewel: 0xff4fa5,
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
      roughness: .18,
      clearcoat: 1,
      clearcoatRoughness: .12
    }),
    darkMetal: new THREE.MeshPhysicalMaterial({
      color: palette.darkMetal,
      metalness: .9,
      roughness: .22,
      clearcoat: .76,
      clearcoatRoughness: .18
    }),
    movementMetal: new THREE.MeshPhysicalMaterial({
      color: palette.movementMetal,
      metalness: .96,
      roughness: .28,
      clearcoat: .55,
      clearcoatRoughness: .22
    }),
    bridge: new THREE.MeshPhysicalMaterial({
      color: palette.bridge,
      metalness: .92,
      roughness: .2,
      clearcoat: .8,
      clearcoatRoughness: .16
    }),
    gear: new THREE.MeshPhysicalMaterial({
      color: palette.gear,
      metalness: .94,
      roughness: .2,
      clearcoat: .72,
      clearcoatRoughness: .15
    }),
    copper: new THREE.MeshPhysicalMaterial({
      color: palette.copper,
      emissive: palette.copper,
      emissiveIntensity: .08,
      metalness: .88,
      roughness: .22,
      clearcoat: .48
    }),
    circuit: new THREE.MeshPhysicalMaterial({
      color: palette.circuit,
      metalness: .42,
      roughness: .3,
      clearcoat: .75,
      clearcoatRoughness: .18
    }),
    battery: new THREE.MeshPhysicalMaterial({
      color: palette.battery,
      metalness: .92,
      roughness: .24,
      clearcoat: .78,
      clearcoatRoughness: .16
    }),
    jewel: new THREE.MeshPhysicalMaterial({
      color: palette.jewel,
      emissive: palette.jewel,
      emissiveIntensity: .5,
      metalness: .08,
      roughness: .12,
      transmission: .16,
      clearcoat: 1
    }),
    gasket: new THREE.MeshStandardMaterial({
      color: 0x080b10,
      metalness: .12,
      roughness: .72
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
    trace: new THREE.MeshPhysicalMaterial({
      color: palette.accent,
      emissive: palette.accent,
      emissiveIntensity: .82,
      metalness: .52,
      roughness: .18,
      clearcoat: .8
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: palette.light,
      metalness: 0,
      roughness: .035,
      transmission: .96,
      thickness: .065,
      ior: 1.49,
      attenuationColor: new THREE.Color(palette.core),
      attenuationDistance: 7,
      clearcoat: 1,
      clearcoatRoughness: .025,
      side: THREE.DoubleSide
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

function tagMaterial(object, materialKey) {
  object.userData.materialKey = materialKey;
  return object;
}

function createDisc(radius, depth, material, segments = 96) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, depth, segments, 1, false),
    material
  );
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function createRing(radius, tube, material, radialSegments = 18, tubularSegments = 128) {
  return new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments),
    material
  );
}

function createGear(radius, teeth, depth, material, materialKey) {
  const shape = new THREE.Shape();
  const steps = teeth * 4;
  for (let index = 0; index <= steps; index += 1) {
    const phase = index % 4;
    const angle = index / steps * Math.PI * 2;
    const edge = phase === 1 || phase === 2 ? radius : radius * .88;
    const x = Math.cos(angle) * edge;
    const y = Math.sin(angle) * edge;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const centerHole = new THREE.Path();
  centerHole.absarc(0, 0, radius * .16, 0, Math.PI * 2, false);
  shape.holes.push(centerHole);
  if (radius > .32) {
    const openingRadius = radius * .15;
    const openingOrbit = radius * .5;
    for (let index = 0; index < 5; index += 1) {
      const angle = index / 5 * Math.PI * 2;
      const opening = new THREE.Path();
      opening.absarc(Math.cos(angle) * openingOrbit, Math.sin(angle) * openingOrbit, openingRadius, 0, Math.PI * 2, false);
      shape.holes.push(opening);
    }
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: Math.min(.018, depth * .24),
    bevelThickness: Math.min(.018, depth * .24),
    curveSegments: 24
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return tagMaterial(new THREE.Mesh(geometry, material), materialKey);
}

function createArcBridge(innerRadius, outerRadius, depth, start, length, material, materialKey) {
  const shape = new THREE.Shape();
  const segments = 42;
  for (let index = 0; index <= segments; index += 1) {
    const angle = start + length * index / segments;
    const x = Math.cos(angle) * outerRadius;
    const y = Math.sin(angle) * outerRadius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let index = segments; index >= 0; index -= 1) {
    const angle = start + length * index / segments;
    shape.lineTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: .018,
    bevelThickness: .014,
    curveSegments: 24
  });
  geometry.translate(0, 0, -depth / 2);
  return tagMaterial(new THREE.Mesh(geometry, material), materialKey);
}

function createTrace(points, width, material) {
  const group = new THREE.Group();
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const segment = tagMaterial(
      new THREE.Mesh(new THREE.BoxGeometry(length, width, .018), material),
      'trace'
    );
    segment.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0);
    segment.rotation.z = Math.atan2(to[1] - from[1], to[0] - from[0]);
    group.add(segment);
  }
  return group;
}

function createMovement(materials, parts) {
  const movement = new THREE.Group();

  parts.mainplate = tagMaterial(createDisc(2.18, .12, materials.movementMetal), 'movementMetal');
  parts.mainplate.position.z = -.08;
  movement.add(parts.mainplate);

  const plateInset = tagMaterial(createDisc(1.98, .035, materials.darkMetal), 'darkMetal');
  plateInset.position.z = -.005;
  movement.add(plateInset);

  parts.rotor = new THREE.Group();
  const rotorWeight = createArcBridge(1.25, 2.04, .105, -.2, Math.PI * 1.08, materials.movementMetal, 'movementMetal');
  const rotorArm = tagMaterial(new THREE.Mesh(new THREE.BoxGeometry(1.62, .13, .085), materials.bridge), 'bridge');
  rotorArm.position.x = .65;
  rotorArm.rotation.z = -.12;
  const rotorHub = tagMaterial(createDisc(.23, .11, materials.battery, 48), 'battery');
  parts.rotor.add(rotorWeight, rotorArm, rotorHub);
  parts.rotor.position.z = .015;
  movement.add(parts.rotor);

  parts.batteryLayer = new THREE.Group();
  parts.batteryLayer.position.set(.72, -.82, .07);
  const battery = tagMaterial(createDisc(.55, .15, materials.battery, 72), 'battery');
  const batteryLip = tagMaterial(createRing(.49, .025, materials.movementMetal, 12, 72), 'movementMetal');
  batteryLip.position.z = .09;
  const batteryContact = tagMaterial(createArcBridge(.56, .67, .045, -.9, 1.8, materials.copper, 'copper'), 'copper');
  batteryContact.position.z = .03;
  const plusHorizontal = tagMaterial(new THREE.Mesh(new THREE.BoxGeometry(.22, .045, .018), materials.darkMetal), 'darkMetal');
  const plusVertical = tagMaterial(new THREE.Mesh(new THREE.BoxGeometry(.045, .22, .018), materials.darkMetal), 'darkMetal');
  plusHorizontal.position.z = plusVertical.position.z = .095;
  parts.batteryLayer.add(battery, batteryLip, batteryContact, plusHorizontal, plusVertical);
  movement.add(parts.batteryLayer);

  parts.circuitLayer = new THREE.Group();
  parts.circuitLayer.position.set(.75, .77, .105);
  const board = tagMaterial(new THREE.Mesh(new THREE.BoxGeometry(1.18, .7, .075), materials.circuit), 'circuit');
  board.rotation.z = -.16;
  parts.circuitLayer.add(board);
  const processor = tagMaterial(new THREE.Mesh(new THREE.BoxGeometry(.34, .26, .105), materials.darkMetal), 'darkMetal');
  processor.position.set(.08, .02, .085);
  processor.rotation.z = -.16;
  parts.circuitLayer.add(processor);
  const boardJewel = tagMaterial(createDisc(.075, .055, materials.jewel, 28), 'jewel');
  boardJewel.position.set(-.35, .12, .075);
  parts.circuitLayer.add(boardJewel);
  const traceA = createTrace([[-.5, -.16], [-.22, -.16], [-.22, .06], [-.06, .06]], .025, materials.trace);
  const traceB = createTrace([[.22, -.1], [.43, -.1], [.43, .18]], .022, materials.trace);
  traceA.position.z = traceB.position.z = .07;
  traceA.rotation.z = traceB.rotation.z = -.16;
  parts.circuitLayer.add(traceA, traceB);
  movement.add(parts.circuitLayer);

  parts.coil = new THREE.Group();
  const coilPoints = [];
  for (let index = 0; index < 74; index += 1) {
    const angle = index / 73 * Math.PI * 7.5;
    const radius = .055 + index / 73 * .43;
    coilPoints.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
  }
  const coilCurve = new THREE.CatmullRomCurve3(coilPoints);
  const coilMesh = tagMaterial(
    new THREE.Mesh(new THREE.TubeGeometry(coilCurve, 120, .022, 7, false), materials.copper),
    'copper'
  );
  parts.coil.add(coilMesh);
  parts.coil.position.set(1.15, -.02, .145);
  movement.add(parts.coil);

  parts.gearTrain = new THREE.Group();
  parts.gears = [];
  const gearData = [
    { x: -.58, y: .36, radius: .6, teeth: 28, depth: .105, phase: .08 },
    { x: .34, y: .68, radius: .42, teeth: 20, depth: .095, phase: .42 },
    { x: .83, y: .08, radius: .3, teeth: 14, depth: .085, phase: .2 },
    { x: .52, y: -.55, radius: .47, teeth: 22, depth: .1, phase: -.18 },
    { x: -.18, y: -.68, radius: .27, teeth: 12, depth: .08, phase: .62 },
    { x: -.79, y: -.52, radius: .36, teeth: 17, depth: .09, phase: -.34 }
  ];
  gearData.forEach((gear, index) => {
    const group = new THREE.Group();
    const mesh = createGear(gear.radius, gear.teeth, gear.depth, materials.gear, 'gear');
    const pinion = tagMaterial(createDisc(gear.radius * .17, gear.depth + .06, materials.movementMetal, 36), 'movementMetal');
    const jewel = tagMaterial(createDisc(gear.radius * .09, gear.depth + .075, materials.jewel, 28), 'jewel');
    group.add(mesh, pinion, jewel);
    group.position.set(gear.x, gear.y, .17 + index * .006);
    group.rotation.z = gear.phase;
    group.userData.baseX = gear.x;
    group.userData.baseY = gear.y;
    group.userData.baseZ = group.position.z;
    group.userData.phase = gear.phase;
    group.userData.teeth = gear.teeth;
    group.userData.direction = index % 2 === 0 ? 1 : -1;
    parts.gears.push(group);
    parts.gearTrain.add(group);
  });
  movement.add(parts.gearTrain);

  parts.balance = new THREE.Group();
  const balanceRim = tagMaterial(createRing(.39, .035, materials.gear, 12, 72), 'gear');
  parts.balance.add(balanceRim);
  for (let index = 0; index < 6; index += 1) {
    const spoke = tagMaterial(new THREE.Mesh(new THREE.BoxGeometry(.62, .035, .04), materials.gear), 'gear');
    spoke.rotation.z = index / 6 * Math.PI;
    parts.balance.add(spoke);
  }
  const balanceJewel = tagMaterial(createDisc(.095, .08, materials.jewel, 32), 'jewel');
  parts.balance.add(balanceJewel);
  parts.balance.position.set(-1.14, 1.02, .205);
  movement.add(parts.balance);

  parts.bridgeLayer = new THREE.Group();
  const bridgeA = createArcBridge(.7, 1.02, .105, 2.35, 2.05, materials.bridge, 'bridge');
  const bridgeB = createArcBridge(1.42, 1.72, .09, -.72, 1.35, materials.bridge, 'bridge');
  const bridgeC = tagMaterial(new THREE.Mesh(new THREE.BoxGeometry(1.08, .18, .095), materials.bridge), 'bridge');
  bridgeC.position.set(-.56, .17, 0);
  bridgeC.rotation.z = -.3;
  parts.bridgeLayer.add(bridgeA, bridgeB, bridgeC);
  parts.bridgeLayer.position.z = .255;
  movement.add(parts.bridgeLayer);

  const screwPositions = [
    [-1.75, 0], [-1.23, -1.22], [0, -1.74], [1.28, -1.2], [1.72, .08],
    [1.2, 1.23], [.05, 1.71], [-1.26, 1.18], [-.42, .2], [.43, -.22]
  ];
  const screwGeometry = new THREE.CylinderGeometry(.055, .06, .052, 18);
  const screws = tagMaterial(new THREE.InstancedMesh(screwGeometry, materials.metal, screwPositions.length), 'metal');
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  screwPositions.forEach((position, index) => {
    matrix.compose(new THREE.Vector3(position[0], position[1], .325), quaternion, new THREE.Vector3(1, 1, 1));
    screws.setMatrixAt(index, matrix);
  });
  screws.instanceMatrix.needsUpdate = true;
  movement.add(screws);

  const grooveRadii = [1.82, 1.9, 1.98];
  grooveRadii.forEach(radius => {
    const groove = tagMaterial(createRing(radius, .008, materials.bridge, 6, 96), 'bridge');
    groove.position.z = -.005;
    movement.add(groove);
  });

  return movement;
}

function createTimepiece(materials) {
  const root = new THREE.Group();
  const parts = {};

  parts.backModule = new THREE.Group();
  parts.back = tagMaterial(createDisc(2.36, .18, materials.metal), 'metal');
  parts.backModule.add(parts.back);
  [1.72, 1.9, 2.08].forEach(radius => {
    const groove = tagMaterial(createRing(radius, .011, materials.movementMetal, 7, 96), 'movementMetal');
    groove.position.z = .098;
    parts.backModule.add(groove);
  });
  parts.backModule.position.z = -.44;
  root.add(parts.backModule);

  parts.caseModule = new THREE.Group();
  parts.case = tagMaterial(createDisc(2.62, .42, materials.darkMetal), 'darkMetal');
  parts.case.position.z = -.19;
  const caseBand = tagMaterial(createRing(2.56, .09, materials.movementMetal, 16, 128), 'movementMetal');
  caseBand.position.z = -.04;
  parts.caseModule.add(parts.case, caseBand);
  root.add(parts.caseModule);

  parts.movementModule = createMovement(materials, parts);
  parts.movementModule.position.z = -.05;
  root.add(parts.movementModule);

  parts.frontModule = new THREE.Group();
  parts.frontModule.position.z = .12;

  parts.outerBezel = tagMaterial(createRing(2.48, .17, materials.metal), 'metal');
  parts.outerBezel.position.z = 0;
  parts.frontModule.add(parts.outerBezel);

  parts.accentBezel = tagMaterial(createRing(2.22, .035, materials.accent), 'accent');
  parts.accentBezel.position.z = .08;
  parts.frontModule.add(parts.accentBezel);

  const dialCarrier = tagMaterial(createRing(2.1, .045, materials.darkMetal, 12, 128), 'darkMetal');
  dialCarrier.position.z = .11;
  parts.frontModule.add(dialCarrier);

  parts.phaseGroup = new THREE.Group();
  parts.phaseGroup.position.z = .125;
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
    parts.phaseGroup.add(segment);
  }
  parts.phaseMaterials = phaseMaterials;
  parts.frontModule.add(parts.phaseGroup);

  const tickGeometry = new THREE.BoxGeometry(.045, .18, .05);
  const ticks = tagMaterial(new THREE.InstancedMesh(tickGeometry, materials.metal, 20), 'metal');
  const tickMatrix = new THREE.Matrix4();
  const tickPosition = new THREE.Vector3();
  const tickQuaternion = new THREE.Quaternion();
  const tickScale = new THREE.Vector3(1, 1, 1);
  const tickRotation = new THREE.Euler();
  for (let index = 0; index < 20; index += 1) {
    const angle = index / 20 * Math.PI * 2;
    tickPosition.set(Math.sin(angle) * 1.9, Math.cos(angle) * 1.9, .17);
    tickRotation.set(0, 0, -angle);
    tickQuaternion.setFromEuler(tickRotation);
    tickScale.set(index % 5 === 0 ? 1.5 : .8, index % 5 === 0 ? 1.5 : .78, 1);
    tickMatrix.compose(tickPosition, tickQuaternion, tickScale);
    ticks.setMatrixAt(index, tickMatrix);
  }
  ticks.instanceMatrix.needsUpdate = true;
  parts.ticks = ticks;
  parts.frontModule.add(ticks);

  parts.innerRing = tagMaterial(createRing(1.28, .075, materials.darkMetal), 'darkMetal');
  parts.innerRing.position.z = .19;
  parts.frontModule.add(parts.innerRing);

  parts.coreHalo = tagMaterial(createRing(.73, .055, materials.accent), 'accent');
  parts.coreHalo.position.z = .24;
  parts.frontModule.add(parts.coreHalo);

  parts.core = tagMaterial(createDisc(.57, .24, materials.core, 72), 'core');
  parts.core.position.z = .27;
  parts.frontModule.add(parts.core);

  parts.minuteHand = tagMaterial(new THREE.Mesh(new THREE.BoxGeometry(.085, 1.48, .055), materials.metal), 'metal');
  parts.minuteHand.geometry.translate(0, .61, 0);
  parts.minuteHand.position.z = .34;
  parts.minuteHand.rotation.z = -.72;
  parts.frontModule.add(parts.minuteHand);

  parts.phaseHand = tagMaterial(new THREE.Mesh(new THREE.BoxGeometry(.11, 1.04, .075), materials.accent), 'accent');
  parts.phaseHand.geometry.translate(0, .43, 0);
  parts.phaseHand.position.z = .38;
  parts.phaseHand.rotation.z = 1.86;
  parts.frontModule.add(parts.phaseHand);

  parts.pin = tagMaterial(createDisc(.13, .1, materials.metal, 48), 'metal');
  parts.pin.position.z = .42;
  parts.frontModule.add(parts.pin);

  parts.gasket = tagMaterial(createRing(2.135, .031, materials.gasket, 12, 128), 'gasket');
  parts.gasket.position.z = .445;
  parts.frontModule.add(parts.gasket);

  parts.crystalRetainer = tagMaterial(createRing(2.17, .045, materials.metal, 14, 128), 'metal');
  parts.crystalRetainer.position.z = .46;
  parts.crystalRetainer.renderOrder = 24;
  parts.frontModule.add(parts.crystalRetainer);

  parts.glass = tagMaterial(createDisc(2.105, .032, materials.glass), 'glass');
  parts.glass.position.z = .455;
  parts.glass.renderOrder = 22;
  parts.frontModule.add(parts.glass);

  const crystalGlintMaterial = new THREE.MeshBasicMaterial({
    color: materials.palette.light,
    transparent: true,
    opacity: .1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  parts.crystalGlint = new THREE.Mesh(new THREE.RingGeometry(1.82, 2.025, 64, 1, .46, .62), crystalGlintMaterial);
  parts.crystalGlint.position.z = .474;
  parts.crystalGlint.renderOrder = 26;
  parts.frontModule.add(parts.crystalGlint);

  root.add(parts.frontModule);

  parts.orbitGroup = new THREE.Group();
  const orbitGeometry = new THREE.SphereGeometry(.12, 24, 18);
  for (let index = 0; index < 7; index += 1) {
    const materialKey = index % 2 ? 'accent' : 'secondary';
    const node = tagMaterial(new THREE.Mesh(orbitGeometry, materials[materialKey]), materialKey);
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
  camera.position.set(0, 0, 9.4);

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
    compact: false,
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
    world.traverse(object => {
      const key = object.userData.materialKey;
      if (key && next[key]) object.material = next[key];
    });
    parts.phaseMaterials.forEach((material, index) => {
      material.dispose();
      const replacement = next.secondary.clone();
      replacement.transparent = true;
      replacement.opacity = index < 5 ? .48 : .24;
      parts.phaseGroup.children[index].material = replacement;
      parts.phaseMaterials[index] = replacement;
    });
    parts.crystalGlint.material.color.setHex(next.palette.light);
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
    state.compact = width < 900;
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
    const intro = ease(progress / .22);
    const shellOpen = ease((progress - .11) / .28);
    const movementOpen = ease((progress - .27) / .3);
    const reassemble = ease((progress - .76) / .24);
    const open = shellOpen * (1 - reassemble);
    const detail = movementOpen * (1 - reassemble);
    const inspection = ease((progress - .33) / .22) * (1 - reassemble);
    const pointerScale = state.reducedMotion ? 0 : 1;
    const pageScale = state.page === 'security' ? .88 : state.page === 'menu' ? .81 : .96;
    const inspectionScale = state.mobile ? .48 : state.compact ? .47 : state.page === 'home' ? .65 : .72;
    const assemblySpread = state.mobile ? .58 : state.compact ? .7 : 1;
    const motionTime = state.reducedMotion ? 0 : time;
    const pageOffset = state.compact ? 0 : state.page === 'security' ? 2.08 : state.page === 'menu' ? 2.34 : 2.26;
    const driftX = Math.sin(motionTime * .31) * .085;
    const driftY = Math.sin(motionTime * .43 + .8) * .085;
    const pulse = .5 + Math.sin(motionTime * 1.18) * .5;

    world.position.x = pageOffset * mix(1, .36, inspection) + driftX;
    world.position.y = driftY;
    world.rotation.x = mix(.5, .15, intro) + inspection * .15 + state.pointerY * .075 * pointerScale + Math.sin(motionTime * .37) * .035;
    world.rotation.y = mix(-.62, .14, intro) + progress * .12 - inspection * .66 + state.pointerX * .1 * pointerScale + Math.sin(motionTime * .29 + .6) * .065;
    world.rotation.z = mix(-.18, .02, intro) + Math.sin(motionTime * .24) * .02;
    world.scale.setScalar(pageScale * mix(.84, 1, intro) * mix(1, inspectionScale, inspection) * mix(1, .86, reassemble));

    const { parts } = timepiece;
    parts.backModule.position.set(-detail * 3 * assemblySpread, detail * .16, -.44 - open * .94 - detail * .58);
    parts.caseModule.position.set(-detail * 1.82 * assemblySpread, detail * .04, -open * .4 - detail * .22);
    parts.movementModule.position.set(-detail * .18 * assemblySpread, 0, -.05);
    parts.mainplate.position.set(-detail * .42 * assemblySpread, detail * .05, -.08 - detail * .3);
    parts.rotor.position.z = .015 - detail * .11;
    parts.batteryLayer.position.set(.72 - detail * .72, -.82 - detail * .5, .07 + detail * .44);
    parts.circuitLayer.position.set(.75 - detail * .55, .77 + detail * .38, .105 + detail * .28);
    parts.coil.position.set(1.15 - detail * .58, -.02 + detail * .12, .145 + detail * .34);
    parts.gearTrain.position.z = detail * .28;
    parts.balance.position.set(-1.14 - detail * .2, 1.02 + detail * .14, .205 + detail * .31);
    parts.bridgeLayer.position.z = .255 + detail * .43;
    parts.frontModule.position.set(detail * 3.08 * assemblySpread, -detail * .09, .12 + open * .48 + detail * .17);

    parts.gears.forEach((gear, index) => {
      const spread = 1 + detail * .19;
      gear.position.x = gear.userData.baseX * spread;
      gear.position.y = gear.userData.baseY * spread;
      gear.position.z = gear.userData.baseZ + detail * index * .04;
      gear.rotation.z = gear.userData.phase + gear.userData.direction * motionTime * .44 * (28 / gear.userData.teeth);
    });

    parts.rotor.rotation.z = progress * .7 + motionTime * .12 + Math.sin(motionTime * .24) * .1;
    parts.balance.rotation.z = Math.sin(motionTime * 2.6) * .42;
    parts.outerBezel.rotation.z = progress * .3 + state.flowIndex * .1 + motionTime * .035;
    parts.accentBezel.rotation.z = -progress * .48 - motionTime * .052;
    parts.phaseGroup.rotation.z = progress * .36 + state.flowIndex * .22 + motionTime * .018 + Math.sin(motionTime * .35) * .04;
    parts.innerRing.rotation.z = -progress * .68 + motionTime * .08;
    parts.coreHalo.rotation.z = progress * .9 - motionTime * .13;
    parts.minuteHand.rotation.z = -.72 + progress * Math.PI * 1.7 + motionTime * .15;
    parts.phaseHand.rotation.z = 1.86 + state.activePhase / 6 * Math.PI * 2 + progress * .26 + motionTime * .045;
    parts.core.scale.setScalar(1 + pulse * .042);
    parts.core.material.emissiveIntensity = 1.08 + pulse * .42;
    parts.crystalGlint.rotation.z = -motionTime * .08 + progress * .28;
    materials.copper.emissiveIntensity = .06 + pulse * .13 + detail * .08;
    materials.trace.emissiveIntensity = .58 + pulse * .64 + detail * .25;
    materials.jewel.emissiveIntensity = .38 + pulse * .42;

    parts.orbitGroup.visible = state.page === 'menu';
    parts.orbitGroup.rotation.z = progress * 1.12 + motionTime * .14;
    parts.orbitGroup.rotation.x = .38 + detail * .2;
    parts.orbitGroup.scale.setScalar(mix(.7, 1.04, intro));
    parts.orbitGroup.children.forEach((node, index) => {
      node.position.z = node.userData.baseZ + Math.sin(motionTime * .72 + index * .9) * .13;
      node.scale.setScalar(.9 + (.5 + Math.sin(motionTime * .9 + index) * .5) * .24);
    });

    if (state.page === 'return') {
      world.rotation.z += state.flowIndex * -.3;
      parts.phaseHand.rotation.z = state.flowIndex * -.58 + motionTime * .05;
      parts.rotor.rotation.z += state.flowIndex * .18;
    }

    if (state.page === 'security') {
      const unlocked = clamp(state.flowIndex / 3);
      parts.outerBezel.rotation.z += unlocked * Math.PI * .5;
      parts.accentBezel.rotation.z -= unlocked * Math.PI * .75;
      parts.innerRing.rotation.z += unlocked * Math.PI;
      parts.rotor.rotation.z += unlocked * Math.PI * .65;
      parts.core.material.emissiveIntensity = .84 + unlocked * 1.18 + pulse * .28;
      materials.trace.emissiveIntensity += unlocked * .72;
    }

    keyLight.intensity = 3.8 + pulse * .75;
    rimLight.position.x = 4 + Math.sin(motionTime * .42) * .75;
    rimLight.position.y = -2 + Math.cos(motionTime * .34) * .52;
    fillLight.position.x = -4 + Math.cos(motionTime * .3) * .55;

    camera.position.z = mix(9.4, 11.8, inspection) + reassemble * .38;
    camera.position.x = -inspection * .24 + state.pointerX * .16 * pointerScale;
    camera.position.y = inspection * .08 + state.pointerY * -.12 * pointerScale;
    camera.lookAt(0, 0, 0);
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
