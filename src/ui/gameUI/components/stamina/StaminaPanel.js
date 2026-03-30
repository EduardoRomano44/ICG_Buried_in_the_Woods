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
  let lastRatio = null;

  function update(stamina, maxStamina) {
    const ratio = Math.max(0, Math.min(1, stamina / maxStamina));
    if (lastRatio !== null && Math.abs(lastRatio - ratio) <= 0.001) return;

    fill.style.height = `${ratio * 100}%`;
    lastRatio = ratio;
  }

  return {
    element,
    update,
  };
}

export { createStaminaPanel };
