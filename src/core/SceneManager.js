import * as THREE from 'three';
import settings from '../config/settings.js';
import {
  INITIAL_CAMERA_POSITION,
  CAMERA_NEAR,
  CAMERA_FAR,
  CAMERA_NORMAL_FOV,
} from '../config/constants.js';

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  CAMERA_NORMAL_FOV,
  window.innerWidth / window.innerHeight,
  CAMERA_NEAR,
  CAMERA_FAR
);
const initialCameraPosition = new THREE.Vector3(
  INITIAL_CAMERA_POSITION.x,
  INITIAL_CAMERA_POSITION.y,
  INITIAL_CAMERA_POSITION.z
);
camera.position.copy(initialCameraPosition);
scene.add(camera);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: settings.antialias });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = settings.shadowsEnabled;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setClearColor(0x000000);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'none';
renderer.domElement.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
});
renderer.domElement.addEventListener('webglcontextrestored', () => {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
});
document.body.appendChild(renderer.domElement);

// Resize
window.addEventListener('resize', () => {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

export { scene, camera, renderer, initialCameraPosition };
