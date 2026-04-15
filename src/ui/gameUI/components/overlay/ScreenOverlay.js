import { createElementFromHTML } from '../../utils/dom.js';

function createScreenOverlay() {
  const element = createElementFromHTML('<div class="screen-overlay"></div>');

  function setVisible(visible) {
    element.style.display = visible ? 'block' : 'none';
  }

  return {
    element,
    setVisible,
  };
}

export { createScreenOverlay };