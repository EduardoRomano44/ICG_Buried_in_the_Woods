import { createElementFromHTML } from '../../utils/dom.js';

/**
 * Creates the successful escape panel overlay.
 * @param {function} onBackToMenu - Callback triggered when back to menu button is clicked.
 */
function createEscapePanel(onBackToMenu) {
  const element = createElementFromHTML(`
    <section class="escape-panel">
      <h1 class="escape-title">YOU ESCAPED SUCCESSFULLY</h1>
      <button type="button" class="ui-button primary" data-ui="menu" style="margin-top: 10px;">Menu</button>
    </section>
  `);

  const menuButton = element.querySelector('[data-ui="menu"]');
  menuButton.addEventListener('click', () => {
    if (typeof onBackToMenu === 'function') {
      onBackToMenu();
    }
  });

  /**
   * Toggles the visibility of the escape panel.
   */
  function setVisible(visible) {
    if (visible) {
      element.classList.add('active');
    } else {
      element.classList.remove('active');
    }
  }

  return {
    element,
    setVisible,
  };
}

export { createEscapePanel };
