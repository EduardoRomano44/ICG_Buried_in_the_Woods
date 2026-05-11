import * as THREE from 'three';
import {
  PLAYER_HEIGHT,
  PLAYER_BASE_SPEED,
  PLAYER_SPRINT_MULTIPLIER,
  GRAVITY,
  HEAD_BOB_SPEED_WALK,
  HEAD_BOB_SPEED_SPRINT,
  HEAD_BOB_AMOUNT_WALK,
  HEAD_BOB_AMOUNT_SPRINT,
} from '../../config/constants.js';

let velocityY = 0;
let bobTime = 0;
let lastHorizontalMovementDistance = 0;
const direction = new THREE.Vector3();
const horizontalPositionBeforeMove = new THREE.Vector2();
const horizontalPositionAfterMove = new THREE.Vector2();

/**
 * Updates player movement based on input and collisions.
 * @param {object} params - { camera, controls, input, delta, checkCollisions }
 * @returns {object} - { isMoving, isSprinting, horizontalDistance }
 */
export function updateMovement({ camera, controls, input, delta, checkCollisions }) {
  // 1. Direction calculation
  direction.z = Number(input.forward) - Number(input.backward);
  direction.x = Number(input.right) - Number(input.left);
  direction.normalize();

  const isMovingInput = input.forward || input.backward || input.left || input.right;
  const currentSpeed = PLAYER_BASE_SPEED * (input.sprint ? PLAYER_SPRINT_MULTIPLIER : 1);

  horizontalPositionBeforeMove.set(camera.position.x, camera.position.z);

  // 2. Movement with Sliding/Collision Handling
  if (isMovingInput) {
    const startX = camera.position.x;
    const startZ = camera.position.z;

    // Get full potential movement
    controls.moveForward(direction.z * currentSpeed * delta);
    controls.moveRight(direction.x * currentSpeed * delta);

    const targetX = camera.position.x;
    const targetZ = camera.position.z;

    // Reset and test axes individually
    camera.position.x = startX;
    camera.position.z = startZ;

    // Try X
    camera.position.x = targetX;
    if (checkCollisions()) camera.position.x = startX;

    // Try Z
    camera.position.z = targetZ;
    if (checkCollisions()) camera.position.z = startZ;
  }

  // 3. Head Bob
  if (isMovingInput) {
    bobTime += delta * (input.sprint ? HEAD_BOB_SPEED_SPRINT : HEAD_BOB_SPEED_WALK);
    camera.position.y = PLAYER_HEIGHT + Math.sin(bobTime) * (input.sprint ? HEAD_BOB_AMOUNT_SPRINT : HEAD_BOB_AMOUNT_WALK);
  } else {
    bobTime = 0;
    camera.position.y = PLAYER_HEIGHT;
  }

  // 4. Gravity
  velocityY -= GRAVITY * delta;
  camera.position.y += velocityY * delta;
  if (camera.position.y < PLAYER_HEIGHT) {
    velocityY = 0;
    camera.position.y = PLAYER_HEIGHT;
  }

  horizontalPositionAfterMove.set(camera.position.x, camera.position.z);
  lastHorizontalMovementDistance = horizontalPositionAfterMove.distanceTo(horizontalPositionBeforeMove);

  return {
    isMoving: lastHorizontalMovementDistance > 0.001,
    horizontalDistance: lastHorizontalMovementDistance,
  };
}

/**
 * Resets movement state.
 */
export function resetMovement() {
  velocityY = 0;
  bobTime = 0;
  lastHorizontalMovementDistance = 0;
}
