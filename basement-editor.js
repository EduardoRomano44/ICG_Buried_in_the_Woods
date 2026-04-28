import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';
import { scene, camera, renderer } from './src/core/SceneManager.js';
import {
  addCollider,
  initInput,
  updatePlayer,
  getPlayerMovementState,
  enterFirstPerson,
  pauseFirstPersonControls,
  setInputEnabled,
  setToggleFlashlightHandler,
} from './src/player/Player.js';
import { createCrosshair } from './src/ui/Crosshair.js';
import {
  BASEMENT_PREVIEW_CAMERA_POSITION,
  BASEMENT_PREVIEW_CAMERA_TARGET,
  PLAYER_HEIGHT,
} from './src/config/constants.js';
import { createBasementPreviewWorld } from './src/world/basement/BasementPreviewWorld.js';
import { loadBasementMapping } from './src/world/basement/BasementMappingLoader.js';
import {
  grantInventoryFlashlight,
  toggleInventoryFlashlight,
} from './src/world/FlashlightSystem.js';
import { registerWalkSurface, detectWalkSurfaceType } from './src/world/WalkSurfaceRegistry.js';
import { setTitleCardAudioActive, updateWalkSurfaceAudio } from './src/audio/GameAudio.js';

let controls = null;
let statusLabel = null;
let isPlayerPreviewMode = false;
let sceneStatusMessage = 'Loading basement mapping...';
let basementCeilings = [];
let basementCeilVisible = true;
const timer = new THREE.Timer();
const orbitForward = new THREE.Vector3();
const orbitTarget = new THREE.Vector3();

function setStatus(message) {
  if (!statusLabel) return;
  statusLabel.textContent = message;
}

function setSceneStatusMessage(message) {
  sceneStatusMessage = message;
}

function getStatusBaseMessage() {
  if (basementCeilings.length > 0 && !basementCeilVisible) {
    return `${sceneStatusMessage} Ceiling hidden.`;
  }

  return sceneStatusMessage;
}

function createEditorToolbar() {
  const toolbar = document.createElement('div');
  toolbar.style.position = 'fixed';
  toolbar.style.top = '12px';
  toolbar.style.left = '12px';
  toolbar.style.zIndex = '60';
  toolbar.style.pointerEvents = 'none';
  toolbar.style.display = 'grid';
  toolbar.style.gap = '8px';
  toolbar.style.padding = '10px';
  toolbar.style.borderRadius = '10px';
  toolbar.style.background = 'rgba(8, 10, 18, 0.84)';
  toolbar.style.border = '1px solid rgba(255, 255, 255, 0.16)';
  toolbar.style.fontFamily = 'Segoe UI, sans-serif';

  const titleLabel = document.createElement('p');
  titleLabel.style.margin = '0';
  titleLabel.style.color = '#f2f6ff';
  titleLabel.style.fontSize = '12px';
  titleLabel.style.fontWeight = '700';
  titleLabel.style.letterSpacing = '0.04em';
  titleLabel.style.textTransform = 'uppercase';
  titleLabel.textContent = 'Basement Preview';

  statusLabel = document.createElement('p');
  statusLabel.style.margin = '0';
  statusLabel.style.color = 'rgba(232, 239, 255, 0.86)';
  statusLabel.style.fontSize = '12px';
  statusLabel.style.maxWidth = '320px';
  statusLabel.textContent = 'Loading basement mapping...';

  toolbar.append(titleLabel, statusLabel);
  document.body.appendChild(toolbar);
}

function setupCameraAndControls() {
  camera.position.set(
    BASEMENT_PREVIEW_CAMERA_POSITION.x,
    BASEMENT_PREVIEW_CAMERA_POSITION.y,
    BASEMENT_PREVIEW_CAMERA_POSITION.z
  );

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(
    BASEMENT_PREVIEW_CAMERA_TARGET.x,
    BASEMENT_PREVIEW_CAMERA_TARGET.y,
    BASEMENT_PREVIEW_CAMERA_TARGET.z
  );
  controls.minDistance = 2;
  controls.maxDistance = 220;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.update();
}

function updateModeStatus(baseMessage) {
  setSceneStatusMessage(baseMessage);
  const suffix = isPlayerPreviewMode
    ? ' Preview Play active. Press P or Esc to return to orbit. Press T to toggle flashlight. Press K to toggle ceiling.'
    : ' Press P to enter Preview Play. Press K to toggle ceiling.';
  setStatus(`${getStatusBaseMessage()}${suffix}`);
}

function enterPlayerPreviewMode() {
  if (isPlayerPreviewMode) return;

  isPlayerPreviewMode = true;
  controls.enabled = false;
  camera.position.y = PLAYER_HEIGHT;
  setInputEnabled(true);
  enterFirstPerson();
  updateModeStatus(sceneStatusMessage);
}

function exitPlayerPreviewMode() {
  if (!isPlayerPreviewMode) return;

  isPlayerPreviewMode = false;
  setInputEnabled(false);
  pauseFirstPersonControls();

  camera.getWorldDirection(orbitForward);
  orbitTarget.copy(camera.position).add(orbitForward.multiplyScalar(12));
  controls.target.copy(orbitTarget);
  controls.enabled = true;
  controls.update();
  updateModeStatus(sceneStatusMessage);
}

function setupPreviewPlayerControls() {
  createCrosshair();
  initInput();
  setToggleFlashlightHandler(toggleInventoryFlashlight);
  grantInventoryFlashlight({ isOn: false });
  setInputEnabled(false);

  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.code !== 'KeyP') return;
    event.preventDefault();

    if (isPlayerPreviewMode) {
      exitPlayerPreviewMode();
      return;
    }

    enterPlayerPreviewMode();
  });

  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.code !== 'KeyK') return;
    if (basementCeilings.length === 0) return;

    event.preventDefault();
    basementCeilVisible = !basementCeilVisible;
    for (const ceiling of basementCeilings) {
      ceiling.visible = basementCeilVisible;
    }
    updateModeStatus(sceneStatusMessage);
  });

  document.addEventListener('pointerlockchange', () => {
    if (!isPlayerPreviewMode) return;
    if (document.pointerLockElement === document.body) return;
    exitPlayerPreviewMode();
  });

  document.addEventListener('click', () => {
    if (!isPlayerPreviewMode) return;
    if (document.pointerLockElement === document.body) return;
    enterFirstPerson();
  });
}

async function startBasementEditor() {
  renderer.domElement.style.display = 'block';
  setTitleCardAudioActive(false);
  createEditorToolbar();
  setupCameraAndControls();
  setupPreviewPlayerControls();
  createBasementPreviewWorld(scene);

  try {
    const { stats, grounds, ceilings } = await loadBasementMapping({
      scene,
      registerCollider: addCollider,
    });
    basementCeilings = ceilings;
    basementCeilVisible = true;

    for (const ground of grounds) {
      registerWalkSurface(ground, 'basement', { priority: 5 });
    }

    updateModeStatus(
      `Loaded floor + ${stats.wall1Instances} Wall1 and ${stats.wall2Instances} Wall2 instances. ${stats.ceilInstances} Ceil instances. ${stats.colliderCount} colliders registered. ${stats.materialsWithNormalMap} materials with normal maps and ${stats.materialsWithRoughnessMap} with roughness maps configured.`
    );
  } catch (error) {
    console.error('Failed to load basement mapping:', error);
    setStatus('Failed to load basement mapping. Check console for details.');
  }

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  timer.update();
  const delta = timer.getDelta();

  if (controls && !isPlayerPreviewMode) {
    controls.update();
  }

  if (isPlayerPreviewMode) {
    updatePlayer(delta);
    const movementState = getPlayerMovementState();
    const walkSurfaceType = detectWalkSurfaceType(camera.position);
    updateWalkSurfaceAudio(walkSurfaceType, movementState.isMoving, {
      isSprinting: movementState.isSprinting,
    });
  } else {
    updateWalkSurfaceAudio(null, false);
  }

  renderer.render(scene, camera);
}

timer.connect(document);
startBasementEditor();
