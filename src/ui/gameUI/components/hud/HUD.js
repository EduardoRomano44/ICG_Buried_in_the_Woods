import { createElementFromHTML } from '../../utils/dom.js';
import { createHealthPanel } from '../health/HealthPanel.js';
import { createStaminaPanel } from '../stamina/StaminaPanel.js';
import { createFlashlightSlot } from '../flashlight/FlashlightSlot.js';

function createHUD() {
  const element = createElementFromHTML('<div class="hud"></div>');
  const healthPanel = createHealthPanel();
  const staminaPanel = createStaminaPanel();
  const flashlightSlot = createFlashlightSlot();

  element.append(healthPanel.element, staminaPanel.element, flashlightSlot.element);

  function setVisible(visible) {
    element.style.display = visible ? 'block' : 'none';
  }

  function update(vitals) {
    if (!vitals) return;
    healthPanel.update(vitals.health, vitals.maxHealth);
    staminaPanel.update(vitals.stamina, vitals.maxStamina);
  }

  function setFlashlightState(state) {
    flashlightSlot.update(state);
  }

  return {
    element,
    setVisible,
    update,
    setFlashlightState,
  };
}

export { createHUD };