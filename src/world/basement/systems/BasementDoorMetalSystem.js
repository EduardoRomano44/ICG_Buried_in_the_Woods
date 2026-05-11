import * as THREE from 'three';
import { registerInteractable } from '../../../player/Player.js';
import { getKeyState } from './KeySystem.js';
import { showInteractionNotice } from '../../../ui/Crosshair.js';

/**
 * Metal door system for the basement.
 *
 * States:
 * - Locked (no key) → "It's locked"
 * - Has key, door closed → "OPEN"
 * - Door open → "EXIT"
 *
 * Uses the GLB animation clips for the opening sequence.
 */

const DOOR_METAL_ANIMATION_FALLBACK_MS = 900;
const doorMetalStates = new Set();

function createDoorMetalSystem(model, animations = [], options = {}) {
  if (!model) return null;

  const validClips = Array.isArray(animations) ? animations.filter(Boolean) : [];
  const mixer = validClips.length > 0 ? new THREE.AnimationMixer(model) : null;
  const openActions = mixer
    ? validClips.map((clip) => mixer.clipAction(clip))
    : [];

  const state = {
    model,
    mixer,
    openActions: [...openActions],
    isOpening: false,
    isOpen: false,
    blockedUntil: 0,
    exitCallback: typeof options.onExit === 'function'
      ? options.onExit
      : () => window.location.reload(),
    finishedHandler: null,
  };

  state.getActionText = () => {
    if (Date.now() < state.blockedUntil) return '';
    if (state.isOpening) return '';

    const keyState = getKeyState();
    if (state.isOpen) return 'EXIT';
    if (!keyState.hasKey) return 'OPEN';
    return 'OPEN';
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

  if (state.mixer && openActions.length > 0) {
    state.mixer.addEventListener('finished', onFinished);
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

      window.setTimeout(() => {
        if (state.isOpening) finishOpening();
      }, DOOR_METAL_ANIMATION_FALLBACK_MS);
    } else {
      window.setTimeout(() => {
        finishOpening();
      }, DOOR_METAL_ANIMATION_FALLBACK_MS);
    }

    return true;
  };

  state.tryInteract = () => {
    if (state.isOpening) return false;

    const keyState = getKeyState();

    if (!state.isOpen) {
      // Door is closed
      if (!keyState.hasKey) {
        state.blockedUntil = Date.now() + 3000;
        showInteractionNotice("It's locked", 3000);
        return false;
      }
      // Has key → open the door
      return state.startOpening();
    }

    // Door is open → exit
    state.exitCallback();
    return true;
  };

  registerInteractable(model, {
    getActionText: () => state.getActionText(),
    isEnabled: () => state.isEnabled(),
    onInteract: () => state.tryInteract(),
  });

  doorMetalStates.add(state);
  model.userData.doorMetalState = state;
  return state;
}

function updateDoorMetalSystem(delta) {
  const safeDelta = Number.isFinite(delta) ? Math.max(0, delta) : 0;
  for (const state of doorMetalStates) {
    if (state.mixer) {
      state.mixer.update(safeDelta);
    }
  }
}

function disposeDoorMetalSystem() {
  for (const state of doorMetalStates) {
    if (state.mixer && state.finishedHandler) {
      state.mixer.removeEventListener('finished', state.finishedHandler);
    }
  }
  doorMetalStates.clear();
}

export {
  createDoorMetalSystem,
  updateDoorMetalSystem,
  disposeDoorMetalSystem,
};
