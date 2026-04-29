import * as THREE from 'three';
import { camera } from '../core/SceneManager.js';
import { unregisterInteractable } from '../player/Player.js';
import { playFlashlightToggleAudio } from '../audio/GameAudio.js';
import {
  FLASHLIGHT_COLOR,
  FLASHLIGHT_INTENSITY,
  FLASHLIGHT_SPOT_DISTANCE,
  FLASHLIGHT_SPOT_RADIUS,
  FLASHLIGHT_SPOT_BEAM_RADIUS,
  FLASHLIGHT_SPOT_BEAM_BLEND,
  FLASHLIGHT_INTERNAL_COLOR,
  FLASHLIGHT_INTERNAL_INTENSITY,
  FLASHLIGHT_INTERNAL_DISTANCE,
} from '../config/constants.js';

// Responsible for managing flashlight interactions

const state = {
  hasFlashlight: false,
  isOn: false,
};

const inventorySpotBaseIntensity = FLASHLIGHT_INTENSITY;
const inventoryInternalBaseIntensity = FLASHLIGHT_INTERNAL_INTENSITY * 0.72;

let worldFlashlight = null;
let inventorySpotLight = null;
let inventorySpotTarget = null;
let inventoryInternalLight = null;
let onStateChanged = null;

function setWorldFlashlightMeshVisibility(model, visible) {
  if (!model) return;

  model.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.visible = visible;
  });
}

function ensureWorldLightBaseState(light) {
  if (!light) return;

  if (!Number.isFinite(light.userData.baseIntensity)) {
    light.userData.baseIntensity = Number.isFinite(light.intensity) ? light.intensity : 0;
  }

  if (typeof light.userData.baseCastShadow !== 'boolean') {
    light.userData.baseCastShadow = light.castShadow === true;
  }
}

function restoreWorldLight(light) {
  if (!light) return;

  ensureWorldLightBaseState(light);
  light.castShadow = light.userData.baseCastShadow === true;
  light.visible = true;
  light.intensity = light.userData.baseIntensity;
}

function disableWorldLight(light) {
  if (!light) return;

  ensureWorldLightBaseState(light);
  // Picking up flashlight makes privious light invisible (removing it would buffer game)
  light.intensity = 0;
}

function getFlashlightState() {
  return {
    hasFlashlight: state.hasFlashlight,
    isOn: state.isOn,
  };
}

function notifyStateChanged() {
  if (typeof onStateChanged !== 'function') return;
  onStateChanged(getFlashlightState());
}

function setFlashlightStateListener(listener) {
  onStateChanged = typeof listener === 'function' ? listener : null;
  notifyStateChanged();
}

function registerWorldFlashlight({ model, spotLight = null, internalLight = null } = {}) {
  if (!model) return;
  worldFlashlight = {
    model,
    spotLight,
    internalLight,
  };

  setWorldFlashlightMeshVisibility(model, true);
  restoreWorldLight(spotLight);
  restoreWorldLight(internalLight);

  // Pre-create player-attached lights during load
  ensureInventoryLights();
  setInventoryLightsEnabled(false);
}

function ensureInventoryLights() {
  if (inventorySpotLight && inventoryInternalLight && inventorySpotTarget) return;

  const spotAngle = Math.max(
    FLASHLIGHT_SPOT_RADIUS,
    THREE.MathUtils.degToRad(FLASHLIGHT_SPOT_BEAM_RADIUS)
  );

  inventorySpotLight = new THREE.SpotLight(
    FLASHLIGHT_COLOR,
    0,
    FLASHLIGHT_SPOT_DISTANCE,
    spotAngle,
    FLASHLIGHT_SPOT_BEAM_BLEND,
    0.9
  );
  inventorySpotLight.castShadow = false;
  inventorySpotLight.visible = true;
  inventorySpotLight.position.set(0.25, -0.2, -0.42);

  inventorySpotTarget = new THREE.Object3D();
  inventorySpotTarget.position.set(0.12, -0.24, -11.5);
  camera.add(inventorySpotTarget);

  inventorySpotLight.target = inventorySpotTarget;
  camera.add(inventorySpotLight);

  inventoryInternalLight = new THREE.PointLight(
    FLASHLIGHT_INTERNAL_COLOR,
    0,
    FLASHLIGHT_INTERNAL_DISTANCE * 18
  );
  inventoryInternalLight.castShadow = false;
  inventoryInternalLight.visible = true;
  inventoryInternalLight.position.set(0.23, -0.14, -0.36);
  camera.add(inventoryInternalLight);
}

function setInventoryLightsEnabled(enabled) {
  const active = Boolean(enabled) && state.hasFlashlight;

  if (inventorySpotLight) {
    inventorySpotLight.intensity = active ? inventorySpotBaseIntensity : 0;
  }

  if (inventoryInternalLight) {
    inventoryInternalLight.intensity = active ? inventoryInternalBaseIntensity : 0;
  }
}

function hideWorldFlashlightImmediately() {
  if (!worldFlashlight?.model) return;

  const { model, spotLight, internalLight } = worldFlashlight;
  unregisterInteractable(model);

  setWorldFlashlightMeshVisibility(model, false);
  model.matrixAutoUpdate = false;

  disableWorldLight(spotLight);
  disableWorldLight(internalLight);
}

function pickupFlashlightFromWorld() {
  if (state.hasFlashlight || !worldFlashlight?.model) return false;

  state.hasFlashlight = true;
  state.isOn = false;

  hideWorldFlashlightImmediately();
  worldFlashlight = null;
  ensureInventoryLights();
  setInventoryLightsEnabled(false);
  notifyStateChanged();

  return true;
}

function toggleInventoryFlashlight() {
  if (!state.hasFlashlight) return false;

  ensureInventoryLights();
  state.isOn = !state.isOn;
  setInventoryLightsEnabled(state.isOn);
  playFlashlightToggleAudio();
  notifyStateChanged();

  return true;
}

function grantInventoryFlashlight(options = {}) {
  const {
    isOn = false,
  } = options;

  ensureInventoryLights();
  state.hasFlashlight = true;
  state.isOn = Boolean(isOn);
  setInventoryLightsEnabled(state.isOn);
  notifyStateChanged();

  return getFlashlightState();
}

export {
  registerWorldFlashlight,
  pickupFlashlightFromWorld,
  toggleInventoryFlashlight,
  grantInventoryFlashlight,
  setFlashlightStateListener,
  getFlashlightState,
};
