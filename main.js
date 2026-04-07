import * as THREE from 'three';

// Core
import { scene, camera, renderer } from './src/core/SceneManager.js';

// World
import { updateWorld, updateGrass } from './src/world/World.js';

// Player
import {
  initInput,
  updatePlayer,
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
import { createGrass, setGrassEnabled } from './src/world/Grass.js';

// UI
import { createCrosshair, refreshCrosshair } from './src/ui/Crosshair.js';
import {
  createGameUI,
  updateHUD,
  setGameStarted,
  setPaused,
  applyBarsSizePreset,
  setStartLoading,
  isSettingsBusy,
  showGameOver,
} from './src/ui/GameUI.js';
import { animateFireflies, setFirefliesEnabled } from './src/animations/fireflies.js';
import { updateSlimeIdle } from './src/animations/slimeIdle.js';
import settings from './src/config/settings.js';
import { initSlimeRespawnDebug } from './src/debug/slimeRespawnDebug.js';
import {
  setGlobalAudioVolume,
  setTitleCardAudioActive,
  setForestAudioActive,
  unlockGameAudioPlayback,
} from './src/audio/GameAudio.js';

// Bootstrap
createCrosshair();
initInput();
initSlimeRespawnDebug();

let hasStarted = false;
let isPaused = false;
let modelsReady = false;
let isLoadingWorld = false;
let isGameOver = false;
let ignorePointerUnlockUntil = 0;
let ignoreEscapeUntil = 0;
renderer.domElement.style.display = 'none';

async function applyRuntimeSettings() {
  const shadowsChanged = renderer.shadowMap.enabled !== settings.shadowsEnabled;

  renderer.shadowMap.enabled = settings.shadowsEnabled;
  setGrassEnabled(!settings.lowQuality);
  setFirefliesEnabled(!settings.lowQuality);
  refreshCrosshair();
  applyBarsSizePreset(settings.uiBarsSize || 'medium');
  setGlobalAudioVolume(settings.audioVolume ?? 0.8);

  if (shadowsChanged && hasStarted) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    renderer.compile(scene, camera);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

async function startNewGame() {
  if (hasStarted || isLoadingWorld) return;

  if (!modelsReady) {
    isLoadingWorld = true;
    setStartLoading(true, 'Loading...');

    try {
      await loadAllModels();
      createGrass();
      modelsReady = true;
    } catch (error) {
      console.error('Falha no carregamento inicial do mundo:', error);
      setStartLoading(true, 'Loading failed');
      isLoadingWorld = false;
      return;
    }

    isLoadingWorld = false;
  }

  hasStarted = true;
  isPaused = false;
  isGameOver = false;
  setStartLoading(false);
  resetPlayerState();
  setInputEnabled(true);
  setGameStarted(true);
  setPaused(false);
  setTitleCardAudioActive(false);
  setForestAudioActive(true);
  unlockGameAudioPlayback();
  await applyRuntimeSettings();
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  renderer.domElement.style.display = 'block';
  enterFirstPerson();
}

function pauseGame() {
  if (!hasStarted || isPaused || isGameOver) return;
  isPaused = true;
  setInputEnabled(false);
  setPaused(true);
  pauseFirstPersonControls();
}

function resumeGame() {
  if (!hasStarted || !isPaused || isGameOver) return;
  isPaused = false;
  setPaused(false);
  setInputEnabled(true);
  ignorePointerUnlockUntil = performance.now() + 220;
  resumeFirstPersonControls();
  setTimeout(() => {
    if (hasStarted && !isPaused && document.pointerLockElement !== document.body) {
      resumeFirstPersonControls();
    }
  }, 60);
}

function resetGame() {
  window.location.reload();
}

async function triggerGameOver() {
  if (isGameOver) return;

  isGameOver = true;
  isPaused = true;
  setInputEnabled(false);
  pauseFirstPersonControls();
  setForestAudioActive(false);
  setPaused(false);
  await showGameOver();
}

createGameUI({
  onResume: resumeGame,
  onReset: resetGame,
  onSettingsChanged: applyRuntimeSettings,
  onBackToMenu: resetGame,
});

setGameStarted(false);
setPaused(false);
setStartLoading(false);

document.addEventListener('keydown', (event) => {
  if (event.repeat) return;

  if (!hasStarted && event.code === 'Enter') {
    event.preventDefault();
    startNewGame();
    return;
  }

  if (event.code !== 'Escape' || !hasStarted || isGameOver) return;
  if (isPaused && isSettingsBusy()) return;
  if (performance.now() < ignoreEscapeUntil) return;

  event.preventDefault();
  ignoreEscapeUntil = performance.now() + 180;
  if (isPaused) {
    resumeGame();
  } else {
    pauseGame();
  }
});

document.addEventListener('pointerlockchange', () => {
  if (!hasStarted || isPaused || isGameOver) return;
  if (performance.now() < ignorePointerUnlockUntil) return;
  if (document.pointerLockElement !== document.body) {
    pauseGame();
  }
});

document.addEventListener('click', () => {
  if (hasStarted && !isPaused && !isGameOver && document.pointerLockElement !== document.body) {
    resumeFirstPersonControls();
  }
});

window.addEventListener('blur', () => {
  if (hasStarted && !isPaused && !isGameOver) {
    pauseGame();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' && hasStarted && !isPaused && !isGameOver) {
    pauseGame();
  }
});

// Game Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  if (!hasStarted) return;

  if (!isPaused && !isGameOver) {
    updatePlayer(delta);
    if (!settings.lowQuality) {
      animateFireflies(elapsed);
      updateGrass(elapsed);
    }
    updateSlimeIdle(elapsed);
    updateWorld(camera);
  }

  const vitals = getPlayerVitals();
  updateHUD(vitals);

  if (!isGameOver && vitals.health <= 0) {
    triggerGameOver();
  }

  renderer.render(scene, camera);
}

animate();

