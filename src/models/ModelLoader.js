import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene } from '../core/SceneManager.js';
import { addCollider, registerInteractable } from '../player/Player.js';
import { enableShadows } from '../utils/helpers.js';
import { createFireflies } from '../animations/fireflies.js';
import { createSlimeIdle } from '../animations/slimeIdle.js';
import { registerGrassBlocker } from '../world/Grass.js';
import {
  ROAD_MODEL_PATH,
  ROAD_POSITION,
  ROAD_SCALE,
  ROAD_ROTATION,
  ROAD_ALIGN_TO_GROUND,
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
  FLASHLIGHT_SCALE,
  FLASHLIGHT_COLOR,
  FLASHLIGHT_INTENSITY,
  FLASHLIGHT_SPOT_DISTANCE,
  FLASHLIGHT_SPOT_POSITION,
  FLASHLIGHT_SPOT_RADIUS,
  FLASHLIGHT_SPOT_BEAM_RADIUS,
  FLASHLIGHT_SPOT_BEAM_BLEND,
  FLASHLIGHT_INTERNAL_COLOR,
  FLASHLIGHT_INTERNAL_INTENSITY,
  FLASHLIGHT_INTERNAL_DISTANCE,
  FLASHLIGHT_INTERNAL_POSITION,
  BENCH_SCALE,
  FLASHLIGHT_SPOT_SCALE_Z
} from '../config/constants.js';

const loader = new GLTFLoader();

function placeModelOnGround(model, x, z, groundY = 0) {
  model.position.set(x, 0, z);
  model.updateWorldMatrix(true, true);

  const bounds = new THREE.Box3().setFromObject(model);
  const offsetY = Number.isFinite(bounds.min.y) ? (groundY - bounds.min.y) : groundY;
  model.position.y += offsetY;
}

// Road
function loadRoad() {
  return new Promise((resolve, reject) => {
    loader.load(
      ROAD_MODEL_PATH,
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(ROAD_SCALE.x, ROAD_SCALE.y, ROAD_SCALE.z);
        model.rotation.set(ROAD_ROTATION.x, ROAD_ROTATION.y, ROAD_ROTATION.z);

        if (ROAD_ALIGN_TO_GROUND) {
          placeModelOnGround(model, ROAD_POSITION.x, ROAD_POSITION.z, ROAD_POSITION.y);
        } else {
          model.position.set(ROAD_POSITION.x, ROAD_POSITION.y, ROAD_POSITION.z);
        }

        // Road is not collidable
        enableShadows(model);
        scene.add(model);
        registerGrassBlocker(model);
        resolve(model);
      },
      undefined,
      reject
    );
  });
}

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
        addCollider(model, { boundsScale: 0.72 });
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

// Bench
function loadBench(x, y, z) {
  return new Promise((resolve, reject) => {
    loader.load(
      './models/Bench.glb',
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(BENCH_SCALE, BENCH_SCALE, BENCH_SCALE);
        placeModelOnGround(model, x, z, y);

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

// Flashlight
function loadFlashlight(x, y, z) {
  return new Promise((resolve, reject) => {
    loader.load(
      './models/Flashlight.glb',
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(FLASHLIGHT_SCALE, FLASHLIGHT_SCALE, FLASHLIGHT_SCALE);
        placeModelOnGround(model, x, z, y);

        const spotLight = new THREE.SpotLight(
          FLASHLIGHT_COLOR,
          FLASHLIGHT_INTENSITY,
          FLASHLIGHT_SPOT_DISTANCE,
          Math.max(FLASHLIGHT_SPOT_RADIUS, THREE.MathUtils.degToRad(FLASHLIGHT_SPOT_BEAM_RADIUS)),
          FLASHLIGHT_SPOT_BEAM_BLEND,
          0.6
        );
        spotLight.position.set(
          FLASHLIGHT_SPOT_POSITION.x,
          FLASHLIGHT_SPOT_POSITION.y,
          FLASHLIGHT_SPOT_POSITION.z
        );

        const spotOrigin = new THREE.Vector3(
          FLASHLIGHT_SPOT_POSITION.x,
          FLASHLIGHT_SPOT_POSITION.y,
          FLASHLIGHT_SPOT_POSITION.z
        );
        const spotDirection = new THREE.Vector3(0, 0, 1)
        const targetDistance = Math.max(2, FLASHLIGHT_SPOT_DISTANCE * FLASHLIGHT_SPOT_SCALE_Z);
        spotLight.target.position.copy(
          spotOrigin.clone().addScaledVector(spotDirection, targetDistance)
        );

        spotLight.castShadow = true;
        spotLight.shadow.radius = LAMP_SHADOW_RADIUS;
        spotLight.shadow.mapSize.width = LAMP_SHADOW_MAP_SIZE;
        spotLight.shadow.mapSize.height = LAMP_SHADOW_MAP_SIZE;
        spotLight.shadow.bias = LAMP_SHADOW_BIAS;
        spotLight.shadow.camera.near = LAMP_SHADOW_CAMERA_NEAR;
        spotLight.shadow.camera.far = LAMP_SHADOW_CAMERA_FAR;

        const internalLight = new THREE.PointLight(
          FLASHLIGHT_INTERNAL_COLOR,
          FLASHLIGHT_INTERNAL_INTENSITY,
          FLASHLIGHT_INTERNAL_DISTANCE
        );
        internalLight.position.set(
          FLASHLIGHT_INTERNAL_POSITION.x,
          FLASHLIGHT_INTERNAL_POSITION.y,
          FLASHLIGHT_INTERNAL_POSITION.z
        );

        enableShadows(model);
        model.add(spotLight);
        model.add(spotLight.target);
        model.add(internalLight);
        scene.add(model);

        registerInteractable(model, {
          actionText: 'GRAB',
        });

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

function loadBenches(list_positions = []) {
  return Promise.all(
    list_positions.map((position) => loadBench(position[0], position[1], position[2]))
  );
}

function loadFlashlights(list_positions = []) {
  return Promise.all(
    list_positions.map((position) => loadFlashlight(position[0], position[1], position[2]))
  );
}

// Load all
function loadAllModels() {
  return Promise.all([
    loadRoad(),
    loadSlimes([[-20, 0, 0], [-40, 0, 0]]),
    loadLamps([[0, 0, 0], [-10, 0, 0]]),
    loadTrees([[10, 0, 0]]),
    loadBenches([[15, 0, 8], [-22, 0, 12]]),
    loadFlashlights([[8, 0, -14], [-16, 0, -6]]),
  ]);
}

export {
  loadRoad,
  loadSlime,
  loadLamp,
  loadTree,
  loadBench,
  loadFlashlight,
  loadAllModels,
};
