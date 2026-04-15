import settings from '../../../../config/settings.js';
import { createElementFromHTML } from '../../utils/dom.js';

function createChoiceCard(label, onClick) {
  const card = createElementFromHTML(`<button type="button" class="choice-card">${label}</button>`);
  card.addEventListener('click', onClick);
  return card;
}

function createRangeSettingRow(config, onSettingsChanged) {
  const row = createElementFromHTML(`
    <div class="setting-row">
      <label>${config.label}</label>
      <div class="setting-inline-control">
        <div class="setting-inline-value"></div>
        <input type="range" />
      </div>
    </div>
  `);

  const valueEl = row.querySelector('.setting-inline-value');
  const input = row.querySelector('input');

  input.min = config.min;
  input.max = config.max;
  input.step = config.step;
  input.value = config.value;
  valueEl.textContent = config.format(input.value);

  input.addEventListener('input', () => {
    config.apply(input.value);
    valueEl.textContent = config.format(input.value);
    onSettingsChanged();
  });

  return row;
}

function createSettingsPanel({
  onResume,
  onReset,
  onSettingsChanged,
  syncSettingsControls,
  runSettingsTask,
  applyBarsSizePreset,
}) {
  const element = createElementFromHTML(`
    <section class="panel">
      <h1>SETTINGS</h1>
      <div class="settings-busy">Loading...</div>
      <div class="settings-grid"></div>
      <div class="panel-actions">
        <button type="button" class="ui-button primary" data-ui="resume">Continue</button>
        <button type="button" class="ui-button danger" data-ui="reset">Back to Menu</button>
      </div>
    </section>
  `);

  const busyText = element.querySelector('.settings-busy');
  const grid = element.querySelector('.settings-grid');
  const resumeButton = element.querySelector('[data-ui="resume"]');
  const resetButton = element.querySelector('[data-ui="reset"]');

  resumeButton.addEventListener('click', onResume);
  resetButton.addEventListener('click', onReset);

  const qualityCards = [];
  const shadowCards = [];
  const hudSizeCards = [];
  let busy = false;

  const sensitivityRow = createRangeSettingRow({
    label: 'Sensitivity',
    min: '0.5',
    max: '4',
    step: '0.1',
    value: String(settings.cameraSensitivity),
    apply: (value) => {
      settings.cameraSensitivity = Number(value);
    },
    format: (value) => Number(value).toFixed(1),
  }, onSettingsChanged);

  const crosshairRow = createRangeSettingRow({
    label: 'Crosshair size',
    min: '2',
    max: '24',
    step: '2',
    value: String(settings.crosshairSize),
    apply: (value) => {
      settings.crosshairSize = Number(value);
    },
    format: (value) => `${Math.round(Number(value))}px`,
  }, onSettingsChanged);

  const audioRow = createRangeSettingRow({
    label: 'Sound volume',
    min: '0',
    max: '100',
    step: '1',
    value: String(Math.round((settings.audioVolume ?? 0.8) * 100)),
    apply: (value) => {
      settings.audioVolume = Number(value) / 100;
    },
    format: (value) => `${Math.round(Number(value))}%`,
  }, onSettingsChanged);

  const shadowsRow = createElementFromHTML(`
    <div class="setting-row">
      <label>Shadows</label>
      <div class="choice-grid two"></div>
    </div>
  `);

  const shadowsGrid = shadowsRow.querySelector('.choice-grid');
  const shadowDisabled = createChoiceCard('Disabled', async () => {
    if (!settings.shadowsEnabled) return;
    await runSettingsTask(async () => {
      settings.shadowsEnabled = false;
      syncSettingsControls();
      await Promise.resolve(onSettingsChanged());
    }, true);
  });
  const shadowEnabled = createChoiceCard('Enabled', async () => {
    if (settings.shadowsEnabled) return;
    await runSettingsTask(async () => {
      settings.shadowsEnabled = true;
      syncSettingsControls();
      await Promise.resolve(onSettingsChanged());
    }, true);
  });
  shadowCards.push(shadowDisabled, shadowEnabled);
  shadowsGrid.append(shadowDisabled, shadowEnabled);

  const qualityRow = createElementFromHTML(`
    <div class="setting-row">
      <label>High Quality</label>
      <div class="choice-grid two"></div>
    </div>
  `);

  const qualityGrid = qualityRow.querySelector('.choice-grid');
  const qualityDisabled = createChoiceCard('Disabled', () => {
    if (settings.lowQuality) return;
    settings.lowQuality = true;
    syncSettingsControls();
    onSettingsChanged();
  });
  const qualityEnabled = createChoiceCard('Enabled', () => {
    if (!settings.lowQuality) return;
    settings.lowQuality = false;
    syncSettingsControls();
    onSettingsChanged();
  });
  qualityCards.push(qualityDisabled, qualityEnabled);
  qualityGrid.append(qualityDisabled, qualityEnabled);

  const hudSizeRow = createElementFromHTML(`
    <div class="setting-row">
      <label>HUD bars size</label>
      <div class="choice-grid"></div>
    </div>
  `);

  const hudSizeGrid = hudSizeRow.querySelector('.choice-grid');
  const hudSmall = createChoiceCard('Small', () => {
    settings.uiBarsSize = 'small';
    applyBarsSizePreset(settings.uiBarsSize);
    syncSettingsControls();
    onSettingsChanged();
  });
  const hudMedium = createChoiceCard('Medium', () => {
    settings.uiBarsSize = 'medium';
    applyBarsSizePreset(settings.uiBarsSize);
    syncSettingsControls();
    onSettingsChanged();
  });
  const hudLarge = createChoiceCard('Large', () => {
    settings.uiBarsSize = 'large';
    applyBarsSizePreset(settings.uiBarsSize);
    syncSettingsControls();
    onSettingsChanged();
  });
  hudSizeCards.push(hudSmall, hudMedium, hudLarge);
  hudSizeGrid.append(hudSmall, hudMedium, hudLarge);

  grid.append(sensitivityRow, crosshairRow, audioRow, shadowsRow, qualityRow, hudSizeRow);

  function setVisible(visible) {
    element.style.display = visible ? 'block' : 'none';
  }

  function setBusy(isBusy) {
    busy = isBusy;
    element.classList.toggle('busy', isBusy);
    busyText.style.display = isBusy ? 'block' : 'none';
  }

  function isBusy() {
    return busy;
  }

  function syncControls() {
    qualityCards[0].classList.toggle('active', settings.lowQuality);
    qualityCards[1].classList.toggle('active', !settings.lowQuality);

    shadowCards[0].classList.toggle('active', !settings.shadowsEnabled);
    shadowCards[1].classList.toggle('active', settings.shadowsEnabled);

    hudSizeCards[0].classList.toggle('active', settings.uiBarsSize === 'small');
    hudSizeCards[1].classList.toggle('active', settings.uiBarsSize === 'medium');
    hudSizeCards[2].classList.toggle('active', settings.uiBarsSize === 'large');
  }

  return {
    element,
    setVisible,
    setBusy,
    isBusy,
    syncControls,
  };
}

export { createSettingsPanel };