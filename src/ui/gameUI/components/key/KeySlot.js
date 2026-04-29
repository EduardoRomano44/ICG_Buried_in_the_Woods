import { createElementFromHTML } from '../../utils/dom.js';

const keyIconURL = new URL('../../../../../imgs/Key.png', import.meta.url).href;
const keyIconPreload = new Image();
keyIconPreload.src = keyIconURL;
keyIconPreload.decoding = 'sync';

if (typeof keyIconPreload.decode === 'function') {
  keyIconPreload.decode().catch(() => {});
}

/**
 * HUD slot for the basement key.
 * Same dimensions as FlashlightSlot but no toggle key label.
 * Uses `object-fit: contain` to preserve aspect ratio, no stretching.
 */
function createKeySlot() {
  const element = createElementFromHTML(`
    <div class="key-slot" aria-hidden="true">
      <img class="key-slot-icon" alt="Key">
    </div>
  `);

  const icon = element.querySelector('.key-slot-icon');
  let hasKey = false;

  if (icon) {
    icon.loading = 'eager';
    icon.decoding = 'sync';
    icon.fetchPriority = 'high';
    icon.src = keyIconURL;
  }

  function update({ hasKey: nextHasKey = false } = {}) {
    const safeHasKey = Boolean(nextHasKey);
    if (safeHasKey === hasKey) return;

    hasKey = safeHasKey;
    element.style.display = hasKey ? 'flex' : 'none';
  }

  return {
    element,
    update,
  };
}

export { createKeySlot };
