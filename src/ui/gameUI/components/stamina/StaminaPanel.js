import { createElementFromHTML } from '../../utils/dom.js';

function createStaminaPanel() {
  const element = createElementFromHTML(`
    <div class="stamina-box">
      <div class="stamina-label"></div>
      <div class="stamina-track">
        <div class="stamina-fill"></div>
      </div>
    </div>
  `);

  const fill = element.querySelector('.stamina-fill');
  const STAMINA_UI_STEPS = 80;
  let lastStep = null;

  function update(stamina, maxStamina) {
    const safeMax = Number.isFinite(maxStamina) && maxStamina > 0 ? maxStamina : 1;
    const ratio = Math.max(0, Math.min(1, stamina / safeMax));
    const step = Math.round(ratio * STAMINA_UI_STEPS);
    if (lastStep === step) return;

    fill.style.transform = `scaleY(${step / STAMINA_UI_STEPS})`;
    lastStep = step;
  }

  return {
    element,
    update,
  };
}

export { createStaminaPanel };