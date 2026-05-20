import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene } from '../../core/SceneManager.js';
import { addCollider, registerInteractable } from '../../player/Player.js';
import { enableShadows } from '../../utils/helpers.js';
import {
  registerShadowLight,
  registerShadowObject,
  tagShadowLight,
  tagShadowObject,
} from '../../core/ShadowOptimizer.js';
import { createFireflies } from '../../animations/others/fireflies.js';
import { createInstancedGroup, createInvisibleCollider } from '../../utils/InstancingUtils.js';
import { registerGrassBlocker, registerOccupied, isPlacementFreeWithRadius } from './generated/Grass.js';
import {
  registerWorldFlashlight,
  pickupFlashlightFromWorld,
} from '../systems/FlashlightSystem.js';
import { createBasementDoorSystem } from '../systems/BasementDoorSystem.js';
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
  FLASHLIGHT_SCALE,
  FLASHLIGHT_COLOR,
  FLASHLIGHT_INTENSITY,
  FLASHLIGHT_SPOT_DISTANCE,
  FLASHLIGHT_SPOT_POSITION,
  FLASHLIGHT_SPOT_ROTATION,
  FLASHLIGHT_SPOT_RADIUS,
  FLASHLIGHT_SPOT_BEAM_RADIUS,
  FLASHLIGHT_SPOT_BEAM_BLEND,
  FLASHLIGHT_INTERNAL_COLOR,
  FLASHLIGHT_INTERNAL_INTENSITY,
  FLASHLIGHT_INTERNAL_DISTANCE,
  FLASHLIGHT_INTERNAL_POSITION,
  BENCH_SCALE,
  TABLE_SCALE,
  FLASHLIGHT_SPOT_SCALE_Z,
  BASEMENT_DOOR_MODEL_PATH,
  BASEMENT_DOOR_POSITION,
  BASEMENT_DOOR_ROTATION_Y,
  TREE_COUNT,
  TREE_PLACEMENT_ATTEMPTS,
  TREE_WORLD_MARGIN,
  TREE_EXCLUSION_RADIUS,
} from '../../config/constants.js';

const loader = new GLTFLoader();
const modelTemplatePromises = new Map();
let lastTreePlacements = [];

const LAMP_MODEL_PATH = './models/Lamp.glb';
const TREE_MODEL_PATH = './models/Tree2.glb';
const BENCH_MODEL_PATH = './models/Bench.glb';
const FLASHLIGHT_MODEL_PATH = './models/Flashlight.glb';
const TABLE_MODEL_PATH = './models/Table.glb';

let basementDoorTemplatePromise = null;

function normalizeTreePlacementEntry(entry) {
  // Using previously generated positions
  if (Array.isArray(entry)) {
    return [
      Number.isFinite(entry[0]) ? entry[0] : 0,
      Number.isFinite(entry[1]) ? entry[1] : 0,
      Number.isFinite(entry[2]) ? entry[2] : 0,
      Number.isFinite(entry[3]) ? entry[3] : 0,
    ];
  }

  if (!entry || typeof entry !== 'object') return null;

  return [
    Number.isFinite(entry.x) ? entry.x : 0,
    Number.isFinite(entry.y) ? entry.y : 0,
    Number.isFinite(entry.z) ? entry.z : 0,
    Number.isFinite(entry.rotationY) ? entry.rotationY : 0,
  ];
}

function normalizeTreePlacementList(list) {
  if (!Array.isArray(list)) return [];

  const normalized = [];
  for (const entry of list) {
    const parsed = normalizeTreePlacementEntry(entry);
    if (!parsed) continue;
    normalized.push(parsed);
  }

  return normalized;
}

function loadModelTemplate(modelPath) {
  // Add models to templates after creation, for faster loading

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

function loadBasementDoorTemplate() {
  if (basementDoorTemplatePromise) {
    return basementDoorTemplatePromise;
  }

  basementDoorTemplatePromise = new Promise((resolve, reject) => {
    loader.load(
      BASEMENT_DOOR_MODEL_PATH,
      (gltf) => resolve(gltf),
      undefined,
      reject
    );
  });

  return basementDoorTemplatePromise;
}

function cloneModelTemplate(modelPath) {
  return loadModelTemplate(modelPath).then((template) => template.clone(true));
}

function createPlacementHash(cellSize) {
  // Made by copilot, exclude placements that are too close to other objects
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
  // For shadow optimization
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

// Lamps
function loadLamps(list_positions = []) {
  if (list_positions.length === 0) return Promise.resolve(null);

  return loadModelTemplate(LAMP_MODEL_PATH).then((template) => {
    const transforms = list_positions.map((pos) => {
      // Temporarily use the template to find the correct Y offset via placeModelOnGround
      const oldPos = template.position.clone();
      const oldScale = template.scale.clone();
      template.scale.set(LAMP_SCALE, LAMP_SCALE, LAMP_SCALE);
      placeModelOnGround(template, 0, 0, 0);
      const yOffset = template.position.y;
      template.position.copy(oldPos);
      template.scale.copy(oldScale);

      return {
        position: new THREE.Vector3(pos[0], pos[1] + yOffset, pos[2]),
        rotation: (pos[3] || 0) * (Math.PI / 180),
        scale: LAMP_SCALE
      };
    });

    const instancedGroup = createInstancedGroup(template, transforms);
    setupModelShadows(instancedGroup, true);
    scene.add(instancedGroup);

    // Add logical components (Lights, Fireflies, Colliders)
    transforms.forEach((transform, idx) => {
      const pos = list_positions[idx];
      
      const logicGroup = new THREE.Group();
      logicGroup.position.copy(transform.position);
      logicGroup.rotation.y = transform.rotation;
      logicGroup.scale.set(transform.scale, transform.scale, transform.scale);

      const light = new THREE.PointLight(LAMP_LIGHT_COLOR, LAMP_LIGHT_INTENSITY, LAMP_LIGHT_DISTANCE);
      light.position.set(LAMP_LIGHT_POSITION.x, LAMP_LIGHT_POSITION.y, LAMP_LIGHT_POSITION.z);
      configureShadowCastingLight(light);

      tagShadowLight(light, true);
      registerShadowLight(light, { staticLight: true });

      createFireflies(logicGroup);
      logicGroup.add(light);
      scene.add(logicGroup);

      // Create collider using boundsScale logic previously used: { boundsScale: 0.72 }
      // Wait, createInvisibleCollider uses the template's bounding box. We can just scale the invisible collider
      const collider = createInvisibleCollider(template, transform.position, transform.rotation, transform.scale);
      scene.add(collider);
      addCollider(collider, { boundsScale: 0.72 });
      
      registerOccupied(pos[0], pos[2]);
    });

    return instancedGroup;
  });
}

// Tree
function loadTreeTemplate() {
  return loadModelTemplate(TREE_MODEL_PATH);
}

// Benches
function loadBenches(list_positions = []) {
  if (list_positions.length === 0) return Promise.resolve(null);

  return loadModelTemplate(BENCH_MODEL_PATH).then((template) => {
    const transforms = list_positions.map((pos) => {
      const oldPos = template.position.clone();
      const oldScale = template.scale.clone();
      template.scale.set(BENCH_SCALE, BENCH_SCALE, BENCH_SCALE);
      placeModelOnGround(template, 0, 0, 0);
      const yOffset = template.position.y;
      template.position.copy(oldPos);
      template.scale.copy(oldScale);

      return {
        position: new THREE.Vector3(pos[0], pos[1] + yOffset, pos[2]),
        rotation: (pos[3] || 0) * (Math.PI / 180),
        scale: BENCH_SCALE
      };
    });

    const instancedGroup = createInstancedGroup(template, transforms);
    setupModelShadows(instancedGroup, true);
    scene.add(instancedGroup);

    transforms.forEach((transform, idx) => {
      const pos = list_positions[idx];
      const collider = createInvisibleCollider(template, transform.position, transform.rotation, transform.scale);
      scene.add(collider);
      addCollider(collider);
      registerOccupied(pos[0], pos[2]);
    });

    return instancedGroup;
  });
}

// Table
function loadTable(x, y, z, rotationY = 0) {
  return cloneModelTemplate(TABLE_MODEL_PATH).then((model) => {
    model.scale.set(TABLE_SCALE, TABLE_SCALE, TABLE_SCALE);
    placeModelOnGround(model, x, z, y);
    model.rotation.y = rotationY * (Math.PI / 180);

    setupModelShadows(model, true);

    scene.add(model);
    addCollider(model);
    registerOccupied(x, z);
    return model;
  });
}

function loadBasementDoor(onEnterBasement) {
  const enterCallback = typeof onEnterBasement === 'function'
    ? onEnterBasement
    : () => window.location.reload();

  return loadBasementDoorTemplate().then((gltf) => {
    const model = gltf.scene.clone(true);
    model.scale.setScalar(1);
    placeModelOnGround(model, BASEMENT_DOOR_POSITION.x, BASEMENT_DOOR_POSITION.z, BASEMENT_DOOR_POSITION.y);
    model.rotation.y = BASEMENT_DOOR_ROTATION_Y;

    setupModelShadows(model, true);

    createBasementDoorSystem(model, gltf.animations, {
      onEnterBasement: enterCallback,
    });

    addCollider(model);

    scene.add(model);
    registerOccupied(BASEMENT_DOOR_POSITION.x, BASEMENT_DOOR_POSITION.z);
    return model;
  });
}

// Flashlight
function loadFlashlight(x, y, z, rotationY = 0) {
  return cloneModelTemplate(FLASHLIGHT_MODEL_PATH).then((model) => {
    model.scale.set(FLASHLIGHT_SCALE, FLASHLIGHT_SCALE, FLASHLIGHT_SCALE);
    placeModelOnGround(model, x, z, y);
    model.rotation.y = rotationY * (Math.PI / 180);

    // Lighting: Flashlight has to lights: Spotlight (to reflect on other objects) and Internal Light(For the Flashlight to appear ON)
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

    // Apply configured rotation to the spotlight direction so the beam points correctly
    const spotDirection = new THREE.Vector3(0, 0, 1);
    spotDirection.applyEuler(new THREE.Euler(
      FLASHLIGHT_SPOT_ROTATION.x,
      FLASHLIGHT_SPOT_ROTATION.y,
      FLASHLIGHT_SPOT_ROTATION.z
    ));

    const targetDistance = Math.max(2, FLASHLIGHT_SPOT_DISTANCE * FLASHLIGHT_SPOT_SCALE_Z);
    spotLight.target.position.copy(
      spotOrigin.clone().addScaledVector(spotDirection, targetDistance)
    );

    configureShadowCastingLight(spotLight);
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
    internalLight.castShadow = false;

    model.add(spotLight);
    model.add(spotLight.target);
    model.add(internalLight);
    scene.add(model);
    registerOccupied(x, z);

    registerWorldFlashlight({
      model,
      spotLight,
      internalLight,
    });

    registerInteractable(model, {
      actionText: 'Grab',
      onInteract: pickupFlashlightFromWorld,
    });

    return model;
  });
}

// Loader Helpers
// Position format: [x, y, z] or [x, y, z, rotationY(degrees)]

// Position format: [x, y, z] or [x, y, z, rotationY(degrees)]

function loadTrees(list_positions = []) {
  const normalizedList = normalizeTreePlacementList(list_positions);
  const isManualList = normalizedList.length > 0;
  const positions = isManualList ? normalizedList : generateTreePlacements(TREE_COUNT, 0);

  if (isManualList) {
    for (const position of positions) {
      registerOccupied(position[0], position[2]);
    }
  }

  lastTreePlacements = positions.map((position) => [
    position[0],
    position[1],
    position[2],
    position[3] || 0,
  ]);

  if (positions.length === 0) return Promise.resolve(null);

  return loadTreeTemplate().then((template) => {
    const transforms = positions.map((pos) => {
      const oldPos = template.position.clone();
      placeModelOnGround(template, 0, 0, 0);
      const yOffset = template.position.y;
      template.position.copy(oldPos);

      return {
        position: new THREE.Vector3(pos[0], pos[1] + yOffset, pos[2]),
        rotation: (pos[3] || 0) * (Math.PI / 180),
        scale: 1
      };
    });

    const instancedGroup = createInstancedGroup(template, transforms);
    setupModelShadows(instancedGroup, true);
    scene.add(instancedGroup);

    transforms.forEach((transform) => {
      // Original code extracted 'Cylinder' mesh to build the collider
      const collider = createInvisibleCollider(template, transform.position, transform.rotation, transform.scale, 'Cylinder');
      scene.add(collider);
      addCollider(collider);
    });

    return instancedGroup;
  });
}

function getTreePlacements() {
  return lastTreePlacements.map((position) => [...position]);
}

function generateTreePlacements(count, groundY = 0) {
  // Made by copilot, place trees randomly around the map
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


function loadFlashlights(list_positions = []) {
  return Promise.all(
    list_positions.map((position) => loadFlashlight(position[0], position[1], position[2], position[3] || 0))
  );
}

function loadTables(list_positions = []) {
  return Promise.all(
    list_positions.map((position) => loadTable(position[0], position[1], position[2], position[3] || 0))
  );
}

function preloadModelTemplates() {
  return Promise.all([
    loadModelTemplate(ROAD_MODEL_PATH),
    loadModelTemplate(LAMP_MODEL_PATH),
    loadModelTemplate(TREE_MODEL_PATH),
    loadModelTemplate(BENCH_MODEL_PATH),
    loadModelTemplate(FLASHLIGHT_MODEL_PATH),
    loadModelTemplate(TABLE_MODEL_PATH),
    loadBasementDoorTemplate(),
  ]);
}

// Load all
async function loadAllModels(options = {}) {
  await preloadModelTemplates();

  // Road first so tree placement can respect grass blocker ray checks.
  await loadRoad();
  await loadBasementDoor(options.onEnterBasement);

  const importedTreePlacements = normalizeTreePlacementList(options.treePlacements);

  const [lamps, benches, flashlights] = await Promise.all([
    loadLamps([[60, 0, 0], [62, 0, 80], [65, 0, -80], [-50, 0, -40], [-10, 0, 0]]),
    loadBenches([[58, 0, 10, -97], [-22, 0, 12, 45]]),
    loadFlashlights([[-13, 3.3, 11, -80]]),
    loadTables([[-10, 0, 10, -90]])
  ]);

  const trees = await loadTrees(importedTreePlacements);
  return {
    lamps,
    trees,
    benches,
    flashlights,
    treePlacements: getTreePlacements(),
  };
}

export {
  loadAllModels,
};