import * as THREE from 'three';
import { scene, camera } from '../core/SceneManager.js';
import {
  SLIME_ATTACK_DURATION,
  SLIME_ATTACK_BLINK_SPEED,
  SLIME_ATTACK_HITBOX_RADIUS,
  SLIME_ATTACK_HITBOX_COLOR,
  SLIME_ATTACK_HITBOX_OPACITY,
  SLIME_ATTACK_DAMAGE,
  SLIME_ATTACK_EYE_SQUINT_SCALE,
  SLIME_ATTACK_SCALE_MIN,
  SLIME_ATTACK_SCALE_MAX,
  SLIME_EXPLODE_PARTICLE_COUNT,
  SLIME_EXPLODE_PARTICLE_COLOR,
  SLIME_EXPLODE_PARTICLE_SIZE,
  SLIME_EXPLODE_PARTICLE_OPACITY,
  SLIME_EXPLODE_PARTICLE_SPEED_MIN,
  SLIME_EXPLODE_PARTICLE_SPEED_MAX,
  SLIME_EXPLODE_PARTICLE_LIFETIME,
  SLIME_EXPLODE_PARTICLE_GRAVITY,
  SLIME_EXPLODE_PARTICLE_DRAG,
} from '../config/constants.js';
import settings from '../config/settings.js';
import { removeCollider, damagePlayer, intersectsPlayerHitboxSphere } from '../player/Player.js';
import { playSlimeExplodeAudio } from '../audio/GameAudio.js';

/* 
  Responsible for managing slime attack animation
  Animation: Slime "Blinks" (increases and decreases size, charging the attack) -> Slime Expands (Slime implodes, increasing size to attack hitbox) -> Particles (Slime dissapears, damaging the player and releasing particle effects) 
*/
const activeAttacks = new Map();
const activeExplodeBursts = [];
const ATTACK_EXPANSION_DURATION = 0.5;
let lastParticleUpdateTime = null;
let roundParticleTexture = null;

// Particle Effect
function getRoundParticleTexture() {
  if (roundParticleTexture) return roundParticleTexture;

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    0,
    size * 0.5,
    size * 0.5,
    size * 0.5
  );

  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  roundParticleTexture = new THREE.CanvasTexture(canvas);
  roundParticleTexture.minFilter = THREE.LinearFilter;
  roundParticleTexture.magFilter = THREE.LinearFilter;
  roundParticleTexture.generateMipmaps = false;

  return roundParticleTexture;
}

function disposeExplodeBurst(burst) {
  scene.remove(burst.points);
  burst.geometry.dispose();
  burst.material.dispose();
}

function clearExplodeBursts() {
  for (const burst of activeExplodeBursts) {
    disposeExplodeBurst(burst);
  }
  activeExplodeBursts.length = 0;
}

function spawnSlimeExplodeParticles(center) {
  // Function made by copilot
  if (settings.lowQuality || SLIME_EXPLODE_PARTICLE_COUNT <= 0) return;

  const count = Math.max(1, Math.floor(SLIME_EXPLODE_PARTICLE_COUNT));
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    positions[idx] = center.x;
    positions[idx + 1] = center.y + 1;
    positions[idx + 2] = center.z;

    const dirX = (Math.random() * 2) - 1;
    const dirY = (Math.random() * 1.2) + 0.25;
    const dirZ = (Math.random() * 2) - 1;
    const dirLen = Math.hypot(dirX, dirY, dirZ) || 1;

    const speed = THREE.MathUtils.lerp(
      SLIME_EXPLODE_PARTICLE_SPEED_MIN,
      SLIME_EXPLODE_PARTICLE_SPEED_MAX,
      Math.random()
    );

    velocities[idx] = (dirX / dirLen) * speed;
    velocities[idx + 1] = (dirY / dirLen) * speed;
    velocities[idx + 2] = (dirZ / dirLen) * speed;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: SLIME_EXPLODE_PARTICLE_COLOR,
    size: SLIME_EXPLODE_PARTICLE_SIZE,
    transparent: true,
    opacity: SLIME_EXPLODE_PARTICLE_OPACITY,
    depthWrite: false,
    map: getRoundParticleTexture(),
    alphaMap: getRoundParticleTexture(),
    alphaTest: 0.12,
    blending: THREE.NormalBlending,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  activeExplodeBursts.push({
    points,
    geometry,
    material,
    positions,
    velocities,
    age: 0,
  });
}

function updateSlimeExplodeParticles(elapsed) {
  // Function made by copilot
  if (settings.lowQuality) {
    clearExplodeBursts();
    lastParticleUpdateTime = elapsed;
    return;
  }

  if (lastParticleUpdateTime === null) {
    lastParticleUpdateTime = elapsed;
    return;
  }

  const delta = Math.min(0.05, Math.max(0, elapsed - lastParticleUpdateTime));
  lastParticleUpdateTime = elapsed;
  if (delta <= 0 || activeExplodeBursts.length === 0) return;

  const dragFactor = Math.max(0, 1 - (SLIME_EXPLODE_PARTICLE_DRAG * delta));

  for (let i = activeExplodeBursts.length - 1; i >= 0; i--) {
    const burst = activeExplodeBursts[i];
    burst.age += delta;

    const lifeT = Math.min(1, burst.age / SLIME_EXPLODE_PARTICLE_LIFETIME);
    burst.material.opacity = (1 - lifeT) * SLIME_EXPLODE_PARTICLE_OPACITY;

    for (let j = 0; j < burst.positions.length; j += 3) {
      burst.velocities[j] *= dragFactor;
      burst.velocities[j + 1] = (burst.velocities[j + 1] * dragFactor) - (SLIME_EXPLODE_PARTICLE_GRAVITY * delta);
      burst.velocities[j + 2] *= dragFactor;

      burst.positions[j] += burst.velocities[j] * delta;
      burst.positions[j + 1] += burst.velocities[j + 1] * delta;
      burst.positions[j + 2] += burst.velocities[j + 2] * delta;
    }

    burst.geometry.attributes.position.needsUpdate = true;

    if (lifeT >= 1) {
      disposeExplodeBurst(burst);
      activeExplodeBursts.splice(i, 1);
    }
  }
}

function createHitboxMesh() {
  // Location where player takes damage when the attack completes
  const geometry = new THREE.SphereGeometry(
    SLIME_ATTACK_HITBOX_RADIUS,
    24,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.5
  );
  const material = new THREE.MeshBasicMaterial({
    color: SLIME_ATTACK_HITBOX_COLOR,
    transparent: true,
    opacity: SLIME_ATTACK_HITBOX_OPACITY,
    depthWrite: false,
    side: THREE.DoubleSide,
    depthTest: false,
  });

  return new THREE.Mesh(geometry, material);
}

function createEyeState(slimeMesh) {
  const eyeBig = [];
  const eyeSmall = [];

  slimeMesh.traverse((obj) => {
    if (!obj.isMesh || !obj.name) return;

    if (obj.name === 'EyeBig') {
      eyeBig.push(obj);
    } else if (obj.name === 'EyeSmall') {
      eyeSmall.push(obj);
    }
  });

  const eyeBigBaseScale = eyeBig.map((eye) => eye.scale.clone());
  const eyeSmallBaseScale = eyeSmall.map((eye) => eye.scale.clone());

  return {
    eyeBig,
    eyeSmall,
    eyeBigBaseScale,
    eyeSmallBaseScale,
  };
}

function applyInitialEyeSquint(eyes) {
  // Eyes squint when attacking
  const squintScale = SLIME_ATTACK_EYE_SQUINT_SCALE;

  const eyeBig = eyes.eyeBig[0];
  const eyeBigBaseScale = eyes.eyeBigBaseScale[0];
  if (eyeBig && eyeBigBaseScale) {
    eyeBig.visible = true;
    eyeBig.scale.set(eyeBigBaseScale.x, eyeBigBaseScale.y, eyeBigBaseScale.z * squintScale);
  }

  const eyeSmall = eyes.eyeSmall[0];
  const eyeSmallBaseScale = eyes.eyeSmallBaseScale[0];
  if (eyeSmall && eyeSmallBaseScale) {
    eyeSmall.visible = true;
    eyeSmall.scale.set(eyeSmallBaseScale.x, eyeSmallBaseScale.y * squintScale, eyeSmallBaseScale.z);
  }
}

function setAttackScalePulse(attackState, pulseFactor) {
  // Slime pulsates as it is charging the attack
  const scaleMul = SLIME_ATTACK_SCALE_MIN + pulseFactor * (SLIME_ATTACK_SCALE_MAX - SLIME_ATTACK_SCALE_MIN);

  setAttackScaleMul(attackState, scaleMul);
}

function setAttackScaleMul(attackState, scaleMul) {
  const safeScaleMul = Number.isFinite(scaleMul) ? Math.max(0.0001, scaleMul) : 1;

  attackState.slimeMesh.scale.set(
    attackState.baseScale.x * safeScaleMul,
    attackState.baseScale.y * safeScaleMul,
    attackState.baseScale.z * safeScaleMul
  );
}

function getSlimeFinalExpansionRadius(slimeMesh) {
  slimeMesh.updateWorldMatrix(true, false);
  const bounds = new THREE.Box3().setFromObject(slimeMesh);

  const width = Math.max(0.0001, (bounds.max.x - bounds.min.x) * 0.7);
  const depth = Math.max(0.0001, (bounds.max.z - bounds.min.z) * 0.7);
  return Math.max(width, depth);
}

function createAttackState(slimeMesh, onExplode) {
  const eyes = createEyeState(slimeMesh); // Eyes are not reset, but because slimes don't respawn (only when debuging) this isn't an issue
  const hitboxMesh = createHitboxMesh();
  scene.add(hitboxMesh);

  const baseRadius = getSlimeFinalExpansionRadius(slimeMesh);
  const targetScaleMul = Math.max(1, SLIME_ATTACK_HITBOX_RADIUS / baseRadius);

  return {
    slimeMesh,
    baseScale: slimeMesh.scale.clone(),
    targetScaleMul,
    expansionStartTime: Math.max(0, SLIME_ATTACK_DURATION - ATTACK_EXPANSION_DURATION),
    expansionStartScaleMul: 1,
    expansionStarted: false,
    eyes,
    hitboxMesh,
    onExplode,
    startTime: null,
    exploded: false,
  };
}

function getHitboxCenter(slimeMesh) {
  slimeMesh.updateWorldMatrix(true, false);
  const bounds = new THREE.Box3().setFromObject(slimeMesh);
  const center = new THREE.Vector3();
  center.set(slimeMesh.position.x, bounds.min.y, slimeMesh.position.z);
  return center;
}

function startSlimeAttack(slimeMesh, onExplode) {
  if (!slimeMesh || activeAttacks.has(slimeMesh.uuid)) return;

  const attackState = createAttackState(slimeMesh, onExplode);

  applyInitialEyeSquint(attackState.eyes);

  activeAttacks.set(slimeMesh.uuid, attackState);
}

function explodeSlime(attackState) {
  if (attackState.exploded) return;
  attackState.exploded = true;

  const center = getHitboxCenter(attackState.slimeMesh);
  if (intersectsPlayerHitboxSphere(center, SLIME_ATTACK_HITBOX_RADIUS)) {
    damagePlayer(SLIME_ATTACK_DAMAGE);
  }

  attackState.hitboxMesh.removeFromParent();
  attackState.hitboxMesh.geometry.dispose();
  attackState.hitboxMesh.material.dispose();
  playSlimeExplodeAudio(center.distanceTo(camera.position));
  spawnSlimeExplodeParticles(center);

  removeCollider(attackState.slimeMesh);
  attackState.slimeMesh.removeFromParent();
  document.dispatchEvent(new CustomEvent('slime:exploded', {
    detail: {
      slimeMesh: attackState.slimeMesh,
      baseScale: attackState.baseScale.clone(),
    },
  }));

  if (typeof attackState.onExplode === 'function') {
    attackState.onExplode();
  }

  activeAttacks.delete(attackState.slimeMesh.uuid);
}

function updateSlimeAttacks(elapsed) {
  updateSlimeExplodeParticles(elapsed);

  for (const attackState of activeAttacks.values()) {
    if (attackState.startTime === null) {
      attackState.startTime = elapsed;
    }

    const center = getHitboxCenter(attackState.slimeMesh);
    attackState.hitboxMesh.position.copy(center);

    const attackElapsed = elapsed - attackState.startTime;

    if (attackElapsed < attackState.expansionStartTime) {
      const pulseFactor = (Math.sin(elapsed * SLIME_ATTACK_BLINK_SPEED) + 1) * 0.5;
      setAttackScalePulse(attackState, pulseFactor);
    } else {
      if (!attackState.expansionStarted) {
        attackState.expansionStarted = true;
        attackState.expansionStartScaleMul = Math.max(
          0.0001,
          attackState.slimeMesh.scale.x / attackState.baseScale.x
        );
      }

      const expansionElapsed = attackElapsed - attackState.expansionStartTime;
      const expansionT = Math.min(1, expansionElapsed / ATTACK_EXPANSION_DURATION);
      const easedT = expansionT * expansionT * (3 - 2 * expansionT);
      const scaleMul = THREE.MathUtils.lerp(
        attackState.expansionStartScaleMul,
        attackState.targetScaleMul,
        easedT
      );
      setAttackScaleMul(attackState, scaleMul);
    }

    if (attackElapsed >= SLIME_ATTACK_DURATION) {
      explodeSlime(attackState);
    }
  }
}

export { startSlimeAttack, updateSlimeAttacks };