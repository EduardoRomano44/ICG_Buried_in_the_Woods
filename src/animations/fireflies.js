import * as THREE from 'three';
import { scene, camera } from '../core/SceneManager.js';
import {
  FIREFLY_COUNT,
  FIREFLY_COLOUR,
  FIREFLY_OPACITY,
} from '../config/constants.js';

const fireflies = [];
let firefliesEnabled = true;

function createFireflies(parentModel, count = FIREFLY_COUNT) {
  for (let i = 0; i < count; i++) {

      const size = 0.05;

      const geo = new THREE.PlaneGeometry(size, size);
      const mat = new THREE.MeshBasicMaterial({
          color: FIREFLY_COLOUR,
          transparent: true,
          opacity: FIREFLY_OPACITY,
          blending: THREE.AdditiveBlending,
          depthWrite: false
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.material.side = THREE.DoubleSide;

      const radius = 0.5 + Math.random() * 2.5;
      const speed = 0.5 + Math.random() * 1.5;
      const phase = Math.random() * Math.PI * 2;
      const verticalOffset = 7.25 + (Math.random() - 0.2) * 2;

      // initial position relative to parent
      mesh.position.set(
          parentModel.position.x + Math.cos(phase) * radius,
          parentModel.position.y + verticalOffset,
          parentModel.position.z + Math.sin(phase) * radius
      );

        mesh.lookAt(camera.position);

      scene.add(mesh);

      fireflies.push({
          mesh: mesh,
          parent: parentModel,
          radius: radius,
          speed: speed,
          phase: phase,
          verticalOffset: verticalOffset,
          offset: Math.random() * 10,
          // seed + chaos parameters create smooth but complex (pseudo-caotic) motion
          seed: Math.random() * 1000,
          chaosScale: 0.25 + Math.random() * 0.9
      });
  }
}

function animateFireflies(time) {
  if (!time || !firefliesEnabled) return;

  fireflies.forEach((f) => {
    // Firefly movement made with assistance of AI
    
    // base time for this firefly (time likely from RAF in ms)
    const t = time * f.speed + f.phase + f.offset;

    // create several smooth wave components (deterministic per-firefly via seed)
    const s = f.seed;
    const gx = Math.sin(t * 1.3 + s) * 0.9 + 0.5 * Math.sin(t * 2.7 + s * 1.7 + f.parent.position.x * 0.08) + 0.25 * Math.cos(t * 4.1 + s * 2.3 + f.parent.position.z * 0.06);
    const gz = Math.cos(t * 1.5 + s * 0.9 + f.parent.position.z * 0.05) * 0.9 + 0.4 * Math.sin(t * 2.9 + s * 1.9 + f.parent.position.x * 0.05);
    const gy = Math.sin(t * 1.9 + s * 1.2 + f.parent.position.x * 0.04) * 0.7 + 0.5 * Math.sin(t * 3.3 + s * 0.7);

    // chaosScale controls how far from the orbit the firefly wanders
    const c = f.chaosScale;

    // combine orbit with chaotic offsets to keep an overall orbital region but with complex motion
    f.mesh.position.x = f.parent.position.x + Math.cos(t) * f.radius + gx * c;
    f.mesh.position.z = f.parent.position.z + Math.sin(t) * f.radius + gz * c;
    f.mesh.position.y = f.parent.position.y + f.verticalOffset + Math.sin(t * 2) * 0.2 + gy * (c * 0.8);

    // rotate the plane to always face the camera (billboard)
    f.mesh.lookAt(camera.position);

    // opacity gets a small correlated flicker (not pure random)
    const baseOpacity = 0.35 + Math.sin(t * 3 + s * 0.1) * 0.25;
    const noiseOpacity = 0.15 * (Math.sin(t * 5 + s) + Math.cos(t * 2.2 + f.parent.position.x * 0.01));
    let opa = baseOpacity + noiseOpacity;
    opa = Math.max(0.05, Math.min(1, opa));
    f.mesh.material.opacity = opa;

  });
}

function setFirefliesEnabled(enabled) {
  firefliesEnabled = enabled;
  for (const firefly of fireflies) {
    firefly.mesh.visible = enabled;
  }
}

export { createFireflies, animateFireflies, fireflies, setFirefliesEnabled };