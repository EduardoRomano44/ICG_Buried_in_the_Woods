import * as THREE from 'three';
import {
  BASEMENT_PREVIEW_BACKGROUND_COLOR,
  BASEMENT_PREVIEW_FOG_FAR,
  BASEMENT_PREVIEW_FOG_NEAR,
  BASEMENT_PREVIEW_FILL_COLOR,
  BASEMENT_PREVIEW_FILL_INTENSITY,
  BASEMENT_PREVIEW_FILL_POSITION,
  BASEMENT_PREVIEW_SUN_COLOR,
  BASEMENT_PREVIEW_SUN_INTENSITY,
  BASEMENT_PREVIEW_SUN_POSITION,
  BASEMENT_PREVIEW_SUN_SHADOW_BIAS,
  BASEMENT_PREVIEW_SUN_SHADOW_NORMAL_BIAS,
  BASEMENT_PREVIEW_SUN_SHADOW_RADIUS,
} from '../../config/constants.js';

/**
 * Basement Preview for debuging, observable on basement-editor.html.
 * File made with the help of AI.
 */

function createBasementPreviewWorld(scene) {
  const sunLight = new THREE.DirectionalLight(
    BASEMENT_PREVIEW_SUN_COLOR,
    BASEMENT_PREVIEW_SUN_INTENSITY
  );
  sunLight.position.set(
    BASEMENT_PREVIEW_SUN_POSITION.x,
    BASEMENT_PREVIEW_SUN_POSITION.y,
    BASEMENT_PREVIEW_SUN_POSITION.z
  );
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 170;
  sunLight.shadow.camera.left = -60;
  sunLight.shadow.camera.right = 60;
  sunLight.shadow.camera.top = 60;
  sunLight.shadow.camera.bottom = -60;
  sunLight.shadow.bias = BASEMENT_PREVIEW_SUN_SHADOW_BIAS;
  sunLight.shadow.normalBias = BASEMENT_PREVIEW_SUN_SHADOW_NORMAL_BIAS;
  sunLight.shadow.radius = BASEMENT_PREVIEW_SUN_SHADOW_RADIUS;
  sunLight.target.position.set(0, 0, 0);
  scene.add(sunLight);
  scene.add(sunLight.target);

  const fillLight = new THREE.DirectionalLight(
    BASEMENT_PREVIEW_FILL_COLOR,
    BASEMENT_PREVIEW_FILL_INTENSITY
  );
  fillLight.position.set(
    BASEMENT_PREVIEW_FILL_POSITION.x,
    BASEMENT_PREVIEW_FILL_POSITION.y,
    BASEMENT_PREVIEW_FILL_POSITION.z
  );
  scene.add(fillLight);

  scene.background = new THREE.Color(BASEMENT_PREVIEW_BACKGROUND_COLOR);
  scene.fog = new THREE.Fog(
    BASEMENT_PREVIEW_BACKGROUND_COLOR,
    BASEMENT_PREVIEW_FOG_NEAR,
    BASEMENT_PREVIEW_FOG_FAR
  );
}

export {
  createBasementPreviewWorld,
};
