import * as THREE from 'three';
import {
  SHADOW_UPDATE_INTERVAL_FRAMES,
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

const shadowLights = [];
const shadowObjects = [];

const tmpVecA = new THREE.Vector3();

let rendererRef = null;
let frameCounter = 0;
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

function getDistanceLodLevel(distance, nearDistance, farDistance) {
  if (distance <= nearDistance) return 0;
  if (distance <= farDistance) return 1;
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
  const lodLevel = getDistanceLodLevel(distance, SHADOW_OBJECT_NEAR_DISTANCE, SHADOW_OBJECT_FAR_DISTANCE);

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

  light.getWorldPosition(tmpVecA);
  const distance = tmpVecA.distanceTo(camera.position);
  const lodLevel = getDistanceLodLevel(distance, SHADOW_LIGHT_NEAR_DISTANCE, SHADOW_LIGHT_FAR_DISTANCE);

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

  if (light.shadow.map) {
    light.shadow.map.dispose();
    light.shadow.map = null;
  }

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
  frameCounter = 0;
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

  frameCounter += 1;
  if (!pendingShadowRefresh) return false;
  if (frameCounter % SHADOW_UPDATE_INTERVAL_FRAMES !== 0) return false;

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
