# 🏎️ GameKart - 3D Kart Battle Arena

GameKart is a high-performance, real-time multiplayer 3D kart battle arena built from scratch. It features custom arcade vehicle physics, a fully modular layout, and an optimized codebase.

## 🚀 Technology Stack
* **Frontend**: Three.js (3D Graphics Rendering) + Cannon-es (Rigid-body Physics) + Vite (Frontend Bundle & Dev Server)
* **Backend**: Bun (Fast JS Runtime) + Hono (Server Framework) + Native WebSockets (Real-time synchronization)
* **Styling**: Vanilla CSS

---

## 🎮 Driving Controls
* **`W` / `Arrow Up`**: Accelerate
* **`S` / `Arrow Down`**: Reverse / Brake
* **`A` / `D` / `Arrow Left` / `Arrow Right`**: Steer (Swivel front wheels)
* **`Shift`**: Drift (Slide and glide sideways around turns)

---

## 🛠️ Features & Sandbox Elements

### 1. Arcade Vehicle Physics
* Customized vehicle physics with automated steering swiveling and tire rolling animations.
* Stable arcade rotation constraints: the kart body is locked upright around its pitch and roll axes (`angularFactor.set(0, 1, 0)`) to ensure high-speed stability. It climbs slopes naturally using Y-axis translation.

### 2. Map Layout
* **Sloped Ramp**: Located at the center of the track. Drive up to catch airtime!
* **Landing Platform**: Elevated deck positioned at the end of the ramp for stunt landings.
* **Swerve Pillars**: Four indigo columns acting as collision hazards to weave through.
* **Corridor Walls**: Blockades forming narrow pathways.

### 3. Developer Tools
* **Live System Debug Panel**: A floating overlay displaying active keyboard inputs, real-time speed (m/s & km/h), physical position coordinates, and a global error handler catching silent browser console exceptions.

---

## 🏁 How to Run Locally

### Prerequisites
* [Bun](https://bun.sh/) (v1.x) installed on your system.

### Running the Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   bun install
   ```
3. Start the development server:
   ```bash
   bun run dev
   ```
4. Open your browser and navigate to `http://localhost:3000/`.

---

## 📂 Project Architecture
```text
GameKart/
├── frontend/             # Three.js client sandbox & physics simulation
│   ├── src/
│   │   ├── main.js       # Main physics loop, controls, graphics, and scene assembly
│   │   └── style.css     # Clean fullscreen canvas styles
│   ├── index.html        # Main HTML page with debug overlay UI
│   └── package.json
├── backend/              # Hono WebSocket synchronization server (Module 5+)
│   ├── src/
│   │   └── server.js     # WebSocket message handler & lobby manager
│   └── package.json
└── README.md             # Project documentation
```
