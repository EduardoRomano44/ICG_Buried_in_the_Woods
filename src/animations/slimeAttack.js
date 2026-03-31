import * as THREE from 'three';
import { scene, camera } from '../core/SceneManager.js';
import {
  SLIME_ATTACK_DURATION,
  SLIME_ATTACK_BLINK_SPEED,
  SLIME_ATTACK_HITBOX_RADIUS,
  SLIME_ATTACK_HITBOX_COLOR,
  SLIME_ATTACK_HITBOX_OPACITY,
  SLIME_ATTACK_DAMAGE,
  SLIME_ATTACK_EYE_SQUINT_SCALE_Y,
  SLIME_ATTACK_SCALE_MIN,
  SLIME_ATTACK_SCALE_MAX,
} from '../config/constants.js';
import { removeCollider, damagePlayer, intersectsPlayerHitboxSphere } from '../player/Player.js';

const activeAttacks = new Map();

function isEyeBig(name) {
  return name === 'EyeBig' || name.includes('EyeBig');
}

function isEyeSmall(name) {
  return name === 'EyeSmall' || name.includes('EyeSmall');
}

function createHitboxMesh() {
  const geometry = new THREE.SphereGeometry(SLIME_ATTACK_HITBOX_RADIUS, 24, 24);
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

    if (isEyeBig(obj.name)) {
      eyeBig.push(obj);
    } else if (isEyeSmall(obj.name)) {
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

function setAttackVisualState(attackState, pulseFactor) {
  const eyes = attackState.eyes;
  const squintScaleY = 1 - pulseFactor * (1 - SLIME_ATTACK_EYE_SQUINT_SCALE_Y);
  const scaleMul = SLIME_ATTACK_SCALE_MIN + pulseFactor * (SLIME_ATTACK_SCALE_MAX - SLIME_ATTACK_SCALE_MIN);

  attackState.slimeMesh.scale.set(
    attackState.baseScale.x * scaleMul,
    attackState.baseScale.y * scaleMul,
    attackState.baseScale.z * scaleMul
  );

  for (let i = 0; i < eyes.eyeBig.length; i += 1) {
    const eye = eyes.eyeBig[i];
    const baseScale = eyes.eyeBigBaseScale[i];
    if (!baseScale) continue;

    eye.visible = true;
    eye.scale.set(baseScale.x, baseScale.y * squintScaleY, baseScale.z);
  }

  for (let i = 0; i < eyes.eyeSmall.length; i += 1) {
    const eye = eyes.eyeSmall[i];
    const baseScale = eyes.eyeSmallBaseScale[i];
    if (!baseScale) continue;

    eye.visible = true;
    eye.scale.set(baseScale.x, baseScale.y * squintScaleY, baseScale.z);
  }
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

  const eyes = createEyeState(slimeMesh);
  const hitboxMesh = createHitboxMesh();
  scene.add(hitboxMesh);

  const attackState = {
    slimeMesh,
    baseScale: slimeMesh.scale.clone(),
    eyes,
    hitboxMesh,
    onExplode,
    startTime: null,
    exploded: false,
  };

  activeAttacks.set(slimeMesh.uuid, attackState);
}

function explodeSlime(attackState) {
  if (attackState.exploded) return;
  attackState.exploded = true;

  // Reset visual distortion before despawn so debug respawn starts from clean pose.
  setAttackVisualState(attackState, 0);

  const center = getHitboxCenter(attackState.slimeMesh);
  if (intersectsPlayerHitboxSphere(center, SLIME_ATTACK_HITBOX_RADIUS)) {
    damagePlayer(SLIME_ATTACK_DAMAGE);
  }

  scene.remove(attackState.hitboxMesh);
  attackState.hitboxMesh.geometry.dispose();
  attackState.hitboxMesh.material.dispose();

  removeCollider(attackState.slimeMesh);
  scene.remove(attackState.slimeMesh);
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
  for (const attackState of activeAttacks.values()) {
    if (attackState.startTime === null) {
      attackState.startTime = elapsed;
    }

    const center = getHitboxCenter(attackState.slimeMesh);
    attackState.hitboxMesh.position.copy(center);

    const pulseFactor = (Math.sin(elapsed * SLIME_ATTACK_BLINK_SPEED) + 1) * 0.5;
    setAttackVisualState(attackState, pulseFactor);

    const attackElapsed = elapsed - attackState.startTime;
    if (attackElapsed >= SLIME_ATTACK_DURATION) {
      explodeSlime(attackState);
    }
  }
}

export { startSlimeAttack, updateSlimeAttacks };
