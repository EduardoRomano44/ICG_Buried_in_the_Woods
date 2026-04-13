import * as THREE from 'three';
import {
  SHADOW_LIGHT_NEAR_DISTANCE,
  SHADOW_LIGHT_FAR_DISTANCE,
  SHADOW_LIGHT_MAP_SCALE_NEAR,
  SHADOW_LIGHT_MAP_SCALE_MEDIUM,
  SHADOW_LIGHT_MAP_SCALE_FAR,
  SHADOW_LIGHT_RADIUS_SCALE_NEAR,
  SHADOW_LIGHT_RADIUS_SCALE_MEDIUM,
  SHADOW_LIGHT_RADIUS_SCALE_FAR,
  SHADOW_OBJECT_NEAR_DISTANCE,
  SHADOW_OBJECT_FAR_DISTANCE,
  SHADOW_OBJECT_SIMPLIFIED_MESH_THRESHOLD,
  SHADOW_DYNAMIC_POSITION_EPSILON,
} from '../config/constants.js';

/*
  File made by copilot, with tought process by the author
  Problem: The game had too many shadows being processed at the same time, which severely harmed performance
  Solutions: - Decrease shadow quality when player is far away;
             - Seperate shadows into two types: + Static (from objects that dont move and made by Lamps, Moon, etc.)
                                                + Dynamic (from object that move and are made by the Flashlight)
                Static shadows are not updated after creation; Dynamic shadows are updated every X frames.
*/

const shadowLights = [];
const shadowObjects = [];

const tmpVecA = new THREE.Vector3();
const SHADOW_LOD_HYSTERESIS = 4;

let rendererRef = null;
let hasInitialRefresh = false;
let pendingShadowRefresh = true;

function tagShadowLight(light, staticLight = true) {
  if (!light) return;
  light.userData.staticLight = Boolean(staticLight);
}

function tagShadowObject(object3D, staticObject = true) {
  if (!object3D) return;
  object3D.userData.staticObject = Boolean(staticObject);
}

function getDistanceLodLevel(distance, nearDistance, farDistance, previousLod = -1) {
  if (previousLod < 0) {
    if (distance <= nearDistance) return 0;
    if (distance <= farDistance) return 1;
    return 2;
  }

  if (previousLod === 0) {
    return distance > (nearDistance + SHADOW_LOD_HYSTERESIS) ? 1 : 0;
  }

  if (previousLod === 1) {
    if (distance < (nearDistance - SHADOW_LOD_HYSTERESIS)) return 0;
    if (distance > (farDistance + SHADOW_LOD_HYSTERESIS)) return 2;
    return 1;
  }

  if (distance < (farDistance - SHADOW_LOD_HYSTERESIS)) return 1;
  return 2;
}

function computeShadowMeshScore(mesh) {
  if (!mesh.geometry.boundingBox) {
    mesh.geometry.computeBoundingBox();
  }

  const size = mesh.geometry.boundingBox.getSize(tmpVecA);
  const scale = mesh.scale;
  const volume =
    Math.abs(size.x * scale.x)
    * Math.abs(size.y * scale.y)
    * Math.abs(size.z * scale.z);

  return Number.isFinite(volume) && volume > 0 ? volume : 0.0001;
}

function setShadowObjectMeshesByLevel(entry, lodLevel) {
  if (!entry.meshEntries.length) return false;

  const total = entry.meshEntries.length;
  let keepCount = total;

  if (lodLevel === 1) {
    keepCount = Math.max(1, Math.ceil(total * 0.7));
  } else if (lodLevel === 2) {
    keepCount = Math.max(1, Math.ceil(total * SHADOW_OBJECT_SIMPLIFIED_MESH_THRESHOLD));
  }

  let changed = false;
  for (const meshEntry of entry.meshEntries) {
    const shouldCastShadow = meshEntry.baseCastShadow && meshEntry.rank < keepCount;
    if (meshEntry.mesh.castShadow !== shouldCastShadow) {
      meshEntry.mesh.castShadow = shouldCastShadow;
      changed = true;
    }
  }

  return changed;
}

function updateObjectShadowLod(entry, camera) {
  if (!entry.object3D) return false;

  entry.object3D.getWorldPosition(tmpVecA);
  const distance = tmpVecA.distanceTo(camera.position);
  const lodLevel = getDistanceLodLevel(
    distance,
    SHADOW_OBJECT_NEAR_DISTANCE,
    SHADOW_OBJECT_FAR_DISTANCE,
    entry.lodLevel
  );

  if (lodLevel === entry.lodLevel) return false;
  entry.lodLevel = lodLevel;

  return setShadowObjectMeshesByLevel(entry, lodLevel);
}

function getShadowLightProfile(lodLevel) {
  if (lodLevel === 0) {
    return {
      mapScale: SHADOW_LIGHT_MAP_SCALE_NEAR,
      radiusScale: SHADOW_LIGHT_RADIUS_SCALE_NEAR,
    };
  }

  if (lodLevel === 1) {
    return {
      mapScale: SHADOW_LIGHT_MAP_SCALE_MEDIUM,
      radiusScale: SHADOW_LIGHT_RADIUS_SCALE_MEDIUM,
    };
  }

  return {
    mapScale: SHADOW_LIGHT_MAP_SCALE_FAR,
    radiusScale: SHADOW_LIGHT_RADIUS_SCALE_FAR,
  };
}

function updateLightShadowLod(entry, camera) {
  const light = entry.light;
  if (!light || !light.shadow || !light.castShadow) return false;

  // Point-light cubemap shadow reallocations can cause visible one-frame flicker/pop.
  // Keep their shadow settings stable and only optimize other light types.
  if (light.isPointLight) return false;

  light.getWorldPosition(tmpVecA);
  const distance = tmpVecA.distanceTo(camera.position);
  const lodLevel = getDistanceLodLevel(
    distance,
    SHADOW_LIGHT_NEAR_DISTANCE,
    SHADOW_LIGHT_FAR_DISTANCE,
    entry.lodLevel
  );

  if (lodLevel === entry.lodLevel) return false;
  entry.lodLevel = lodLevel;

  const profile = getShadowLightProfile(lodLevel);
  const nextWidth = Math.max(128, Math.round(entry.baseMapSize.x * profile.mapScale));
  const nextHeight = Math.max(128, Math.round(entry.baseMapSize.y * profile.mapScale));
  const nextRadius = Math.max(0.1, entry.baseRadius * profile.radiusScale);

  const mapSizeChanged = light.shadow.mapSize.width !== nextWidth || light.shadow.mapSize.height !== nextHeight;
  const radiusChanged = Math.abs(light.shadow.radius - nextRadius) > 0.001;

  if (!mapSizeChanged && !radiusChanged) return false;

  light.shadow.mapSize.set(nextWidth, nextHeight);
  light.shadow.radius = nextRadius;

  return true;
}

function movedBeyondThreshold(object3D, previousPosition) {
  if (!object3D) return false;

  object3D.getWorldPosition(tmpVecA);
  const moved = tmpVecA.distanceToSquared(previousPosition) > (SHADOW_DYNAMIC_POSITION_EPSILON * SHADOW_DYNAMIC_POSITION_EPSILON);

  if (moved) {
    previousPosition.copy(tmpVecA);
  }

  return moved;
}

function registerShadowLight(light, options = {}) {
  if (!light || !light.isLight) return light;

  const staticLight = options.staticLight ?? true;
  tagShadowLight(light, staticLight);

  if (shadowLights.some((entry) => entry.light === light)) {
    return light;
  }

  shadowLights.push({
    light,
    baseMapSize: light.shadow
      ? new THREE.Vector2(light.shadow.mapSize.width, light.shadow.mapSize.height)
      : new THREE.Vector2(0, 0),
    baseRadius: light.shadow ? Math.max(0.1, light.shadow.radius || 1) : 1,
    lodLevel: -1,
    lastPosition: light.getWorldPosition(new THREE.Vector3()),
  });

  pendingShadowRefresh = true;
  return light;
}

function registerShadowObject(object3D, options = {}) {
  if (!object3D || !object3D.isObject3D) return object3D;

  const staticObject = options.staticObject ?? true;
  tagShadowObject(object3D, staticObject);

  if (shadowObjects.some((entry) => entry.object3D === object3D)) {
    return object3D;
  }

  const meshes = [];
  object3D.traverse((node) => {
    if (node.isMesh) {
      meshes.push(node);
    }
  });

  const rankedMeshes = meshes
    .map((mesh) => ({
      mesh,
      baseCastShadow: Boolean(mesh.castShadow),
      score: computeShadowMeshScore(mesh),
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry, rank) => ({
      mesh: entry.mesh,
      baseCastShadow: entry.baseCastShadow,
      rank,
    }));

  if (!rankedMeshes.some((entry) => entry.baseCastShadow)) {
    return object3D;
  }

  shadowObjects.push({
    object3D,
    meshEntries: rankedMeshes,
    lodLevel: -1,
    lastPosition: object3D.getWorldPosition(new THREE.Vector3()),
  });

  pendingShadowRefresh = true;
  return object3D;
}

function initShadowOptimizer(renderer) {
  rendererRef = renderer;
  hasInitialRefresh = false;
  pendingShadowRefresh = true;

  if (!rendererRef) return;
  rendererRef.shadowMap.autoUpdate = false;
}

function forceShadowRefresh(immediate = false) {
  pendingShadowRefresh = true;

  if (!rendererRef || !rendererRef.shadowMap.enabled) return;

  if (immediate) {
    rendererRef.shadowMap.needsUpdate = true;
    hasInitialRefresh = true;
    pendingShadowRefresh = false;
  }
}

function updateShadowOptimization(camera) {
  if (!rendererRef || !rendererRef.shadowMap.enabled || !camera) return false;

  let lodChanged = false;
  let dynamicMoved = false;

  for (const entry of shadowLights) {
    if (!entry.light) continue;

    lodChanged = updateLightShadowLod(entry, camera) || lodChanged;

    const isStaticLight = entry.light.userData.staticLight !== false;
    if (!isStaticLight && movedBeyondThreshold(entry.light, entry.lastPosition)) {
      dynamicMoved = true;
    }
  }

  for (const entry of shadowObjects) {
    if (!entry.object3D) continue;

    lodChanged = updateObjectShadowLod(entry, camera) || lodChanged;

    const isStaticObject = entry.object3D.userData.staticObject !== false;
    if (!isStaticObject && movedBeyondThreshold(entry.object3D, entry.lastPosition)) {
      dynamicMoved = true;
    }
  }

  if (lodChanged || dynamicMoved || !hasInitialRefresh) {
    pendingShadowRefresh = true;
  }

  if (!pendingShadowRefresh) return false;

  rendererRef.shadowMap.needsUpdate = true;
  hasInitialRefresh = true;
  pendingShadowRefresh = false;
  return true;
}

export {
  initShadowOptimizer,
  updateShadowOptimization,
  forceShadowRefresh,
  registerShadowLight,
  registerShadowObject,
  tagShadowLight,
  tagShadowObject,
};
