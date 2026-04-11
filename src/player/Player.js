// Controla o jogador em first-person:
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { camera, renderer, initialCameraPosition } from '../core/SceneManager.js';
import { showCrosshair, hideCrosshair, setInteractionPrompt } from '../ui/Crosshair.js';
import settings from '../config/settings.js';
import { triggerPlayerDamageFlash } from '../ui/gameUI/effects/PlayerDamageFeedback.js';
import {
  PLAYER_HEIGHT,
  PLAYER_BASE_SPEED,
  PLAYER_SPRINT_MULTIPLIER,
  PLAYER_COLLISION_RADIUS,
  PLAYER_MAX_HEALTH,
  PLAYER_MAX_STAMINA,
  PLAYER_STAMINA_DRAIN_PER_SEC,
  PLAYER_STAMINA_RECOVERY_PER_SEC,
  PLAYER_STAMINA_RECOVERY_DELAY,
  PLAYER_DAMAGE_SHAKE_DURATION,
  PLAYER_DAMAGE_SHAKE_INTENSITY,
  CAMERA_NORMAL_FOV,
  CAMERA_SPRINT_FOV,
  CAMERA_FOV_LERP_SPEED,
  INITIAL_CAMERA_ROTATION_Y,
  GRAVITY,
  HEAD_BOB_SPEED_WALK,
  HEAD_BOB_SPEED_SPRINT,
  HEAD_BOB_AMOUNT_WALK,
  HEAD_BOB_AMOUNT_SPRINT,
  INTERACT_MAX_DISTANCE,
} from '../config/constants.js';

// State
let isFPMode = false;
let isSprinting = false;
let isSprintActive = false;
let inputEnabled = true;
let velocityY = 0;
let bobTime = 0;
let health = PLAYER_MAX_HEALTH;
let stamina = PLAYER_MAX_STAMINA;
let staminaRecoveryTimer = PLAYER_STAMINA_RECOVERY_DELAY;
let damageShakeTimer = 0;

const move = { forward: false, backward: false, left: false, right: false };
const direction = new THREE.Vector3();
const playerBox = new THREE.Box3();
const previousShakeOffset = new THREE.Vector3();
const interactionRaycaster = new THREE.Raycaster();
const interactionCenter = new THREE.Vector2(0, 0);

// Controls
const fpControls = new PointerLockControls(camera, document.body);
fpControls.pointerSpeed = settings.cameraSensitivity;

// Collision list
const colliders = [];
const interactables = [];
let currentInteractable = null;

function addCollider(obj, options = {}) {
  colliders.push({
    obj,
    dynamic: Boolean(options.dynamic),
    boundsScale: Number.isFinite(options.boundsScale) ? Math.max(0.1, options.boundsScale) : 1,
    box: null,
  });
}

function removeCollider(obj) {
  const index = colliders.findIndex((collider) => collider.obj === obj);
  if (index >= 0) {
    colliders.splice(index, 1);
  }
}

function registerInteractable(obj, options = {}) {
  if (!obj) return;

  interactables.push({
    obj,
    actionText: (options.actionText || 'USE').toUpperCase(),
    onInteract: typeof options.onInteract === 'function' ? options.onInteract : null,
  });
}

function unregisterInteractable(obj) {
  const index = interactables.findIndex((interactable) => interactable.obj === obj);
  if (index >= 0) {
    interactables.splice(index, 1);
  }
  if (currentInteractable && currentInteractable.obj === obj) {
    currentInteractable = null;
    setInteractionPrompt(null);
  }
}

function findInteractableEntryForObject(object) {
  let current = object;
  while (current) {
    const found = interactables.find((entry) => entry.obj === current);
    if (found) return found;
    current = current.parent;
  }
  return null;
}

function updateInteractionTarget() {
  for (let i = interactables.length - 1; i >= 0; i--) {
    if (!interactables[i].obj || !interactables[i].obj.parent) {
      interactables.splice(i, 1);
    }
  }

  if (!interactables.length) {
    currentInteractable = null;
    setInteractionPrompt(null);
    return;
  }

  interactionRaycaster.setFromCamera(interactionCenter, camera);
  const hits = interactionRaycaster.intersectObjects(interactables.map((entry) => entry.obj), true);

  let candidate = null;
  for (const hit of hits) {
    if (hit.distance > INTERACT_MAX_DISTANCE) continue;
    candidate = findInteractableEntryForObject(hit.object);
    if (candidate) break;
  }

  currentInteractable = candidate;
  setInteractionPrompt(candidate ? candidate.actionText : null);
}

function tryInteractCurrentTarget() {
  if (!currentInteractable || typeof currentInteractable.onInteract !== 'function') return;
  currentInteractable.onInteract();
}

function damagePlayer(amount = 1) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  if (safeAmount <= 0 || health <= 0) return;

  const nextHealth = Math.max(0, health - safeAmount);
  if (nextHealth < health) {
    triggerPlayerDamageFlash();
    damageShakeTimer = PLAYER_DAMAGE_SHAKE_DURATION;
  }

  health = nextHealth;
}

function intersectsPlayerHitboxSphere(center, radius) {
  const r = PLAYER_COLLISION_RADIUS;
  const hitbox = new THREE.Box3(
    new THREE.Vector3(camera.position.x - r, 0.1, camera.position.z - r),
    new THREE.Vector3(camera.position.x + r, PLAYER_HEIGHT, camera.position.z + r)
  );

  return hitbox.distanceToPoint(center) <= radius;
}

// Input
function onKeyDown(e) {
  if (!inputEnabled) return;

  switch (e.code) {
    case 'KeyW': move.forward  = true; break;
    case 'KeyS': move.backward = true; break;
    case 'KeyA': move.left     = true; break;
    case 'KeyD': move.right    = true; break;
    case 'ShiftLeft': isSprinting = true; break;
    case 'KeyE':
      tryInteractCurrentTarget();
      break;
  }
}

function onKeyUp(e) {
  if (!inputEnabled) return;

  switch (e.code) {
    case 'KeyW': move.forward  = false; break;
    case 'KeyS': move.backward = false; break;
    case 'KeyA': move.left     = false; break;
    case 'KeyD': move.right    = false; break;
    case 'ShiftLeft': isSprinting = false; break;
  }
}

function initInput() {
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
}

// Toggle first-person / orbit
function clearMovementInput() {
  move.forward = false;
  move.backward = false;
  move.left = false;
  move.right = false;
  isSprinting = false;
  isSprintActive = false;
}

function enterFirstPerson() {
  if (isFPMode) return;

  fpControls.lock();
  camera.position.y = PLAYER_HEIGHT;
  showCrosshair();
  isFPMode = true;
}

function pauseFirstPersonControls() {
  if (!isFPMode) return;
  clearMovementInput();
  fpControls.unlock();
  hideCrosshair();
}

function resumeFirstPersonControls() {
  if (!isFPMode) return;
  fpControls.lock();
  showCrosshair();
}

function setInputEnabled(enabled) {
  inputEnabled = enabled;
  if (!enabled) clearMovementInput();
}

function resetPlayerState() {
  camera.position.sub(previousShakeOffset);
  previousShakeOffset.set(0, 0, 0);

  health = PLAYER_MAX_HEALTH;
  stamina = PLAYER_MAX_STAMINA;
  staminaRecoveryTimer = PLAYER_STAMINA_RECOVERY_DELAY;
  damageShakeTimer = 0;
  velocityY = 0;
  bobTime = 0;
  clearMovementInput();
  camera.position.copy(initialCameraPosition);
  camera.rotation.set(0, INITIAL_CAMERA_ROTATION_Y, 0);
  camera.fov = CAMERA_NORMAL_FOV;
  camera.updateProjectionMatrix();
}

function getPlayerVitals() {
  return {
    health,
    maxHealth: PLAYER_MAX_HEALTH,
    stamina,
    maxStamina: PLAYER_MAX_STAMINA,
    isSprinting: isSprintActive,
  };
}

// Update
function updatePlayer(delta) {
  if (!isFPMode) return;

  // Remove previous frame's shake offset so movement/collision uses true camera position.
  camera.position.sub(previousShakeOffset);
  previousShakeOffset.set(0, 0, 0);

  fpControls.pointerSpeed = settings.cameraSensitivity;

  // Direção
  direction.z = Number(move.forward)  - Number(move.backward);
  direction.x = Number(move.right)    - Number(move.left);
  direction.normalize();

  const isMoving = move.forward || move.backward || move.left || move.right;
  const wantsSprint = isSprinting && isMoving && stamina > 0;

  isSprintActive = wantsSprint;

  if (isSprintActive) {
    stamina = Math.max(0, stamina - PLAYER_STAMINA_DRAIN_PER_SEC * delta);
    staminaRecoveryTimer = 0;
    if (stamina <= 0) {
      isSprintActive = false;
      isSprinting = false;
    }
  } else {
    staminaRecoveryTimer += delta;
    if (staminaRecoveryTimer >= PLAYER_STAMINA_RECOVERY_DELAY) {
      stamina = Math.min(PLAYER_MAX_STAMINA, stamina + PLAYER_STAMINA_RECOVERY_PER_SEC * delta);
      staminaRecoveryTimer = PLAYER_STAMINA_RECOVERY_DELAY;
    }
  }

  const currentSpeed = PLAYER_BASE_SPEED * (isSprintActive ? PLAYER_SPRINT_MULTIPLIER : 1);

  // Movimento
  if (isMoving) {
    fpControls.moveForward(direction.z * currentSpeed * delta);
    fpControls.moveRight(direction.x * currentSpeed * delta);
  }

  // Head bob
  if (isMoving) {
    bobTime += delta * (isSprintActive ? HEAD_BOB_SPEED_SPRINT : HEAD_BOB_SPEED_WALK);
    camera.position.y = PLAYER_HEIGHT + Math.sin(bobTime) * (isSprintActive ? HEAD_BOB_AMOUNT_SPRINT : HEAD_BOB_AMOUNT_WALK);
  } else {
    bobTime = 0;
    camera.position.y = PLAYER_HEIGHT;
  }

  // Gravidade
  velocityY -= GRAVITY * delta;
  camera.position.y += velocityY * delta;
  if (camera.position.y < PLAYER_HEIGHT) {
    velocityY = 0;
    camera.position.y = PLAYER_HEIGHT;
  }

  // Colisão
  const r = PLAYER_COLLISION_RADIUS;
  playerBox.min.set(camera.position.x - r, 0.1, camera.position.z - r);
  playerBox.max.set(camera.position.x + r, PLAYER_HEIGHT, camera.position.z + r);

  for (const collider of colliders) {
    if (!collider.box || collider.dynamic) {
      collider.obj.updateWorldMatrix(true, false);
      if (!collider.box) collider.box = new THREE.Box3();
      collider.box.setFromObject(collider.obj);

      if (collider.boundsScale !== 1) {
        const center = collider.box.getCenter(new THREE.Vector3());
        const size = collider.box.getSize(new THREE.Vector3()).multiplyScalar(collider.boundsScale);
        collider.box.setFromCenterAndSize(center, size);
      }
    }

    if (playerBox.intersectsBox(collider.box)) {
      fpControls.moveForward(-direction.z * currentSpeed * delta);
      fpControls.moveRight(-direction.x * currentSpeed * delta);
    }
  }

  // FOV suave
  const targetFOV = isSprintActive ? CAMERA_SPRINT_FOV : CAMERA_NORMAL_FOV;
  camera.fov += (targetFOV - camera.fov) * delta * CAMERA_FOV_LERP_SPEED;
  camera.updateProjectionMatrix();

  if (damageShakeTimer > 0) {
    damageShakeTimer = Math.max(0, damageShakeTimer - delta);
    const strength = PLAYER_DAMAGE_SHAKE_INTENSITY;

    previousShakeOffset.set(
      (Math.random() * 2 - 1) * strength,
      (Math.random() * 2 - 1) * strength * 0.6,
      (Math.random() * 2 - 1) * strength
    );

    camera.position.add(previousShakeOffset);
  }

  updateInteractionTarget();
}

function isFirstPerson() {
  return isFPMode;
}

export {
  initInput,
  updatePlayer,
  addCollider,
  removeCollider,
  registerInteractable,
  unregisterInteractable,
  damagePlayer,
  intersectsPlayerHitboxSphere,
  isFirstPerson,
  enterFirstPerson,
  pauseFirstPersonControls,
  resumeFirstPersonControls,
  setInputEnabled,
  resetPlayerState,
  getPlayerVitals,
};
