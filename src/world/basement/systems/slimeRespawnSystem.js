import { scene } from '../../../core/SceneManager.js';
import { addCollider } from '../../../player/Player.js';
import { createSlimeIdle } from '../../../animations/slime/slimeIdle.js';
import {
  SLIME_RESPAWN_ENABLED,
  SLIME_RESPAWN_DELAY,
} from '../../../config/constants.js';

/**
 * File initially made for testing purpuses,
 * To increase difficulty, as slimes are the only hostile mobs,
 * they will respawn after a delay..
*/

function scheduleSlimeRespawn(slimeMesh, baseScale) {
  if (!SLIME_RESPAWN_ENABLED || !slimeMesh) return;

  const respawnParent = slimeMesh.parent || scene;
  const respawnPosition = slimeMesh.position.clone();
  const respawnRotation = slimeMesh.rotation.clone();
  const respawnScale = baseScale ? baseScale.clone() : slimeMesh.scale.clone();

  setTimeout(() => {
    if (slimeMesh.parent) return;

    slimeMesh.position.copy(respawnPosition);
    slimeMesh.rotation.copy(respawnRotation);
    slimeMesh.scale.copy(respawnScale);
    slimeMesh.visible = true;

    // Re-add to original parent (basementRoot or scene) to preserve transform hierarchy
    const target = respawnParent.parent ? respawnParent : scene;
    target.add(slimeMesh);
    addCollider(slimeMesh, { dynamic: true });
    createSlimeIdle(slimeMesh);
  }, SLIME_RESPAWN_DELAY * 1000);
}

function initSlimeRespawn() {
  if (!SLIME_RESPAWN_ENABLED) return;

  document.addEventListener('slime:exploded', (event) => {
    const detail = event.detail || {};
    scheduleSlimeRespawn(detail.slimeMesh, detail.baseScale);
  });
}

export { initSlimeRespawn };