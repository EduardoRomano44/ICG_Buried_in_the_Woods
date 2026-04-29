import { scene } from '../core/SceneManager.js';
import { addCollider } from '../player/Player.js';
import { createSlimeIdle } from '../animations/slimeIdle.js';
import {
  DEBUG_SLIME_RESPAWN_ENABLED,
  DEBUG_SLIME_RESPAWN_DELAY,
} from '../config/constants.js';

// For testing purpuses, slime will respawwn after attacking

function scheduleSlimeRespawnDebug(slimeMesh, baseScale) {
  if (!DEBUG_SLIME_RESPAWN_ENABLED || !slimeMesh) return;

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
  }, DEBUG_SLIME_RESPAWN_DELAY * 1000);
}

function initSlimeRespawnDebug() {
  if (!DEBUG_SLIME_RESPAWN_ENABLED) return;

  document.addEventListener('slime:exploded', (event) => {
    const detail = event.detail || {};
    scheduleSlimeRespawnDebug(detail.slimeMesh, detail.baseScale);
  });
}

export { initSlimeRespawnDebug };