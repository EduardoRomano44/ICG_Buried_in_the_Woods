import * as THREE from 'three';
import { scene } from '../../core/SceneManager.js';
import {
  registerShadowLight,
  tagShadowLight,
} from '../../core/ShadowOptimizer.js';
import { registerWalkSurface } from '../WalkSurfaceRegistry.js';
import {
  BASEMENT_AMBIENT_COLOR,
  BASEMENT_AMBIENT_INTENSITY,
  BASEMENT_FOG_COLOR,
  BASEMENT_FOG_NEAR,
  BASEMENT_FOG_FAR,
} from '../../config/constants.js';

/**
 * Configure the scene for the basement environment.
 * Replaces the overworld sky, moon, and outdoor fog with a dark, claustrophobic interior.
 *
 * @param {object} basementData — The result from loadBasementMapping()
 * @returns {{ ambientLight: THREE.AmbientLight }} references to created objects
 */
function setupBasementEnvironment(basementData) {
  // Dark ambient — the flashlight is the primary light source
  const ambientLight = new THREE.AmbientLight(BASEMENT_AMBIENT_COLOR, BASEMENT_AMBIENT_INTENSITY);
  tagShadowLight(ambientLight, true);
  registerShadowLight(ambientLight, { staticLight: true });
  scene.add(ambientLight);

  // Tight fog to hide far geometry and enhance claustrophobia
  scene.fog = new THREE.Fog(BASEMENT_FOG_COLOR, BASEMENT_FOG_NEAR, BASEMENT_FOG_FAR);

  // Register ground surfaces for walk-surface audio detection
  if (basementData.grounds && basementData.grounds.length > 0) {
    for (const ground of basementData.grounds) {
      registerWalkSurface(ground, 'basement', { priority: 10 });
    }
  }

  return { ambientLight };
}

export { setupBasementEnvironment };
