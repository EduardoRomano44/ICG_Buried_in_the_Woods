// Controla o jogador em first-person:
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { camera, renderer, scene, initialCameraPosition } from '../core/SceneManager.js';
import { showCrosshair, hideCrosshair } from '../ui/Crosshair.js';
import settings from '../config/settings.js';
import {
  PLAYER_HEIGHT,
  PLAYER_BASE_SPEED,
  PLAYER_SPRINT_MULTIPLIER,
  PLAYER_COLLISION_RADIUS,
  GRAVITY,
  HEAD_BOB_SPEED_WALK,
  HEAD_BOB_SPEED_SPRINT,
  HEAD_BOB_AMOUNT_WALK,
  HEAD_BOB_AMOUNT_SPRINT,
} from '../config/constants.js';

// State
let isFPMode = false;
let isSprinting = false;
let velocityY = 0;
let bobTime = 0;

const move = { forward: false, backward: false, left: false, right: false };
const direction = new THREE.Vector3();

// Controls
const fpControls = new PointerLockControls(camera, document.body);
fpControls.pointerSpeed = settings.cameraSensitivity;

const orbitControls = new OrbitControls(camera, renderer.domElement);

// Collision list
const colliders = [];

function addCollider(obj) {
  colliders.push(obj);
}

// Input
function onKeyDown(e) {
  switch (e.code) {
    case 'KeyW': move.forward  = true; break;
    case 'KeyS': move.backward = true; break;
    case 'KeyA': move.left     = true; break;
    case 'KeyD': move.right    = true; break;
    case 'ShiftLeft': isSprinting = true; break;
    case 'KeyP': toggleFPMode(); break;
  }
}

function onKeyUp(e) {
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
function toggleFPMode() {
  if (!isFPMode) {
    orbitControls.enabled = false;
    fpControls.lock();
    camera.position.y = PLAYER_HEIGHT;
    showCrosshair();
    isFPMode = true;
  } else {
    fpControls.unlock();
    orbitControls.enabled = true;
    camera.position.copy(initialCameraPosition);
    camera.rotation.set(0, 0, 0);
    hideCrosshair();
    isFPMode = false;
  }
}

// Update
function updatePlayer(delta) {
  if (!isFPMode) return;

  // Direção
  direction.z = Number(move.forward)  - Number(move.backward);
  direction.x = Number(move.right)    - Number(move.left);
  direction.normalize();

  const currentSpeed = PLAYER_BASE_SPEED * (isSprinting ? PLAYER_SPRINT_MULTIPLIER : 1);
  const isMoving = move.forward || move.backward || move.left || move.right;

  // Movimento
  if (isMoving) {
    fpControls.moveForward(direction.z * currentSpeed * delta);
    fpControls.moveRight(direction.x * currentSpeed * delta);
  }

  // Head bob
  if (isMoving) {
    bobTime += delta * (isSprinting ? HEAD_BOB_SPEED_SPRINT : HEAD_BOB_SPEED_WALK);
    camera.position.y = PLAYER_HEIGHT + Math.sin(bobTime) * (isSprinting ? HEAD_BOB_AMOUNT_SPRINT : HEAD_BOB_AMOUNT_WALK);
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
  const playerBox = new THREE.Box3(
    new THREE.Vector3(camera.position.x - r, 0.1, camera.position.z - r),
    new THREE.Vector3(camera.position.x + r, PLAYER_HEIGHT, camera.position.z + r)
  );

  for (const obj of colliders) {
    const objBox = new THREE.Box3().setFromObject(obj);
    if (playerBox.intersectsBox(objBox)) {
      fpControls.moveForward(-direction.z * currentSpeed * delta);
      fpControls.moveRight(-direction.x * currentSpeed * delta);
    }
  }

  // FOV suave
  const targetFOV = isSprinting ? settings.sprintFOV : settings.normalFOV;
  camera.fov += (targetFOV - camera.fov) * delta * settings.fovLerpSpeed;
  camera.updateProjectionMatrix();
}

function isFirstPerson() {
  return isFPMode;
}

export { initInput, updatePlayer, addCollider, isFirstPerson, toggleFPMode };
