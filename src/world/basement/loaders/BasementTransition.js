import * as THREE from 'three';
import { scene, clearScene } from '../../../core/SceneManager.js';
import {
  setInputEnabled,
  clearAllColliders,
  setPlayerPosition,
  addCollider,
  enterFirstPerson,
  setCameraRotationEnabled,
  resetPlayerState,
} from '../../../player/Player.js';
import {
  setStartLoading,
  setFlashlightState,
} from '../../../ui/GameUI.js';
import { showCrosshair, hideCrosshair } from '../../../ui/Crosshair.js';
import { resetKeyState } from '../systems/KeySystem.js';
import {
  setForestAudioActive,
  updateWalkSurfaceAudio,
} from '../../../audio/GameAudio.js';
import { disposeGrass } from '../../loaders/generated/Grass.js';
import { disposeFireflies } from '../../../animations/others/fireflies.js';
import { clearSlimeIdleRegistry } from '../../../animations/slime/slimeIdle.js';
import { disposeBasementDoorSystem } from '../../systems/BasementDoorSystem.js';
import { disposeDoorMetalSystem } from '../systems/BasementDoorMetalSystem.js';
import { disposeCandleSystem } from '../systems/CandleSystem.js';
import { forceShadowRefresh } from '../../../core/ShadowOptimizer.js';
import { loadBasementMapping } from './BasementMappingLoader.js';
import { setupBasementEnvironment } from '../BasementWorld.js';
import {
  grantInventoryFlashlight,
} from '../../systems/FlashlightSystem.js';
import {
  PLAYER_HEIGHT,
  BASEMENT_PLAYER_SPAWN_FALLBACK,
} from '../../../config/constants.js';

let isTransitioning = false;
let basementLoaded = false;
let basementUpdateCallback = null;

/**
 * Register a callback that main.js will call on every frame when the basement level is active.
 */
function setBasementUpdateCallback(cb) {
  basementUpdateCallback = typeof cb === 'function' ? cb : null;
}

/**
 * Called from the game loop when the basement is active.
 */
function updateBasement(delta, elapsed) {
  if (typeof basementUpdateCallback === 'function') {
    basementUpdateCallback(delta, elapsed);
  }
}

function isInBasement() {
  return basementLoaded;
}

function isBasementTransitioning() {
  return isTransitioning;
}

/**
 * Full level-transition sequence: Overworld -> Basement.
 *
 * 1. Show loading screen and freeze gameplay
 * 2. Tear down all overworld objects & systems
 * 3. Load basement GLB and mapped entities
 * 4. Set up basement environment (lights, fog, walk surfaces)
 * 5. Spawn player at the designated position with flashlight
 * 6. Resume gameplay
 */
async function transitionToBasement(options = {}) {
  if (isTransitioning || basementLoaded) return;
  isTransitioning = true;

  try {
    // 1. Freeze
    setInputEnabled(false);
    setCameraRotationEnabled(false);
    hideCrosshair();
    setForestAudioActive(false);
    updateWalkSurfaceAudio(null, false);
    setStartLoading(true, 'Loading...');

    // Small delay so the loading screen renders before heavy work
    await waitFrames(2);

    // Phase 2. Cleanup overworld
    disposeGrass();
    disposeFireflies();
    clearSlimeIdleRegistry();
    disposeBasementDoorSystem();
    disposeDoorMetalSystem();
    disposeCandleSystem();
    clearAllColliders();
    clearScene();
    resetKeyState();

    // Allow GC to reclaim overworld memory
    await waitFrames(1);

    // 3. Load basement
    const basementData = await loadBasementMapping({
      scene,
      registerCollider: (obj, opts) => addCollider(obj, opts || {}),
      onExitBasement: options.onExitBasement,
    });

    // 4. Environment
    setupBasementEnvironment(basementData);

    // 5. Player spawn
    const spawn = resolvePlayerSpawn(basementData);
    resetPlayerState();
    setPlayerPosition(spawn.x, spawn.y, spawn.z);

    // Grant flashlight (already picked up in overworld)
    const flashlightState = grantInventoryFlashlight({ isOn: true });
    setFlashlightState(flashlightState);

    // 6. Finalise
    basementLoaded = true;
    forceShadowRefresh(true);

    setStartLoading(false);

    // Yield to the event loop to ensure any queued events from the OS are processed before we make our final state decision.
    await new Promise(resolve => setTimeout(resolve, 50));

    setCameraRotationEnabled(true);
    showCrosshair();
    enterFirstPerson();
    setInputEnabled(true);

    if (typeof window.getAppFocusState === 'function' && window.getAppFocusState()) {
    } else {
      // User is away: pause
      if (typeof window.pauseGameFromTransition === 'function') {
        window.pauseGameFromTransition();
      }
    }

    if (typeof options.onComplete === 'function') {
      options.onComplete();
    }
  } catch (error) {
    console.error('Basement transition failed:', error);
    setStartLoading(true, 'Loading failed. Press ENTER to retry.');

    if (typeof options.onFail === 'function') {
      options.onFail(error);
    }
  } finally {
    isTransitioning = false;
  }
}

// Derive the player spawn position from the basement data.
function resolvePlayerSpawn(basementData) {
  if (basementData.playerSpawn) {
    const pos = new THREE.Vector3();
    basementData.playerSpawn.getWorldPosition(pos);

    return {
      x: pos.x,
      y: PLAYER_HEIGHT,
      z: pos.z,
    };
  }

  return {
    x: BASEMENT_PLAYER_SPAWN_FALLBACK.x,
    y: BASEMENT_PLAYER_SPAWN_FALLBACK.y,
    z: BASEMENT_PLAYER_SPAWN_FALLBACK.z,
  };
}

// Wait N animation frames to let the browser render/GC.
function waitFrames(count = 1) {
  let remaining = Math.max(1, count);
  return new Promise((resolve) => {
    function tick() {
      remaining--;
      if (remaining <= 0) {
        resolve();
      } else {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  });
}

export {
  transitionToBasement,
  isInBasement,
  isBasementTransitioning,
  updateBasement,
  setBasementUpdateCallback,
};
