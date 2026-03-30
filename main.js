import * as THREE from 'three';

// Core
import { scene, camera, renderer } from './src/core/SceneManager.js';

// World
import { ground, updateWorld, updateGrass } from './src/world/World.js';

// Player
import {
  initInput,
  updatePlayer,
  addCollider,
  enterFirstPerson,
  pauseFirstPersonControls,
  resumeFirstPersonControls,
  setInputEnabled,
  resetPlayerState,
  getPlayerVitals,
} from './src/player/Player.js';

// Models
import { loadAllModels } from './src/models/ModelLoader.js';

// Grass (created after models register their occupied positions)
import { createGrass } from './src/world/Grass.js';

// UI
import { createCrosshair, refreshCrosshair } from './src/ui/Crosshair.js';
import { createGameUI, updateHUD, setGameStarted, setPaused } from './src/ui/GameUI.js';
import { animateFireflies } from './src/animations/fireflies.js';
import { updateSlimeIdle } from './src/animations/slimeIdle.js';
import settings from './src/config/settings.js';

// Bootstrap
createCrosshair();
initInput();
addCollider(ground);
loadAllModels();
createGrass();

let hasStarted = false;
let isPaused = true;

function applyRuntimeSettings() {
  renderer.shadowMap.enabled = settings.shadowsEnabled;
  refreshCrosshair();
}

function startNewGame() {
  hasStarted = true;
  isPaused = false;
  resetPlayerState();
  setInputEnabled(true);
  setGameStarted(true);
  setPaused(false);
  applyRuntimeSettings();
  enterFirstPerson();
}

function pauseGame() {
  if (!hasStarted || isPaused) return;
  isPaused = true;
  setInputEnabled(false);
  setPaused(true);
  pauseFirstPersonControls();
}

function resumeGame() {
  if (!hasStarted || !isPaused) return;
  isPaused = false;
  setPaused(false);
  setInputEnabled(true);
  resumeFirstPersonControls();
}

function resetGame() {
  window.location.reload();
}

createGameUI({
  onNewGame: startNewGame,
  onResume: resumeGame,
  onReset: resetGame,
  onSettingsChanged: applyRuntimeSettings,
});

setGameStarted(false);
setPaused(false);

document.addEventListener('keydown', (event) => {
  if (event.code !== 'Escape' || !hasStarted) return;

  event.preventDefault();
  if (isPaused) {
    resumeGame();
  } else {
    pauseGame();
  }
});

// Game Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  if (hasStarted && !isPaused) {
    updatePlayer(delta);
    animateFireflies(elapsed);
    updateSlimeIdle(elapsed);
    updateGrass(elapsed);
    updateWorld(camera);
  }

  updateHUD(getPlayerVitals());

  renderer.render(scene, camera);
}

animate();

