import * as THREE from 'three';
import settings from '../config/settings.js';
import {
  INITIAL_CAMERA_POSITION,
  CAMERA_NEAR,
  CAMERA_FAR,
} from '../config/constants.js';

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  settings.normalFOV,
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
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = settings.shadowsEnabled;
// PCFSoftShadowMap foi descontinuado em versões recentes; usar PCFShadowMap
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setClearColor(0x000000);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

export { scene, camera, renderer, initialCameraPosition };
