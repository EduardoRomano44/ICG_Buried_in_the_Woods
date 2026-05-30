import * as THREE from 'three';
import { camera } from '../../core/SceneManager.js';
import {
  SLIME_IDLE_SPEED,
  SLIME_IDLE_XZ_AMPLITUDE,
  SLIME_IDLE_Y_AMPLITUDE,
  SLIME_IDLE_TRIGGER_DISTANCE,
  SLIME_MOVE_SPEED,
  SLIME_COLLISION_RADIUS,
  SLIME_COLLISION_HEIGHT,
} from '../../config/constants.js';
import { startSlimeAttack, updateSlimeAttacks } from './slimeAttack.js';
import { setSlimeIdleAudioActive, setSlimeIdleAudioDistance } from '../../audio/GameAudio.js';
import { checkObjectCollision } from '../../player/Player.js';

/* 
  Responsible for managing slime idle animation
  Animation: Slime Scales Up Horizontaly, Down Verticaly <-> Slime Scales Down Horizontaly, Up Verticaly and Moves(Todo)
*/

const slimes = [];
const tempVec = new THREE.Vector3();

function createSlimeIdle(model) {
  slimes.push({
    mesh: model,
    baseScale: model.scale.x,
    phase: Math.random() * Math.PI * 2,
    active: true,
    isDead: false,
  });
}

function updateSlimeIdle(elapsed, delta = 0) {
  const playerPos = camera.position;
  let activeIdleSlimes = 0;
  let nearestDistSq = Infinity;

  for (const slime of slimes) {
    if (slime.isDead || !slime.active) continue;

    activeIdleSlimes += 1;

    // Squish trough plan x and z
    const dx = slime.mesh.position.x - playerPos.x;
    const dz = slime.mesh.position.z - playerPos.z;
    const distSq = dx * dx + dz * dz;
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
    }

    if (distSq < SLIME_IDLE_TRIGGER_DISTANCE * SLIME_IDLE_TRIGGER_DISTANCE) {
      slime.active = false;
      // Player is close, stop to attack
      slime.mesh.scale.set(slime.baseScale, slime.baseScale, slime.baseScale);
      startSlimeAttack(slime.mesh, () => {
        slime.isDead = true;
      });
      continue;
    }

    // Move on a sinusoid
    const theta = elapsed * SLIME_IDLE_SPEED + slime.phase;
    const wave = (Math.sin(theta) + 1) / 2;
    const isVerticalExpanding = Math.cos(theta) < 0;

    if (isVerticalExpanding && delta > 0) {
      slime.mesh.getWorldDirection(tempVec);
      const moveDistance = SLIME_MOVE_SPEED * delta;

      const prevX = slime.mesh.position.x;
      const prevZ = slime.mesh.position.z;

      // Move in opposite direction (backwards, slime model was reversed)
      slime.mesh.position.x -= tempVec.x * moveDistance;
      slime.mesh.position.z -= tempVec.z * moveDistance;

      if (checkObjectCollision(slime.mesh.position, SLIME_COLLISION_RADIUS, SLIME_COLLISION_HEIGHT, -0.1, slime.mesh)) {
        slime.mesh.position.x = prevX;
        slime.mesh.position.z = prevZ;
        slime.mesh.rotation.y += Math.PI;
      }
    }

    const scaleXZ = slime.baseScale * (1 + SLIME_IDLE_XZ_AMPLITUDE * wave);
    const scaleY = slime.baseScale * (1 - SLIME_IDLE_Y_AMPLITUDE * wave);

    slime.mesh.scale.set(scaleXZ, scaleY, scaleXZ);
  }

  setSlimeIdleAudioActive(activeIdleSlimes > 0);
  setSlimeIdleAudioDistance(Number.isFinite(nearestDistSq) ? Math.sqrt(nearestDistSq) : Infinity);
  updateSlimeAttacks(elapsed);
}

/**
  Clear the idle slime registry. Called during level transitions so that
  the new level starts with a fresh slime set.
 */
function clearSlimeIdleRegistry() {
  slimes.length = 0;
}

export { createSlimeIdle, updateSlimeIdle, clearSlimeIdleRegistry };
