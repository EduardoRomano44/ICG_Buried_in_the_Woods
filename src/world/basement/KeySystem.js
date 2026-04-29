import { unregisterInteractable, registerInteractable } from '../../player/Player.js';

/**
 * Manages the basement key item state.
 * Similar to FlashlightSystem — tracks pickup, notifies UI listener.
 */

const state = {
  hasKey: false,
};

let worldKeyRef = null;
let onStateChanged = null;

/**
 * @returns {{ hasKey: boolean }}
 */
function getKeyState() {
  return { hasKey: state.hasKey };
}

function notifyStateChanged() {
  if (typeof onStateChanged !== 'function') return;
  onStateChanged(getKeyState());
}

/**
 * Register a listener that fires whenever key state changes.
 * The HUD uses this to show/hide the key icon.
 */
function setKeyStateListener(listener) {
  onStateChanged = typeof listener === 'function' ? listener : null;
  notifyStateChanged();
}

/**
 * Store a reference to the world key model so we can hide it on pickup.
 */
function registerWorldKey(model) {
  worldKeyRef = model;

  registerInteractable(model, {
    actionText: 'GRAB',
    isEnabled: () => !state.hasKey,
    onInteract: () => pickupKey(),
  });
}

/**
 * Called when the player interacts with the key.
 * Hides the model and sets hasKey = true.
 */
function pickupKey() {
  if (state.hasKey || !worldKeyRef) return false;

  state.hasKey = true;

  // Hide the world model
  unregisterInteractable(worldKeyRef);
  worldKeyRef.traverse((obj) => {
    if (obj.isMesh) obj.visible = false;
  });
  worldKeyRef.matrixAutoUpdate = false;
  worldKeyRef = null;

  notifyStateChanged();
  return true;
}

/**
 * Grant the key without world interaction (for debug / testing).
 */
function grantKey() {
  state.hasKey = true;
  notifyStateChanged();
  return getKeyState();
}

/**
 * Reset key state (used when reloading).
 */
function resetKeyState() {
  state.hasKey = false;
  worldKeyRef = null;
  notifyStateChanged();
}

export {
  getKeyState,
  setKeyStateListener,
  registerWorldKey,
  pickupKey,
  grantKey,
  resetKeyState,
};
