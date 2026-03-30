import { createElementFromHTML } from '../../utils/dom.js';
import { createHealthPanel } from '../health/HealthPanel.js';
import { createStaminaPanel } from '../stamina/StaminaPanel.js';

function createHUD() {
  const element = createElementFromHTML('<div class="hud"></div>');
  const healthPanel = createHealthPanel();
  const staminaPanel = createStaminaPanel();

  element.append(healthPanel.element, staminaPanel.element);

  function setVisible(visible) {
    element.style.display = visible ? 'block' : 'none';
  }

  function update(vitals) {
    if (!vitals) return;
    healthPanel.update(vitals.health, vitals.maxHealth);
    staminaPanel.update(vitals.stamina, vitals.maxStamina);
  }

  return {
    element,
    setVisible,
    update,
  };
}

export { createHUD };
