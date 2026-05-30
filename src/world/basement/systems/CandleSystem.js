import * as THREE from 'three';

/**
 * System to manage candle models and their animations.
 * Due to performance issues, lights were not implemented, in favor of a global ambient light.
 */

const candles = [];

// Creates a candle instance with a looping animation.
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

  // Configure shadows for the candle parts
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

function updateCandleSystem(delta) {
  const safeDelta = Number.isFinite(delta) ? Math.max(0, delta) : 0;

  // Update animations
  for (const state of candles) {
    if (state.mixer) {
      state.mixer.update(safeDelta);
    }
  }
}

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
