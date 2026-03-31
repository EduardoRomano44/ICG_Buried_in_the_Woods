import { createElementFromHTML } from '../../utils/dom.js';

function createHealthPanel() {
  const element = createElementFromHTML('<div class="health-row"></div>');
  const bars = [];
  let lastHealth = null;
  let lastMaxHealth = null;

  function rebuildBars(maxHealth) {
    element.innerHTML = '';
    bars.length = 0;
    for (let i = 0; i < maxHealth; i += 1) {
      const bar = createElementFromHTML(
        '<div class="health-bar"><div class="health-fill"></div></div>'
      );
      bars.push(bar);
      element.appendChild(bar);
    }
  }

  function update(health, maxHealth) {
    if (bars.length !== maxHealth) {
      rebuildBars(maxHealth);
    }

    if (lastHealth === health && lastMaxHealth === maxHealth) return;

    for (let i = 0; i < bars.length; i += 1) {
      const fill = bars[i].querySelector('.health-fill');
      if (!fill) continue;

      const ratio = Math.max(0, Math.min(1, health - i));
      fill.style.width = `${ratio * 100}%`;
      bars[i].style.opacity = ratio > 0 ? '1' : '0.34';
    }

    lastHealth = health;
    lastMaxHealth = maxHealth;
  }

  return {
    element,
    update,
  };
}

export { createHealthPanel };
