import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { enableShadows } from '../../../utils/helpers.js';
import { createInstancedGroup, createInvisibleCollider } from '../../../utils/InstancingUtils.js';
import {
  BASEMENT_MAPPING_MODEL_PATH,
  BASEMENT_MAPPING_SCALE,
  BASEMENT_WALL1_LOCAL_OFFSET,
  BASEMENT_WALL2_LOCAL_OFFSET,
  DOOR_METAL_MODEL_PATH,
  COOKIE_MODEL_PATH,
  KEY_MODEL_PATH,
  SLIME_MODEL_PATH,
  TABLE_MODEL_PATH,
  SLIME_SCALE,
  TABLE_SCALE,
  COOKIE_SCALE,
  CANDLE_MODEL_PATH,
  CANDLE_SCALE,
} from '../../../config/constants.js';
import { createSlimeIdle } from '../../../animations/slime/slimeIdle.js';
import { createDoorMetalSystem } from '../systems/BasementDoorMetalSystem.js';
import { createCandleSystem } from '../systems/CandleSystem.js';
import { registerWorldKey } from '../systems/KeySystem.js';
import { registerWorldCookie } from '../systems/CookieSystem.js';

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
const tempSourceInverseMatrix = new THREE.Matrix4();
const tempRelativeMatrix = new THREE.Matrix4();
const tempBox = new THREE.Box3();
const tempBoxCenter = new THREE.Vector3();

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
    ceilNodes: [],
    wall1Node: null,
    wall2Node: null,
    anchors: {
      t1: [],
      t2: [],
      md: [],
      player: [],
      slime: [],
      table: [],
      candle: [],
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

    if (baseName === 'ceil' && !data.ceilNodes.includes(child)) {
      data.ceilNodes.push(child);
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
    } else if (baseName.startsWith('md')) {
      data.anchors.md.push(child);
    } else if (baseName.startsWith('player')) {
      data.anchors.player.push(child);
    } else if (baseName.startsWith('slime')) {
      data.anchors.slime.push(child);
    } else if (baseName.startsWith('table')) {
      data.anchors.table.push(child);
    } else if (baseName.startsWith('v')) {
      data.anchors.candle.push(child);
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
  if (!root) return {};
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

function getLocalMeshBoxes(sourceNode) {
  const boxes = [];

  sourceNode.updateWorldMatrix(true, true);
  tempSourceInverseMatrix.copy(sourceNode.matrixWorld).invert();

  sourceNode.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;

    const geometry = child.geometry;
    if (!geometry.boundingBox) {
      geometry.computeBoundingBox();
    }
    if (!geometry.boundingBox) return;

    child.updateWorldMatrix(true, false);
    tempRelativeMatrix.multiplyMatrices(tempSourceInverseMatrix, child.matrixWorld);
    const localBox = geometry.boundingBox.clone().applyMatrix4(tempRelativeMatrix);
    const size = localBox.getSize(new THREE.Vector3());

    boxes.push({
      box: localBox,
      height: size.y,
    });
  });

  return boxes;
}

function getWallPivotOffset(sourceNode, prefix) {
  const meshBoxes = getLocalMeshBoxes(sourceNode);
  if (meshBoxes.length === 0) {
    return getWallLocalOffset(prefix);
  }

  let lowestPart = meshBoxes[0];
  for (let i = 1; i < meshBoxes.length; i++) {
    const candidate = meshBoxes[i];
    if (candidate.height < lowestPart.height) {
      lowestPart = candidate;
      continue;
    }

    if (Math.abs(candidate.height - lowestPart.height) <= 0.0001
      && candidate.box.min.y < lowestPart.box.min.y) {
      lowestPart = candidate;
    }
  }

  const userOffset = getWallLocalOffset(prefix);
  lowestPart.box.getCenter(tempBoxCenter);

  return new THREE.Vector3(
    userOffset.x - tempBoxCenter.x,
    userOffset.y - lowestPart.box.min.y,
    userOffset.z - tempBoxCenter.z
  );
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

function buildClonedGroup(root, sourceNode, anchors, registerCollider, prefix) {
  if (!anchors || anchors.length === 0) return 0;

  // Prepare template for InstancedMesh
  const templateRoot = new THREE.Group();
  templateRoot.name = `${prefix}_Template`;
  
  const templateNode = sourceNode.clone(true);
  const localOffset = getWallPivotOffset(sourceNode, prefix);
  templateNode.position.set(localOffset.x, localOffset.y, localOffset.z);
  templateNode.quaternion.copy(sourceNode.quaternion);
  templateNode.scale.copy(sourceNode.scale);
  templateNode.name = `${prefix}Instance`;
  
  setShadowProfile(templateNode, {
    castShadow: true,
    receiveShadow: false,
  });

  templateRoot.add(templateNode);
  templateRoot.updateMatrixWorld(true);

  const transforms = anchors.map(anchor => {
    return {
      position: anchor.getWorldPosition(new THREE.Vector3()),
      rotation: anchor.getWorldQuaternion(new THREE.Quaternion()),
      scale: anchor.getWorldScale(new THREE.Vector3())
    };
  });

  const instancedGroup = createInstancedGroup(templateRoot, transforms);
  root.add(instancedGroup);

  transforms.forEach(transform => {
    const collider = createInvisibleCollider(templateRoot, transform.position, transform.rotation, transform.scale);
    root.add(collider);
    addColliderForObject(root, collider, registerCollider);
  });

  return anchors.length;
}

async function loadBasementMapping(options = {}) {
  const {
    scene = null,
    registerCollider = null,
    modelPath = BASEMENT_MAPPING_MODEL_PATH,
  } = options;

  const [
    gltf,
    doorMetalGltf,
    keyGltf,
    cookieGltf,
    slimeGltf,
    tableGltf,
    candleGltf
  ] = await Promise.all([
    loadGLTF(modelPath),
    loadGLTF(DOOR_METAL_MODEL_PATH),
    loadGLTF(KEY_MODEL_PATH),
    loadGLTF(COOKIE_MODEL_PATH),
    loadGLTF(SLIME_MODEL_PATH),
    loadGLTF(TABLE_MODEL_PATH),
    loadGLTF(CANDLE_MODEL_PATH)
  ]);

  const gltfRoot = gltf.scene;
  gltfRoot.updateMatrixWorld(true);
  const materialStats = prepareBasementMaterials(gltfRoot);

  const doorMetalNode = doorMetalGltf.scene || doorMetalGltf.scenes?.[0] || new THREE.Group();
  const keyNode = keyGltf.scene || keyGltf.scenes?.[0] || new THREE.Group();
  const cookieNode = cookieGltf.scene || cookieGltf.scenes?.[0] || new THREE.Group();
  const slimeNode = slimeGltf.scene || slimeGltf.scenes?.[0] || new THREE.Group();
  const tableNode = tableGltf.scene || tableGltf.scenes?.[0] || new THREE.Group();
  const candleNode = candleGltf.scene || candleGltf.scenes?.[0] || new THREE.Group();

  prepareBasementMaterials(doorMetalNode);
  prepareBasementMaterials(keyNode);
  prepareBasementMaterials(cookieNode);
  prepareBasementMaterials(slimeNode);
  prepareBasementMaterials(tableNode);
  prepareBasementMaterials(candleNode);

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
  const groundInstances = [];
  const ceilInstances = [];

  for (const floorNode of namedData.floorNodes) {
    const floorClone = cloneNodeWithWorldTransform(floorNode);
    floorClone.name = 'GroundInstance';
    setShadowProfile(floorClone, {
      castShadow: false,
      receiveShadow: true,
    });
    basementRoot.add(floorClone);
    groundInstances.push(floorClone);
  }

  for (const ceilNode of namedData.ceilNodes) {
    const ceilClone = cloneNodeWithWorldTransform(ceilNode);
    ceilClone.name = 'CeilInstance';
    setShadowProfile(ceilClone, {
      castShadow: false,
      receiveShadow: false,
    });
    basementRoot.add(ceilClone);
    ceilInstances.push(ceilClone);
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

  function buildStandardClonedGroup(root, sourceNode, anchors, regCollider, prefix, addCollider, scale = 1) {
    let count = 0;
    const instances = [];
    for (const anchor of anchors) {
      const instanceRoot = new THREE.Group();
      instanceRoot.name = `${prefix}Anchor`;
      copyWorldTransform(instanceRoot, anchor);

      const clone = sourceNode.clone(true);
      enableShadows(clone);
      clone.name = sourceNode.name || `${prefix}Instance`;
      clone.position.set(0, 0, 0);
      clone.quaternion.set(0, 0, 0, 1);
      clone.scale.setScalar(scale);
      setShadowProfile(clone, { castShadow: true, receiveShadow: true });

      instanceRoot.add(clone);
      instanceRoot.updateMatrixWorld(true);
      root.add(instanceRoot);

      if (addCollider && typeof regCollider === 'function') {
        if (prefix === 'Slime') {
          regCollider(instanceRoot, { dynamic: true });
        } else {
          regCollider(instanceRoot);
        }
      }

      instances.push(instanceRoot);
      count++;
    }
    return { count, instances };
  }

  const doorMetalGroup = buildStandardClonedGroup(basementRoot, doorMetalNode, namedData.anchors.md, registerCollider, 'DoorMetal', true, 1);
  const slimeGroup = buildStandardClonedGroup(basementRoot, slimeNode, namedData.anchors.slime, registerCollider, 'Slime', true, SLIME_SCALE);
  const tableGroup = buildStandardClonedGroup(basementRoot, tableNode, namedData.anchors.table, registerCollider, 'Table', true, TABLE_SCALE);
  const candleGroup = buildStandardClonedGroup(basementRoot, candleNode, namedData.anchors.candle, registerCollider, 'Candle', false, CANDLE_SCALE);

  for (const slimeRoot of slimeGroup.instances) {
    createSlimeIdle(slimeRoot);
  }
 
  for (const candleRoot of candleGroup.instances) {
    const candleClone = candleRoot.children[0];
    if (candleClone) {
      createCandleSystem(candleClone, candleGltf.animations);
    }
  }

  for (const doorMetalRoot of doorMetalGroup.instances) {
    // The actual clone is the first child of the anchor root
    const doorMetalClone = doorMetalRoot.children[0];
    if (doorMetalClone) {
      createDoorMetalSystem(doorMetalClone, doorMetalGltf.animations, {
        onExit: options.onExitBasement || (() => window.location.reload())
      });
    }
  }

  const doorMetalInstances = doorMetalGroup.count;
  const slimeInstances = slimeGroup.count;
  const tableInstances = tableGroup.count;

  let playerSpawnNode = null;
  if (namedData.anchors.player.length > 0) {
    playerSpawnNode = new THREE.Group();
    copyWorldTransform(playerSpawnNode, namedData.anchors.player[0]);
    playerSpawnNode.name = 'PlayerSpawn';
    basementRoot.add(playerSpawnNode);
  }

  if (namedData.anchors.table.length > 0) {
    const tableAnchors = [...namedData.anchors.table];

    // 1. Spawn Key
    const keyIdx = Math.floor(Math.random() * tableAnchors.length);
    const keyAnchor = tableAnchors.splice(keyIdx, 1)[0];

    const keyInstanceRoot = new THREE.Group();
    keyInstanceRoot.name = 'KeyAnchor';
    copyWorldTransform(keyInstanceRoot, keyAnchor);

    const keyClone = keyNode.clone(true);
    enableShadows(keyClone);
    keyClone.name = 'KeyInstance';

    const tableBox = new THREE.Box3().setFromObject(tableNode);
    let tableTopY = tableBox.max.y;
    if (tableTopY === -Infinity) tableTopY = 0;

    keyClone.position.set(0, tableTopY * TABLE_SCALE, 0);
    keyClone.quaternion.set(0, 0, 0, 1);
    keyClone.scale.set(1, 1, 1);
    setShadowProfile(keyClone, { castShadow: true, receiveShadow: true });

    keyInstanceRoot.add(keyClone);
    keyInstanceRoot.updateMatrixWorld(true);
    basementRoot.add(keyInstanceRoot);
    registerWorldKey(keyClone);

    // 2. Spawn Cookies (up to 2)
    const cookieCount = Math.min(2, tableAnchors.length);
    for (let i = 0; i < cookieCount; i++) {
      const cookieIdx = Math.floor(Math.random() * tableAnchors.length);
      const cookieAnchor = tableAnchors.splice(cookieIdx, 1)[0];

      const cookieInstanceRoot = new THREE.Group();
      cookieInstanceRoot.name = `CookieAnchor_${i}`;
      copyWorldTransform(cookieInstanceRoot, cookieAnchor);

      const cookieClone = cookieNode.clone(true);
      enableShadows(cookieClone);
      cookieClone.name = `CookieInstance_${i}`;

      // Place it on top of the table
      cookieClone.position.set(0, tableTopY * TABLE_SCALE, 0);
      cookieClone.quaternion.set(0, 0, 0, 1);
      cookieClone.scale.setScalar(COOKIE_SCALE);
      setShadowProfile(cookieClone, { castShadow: true, receiveShadow: true });

      cookieInstanceRoot.add(cookieClone);
      cookieInstanceRoot.updateMatrixWorld(true);
      basementRoot.add(cookieInstanceRoot);
      registerWorldCookie(cookieClone);
    }
  }

  if (scene) {
    scene.add(basementRoot);
  }

  return {
    root: basementRoot,
    grounds: groundInstances,
    ceilings: ceilInstances,
    playerSpawn: playerSpawnNode,
    stats: {
      wall1Instances,
      wall2Instances,
      doorMetalInstances,
      slimeInstances,
      tableInstances,
      ceilInstances: ceilInstances.length,
      colliderCount: wall1Instances + wall2Instances + doorMetalInstances + tableInstances,
      materialsWithColorMap: materialStats.materialsWithColorMap,
      materialsWithNormalMap: materialStats.materialsWithNormalMap,
      materialsWithRoughnessMap: materialStats.materialsWithRoughnessMap,
    },
  };
}

export {
  loadBasementMapping,
};
