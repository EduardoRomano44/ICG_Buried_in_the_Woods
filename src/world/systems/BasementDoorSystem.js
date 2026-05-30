import * as THREE from 'three';
import { registerInteractable } from '../../player/Player.js';
import { getFlashlightState } from './FlashlightSystem.js';
import { showInteractionNotice } from '../../ui/Crosshair.js';

/**
 * Responsible for managins interaction with basement door.
 */

const basementDoorStates = new Set();
const BASEMENT_DOOR_ANIMATION_FALLBACK_MS = 900;

function createBasementDoorSystem(model, animations = [], options = {}) {
  if (!model) return null;

  const validClips = Array.isArray(animations) ? animations.filter(Boolean) : [];
  const mixer = validClips.length > 0 ? new THREE.AnimationMixer(model) : null;
  const openActions = mixer
    ? validClips.map((clip) => mixer.clipAction(clip))
    : [];

  const state = {
    model,
    mixer,
    openActions,
    isOpening: false,
    isOpen: false,
    blockedUntil: 0,
    enterCallback: typeof options.onEnterBasement === 'function'
      ? options.onEnterBasement
      : () => window.location.reload(),
    finishedHandler: null,
  };

  state.getActionText = () => {
    if (Date.now() < state.blockedUntil) return '';
    if (state.isOpening) return '';
    return state.isOpen ? 'ENTER' : 'OPEN';
  };

  state.isEnabled = () => !state.isOpening && Date.now() >= state.blockedUntil;

  const finishOpening = () => {
    state.isOpening = false;
    state.isOpen = true;
  };

  const onFinished = (event) => {
    if (!state.openActions.length || !event?.action) return;
    const actionIndex = state.openActions.indexOf(event.action);
    if (actionIndex < 0) return;

    state.openActions.splice(actionIndex, 1);
    if (state.openActions.length === 0) {
      finishOpening();
    }
  };

  state.finishedHandler = onFinished;

  if (state.mixer && state.openActions.length > 0) {
    state.mixer.addEventListener('finished', onFinished);
  } else {
    state.isOpen = false;
  }

  state.startOpening = () => {
    if (state.isOpening || state.isOpen) return false;

    state.isOpening = true;
    if (state.openActions.length > 0) {
      for (const action of state.openActions) {
        action.reset();
        action.enabled = true;
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
      }
    } else {
      window.setTimeout(() => {
        finishOpening();
      }, BASEMENT_DOOR_ANIMATION_FALLBACK_MS);
    }

    return true;
  };

  state.tryEnter = () => {
    if (state.isOpening) return false;

    if (!state.isOpen) {
      return state.startOpening();
    }

    const flashlightState = getFlashlightState();
    if (!flashlightState.hasFlashlight) {
      state.blockedUntil = Date.now() + 3000;
      showInteractionNotice('I can\'t see anything down there', 3000);
      return false;
    }

    state.enterCallback();
    return true;
  };

  registerInteractable(model, {
    getActionText: () => state.getActionText(),
    isEnabled: () => state.isEnabled(),
    onInteract: () => state.tryEnter(),
  });

  basementDoorStates.add(state);
  model.userData.basementDoorState = state;
  return state;
}

function updateBasementDoorSystem(delta) {
  const safeDelta = Number.isFinite(delta) ? Math.max(0, delta) : 0;
  for (const state of basementDoorStates) {
    if (state.mixer) {
      state.mixer.update(safeDelta);
    }
  }
}

function disposeBasementDoorSystem() {
  for (const state of basementDoorStates) {
    if (state.mixer && state.finishedHandler) {
      state.mixer.removeEventListener('finished', state.finishedHandler);
    }
  }

  basementDoorStates.clear();
}

export {
  createBasementDoorSystem,
  updateBasementDoorSystem,
  disposeBasementDoorSystem,
};