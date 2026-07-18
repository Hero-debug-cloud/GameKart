import * as THREE from 'three';
import * as CANNON from 'cannon-es';

console.log("GameKart Physics Sandbox starting...");

// --- 1. THREE.JS GRAPHICS SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060814); // Deep space color
scene.fog = new THREE.FogExp2(0x060814, 0.012); // Deep dark space fog

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('game-canvas'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Add Starfield Particle System
const starCount = 1800;
const starGeo = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i += 3) {
    const radius = 120 + Math.random() * 80;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    
    starPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i+1] = Math.abs(radius * Math.sin(phi) * Math.sin(theta)) + 5; // keep above ground
    starPositions[i+2] = radius * Math.cos(phi);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.5,
    transparent: true,
    opacity: 0.75
});
const starField = new THREE.Points(starGeo, starMat);
scene.add(starField);

// --- 2. CANNON-ES PHYSICS SETUP ---
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Standard gravity
world.broadphase = new CANNON.SAPBroadphase(world);
world.defaultContactMaterial.friction = 0.2;
world.defaultContactMaterial.restitution = 0.1;

// Define custom materials for physics interaction
const groundPhysicsMat = new CANNON.Material('ground');
const kartPhysicsMat = new CANNON.Material('kart');
const contactMaterial = new CANNON.ContactMaterial(groundPhysicsMat, kartPhysicsMat, {
    friction: 0.1, // Low friction to allow controlled slides
    restitution: 0.2, // Small bounce on crash
    contactEquationStiffness: 1e7,
    contactEquationRelaxation: 3
});
world.addContactMaterial(contactMaterial);

// --- 3. ENVIRONMENT & LIGHTING ---
// Generate custom glowing procedural grid texture using a 2D canvas
const canvas = document.createElement('canvas');
canvas.width = 128;
canvas.height = 128;
const ctx = canvas.getContext('2d');

// Dark space background
ctx.fillStyle = '#060814';
ctx.fillRect(0, 0, 128, 128);

// Glow effect on grid lines
ctx.shadowColor = '#6d28d9'; // deep violet glow
ctx.shadowBlur = 8;

// Neon purple grid lines
ctx.strokeStyle = '#4c1d95'; 
ctx.lineWidth = 3;
ctx.strokeRect(0, 0, 128, 128);

// Inner cyan grid lines (without shadow)
ctx.shadowBlur = 0;
ctx.strokeStyle = '#1e293b'; 
ctx.lineWidth = 1;
ctx.strokeRect(0, 0, 128, 128);

const gridTexture = new THREE.CanvasTexture(canvas);
gridTexture.wrapS = THREE.RepeatWrapping;
gridTexture.wrapT = THREE.RepeatWrapping;
gridTexture.repeat.set(100, 100); // Repeat over 200x200 arena

// Ground Plane
const size = 200;
const groundGeo = new THREE.PlaneGeometry(size, size);
const groundMat = new THREE.MeshStandardMaterial({
    map: gridTexture,
    roughness: 0.5,
    metalness: 0.6
});
const groundMesh = new THREE.Mesh(groundGeo, groundMat);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// Ground Physics Body
const groundBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
    material: groundPhysicsMat
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// Boundary & Track Materials
const walls = [];
const wallHeight = 4;
const wallThickness = 2;
const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x090d16, // Glossy dark obsidian
    roughness: 0.15,
    metalness: 0.9
});
const pillarMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d111d, // Dark metal pillars
    roughness: 0.2,
    metalness: 0.8
});

// Helper for standard walls (with neon pink top trim)
function createWall(x, z, width, depth) {
    const geo = new THREE.BoxGeometry(width, wallHeight, depth);
    const mesh = new THREE.Mesh(geo, wallMaterial);
    mesh.position.set(x, wallHeight / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    walls.push(mesh);

    // Glowing hot pink trim along the top
    const trimGeo = new THREE.BoxGeometry(width + 0.05, 0.08, depth + 0.05);
    const trimMat = new THREE.MeshBasicMaterial({ color: 0xec4899 }); // Neon Hot Pink
    const trimMesh = new THREE.Mesh(trimGeo, trimMat);
    trimMesh.position.set(x, wallHeight - 0.04, z);
    scene.add(trimMesh);

    const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(width / 2, wallHeight / 2, depth / 2))
    });
    body.position.set(x, wallHeight / 2, z);
    world.addBody(body);
}

// Helper for sloped ramps (with neon green side trims)
function createRamp(x, y, z, width, height, depth, angleRad) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geo, wallMaterial);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Neon green side trim guards
    const trimGeo = new THREE.BoxGeometry(0.12, height + 0.04, depth);
    const trimMat = new THREE.MeshBasicMaterial({ color: 0x10b981 }); // Neon Emerald Green
    
    const trimL = new THREE.Mesh(trimGeo, trimMat);
    trimL.position.set(-width / 2 + 0.06, 0.02, 0);
    mesh.add(trimL);

    const trimR = trimL.clone();
    trimR.position.x = width / 2 - 0.06;
    mesh.add(trimR);

    const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2))
    });
    body.position.set(x, y, z);
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), angleRad);
    mesh.quaternion.copy(body.quaternion);
    world.addBody(body);
}

// Helper for elevated platforms (with neon green side trims)
function createPlatform(x, y, z, width, height, depth) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geo, wallMaterial);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const trimGeo = new THREE.BoxGeometry(0.12, height + 0.04, depth);
    const trimMat = new THREE.MeshBasicMaterial({ color: 0x10b981 }); // Neon Emerald Green

    const trimL = new THREE.Mesh(trimGeo, trimMat);
    trimL.position.set(-width / 2 + 0.06, 0.02, 0);
    mesh.add(trimL);

    const trimR = trimL.clone();
    trimR.position.x = width / 2 - 0.06;
    mesh.add(trimR);

    const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2))
    });
    body.position.set(x, y, z);
    world.addBody(body);
}

// Helper for cylindrical pillars (with neon blue floating rings)
function createPillar(x, z, radius, height) {
    const geo = new THREE.CylinderGeometry(radius, radius, height, 16);
    const mesh = new THREE.Mesh(geo, pillarMaterial);
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Glowing neon blue ring around the pillar center
    const ringGeo = new THREE.TorusGeometry(radius + 0.08, 0.06, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 }); // Neon Blue
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(x, height / 2, z);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Cylinder(radius, radius, height, 16)
    });
    body.position.set(x, height / 2, z);
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Align vertically
    world.addBody(body);
}

// Build outer boundaries (200x200 arena)
createWall(0, 100, 200, wallThickness);   // North
createWall(0, -100, 200, wallThickness);  // South
createWall(100, 0, wallThickness, 200);   // East
createWall(-100, 0, wallThickness, 200);  // West

// Build sloped ramps & elevated platforms
createRamp(0, 1.2, -40, 10, 0.4, 25, 0.12); // Ramp leading up to -Z (starts around Z = -27.5, ends Z = -52.5)
createPlatform(0, 2.5, -67.5, 12, 0.4, 30); // Landing Platform at the end of the ramp

// Build cylindrical pillars & block obstacles
createPillar(25, 25, 2.5, 6);
createPillar(-25, 25, 2.5, 6);
createPillar(25, -25, 2.5, 6);
createPillar(-25, -25, 2.5, 6);

createWall(45, 0, 15, 6);
createWall(-45, 0, 15, 6);

// Cyberpunk Vaporwave Lighting
const ambientLight = new THREE.AmbientLight(0x131124, 0.8); // Deep space purple ambient
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x7c3aed, 1.6); // Violet sun
dirLight.position.set(50, 80, 50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 250;
const d1 = 100;
dirLight.shadow.camera.left = -d1;
dirLight.shadow.camera.right = d1;
dirLight.shadow.camera.top = d1;
dirLight.shadow.camera.bottom = -d1;
scene.add(dirLight);


// --- 4. SMASH KARTS STYLIZED DESIGN & RIGGING ---
const kartGroup = new THREE.Group();
scene.add(kartGroup);

// Kart Dimensions
const kartWidth = 1.6;
const kartHeight = 1.1;
const kartLength = 2.6;

// Materials
const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 }); // Red panels
const blueMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5 }); // Blue panels
const greyMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 }); // Metal chassis
const lightGreyMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4 }); // Bumper/fenders
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.05 }); // Chrome pipes
const pipeTipMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 }); // Black tips
const pipeInnerMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff }); // Blue glowing inner nozzle
const rabbitCyanMat = new THREE.MeshStandardMaterial({ color: 0x00d2ff, roughness: 0.6 }); // Rabbit fur (cyan)
const rabbitWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }); // Inner ear/cheek fur
const blackMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.9 }); // Eyes/nose
const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }); // Tire rubber
const rimMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.5, roughness: 0.3 }); // Rim alloy

// 1. Chassis Base (Grey metal block)
const baseGeo = new THREE.BoxGeometry(0.9, 0.18, 1.5);
const baseMesh = new THREE.Mesh(baseGeo, greyMat);
baseMesh.position.set(0, 0.05, -0.2);
baseMesh.castShadow = true;
baseMesh.receiveShadow = true;
kartGroup.add(baseMesh);

// 2. Red Side Pods (Left & Right)
const leftPodGeo = new THREE.BoxGeometry(0.18, 0.25, 1.1);
const leftPod = new THREE.Mesh(leftPodGeo, redMat);
leftPod.position.set(-0.52, 0.1, -0.2);
leftPod.castShadow = true;
kartGroup.add(leftPod);

const rightPod = leftPod.clone();
rightPod.position.x = 0.52;
kartGroup.add(rightPod);

// 3. Blue Rear Wing/Fenders
const leftWingGeo = new THREE.BoxGeometry(0.16, 0.35, 0.45);
const leftWing = new THREE.Mesh(leftWingGeo, blueMat);
leftWing.position.set(-0.54, 0.3, -0.85);
leftWing.castShadow = true;
kartGroup.add(leftWing);

const rightWing = leftWing.clone();
rightWing.position.x = 0.54;
kartGroup.add(rightWing);

// 4. Front Bumper Guard (Light grey)
const frontBumperGeo = new THREE.BoxGeometry(1.2, 0.1, 0.16);
const frontBumper = new THREE.Mesh(frontBumperGeo, lightGreyMat);
frontBumper.position.set(0, -0.05, 0.7);
frontBumper.castShadow = true;
kartGroup.add(frontBumper);

// 5. Steering Column & Wheel
const columnGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.3, 8);
const column = new THREE.Mesh(columnGeo, greyMat);
column.position.set(0, 0.2, 0.2);
column.rotation.x = -0.6;
kartGroup.add(column);

const steeringWheelGeo = new THREE.TorusGeometry(0.14, 0.03, 6, 12);
const steeringWheel = new THREE.Mesh(steeringWheelGeo, blackMat);
steeringWheel.position.set(0, 0.28, 0.08);
steeringWheel.rotation.x = -0.6;
kartGroup.add(steeringWheel);

// 6. Bucket Seat (Black)
const seatBaseGeo = new THREE.BoxGeometry(0.72, 0.1, 0.5);
const seatBase = new THREE.Mesh(seatBaseGeo, blackMat);
seatBase.position.set(0, 0.1, -0.4);
kartGroup.add(seatBase);

const seatBackGeo = new THREE.BoxGeometry(0.72, 0.55, 0.1);
const seatBack = new THREE.Mesh(seatBackGeo, blackMat);
seatBack.position.set(0, 0.32, -0.65);
seatBack.rotation.x = -0.15;
kartGroup.add(seatBack);

// 7. Quad Exhaust Pipes (4 Pipes angled upwards: 2 Left, 2 Right)
function createExhaustPipe(x, y, z, rollRotZ) {
    const pipeGroup = new THREE.Group();

    // Chrome body
    const bodyGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 12);
    const pipeBody = new THREE.Mesh(bodyGeo, chromeMat);
    pipeBody.castShadow = true;
    pipeGroup.add(pipeBody);

    // Black Tip
    const tipGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 12);
    const pipeTip = new THREE.Mesh(tipGeo, pipeTipMat);
    pipeTip.position.y = 0.25;
    pipeTip.castShadow = true;
    pipeGroup.add(pipeTip);

    // Blue Inner Glow Rim
    const glowGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12);
    const pipeGlow = new THREE.Mesh(glowGeo, pipeInnerMat);
    pipeGlow.position.y = 0.301;
    pipeGroup.add(pipeGlow);

    pipeGroup.position.set(x, y, z);
    pipeGroup.rotation.x = Math.PI / 4; // angle backwards
    pipeGroup.rotation.z = rollRotZ;   // splay outwards slightly
    
    kartGroup.add(pipeGroup);
    return pipeGroup;
}

// Left exhausts (2 pipes side by side)
const lPipe1 = createExhaustPipe(-0.25, 0.28, -0.85, -0.08);
const lPipe2 = createExhaustPipe(-0.12, 0.25, -0.92, -0.04);

// Right exhausts (2 pipes side by side)
const rPipe1 = createExhaustPipe(0.25, 0.28, -0.85, 0.08);
const rPipe2 = createExhaustPipe(0.12, 0.25, -0.92, 0.04);

// Exhaust flames for boost
const flameGeo = new THREE.ConeGeometry(0.1, 0.35, 8);
const flameMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.9 }); // blue boost flames!

const flames = [];
function addFlameToPipe(pipe) {
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 0.5;
    flame.visible = false;
    pipe.add(flame);
    flames.push(flame);
}
addFlameToPipe(lPipe1);
addFlameToPipe(lPipe2);
addFlameToPipe(rPipe1);
addFlameToPipe(rPipe2);

// 8. Styled Rabbit Pilot
const pilotGroup = new THREE.Group();
pilotGroup.position.set(0, 0.4, -0.32); // Center inside kart
kartGroup.add(pilotGroup);

// Rabbit Head (Cyan)
const headGeo = new THREE.SphereGeometry(0.22, 16, 16);
const head = new THREE.Mesh(headGeo, rabbitCyanMat);
head.position.y = 0.25;
head.castShadow = true;
pilotGroup.add(head);

// Rabbit Ears (Left & Right)
const rabbitEars = [];
function createEar(xOffset, yRot, zRot) {
    const earGroup = new THREE.Group();
    
    // Outer Ear (Cyan)
    const outerGeo = new THREE.CapsuleGeometry(0.05, 0.26, 4, 12);
    const outer = new THREE.Mesh(outerGeo, rabbitCyanMat);
    outer.scale.set(1, 1, 0.6); // Flatten ear slightly
    outer.castShadow = true;
    earGroup.add(outer);

    // Inner Ear (White)
    const innerGeo = new THREE.CapsuleGeometry(0.03, 0.22, 4, 12);
    const inner = new THREE.Mesh(innerGeo, rabbitWhiteMat);
    inner.position.z = 0.02; // position on front face of ear
    inner.scale.set(1, 1, 0.5);
    earGroup.add(inner);

    earGroup.position.set(xOffset, 0.42, 0.02);
    earGroup.rotation.y = yRot;
    earGroup.rotation.z = zRot;
    
    pilotGroup.add(earGroup);
    rabbitEars.push(earGroup);
}
// Upright, slightly splayed ears
createEar(-0.08, 0.1, 0.15);
createEar(0.08, -0.1, -0.15);

// Rabbit Cheeks (White spheres at base of nose)
const cheekGeo = new THREE.SphereGeometry(0.08, 12, 12);
const leftCheek = new THREE.Mesh(cheekGeo, rabbitWhiteMat);
leftCheek.position.set(-0.05, 0.22, 0.16);
pilotGroup.add(leftCheek);

const rightCheek = leftCheek.clone();
rightCheek.position.x = 0.05;
pilotGroup.add(rightCheek);

// Rabbit Nose (Small black bead)
const noseGeo2 = new THREE.SphereGeometry(0.03, 8, 8);
const nose2 = new THREE.Mesh(noseGeo2, blackMat);
nose2.position.set(0, 0.25, 0.22);
pilotGroup.add(nose2);

// Rabbit Eyes (2 Black spheres)
const eyeGeo = new THREE.SphereGeometry(0.03, 8, 8);
const leftEye = new THREE.Mesh(eyeGeo, blackMat);
leftEye.position.set(-0.08, 0.29, 0.18);
pilotGroup.add(leftEye);

const rightEye = leftEye.clone();
rightEye.position.x = 0.08;
pilotGroup.add(rightEye);

// Rabbit Body/Suit (Cyan torso)
const bodyGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.35, 12);
const body = new THREE.Mesh(bodyGeo, rabbitCyanMat);
body.position.y = 0.05;
body.castShadow = true;
pilotGroup.add(body);

// Arm steering connections
const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.24, 8);
const leftArm = new THREE.Mesh(armGeo, rabbitCyanMat);
leftArm.position.set(-0.16, 0.12, 0.2);
leftArm.rotation.x = Math.PI / 3;
leftArm.rotation.z = 0.2;
pilotGroup.add(leftArm);

const rightArm = leftArm.clone();
rightArm.position.x = 0.16;
rightArm.rotation.z = -0.2;
pilotGroup.add(rightArm);

// Underglow Magenta LED
const underglow = new THREE.PointLight(0xff00ff, 3.5, 6, 1.5);
underglow.position.set(0, -0.25, 0);
kartGroup.add(underglow);

// Wheels Setup
const wheelRadius = 0.45;
const wheelWidth = 0.3;
const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);

// Wheel Groups
const wheels = {
    frontLeft: new THREE.Group(),
    frontRight: new THREE.Group(),
    rearLeft: new THREE.Group(),
    rearRight: new THREE.Group()
};

function createWheelMesh(group, x, y, z) {
    const rollGroup = new THREE.Group(); // Rolling subgroup
    group.add(rollGroup);

    // Black Rubber Tyre
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.rotation.z = Math.PI / 2; // Orient cylinder horizontally
    tire.castShadow = true;
    tire.receiveShadow = true;
    rollGroup.add(tire);

    // Silver Alloy Rim
    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, wheelWidth + 0.01, 16);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.castShadow = true;
    rollGroup.add(rim);

    // Inner hub cap
    const capGeo = new THREE.CylinderGeometry(wheelRadius * 0.22, wheelRadius * 0.22, wheelWidth + 0.02, 8);
    const cap = new THREE.Mesh(capGeo, blackMat);
    cap.rotation.z = Math.PI / 2;
    rollGroup.add(cap);

    group.position.set(x, y, z);
    kartGroup.add(group);
}

// Position wheels relative to chassis center
const wheelXOffset = 0.95;
const wheelZOffset = 0.9;
const wheelYOffset = -0.1;

createWheelMesh(wheels.frontLeft, -wheelXOffset, wheelYOffset, wheelZOffset);
createWheelMesh(wheels.frontRight, wheelXOffset, wheelYOffset, wheelZOffset);
createWheelMesh(wheels.rearLeft, -wheelXOffset, wheelYOffset, -wheelZOffset);
createWheelMesh(wheels.rearRight, wheelXOffset, wheelYOffset, -wheelZOffset);

// --- 5. KART PHYSICS BODY ---
const kartShape = new CANNON.Box(new CANNON.Vec3(kartWidth / 2, kartHeight / 2, kartLength / 2));
const kartBody = new CANNON.Body({
    mass: 450, // kg
    shape: kartShape,
    material: kartPhysicsMat
});
// Lock pitch and roll (X and Z rotations) for stable arcade driving
kartBody.angularFactor.set(0, 1, 0);
// Start slightly above the ground
kartBody.position.set(0, 2, 0);
world.addBody(kartBody);

// --- 6. DRIVING CONTROLS & PHYSICS ENGINE ---
const keys = { w: false, s: false, a: false, d: false, Shift: false };

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') keys.w = true;
    if (key === 's' || key === 'arrowdown') keys.s = true;
    if (key === 'a' || key === 'arrowleft') keys.a = true;
    if (key === 'd' || key === 'arrowright') keys.d = true;
    if (key === 'shift') keys.Shift = true; // Drift trigger
    if (e.key === ' ') {
        useHeldItem();
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') keys.w = false;
    if (key === 's' || key === 'arrowdown') keys.s = false;
    if (key === 'a' || key === 'arrowleft') keys.a = false;
    if (key === 'd' || key === 'arrowright') keys.d = false;
    if (key === 'shift') keys.Shift = false;
});

// Driving tuning variables
const maxSpeed = 28; // m/s
const acceleration = 35;
const braking = 40;
const steerSpeed = 3.5; // Radians per sec
const maxSteerAngle = 0.55; // Max wheel swivel angle (approx 30 deg)
let steerAngle = 0;
let currentSpeed = 0;

// --- 7. CHASE CAMERA ---
const cameraOffset = new THREE.Vector3(0, 4.5, -8.5);
const cameraLookOffset = new THREE.Vector3(0, 1, 2);

function updateCamera(dt) {
    // Get kart position and forward orientation
    const kartPos = new THREE.Vector3().copy(kartBody.position);
    
    // Calculate back position based on kart rotation
    const backDirection = new THREE.Vector3(0, 0, -1);
    const kartQuaternion = new THREE.Quaternion().copy(kartBody.quaternion);
    backDirection.applyQuaternion(kartQuaternion);
    
    // Target position of camera
    const targetCamPos = kartPos.clone()
        .add(backDirection.clone().multiplyScalar(Math.abs(cameraOffset.z)))
        .add(new THREE.Vector3(0, cameraOffset.y, 0));
        
    // Lerp position for smooth follow
    camera.position.lerp(targetCamPos, 8 * dt);
    
    // Look ahead of kart
    const targetLookAt = kartPos.clone().add(new THREE.Vector3(0, cameraLookOffset.y, 0));
    const forwardDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(kartQuaternion);
    targetLookAt.add(forwardDirection.multiplyScalar(cameraLookOffset.z));
    
    camera.lookAt(targetLookAt);
}

// --- 8. MYSTERY BOXES, WEAPONS & PARTICLES SYSTEM ---

// State Variables
let currentHeldItem = null;
let rouletteTimer = 0;
let rouletteInterval = null;
let boostTimer = 0;
let spinOutTimer = 0;

const itemBoxes = [];
const activeParticles = [];
const projectiles = [];
const hazards = [];

// Geometries & Materials
const particleGeometry = new THREE.SphereGeometry(0.08, 4, 4);
const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
const fireGeometry = new THREE.SphereGeometry(0.06, 4, 4);
const fireMaterial = new THREE.MeshBasicMaterial({ color: 0xff4500 });

const bananaGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.08, 8);
const bananaMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 });

const rocketGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.8, 8);
const rocketMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2 });

const itemsList = [
    { name: 'Boost', icon: '⚡', color: '#10b981' },
    { name: 'Banana', icon: '🍌', color: '#f59e0b' },
    { name: 'Rocket', icon: '🚀', color: '#ef4444' }
];

// Particle burst helper
function createCollectParticles(position) {
    for (let i = 0; i < 12; i++) {
        const mesh = new THREE.Mesh(particleGeometry, particleMaterial);
        mesh.position.copy(position);
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.2) * 6,
            (Math.random() - 0.5) * 6
        );
        scene.add(mesh);
        activeParticles.push({
            mesh: mesh,
            velocity: velocity,
            life: 0.5
        });
    }
}

// Flame particle helper
function createBoostFireParticles(position) {
    const mesh = new THREE.Mesh(fireGeometry, fireMaterial);
    mesh.position.copy(position);
    const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5 - 2, // Spit backward
        (Math.random() - 0.5) * 1.5
    );
    scene.add(mesh);
    activeParticles.push({
        mesh: mesh,
        velocity: velocity,
        life: 0.25
    });
}

// Rocket explosion helper
function createExplosion(position) {
    for (let i = 0; i < 20; i++) {
        const mesh = new THREE.Mesh(particleGeometry, new THREE.MeshBasicMaterial({
            color: Math.random() > 0.4 ? 0xef4444 : 0xf59e0b
        }));
        mesh.position.copy(position);
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.2) * 8,
            (Math.random() - 0.5) * 8
        );
        scene.add(mesh);
        activeParticles.push({
            mesh: mesh,
            velocity: velocity,
            life: 0.6
        });
    }
}

// Interactive Item Box Class
class ItemBox {
    constructor(x, y, z) {
        this.spawnPos = new THREE.Vector3(x, y, z);
        this.active = true;
        this.cooldownTimer = 0;
        this.angle = Math.random() * Math.PI;

        this.group = new THREE.Group();
        this.group.position.copy(this.spawnPos);

        // Hologram glowing outer box
        const boxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        const boxMat = new THREE.MeshStandardMaterial({
            color: 0xeab308,
            emissive: 0xca8a04,
            roughness: 0.1,
            transparent: true,
            opacity: 0.65
        });
        this.mesh = new THREE.Mesh(boxGeo, boxMat);
        this.group.add(this.mesh);

        // Core diamond inside
        const innerGeo = new THREE.OctahedronGeometry(0.4);
        const innerMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xfacc15,
            roughness: 0.1
        });
        this.innerMesh = new THREE.Mesh(innerGeo, innerMat);
        this.group.add(this.innerMesh);

        scene.add(this.group);
    }

    update(dt) {
        if (!this.active) {
            this.cooldownTimer -= dt;
            if (this.cooldownTimer <= 0) {
                this.respawn();
            }
            return;
        }

        this.angle += dt * 2.0;
        this.group.position.y = this.spawnPos.y + Math.sin(this.angle) * 0.25;
        this.mesh.rotation.y += dt * 0.8;
        this.mesh.rotation.x += dt * 0.4;
        this.innerMesh.rotation.y -= dt * 1.5;
    }

    collect() {
        this.active = false;
        this.cooldownTimer = 5.0; // 5s respawn cooldown
        this.group.visible = false;
        createCollectParticles(this.spawnPos);
    }

    respawn() {
        this.active = true;
        this.group.visible = true;
        this.group.position.copy(this.spawnPos);
        createCollectParticles(this.spawnPos);
    }
}

// Spawn item boxes across the map
function spawnAllItemBoxes() {
    // Starting area
    itemBoxes.push(new ItemBox(0, 1.2, 15));
    // High-reward on elevated platform
    itemBoxes.push(new ItemBox(0, 3.8, -67.5));
    // Side lanes
    itemBoxes.push(new ItemBox(25, 1.2, 0));
    itemBoxes.push(new ItemBox(-25, 1.2, 0));
    // Back lanes
    itemBoxes.push(new ItemBox(50, 1.2, -50));
    itemBoxes.push(new ItemBox(-50, 1.2, -50));
}
spawnAllItemBoxes();

// Item Roulette Trigger
function triggerItemRoulette() {
    if (currentHeldItem !== null || rouletteTimer > 0) return;

    rouletteTimer = 1.0;
    let index = 0;
    
    const hud = document.getElementById('item-hud');
    const icon = document.getElementById('item-icon');
    const label = document.getElementById('item-label');
    
    if (hud) hud.style.borderColor = '#3b82f6';
    if (label) label.textContent = 'ROLLING';
    
    rouletteInterval = setInterval(() => {
        icon.textContent = itemsList[index].icon;
        index = (index + 1) % itemsList.length;
    }, 70);

    setTimeout(() => {
        clearInterval(rouletteInterval);
        currentHeldItem = itemsList[Math.floor(Math.random() * itemsList.length)];
        icon.textContent = currentHeldItem.icon;
        if (label) label.textContent = currentHeldItem.name;
        if (hud) {
            hud.style.borderColor = currentHeldItem.color;
            hud.style.transform = 'scale(1.2)';
            setTimeout(() => hud.style.transform = 'scale(1)', 150);
        }
        rouletteTimer = 0;
    }, 1000);
}

// Use Held Item
function useHeldItem() {
    if (!currentHeldItem || rouletteTimer > 0 || spinOutTimer > 0) return;

    const hud = document.getElementById('item-hud');
    const icon = document.getElementById('item-icon');
    const label = document.getElementById('item-label');

    if (currentHeldItem.name === 'Boost') {
        boostTimer = 1.5;
    } else if (currentHeldItem.name === 'Banana') {
        const offset = new THREE.Vector3(0, 0.1, -1.8);
        offset.applyQuaternion(kartGroup.quaternion);
        offset.add(kartGroup.position);
        spawnBanana(offset);
    } else if (currentHeldItem.name === 'Rocket') {
        const offset = new THREE.Vector3(0, 0.4, 1.8);
        offset.applyQuaternion(kartGroup.quaternion);
        offset.add(kartGroup.position);
        
        const rocketDir = new THREE.Vector3(0, 0, 1);
        rocketDir.applyQuaternion(kartGroup.quaternion);
        spawnRocket(offset, rocketDir);
    }

    currentHeldItem = null;
    if (icon) icon.textContent = '❓';
    if (label) label.textContent = 'READY';
    if (hud) hud.style.borderColor = '#eab308';
}

// Spawn Banana Hazard
function spawnBanana(position) {
    const mesh = new THREE.Mesh(bananaGeo, bananaMat);
    mesh.position.copy(position);
    mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = true;
    scene.add(mesh);

    const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Sphere(0.5)
    });
    body.position.copy(position);
    world.addBody(body);

    hazards.push({ mesh, body, type: 'banana', active: true });
}

// Spawn Rocket Projectile
function spawnRocket(position, direction) {
    const mesh = new THREE.Mesh(rocketGeo, rocketMat);
    mesh.position.copy(position);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    mesh.castShadow = true;
    scene.add(mesh);

    const body = new CANNON.Body({
        mass: 10,
        shape: new CANNON.Sphere(0.4)
    });
    body.position.copy(position);
    body.velocity.copy(direction.multiplyScalar(35)); // 35 m/s rocket speed
    world.addBody(body);

    projectiles.push({ mesh, body, type: 'rocket', active: true, life: 3.0 });
}

// Trigger Kart Spinout
function triggerSpinOut() {
    spinOutTimer = 1.2; // spin for 1.2 seconds
    kartBody.angularVelocity.y = 12; // yaw spin
    kartBody.velocity.scale(0.4, kartBody.velocity); // lose speed
}

// --- 9. MAIN GAME LOOP ---
const clock = new THREE.Clock();

function tick() {
    requestAnimationFrame(tick);
    
    const dt = Math.min(clock.getDelta(), 0.1); // Clamp dt to prevent physics jumps
    
    // Update physics world
    world.step(dt);
    
    // Sync Graphics with Physics Body
    kartGroup.position.copy(kartBody.position);
    kartGroup.quaternion.copy(kartBody.quaternion);
    
    // --- ARCADE VEHICLE LOGIC ---
    // 1. Get local vectors
    const forwardVec = new CANNON.Vec3(0, 0, 1);
    kartBody.quaternion.vmult(forwardVec, forwardVec);
    
    const rightVec = new CANNON.Vec3(1, 0, 0);
    kartBody.quaternion.vmult(rightVec, rightVec);
    
    // 2. Measure speeds
    currentSpeed = kartBody.velocity.dot(forwardVec);
    const lateralSpeed = kartBody.velocity.dot(rightVec);
    
    // 3. Acceleration & Braking inputs
    let currentAcceleration = acceleration;
    if (boostTimer > 0) {
        boostTimer -= dt;
        currentAcceleration = acceleration * 2.5; // High boost!
        
        // Show and animate flames across all 4 exhaust pipes
        const scaleF = 1.0 + Math.sin(clock.getElapsedTime() * 45) * 0.3;
        flames.forEach(flame => {
            flame.visible = true;
            flame.scale.set(scaleF, scaleF * 1.5, scaleF);
        });
        
        // Spawn thruster fire at exhaust pipe
        const exhaustPos = new THREE.Vector3(0, 0.25, -0.9);
        exhaustPos.applyQuaternion(kartGroup.quaternion);
        exhaustPos.add(kartGroup.position);
        createBoostFireParticles(exhaustPos);
    } else {
        flames.forEach(flame => {
            flame.visible = false;
        });
    }
    
    if (spinOutTimer > 0) {
        spinOutTimer -= dt;
    } else {
        if (keys.w) {
            if (currentSpeed < maxSpeed) {
                const force = forwardVec.scale(currentAcceleration * kartBody.mass);
                kartBody.applyForce(force);
            }
        } else if (keys.s) {
            if (currentSpeed > -maxSpeed / 2) {
                const force = forwardVec.scale(-braking * kartBody.mass);
                kartBody.applyForce(force);
            }
        }
    }
    
    // 4. Grip & Slide (Lateral Friction Damping)
    // Reduce grip during drift (Shift held) to allow cool slides, otherwise grip strongly
    const grip = keys.Shift ? 0.82 : 0.96; 
    const dragImpulse = rightVec.scale(-lateralSpeed * grip);
    kartBody.velocity.vadd(dragImpulse, kartBody.velocity);
    
    // 5. Steering calculations
    if (spinOutTimer <= 0) {
        if (keys.a) {
            steerAngle = Math.min(steerAngle + steerSpeed * dt, maxSteerAngle);
        } else if (keys.d) {
            steerAngle = Math.max(steerAngle - steerSpeed * dt, -maxSteerAngle);
        } else {
            // Return wheels to center
            steerAngle += (0 - steerAngle) * 8 * dt;
        }
    } else {
        steerAngle *= 0.9;
    }
    
    // 6. Rotate the vehicle based on speed and steering angle
    if (spinOutTimer <= 0) {
        if (Math.abs(currentSpeed) > 0.5) {
            const directionFactor = currentSpeed > 0 ? 1 : -1;
            // Make steering tighter at slower speeds, stable at high speeds
            const normalizedSteer = steerAngle * (Math.min(Math.abs(currentSpeed), 15) / 15);
            const rotImpulse = normalizedSteer * directionFactor * 2.8 * dt;
            
            const q = new CANNON.Quaternion();
            q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotImpulse);
            kartBody.quaternion = kartBody.quaternion.mult(q);
        }
    }
    
    // --- WHEEL ANIMATIONS (Visuals) ---
    // Swivel front wheels
    wheels.frontLeft.rotation.y = steerAngle;
    wheels.frontRight.rotation.y = steerAngle;
    
    // Rotate all wheels based on forward velocity
    const wheelRotationSpeed = (currentSpeed / wheelRadius) * dt;
    wheels.frontLeft.children[0].rotation.x += wheelRotationSpeed;
    wheels.frontRight.children[0].rotation.x += wheelRotationSpeed;
    wheels.rearLeft.children[0].rotation.x += wheelRotationSpeed;
    wheels.rearRight.children[0].rotation.x += wheelRotationSpeed;
    
    // Cute rabbit ear wiggle animation
    if (typeof rabbitEars !== 'undefined' && rabbitEars.length >= 2) {
        const wiggle = Math.sin(clock.getElapsedTime() * 12) * 0.08;
        rabbitEars[0].rotation.z = 0.15 + wiggle;
        rabbitEars[1].rotation.z = -0.15 - wiggle;
    }
    
    // --- UPDATE PARTICLES ---
    for (let i = activeParticles.length - 1; i >= 0; i--) {
        const p = activeParticles[i];
        p.life -= dt;
        p.velocity.y -= 9.8 * dt; // gravity
        p.mesh.position.addScaledVector(p.velocity, dt);
        if (p.life <= 0) {
            scene.remove(p.mesh);
            activeParticles.splice(i, 1);
        }
    }

    // --- UPDATE PROJECTILES ---
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        if (proj.active) {
            proj.life -= dt;
            proj.mesh.position.copy(proj.body.position);
            proj.mesh.quaternion.copy(proj.body.quaternion);

            // Rocket smoke trail
            createBoostFireParticles(proj.mesh.position);

            let exploded = false;
            if (proj.body.position.y < 0.2 || proj.life <= 0) {
                exploded = true;
            }

            // Collide with pillars
            const pillars = [
                { x: 25, z: 25, r: 2.5 },
                { x: -25, z: 25, r: 2.5 },
                { x: 25, z: -25, r: 2.5 },
                { x: -25, z: -25, r: 2.5 }
            ];
            pillars.forEach(pil => {
                const dx = proj.body.position.x - pil.x;
                const dz = proj.body.position.z - pil.z;
                if (Math.sqrt(dx * dx + dz * dz) < pil.r + 0.5) exploded = true;
            });

            if (exploded) {
                proj.active = false;
                scene.remove(proj.mesh);
                world.removeBody(proj.body);
                createExplosion(proj.body.position);
                projectiles.splice(i, 1);
            }
        }
    }

    // --- UPDATE HAZARDS & COLLISION CHECKS ---
    hazards.forEach(hazard => {
        if (hazard.active) {
            const dist = kartBody.position.distanceTo(hazard.body.position);
            if (dist < 1.4) {
                triggerSpinOut();
                hazard.active = false;
                scene.remove(hazard.mesh);
                world.removeBody(hazard.body);
                createCollectParticles(hazard.body.position);
            }
        }
    });

    // --- UPDATE ITEM BOXES & COLLECTION CHECKS ---
    itemBoxes.forEach(box => {
        box.update(dt);
        if (box.active) {
            const dist = kartBody.position.distanceTo(new CANNON.Vec3(box.spawnPos.x, box.group.position.y, box.spawnPos.z));
            if (dist < 2.0) {
                box.collect();
                triggerItemRoulette();
            }
        }
    });
    
    // --- UPDATE CAMERA ---
    updateCamera(dt);
    
    // Update Debug UI
    const debugKeys = document.getElementById('debug-keys');
    if (debugKeys) {
        debugKeys.textContent = `W: ${keys.w} | S: ${keys.s} | A: ${keys.a} | D: ${keys.d} | Shift: ${keys.Shift}`;
    }
    const debugPos = document.getElementById('debug-pos');
    if (debugPos) {
        debugPos.textContent = `${kartBody.position.x.toFixed(2)}, ${kartBody.position.y.toFixed(2)}, ${kartBody.position.z.toFixed(2)}`;
    }
    const debugVel = document.getElementById('debug-vel');
    if (debugVel) {
        debugVel.textContent = `${kartBody.velocity.x.toFixed(2)}, ${kartBody.velocity.y.toFixed(2)}, ${kartBody.velocity.z.toFixed(2)}`;
    }
    const debugSpeed = document.getElementById('debug-speed');
    if (debugSpeed) {
        debugSpeed.textContent = `${currentSpeed.toFixed(2)} m/s (${(currentSpeed * 3.6).toFixed(1)} km/h)`;
    }
    
    // Render frame
    renderer.render(scene, camera);
}

// Start loop
tick();

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
