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
 * Register a callback that main.js will call on every frame
 * when the basement level is active. This lets the transition
 * module drive basement-specific per-frame logic.
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

/**
 * Is the player currently in the basement level?
 */
function isInBasement() {
  return basementLoaded;
}

function isBasementTransitioning() {
  return isTransitioning;
}

/**
 * Full level-transition sequence: Overworld → Basement.
 *
 * 1. Show loading screen and freeze gameplay
 * 2. Tear down all overworld objects & systems
 * 3. Load basement GLB and mapped entities
 * 4. Set up basement environment (lights, fog, walk surfaces)
 * 5. Spawn player at the designated position with flashlight
 * 6. Resume gameplay
 *
 * @param {object} options
 * @param {function} options.onComplete — called after transition finishes
 * @param {function} options.onFail — called if loading fails
 */
async function transitionToBasement(options = {}) {
  if (isTransitioning || basementLoaded) return;
  isTransitioning = true;

  try {
    // ── Phase 1: Freeze ──────────────────────────────────────────────
    setInputEnabled(false);
    setCameraRotationEnabled(false);
    hideCrosshair();
    setForestAudioActive(false);
    updateWalkSurfaceAudio(null, false);
    setStartLoading(true, 'Loading...');

    // Small delay so the loading screen renders before heavy work
    await waitFrames(2);

    // ── Phase 2: Cleanup overworld ───────────────────────────────────
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

    // ── Phase 3: Load basement ───────────────────────────────────────
    const basementData = await loadBasementMapping({
      scene,
      registerCollider: (obj, opts) => addCollider(obj, opts || {}),
    });

    // ── Phase 4: Environment ─────────────────────────────────────────
    setupBasementEnvironment(basementData);

    // ── Phase 5: Player spawn ────────────────────────────────────────
    const spawn = resolvePlayerSpawn(basementData);
    resetPlayerState();
    setPlayerPosition(spawn.x, spawn.y, spawn.z);

    // Grant flashlight (already picked up in overworld)
    const flashlightState = grantInventoryFlashlight({ isOn: true });
    setFlashlightState(flashlightState);

    // ── Phase 6: Finalise ────────────────────────────────────────────
    basementLoaded = true;
    forceShadowRefresh(true);

    setStartLoading(false);

    // Yield to the event loop to ensure any queued blur/focus/pointerlockchange 
    // events from the OS are processed before we make our final state decision.
    await new Promise(resolve => setTimeout(resolve, 50));

    setCameraRotationEnabled(true);
    showCrosshair();
    enterFirstPerson();
    setInputEnabled(true);

    if (typeof window.getAppFocusState === 'function' && window.getAppFocusState()) {
    } else {
      // User is away - pause
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

/**
 * Derive the player spawn position from the basement data.
 * Falls back to a constant if the GLB has no PlayerSpawn empty.
 */
function resolvePlayerSpawn(basementData) {
  if (basementData.playerSpawn) {
    const pos = new THREE.Vector3();
    basementData.playerSpawn.getWorldPosition(pos);

    // Ensure we keep PLAYER_HEIGHT for the Y component
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

/**
 * Wait N animation frames to let the browser render/GC.
 */
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
