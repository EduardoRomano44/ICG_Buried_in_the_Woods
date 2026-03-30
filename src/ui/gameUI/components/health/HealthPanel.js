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
      const bar = createElementFromHTML('<div class="health-bar"></div>');
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
      bars[i].classList.toggle('filled', i < health);
      bars[i].style.opacity = i < health ? '1' : '0.34';
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
