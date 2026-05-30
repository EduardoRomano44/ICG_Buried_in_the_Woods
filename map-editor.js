import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { scene, camera, renderer } from './src/core/SceneManager.js';
import { updateWorld } from './src/world/World.js';
import { loadAllModels } from './src/world/loaders/ModelLoader.js';
import { createGrass, getGrassPatchPlacements, setGrassEnabled } from './src/world/loaders/generated/Grass.js';
import {
  loadSavedWorldPositions,
  createWorldPositionsPayload,
  downloadGeneratedWorldPositions,
} from './src/world/loaders/generated/PlacementPersistence.js';
import { setTitleCardAudioActive } from './src/audio/GameAudio.js';

let controls = null;

// Trees are given randomly generated position, save position to use later (Feature made by copilot)
let treePlacements = [];
let worldReady = false;
let saveButton = null;
let statusLabel = null;

function setStatus(message) {
  if (!statusLabel) return;
  statusLabel.textContent = message;
}

function createEditorToolbar() {
  const toolbar = document.createElement('div');
  toolbar.style.position = 'fixed';
  toolbar.style.top = '12px';
  toolbar.style.left = '12px';
  toolbar.style.zIndex = '60';
  toolbar.style.pointerEvents = 'auto';
  toolbar.style.display = 'grid';
  toolbar.style.gap = '8px';
  toolbar.style.padding = '10px';
  toolbar.style.borderRadius = '10px';
  toolbar.style.background = 'rgba(8, 10, 18, 0.84)';
  toolbar.style.border = '1px solid rgba(255, 255, 255, 0.16)';
  toolbar.style.fontFamily = 'Segoe UI, sans-serif';

  saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = 'Descarregar Posicoes';
  saveButton.style.cursor = 'pointer';
  saveButton.style.border = '1px solid rgba(255, 255, 255, 0.28)';
  saveButton.style.background = '#0f2342';
  saveButton.style.color = '#f2f6ff';
  saveButton.style.fontWeight = '700';
  saveButton.style.fontSize = '12px';
  saveButton.style.letterSpacing = '0.04em';
  saveButton.style.textTransform = 'uppercase';
  saveButton.style.borderRadius = '8px';
  saveButton.style.padding = '9px 12px';
  saveButton.disabled = true;

  statusLabel = document.createElement('p');
  statusLabel.style.margin = '0';
  statusLabel.style.color = 'rgba(232, 239, 255, 0.86)';
  statusLabel.style.fontSize = '12px';
  statusLabel.style.maxWidth = '280px';
  statusLabel.textContent = 'A carregar mundo...';

  saveButton.addEventListener('click', async () => {
    if (!worldReady) {
      setStatus('Mundo ainda a carregar...');
      return;
    }

    saveButton.disabled = true;
    setStatus('A guardar posicoes...');

    const payload = createWorldPositionsPayload({
      trees: treePlacements,
      grassPatches: getGrassPatchPlacements(),
    });

    const saved = await downloadGeneratedWorldPositions(payload, {
      promptFromGesture: true,
      forceDownload: true,
    });

    if (saved) {
      setStatus('Posicoes guardadas/descarregadas com sucesso.');
    } else {
      setStatus('Nao foi possivel guardar. Verifica permissoes do browser.');
    }

    saveButton.disabled = false;
  });

  toolbar.append(saveButton, statusLabel);
  document.body.appendChild(toolbar);
}

async function startMapEditor() {
  setTitleCardAudioActive(false);
  createEditorToolbar();
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
    const savedPositions = await loadSavedWorldPositions();
    const loadedModels = await loadAllModels({
      treePlacements: savedPositions?.trees,
    });

    createGrass({
      patchPlacements: savedPositions?.grassPatches,
    });

    treePlacements = loadedModels.treePlacements || [];
    worldReady = true;
    saveButton.disabled = false;

    if (savedPositions) {
      setStatus('Posicoes importadas. Podes descarregar para atualizar o ficheiro.');
    } else {
      setStatus('Posicoes geradas. Usa o botao para guardar em ./src/world.');
    }
  } catch (error) {
    console.error('Failed to load models in map editor mode:', error);
    setStatus('Falha ao carregar mundo. Ver consola para detalhes.');
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
