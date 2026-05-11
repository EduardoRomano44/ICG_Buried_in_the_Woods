import * as THREE from 'three';

const colliders = [];
const tempBox = new THREE.Box3();
const tempVector = new THREE.Vector3();
const tempSize = new THREE.Vector3();

/**
 * Registers a new collider.
 * @param {THREE.Object3D} obj
 * @param {object} options
 */
export function addCollider(obj, options = {}) {
  colliders.push({
    obj,
    dynamic: Boolean(options.dynamic),
    boundsScale: Number.isFinite(options.boundsScale) ? Math.max(0.1, options.boundsScale) : 1,
    box: null,
  });
}

/**
 * Removes a registered collider.
 * @param {THREE.Object3D} obj
 */
export function removeCollider(obj) {
  const index = colliders.findIndex((collider) => collider.obj === obj);
  if (index >= 0) {
    colliders.splice(index, 1);
  }
}

/**
 * Removes all registered colliders.
 */
export function clearAllColliders() {
  colliders.length = 0;
}

/**
 * Checks if a given position intersects with any collider.
 * @param {THREE.Vector3} position
 * @param {number} radius
 * @param {number} height
 * @param {number} yOffset
 * @param {THREE.Object3D} ignoreObj
 * @returns {boolean}
 */
export function checkObjectCollision(position, radius, height, yOffset = -0.1, ignoreObj = null) {
  tempBox.min.set(position.x - radius, position.y + yOffset, position.z - radius);
  tempBox.max.set(position.x + radius, position.y + yOffset + height, position.z + radius);

  for (const collider of colliders) {
    if (collider.obj === ignoreObj) continue;

    if (!collider.box || collider.dynamic) {
      collider.obj.updateWorldMatrix(true, false);
      if (!collider.box) collider.box = new THREE.Box3();
      collider.box.setFromObject(collider.obj);

      if (collider.boundsScale !== 1) {
        collider.box.getCenter(tempVector);
        collider.box.getSize(tempSize).multiplyScalar(collider.boundsScale);
        collider.box.setFromCenterAndSize(tempVector, tempSize);
      }
    }

    if (tempBox.intersectsBox(collider.box)) {
      return true;
    }
  }
  return false;
}

/**
 * Specialized intersection check for hitboxes (e.g. slimes).
 * @param {THREE.Vector3} playerPosition
 * @param {number} radius
 * @param {number} playerHeight
 * @param {number} playerCollisionRadius
 * @param {THREE.Vector3} center
 * @param {number} sphereRadius
 * @returns {boolean}
 */
export function intersectsPlayerHitboxSphere(playerPosition, playerHeight, playerCollisionRadius, center, sphereRadius) {
  const r = playerCollisionRadius;
  const hitbox = new THREE.Box3(
    new THREE.Vector3(playerPosition.x - r, 0.1, playerPosition.z - r),
    new THREE.Vector3(playerPosition.x + r, playerHeight, playerPosition.z + r)
  );

  return hitbox.distanceToPoint(center) <= sphereRadius;
}
