import * as THREE from 'three';
import { scene } from '../core/SceneManager.js';
import { createRoad } from './Road.js';
import { createGrass, updateGrass } from './Grass.js';
import {
  GROUND_SIZE, GROUND_COLOR,
  SKY_RADIUS, SKY_TOP_COLOR, SKY_BOTTOM_COLOR,
  MOON_RADIUS, MOON_COLOR, MOON_OFFSET,
  FOG_COLOR, FOG_NEAR, FOG_FAR,
  AMBIENT_LIGHT_COLOR,
} from '../config/constants.js';

// Chão
const planeGeometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
const planeMaterial = new THREE.MeshStandardMaterial({ color: GROUND_COLOR });
const ground = new THREE.Mesh(planeGeometry, planeMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

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
const ambientLight = new THREE.AmbientLight(AMBIENT_LIGHT_COLOR);
scene.add(ambientLight);

// Rua (curva, com passeios e linha tracejada)
createRoad();

// Update (seguir câmara)
function updateWorld(camera) {
  sky.position.copy(camera.position);
  moon.position.copy(camera.position).add(
    new THREE.Vector3(MOON_OFFSET.x, MOON_OFFSET.y, MOON_OFFSET.z)
  );
}

export { ground, updateWorld, updateGrass };
