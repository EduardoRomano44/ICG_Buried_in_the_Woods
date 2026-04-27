import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { enableShadows } from '../../utils/helpers.js';
import {
  BASEMENT_MAPPING_MODEL_PATH,
  BASEMENT_MAPPING_SCALE,
  BASEMENT_WALL1_LOCAL_OFFSET,
  BASEMENT_WALL2_LOCAL_OFFSET,
} from '../../config/constants.js';

const loader = new GLTFLoader();

const INVISIBLE_COLLIDER_MATERIAL = new THREE.MeshBasicMaterial({
  colorWrite: false,
  depthWrite: false,
});

const BLENDER_DUPLICATE_SUFFIX_REGEX = /\.\d{3}$/;
const NON_COLOR_TEXTURE_COLOR_SPACE = 'NoColorSpace' in THREE ? THREE.NoColorSpace : null;
const tempPosition = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const tempScale = new THREE.Vector3();

function loadGLTF(modelPath) {
  return new Promise((resolve, reject) => {
    loader.load(modelPath, resolve, undefined, reject);
  });
}

function normalizeName(name) {
  if (typeof name !== 'string') return '';
  return name.trim().toLowerCase();
}

function getBaseName(name) {
  return normalizeName(name).replace(BLENDER_DUPLICATE_SUFFIX_REGEX, '');
}

function collectNamedBasementData(root) {
  const data = {
    floorNodes: [],
    wall1Node: null,
    wall2Node: null,
    anchors: {
      t1: [],
      t2: [],
    },
    debugNames: [],
  };

  root.traverse((child) => {
    const objectName = child.name?.trim() || '';
    if (objectName) {
      data.debugNames.push(objectName);
    }

    const baseName = getBaseName(objectName);

    if (baseName === 'ground' && !data.floorNodes.includes(child)) {
      data.floorNodes.push(child);
    }

    if (baseName === 'wall1' && !data.wall1Node) {
      data.wall1Node = child;
    }

    if (baseName === 'wall2' && !data.wall2Node) {
      data.wall2Node = child;
    }

    if (baseName.startsWith('t1')) {
      data.anchors.t1.push(child);
    } else if (baseName.startsWith('t2')) {
      data.anchors.t2.push(child);
    }
  });

  return data;
}

function createMissingNodesDebugHint(namedData) {
  const uniqueNames = Array.from(new Set(namedData.debugNames));
  const sample = uniqueNames.slice(0, 30).join(', ');
  const suffix = uniqueNames.length > 30 ? ', ...' : '';
  return `Found nodes in GLB: ${sample}${suffix}`;
}

function setTextureColorSpace(texture, colorSpace) {
  if (!texture || !colorSpace || !('colorSpace' in texture)) return;
  texture.colorSpace = colorSpace;
}

function configureImportedMaterial(material) {
  if (!material) {
    return {
      hasColorMap: false,
      hasNormalMap: false,
      hasRoughnessMap: false,
    };
  }

  const hasColorMap = Boolean(material.map);
  const hasNormalMap = Boolean(material.normalMap);
  const hasRoughnessMap = Boolean(material.roughnessMap);

  setTextureColorSpace(material.map, THREE.SRGBColorSpace);
  setTextureColorSpace(material.emissiveMap, THREE.SRGBColorSpace);
  setTextureColorSpace(material.normalMap, NON_COLOR_TEXTURE_COLOR_SPACE);
  setTextureColorSpace(material.roughnessMap, NON_COLOR_TEXTURE_COLOR_SPACE);
  setTextureColorSpace(material.metalnessMap, NON_COLOR_TEXTURE_COLOR_SPACE);
  setTextureColorSpace(material.aoMap, NON_COLOR_TEXTURE_COLOR_SPACE);

  if (hasNormalMap && material.normalScale?.lengthSq?.() === 0) {
    material.normalScale.set(1, 1);
  }

  material.needsUpdate = true;

  return {
    hasColorMap,
    hasNormalMap,
    hasRoughnessMap,
  };
}

function prepareBasementMaterials(root) {
  const visitedMaterials = new Set();
  const stats = {
    materialsWithColorMap: 0,
    materialsWithNormalMap: 0,
    materialsWithRoughnessMap: 0,
  };

  root.traverse((child) => {
    if (!child.isMesh) return;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    for (const material of materials) {
      if (!material || visitedMaterials.has(material)) continue;

      visitedMaterials.add(material);
      const result = configureImportedMaterial(material);
      if (result.hasColorMap) stats.materialsWithColorMap++;
      if (result.hasNormalMap) stats.materialsWithNormalMap++;
      if (result.hasRoughnessMap) stats.materialsWithRoughnessMap++;
    }
  });

  return stats;
}

function applyMatrixTransform(object3d, matrix) {
  matrix.decompose(tempPosition, tempQuaternion, tempScale);
  object3d.position.copy(tempPosition);
  object3d.quaternion.copy(tempQuaternion);
  object3d.scale.copy(tempScale);
  object3d.updateMatrixWorld(true);
}

function copyWorldTransform(target, source) {
  source.updateWorldMatrix(true, false);
  applyMatrixTransform(target, source.matrixWorld);
}

function cloneNodeWithWorldTransform(sourceNode) {
  sourceNode.updateWorldMatrix(true, false);

  const clone = sourceNode.clone(true);
  applyMatrixTransform(clone, sourceNode.matrixWorld);
  enableShadows(clone);

  return clone;
}

function setShadowProfile(root, options = {}) {
  const {
    castShadow = true,
    receiveShadow = true,
  } = options;

  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = castShadow;
    child.receiveShadow = receiveShadow;
  });
}

function addColliderForObject(root, object3d, registerCollider) {
  const colliderBox = new THREE.Box3().setFromObject(object3d);
  const size = colliderBox.getSize(new THREE.Vector3());
  const center = colliderBox.getCenter(new THREE.Vector3());

  size.x = Math.max(size.x, 0.01);
  size.y = Math.max(size.y, 0.01);
  size.z = Math.max(size.z, 0.01);

  const collider = new THREE.Mesh(
    new THREE.BoxGeometry(size.x, size.y, size.z),
    INVISIBLE_COLLIDER_MATERIAL
  );
  collider.position.copy(center);
  collider.name = 'BasementWallCollider';
  collider.updateMatrixWorld(true);

  root.add(collider);

  if (typeof registerCollider === 'function') {
    registerCollider(collider);
  }

  return collider;
}

function getWallLocalOffset(prefix) {
  const rawOffset = prefix === 'Wall1'
    ? BASEMENT_WALL1_LOCAL_OFFSET
    : BASEMENT_WALL2_LOCAL_OFFSET;

  return new THREE.Vector3(
    Number.isFinite(rawOffset?.x) ? rawOffset.x : 0,
    Number.isFinite(rawOffset?.y) ? rawOffset.y : 0,
    Number.isFinite(rawOffset?.z) ? rawOffset.z : 0
  );
}

function createAnchorInstance(sourceNode, anchor, prefix) {
  const instanceRoot = new THREE.Group();
  instanceRoot.name = `${prefix}Anchor`;
  copyWorldTransform(instanceRoot, anchor);

  const clone = sourceNode.clone(true);
  enableShadows(clone);

  const localOffset = getWallLocalOffset(prefix);
  clone.position.set(
    localOffset.x,
    sourceNode.position.y + localOffset.y,
    localOffset.z
  );
  clone.quaternion.copy(sourceNode.quaternion);
  clone.scale.copy(sourceNode.scale);
  clone.name = `${prefix}Instance`;
  clone.updateMatrixWorld(true);
  setShadowProfile(clone, {
    castShadow: true,
    receiveShadow: false,
  });

  instanceRoot.add(clone);
  instanceRoot.updateMatrixWorld(true);

  return instanceRoot;
}

function buildClonedGroup(root, sourceNode, anchors, registerCollider, prefix) {
  let count = 0;

  for (const anchor of anchors) {
    const anchorInstance = createAnchorInstance(sourceNode, anchor, prefix);
    root.add(anchorInstance);
    addColliderForObject(root, anchorInstance, registerCollider);
    count++;
  }

  return count;
}

async function loadBasementMapping(options = {}) {
  const {
    scene = null,
    registerCollider = null,
    modelPath = BASEMENT_MAPPING_MODEL_PATH,
  } = options;

  const gltf = await loadGLTF(modelPath);
  const gltfRoot = gltf.scene;
  gltfRoot.updateMatrixWorld(true);
  const materialStats = prepareBasementMaterials(gltfRoot);

  const namedData = collectNamedBasementData(gltfRoot);
  const debugHint = createMissingNodesDebugHint(namedData);

  if (!namedData.floorNodes.length) {
    throw new Error(`Basement mapping GLB is missing mesh or node named Ground. ${debugHint}`);
  }

  if (!namedData.wall1Node || !namedData.wall2Node) {
    throw new Error(`Basement mapping GLB must contain nodes named Wall1 and Wall2. ${debugHint}`);
  }

  if (namedData.anchors.t1.length === 0 && namedData.anchors.t2.length === 0) {
    throw new Error(`Basement mapping GLB is missing mapping objects named t1.* or t2.*. ${debugHint}`);
  }

  const basementRoot = new THREE.Group();
  basementRoot.name = 'BasementRoot';
  basementRoot.scale.setScalar(BASEMENT_MAPPING_SCALE);

  for (const floorNode of namedData.floorNodes) {
    const floorClone = cloneNodeWithWorldTransform(floorNode);
    floorClone.name = 'GroundInstance';
    setShadowProfile(floorClone, {
      castShadow: false,
      receiveShadow: true,
    });
    basementRoot.add(floorClone);
  }

  const wall1Instances = buildClonedGroup(
    basementRoot,
    namedData.wall1Node,
    namedData.anchors.t1,
    registerCollider,
    'Wall1'
  );

  const wall2Instances = buildClonedGroup(
    basementRoot,
    namedData.wall2Node,
    namedData.anchors.t2,
    registerCollider,
    'Wall2'
  );

  if (scene) {
    scene.add(basementRoot);
  }

  return {
    root: basementRoot,
    stats: {
      wall1Instances,
      wall2Instances,
      colliderCount: wall1Instances + wall2Instances,
      materialsWithColorMap: materialStats.materialsWithColorMap,
      materialsWithNormalMap: materialStats.materialsWithNormalMap,
      materialsWithRoughnessMap: materialStats.materialsWithRoughnessMap,
    },
  };
}

export {
  loadBasementMapping,
};
