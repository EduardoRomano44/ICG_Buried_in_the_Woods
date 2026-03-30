import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene } from '../core/SceneManager.js';
import { addCollider } from '../player/Player.js';
import { enableShadows } from '../utils/helpers.js';
import { createFireflies } from '../animations/fireflies.js';
import { createSlimeIdle } from '../animations/slimeIdle.js';
import {
  LAMP_SCALE,
  LAMP_LIGHT_COLOR,
  LAMP_LIGHT_INTENSITY,
  LAMP_LIGHT_DISTANCE,
  LAMP_LIGHT_POSITION,
  LAMP_SHADOW_RADIUS,
  LAMP_SHADOW_MAP_SIZE,
  LAMP_SHADOW_BIAS,
  LAMP_SHADOW_CAMERA_NEAR,
  LAMP_SHADOW_CAMERA_FAR,
  SLIME_SCALE,
} from '../config/constants.js';

const loader = new GLTFLoader();

// Slime
function loadSlime(x, y, z) {
  return new Promise((resolve, reject) => {
    loader.load(
      './models/Slime.glb',
      (gltf) => {
        const model = gltf.scene;
        model.position.set(x, y, z);
        model.scale.set(SLIME_SCALE, SLIME_SCALE, SLIME_SCALE);

        enableShadows(model);
        scene.add(model);
        addCollider(model, { dynamic: true });
        createSlimeIdle(model);
        resolve(model);
      },
      undefined,
      reject
    );
  });
}

// Lamp
function loadLamp(x, y, z) {
  return new Promise((resolve, reject) => {
    loader.load(
      './models/Lamp.glb',
      (gltf) => {
        const model = gltf.scene;
        model.position.set(x, y, z);
        model.scale.set(LAMP_SCALE, LAMP_SCALE, LAMP_SCALE);

        const light = new THREE.PointLight(LAMP_LIGHT_COLOR, LAMP_LIGHT_INTENSITY, LAMP_LIGHT_DISTANCE);
        light.position.set(LAMP_LIGHT_POSITION.x, LAMP_LIGHT_POSITION.y, LAMP_LIGHT_POSITION.z);
        light.castShadow = true;
        light.shadow.radius = LAMP_SHADOW_RADIUS;
        light.shadow.mapSize.width = LAMP_SHADOW_MAP_SIZE;
        light.shadow.mapSize.height = LAMP_SHADOW_MAP_SIZE;
        light.shadow.bias = LAMP_SHADOW_BIAS;
        light.shadow.camera.near = LAMP_SHADOW_CAMERA_NEAR;
        light.shadow.camera.far = LAMP_SHADOW_CAMERA_FAR;

        createFireflies(model);
        model.add(light);
        enableShadows(model);
        scene.add(model);
        addCollider(model);
        resolve(model);
      },
      undefined,
      reject
    );
  });
}

// Tree
function loadTree(x, y, z) {
  return new Promise((resolve, reject) => {
    loader.load(
      './models/Tree.glb',
      (gltf) => {
        const model = gltf.scene;
        model.position.set(x, y, z);
        enableShadows(model);
        model.traverse((obj) => {
          if (obj.isMesh && obj.name === 'Cylinder') {
            addCollider(obj);
          }
        });
        scene.add(model);
        resolve(model);
      },
      undefined,
      reject
    );
  });
}

// Loader Helpers
// Position is a list of 3 variables (x, y, z)
function loadSlimes(list_positions = []) {
  return Promise.all(
    list_positions.map((position) => loadSlime(position[0], position[1], position[2]))
  );
}

function loadLamps(list_positions = []) {
  return Promise.all(
    list_positions.map((position) => loadLamp(position[0], position[1], position[2]))
  );
}

function loadTrees(list_positions = []) {
  return Promise.all(
    list_positions.map((position) => loadTree(position[0], position[1], position[2]))
  );
}

// Load all
function loadAllModels() {
  return Promise.all([
    loadSlimes([[-20, 0, 0], [-40, 0, 0]]),
    loadLamps([[0, 0, 0], [-10, 0, 0]]),
    loadTrees([[10, 0, 0]]),
  ]);
}

export { loadSlime, loadLamp, loadTree, loadAllModels };
