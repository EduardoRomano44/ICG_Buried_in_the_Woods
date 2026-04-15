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

function applyBarsSizePreset(sizeKey) {
  const preset = BAR_SIZE_PRESETS[sizeKey] || BAR_SIZE_PRESETS.medium;
  const style = document.documentElement.style;
  style.setProperty('--health-width', `${preset.healthWidth}px`);
  style.setProperty('--health-height', `${preset.healthHeight}px`);
  style.setProperty('--hud-gap', `${preset.gap}px`);
  style.setProperty('--stamina-width', `${preset.staminaWidth}px`);
  style.setProperty('--stamina-height', `${preset.staminaHeight}px`);
}

export { applyBarsSizePreset };