import * as THREE from 'three';

/**
 * System to manage candle models and their animations.
 * Lights have been removed in favor of a global ambient light.
 */

const candles = [];

/**
 * Creates a candle instance with a looping animation.
 * 
 * @param {THREE.Object3D} model - The candle model instance.
 * @param {THREE.AnimationClip[]} animations - The animation clips for the model.
 * @returns {object} The state of the candle instance.
 */
function createCandleSystem(model, animations = []) {
  if (!model) return null;

  const mixer = animations.length > 0 ? new THREE.AnimationMixer(model) : null;
  const actions = [];

  if (mixer) {
    animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.play();
      actions.push(action);
    });
  }

  const state = {
    model,
    mixer,
    actions,
    worldPosition: new THREE.Vector3(),
  };

  // Configure shadows for the candle parts (receiving shadows from flashlight/etc)
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  model.updateWorldMatrix(true, false);
  model.getWorldPosition(state.worldPosition);

  candles.push(state);

  return state;
}

/**
 * Updates all active candles animations.
 * 
 * @param {number} delta - The time delta in seconds.
 */
function updateCandleSystem(delta) {
  const safeDelta = Number.isFinite(delta) ? Math.max(0, delta) : 0;

  // Update animations
  for (const state of candles) {
    if (state.mixer) {
      state.mixer.update(safeDelta);
    }
  }
}

/**
 * Disposes all candle instances.
 */
function disposeCandleSystem() {
  for (const state of candles) {
    if (state.mixer) {
      state.mixer.stopAllAction();
      state.mixer.uncacheRoot(state.model);
    }
  }
  candles.length = 0;
}

export {
  createCandleSystem,
  updateCandleSystem,
  disposeCandleSystem,
};
