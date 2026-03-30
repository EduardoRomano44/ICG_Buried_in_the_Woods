import settings from '../config/settings.js';

let root = null;
let hud = null;
let healthBars = [];
let staminaFill = null;
let startMenu = null;
let pauseMenu = null;
let overlay = null;
let startPrompt = null;
let loadingText = null;
let settingsBusyText = null;
let settingsBusy = false;
let startQualityInput = null;
let startShadowInput = null;
let pauseQualityCards = [];
let pauseShadowCards = [];
let pauseHudSizeCards = [];
let lastHealth = null;
let lastMaxHealth = null;
let lastStaminaRatio = null;

const BAR_SIZE_PRESETS = {
  small: {
    healthWidth: 50,
    healthHeight: 10,
    staminaWidth: 10,
    staminaHeight: 120,
    gap: 6,
  },
  medium: {
    healthWidth: 75,
    healthHeight: 17.5,
    staminaWidth: 17.5,
    staminaHeight: 200,
    gap: 10,
  },
  large: {
    healthWidth: 100,
    healthHeight: 25,
    staminaWidth: 25,
    staminaHeight: 280,
    gap: 14,
  },
};

function injectStyles() {
  if (document.getElementById('game-ui-style')) return;

  const style = document.createElement('style');
  style.id = 'game-ui-style';
  style.textContent = `
    :root {
      --ui-font: 'Trebuchet MS', 'Verdana', sans-serif;
      --panel-bg: rgba(18, 20, 27, 0.78);
      --panel-border: rgba(255, 255, 255, 0.25);
      --panel-text: #f6f7fb;
      --accent: #f0c71f;
      --danger: #2f2829;
      --muted: rgba(255, 255, 255, 0.6);
      --health-width: 62px;
      --health-height: 14px;
      --hud-gap: 8px;
      --stamina-width: 14px;
      --stamina-height: 160px;
    }

    body {
      overflow: hidden;
      font-family: var(--ui-font);
    }

    .game-ui {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 30;
      color: var(--panel-text);
    }

    .hud {
      position: absolute;
      inset: 0;
      display: none;
      pointer-events: none;
    }

    .health-row {
      position: absolute;
      top: 16px;
      left: 16px;
      display: flex;
      gap: var(--hud-gap);
    }

    .health-bar {
      width: var(--health-width);
      height: var(--health-height);
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(93, 11, 13, 0.75);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3) inset;
      transition: opacity 160ms ease;
    }

    .health-bar.filled {
      background: linear-gradient(90deg, #bb1e28, #f05a66);
    }

    .stamina-box {
      position: absolute;
      right: 16px;
      bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stamina-label {
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      margin: 0;
      writing-mode: vertical-rl;
      transform: rotate(180deg);
    }

    .stamina-track {
      width: var(--stamina-width);
      height: var(--stamina-height);
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(0, 0, 0, 0.45);
      overflow: hidden;
      display: flex;
      align-items: flex-end;
    }

    .stamina-fill {
      height: 100%;
      width: 100%;
      background: linear-gradient(0deg, #d69d00, #f6d43f);
      transform-origin: center bottom;
      transition: height 90ms linear;
    }

    .screen-overlay {
      position: absolute;
      inset: 0;
      background: rgba(8, 10, 14, 0.58);
      display: none;
      pointer-events: auto;
    }

    .start-screen {
      position: absolute;
      inset: 0;
      pointer-events: auto;
      display: none;
      background: #0d1116;
      border: 1px solid rgba(255, 255, 255, 0.03);
    }

    .start-title {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      margin: 0;
      color: #f6f7fb;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-size: clamp(18px, 2.8vw, 34px);
      text-align: center;
      user-select: none;
    }

    .start-prompt {
      position: absolute;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      margin: 0;
      color: #e5e7f2;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-size: clamp(12px, 1.3vw, 15px);
      user-select: none;
    }

    .start-loading {
      position: absolute;
      left: 16px;
      bottom: 14px;
      margin: 0;
      color: #f0c71f;
      letter-spacing: 0.04em;
      font-size: 14px;
      display: none;
      user-select: none;
    }

    .start-toggles {
      position: absolute;
      right: 16px;
      bottom: 16px;
      display: grid;
      gap: 8px;
      pointer-events: auto;
    }

    .start-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      min-width: 180px;
      background: rgba(10, 14, 18, 0.62);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 8px;
      padding: 7px 10px;
      color: #eef1f8;
      font-size: 12px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .panel {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(560px, calc(100vw - 28px));
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      border-radius: 14px;
      box-shadow: 0 22px 40px rgba(0, 0, 0, 0.42);
      padding: 24px;
      pointer-events: auto;
      display: none;
    }

    .panel h1 {
      margin: 0 0 12px;
      font-size: 30px;
      letter-spacing: 0.02em;
    }

    .panel p {
      margin: 0 0 14px;
      color: var(--muted);
      font-size: 14px;
    }

    .panel hr {
      border: 0;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      margin: 14px 0;
    }

    .ui-button {
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 14px;
      padding: 11px 20px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      cursor: pointer;
      transition: transform 120ms ease, opacity 120ms ease, filter 120ms ease;
      background: rgba(255, 255, 255, 0.08);
      color: #eef1f8;
    }

    .panel-actions .ui-button {
      min-width: 170px;
      border-width: 1px;
      padding: 12px 18px;
      font-size: 12px;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
    }

    .ui-button:hover {
      transform: translateY(-1px);
    }

    .ui-button:active {
      transform: translateY(0);
    }

    .ui-button.primary {
      border-color: #f0c71f;
      background: linear-gradient(180deg, #f7d94b 0%, #d8a916 100%);
      color: #1d1710;
    }

    .ui-button.danger {
      border-color: rgba(160, 175, 196, 0.5);
      background: linear-gradient(180deg, #2e3744 0%, #1f2731 100%);
      color: #e7edf7;
    }

    .settings-grid {
      display: grid;
      gap: 16px;
      margin-top: 12px;
    }

    .setting-row {
      display: grid;
      grid-template-columns: minmax(165px, 185px) 1fr;
      gap: 14px;
      align-items: center;
    }

    .setting-row label {
      color: #ebedf5;
      font-size: 17px;
      font-weight: 700;
      letter-spacing: 0.01em;
    }

    .setting-row input[type='range'] {
      width: 100%;
      max-width: 280px;
      accent-color: #f0c71f;
    }

    .setting-inline-control {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .setting-inline-value {
      min-width: 62px;
      text-align: left;
      color: var(--muted);
      font-size: 15px;
      font-weight: 700;
    }

    .choice-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .choice-grid.two {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .choice-card {
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 10px;
      padding: 10px 8px;
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #ecedf6;
      background: rgba(255, 255, 255, 0.05);
      cursor: pointer;
      user-select: none;
      transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
    }

    .choice-card.active {
      border-color: #f0c71f;
      background: rgba(240, 199, 31, 0.18);
      color: #fff4c2;
    }

    .panel-actions {
      display: flex;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 18px;
    }

    .settings-busy {
      position: fixed;
      left: 16px;
      bottom: 14px;
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #f0c71f;
      display: none;
      text-align: left;
      z-index: 45;
    }

    .panel.busy {
      pointer-events: none;
    }

    @media (max-width: 640px) {
      .panel {
        padding: 14px;
      }

      .start-title {
        top: 14px;
      }

      .start-prompt {
        bottom: 18px;
      }

      .choice-card {
        font-size: 12px;
      }

      .setting-row {
        grid-template-columns: minmax(120px, 145px) 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

function createSettingsRows(panel, onSettingsChanged) {
  const grid = document.createElement('div');
  grid.className = 'settings-grid';

  const rows = [
    {
      label: 'Sensitivity',
      min: '0.5',
      max: '4',
      step: '0.1',
      value: String(settings.cameraSensitivity),
      apply: (value) => {
        settings.cameraSensitivity = Number(value);
      },
      format: (value) => Number(value).toFixed(1),
    },
    {
      label: 'Crosshair size',
      min: '2',
      max: '24',
      step: '2',
      value: String(settings.crosshairSize),
      apply: (value) => {
        settings.crosshairSize = Number(value);
      },
      format: (value) => `${Math.round(Number(value))}px`,
    },
  ];

  for (const rowConfig of rows) {
    const row = document.createElement('div');
    row.className = 'setting-row';

    const label = document.createElement('label');
    label.textContent = rowConfig.label;

    const input = document.createElement('input');
    input.type = 'range';
    input.min = rowConfig.min;
    input.max = rowConfig.max;
    input.step = rowConfig.step;
    input.value = rowConfig.value;

    const value = document.createElement('div');
    value.className = 'setting-inline-value';
    value.textContent = rowConfig.format(input.value);

    input.addEventListener('input', () => {
      rowConfig.apply(input.value, input);
      value.textContent = rowConfig.format(input.value);
      onSettingsChanged();
    });

    const control = document.createElement('div');
    control.className = 'setting-inline-control';
    control.append(value, input);

    row.append(label, control);
    grid.appendChild(row);
  }

  const shadowRow = document.createElement('div');
  shadowRow.className = 'setting-row';

  const shadowLabel = document.createElement('label');
  shadowLabel.textContent = 'Shadows';

  const shadowChoices = document.createElement('div');
  shadowChoices.className = 'choice-grid two';

  const shadowDisabled = document.createElement('button');
  shadowDisabled.type = 'button';
  shadowDisabled.className = 'choice-card';
  shadowDisabled.textContent = 'Disabled';
  shadowDisabled.addEventListener('click', async () => {
    if (!settings.shadowsEnabled) return;
    await runSettingsTask(async () => {
      settings.shadowsEnabled = false;
      syncSettingsControls();
      await Promise.resolve(onSettingsChanged());
    }, true);
  });

  const shadowEnabled = document.createElement('button');
  shadowEnabled.type = 'button';
  shadowEnabled.className = 'choice-card';
  shadowEnabled.textContent = 'Enabled';
  shadowEnabled.addEventListener('click', async () => {
    if (settings.shadowsEnabled) return;
    await runSettingsTask(async () => {
      settings.shadowsEnabled = true;
      syncSettingsControls();
      await Promise.resolve(onSettingsChanged());
    }, true);
  });

  pauseShadowCards = [shadowDisabled, shadowEnabled];
  shadowChoices.append(shadowDisabled, shadowEnabled);
  shadowRow.append(shadowLabel, shadowChoices);
  grid.appendChild(shadowRow);

  const barsSizeRow = document.createElement('div');
  barsSizeRow.className = 'setting-row';

  const barsSizeLabel = document.createElement('label');
  barsSizeLabel.textContent = 'HUD bars size';

  const barsChoices = document.createElement('div');
  barsChoices.className = 'choice-grid';

  const hudSmall = document.createElement('button');
  hudSmall.type = 'button';
  hudSmall.className = 'choice-card';
  hudSmall.textContent = 'Small';
  hudSmall.addEventListener('click', () => {
    settings.uiBarsSize = 'small';
    applyBarsSizePreset(settings.uiBarsSize);
    syncSettingsControls();
    onSettingsChanged();
  });

  const hudMedium = document.createElement('button');
  hudMedium.type = 'button';
  hudMedium.className = 'choice-card';
  hudMedium.textContent = 'Medium';
  hudMedium.addEventListener('click', () => {
    settings.uiBarsSize = 'medium';
    applyBarsSizePreset(settings.uiBarsSize);
    syncSettingsControls();
    onSettingsChanged();
  });

  const hudLarge = document.createElement('button');
  hudLarge.type = 'button';
  hudLarge.className = 'choice-card';
  hudLarge.textContent = 'Large';
  hudLarge.addEventListener('click', () => {
    settings.uiBarsSize = 'large';
    applyBarsSizePreset(settings.uiBarsSize);
    syncSettingsControls();
    onSettingsChanged();
  });

  pauseHudSizeCards = [hudSmall, hudMedium, hudLarge];
  barsChoices.append(hudSmall, hudMedium, hudLarge);

  barsSizeRow.append(barsSizeLabel, barsChoices);
  grid.appendChild(barsSizeRow);

  const qualityRow = document.createElement('div');
  qualityRow.className = 'setting-row';

  const qualityLabel = document.createElement('label');
  qualityLabel.textContent = 'High Quality';

  const qualityChoices = document.createElement('div');
  qualityChoices.className = 'choice-grid two';

  const qualityDisabled = document.createElement('button');
  qualityDisabled.type = 'button';
  qualityDisabled.className = 'choice-card';
  qualityDisabled.textContent = 'Disabled';
  qualityDisabled.addEventListener('click', () => {
    if (settings.lowQuality) return;
    settings.lowQuality = true;
    syncSettingsControls();
    onSettingsChanged();
  });

  const qualityEnabled = document.createElement('button');
  qualityEnabled.type = 'button';
  qualityEnabled.className = 'choice-card';
  qualityEnabled.textContent = 'Enabled';
  qualityEnabled.addEventListener('click', () => {
    if (!settings.lowQuality) return;
    settings.lowQuality = false;
    syncSettingsControls();
    onSettingsChanged();
  });

  pauseQualityCards = [qualityDisabled, qualityEnabled];
  qualityChoices.append(qualityDisabled, qualityEnabled);
  qualityRow.append(qualityLabel, qualityChoices);
  grid.appendChild(qualityRow);

  panel.appendChild(grid);
}

function createHealthHUD() {
  const hudContainer = document.createElement('div');
  hudContainer.className = 'hud';

  const healthRow = document.createElement('div');
  healthRow.className = 'health-row';
  healthBars = [];

  for (let i = 0; i < 3; i += 1) {
    const bar = document.createElement('div');
    bar.className = 'health-bar filled';
    healthBars.push(bar);
    healthRow.appendChild(bar);
  }

  const staminaBox = document.createElement('div');
  staminaBox.className = 'stamina-box';

  const staminaLabel = document.createElement('div');
  staminaLabel.className = 'stamina-label';

  const staminaTrack = document.createElement('div');
  staminaTrack.className = 'stamina-track';

  staminaFill = document.createElement('div');
  staminaFill.className = 'stamina-fill';

  staminaTrack.appendChild(staminaFill);
  staminaBox.append(staminaLabel, staminaTrack);
  hudContainer.append(healthRow, staminaBox);

  return hudContainer;
}

function createStartPanel(onSettingsChanged) {
  const screen = document.createElement('section');
  screen.className = 'start-screen';
  screen.style.display = 'block';

  const title = document.createElement('h1');
  title.className = 'start-title';
  title.textContent = 'Buried In The Woods';

  startPrompt = document.createElement('p');
  startPrompt.className = 'start-prompt';
  startPrompt.textContent = 'Press ENTER to Start';

  loadingText = document.createElement('p');
  loadingText.className = 'start-loading';
  loadingText.textContent = 'Loading...';

  const toggles = document.createElement('div');
  toggles.className = 'start-toggles';

  const qualityRow = document.createElement('label');
  qualityRow.className = 'start-toggle';
  qualityRow.textContent = 'High Quality';

  startQualityInput = document.createElement('input');
  startQualityInput.type = 'checkbox';
  startQualityInput.checked = !settings.lowQuality;
  startQualityInput.addEventListener('change', () => {
    settings.lowQuality = !startQualityInput.checked;
    syncSettingsControls();
    onSettingsChanged();
  });

  const shadowRow = document.createElement('label');
  shadowRow.className = 'start-toggle';
  shadowRow.textContent = 'Shadows';

  startShadowInput = document.createElement('input');
  startShadowInput.type = 'checkbox';
  startShadowInput.checked = settings.shadowsEnabled;
  startShadowInput.addEventListener('change', () => {
    settings.shadowsEnabled = startShadowInput.checked;
    syncSettingsControls();
    onSettingsChanged();
  });

  qualityRow.appendChild(startQualityInput);
  shadowRow.appendChild(startShadowInput);
  toggles.append(qualityRow, shadowRow);

  screen.append(title, startPrompt, loadingText, toggles);

  return screen;
}

function createPausePanel(onResume, onReset, onSettingsChanged) {
  const panel = document.createElement('section');
  panel.className = 'panel';

  const title = document.createElement('h1');
  title.textContent = 'SETTINGS';

  settingsBusyText = document.createElement('div');
  settingsBusyText.className = 'settings-busy';
  settingsBusyText.textContent = 'Loading...';

  createSettingsRows(panel, onSettingsChanged);

  const actionRow = document.createElement('div');
  actionRow.className = 'panel-actions';

  const resumeButton = document.createElement('button');
  resumeButton.className = 'ui-button primary';
  resumeButton.textContent = 'Continue';
  resumeButton.addEventListener('click', onResume);

  const resetButton = document.createElement('button');
  resetButton.className = 'ui-button danger';
  resetButton.textContent = 'Back to Menu';
  resetButton.addEventListener('click', onReset);

  actionRow.append(resumeButton, resetButton);

  panel.prepend(settingsBusyText);
  panel.prepend(title);
  panel.append(actionRow);

  return panel;
}

function createGameUI({ onResume, onReset, onSettingsChanged }) {
  injectStyles();

  root = document.createElement('div');
  root.className = 'game-ui';

  overlay = document.createElement('div');
  overlay.className = 'screen-overlay';

  hud = createHealthHUD();
  startMenu = createStartPanel(onSettingsChanged);
  pauseMenu = createPausePanel(onResume, onReset, onSettingsChanged);

  root.append(hud, overlay, startMenu, pauseMenu);
  document.body.appendChild(root);
  applyBarsSizePreset(settings.uiBarsSize || 'medium');
  syncSettingsControls();
}

function updateHUD(vitals) {
  if (!hud || !vitals) return;

  const { health, maxHealth, stamina, maxStamina } = vitals;

  if (healthBars.length !== maxHealth) {
    const row = hud.querySelector('.health-row');
    if (row) {
      row.innerHTML = '';
      healthBars = [];
      for (let i = 0; i < maxHealth; i += 1) {
        const bar = document.createElement('div');
        bar.className = 'health-bar';
        row.appendChild(bar);
        healthBars.push(bar);
      }
    }
  }

  if (lastHealth !== health || lastMaxHealth !== maxHealth) {
    for (let i = 0; i < healthBars.length; i += 1) {
      healthBars[i].classList.toggle('filled', i < health);
      healthBars[i].style.opacity = i < health ? '1' : '0.34';
    }
    lastHealth = health;
    lastMaxHealth = maxHealth;
  }

  const ratio = Math.max(0, Math.min(1, stamina / maxStamina));
  if (staminaFill && (lastStaminaRatio === null || Math.abs(ratio - lastStaminaRatio) > 0.001)) {
    staminaFill.style.height = `${ratio * 100}%`;
    lastStaminaRatio = ratio;
  }
}

function setGameStarted(started) {
  if (!hud || !startMenu) return;
  hud.style.display = started ? 'block' : 'none';
  startMenu.style.display = started ? 'none' : 'block';
}

function setPaused(paused) {
  if (!pauseMenu || !overlay) return;
  pauseMenu.style.display = paused ? 'block' : 'none';
  overlay.style.display = paused ? 'block' : 'none';
}

function applyBarsSizePreset(sizeKey) {
  const preset = BAR_SIZE_PRESETS[sizeKey] || BAR_SIZE_PRESETS.medium;
  const style = document.documentElement.style;
  style.setProperty('--health-width', `${preset.healthWidth}px`);
  style.setProperty('--health-height', `${preset.healthHeight}px`);
  style.setProperty('--hud-gap', `${preset.gap}px`);
  style.setProperty('--stamina-width', `${preset.staminaWidth}px`);
  style.setProperty('--stamina-height', `${preset.staminaHeight}px`);
}

function setStartLoading(visible, label = 'Loading...') {
  if (!loadingText || !startPrompt) return;
  loadingText.style.display = visible ? 'block' : 'none';
  loadingText.textContent = label;
  startPrompt.style.display = visible ? 'none' : 'block';
}

function syncSettingsControls() {
  if (startQualityInput) startQualityInput.checked = !settings.lowQuality;
  if (startShadowInput) startShadowInput.checked = settings.shadowsEnabled;

  if (pauseQualityCards.length === 2) {
    pauseQualityCards[0].classList.toggle('active', settings.lowQuality);
    pauseQualityCards[1].classList.toggle('active', !settings.lowQuality);
  }

  if (pauseShadowCards.length === 2) {
    pauseShadowCards[0].classList.toggle('active', !settings.shadowsEnabled);
    pauseShadowCards[1].classList.toggle('active', settings.shadowsEnabled);
  }

  if (pauseHudSizeCards.length === 3) {
    pauseHudSizeCards[0].classList.toggle('active', settings.uiBarsSize === 'small');
    pauseHudSizeCards[1].classList.toggle('active', settings.uiBarsSize === 'medium');
    pauseHudSizeCards[2].classList.toggle('active', settings.uiBarsSize === 'large');
  }
}

async function runSettingsTask(task, blockUI = false) {
  if (blockUI) {
    setSettingsBusy(true);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  try {
    await Promise.resolve(task());
  } finally {
    if (blockUI) {
      setSettingsBusy(false);
    }
  }
}

function setSettingsBusy(isBusy) {
  settingsBusy = isBusy;
  if (pauseMenu) {
    pauseMenu.classList.toggle('busy', isBusy);
  }
  if (settingsBusyText) {
    settingsBusyText.style.display = isBusy ? 'block' : 'none';
  }
}

function isSettingsBusy() {
  return settingsBusy;
}

export {
  createGameUI,
  updateHUD,
  setGameStarted,
  setPaused,
  applyBarsSizePreset,
  setStartLoading,
  isSettingsBusy,
};
