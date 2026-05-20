import { createElementFromHTML } from '../../utils/dom.js';

/**
 * Creates the circular escape screen closing effect.
 * Uses a CSS transition/animation with clip-path.
 */
function createEscapeEffect() {
  const element = createElementFromHTML(`
    <div class="escape-effect"></div>
  `);

  let running = null;

  /**
   * Resets the effect by removing the active styling class.
   */
  function reset() {
    element.classList.remove('active');
  }

  /**
   * Plays the circle closing animation.
   * @param {number} durationMs - Animation duration in milliseconds.
   * @returns {Promise<void>} Resolves when the animation completes.
   */
  function play(durationMs = 1500) {
    if (running) return running;

    element.style.setProperty('--escape-close-duration', `${durationMs}ms`);
    element.classList.remove('active');
    void element.offsetWidth; // Force reflow
    element.classList.add('active');

    running = new Promise((resolve) => {
      setTimeout(() => {
        resolve();
        running = null;
      }, durationMs);
    });

    return running;
  }

  return {
    element,
    play,
    reset,
  };
}

export { createEscapeEffect };
