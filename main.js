import * as THREE from 'three';
import { isMobileDevice } from './src/utils/isMobile.js';
import {
  AMBIENT_LIGHT_INTENSITY,
  BASEMENT_AMBIENT_INTENSITY,
  MOONLIGHT_INTENSITY,
  BASEMENT_SUN_INTENSITY
} from './src/config/constants.js';

// Core
import { scene, camera, renderer } from './src/core/SceneManager.js';

// World
import { updateWorld, updateGrass, ambientLight as worldAmbientLight, moonLight as worldMoonLight } from './src/world/World.js';

// Player
import {
  initInput,
  updatePlayer,
  getPlayerMovementState,
  enterFirstPerson,
  pauseFirstPersonControls,
  resumeFirstPersonControls,
  setInputEnabled,
  setToggleFlashlightHandler,
  resetPlayerState,
  getPlayerVitals,
  syncCameraSensitivity,
} from './src/player/Player.js';

// Models
import { loadAllModels } from './src/world/loaders/ModelLoader.js';

// Grass (created after models register their occupied positions)
import { createGrass, getGrassPatchPlacements, setGrassEnabled } from './src/world/loaders/generated/Grass.js';
import {
  loadSavedWorldPositions,
  createWorldPositionsPayload,
  downloadGeneratedWorldPositions,
} from './src/world/loaders/generated/PlacementPersistence.js';

// UI
import { createCrosshair, refreshCrosshair } from './src/ui/Crosshair.js';
import {
  createGameUI,
  updateHUD,
  setGameStarted,
  setPaused,
  setFlashlightState,
  setKeyState,
  applyBarsSizePreset,
  setStartLoading,
  isSettingsBusy,
  showGameOver,
  showEscapeScreen,
} from './src/ui/GameUI.js';
import { animateFireflies, setFirefliesEnabled } from './src/animations/others/fireflies.js';
import { updateSlimeIdle } from './src/animations/slime/slimeIdle.js';
import settings from './src/config/settings.js';
import { initSlimeRespawn } from './src/world/basement/systems/slimeRespawnSystem.js';
import {
  initShadowOptimizer,
  updateShadowOptimization,
  forceShadowRefresh,
} from './src/core/ShadowOptimizer.js';
import {
  setGlobalAudioVolume,
  setTitleCardAudioActive,
  setForestAudioActive,
  updateWalkSurfaceAudio,
  unlockGameAudioPlayback,
} from './src/audio/GameAudio.js';
import { updateBasementDoorSystem } from './src/world/systems/BasementDoorSystem.js';
import { detectWalkSurfaceType } from './src/world/WalkSurfaceRegistry.js';
import {
  getFlashlightState,
  setFlashlightStateListener,
  toggleInventoryFlashlight,
} from './src/world/systems/FlashlightSystem.js';

// Basement transition
import {
  transitionToBasement,
  isInBasement,
  isBasementTransitioning,
} from './src/world/basement/loaders/BasementTransition.js';
import { getBasementAmbientLight, getBasementSunLight } from './src/world/basement/BasementWorld.js';
import {
  setKeyStateListener,
  getKeyState,
} from './src/world/basement/systems/KeySystem.js';
import { updateDoorMetalSystem } from './src/world/basement/systems/BasementDoorMetalSystem.js';
import { updateCandleSystem } from './src/world/basement/systems/CandleSystem.js';

// Bootstrap
createCrosshair();
initInput();
initSlimeRespawn();
initShadowOptimizer(renderer);

let hasStarted = false;
let isPaused = false;
let modelsReady = false;
let isLoadingWorld = false;
let isGameOver = false;
let worldPreloadPromise = null;
let ignorePointerUnlockUntil = 0;
let ignoreEscapeUntil = 0;
let pendingResume = false;
renderer.domElement.style.display = 'none';
setInputEnabled(false);

// Apply settings
async function applyRuntimeSettings() {
  renderer.shadowMap.enabled = settings.shadowsEnabled;
  setGrassEnabled(!settings.lowQuality);
  setFirefliesEnabled(!settings.lowQuality);
  syncCameraSensitivity();
  refreshCrosshair();
  applyBarsSizePreset(settings.uiBarsSize || 'medium');
  setGlobalAudioVolume(settings.audioVolume ?? 0.8);

  const brightness = settings.brightness ?? 1.0;

  if (worldAmbientLight) {
    worldAmbientLight.intensity = AMBIENT_LIGHT_INTENSITY * brightness;
  }
  if (worldMoonLight) {
    worldMoonLight.intensity = MOONLIGHT_INTENSITY * brightness;
  }

  const basementLight = getBasementAmbientLight();
  if (basementLight) {
    basementLight.intensity = BASEMENT_AMBIENT_INTENSITY * brightness;
  }
  const basementSun = getBasementSunLight();
  if (basementSun) {
    basementSun.intensity = BASEMENT_SUN_INTENSITY * brightness;
  }

  if (settings.shadowsEnabled) {
    forceShadowRefresh();
  }
}

function handleEnterBasement() {
  transitionToBasement({
    onComplete: () => {
      // Basement is active
      applyRuntimeSettings(); // Apply brightness and other settings to newly created lights
      forceShadowRefresh(true);
      renderer.render(scene, camera);
    },
    onFail: (error) => {
      console.error('Basement transition failed:', error);
    },
    onExitBasement: triggerEscape,
  });
}

// Load assets before playing, for smoother experience
async function preloadWorldAssets() {
  if (modelsReady) return true;
  if (isLoadingWorld && worldPreloadPromise) return worldPreloadPromise;

  isLoadingWorld = true;
  setStartLoading(true, 'Loading...');

  worldPreloadPromise = (async () => {
    try {
      const savedPositions = await loadSavedWorldPositions();

      const loadedModels = await loadAllModels({
        treePlacements: savedPositions?.trees,
        onEnterBasement: handleEnterBasement,
      });

      createGrass({
        patchPlacements: savedPositions?.grassPatches,
      });

      if (!savedPositions) {
        const generatedPayload = createWorldPositionsPayload({
          trees: loadedModels.treePlacements,
          grassPatches: getGrassPatchPlacements(),
        });
        void downloadGeneratedWorldPositions(generatedPayload).catch((error) => {
          console.warn('Failed to save generated world positions:', error);
        });
      }

      modelsReady = true;
      return true;
    } catch (error) {
      console.error('Falha no carregamento inicial do mundo:', error);
      setStartLoading(true, 'Loading failed - Press ENTER to retry');
      return false;
    } finally {
      isLoadingWorld = false;
    }
  })();

  return worldPreloadPromise;
}

// Title screen
function beginStartFromTitle() {
  if (hasStarted || isLoadingWorld) return;

  preloadWorldAssets().then((ok) => {
    if (ok && !hasStarted) {
      startNewGame();
      return;
    }
  });
}

function startNewGame() {
  if (hasStarted || isLoadingWorld || !modelsReady) return;

  hasStarted = true;
  isPaused = false;
  isGameOver = false;

  setStartLoading(false);
  resetPlayerState();
  setGameStarted(true);
  setPaused(false);
  setTitleCardAudioActive(false);
  setForestAudioActive(true);
  unlockGameAudioPlayback();
  renderer.domElement.style.display = 'block';

  // Lock immediately in the Enter key gesture path to avoid requiring an extra click.
  enterFirstPerson();
  setInputEnabled(true);

  applyRuntimeSettings()
    .then(() => {
      forceShadowRefresh(true);
      renderer.render(scene, camera);
    })
    .catch((error) => {
      console.error('Falha ao aplicar settings iniciais:', error);
    });
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

async function triggerEscape() {
  if (isGameOver) return;

  isGameOver = true;
  isPaused = true;
  setInputEnabled(false);
  pauseFirstPersonControls();
  setForestAudioActive(false);
  setPaused(false);
  updateWalkSurfaceAudio(null, false);
  await showEscapeScreen();
}

createGameUI({
  onResume: resumeGame,
  onReset: resetGame,
  onSettingsChanged: applyRuntimeSettings,
  onBackToMenu: resetGame,
});

setFlashlightStateListener(setFlashlightState);
setFlashlightState(getFlashlightState());
setToggleFlashlightHandler(toggleInventoryFlashlight);

setKeyStateListener(setKeyState);
setKeyState(getKeyState());

setGameStarted(false);
setPaused(false);
setStartLoading(false);

document.addEventListener('keydown', (event) => {
  if (event.repeat) return;

  if (!hasStarted && event.code === 'Enter') {
    event.preventDefault();
    beginStartFromTitle();
    return;
  }

  if (event.code !== 'Escape' || !hasStarted || isGameOver) return;
  if (isPaused && isSettingsBusy()) return;
  if (performance.now() < ignoreEscapeUntil) return;

  event.preventDefault();

  if (isPaused) {
    // Wait for keyup to actually resume, ensuring a fresh user gesture for Pointer Lock
    pendingResume = true;
  } else {
    ignoreEscapeUntil = performance.now() + 180;
    pauseGame();
  }
});

document.addEventListener('keyup', (event) => {
  if (event.code === 'Escape' && pendingResume) {
    pendingResume = false;
    ignoreEscapeUntil = performance.now() + 180;
    resumeGame();
  }
});

document.addEventListener('pointerlockchange', () => {
  if (!hasStarted || isPaused || isGameOver || isBasementTransitioning()) return;
  if (performance.now() < ignorePointerUnlockUntil) return;
  if (document.pointerLockElement !== document.body) {
    pauseGame();
  }
});

document.addEventListener('click', () => {
  if (hasStarted && !isPaused && !isGameOver && document.pointerLockElement !== document.body) {
    if (!isMobileDevice()) {
      resumeFirstPersonControls();
    }
  }
});

document.addEventListener('pointerdown', (event) => {
  if (isMobileDevice()) {
    if (!hasStarted) {
      beginStartFromTitle();
    } else if (hasStarted && !isPaused && !isGameOver) {
      // In mobile, we might not use pointerLock, but we want to ensure controls are active
      resumeFirstPersonControls();
    }
  }
});

window.addEventListener('blur', () => {
  if (hasStarted && !isPaused && !isGameOver && !isBasementTransitioning()) {
    pauseGame();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' && hasStarted && !isPaused && !isGameOver && !isBasementTransitioning()) {
    pauseGame();
  }
});

// Game Loop
const timer = new THREE.Timer();
timer.connect(document);

function animate(timestamp) {
  requestAnimationFrame(animate);
  timer.update(timestamp);
  const delta = timer.getDelta();
  const elapsed = timer.getElapsed();

  if (!hasStarted) {
    updateWalkSurfaceAudio(null, false);
    return;
  }

  if (!isPaused && !isGameOver) {
    updatePlayer(delta);
    const movementState = getPlayerMovementState();
    const walkSurfaceType = detectWalkSurfaceType(camera.position);
    updateWalkSurfaceAudio(walkSurfaceType, movementState.isMoving, {
      isSprinting: movementState.isSprinting,
    });

    if (isInBasement()) {
      // Basement-specific updates
      updateSlimeIdle(elapsed, delta);
      updateDoorMetalSystem(delta);
      updateCandleSystem(delta);
    } else {
      // Overworld-specific updates
      if (!settings.lowQuality) {
        animateFireflies(elapsed);
        updateGrass(elapsed);
      }
      updateSlimeIdle(elapsed, delta);
      updateWorld(camera);
      updateBasementDoorSystem(delta);
    }
  } else {
    updateWalkSurfaceAudio(null, false);
  }

  const vitals = getPlayerVitals();
  updateHUD(vitals);

  if (!isGameOver && vitals.health <= 0) {
    triggerGameOver();
  }

  updateShadowOptimization(camera);
  renderer.render(scene, camera);
}

animate();
