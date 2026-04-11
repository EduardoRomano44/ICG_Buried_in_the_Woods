/**
 * Grass.js — Instanced, shader-animated grass patches
 *
 * Each "patch" is a cluster of GRASS_PATCH_SIZE blades placed close together.
 * Total blade count = GRASS_COUNT * GRASS_PATCH_SIZE.
 *
 * Each blade is a tapered quad (4-sided prism, 3 segments tall) so it has visible
 * thickness and reads as a small 3-D bush — fitting the artstyle.
 *
 * Wind: a single ShaderMaterial uniform drives all blades in the same direction.
 */

import * as THREE from 'three';
import { scene } from '../core/SceneManager.js';
import {
  GROUND_SIZE,
  GRASS_SEGMENTS,
  GRASS_COUNT,
  GRASS_PATCH_SIZE,
  GRASS_BLADE_WIDTH,
  GRASS_BLADE_HEIGHT,
  GRASS_SPREAD,
  GRASS_COLOR_BASE,
  GRASS_COLOR_TIP,
  GRASS_EXCLUSION_RADIUS,
  GRASS_BLOCKER_RAY_HEIGHT,
  WIND_STRENGH,
  WIND_SPEED,
} from '../config/constants.js';

function buildBladeGeometry() {
  const SEG = GRASS_SEGMENTS;
  const hw  = GRASS_BLADE_WIDTH * 0.5;
  const h   = GRASS_BLADE_HEIGHT;

  const positions = [];
  const normals   = [];
  const uvs       = [];
  const colors    = [];
  const uvYVals   = [];
  const indices   = [];

  const colorBase = new THREE.Color(GRASS_COLOR_BASE);
  const colorTip  = new THREE.Color(GRASS_COLOR_TIP);
  const tmp = new THREE.Color();

  // Two quads crossed at 90° (X shape when viewed from above).
  // DoubleSide renders both faces of each quad; upward normals give consistent
  // lighting from any horizontal viewing angle.
  const planes = [[1, 0], [0, 1]]; // [scaleX, scaleZ] — Plane A along X, Plane B along Z

  let vertexOffset = 0;

  for (const [ax, az] of planes) {
    for (let s = 0; s <= SEG; s++) {
      const t = s / SEG;
      const y = t * h;
      const w = hw * (1 - t * 0.85); // taper to tip

      positions.push(-w * ax, y, -w * az);
      positions.push( w * ax, y,  w * az);
      normals.push(0, 1, 0,  0, 1, 0);
      uvs.push(0, t,  1, t);
      tmp.lerpColors(colorBase, colorTip, t);
      colors.push(tmp.r, tmp.g, tmp.b,  tmp.r, tmp.g, tmp.b);
      uvYVals.push(t, t);
    }

    for (let s = 0; s < SEG; s++) {
      const b = vertexOffset + s * 2;
      indices.push(b, b + 2, b + 1,  b + 1, b + 2, b + 3);
    }

    vertexOffset += (SEG + 1) * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals,   3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,       2));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors,    3));
  geo.setAttribute('aUvY',     new THREE.Float32BufferAttribute(uvYVals,   1));
  // aRandom is set later as InstancedBufferAttribute (one value per instance)
  geo.setIndex(indices);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

// ─── Grass material ────────────────────────────────────────────────────────────
function buildGrassMaterial() {
  // MeshLambertMaterial gives us free ambient + point-light shading and shadow
  // receiving on the InstancedMesh. We inject the wind animation via onBeforeCompile.
  const mat = new THREE.MeshLambertMaterial({
    side: THREE.DoubleSide,
    vertexColors: true,
  });

  // Wind uniforms — shared reference so updateGrass can write uTime each frame
  const windUniforms = {
    uTime:         { value: 0 },
    uWindStrength: { value: WIND_STRENGH * 0.012 },
    uWindSpeed:    { value: WIND_SPEED },
  };

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, windUniforms);
    mat.userData.shader = shader; // keep reference for per-frame uniform updates

    // Declare wind uniforms and custom per-vertex / per-instance attributes
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
uniform float uTime;
uniform float uWindStrength;
uniform float uWindSpeed;
attribute float aRandom; // per-instance random phase (InstancedBufferAttribute)
attribute float aUvY;    // per-vertex height ratio 0=base 1=tip`
    );

    // Inject wind bending after Three.js initialises `vec3 transformed = vec3(position)`
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
float bend = aUvY * aUvY;
float wave = sin(uTime * uWindSpeed + aRandom * 6.2831) * uWindStrength * bend;
transformed.x += wave;
transformed.z += wave * 0.3;`
    );

    // Three.js negates the view-space normal for back faces when using DoubleSide
    // (#include <normal_fragment_begin> multiplies by faceDirection = gl_FrontFacing ? 1 : -1).
    // For grass we always want the upward geometry normal regardless of which side is rendered,
    // so we override the result back to the original interpolated vNormal.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      `#include <normal_fragment_begin>
  normal = normalize( vNormal ); // always use geometry normal — grass lit uniformly`
    );
  };

  mat.customProgramCacheKey = () => 'grass_wind';

  return mat;
}

const occupiedPositions = [];
const grassBlockers = [];
const grassRaycaster = new THREE.Raycaster();
const grassRayOrigin = new THREE.Vector3();
const grassRayDirection = new THREE.Vector3(0, -1, 0);

export function registerOccupied(x, z) {
  occupiedPositions.push(new THREE.Vector2(x, z));
}

export function registerGrassBlocker(object3D) {
  if (!object3D) return;
  grassBlockers.push(object3D);
}

export function isPlacementFree(x, z) {
  return isFreePosition(x, z, GRASS_EXCLUSION_RADIUS);
}

export function isPlacementFreeWithRadius(x, z, exclusionRadius = GRASS_EXCLUSION_RADIUS) {
  return isFreePosition(x, z, exclusionRadius);
}

function intersectsGrassBlockerAt(x, z) {
  if (!grassBlockers.length) return false;

  grassRayOrigin.set(x, GRASS_BLOCKER_RAY_HEIGHT, z);
  grassRaycaster.set(grassRayOrigin, grassRayDirection);
  grassRaycaster.far = GRASS_BLOCKER_RAY_HEIGHT * 2;

  for (const blocker of grassBlockers) {
    const hits = grassRaycaster.intersectObject(blocker, true);
    if (hits.length > 0) return true;
  }

  return false;
}

function intersectsGrassBlocker(x, z, exclusionRadius = 0) {
  if (intersectsGrassBlockerAt(x, z)) return true;
  if (exclusionRadius <= 0) return false;

  // Sample around the candidate point to enforce a clearance margin from blockers.
  const radius = Math.max(0, exclusionRadius);
  const diagonal = radius * 0.7071;
  const samples = [
    [radius, 0],
    [-radius, 0],
    [0, radius],
    [0, -radius],
    [diagonal, diagonal],
    [-diagonal, diagonal],
    [diagonal, -diagonal],
    [-diagonal, -diagonal],
  ];

  for (const [dx, dz] of samples) {
    if (intersectsGrassBlockerAt(x + dx, z + dz)) return true;
  }

  return false;
}

function isFreePosition(x, z, exclusionRadius = GRASS_EXCLUSION_RADIUS) {
  const radiusSq = exclusionRadius * exclusionRadius;

  for (const op of occupiedPositions) {
    const dx = op.x - x;
    const dz = op.y - z;
    if (dx * dx + dz * dz < radiusSq) return false;
  }
  if (intersectsGrassBlocker(x, z, exclusionRadius)) return false;
  return true;
}

let grassMaterial = null
let grassMesh = null;
let grassEnabled = true;

export function createGrass() {
  const TOTAL_BLADES = GRASS_COUNT * GRASS_PATCH_SIZE;
  const geo = buildBladeGeometry();
  grassMaterial = buildGrassMaterial();

  const mesh = new THREE.InstancedMesh(geo, grassMaterial, TOTAL_BLADES);
  mesh.castShadow    = false; // small blades don't need expensive shadow casts
  mesh.receiveShadow = true;

  const half  = (GROUND_SIZE * 0.5) - 2; // keep away from edges
  const dummy = new THREE.Object3D();

  // Random phase for the wind
  const instanceRandom = new Float32Array(TOTAL_BLADES);

  let bladeIndex = 0;

  for (let p = 0; p < GRASS_COUNT; p++) {
    // Position on a free space
    let px, pz;
    let attempts = 0;
    do {
      px = (Math.random() * 2 - 1) * half;
      pz = (Math.random() * 2 - 1) * half;
      attempts++;
    } while (!isFreePosition(px, pz) && attempts < 30);

    if (!isFreePosition(px, pz)) continue; // give up

    // Register patch
    occupiedPositions.push(new THREE.Vector2(px, pz));

    for (let b = 0; b < GRASS_PATCH_SIZE; b++) {
      const offsetX = (Math.random() - 0.5) * GRASS_SPREAD * 2;
      const offsetZ = (Math.random() - 0.5) * GRASS_SPREAD * 2;
      const rot     = Math.random() * Math.PI;
      const scale   = 0.75 + Math.random() * 0.5;

      dummy.position.set(px + offsetX, 0, pz + offsetZ);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();

      mesh.setMatrixAt(bladeIndex, dummy.matrix);
      // Each blade gets a unique random phase
      instanceRandom[bladeIndex] = Math.random() * Math.PI * 2;
      bladeIndex++;
    }
  }

  // Update number of patches (in case some could not be places)
  mesh.count = bladeIndex;
  mesh.instanceMatrix.needsUpdate = true;

  // Attach per-instance random phase as an instanced buffer attribute
  geo.setAttribute(
    'aRandom',
    new THREE.InstancedBufferAttribute(instanceRandom.slice(0, bladeIndex), 1)
  );

  grassMesh = mesh;
  grassMesh.visible = grassEnabled;
  scene.add(mesh);
  return mesh;
}

// Called every frame from the animation loop
export function updateGrass(elapsed) {
  if (!grassEnabled) return;
  if (grassMaterial && grassMaterial.userData.shader) {
    grassMaterial.userData.shader.uniforms.uTime.value = elapsed;
  }
}

export function setGrassEnabled(enabled) {
  grassEnabled = enabled;
  if (grassMesh) {
    grassMesh.visible = enabled;
  }
}
