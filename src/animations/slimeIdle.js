import { camera } from '../core/SceneManager.js';
import {
  SLIME_IDLE_SPEED,
  SLIME_IDLE_XZ_AMPLITUDE,
  SLIME_IDLE_Y_AMPLITUDE,
  SLIME_IDLE_TRIGGER_DISTANCE,
} from '../config/constants.js';
import { startSlimeAttack, updateSlimeAttacks } from './slimeAttack.js';
import { setSlimeIdleAudioActive, setSlimeIdleAudioDistance } from '../audio/GameAudio.js';

/* 
  Responsible for managing slime idle animation
  Animation: Slime Scales Up Horizontaly, Down Verticaly <-> Slime Scales Down Horizontaly, Up Verticaly and Moves(Todo)
*/

const slimes = [];

function createSlimeIdle(model) {
  slimes.push({
    mesh: model,
    baseScale: model.scale.x,
    phase: Math.random() * Math.PI * 2,
    active: true,
    isDead: false,
  });
}

function updateSlimeIdle(elapsed) {
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
    const wave = (Math.sin(elapsed * SLIME_IDLE_SPEED + slime.phase) + 1) / 2;

    const scaleXZ = slime.baseScale * (1 + SLIME_IDLE_XZ_AMPLITUDE * wave);
    const scaleY  = slime.baseScale * (1 - SLIME_IDLE_Y_AMPLITUDE  * wave);

    slime.mesh.scale.set(scaleXZ, scaleY, scaleXZ);
  }

  setSlimeIdleAudioActive(activeIdleSlimes > 0);
  setSlimeIdleAudioDistance(Number.isFinite(nearestDistSq) ? Math.sqrt(nearestDistSq) : Infinity);
  updateSlimeAttacks(elapsed);
}

/**
 * Clear the idle slime registry. Called during level transitions so that
 * the new level starts with a fresh slime set.
 */
function clearSlimeIdleRegistry() {
  slimes.length = 0;
}

export { createSlimeIdle, updateSlimeIdle, clearSlimeIdleRegistry };