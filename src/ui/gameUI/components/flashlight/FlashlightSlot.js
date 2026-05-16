import { createElementFromHTML } from '../../utils/dom.js';
import { triggerFlashlight } from '../../../../player/modules/PlayerInput.js';

const flashlightIconURL = new URL('../../../../../imgs/Flashlight.png', import.meta.url).href;
const flashlightIconPreload = new Image();
flashlightIconPreload.src = flashlightIconURL;
flashlightIconPreload.decoding = 'sync';

if (typeof flashlightIconPreload.decode === 'function') {
  flashlightIconPreload.decode().catch(() => {});
}

function createFlashlightSlot() {
  const element = createElementFromHTML(`
    <div class="flashlight-slot" aria-hidden="true" style="pointer-events: auto; cursor: pointer;">
      <img class="flashlight-slot-icon" alt="Flashlight">
      <span class="flashlight-slot-key">T</span>
    </div>
  `);

  element.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    triggerFlashlight();
  });

  const icon = element.querySelector('.flashlight-slot-icon');
  let hasFlashlight = false;
  let isFlashlightOn = false;

  if (icon) {
    icon.loading = 'eager';
    icon.decoding = 'sync';
    icon.fetchPriority = 'high';
    icon.src = flashlightIconURL;
  }

  function update({ hasFlashlight: nextHasFlashlight = false, isOn: nextIsOn = false } = {}) {
    const safeHasFlashlight = Boolean(nextHasFlashlight);
    const safeIsOn = Boolean(nextIsOn) && safeHasFlashlight;

    if (safeHasFlashlight === hasFlashlight && safeIsOn === isFlashlightOn) return;

    hasFlashlight = safeHasFlashlight;
    isFlashlightOn = safeIsOn;

    element.style.display = hasFlashlight ? 'flex' : 'none';
    element.classList.toggle('active', isFlashlightOn);
  }

  return {
    element,
    update,
  };
}

export { createFlashlightSlot };