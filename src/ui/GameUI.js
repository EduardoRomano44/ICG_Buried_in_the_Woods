import { applyBarsSizePreset, createGameUIController } from './gameUI/GameUIController.js';

let controller = null;

function createGameUI(options) {
  controller = createGameUIController(options);
}

function updateHUD(vitals) {
  if (!controller) return;
  controller.updateHUD(vitals);
}

function setGameStarted(started) {
  if (!controller) return;
  controller.setGameStarted(started);
}

function setPaused(paused) {
  if (!controller) return;
  controller.setPaused(paused);
}

function setFlashlightState(state) {
  if (!controller) return;
  controller.setFlashlightState(state);
}

function setKeyState(state) {
  if (!controller) return;
  controller.setKeyState(state);
}

function setStartLoading(visible, label = 'Loading...') {
  if (!controller) return;
  controller.setStartLoading(visible, label);
}

function isSettingsBusy() {
  if (!controller) return false;
  return controller.isSettingsBusy();
}

async function showGameOver() {
  if (!controller) return;
  await controller.showGameOver();
}

async function showEscapeScreen() {
  if (!controller) return;
  await controller.showEscapeScreen();
}

function showInteractButton(visible) {
  if (!controller) return;
  controller.showInteractButton(visible);
}

export {
  createGameUI,
  updateHUD,
  setGameStarted,
  setPaused,
  setFlashlightState,
  setKeyState,
  applyBarsSizePreset,
  setStartLoading,
  isSettingsBusy,
  showGameOver,
  showEscapeScreen,
  showInteractButton,
};