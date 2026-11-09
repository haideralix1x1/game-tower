# 🗼 GAME TOWER (Cyberpunk 20-in-1 Arcade Megastructure)

**Game Tower** (`com.neoarcade.gametower`) is an ultra-juicy, high-performance, 60 FPS mobile arcade & puzzle collection built in React Native and Expo SDK 58, featuring an **architecturally-shaped 3D Cyberpunk Skyscraper Hub**, full **dynamic animated cyberpunk backgrounds** (pulsing synthwave sun, sweeping laser searchlights, 3D perspective cyber grid, floating neon embers), safe-area insets, procedural synth sound synthesis, safe haptic feedback, universal screen shake and particle bursts via `JuiceEngine`.

---

## 🏗️ 3D Cyberpunk Skyscraper Hub Architecture

The main menu is designed and shaped like a **20-Floor Futuristic Skyscraper / Megastructure**:
- **▲ Apex Spire & Laser Beacon (2,400m)**: Rooftop warning beacon, lightning mast, guy-wire cables, and rotating radar signal rings.
- **Tapered Stepped Architectural Profile**:
  - **🛰️ Orbital Apex (Floors 20–16)**: Sleek aerodynamic observation decks (~78% width) with glowing neon domes.
  - **🏙️ High-Rise Sky Decks (Floors 15–11)**: Cantilevered catwalk balconies (~84% width) with neon holographic signage.
  - **⚡ Reactor Mid-Core (Floors 10–06)**: Industrial conduits and heavy structural diagonal trusses (~90% width).
  - **🛡️ Armored Citadel Base (Floors 05–01)**: Fortified blast walls with hazard chevron striping (~96% width).
  - **⚠️ Citadel Ground Zero Foundation**: Massive hydraulic shock-absorber bastions embedded into bedrock.
- **Vertical Elevator Shaft**: Real-time elevator cable node indicators showing current deck elevation.
- **Dynamic Animated Cyber Background (`TowerAnimatedBackground`)**:
  - Dual sweeping laser searchlight cones cutting through the dark sky.
  - Giant synthwave sun / holographic moon with retro horizontal scan slits and breathing glow.
  - Distant megacity skyline with flashing FAA warning antenna beacons and lit cyber windows.
  - Looping 3D perspective neon floor grid moving forward in real-time.
  - 22 floating glowing cyber embers drifting upward across the screen.
  - Holographic laser scanline sweeping down the display.

---

## 🎮 The 20 Playable Floors

| Floor | Game | Genre | Highlights |
|:---:|:---|:---:|:---|
| **FL 20** | **Space Shooter Neo** | Arcade | 60 FPS starfighter auto-lasers, plasma asteroids, cruiser waves, shield lives |
| **FL 19** | **Number Hunt 25** | Brain | High-speed Schulte table reflex challenge tapping scrambled digits 1–25 |
| **FL 18** | **Tower of Hanoi** | Puzzle | 3/4/5 quantum ring spire transfer puzzle with optimal move telemetry |
| **FL 17** | **Color Stroop** | Brain | Psychological reflex clash: identify ink color vs conflicting word text |
| **FL 16** | **Math Blitz** | Brain | Rapid-fire mental arithmetic rush with depleting turbo timer |
| **FL 15** | **Whack-A-Bot** | Arcade | 3x3 reflex bot smasher with golden drones and lethal EMP plasma bombs |
| **FL 14** | **Block Blast 8x8** | Puzzle | 1010!-style polyomino neon block placer with row/col wipe combos |
| **FL 13** | **Cyber Tic-Tac-Toe** | Strategy | Cyber AI match with min-max difficulty & local 2-Player duel |
| **FL 12** | **Neon Flappy** | Arcade | 60 FPS drone flight with pulse thrust and scrolling laser gates |
| **FL 11** | **Cyber Snake** | Arcade | 15x15 classic snake with golden power cores and neon light trails |
| **FL 10** | **Brick Breaker Neo** | Arcade | 60 FPS paddle deflection with multi-HP bricks, power-ups (`WIDE`/`LIFE`/`BONUS`), comet trail |
| **FL 09** | **Simon Pulse** | Brain | 9-pad musical synth sequence memory with escalating tempo |
| **FL 08** | **Chroma Flood** | Strategy | 8x8 neon infection grid; flood the matrix within 18 moves |
| **FL 07** | **Cyber Slide 15** | Puzzle | Classic 15-puzzle sliding blocks with move counter and win celebration |
| **FL 05** | **Memory Matrix** | Brain | 4x4 data card match with streak multipliers and peek reveal |
| **FL 04** | **Neon Mines** | Strategy | 7x7 tactical Minesweeper with cell reveals, long-press flag toggle, safe first tap |
| **FL 03** | **Wordly Neo** | Word | 5-letter cyber password decryption in 6 tries with live QWERTY telemetry |
| **FL 02** | **Cyber 2048** | Puzzle | 4x4 tile fusion with smooth gesture swipes and D-pad controls |
| **FL 01** | **Stack Block Neo** | Arcade | 3D neon slab stacking with precision laser-slicing physics & Overdrive combos |

---

## ⚡ Direct Standalone APK Build & Install

No Expo Go needed. Run directly on an Android device:

```powershell
# 1. Build standalone release APK
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
Set-Location d:\Apps\App\android
.\gradlew.bat app:assembleRelease -PreactNativeArchitectures=arm64-v8a

# 2. Install and launch on device
adb install -r "d:\Apps\App\android\app\build\outputs\apk\release\app-release.apk"
adb shell am start -S -n com.neoarcade.gametower/.MainActivity
```
