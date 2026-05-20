import * as THREE from 'three';

const invisibleMaterial = new THREE.MeshBasicMaterial({ visible: false, wireframe: false });

/**
 * Creates a Group of InstancedMeshes from a loaded template and a list of transforms.
 * @param {THREE.Object3D} template - The original GLTF model or Object3D.
 * @param {Array<{position: THREE.Vector3, rotation: THREE.Euler|THREE.Quaternion|number, scale: THREE.Vector3|number}>} transforms - The instances.
 * @returns {THREE.Group} Group containing the instanced meshes.
 */
export function createInstancedGroup(template, transforms) {
  const count = transforms.length;
  const instancedGroup = new THREE.Group();
  
  const meshes = [];
  template.traverse((child) => {
    if (child.isMesh && child.geometry) {
      meshes.push(child);
    }
  });

  const dummyMatrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  // Ensure template is at origin for accurate local matrices
  const oldPos = template.position.clone();
  const oldQuat = template.quaternion.clone();
  const oldScale = template.scale.clone();
  template.position.set(0, 0, 0);
  template.quaternion.identity();
  template.scale.set(1, 1, 1);
  template.updateMatrixWorld(true);

  meshes.forEach((mesh) => {
    const localMatrix = mesh.matrixWorld.clone();
    
    // Bake local transforms into the geometry to avoid normal matrix corruption in shaders
    const instancedGeometry = mesh.geometry.clone();
    instancedGeometry.applyMatrix4(localMatrix);

    // FIX: If the local transform has a negative scale, the geometry is flipped inside out.
    // Three.js normally handles this with gl.frontFace, but for InstancedMesh with baked matrices, we MUST manually fix the geometry.
    if (localMatrix.determinant() < 0) {
      // 1. Reverse winding order to fix Face Culling
      if (instancedGeometry.index) {
        const indexArray = instancedGeometry.index.array;
        for (let j = 0; j < indexArray.length; j += 3) {
          const temp = indexArray[j + 1];
          indexArray[j + 1] = indexArray[j + 2];
          indexArray[j + 2] = temp;
        }
      } else {
        const posAttr = instancedGeometry.attributes.position;
        const normAttr = instancedGeometry.attributes.normal;
        const uvAttr = instancedGeometry.attributes.uv;
        const tangAttr = instancedGeometry.attributes.tangent;

        for (let j = 0; j < posAttr.count; j += 3) {
          // Swap v1 and v2
          let px = posAttr.getX(j + 1), py = posAttr.getY(j + 1), pz = posAttr.getZ(j + 1);
          posAttr.setXYZ(j + 1, posAttr.getX(j + 2), posAttr.getY(j + 2), posAttr.getZ(j + 2));
          posAttr.setXYZ(j + 2, px, py, pz);

          if (normAttr) {
            let nx = normAttr.getX(j + 1), ny = normAttr.getY(j + 1), nz = normAttr.getZ(j + 1);
            normAttr.setXYZ(j + 1, normAttr.getX(j + 2), normAttr.getY(j + 2), normAttr.getZ(j + 2));
            normAttr.setXYZ(j + 2, nx, ny, nz);
          }

          if (uvAttr) {
            let ux = uvAttr.getX(j + 1), uy = uvAttr.getY(j + 1);
            uvAttr.setXY(j + 1, uvAttr.getX(j + 2), uvAttr.getY(j + 2));
            uvAttr.setXY(j + 2, ux, uy);
          }

          if (tangAttr) {
            let tx = tangAttr.getX(j + 1), ty = tangAttr.getY(j + 1), tz = tangAttr.getZ(j + 1), tw = tangAttr.getW(j + 1);
            tangAttr.setXYZW(j + 1, tangAttr.getX(j + 2), tangAttr.getY(j + 2), tangAttr.getZ(j + 2), tangAttr.getW(j + 2));
            tangAttr.setXYZW(j + 2, tx, ty, tz, tw);
          }
        }
      }

      // 2. Invert Tangent Handedness (.w) to fix Normal Maps
      if (instancedGeometry.attributes.tangent) {
        const tangAttr = instancedGeometry.attributes.tangent;
        for (let j = 0; j < tangAttr.count; j++) {
          tangAttr.setW(j, -tangAttr.getW(j));
        }
      }
    }

    // Clone material to ensure it correctly compiles for USE_INSTANCING without conflicting
    let instancedMaterial = mesh.material;
    if (mesh.material) {
      instancedMaterial = mesh.material.clone();
      instancedMaterial.needsUpdate = true;
    }

    const instancedMesh = new THREE.InstancedMesh(instancedGeometry, instancedMaterial, count);
    instancedMesh.castShadow = mesh.castShadow;
    instancedMesh.receiveShadow = mesh.receiveShadow;
    instancedMesh.name = `${mesh.name}_Instanced`;

    for (let i = 0; i < count; i++) {
      const transform = transforms[i];
      
      position.copy(transform.position);
      
      if (transform.rotation instanceof THREE.Quaternion) {
        quaternion.copy(transform.rotation);
      } else if (transform.rotation instanceof THREE.Euler) {
        quaternion.setFromEuler(transform.rotation);
      } else if (typeof transform.rotation === 'number') {
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), transform.rotation);
      } else {
        quaternion.identity();
      }

      if (transform.scale instanceof THREE.Vector3) {
        scale.copy(transform.scale);
      } else if (typeof transform.scale === 'number') {
        scale.set(transform.scale, transform.scale, transform.scale);
      } else {
        scale.set(1, 1, 1);
      }

      dummyMatrix.compose(position, quaternion, scale);
      
      // We no longer multiply by localMatrix because it is baked into the geometry
      instancedMesh.setMatrixAt(i, dummyMatrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedGroup.add(instancedMesh);
  });

  // Restore template
  template.position.copy(oldPos);
  template.quaternion.copy(oldQuat);
  template.scale.copy(oldScale);
  template.updateMatrixWorld(true);

  return instancedGroup;
}

/**
 * Creates an invisible collision box for a specific model instance.
 * @param {THREE.Object3D} template - The template model to derive bounds from.
 * @param {THREE.Vector3} position - World position.
 * @param {THREE.Euler|THREE.Quaternion|number} rotation - World rotation.
 * @param {THREE.Vector3|number} scale - World scale.
 * @param {string} [targetMeshName] - If provided, computes bounds from this specific child mesh instead of the whole template.
 * @returns {THREE.Mesh} The invisible collision mesh.
 */
export function createInvisibleCollider(template, position, rotation, scale = 1, targetMeshName = null) {
  const oldPos = template.position.clone();
  const oldQuat = template.quaternion.clone();
  const oldScale = template.scale.clone();
  
  template.position.set(0, 0, 0);
  template.quaternion.identity();
  template.scale.set(1, 1, 1);
  template.updateMatrixWorld(true);

  let targetNode = template;
  if (targetMeshName) {
    template.traverse((obj) => {
      if (obj.isMesh && obj.name === targetMeshName) {
        targetNode = obj;
      }
    });
  }

  // Calculate local bounding box
  const box = new THREE.Box3().setFromObject(targetNode);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  template.position.copy(oldPos);
  template.quaternion.copy(oldQuat);
  template.scale.copy(oldScale);
  template.updateMatrixWorld(true);

  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  geometry.translate(center.x, center.y, center.z);

  const collider = new THREE.Mesh(geometry, invisibleMaterial);
  collider.position.copy(position);
  
  if (rotation instanceof THREE.Quaternion) {
    collider.quaternion.copy(rotation);
  } else if (rotation instanceof THREE.Euler) {
    collider.rotation.copy(rotation);
  } else if (typeof rotation === 'number') {
    collider.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
  }
  
  if (scale instanceof THREE.Vector3) {
    collider.scale.copy(scale);
  } else if (typeof scale === 'number') {
    collider.scale.set(scale, scale, scale);
  }
  
  collider.name = 'InvisibleCollider';

  return collider;
}
