import settings from '../config/settings.js';

let root = null;
let hud = null;
let healthBars = [];
let staminaFill = null;
let startMenu = null;
let pauseMenu = null;
let overlay = null;

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
      --danger: #e84855;
      --muted: rgba(255, 255, 255, 0.6);
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
      top: 16px;
      left: 16px;
      display: none;
      gap: 12px;
      pointer-events: none;
      min-width: 230px;
    }

    .health-row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .health-bar {
      width: 62px;
      height: 14px;
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
      width: 100%;
    }

    .stamina-label {
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 4px;
    }

    .stamina-track {
      width: 100%;
      height: 10px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(0, 0, 0, 0.45);
      overflow: hidden;
    }

    .stamina-fill {
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #f6d43f, #d69d00);
      transform-origin: left center;
      transition: width 90ms linear;
    }

    .screen-overlay {
      position: absolute;
      inset: 0;
      background: rgba(8, 10, 14, 0.36);
      backdrop-filter: blur(4px);
      display: none;
      pointer-events: auto;
    }

    .panel {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(450px, calc(100vw - 32px));
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      border-radius: 14px;
      box-shadow: 0 22px 40px rgba(0, 0, 0, 0.42);
      padding: 18px;
      pointer-events: auto;
      display: none;
    }

    .panel h1 {
      margin: 0 0 6px;
      font-size: 22px;
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
      border: 0;
      border-radius: 8px;
      padding: 10px 14px;
      font-weight: 700;
      letter-spacing: 0.01em;
      cursor: pointer;
      transition: transform 120ms ease, opacity 120ms ease;
    }

    .ui-button:hover {
      transform: translateY(-1px);
    }

    .ui-button:active {
      transform: translateY(0);
    }

    .ui-button.primary {
      background: var(--accent);
      color: #1a1a1a;
    }

    .ui-button.secondary {
      background: rgba(255, 255, 255, 0.14);
      color: #f6f7fb;
    }

    .ui-button.danger {
      background: var(--danger);
      color: white;
    }

    .settings-grid {
      display: grid;
      gap: 10px;
      margin-top: 10px;
    }

    .setting-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: center;
    }

    .setting-row label {
      color: #ebedf5;
      font-size: 14px;
    }

    .setting-row input[type='range'] {
      width: 160px;
    }

    .setting-row output {
      width: 46px;
      text-align: right;
      color: var(--muted);
      font-size: 13px;
    }

    .panel-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 14px;
    }

    @media (max-width: 640px) {
      .health-bar {
        width: 54px;
      }

      .panel {
        padding: 14px;
      }

      .setting-row {
        grid-template-columns: 1fr;
      }

      .setting-row input[type='range'] {
        width: 100%;
      }

      .setting-row output {
        width: auto;
        text-align: left;
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
      label: 'Sensibilidade',
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
      label: 'FOV normal',
      min: '60',
      max: '95',
      step: '1',
      value: String(settings.normalFOV),
      apply: (value) => {
        settings.normalFOV = Number(value);
        if (settings.sprintFOV < settings.normalFOV + 5) {
          settings.sprintFOV = settings.normalFOV + 5;
        }
      },
      format: (value) => String(Math.round(Number(value))),
    },
    {
      label: 'FOV sprint',
      min: '70',
      max: '120',
      step: '1',
      value: String(settings.sprintFOV),
      apply: (value, input) => {
        const parsed = Number(value);
        const minSprint = settings.normalFOV + 5;
        settings.sprintFOV = Math.max(parsed, minSprint);
        input.value = String(settings.sprintFOV);
      },
      format: (value) => String(Math.round(Number(value))),
    },
    {
      label: 'Tamanho crosshair',
      min: '4',
      max: '12',
      step: '1',
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

    const value = document.createElement('output');
    value.textContent = rowConfig.format(input.value);

    input.addEventListener('input', () => {
      rowConfig.apply(input.value, input);
      value.textContent = rowConfig.format(input.value);
      onSettingsChanged();
    });

    row.append(label, input, value);
    grid.appendChild(row);
  }

  const shadowRow = document.createElement('div');
  shadowRow.className = 'setting-row';

  const shadowLabel = document.createElement('label');
  shadowLabel.textContent = 'Sombras';

  const shadowInput = document.createElement('input');
  shadowInput.type = 'checkbox';
  shadowInput.checked = settings.shadowsEnabled;

  shadowInput.addEventListener('change', () => {
    settings.shadowsEnabled = shadowInput.checked;
    onSettingsChanged();
  });

  shadowRow.append(shadowLabel, shadowInput);
  grid.appendChild(shadowRow);

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
  staminaLabel.textContent = 'Stamina';

  const staminaTrack = document.createElement('div');
  staminaTrack.className = 'stamina-track';

  staminaFill = document.createElement('div');
  staminaFill.className = 'stamina-fill';

  staminaTrack.appendChild(staminaFill);
  staminaBox.append(staminaLabel, staminaTrack);
  hudContainer.append(healthRow, staminaBox);

  return hudContainer;
}

function createStartPanel(onNewGame) {
  const panel = document.createElement('section');
  panel.className = 'panel';
  panel.style.display = 'block';

  const title = document.createElement('h1');
  title.textContent = 'A Walk In The Woods';

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Explora a floresta, gere o sprint e mantém controlo total da câmara.';

  const actionRow = document.createElement('div');
  actionRow.className = 'panel-actions';

  const startButton = document.createElement('button');
  startButton.className = 'ui-button primary';
  startButton.textContent = 'Novo Jogo';
  startButton.addEventListener('click', onNewGame);

  actionRow.appendChild(startButton);
  panel.append(title, subtitle, actionRow);

  return panel;
}

function createPausePanel(onResume, onReset, onSettingsChanged) {
  const panel = document.createElement('section');
  panel.className = 'panel';

  const title = document.createElement('h1');
  title.textContent = 'Jogo em Pausa';

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Ajusta as settings em tempo real ou reinicia a experiência.';

  const separator = document.createElement('hr');

  const settingsTitle = document.createElement('p');
  settingsTitle.textContent = 'Settings';

  createSettingsRows(panel, onSettingsChanged);

  const actionRow = document.createElement('div');
  actionRow.className = 'panel-actions';

  const resumeButton = document.createElement('button');
  resumeButton.className = 'ui-button primary';
  resumeButton.textContent = 'Retomar';
  resumeButton.addEventListener('click', onResume);

  const resetButton = document.createElement('button');
  resetButton.className = 'ui-button danger';
  resetButton.textContent = 'Reset Jogo';
  resetButton.addEventListener('click', onReset);

  actionRow.append(resumeButton, resetButton);

  panel.prepend(settingsTitle);
  panel.prepend(separator);
  panel.prepend(subtitle);
  panel.prepend(title);
  panel.append(actionRow);

  return panel;
}

function createGameUI({ onNewGame, onResume, onReset, onSettingsChanged }) {
  injectStyles();

  root = document.createElement('div');
  root.className = 'game-ui';

  overlay = document.createElement('div');
  overlay.className = 'screen-overlay';

  hud = createHealthHUD();
  startMenu = createStartPanel(onNewGame);
  pauseMenu = createPausePanel(onResume, onReset, onSettingsChanged);

  root.append(hud, overlay, startMenu, pauseMenu);
  document.body.appendChild(root);
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

  for (let i = 0; i < healthBars.length; i += 1) {
    healthBars[i].classList.toggle('filled', i < health);
    healthBars[i].style.opacity = i < health ? '1' : '0.34';
  }

  const ratio = Math.max(0, Math.min(1, stamina / maxStamina));
  if (staminaFill) {
    staminaFill.style.width = `${ratio * 100}%`;
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

export { createGameUI, updateHUD, setGameStarted, setPaused };
