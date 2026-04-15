import { createElementFromHTML } from '../../utils/dom.js';

const flashlightIconURL = new URL('../../../../../imgs/Flashlight.png', import.meta.url).href;
const flashlightIconPreload = new Image();
flashlightIconPreload.src = flashlightIconURL;
flashlightIconPreload.decoding = 'sync';

if (typeof flashlightIconPreload.decode === 'function') {
  flashlightIconPreload.decode().catch(() => {});
}

function createFlashlightSlot() {
  const element = createElementFromHTML(`
    <div class="flashlight-slot" aria-hidden="true">
      <img class="flashlight-slot-icon" alt="Flashlight">
      <span class="flashlight-slot-key">T</span>
    </div>
  `);

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