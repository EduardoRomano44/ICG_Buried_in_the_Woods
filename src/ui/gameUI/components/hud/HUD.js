import { createElementFromHTML } from '../../utils/dom.js';
import { createHealthPanel } from '../health/HealthPanel.js';
import { createStaminaPanel } from '../stamina/StaminaPanel.js';
import { createFlashlightSlot } from '../flashlight/FlashlightSlot.js';
import { createKeySlot } from '../key/KeySlot.js';

function createHUD() {
  const element = createElementFromHTML('<div class="hud"></div>');
  const healthPanel = createHealthPanel();
  const staminaPanel = createStaminaPanel();
  const flashlightSlot = createFlashlightSlot();
  const keySlot = createKeySlot();

  // Inventory slots container: key above flashlight
  const inventorySlots = createElementFromHTML('<div class="inventory-slots"></div>');
  inventorySlots.append(keySlot.element, flashlightSlot.element);

  element.append(healthPanel.element, staminaPanel.element, inventorySlots);

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

  function setKeyState(state) {
    keySlot.update(state);
  }

  return {
    element,
    setVisible,
    update,
    setFlashlightState,
    setKeyState,
  };
}

export { createHUD };