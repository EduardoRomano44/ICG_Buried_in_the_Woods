import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene } from '../core/SceneManager.js';
import { addCollider, registerInteractable } from '../player/Player.js';
import { enableShadows } from '../utils/helpers.js';
import {
  registerShadowLight,
  registerShadowObject,
  tagShadowLight,
  tagShadowObject,
} from '../core/ShadowOptimizer.js';
import { createFireflies } from '../animations/fireflies.js';
import { createSlimeIdle } from '../animations/slimeIdle.js';
import { registerGrassBlocker, registerOccupied, isPlacementFreeWithRadius } from '../world/Grass.js';
import {
  GROUND_SIZE,
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
  SHADOW_RADIUS,
  SHADOW_MAP_SIZE,
  SHADOW_BIAS,
  SHADOW_NORMAL_BIAS,
  SHADOW_CAMERA_NEAR,
  SHADOW_CAMERA_FAR,
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
  FLASHLIGHT_SPOT_SCALE_Z,
  TREE_COUNT,
  TREE_PLACEMENT_ATTEMPTS,
  TREE_WORLD_MARGIN,
  TREE_EXCLUSION_RADIUS,
} from '../config/constants.js';

const loader = new GLTFLoader();
const modelTemplatePromises = new Map();

const SLIME_MODEL_PATH = './models/Slime.glb';
const LAMP_MODEL_PATH = './models/Lamp.glb';
const TREE_MODEL_PATH = './models/Tree.glb';
const BENCH_MODEL_PATH = './models/Bench.glb';
const FLASHLIGHT_MODEL_PATH = './models/Flashlight.glb';

function loadModelTemplate(modelPath) {
  if (modelTemplatePromises.has(modelPath)) {
    return modelTemplatePromises.get(modelPath);
  }

  const promise = new Promise((resolve, reject) => {
    loader.load(
      modelPath,
      (gltf) => resolve(gltf.scene),
      undefined,
      reject
    );
  });

  modelTemplatePromises.set(modelPath, promise);
  return promise;
}

function cloneModelTemplate(modelPath) {
  return loadModelTemplate(modelPath).then((template) => template.clone(true));
}

function createPlacementHash(cellSize) {
  const safeCellSize = Math.max(0.001, cellSize);
  const buckets = new Map();

  const getKey = (cellX, cellZ) => `${cellX}:${cellZ}`;

  return {
    hasNeighborWithin(x, z, radius) {
      const centerX = Math.floor(x / safeCellSize);
      const centerZ = Math.floor(z / safeCellSize);
      const searchRadius = Math.ceil(radius / safeCellSize);
      const radiusSq = radius * radius;

      for (let cx = centerX - searchRadius; cx <= centerX + searchRadius; cx++) {
        for (let cz = centerZ - searchRadius; cz <= centerZ + searchRadius; cz++) {
          const bucket = buckets.get(getKey(cx, cz));
          if (!bucket) continue;

          for (const point of bucket) {
            const dx = point.x - x;
            const dz = point.z - z;
            if (dx * dx + dz * dz < radiusSq) {
              return true;
            }
          }
        }
      }

      return false;
    },

    add(x, z) {
      const cellX = Math.floor(x / safeCellSize);
      const cellZ = Math.floor(z / safeCellSize);
      const key = getKey(cellX, cellZ);

      if (!buckets.has(key)) {
        buckets.set(key, []);
      }

      buckets.get(key).push({ x, z });
    },
  };
}

function placeModelOnGround(model, x, z, groundY = 0) {
  model.position.set(x, 0, z);
  model.updateWorldMatrix(true, true);

  const bounds = new THREE.Box3().setFromObject(model);
  const offsetY = Number.isFinite(bounds.min.y) ? (groundY - bounds.min.y) : groundY;
  model.position.y += offsetY;
}

function configureShadowCastingLight(light) {
  light.castShadow = true;
  light.shadow.radius = SHADOW_RADIUS;
  light.shadow.mapSize.width = SHADOW_MAP_SIZE;
  light.shadow.mapSize.height = SHADOW_MAP_SIZE;
  light.shadow.bias = SHADOW_BIAS;
  light.shadow.normalBias = SHADOW_NORMAL_BIAS;
  light.shadow.camera.near = SHADOW_CAMERA_NEAR;
  light.shadow.camera.far = SHADOW_CAMERA_FAR;
}

function setupModelShadows(model, staticObject = true) {
  tagShadowObject(model, staticObject);
  enableShadows(model);
  registerShadowObject(model, { staticObject });
}

// Road
function loadRoad() {
  return cloneModelTemplate(ROAD_MODEL_PATH).then((model) => {
    model.scale.set(ROAD_SCALE.x, ROAD_SCALE.y, ROAD_SCALE.z);
    model.rotation.set(ROAD_ROTATION.x, ROAD_ROTATION.y, ROAD_ROTATION.z);

    if (ROAD_ALIGN_TO_GROUND) {
      placeModelOnGround(model, ROAD_POSITION.x, ROAD_POSITION.z, ROAD_POSITION.y);
    } else {
      model.position.set(ROAD_POSITION.x, ROAD_POSITION.y, ROAD_POSITION.z);
    }

    // Road is static in gameplay and should use static shadow policy.
    setupModelShadows(model, true);

    scene.add(model);
    registerGrassBlocker(model);
    return model;
  });
}

// Slime
function loadSlime(x, y, z, rotationY = 0) {
  return cloneModelTemplate(SLIME_MODEL_PATH).then((model) => {
    model.position.set(x, y, z);
    model.scale.set(SLIME_SCALE, SLIME_SCALE, SLIME_SCALE);
    model.rotation.y = rotationY * (Math.PI / 180);

    // Slime is dynamic in gameplay and should keep dynamic shadow invalidation.
    setupModelShadows(model, false);

    scene.add(model);
    addCollider(model, { dynamic: true });
    registerOccupied(x, z);
    createSlimeIdle(model);
    return model;
  });
}

// Lamp
function loadLamp(x, y, z, rotationY = 0) {
  return cloneModelTemplate(LAMP_MODEL_PATH).then((model) => {
    model.scale.set(LAMP_SCALE, LAMP_SCALE, LAMP_SCALE);
    placeModelOnGround(model, x, z, y);
    model.rotation.y = rotationY * (Math.PI / 180);

    const light = new THREE.PointLight(LAMP_LIGHT_COLOR, LAMP_LIGHT_INTENSITY, LAMP_LIGHT_DISTANCE);
    light.position.set(LAMP_LIGHT_POSITION.x, LAMP_LIGHT_POSITION.y, LAMP_LIGHT_POSITION.z);
    configureShadowCastingLight(light);

    tagShadowLight(light, true);
    registerShadowLight(light, { staticLight: true });

    createFireflies(model);
    model.add(light);

    setupModelShadows(model, true);

    scene.add(model);
    addCollider(model, { boundsScale: 0.72 });
    registerOccupied(x, z);
    return model;
  });
}

// Tree
function loadTreeTemplate() {
  return loadModelTemplate(TREE_MODEL_PATH);
}

function loadTree(x, y, z, rotationY = 0) {
  return loadTreeTemplate().then((template) => {
    const model = template.clone(true);
    placeModelOnGround(model, x, z, y);
    model.rotation.y = rotationY * (Math.PI / 180);

    setupModelShadows(model, true);

    model.traverse((obj) => {
      if (obj.isMesh && obj.name === 'Cylinder') {
        addCollider(obj);
      }
    });

    scene.add(model);
    return model;
  });
}

// Bench
function loadBench(x, y, z, rotationY = 0) {
  return cloneModelTemplate(BENCH_MODEL_PATH).then((model) => {
    model.scale.set(BENCH_SCALE, BENCH_SCALE, BENCH_SCALE);
    placeModelOnGround(model, x, z, y);
    model.rotation.y = rotationY * (Math.PI / 180);

    setupModelShadows(model, true);

    scene.add(model);
    addCollider(model);
    registerOccupied(x, z);
    return model;
  });
}

// Flashlight
function loadFlashlight(x, y, z, rotationY = 0) {
  return cloneModelTemplate(FLASHLIGHT_MODEL_PATH).then((model) => {
    model.scale.set(FLASHLIGHT_SCALE, FLASHLIGHT_SCALE, FLASHLIGHT_SCALE);
    placeModelOnGround(model, x, z, y);
    model.rotation.y = rotationY * (Math.PI / 180);

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
    const spotDirection = new THREE.Vector3(0, 0, 1);
    const targetDistance = Math.max(2, FLASHLIGHT_SPOT_DISTANCE * FLASHLIGHT_SPOT_SCALE_Z);
    spotLight.target.position.copy(
      spotOrigin.clone().addScaledVector(spotDirection, targetDistance)
    );

    configureShadowCastingLight(spotLight);

    // Flashlight lights are marked dynamic by design.
    tagShadowLight(spotLight, false);
    registerShadowLight(spotLight, { staticLight: false });

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
    tagShadowLight(internalLight, false);
    registerShadowLight(internalLight, { staticLight: false });

    setupModelShadows(model, true);

    model.add(spotLight);
    model.add(spotLight.target);
    model.add(internalLight);
    scene.add(model);
    registerOccupied(x, z);

    registerInteractable(model, {
      actionText: 'GRAB',
    });

    return model;
  });
}

// Loader Helpers
// Position format: [x, y, z] or [x, y, z, rotationY(degrees)]
function loadSlimes(list_positions = []) {
  return Promise.all(
    list_positions.map((position) => loadSlime(position[0], position[1], position[2], position[3] || 0))
  );
}

function loadLamps(list_positions = []) {
  return Promise.all(
    list_positions.map((position) => loadLamp(position[0], position[1], position[2], position[3] || 0))
  );
}

function loadTrees(list_positions = []) {
  const isManualList = list_positions.length > 0;
  const positions = isManualList ? list_positions : generateTreePlacements(TREE_COUNT, 0);

  if (isManualList) {
    for (const position of positions) {
      registerOccupied(position[0], position[2]);
    }
  }

  return Promise.all(
    positions.map((position) => loadTree(position[0], position[1], position[2], position[3] || 0))
  );
}

function generateTreePlacements(count, groundY = 0) {
  const placements = [];
  const half = (GROUND_SIZE * 0.5) - TREE_WORLD_MARGIN;
  const placementHash = createPlacementHash(TREE_EXCLUSION_RADIUS);

  for (let i = 0; i < count; i++) {
    let px = 0;
    let pz = 0;
    let attempts = 0;
    let found = false;

    while (attempts < TREE_PLACEMENT_ATTEMPTS) {
      px = (Math.random() * 2 - 1) * half;
      pz = (Math.random() * 2 - 1) * half;

      if (placementHash.hasNeighborWithin(px, pz, TREE_EXCLUSION_RADIUS)) {
        attempts++;
        continue;
      }

      if (isPlacementFreeWithRadius(px, pz, TREE_EXCLUSION_RADIUS)) {
        found = true;
        break;
      }

      attempts++;
    }

    if (!found) continue;

    const rotY = Math.random() * Math.PI * 2;
    placements.push([px, groundY, pz, rotY]);
    placementHash.add(px, pz);
    registerOccupied(px, pz);
  }

  return placements;
}

function loadBenches(list_positions = []) {
  return Promise.all(
    list_positions.map((position) => loadBench(position[0], position[1], position[2], position[3] || 0))
  );
}

function loadFlashlights(list_positions = []) {
  return Promise.all(
    list_positions.map((position) => loadFlashlight(position[0], position[1], position[2], position[3] || 0))
  );
}

function preloadModelTemplates() {
  return Promise.all([
    loadModelTemplate(ROAD_MODEL_PATH),
    loadModelTemplate(SLIME_MODEL_PATH),
    loadModelTemplate(LAMP_MODEL_PATH),
    loadModelTemplate(TREE_MODEL_PATH),
    loadModelTemplate(BENCH_MODEL_PATH),
    loadModelTemplate(FLASHLIGHT_MODEL_PATH),
  ]);
}

// Load all
async function loadAllModels() {
  await preloadModelTemplates();

  // Road first so tree placement can respect grass blocker ray checks.
  await loadRoad();

  const [slimes, lamps, benches, flashlights] = await Promise.all([
    loadSlimes([[-100, 0, -50, 90], [-120, 0, -50, -90]]),
    loadLamps([[95, 0, 20], [102, 0, 120], [102, 0, -70], [-90, 0, -60], [-10, 0, 0]]),
    loadBenches([[93, 0, 30, -97], [-22, 0, 12, 45]]),
    loadFlashlights([[-23, 1, 13]]),
  ]);

  const trees = await loadTrees();
  return [slimes, lamps, trees, benches, flashlights];
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
