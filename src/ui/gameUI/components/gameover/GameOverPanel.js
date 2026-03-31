import { createElementFromHTML } from '../../utils/dom.js';

function createGameOverPanel(onBackToMenu) {
  const element = createElementFromHTML(`
    <section class="game-over-panel">
      <h1 class="game-over-title">GAME OVER</h1>
      <button type="button" class="ui-button primary" data-ui="menu">Back to Menu</button>
    </section>
  `);

  const menuButton = element.querySelector('[data-ui="menu"]');
  menuButton.addEventListener('click', () => {
    if (typeof onBackToMenu === 'function') onBackToMenu();
  });

  function setVisible(visible) {
    element.style.display = visible ? 'grid' : 'none';
  }

  return {
    element,
    setVisible,
  };
}

export { createGameOverPanel };
