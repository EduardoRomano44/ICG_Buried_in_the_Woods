import * as THREE from 'three';
import { scene } from '../core/SceneManager.js';
import { addCollider } from '../player/Player.js';
import { updateGrass } from './Grass.js';
import {
  GROUND_SIZE, GROUND_COLOR,
  SKY_RADIUS, SKY_TOP_COLOR, SKY_BOTTOM_COLOR,
  MOON_RADIUS, MOON_COLOR, MOON_OFFSET,
  FOG_COLOR, FOG_NEAR, FOG_FAR,
  WORLD_BARRIER_INSET,
  WORLD_BARRIER_HEIGHT,
  WORLD_BARRIER_THICKNESS,
  WORLD_EXTENDED_GROUND_SCALE,
  WORLD_EXTENDED_GROUND_Y_OFFSET,
  AMBIENT_LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY,
} from '../config/constants.js';

// Ground continuation beyond the playable area, so fog can hide map limits naturally.
const extendedGroundGeometry = new THREE.PlaneGeometry(
  GROUND_SIZE * WORLD_EXTENDED_GROUND_SCALE,
  GROUND_SIZE * WORLD_EXTENDED_GROUND_SCALE
);
const extendedGroundMaterial = new THREE.MeshStandardMaterial({
  color: GROUND_COLOR,
  roughness: 1,
  metalness: 0,
});
const extendedGround = new THREE.Mesh(extendedGroundGeometry, extendedGroundMaterial);
extendedGround.rotation.x = -Math.PI / 2;
extendedGround.position.y = WORLD_EXTENDED_GROUND_Y_OFFSET;
extendedGround.receiveShadow = true;
scene.add(extendedGround);

// Chão
const planeGeometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
const planeMaterial = new THREE.MeshStandardMaterial({ color: GROUND_COLOR });
const ground = new THREE.Mesh(planeGeometry, planeMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
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
  scene.add(mesh);
  addCollider(mesh);
  return mesh;
}

createBarrier(playableHalf * 2 + WORLD_BARRIER_THICKNESS * 2, WORLD_BARRIER_THICKNESS, 0, playableHalf);
createBarrier(playableHalf * 2 + WORLD_BARRIER_THICKNESS * 2, WORLD_BARRIER_THICKNESS, 0, -playableHalf);
createBarrier(WORLD_BARRIER_THICKNESS, playableHalf * 2 + WORLD_BARRIER_THICKNESS * 2, playableHalf, 0);
createBarrier(WORLD_BARRIER_THICKNESS, playableHalf * 2 + WORLD_BARRIER_THICKNESS * 2, -playableHalf, 0);

// Céu noturno (gradiente shader)
const skyGeo = new THREE.SphereGeometry(SKY_RADIUS, 64, 64);
const skyMat = new THREE.ShaderMaterial({
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

// Lua
const moonGeo = new THREE.SphereGeometry(MOON_RADIUS, 32, 32);
const moonMat = new THREE.MeshBasicMaterial({ color: MOON_COLOR });
const moon = new THREE.Mesh(moonGeo, moonMat);
scene.add(moon);

// Nevoeiro
scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);

// Luz ambiente
const ambientLight = new THREE.AmbientLight(AMBIENT_LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY);
scene.add(ambientLight);

// Update (seguir câmara)
function updateWorld(camera) {
  sky.position.copy(camera.position);
  moon.position.copy(camera.position).add(
    new THREE.Vector3(MOON_OFFSET.x, MOON_OFFSET.y, MOON_OFFSET.z)
  );
}

export { ground, updateWorld, updateGrass };
