import * as THREE from 'three';
import { scene } from '../core/SceneManager.js';
import { addCollider } from '../player/Player.js';
import { registerShadowLight, tagShadowLight, tagShadowObject } from '../core/ShadowOptimizer.js';
import { updateGrass } from './Grass.js';
import {
  GROUND_SIZE, GROUND_COLOR,
  SKY_RADIUS, SKY_TOP_COLOR, SKY_BOTTOM_COLOR,
  MOON_RADIUS, MOON_COLOR, MOON_OFFSET, MOONLIGHT_COLOR, MOONLIGHT_INTENSITY,
  MOONLIGHT_WORLD_DISTANCE,
  MOONLIGHT_SHADOW_MAP_SIZE,
  MOONLIGHT_SHADOW_CAMERA_MARGIN,
  MOONLIGHT_SHADOW_BIAS,
  FOG_COLOR, FOG_NEAR, FOG_FAR,
  WORLD_BARRIER_INSET,
  WORLD_BARRIER_HEIGHT,
  WORLD_BARRIER_THICKNESS,
  WORLD_EXTENDED_GROUND_SCALE,
  WORLD_EXTENDED_GROUND_Y_OFFSET,
  AMBIENT_LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY,
} from '../config/constants.js';

// Ground
const planeGeometry = new THREE.PlaneGeometry(
  GROUND_SIZE * WORLD_EXTENDED_GROUND_SCALE,
  GROUND_SIZE * WORLD_EXTENDED_GROUND_SCALE
);
const planeMaterial = new THREE.MeshLambertMaterial({ color: GROUND_COLOR });
planeMaterial.side = THREE.DoubleSide;
const ground = new THREE.Mesh(planeGeometry, planeMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
tagShadowObject(ground, true);
scene.add(ground);

const playableHalf = Math.max(8, (GROUND_SIZE * 0.5) - WORLD_BARRIER_INSET);
const barrierY = WORLD_BARRIER_HEIGHT * 0.5;
const barrierMaterial = new THREE.MeshBasicMaterial({
  colorWrite: false,
  depthWrite: false,
});

function createBarrier(width, depth, x, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, WORLD_BARRIER_HEIGHT, depth), barrierMaterial);
  mesh.position.set(x, barrierY, z);
  tagShadowObject(mesh, true);
  scene.add(mesh);
  addCollider(mesh);
  return mesh;
}

createBarrier(playableHalf * 2 + WORLD_BARRIER_THICKNESS * 2, WORLD_BARRIER_THICKNESS, 0, playableHalf);
createBarrier(playableHalf * 2 + WORLD_BARRIER_THICKNESS * 2, WORLD_BARRIER_THICKNESS, 0, -playableHalf);
createBarrier(WORLD_BARRIER_THICKNESS, playableHalf * 2 + WORLD_BARRIER_THICKNESS * 2, playableHalf, 0);
createBarrier(WORLD_BARRIER_THICKNESS, playableHalf * 2 + WORLD_BARRIER_THICKNESS * 2, -playableHalf, 0);

// Sky
const skyGeo = new THREE.SphereGeometry(SKY_RADIUS, 64, 64);
const skyMat = new THREE.ShaderMaterial({ // Gradient Material
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    topColor:    { value: new THREE.Color(SKY_TOP_COLOR) },
    bottomColor: { value: new THREE.Color(SKY_BOTTOM_COLOR) },
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vWorldPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition).y;
      float mixFactor = smoothstep(-0.2, 1.0, h);
      gl_FragColor = vec4(mix(bottomColor, topColor, mixFactor), 1.0);
    }
  `,
});
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

// Moon
const moonGeo = new THREE.SphereGeometry(MOON_RADIUS, 32, 32);
const moonMat = new THREE.MeshBasicMaterial({ color: MOON_COLOR });
const moon = new THREE.Mesh(moonGeo, moonMat);
scene.add(moon);

const moonOffset = new THREE.Vector3(MOON_OFFSET.x, MOON_OFFSET.y, MOON_OFFSET.z);
const moonDirection = moonOffset.clone().normalize();
// Moonlight
const moonLight = new THREE.DirectionalLight(MOONLIGHT_COLOR, MOONLIGHT_INTENSITY);
moonLight.castShadow = true;

const moonShadowExtent = (GROUND_SIZE * WORLD_EXTENDED_GROUND_SCALE * 0.5) + MOONLIGHT_SHADOW_CAMERA_MARGIN;
moonLight.position.copy(moonDirection.multiplyScalar(MOONLIGHT_WORLD_DISTANCE));
moonLight.target.position.set(0, 0, 0);

moonLight.shadow.mapSize.width = MOONLIGHT_SHADOW_MAP_SIZE;
moonLight.shadow.mapSize.height = MOONLIGHT_SHADOW_MAP_SIZE;
moonLight.shadow.bias = MOONLIGHT_SHADOW_BIAS;
moonLight.shadow.camera.left = -moonShadowExtent;
moonLight.shadow.camera.right = moonShadowExtent;
moonLight.shadow.camera.top = moonShadowExtent;
moonLight.shadow.camera.bottom = -moonShadowExtent;
moonLight.shadow.camera.near = 1;
moonLight.shadow.camera.far = MOONLIGHT_WORLD_DISTANCE * 2;
moonLight.shadow.camera.updateProjectionMatrix();

tagShadowLight(moonLight, true);
registerShadowLight(moonLight, { staticLight: true });
scene.add(moonLight);
scene.add(moonLight.target);
moonLight.updateMatrixWorld(true);
moonLight.target.updateMatrixWorld(true);

// Fog
scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);

// Ambient Light
const ambientLight = new THREE.AmbientLight(AMBIENT_LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY);
tagShadowLight(ambientLight, true);
registerShadowLight(ambientLight, { staticLight: true });
scene.add(ambientLight);

// Sky follows camera
function updateWorld(camera) {
  sky.position.copy(camera.position);

  moon.position.copy(camera.position).add(moonOffset);
}

export { ground, updateWorld, updateGrass };
