import * as THREE from 'three';
import * as CANNON from 'cannon-es';

console.log("GameKart Physics Sandbox starting...");

// --- 1. THREE.JS GRAPHICS SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0f12);
scene.fog = new THREE.FogExp2(0x0c0f12, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('game-canvas'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
// Grid floor texture for a stylized retro-futuristic arcade feel
const size = 200;
const divisions = 100;
const gridHelper = new THREE.GridHelper(size, divisions, 0x4f46e5, 0x1e293b);
gridHelper.position.y = 0.01; // slightly above plane
scene.add(gridHelper);

// Ground Plane
const groundGeo = new THREE.PlaneGeometry(size, size);
const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.8,
    metalness: 0.2
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
    color: 0x1e1b4b,
    roughness: 0.4,
    metalness: 0.6
});
const pillarMaterial = new THREE.MeshStandardMaterial({
    color: 0x4f46e5,
    roughness: 0.3,
    metalness: 0.7
});

// Helper for standard walls
function createWall(x, z, width, depth) {
    const geo = new THREE.BoxGeometry(width, wallHeight, depth);
    const mesh = new THREE.Mesh(geo, wallMaterial);
    mesh.position.set(x, wallHeight / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    walls.push(mesh);

    const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(width / 2, wallHeight / 2, depth / 2))
    });
    body.position.set(x, wallHeight / 2, z);
    world.addBody(body);
}

// Helper for sloped ramps
function createRamp(x, y, z, width, height, depth, angleRad) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geo, wallMaterial);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2))
    });
    body.position.set(x, y, z);
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), angleRad);
    mesh.quaternion.copy(body.quaternion);
    world.addBody(body);
}

// Helper for elevated platforms
function createPlatform(x, y, z, width, height, depth) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geo, wallMaterial);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2))
    });
    body.position.set(x, y, z);
    world.addBody(body);
}

// Helper for cylindrical pillars
function createPillar(x, z, radius, height) {
    const geo = new THREE.CylinderGeometry(radius, radius, height, 16);
    const mesh = new THREE.Mesh(geo, pillarMaterial);
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

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

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(50, 80, 50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 250;
const d = 100;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
scene.add(dirLight);

// --- 4. KART DESIGN & RIGGING ---
const kartGroup = new THREE.Group();
scene.add(kartGroup);

// Kart Dimensions (for physics & visuals)
const kartWidth = 1.6;
const kartHeight = 1.1;
const kartLength = 2.6;

// Visual Chassis Parts
const chassisGeo = new THREE.BoxGeometry(kartWidth, 0.4, kartLength);
const chassisMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.5, roughness: 0.3 }); // Vibrant Red
const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
chassisMesh.castShadow = true;
chassisMesh.receiveShadow = true;
kartGroup.add(chassisMesh);

// Seat
const seatGeo = new THREE.BoxGeometry(0.8, 0.5, 0.6);
const seatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
const seatMesh = new THREE.Mesh(seatGeo, seatMat);
seatMesh.position.set(0, 0.3, -0.4);
seatMesh.castShadow = true;
kartGroup.add(seatMesh);

// Pilot / Driver Placeholder
const headGeo = new THREE.SphereGeometry(0.25, 12, 12);
const headMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.1, roughness: 0.5 }); // Blue helmet
const headMesh = new THREE.Mesh(headGeo, headMat);
headMesh.position.set(0, 0.85, -0.4);
headMesh.castShadow = true;
kartGroup.add(headMesh);

const bodyGeo = new THREE.BoxGeometry(0.5, 0.5, 0.4);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.1, roughness: 0.8 }); // Yellow driver suit
const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
bodyMesh.position.set(0, 0.5, -0.4);
bodyMesh.castShadow = true;
kartGroup.add(bodyMesh);


// Exhaust Pipe
const exhaustGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.1 });
const exhaustMesh = new THREE.Mesh(exhaustGeo, exhaustMat);
exhaustMesh.rotation.x = Math.PI / 3;
exhaustMesh.position.set(0.4, 0.2, -1.2);
exhaustMesh.castShadow = true;
kartGroup.add(exhaustMesh);

// Wheels Setup
const wheelRadius = 0.45;
const wheelWidth = 0.3;
const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });

// Wheel Groups for rotation and swiveling
const wheels = {
    frontLeft: new THREE.Group(),
    frontRight: new THREE.Group(),
    rearLeft: new THREE.Group(),
    rearRight: new THREE.Group()
};

function createWheelMesh(group, x, y, z) {
    const mesh = new THREE.Mesh(wheelGeo, wheelMat);
    mesh.rotation.z = Math.PI / 2; // Orient cylinder horizontally
    mesh.castShadow = true;
    group.add(mesh);
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

// --- 8. FLOATING WEAPON BOXES (Bonus Playground Visuals)
const boxes = [];
const boxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const boxMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Yellow/Orange
    roughness: 0.1,
    metalness: 0.8,
    transparent: true,
    opacity: 0.85
});

function spawnWeaponBox(x, z) {
    const mesh = new THREE.Mesh(boxGeo, boxMat);
    mesh.position.set(x, 1, z);
    scene.add(mesh);
    boxes.push({ mesh, startY: 1, angle: Math.random() * Math.PI });
}

// Spawn some item boxes
spawnWeaponBox(0, 20);
spawnWeaponBox(-25, 0);
spawnWeaponBox(25, -20);
spawnWeaponBox(-15, 60);

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
    if (keys.w) {
        if (currentSpeed < maxSpeed) {
            const force = forwardVec.scale(acceleration * kartBody.mass);
            kartBody.applyForce(force);
        }
    } else if (keys.s) {
        if (currentSpeed > -maxSpeed / 2) {
            const force = forwardVec.scale(-braking * kartBody.mass);
            kartBody.applyForce(force);
        }
    }
    
    // 4. Grip & Slide (Lateral Friction Damping)
    // Reduce grip during drift (Shift held) to allow cool slides, otherwise grip strongly
    const grip = keys.Shift ? 0.82 : 0.96; 
    const dragImpulse = rightVec.scale(-lateralSpeed * grip);
    kartBody.velocity.vadd(dragImpulse, kartBody.velocity);
    
    // 5. Steering calculations
    if (keys.a) {
        steerAngle = Math.min(steerAngle + steerSpeed * dt, maxSteerAngle);
    } else if (keys.d) {
        steerAngle = Math.max(steerAngle - steerSpeed * dt, -maxSteerAngle);
    } else {
        // Return wheels to center
        steerAngle += (0 - steerAngle) * 8 * dt;
    }
    
    // 6. Rotate the vehicle based on speed and steering angle
    if (Math.abs(currentSpeed) > 0.5) {
        const directionFactor = currentSpeed > 0 ? 1 : -1;
        // Make steering tighter at slower speeds, stable at high speeds
        const normalizedSteer = steerAngle * (Math.min(Math.abs(currentSpeed), 15) / 15);
        const rotImpulse = normalizedSteer * directionFactor * 2.8 * dt;
        
        const q = new CANNON.Quaternion();
        q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotImpulse);
        kartBody.quaternion = kartBody.quaternion.mult(q);
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
    
    // --- ANIMATE WEAPON BOXES ---
    boxes.forEach(box => {
        box.angle += dt * 1.5;
        box.mesh.position.y = box.startY + Math.sin(box.angle) * 0.25;
        box.mesh.rotation.y += dt * 0.8;
        box.mesh.rotation.x += dt * 0.4;
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
