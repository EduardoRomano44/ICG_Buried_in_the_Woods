import settings from '../../config/settings.js';
import { createHUD } from './components/hud/HUD.js';
import { createScreenOverlay } from './components/overlay/ScreenOverlay.js';
import { createSettingsPanel } from './components/settings/SettingsPanel.js';
import { createTitleCardPanel } from './components/titlecard/TitleCardPanel.js';
import { createEyeCloseEffect } from './components/gameover/EyeCloseEffect.js';
import { createGameOverPanel } from './components/gameover/GameOverPanel.js';
import { applyBarsSizePreset } from './presets/barSizePresets.js';
import { loadGameUIStyles } from './styles/loadGameUIStyles.js';
import { setTitleCardAudioActive } from '../../audio/GameAudio.js';

function createGameUIController({ onResume, onReset, onSettingsChanged, onBackToMenu }) {
  loadGameUIStyles();

  const root = document.createElement('div');
  root.className = 'game-ui';

  const overlay = createScreenOverlay();
  const hud = createHUD();

  let settingsPanel = null;
  let titleCardPanel = null;
  let gameOverPanel = null;
  const eyeCloseEffect = createEyeCloseEffect();

  const syncSettingsControls = () => {
    if (titleCardPanel) titleCardPanel.syncControls();
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

  titleCardPanel = createTitleCardPanel(onSettingsChanged, syncSettingsControls);

  settingsPanel = createSettingsPanel({
    onResume,
    onReset,
    onSettingsChanged,
    syncSettingsControls,
    runSettingsTask,
    applyBarsSizePreset,
  });

  gameOverPanel = createGameOverPanel(onBackToMenu || onReset);
  setTitleCardAudioActive(true);

  root.append(
    hud.element,
    overlay.element,
    titleCardPanel.element,
    settingsPanel.element,
    eyeCloseEffect.element,
    gameOverPanel.element
  );
  document.body.appendChild(root);

  applyBarsSizePreset(settings.uiBarsSize || 'medium');
  syncSettingsControls();

  return {
    updateHUD(vitals) {
      hud.update(vitals);
    },
    setGameStarted(started) {
      hud.setVisible(started);
      titleCardPanel.setVisible(!started);
      setTitleCardAudioActive(!started);
      if (!started) {
        gameOverPanel.setVisible(false);
        eyeCloseEffect.reset();
      }
    },
    setPaused(paused) {
      settingsPanel.setVisible(paused);
      overlay.setVisible(paused);
    },
    setStartLoading(visible, label = 'Loading...') {
      titleCardPanel.setLoading(visible, label);
    },
    isSettingsBusy() {
      return settingsPanel.isBusy();
    },
    async showGameOver() {
      settingsPanel.setVisible(false);
      overlay.setVisible(false);
      await eyeCloseEffect.play(980);
      gameOverPanel.setVisible(true);
    },
  };
}

export { createGameUIController, applyBarsSizePreset };
