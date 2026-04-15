import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { scene, camera, renderer } from './src/core/SceneManager.js';
import { updateWorld } from './src/world/World.js';
import { loadAllModels } from './src/models/ModelLoader.js';
import { setGrassEnabled } from './src/world/Grass.js';

let controls = null;

async function startMapEditor() {
  renderer.domElement.style.display = 'block';

  setGrassEnabled(false);

  camera.position.set(34, 24, 34);
  camera.lookAt(0, 0, 0);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 2, 0);
  controls.minDistance = 5;
  controls.maxDistance = 220;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.update();

  try {
    await loadAllModels();
  } catch (error) {
    console.error('Failed to load models in map editor mode:', error);
  }

  animate();
}

function animate() {
  requestAnimationFrame(animate);

  if (controls) {
    controls.update();
  }

  updateWorld(camera);
  renderer.render(scene, camera);
}

startMapEditor();
