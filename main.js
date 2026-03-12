import * as THREE from 'three';

// Core
import { scene, camera, renderer } from './src/core/SceneManager.js';

// World
import { ground, updateWorld, updateGrass } from './src/world/World.js';

// Player
import { initInput, updatePlayer, addCollider } from './src/player/Player.js';

// Models
import { loadAllModels } from './src/models/ModelLoader.js';

// Grass (created after models register their occupied positions)
import { createGrass } from './src/world/Grass.js';

// UI
import { createCrosshair } from './src/ui/Crosshair.js';
import { animateFireflies } from './src/animations/fireflies.js';

// Bootstrap
createCrosshair();
initInput();
addCollider(ground);
loadAllModels();
createGrass();

// Game Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  updatePlayer(delta);
  animateFireflies(elapsed);
  updateGrass(elapsed);
  updateWorld(camera);

  renderer.render(scene, camera);
}

animate();

