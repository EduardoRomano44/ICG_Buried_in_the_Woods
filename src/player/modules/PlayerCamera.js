import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import {
  CAMERA_NORMAL_FOV,
  CAMERA_SPRINT_FOV,
  CAMERA_FOV_LERP_SPEED,
  PLAYER_DAMAGE_SHAKE_DURATION,
  PLAYER_DAMAGE_SHAKE_INTENSITY,
} from '../../config/constants.js';
import settings from '../../config/settings.js';

let fpControls = null;
let damageShakeTimer = 0;
const previousShakeOffset = new THREE.Vector3();

// Responsible for controlling player's camera movement, including zoom on sprint and damage shake

export function initCameraControls(camera, element) {
  fpControls = new PointerLockControls(camera, element);
  syncCameraSensitivity();
  return fpControls;
}

export function syncCameraSensitivity() {
  if (fpControls) {
    fpControls.pointerSpeed = settings.cameraSensitivity || 1.0;
  }
}

// Updates FOV and Camera Shake.
export function updateCameraEffects(camera, isSprintActive, delta) {
  // FOV change on sprint
  const targetFOV = isSprintActive ? CAMERA_SPRINT_FOV : CAMERA_NORMAL_FOV;
  const fovDelta = targetFOV - camera.fov;
  if (Math.abs(fovDelta) > 0.01) {
    camera.fov += fovDelta * delta * CAMERA_FOV_LERP_SPEED;
    if (Math.abs(targetFOV - camera.fov) <= 0.01) {
      camera.fov = targetFOV;
    }
    camera.updateProjectionMatrix();
  }

  // Damage Shake
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
}

export function clearCameraShake(camera) {
  camera.position.sub(previousShakeOffset);
  previousShakeOffset.set(0, 0, 0);
}

export function triggerDamageShake() {
  damageShakeTimer = PLAYER_DAMAGE_SHAKE_DURATION;
}

export function resetCameraEffects(camera) {
  clearCameraShake(camera);
  damageShakeTimer = 0;
  camera.fov = CAMERA_NORMAL_FOV;
  camera.updateProjectionMatrix();
}

export function getControls() {
  return fpControls;
}

const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const PI_2 = Math.PI / 2;

export function rotateCamera(camera, movementX, movementY, sensitivity = 1.0) {
  euler.setFromQuaternion(camera.quaternion);

  euler.y -= movementX * 0.002 * sensitivity;
  euler.x -= movementY * 0.002 * sensitivity;

  euler.x = Math.max(-PI_2 + 0.01, Math.min(PI_2 - 0.01, euler.x));

  camera.quaternion.setFromEuler(euler);
}
