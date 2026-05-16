import { camera, renderer, initialCameraPosition } from '../core/SceneManager.js';
import {
  PLAYER_HEIGHT,
  PLAYER_COLLISION_RADIUS,
  INITIAL_CAMERA_ROTATION_Y,
} from '../config/constants.js';
import { showCrosshair, hideCrosshair } from '../ui/Crosshair.js';
import { isMobileDevice } from '../utils/isMobile.js';
import settings from '../config/settings.js';

// Modules
import * as Stats from './modules/PlayerStats.js';
import * as Input from './modules/PlayerInput.js';
import * as Collision from './modules/PlayerCollision.js';
import * as Interaction from './modules/PlayerInteraction.js';
import * as Camera from './modules/PlayerCamera.js';
import * as Movement from './modules/PlayerMovement.js';

// Local State
let isFPMode = false;
let isSprintActive = false;
let toggleFlashlightHandler = null;
let cameraRotationEnabled = true;

// Shared state for external modules to query
let lastMovementState = {
  isMoving: false,
  isSprinting: false,
  horizontalDistance: 0,
};

const fpControls = Camera.initCameraControls(camera, document.body);

function setGameplayCursorHidden(hidden) {
  const cursorValue = hidden ? 'none' : 'auto';
  document.body.style.cursor = cursorValue;
  document.documentElement.style.cursor = cursorValue;
  renderer.domElement.style.cursor = cursorValue;
}
export function initInput() {
  Input.setHandlers({
    onInteract: Interaction.tryInteractCurrentTarget,
    onFlashlight: () => {
      if (typeof toggleFlashlightHandler === 'function') toggleFlashlightHandler();
    }
  });
  document.addEventListener('keydown', Input.handleKeyDown);
  document.addEventListener('keyup', Input.handleKeyUp);
}

export function enterFirstPerson() {
  if (isFPMode) {
    if (!isMobileDevice()) fpControls.lock();
    return;
  }
  if (!isMobileDevice()) fpControls.lock();
  camera.position.y = PLAYER_HEIGHT;
  showCrosshair();
  setGameplayCursorHidden(true);
  isFPMode = true;
  Camera.syncCameraSensitivity();
}

export function pauseFirstPersonControls() {
  if (!isFPMode) return;
  Input.clearInput();
  if (!isMobileDevice()) fpControls.unlock();
  hideCrosshair();
  setGameplayCursorHidden(false);
}

export function resumeFirstPersonControls() {
  if (!isFPMode) return;
  if (!isMobileDevice()) fpControls.lock();
  showCrosshair();
  setGameplayCursorHidden(true);
  Camera.syncCameraSensitivity();
}

export function setInputEnabled(enabled) {
  Input.setInputEnabled(enabled);
}

export function setToggleFlashlightHandler(handler) {
  toggleFlashlightHandler = typeof handler === 'function' ? handler : null;
}

export function setCameraRotationEnabled(enabled) {
  cameraRotationEnabled = Boolean(enabled);
  fpControls.enabled = cameraRotationEnabled;
}

export function resetPlayerState() {
  Camera.resetCameraEffects(camera);
  Stats.resetStats();
  Movement.resetMovement();
  Input.clearInput();

  camera.position.copy(initialCameraPosition);
  camera.rotation.set(0, INITIAL_CAMERA_ROTATION_Y, 0);
  Camera.syncCameraSensitivity();
}

export function updatePlayer(delta) {
  if (!isFPMode) return;

  // 1. Prepare Camera
  Camera.clearCameraShake(camera);

  // 2. Get Input
  const input = Input.getMovementInput();

  // 3. Update Stamina & Sprint Logic
  const canSprint = Stats.canSprint();
  isSprintActive = input.sprint && canSprint && (input.forward || input.backward || input.left || input.right);
  Stats.updateStamina(isSprintActive, delta);

  // 4. Update Movement & Physics
  const movementResults = Movement.updateMovement({
    camera,
    controls: fpControls,
    input: { ...input, sprint: isSprintActive },
    delta,
    checkCollisions: () => Collision.checkObjectCollision(camera.position, PLAYER_COLLISION_RADIUS, PLAYER_HEIGHT, -PLAYER_HEIGHT)
  });

  // Store results for external queries
  lastMovementState = {
    isMoving: movementResults.isMoving,
    isSprinting: isSprintActive,
    horizontalDistance: movementResults.horizontalDistance,
  };

  // 5. Update Camera Effects (FOV, Shake)
  Camera.updateCameraEffects(camera, isSprintActive, delta);

  // 6. Update Interaction Raycasting
  Interaction.updateInteractionTarget(camera);
}

export function getPlayerVitals() {
  return Stats.getPlayerVitals(isSprintActive);
}

export function getPlayerMovementState() {
  return lastMovementState;
}

export const addCollider = Collision.addCollider;
export const removeCollider = Collision.removeCollider;
export function clearAllColliders() {
  Collision.clearAllColliders();
  Interaction.clearAllInteractables();
}
export const checkObjectCollision = Collision.checkObjectCollision;
export const registerInteractable = Interaction.registerInteractable;
export const unregisterInteractable = Interaction.unregisterInteractable;
export const damagePlayer = (amount) => Stats.damagePlayer(amount, Camera.triggerDamageShake);
export const healPlayer = Stats.healPlayer;

export function intersectsPlayerHitboxSphere(center, radius) {
  return Collision.intersectsPlayerHitboxSphere(camera.position, PLAYER_HEIGHT, PLAYER_COLLISION_RADIUS, center, radius);
}

export function setPlayerPosition(x, y, z) {
  camera.position.set(
    Number.isFinite(x) ? x : 0,
    Number.isFinite(y) ? y : PLAYER_HEIGHT,
    Number.isFinite(z) ? z : 0
  );
}

export function syncCameraSensitivity() {
  Camera.syncCameraSensitivity();
}

export function rotateCamera(movementX, movementY) {
  if (isFPMode) {
    Camera.rotateCamera(camera, movementX, movementY, settings.cameraSensitivity || 1.0);
  }
}
