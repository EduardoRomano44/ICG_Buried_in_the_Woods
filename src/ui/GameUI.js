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

export {
  createGameUI,
  updateHUD,
  setGameStarted,
  setPaused,
  applyBarsSizePreset,
  setStartLoading,
  isSettingsBusy,
  showGameOver,
};
