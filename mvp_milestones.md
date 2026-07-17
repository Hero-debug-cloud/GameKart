# MVP Milestones: GameKart Module-Wise Achievements

This document serves as a milestone checklist for tracking the module-wise achievements required to build the GameKart Minimum Viable Product (MVP).

---

## Module 1: Project & Repository Base Setup
*Goal: Initialize the repository and configure the dev/build environment.*

- [x] **1.1 Bun Init**
  - Initialize the project with `bun init` or configure `package.json` for Bun runtime.
- [x] **1.2 Install Core Packages with Bun**
  - Install dev server tools (`vite`) and core libraries (`three`, `cannon-es`, `hono`) using Bun package manager.
- [x] **1.3 Directory Structure**
  - Set up folders for assets, client code, and server backend code.
- [x] **1.4 Dev Build Verification**
  - Add basic `index.html` and verify the local Vite development server runs successfully.

---

## Module 2: Physics, Kart Design & Animations (The Sandbox)
*Goal: Achieve responsive driving, dynamic kart meshes, and character animations in 3D.*

- [x] **2.1 WebGL Sandbox Canvas**
  - A responsive 3D Three.js rendering scene with active lighting, shadows, and resizing.
- [x] **2.2 Arcade Driving Physics**
  - Keyboard input mapping (`WASD` / Arrows) for forward driving, reverse, steering, and braking.
  - Basic friction, deceleration, and speed-cap formulas.
- [x] **2.3 Chase Camera System**
  - Third-person camera that follows behind the kart, smoothly interpolating position and rotation to prevent jerky movement.
- [x] **2.4 Basic Box/Sphere Collisions**
  - Rigid body physics (`cannon-es` integration) for the kart to crash into static barriers.
- [x] **2.5 Kart Model Assembly**
  - Import low-poly chassis and four wheel meshes. Configure wheel anchors in code.
- [x] **2.6 Wheel Swivel & Rotation Animations**
  - Front wheels swivel on local Y-axis when steering. All wheels rotate on local X-axis proportional to speed.
- [ ] **2.7 Mixamo Character Animation Integration**
  - Load skeletal model into kart. Map animations (driving idle, steering lean, victory podium dance) using Three.js `AnimationMixer` and blend actions based on input states.

---

## Module 3: Arena & Map Layout
*Goal: Provide a structured battleground containing obstacles and pathways.*

- [x] **3.1 Boundary & Floor Setup**
  - Defining the boundaries of the arena to ensure the kart cannot fall out of the world.
- [x] **3.2 Ramps & Platforms**
  - Implementation of sloped ramps where karts can gain airtime and land correctly with physics gravity.
- [x] **3.3 Collision Obstacles**
  - Scattered boxes, pillars, or blocks acting as covers and collision hazards.
- [x] **3.4 Spawn Nodes**
  - Pre-defined coordinate lists for safe player karts and mystery boxes to spawn/respawn.

---

## Module 4: Mystery Boxes & Weapons
*Goal: Implement the combat mechanics of collecting and firing power-ups.*

- [ ] **4.1 Floating Item Boxes**
  - Interactive boxes placed in the arena that rotate, play an animation upon collision, disappear, and respawn after 5 seconds.
- [ ] **4.2 Item Selection Logic**
  - A randomization routine that rolls a weapon/power-up upon box collection and updates the inventory state.
- [ ] **4.3 Rocket (Projectile)**
  - Spawning a projectile mesh that travels forward at high speed and explodes on collision with other karts or obstacles.
- [ ] **4.4 Landmine (Deployable)**
  - Dropping a static mine on the floor behind the kart that triggers a localized explosion when another kart drives over it.
- [ ] **4.5 Nitro (Speed Boost)**
  - Temporarily bypassing the maximum speed cap and adding visual particle trails when activated.

---

## Module 5: Health, Damage, & Respawning
*Goal: Tie combat events to player states, win/loss loops, and respawn dynamics.*

- [ ] **5.1 Player Health Pool**
  - Maintaining a health attribute (0–100 HP) on the kart model.
- [ ] **5.2 Explosion & Impact Damage**
  - Calculating damage values based on distance from weapon impacts and reducing the target's health.
- [ ] **5.3 Destruction Animation / VFX**
  - Spawning explosive particles and temporarily disabling kart driving upon reaching 0 HP.
- [ ] **5.4 Safe Respawn Cycle**
  - Teleporting the destroyed kart to the safest/nearest spawn node after 3 seconds, granting a temporary 3-second invincibility shield.

---

## Module 6: Real-Time Multiplayer Integration (Max 12 Players)
*Goal: Orchestrate real-time server connections, room matches, and position synchronization.*

- [ ] **6.1 Authoritative Bun Server**
  - Setup Hono and native Bun.serve WebSocket backend capable of instancing matches hosting up to 12 active players.
- [ ] **6.2 State Sync & Client-Side Prediction**
  - Transmit player steering/acceleration inputs to server. Server simulates physics and broadcasts positions. Client interpolates positions to prevent rubber-banding.
- [ ] **6.3 Networked Projectiles & Weapons**
  - Broadcast rocket launches, landmine placements, and explosion triggers to all 12 connected clients.

---

## Module 7: Single-Player Bot Loop & Fallback AI (12 Players Total)
*Goal: Fill matches with smart AI bots when fewer than 12 human players are online.*

- [ ] **7.1 Matchmaking Bot Filler**
  - Automatically spawn and sync AI bots when a lobby room has less than 12 players.
- [ ] **7.2 Waypoint Navigation AI**
  - Bots that steer and navigate towards the nearest floating mystery box or competitor.
- [ ] **7.3 Combat AI**
  - Bots that target close-by competitors and fire their held weapon.
- [ ] **7.4 Bot State Sync**
  - Broadcast bot positions, health, and actions across the network to all clients.

---

## Module 8: UI, HUD, & Game State
*Goal: Display HUD metrics, player lists, and create menus.*

- [ ] **8.1 In-Game HUD Overlay**
  - HTML/CSS dashboard displaying Health Bar, Shield state, Speedometer, and current weapon inventory.
- [ ] **8.2 12-Player Kill Feed & Scoreboard**
  - Floating updates indicating who eliminated whom.
  - Real-time leaderboard tracking kills/points for all 12 players/bots.
- [ ] **8.3 Main Menu Screen**
  - Start screen allowing name input, character customization, and room matchmaking trigger.
- [ ] **8.4 End-Game Podium**
  - Displaying the final leaderboard and ranking top 3 karts once the match timer runs out.
