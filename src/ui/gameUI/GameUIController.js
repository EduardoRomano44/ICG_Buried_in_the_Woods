import settings from '../../config/settings.js';
import { createHUD } from './components/hud/HUD.js';
import { createScreenOverlay } from './components/overlay/ScreenOverlay.js';
import { createSettingsPanel } from './components/settings/SettingsPanel.js';
import { createStartPanel } from './components/start/StartPanel.js';
import { applyBarsSizePreset } from './presets/barSizePresets.js';
import { loadGameUIStyles } from './styles/loadGameUIStyles.js';

function createGameUIController({ onResume, onReset, onSettingsChanged }) {
  loadGameUIStyles();

  const root = document.createElement('div');
  root.className = 'game-ui';

  const overlay = createScreenOverlay();
  const hud = createHUD();

  let settingsPanel = null;
  let startPanel = null;

  const syncSettingsControls = () => {
    if (startPanel) startPanel.syncControls();
    if (settingsPanel) settingsPanel.syncControls();
  };

  const runSettingsTask = async (task, blockUI = false) => {
    if (blockUI && settingsPanel) {
      settingsPanel.setBusy(true);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    try {
      await Promise.resolve(task());
    } finally {
      if (blockUI && settingsPanel) {
        settingsPanel.setBusy(false);
      }
    }
  };

  startPanel = createStartPanel(onSettingsChanged, syncSettingsControls);

  settingsPanel = createSettingsPanel({
    onResume,
    onReset,
    onSettingsChanged,
    syncSettingsControls,
    runSettingsTask,
    applyBarsSizePreset,
  });

  root.append(hud.element, overlay.element, startPanel.element, settingsPanel.element);
  document.body.appendChild(root);

  applyBarsSizePreset(settings.uiBarsSize || 'medium');
  syncSettingsControls();

  return {
    updateHUD(vitals) {
      hud.update(vitals);
    },
    setGameStarted(started) {
      hud.setVisible(started);
      startPanel.setVisible(!started);
    },
    setPaused(paused) {
      settingsPanel.setVisible(paused);
      overlay.setVisible(paused);
    },
    setStartLoading(visible, label = 'Loading...') {
      startPanel.setLoading(visible, label);
    },
    isSettingsBusy() {
      return settingsPanel.isBusy();
    },
  };
}

export { createGameUIController, applyBarsSizePreset };
