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

/**
 * Recursively dispose geometry, material and textures from an Object3D tree.
 * Used during level transitions to release GPU resources before loading a new level.
 */
function disposeObject3D(obj) {
  if (!obj) return;

  if (obj.geometry) {
    obj.geometry.dispose();
  }

  if (obj.material) {
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of materials) {
      if (!mat) continue;
      for (const key of Object.keys(mat)) {
        const value = mat[key];
        if (value && typeof value === 'object' && typeof value.dispose === 'function') {
          value.dispose();
        }
      }
      mat.dispose();
    }
  }
}

/**
 * Remove every child from the scene (except the camera) and dispose their GPU resources.
 * After this call the scene is empty and ready for a new level.
 */
function clearScene() {
  const keep = new Set([camera]);

  const toRemove = [];
  scene.children.forEach((child) => {
    if (!keep.has(child)) {
      toRemove.push(child);
    }
  });

  for (const child of toRemove) {
    child.traverse(disposeObject3D);
    scene.remove(child);
  }

  scene.fog = null;
  scene.background = null;
}

export { scene, camera, renderer, initialCameraPosition, clearScene };