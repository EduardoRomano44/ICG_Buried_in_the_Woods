import { camera } from '../core/SceneManager.js';
import {
  SLIME_IDLE_SPEED,
  SLIME_IDLE_XZ_AMPLITUDE,
  SLIME_IDLE_Y_AMPLITUDE,
  SLIME_IDLE_TRIGGER_DISTANCE,
} from '../config/constants.js';
import { startSlimeAttack, updateSlimeAttacks } from './slimeAttack.js';

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

  for (const slime of slimes) {
    if (slime.isDead || !slime.active) continue;

    // Squish trough plan x and z
    const dx = slime.mesh.position.x - playerPos.x;
    const dz = slime.mesh.position.z - playerPos.z;
    const distSq = dx * dx + dz * dz;

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

  updateSlimeAttacks(elapsed);
}

export { createSlimeIdle, updateSlimeIdle };
