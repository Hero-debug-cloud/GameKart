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


// --- 4. DETAILED MODERN KART DESIGN & RIGGING ---
const kartGroup = new THREE.Group();
scene.add(kartGroup);

// Kart Dimensions (for physics & visuals)
const kartWidth = 1.6;
const kartHeight = 1.1;
const kartLength = 2.6;

// Materials System
const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e1b4b, // Deep cosmic indigo
    metalness: 0.95,
    roughness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05
});
const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x0b0f19, // Carbon black matte
    metalness: 0.2,
    roughness: 0.9
});
const metalMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // Titanium metal
    metalness: 0.9,
    roughness: 0.2
});
const glassMat = new THREE.MeshStandardMaterial({
    color: 0xec4899, // Hot Pink visor glass
    transparent: true,
    opacity: 0.6,
    roughness: 0.05,
    metalness: 0.2
});
const tireMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a, // dark rubber
    roughness: 0.95
});
const stripeMat = new THREE.MeshBasicMaterial({
    color: 0xec4899 // Hot Pink glowing elements
});
const glowMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff // Neon Cyan light rings
});

// 1. Aerodynamic Capsule Chassis
const noseGeo = new THREE.ConeGeometry(0.42, 1.0, 16);
const noseMesh = new THREE.Mesh(noseGeo, bodyMat);
noseMesh.position.set(0, 0.02, 0.85);
noseMesh.rotation.x = Math.PI / 2; // point forward
noseMesh.castShadow = true;
noseMesh.receiveShadow = true;
kartGroup.add(noseMesh);

const cockpitFrameGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.5, 16);
const cockpitFrameMesh = new THREE.Mesh(cockpitFrameGeo, bodyMat);
cockpitFrameMesh.position.set(0, 0.05, -0.3);
cockpitFrameMesh.rotation.x = Math.PI / 2; // lie flat
cockpitFrameMesh.castShadow = true;
cockpitFrameMesh.receiveShadow = true;
kartGroup.add(cockpitFrameMesh);

const tailGeo = new THREE.CylinderGeometry(0.55, 0.38, 0.6, 16);
const tailMesh = new THREE.Mesh(tailGeo, bodyMat);
tailMesh.position.set(0, 0.05, -1.25);
tailMesh.rotation.x = Math.PI / 2;
tailMesh.castShadow = true;
tailMesh.receiveShadow = true;
kartGroup.add(tailMesh);

// 2. Aerodynamic Side Pods (Left & Right)
const leftPodGeo = new THREE.BoxGeometry(0.22, 0.28, 1.1);
const leftPod = new THREE.Mesh(leftPodGeo, carbonMat);
leftPod.position.set(-0.7, 0.01, -0.2);
leftPod.castShadow = true;
leftPod.receiveShadow = true;
kartGroup.add(leftPod);

const rightPod = leftPod.clone();
rightPod.position.x = 0.7;
kartGroup.add(rightPod);

// Glowing side trim strips
const leftSideTrimGeo = new THREE.BoxGeometry(0.02, 0.02, 1.6);
const leftSideTrim = new THREE.Mesh(leftSideTrimGeo, glowMat);
leftSideTrim.position.set(-0.56, 0.05, -0.15);
kartGroup.add(leftSideTrim);

const rightSideTrim = leftSideTrim.clone();
rightSideTrim.position.x = 0.56;
kartGroup.add(rightSideTrim);

// 3. Front Wing Splitter (Tron Style)
const frontWingGeo = new THREE.BoxGeometry(1.68, 0.04, 0.24);
const frontWing = new THREE.Mesh(frontWingGeo, carbonMat);
frontWing.position.set(0, -0.15, 1.35);
frontWing.castShadow = true;
kartGroup.add(frontWing);

const endplateGeo = new THREE.BoxGeometry(0.03, 0.18, 0.28);
const leftEndplate = new THREE.Mesh(endplateGeo, stripeMat);
leftEndplate.position.set(-0.84, -0.08, 1.35);
leftEndplate.castShadow = true;
kartGroup.add(leftEndplate);

const rightEndplate = leftEndplate.clone();
rightEndplate.position.x = 0.84;
kartGroup.add(rightEndplate);

// 4. Futuristic Curved Windshield
const windshieldGeo = new THREE.SphereGeometry(0.48, 16, 16, 0, Math.PI * 2, 0, 1.0);
const windshield = new THREE.Mesh(windshieldGeo, glassMat);
windshield.position.set(0, 0.24, 0.15);
windshield.rotation.x = 0.15;
windshield.castShadow = true;
kartGroup.add(windshield);

// 5. Cockpit & Steering
const dashGeo = new THREE.BoxGeometry(0.55, 0.1, 0.12);
const dash = new THREE.Mesh(dashGeo, carbonMat);
dash.position.set(0, 0.2, 0.25);
kartGroup.add(dash);

const columnGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8);
const column = new THREE.Mesh(columnGeo, metalMat);
column.position.set(0, 0.15, 0.12);
column.rotation.x = -0.55;
kartGroup.add(column);

const steeringWheelTorus = new THREE.TorusGeometry(0.15, 0.024, 6, 16);
const steeringWheel = new THREE.Mesh(steeringWheelTorus, carbonMat);
steeringWheel.position.set(0, 0.22, 0.02);
steeringWheel.rotation.x = -0.55;
kartGroup.add(steeringWheel);

// 6. Bucket Seat
const seatBaseGeo = new THREE.BoxGeometry(0.78, 0.1, 0.58);
const seatBase = new THREE.Mesh(seatBaseGeo, carbonMat);
seatBase.position.set(0, 0.05, -0.45);
seatBase.castShadow = true;
kartGroup.add(seatBase);

const seatBackGeo = new THREE.BoxGeometry(0.78, 0.62, 0.1);
const seatBack = new THREE.Mesh(seatBackGeo, carbonMat);
seatBack.position.set(0, 0.34, -0.72);
seatBack.rotation.x = -0.15;
seatBack.castShadow = true;
kartGroup.add(seatBack);

// 7. Sci-Fi Plasma Core Engine & Exhausts
const coreGeo = new THREE.SphereGeometry(0.26, 16, 16);
const coreMat = new THREE.MeshStandardMaterial({
    color: 0xd946ef,
    emissive: 0xd946ef,
    emissiveIntensity: 1.5,
    roughness: 0.1
});
const plasmaCore = new THREE.Mesh(coreGeo, coreMat);
plasmaCore.position.set(0, 0.15, -1.25);
kartGroup.add(plasmaCore);

const ringTorusGeo = new THREE.TorusGeometry(0.36, 0.025, 6, 24);
const engineRing = new THREE.Mesh(ringTorusGeo, glowMat);
engineRing.position.set(0, 0.15, -1.25);
kartGroup.add(engineRing);

const exhaustRightGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8);
const exhaustRight = new THREE.Mesh(exhaustRightGeo, metalMat);
exhaustRight.position.set(0.28, 0.18, -1.22);
exhaustRight.rotation.x = Math.PI / 3;
exhaustRight.castShadow = true;
kartGroup.add(exhaustRight);

const exhaustLeft = exhaustRight.clone();
exhaustLeft.position.x = -0.28;
kartGroup.add(exhaustLeft);

// Exhaust Flame Cones (Hidden by default, activated during Nitro boost)
const flameGeo = new THREE.ConeGeometry(0.12, 0.4, 8);
const flameMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.95 }); // Purple boost flames!

const rightFlame = new THREE.Mesh(flameGeo, flameMat);
rightFlame.position.set(0.28, 0.42, -1.5);
rightFlame.rotation.x = Math.PI / 6; // align with exhaust angle
rightFlame.visible = false;
kartGroup.add(rightFlame);

const leftFlame = rightFlame.clone();
leftFlame.position.set(-0.28, 0.42, -1.5);
kartGroup.add(leftFlame);

// 8. Tapered Stabilizer Fins (Sci-Fi Wings)
const finGeo = new THREE.BoxGeometry(0.03, 0.62, 0.36);
const leftFin = new THREE.Mesh(finGeo, carbonMat);
leftFin.position.set(-0.46, 0.36, -0.95);
leftFin.rotation.y = 0.05;
leftFin.rotation.z = 0.12; // slant outwards
leftFin.castShadow = true;
kartGroup.add(leftFin);

const rightFin = leftFin.clone();
rightFin.position.x = 0.46;
rightFin.rotation.y = -0.05;
rightFin.rotation.z = -0.12;
kartGroup.add(rightFin);

// Glowing wing edges
const leftFinEdgeGeo = new THREE.BoxGeometry(0.015, 0.62, 0.04);
const leftFinEdge = new THREE.Mesh(leftFinEdgeGeo, stripeMat);
leftFinEdge.position.set(-0.48, 0.36, -1.13);
leftFinEdge.rotation.y = 0.05;
leftFinEdge.rotation.z = 0.12;
kartGroup.add(leftFinEdge);

const rightFinEdge = leftFinEdge.clone();
rightFinEdge.position.x = 0.48;
rightFinEdge.rotation.y = -0.05;
rightFinEdge.rotation.z = -0.12;
kartGroup.add(rightFinEdge);

// 9. Modern Visor Pilot
const helmetGeo = new THREE.SphereGeometry(0.21, 16, 16);
const helmetMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.1 }); // Carbon helmet
const helmet = new THREE.Mesh(helmetGeo, helmetMat);
helmet.position.set(0, 0.78, -0.45);
helmet.castShadow = true;
kartGroup.add(helmet);

const visorGeo = new THREE.SphereGeometry(0.22, 16, 16, 0, Math.PI, 0.3, 1.2);
const visorMat = new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 0.8 }); // glowing pink visor
const visor = new THREE.Mesh(visorGeo, visorMat);
visor.position.set(0, 0.78, -0.45);
visor.rotation.y = Math.PI; // visor faces forward
visor.rotation.x = 0.05;
kartGroup.add(visor);

const pilotBodyGeo = new THREE.BoxGeometry(0.48, 0.45, 0.38);
const pilotBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.1, roughness: 0.8 }); // dark suit
const pilotBody = new THREE.Mesh(pilotBodyGeo, pilotBodyMat);
pilotBody.position.set(0, 0.48, -0.45);
pilotBody.castShadow = true;
kartGroup.add(pilotBody);

const armGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.38, 8);
const leftArm = new THREE.Mesh(armGeo, pilotBodyMat);
leftArm.position.set(-0.24, 0.36, -0.12);
leftArm.rotation.x = Math.PI / 3;
leftArm.rotation.z = 0.25;
kartGroup.add(leftArm);

const rightArm = leftArm.clone();
rightArm.position.x = 0.25;
rightArm.rotation.z = -0.25;
kartGroup.add(rightArm);

// 10. Glowing LED Headlamps
const headlampGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12);
const leftHeadlamp = new THREE.Mesh(headlampGeo, glowMat);
leftHeadlamp.position.set(-0.22, 0.03, 1.15);
leftHeadlamp.rotation.x = Math.PI / 2;
kartGroup.add(leftHeadlamp);

const rightHeadlamp = leftHeadlamp.clone();
rightHeadlamp.position.x = 0.22;
kartGroup.add(rightHeadlamp);

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

    // Black Center Core
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    tire.receiveShadow = true;
    rollGroup.add(tire);

    // Inner Glowing LED Light Ring (Tron Style)
    const glowRingGeo = new THREE.TorusGeometry(wheelRadius * 0.72, 0.04, 4, 24);
    
    const glowRingL = new THREE.Mesh(glowRingGeo, glowMat);
    glowRingL.position.x = -wheelWidth / 2 - 0.005;
    glowRingL.rotation.y = Math.PI / 2;
    rollGroup.add(glowRingL);

    const glowRingR = glowRingL.clone();
    glowRingR.position.x = wheelWidth / 2 + 0.005;
    rollGroup.add(glowRingR);

    // Outer Thin Accent Ring
    const accentRingGeo = new THREE.TorusGeometry(wheelRadius * 0.88, 0.015, 4, 24);
    const accentRingL = new THREE.Mesh(accentRingGeo, stripeMat);
    accentRingL.position.x = -wheelWidth / 2 - 0.002;
    accentRingL.rotation.y = Math.PI / 2;
    rollGroup.add(accentRingL);

    const accentRingR = accentRingL.clone();
    accentRingR.position.x = wheelWidth / 2 + 0.002;
    rollGroup.add(accentRingR);

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
        
        // Show and animate flames
        rightFlame.visible = true;
        leftFlame.visible = true;
        const scaleF = 1.0 + Math.sin(clock.getElapsedTime() * 45) * 0.3;
        rightFlame.scale.set(scaleF, scaleF * 1.5, scaleF);
        leftFlame.scale.set(scaleF, scaleF * 1.5, scaleF);
        
        // Spawn thruster fire at exhaust pipe
        const exhaustPos = new THREE.Vector3(0.4, 0.2, -1.2);
        exhaustPos.applyQuaternion(kartGroup.quaternion);
        exhaustPos.add(kartGroup.position);
        createBoostFireParticles(exhaustPos);
    } else {
        rightFlame.visible = false;
        leftFlame.visible = false;
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
    
    // Rotate engine containment ring
    if (engineRing) {
        engineRing.rotation.y += dt * 4.0;
        engineRing.rotation.z += dt * 2.0;
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
