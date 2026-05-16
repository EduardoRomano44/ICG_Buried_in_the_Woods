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
  BASEMENT_SUN_COLOR,
  BASEMENT_SUN_INTENSITY,
  BASEMENT_SUN_POSITION,
  BASEMENT_FOG_COLOR,
  BASEMENT_FOG_NEAR,
  BASEMENT_FOG_FAR,
} from '../../config/constants.js';

/**
 * Configure the scene for the basement environment.
 * Replaces the overworld sky, moon, and outdoor fog with a dark, claustrophobic interior.
 *
 * @param {object} basementData — The result from loadBasementMapping()
 * @returns {{ ambientLight: THREE.AmbientLight, sunLight: THREE.DirectionalLight }} references to created objects
 */
function setupBasementEnvironment(basementData) {
  // Low ambient light
  const ambientLight = new THREE.AmbientLight(BASEMENT_AMBIENT_COLOR, BASEMENT_AMBIENT_INTENSITY);
  tagShadowLight(ambientLight, true);
  registerShadowLight(ambientLight, { staticLight: true });
  scene.add(ambientLight);

  // Overhead light from above (passes through the non-shadow-casting ceiling)
  const sunLight = new THREE.DirectionalLight(BASEMENT_SUN_COLOR, BASEMENT_SUN_INTENSITY);
  sunLight.position.set(BASEMENT_SUN_POSITION.x, BASEMENT_SUN_POSITION.y, BASEMENT_SUN_POSITION.z);
  sunLight.target.position.set(0, 0, 0);
  
  sunLight.castShadow = true;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.mapSize.set(2048, 2048);
  
  // Large enough orthographic camera to cover the basement area
  const d = 150;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 200;

  tagShadowLight(sunLight, false);
  registerShadowLight(sunLight, { staticLight: true });
  
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Tight fog to hide far geometry and enhance claustrophobia
  scene.fog = new THREE.Fog(BASEMENT_FOG_COLOR, BASEMENT_FOG_NEAR, BASEMENT_FOG_FAR);

  // Register ground surfaces for walk-surface audio detection
  if (basementData.grounds && basementData.grounds.length > 0) {
    for (const ground of basementData.grounds) {
      registerWalkSurface(ground, 'basement', { priority: 10 });
    }
  }

  return { ambientLight, sunLight };
}

export { setupBasementEnvironment };
